import type { CDPSession } from "playwright";

/** The protocol surface shared by the page session and relayed child sessions. */
export type ProtocolSession = Pick<CDPSession, "send" | "on">;

export interface ChildTarget {
  session: ProtocolSession;
  type: string;
  url: string;
}

type Preparer = (target: ChildTarget) => Promise<void>;

export interface ChildTargets {
  /** Apply to targets attached later and, best effort, to those already attached. */
  prepare: (preparer: Preparer) => Promise<void>;
}

interface ProtocolMessage {
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { message: string };
}

/**
 * Commands for one child target, relayed through its parent session. Playwright's
 * CDPSession cannot address flat child session IDs: its connection drops messages
 * for sessions it did not create. Non-flat attachment keeps every child message
 * inside Target.sendMessageToTarget and Target.receivedMessageFromTarget on the
 * parent session, which Playwright does deliver.
 */
function relaySession(parent: ProtocolSession, sessionId: string) {
  let nextId = 0;
  const pending = new Map<number, PromiseWithResolvers<unknown>>();
  const listeners = new Map<string, ((params: unknown) => void)[]>();
  const session = {
    on(event: string, listener: (params: unknown) => void) {
      listeners.set(event, [...(listeners.get(event) ?? []), listener]);
      return session;
    },
    async send(method: string, params: object = {}) {
      nextId += 1;
      const id = nextId;
      const reply = Promise.withResolvers<unknown>();
      // Detachment can reject a reply before this command finishes sending.
      // oxlint-disable-next-line promise/prefer-await-to-then -- Mark the rejection handled without awaiting it here.
      reply.promise.catch(() => {
        /* Callers still receive the rejection through the returned promise. */
      });
      pending.set(id, reply);
      try {
        await parent.send("Target.sendMessageToTarget", {
          message: JSON.stringify({ id, method, params }),
          sessionId,
        });
      } catch (error) {
        pending.delete(id);
        throw error;
      }
      return reply.promise;
    },
  };
  return {
    close() {
      for (const reply of pending.values()) {
        reply.reject(new Error("Target detached"));
      }
      pending.clear();
    },
    dispatch(raw: string) {
      const message = JSON.parse(raw) as ProtocolMessage;
      if (message.id !== undefined) {
        const reply = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) {
          reply?.reject(new Error(message.error.message));
        } else {
          reply?.resolve(message.result);
        }
      } else if (message.method) {
        for (const listener of listeners.get(message.method) ?? []) {
          listener(message.params);
        }
      }
    },
    session: session as unknown as ProtocolSession,
  };
}

/**
 * Attach to every child target of a page before it runs: out-of-process iframes,
 * dedicated workers, and their own descendants. Each target waits for the
 * debugger until all registered preparers finish, then resumes. Playwright keeps
 * its own auto-attachment; Chromium resumes a target only after every attached
 * client that requested the wait has released it.
 */
export async function attachChildTargets(
  root: ProtocolSession
): Promise<ChildTargets> {
  const preparers: Preparer[] = [];
  const attached = new Set<ChildTarget>();
  const prepareTarget = async (
    target: ChildTarget,
    waitingForDebugger: boolean
  ) => {
    try {
      await Promise.all(preparers.map((preparer) => preparer(target)));
      attached.add(target);
      if (["iframe", "worker"].includes(target.type)) {
        // oxlint-disable-next-line no-use-before-define -- Descendants attach through their parent's relay.
        await listen(target.session);
      }
    } catch {
      /* Detached targets reject pending commands; the target no longer runs. */
    } finally {
      if (waitingForDebugger) {
        try {
          await target.session.send("Runtime.runIfWaitingForDebugger");
        } catch {
          /* The target may already be gone. */
        }
      }
    }
  };
  async function listen(parent: ProtocolSession) {
    const children = new Map<string, ReturnType<typeof relaySession>>();
    parent.on("Target.receivedMessageFromTarget", (event) => {
      children.get(event.sessionId)?.dispatch(event.message);
    });
    parent.on("Target.detachedFromTarget", (event) => {
      if (event.sessionId) {
        children.get(event.sessionId)?.close();
        children.delete(event.sessionId);
      }
    });
    parent.on("Target.attachedToTarget", (event) => {
      const relay = relaySession(parent, event.sessionId);
      children.set(event.sessionId, relay);
      void prepareTarget(
        {
          session: relay.session,
          type: event.targetInfo.type,
          url: event.targetInfo.url,
        },
        event.waitingForDebugger
      );
    });
    await parent.send("Target.setAutoAttach", {
      autoAttach: true,
      flatten: false,
      waitForDebuggerOnStart: true,
    });
  }
  await listen(root);
  return {
    async prepare(preparer) {
      preparers.push(preparer);
      await Promise.all(
        [...attached].map(async (target) => {
          try {
            await preparer(target);
          } catch {
            /* A target can detach while an existing session is being prepared. */
          }
        })
      );
    },
  };
}

export interface ThrottleProfile {
  cpuSlowdown: number;
  network: {
    downloadBytesPerSecond: number;
    latencyMs: number;
    uploadBytesPerSecond: number;
  };
}

/**
 * Apply the profile's CPU and network throttling to the page and to every
 * child target before it runs. Cross-site iframes run in their own renderer
 * when site isolation is on, and page-target emulation does not reach them.
 * Worker requests follow their page's network conditions, but Chromium refuses
 * CPU throttling for worker targets, so worker scripts run at full speed. The
 * returned list, filled as targets attach, records each such target.
 */
export async function emulateProfile(
  page: ProtocolSession,
  targets: ChildTargets,
  profile: ThrottleProfile
): Promise<string[]> {
  const unthrottled: string[] = [];
  const apply = async (session: ProtocolSession) => {
    await session.send("Emulation.setCPUThrottlingRate", {
      rate: profile.cpuSlowdown,
    });
    await session.send("Network.emulateNetworkConditions", {
      downloadThroughput: profile.network.downloadBytesPerSecond,
      latency: profile.network.latencyMs,
      offline: false,
      uploadThroughput: profile.network.uploadBytesPerSecond,
    });
  };
  await apply(page);
  await targets.prepare(async (target) => {
    if (target.type === "iframe") {
      await target.session.send("Network.enable");
      await apply(target.session);
    } else if (profile.cpuSlowdown !== 1) {
      unthrottled.push(
        `${target.type} ${target.url}: CPU throttling unsupported`
      );
    }
  });
  return unthrottled;
}
