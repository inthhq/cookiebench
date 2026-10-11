import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import type { CDPSession, Page } from "playwright";

import { attachChildTargets } from "./targets.ts";
import type { ChildTarget, ProtocolSession } from "./targets.ts";

export interface NetworkRequest {
  id: string;
  url: string;
  hostname: string;
  party: "first-party" | "third-party" | "other";
  resourceType: string;
  method?: string;
  responseContentType?: string;
  startedAt: number;
  wallTimeMs: number;
  phase: "initial" | "deferred";
  status?: number;
  fromCache?: boolean;
  transferBytes?: number;
  // Raw CDP chunk-event sum; may include framing or omit encoded bytes.
  encodedDataBytes?: number;
  // Exact encoded body length, established only for completed uncached responses.
  encodedBodyBytes?: number;
  decodedBodyBytes?: number;
  // Why a completed response's decoded size is unknown, e.g. an undelivered compressed prefetch.
  decodedBodyUnavailable?: string;
  // Violated per-request byte relations; any entry withholds the phase byte totals.
  byteInconsistencies?: string[];
  contentEncoding?: string;
  decodedBodySha256?: string;
  // Text responses hash the protocol string re-encoded as UTF-8, not original charset bytes.
  bodyDigestEncoding?: "base64-bytes" | "utf8-text" | "empty-body";
  bodyDigestUnavailable?: string;
  failed?: string;
  finished: boolean;
  // CORS preflight. Chromium reports its exchange with zero encodedDataLength,
  // so transfer totals omit preflight header bytes.
  preflight?: boolean;
  // The network exchange was a 304; the body came from the HTTP cache.
  revalidated?: boolean;
  // Response headers were observed, possibly without a responseReceived event.
  responseStarted?: boolean;
  // Bytes are zero because no response began before failure or the cutoff.
  noResponse?: "failed" | "pending-at-cutoff";
  // The page cancelled the exchange after its response began. Byte fields count
  // only what arrived before the cancel, so they are lower bounds.
  cancelledAfterResponse?: boolean;
}

export interface NetworkCoverage {
  // page-tree: the page target plus auto-attached frame and worker targets.
  scope: "page-target" | "page-tree";
  complete: boolean;
  reasons: string[];
}

function hasNoBody(row: NetworkRequest): boolean {
  // Chromium never exposes a CORS preflight response body.
  return (
    row.method === "HEAD" ||
    row.preflight === true ||
    [204, 205, 304].includes(row.status ?? 0)
  );
}

function hasDigestibleBody(row: NetworkRequest): boolean {
  return (
    ["Script", "Stylesheet"].includes(row.resourceType) ||
    /javascript|json|css/iu.test(row.responseContentType ?? "")
  );
}

function identityEncoded(row: NetworkRequest): boolean {
  return ["", "identity"].includes(row.contentEncoding ?? "");
}

/**
 * Chunk-event encoded counts can include framing or be partial. Content-Length
 * establishes the encoded body size; identity encoding also permits the complete
 * decoded byte count. Compressed bodies without an exact length stay unknown.
 * Returns true when the network delivered body bytes that no renderer read.
 */
function settleBodySizes(row: NetworkRequest, length?: number): boolean {
  const identity = identityEncoded(row);
  if (
    !row.decodedBodyBytes &&
    ((row.encodedDataBytes ?? 0) > 0 || (length ?? 0) > 0)
  ) {
    // As with rel=prefetch, CDP reports encoded data with zero dataLength. Only
    // identity encoding makes the decoded size known without the body.
    row.encodedBodyBytes = length;
    row.decodedBodyBytes = identity ? length : undefined;
    if (row.decodedBodyBytes === undefined) {
      row.decodedBodyUnavailable =
        "Response body was not delivered to a renderer and its decoded size is not established";
    }
    return true;
  }
  row.encodedBodyBytes =
    length ?? (identity ? row.decodedBodyBytes : undefined);
  return false;
}

/**
 * Relations every completed uncached response must satisfy. Transfer includes
 * headers and framing, so it can never be smaller than the encoded body, and
 * identity encoding makes decoded and encoded bodies the same bytes. Transfer
 * is deliberately not compared with decoded size: a small compressed body plus
 * its headers can legitimately exceed the decoded body.
 */
export function byteInconsistencies(row: NetworkRequest): string[] {
  if (
    !row.finished ||
    row.failed ||
    row.fromCache ||
    !/^https?:/u.test(row.url)
  ) {
    return [];
  }
  const problems: string[] = [];
  if (
    row.transferBytes === 0 &&
    !row.preflight &&
    (row.status ?? 0) >= 200 &&
    (row.status ?? 0) < 300
  ) {
    // Even an empty uncached HTTP response carries a status line and headers.
    problems.push("uncached response reported zero transfer bytes");
  }
  if (
    row.transferBytes !== undefined &&
    row.encodedBodyBytes !== undefined &&
    row.transferBytes < row.encodedBodyBytes
  ) {
    problems.push(
      `transfer ${row.transferBytes} B is smaller than encoded body ${row.encodedBodyBytes} B`
    );
  }
  if (
    identityEncoded(row) &&
    row.encodedBodyBytes !== undefined &&
    row.decodedBodyBytes !== undefined &&
    row.encodedBodyBytes !== row.decodedBodyBytes
  ) {
    problems.push(
      `identity-encoded decoded body ${row.decodedBodyBytes} B differs from encoded body ${row.encodedBodyBytes} B`
    );
  }
  return problems;
}

export function classifyHostname(
  url: string,
  pageUrl: string
): NetworkRequest["party"] {
  const target = new URL(url);
  if (!["http:", "https:"].includes(target.protocol)) {
    return "other";
  }
  return target.hostname === new URL(pageUrl).hostname
    ? "first-party"
    : "third-party";
}

export function partitionNetwork(
  requests: readonly NetworkRequest[],
  inputEpochMs?: number
): NetworkRequest[] {
  return requests.map((request) => ({
    ...request,
    phase:
      inputEpochMs !== undefined && request.wallTimeMs >= inputEpochMs
        ? "deferred"
        : "initial",
  }));
}

export interface NetworkRevision {
  at: number;
  request: NetworkRequest;
}

export function networkAtDeadline(
  revisions: readonly NetworkRevision[],
  deadlineEpochMs: number
): NetworkRequest[] {
  const latest = new Map<string, NetworkRequest>();
  for (const revision of revisions) {
    if (revision.at <= deadlineEpochMs) {
      latest.set(revision.request.id, { ...revision.request });
    }
  }
  return [...latest.values()];
}

function header(headers: Record<string, unknown> | undefined, name: string) {
  const value = Object.entries(headers ?? {}).find(
    ([key]) => key.toLowerCase() === name
  )?.[1];
  return typeof value === "string" ? value : undefined;
}

function contentLength(headers: Record<string, unknown> | undefined) {
  const length = header(headers, "content-length");
  return length !== undefined &&
    /^\d+$/u.test(length) &&
    Number.isSafeInteger(Number(length))
    ? Number(length)
    : undefined;
}

/**
 * A request that failed, or was still pending at the cutoff, before any response
 * evidence arrived has received no response bytes. Its bytes are exactly zero.
 * Once a response has started, an incomplete or failed exchange has unknown bytes.
 */
function settleWithoutResponse(row: NetworkRequest) {
  const incomplete = !row.finished || row.failed !== undefined;
  const responseEvidence =
    row.responseStarted ||
    row.status !== undefined ||
    row.decodedBodyBytes !== undefined ||
    row.encodedDataBytes !== undefined;
  if (!incomplete || responseEvidence) {
    return;
  }
  row.noResponse = row.failed === undefined ? "pending-at-cutoff" : "failed";
  row.transferBytes = 0;
  row.encodedBodyBytes = 0;
  row.decodedBodyBytes = 0;
}

/**
 * A page can cancel an exchange once its response begins, as the Usercentrics
 * SDK does with its consent POST after the status arrives. Chromium then reports
 * no loadingFinished total, so count the header and body bytes that arrived
 * before the cancel. Without the header count the bytes stay unknown.
 */
function settleCancelled(row: NetworkRequest, headerBytes?: number) {
  if (headerBytes === undefined) {
    return;
  }
  row.cancelledAfterResponse = true;
  row.transferBytes = headerBytes + (row.encodedDataBytes ?? 0);
  row.encodedBodyBytes = row.encodedDataBytes ?? 0;
  row.decodedBodyBytes ??= 0;
}

// Chromium's default Resource Timing buffer. A full buffer drops later entries.
const RESOURCE_TIMING_BUFFER = 250;
const WORKER_AUDIT_TIMEOUT_MS = 2000;
const WORKER_ENTRY_BINDING = "__cookiebenchResourceEntry";
// Runs in each worker before it resumes, so a worker that exits before the
// snapshot has still reported every entry whose observer callback ran.
const WORKER_OBSERVER = `new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) ${WORKER_ENTRY_BINDING}(entry.name);
}).observe({ buffered: true, type: "resource" })`;
const DETACHED = /Target detached|No session with given id/u;
const UNVERIFIED_WORKER =
  "Worker traffic can start before its target's network events are enabled";

const withoutFragment = (url: string) => url.split("#", 1)[0] ?? url;

/**
 * Resource Timing entries a worker reported that no row from its own target
 * accounts for. The browser adds an entry when a response ends, after the
 * request's start event, so every entry read after the window must have a row.
 * Each row accounts for one entry with its URL.
 */
export function unaccountedWorkerEntries(
  entries: readonly string[],
  rowUrls: readonly string[]
): string[] {
  const available = new Map<string, number>();
  for (const url of rowUrls) {
    const key = withoutFragment(url);
    available.set(key, (available.get(key) ?? 0) + 1);
  }
  const missing: string[] = [];
  for (const entry of entries) {
    if (!/^https?:/u.test(entry)) {
      continue;
    }
    const key = withoutFragment(entry);
    const count = available.get(key) ?? 0;
    if (count === 0) {
      missing.push(entry);
    } else {
      available.set(key, count - 1);
    }
  }
  return missing;
}

export async function collectNetwork(page: Page, pageUrl: string) {
  const session: CDPSession = await page.context().newCDPSession(page);
  const gaps = new Set<string>();
  // Child frames wait for this collector before running. A dedicated worker's
  // fetch has been observed without requestWillBeSent even though Network.enable
  // on the worker target completed before the worker resumed, so a worker keeps
  // coverage incomplete until its own Resource Timing entries all match rows.
  const workerTargets: ChildTarget[] = [];
  // Entries each worker's observer reported, once its observer is installed.
  const workerEntries = new Map<ChildTarget, string[]>();
  let playwrightWorkers = page.workers().length;
  let workerVerification: string | undefined =
    playwrightWorkers > 0 ? UNVERIFIED_WORKER : undefined;
  page.on("worker", () => {
    playwrightWorkers += 1;
    workerVerification = UNVERIFIED_WORKER;
  });
  const serviceWorkerGap = () =>
    gaps.add("Service-worker traffic is outside the attached page CDP targets");
  page.context().on("serviceworker", serviceWorkerGap);
  page.context().on("page", (other) => {
    if (other !== page) {
      gaps.add(
        "Additional-page traffic is outside the attached page CDP targets"
      );
    }
  });
  if (page.context().serviceWorkers().length) {
    serviceWorkerGap();
  }
  // Playwright's worker event excludes SharedWorker. Discover those targets passively.
  try {
    const { targetInfo } = await session.send("Target.getTargetInfo");
    session.on("Target.targetCreated", ({ targetInfo: target }) => {
      if (
        target.type === "shared_worker" &&
        (!targetInfo.browserContextId ||
          !target.browserContextId ||
          target.browserContextId === targetInfo.browserContextId)
      ) {
        gaps.add(
          "Shared-worker traffic is outside the attached page CDP targets"
        );
      }
    });
    await session.send("Target.setDiscoverTargets", {
      discover: true,
      filter: [{ exclude: false, type: "shared_worker" }, { exclude: true }],
    });
  } catch {
    gaps.add(
      "Shared-worker target discovery was unavailable; network coverage cannot be verified"
    );
  }
  const requests: NetworkRequest[] = [];
  const active = new Map<string, NetworkRequest>();
  // The sessions that announced each row, to match a worker's own requests.
  const announcers = new Map<string, Set<ProtocolSession>>();
  const requestIds = new Map<string, string>();
  // Body reads go to the target that delivered the response.
  const bodySessions = new Map<string, ProtocolSession>();
  const contentLengths = new Map<string, number>();
  // responseReceived encodedDataLength: the bytes received when headers arrived.
  const headerBytes = new Map<string, number>();
  const cancelled = new Set<string>();
  const completed = new Set<string>();
  const started = new Set<string>();
  const revalidated = new Set<string>();
  const pendingRaw = new Map<string, number[]>();
  // responseReceivedExtraInfo has no timestamp, so snapshots apply it from these sets.
  const rawResponse = (row: NetworkRequest, statusCode: number) => {
    row.responseStarted = true;
    started.add(row.id);
    if (statusCode === 304) {
      // A revalidated response reports the cached 200 with the 304's
      // transfer; its Content-Length describes cached, not received, bytes.
      row.revalidated = true;
      revalidated.add(row.id);
    }
  };
  const revisions: NetworkRevision[] = [];
  const record = (row: NetworkRequest, monotonicSeconds: number) => {
    revisions.push({
      at: row.wallTimeMs + monotonicSeconds * 1000 - row.startedAt,
      request: { ...row },
    });
  };
  // In-process frames report through the page target. Out-of-process frames and
  // workers report through their own targets, and one request can start on the
  // page target and finish on a child, so rows are keyed by CDP request ID.
  const known = (requestId: string) => {
    const row = active.get(requestId);
    if (!row) {
      gaps.add(
        "Network events arrived for a request whose start was not observed"
      );
    }
    return row;
  };
  const listen = (source: ProtocolSession) => {
    source.on("Network.requestWillBeSent", (event) => {
      const existing = active.get(event.requestId);
      if (event.redirectResponse && existing) {
        existing.status = event.redirectResponse.status;
        existing.bodyDigestUnavailable =
          "Exact response body unavailable for redirected request hop";
        existing.transferBytes = event.redirectResponse.encodedDataLength;
        if (
          existing.decodedBodyBytes === undefined &&
          existing.encodedDataBytes === undefined
        ) {
          // Chromium followed the redirect from its headers; no hop body was read.
          existing.encodedBodyBytes = 0;
          existing.decodedBodyBytes = 0;
        }
        existing.finished = true;
        record(existing, event.timestamp);
      } else if (
        existing &&
        !existing.finished &&
        existing.url === event.request.url
      ) {
        // Another target announced the same request.
        announcers.get(existing.id)?.add(source);
        return;
      }
      const row: NetworkRequest = {
        finished: false,
        hostname: new URL(event.request.url).hostname,
        id: `${event.requestId}:${requests.length}`,
        method: event.request.method,
        party: classifyHostname(event.request.url, pageUrl),
        phase: "initial",
        resourceType: event.type ?? "Other",
        startedAt: event.timestamp * 1000,
        ...(event.type === "Preflight" ||
        (event.request.method === "OPTIONS" &&
          header(event.request.headers, "access-control-request-method"))
          ? { preflight: true }
          : {}),
        url: event.request.url,
        wallTimeMs: event.wallTime * 1000,
      };
      requestIds.set(row.id, event.requestId);
      announcers.set(row.id, new Set([source]));
      active.set(event.requestId, row);
      requests.push(row);
      const raw = pendingRaw.get(event.requestId)?.shift();
      if (raw !== undefined) {
        rawResponse(row, raw);
      }
      record(row, event.timestamp);
    });
    source.on("Network.responseReceivedExtraInfo", (event) => {
      // Raw headers arrive even when CORS or ORB later hides the response, and
      // can arrive before requestWillBeSent, so unmatched ones wait for a row.
      const row = active.get(event.requestId);
      if (row && !started.has(row.id)) {
        rawResponse(row, event.statusCode);
      } else {
        pendingRaw.set(event.requestId, [
          ...(pendingRaw.get(event.requestId) ?? []),
          event.statusCode,
        ]);
      }
    });
    source.on("Network.responseReceived", (event) => {
      const row = known(event.requestId);
      if (!row) {
        return;
      }
      bodySessions.set(row.id, source);
      row.status = event.response.status;
      row.responseContentType = event.response.mimeType;
      row.fromCache = Boolean(
        row.fromCache ||
        event.response.fromDiskCache ||
        event.response.fromPrefetchCache ||
        event.response.fromServiceWorker
      );
      const length = contentLength(event.response.headers);
      if (length !== undefined) {
        contentLengths.set(row.id, length);
      }
      if (event.response.encodedDataLength !== undefined) {
        headerBytes.set(row.id, event.response.encodedDataLength);
      }
      row.contentEncoding = header(event.response.headers, "content-encoding")
        ?.trim()
        .toLowerCase();
      if (hasNoBody(row)) {
        row.encodedBodyBytes = 0;
        row.decodedBodyBytes = 0;
      }
      record(row, event.timestamp);
    });
    source.on("Network.requestServedFromCache", (event) => {
      const row = active.get(event.requestId);
      if (row) {
        row.fromCache = true;
      }
    });
    source.on("Network.dataReceived", (event) => {
      const row = known(event.requestId);
      if (!row) {
        return;
      }
      row.decodedBodyBytes = (row.decodedBodyBytes ?? 0) + event.dataLength;
      row.encodedDataBytes =
        (row.encodedDataBytes ?? 0) + event.encodedDataLength;
      record(row, event.timestamp);
    });
    source.on("Network.loadingFinished", (event) => {
      const row = known(event.requestId);
      if (!row || row.finished) {
        return;
      }
      bodySessions.set(row.id, source);
      row.transferBytes = event.encodedDataLength;
      row.finished = true;
      completed.add(row.id);
      record(row, event.timestamp);
    });
    source.on("Network.loadingFailed", (event) => {
      const row = known(event.requestId);
      if (!row || row.finished) {
        return;
      }
      row.failed = event.errorText;
      if (event.canceled) {
        cancelled.add(row.id);
      }
      // CORS can reject a response after its headers arrived.
      row.responseStarted ||= event.corsErrorStatus !== undefined;
      row.finished = true;
      record(row, event.timestamp);
    });
  };
  const observeWorker = async (target: ChildTarget) => {
    const entries: string[] = [];
    target.session.on("Runtime.bindingCalled", (event) => {
      if (event.name === WORKER_ENTRY_BINDING) {
        entries.push(event.payload);
      }
    });
    try {
      await target.session.send("Runtime.addBinding", {
        name: WORKER_ENTRY_BINDING,
      });
      const installed = await target.session.send("Runtime.evaluate", {
        expression: WORKER_OBSERVER,
      });
      if (!installed.exceptionDetails) {
        workerEntries.set(target, entries);
      }
    } catch (error) {
      // Preparation finishes before the worker resumes, so one that detached
      // here never ran and sent nothing.
      if (DETACHED.test(String(error))) {
        workerEntries.set(target, entries);
      }
    }
  };
  listen(session);
  await session.send("Network.enable");
  const targets = await attachChildTargets(session);
  await targets.prepare(async (target) => {
    if (target.type === "worker") {
      workerTargets.push(target);
      workerVerification = UNVERIFIED_WORKER;
    } else if (target.type !== "iframe") {
      gaps.add(`${target.type} traffic cannot be verified`);
    }
    listen(target.session);
    try {
      await target.session.send("Network.enable");
    } catch (error) {
      // A target detached before resuming never ran, so it sent no requests.
      if (!DETACHED.test(String(error))) {
        gaps.add(
          `Network events were unavailable for a ${target.type} target: ${String(error)}`
        );
      }
    }
    if (target.type === "worker") {
      await observeWorker(target);
    }
  });
  /** Settle a frozen row's byte fields; true when its body was never read. */
  const settleRow = (row: NetworkRequest): boolean => {
    // Headers seen after the cutoff can only withhold, never add, bytes.
    row.responseStarted ||= started.has(row.id) || undefined;
    row.revalidated ||= revalidated.has(row.id) || undefined;
    settleWithoutResponse(row);
    // A frozen row carries `failed` only if the cancel preceded the cutoff.
    if (row.failed && !row.noResponse && cancelled.has(row.id)) {
      settleCancelled(row, headerBytes.get(row.id));
    }
    if (!row.finished || row.failed) {
      return false;
    }
    let undelivered = false;
    if (hasNoBody(row)) {
      row.encodedBodyBytes = 0;
      row.decodedBodyBytes = 0;
    } else if (!row.fromCache && !row.revalidated && completed.has(row.id)) {
      undelivered = settleBodySizes(row, contentLengths.get(row.id));
    }
    const problems = byteInconsistencies(row);
    if (problems.length) {
      row.byteInconsistencies = problems;
    }
    return undelivered;
  };
  /** A running worker's Resource Timing buffer, unless it has exited or filled. */
  const readWorkerBuffer = async (
    target: ChildTarget
  ): Promise<string[] | undefined> => {
    const expiry = new AbortController();
    const expire = async () => {
      await delay(WORKER_AUDIT_TIMEOUT_MS, undefined, {
        signal: expiry.signal,
      });
      throw new Error("timed out");
    };
    try {
      const response = await Promise.race([
        target.session.send("Runtime.evaluate", {
          expression:
            "performance.getEntriesByType('resource').map((entry) => entry.name)",
          returnByValue: true,
        }),
        expire(),
      ]);
      const entries: unknown = response.result?.value;
      return Array.isArray(entries) && entries.length < RESOURCE_TIMING_BUFFER
        ? (entries as string[])
        : undefined;
    } catch {
      // The worker has exited, or didn't answer in time.
    } finally {
      expiry.abort();
    }
  };
  /**
   * Match a worker's Resource Timing entries to the rows its target announced.
   * A running worker's buffer is read directly. A worker that has exited is
   * checked against what its observer reported, which can miss an entry whose
   * callback had not run when the worker stopped. Requests still in flight, and
   * failures the browser gives no entry, aren't covered by this check.
   */
  const auditWorker = async (
    target: ChildTarget
  ): Promise<string | undefined> => {
    const entries =
      (await readWorkerBuffer(target)) ?? workerEntries.get(target);
    if (!entries) {
      return `Worker ${target.url} could not be checked: it stopped before reporting its requests`;
    }
    const own = requests
      .filter((row) => announcers.get(row.id)?.has(target.session))
      .map((row) => row.url);
    const missing = unaccountedWorkerEntries(entries, own);
    return missing.length
      ? `Worker requests had no network events: ${missing.join(", ")}`
      : undefined;
  };
  const auditWorkers = async () => {
    if (workerVerification === undefined) {
      return;
    }
    if (playwrightWorkers > workerTargets.length) {
      workerVerification = "A worker started without an attached target";
      return;
    }
    const reasons = await Promise.all(workerTargets.map(auditWorker));
    workerVerification = reasons.find((reason) => reason !== undefined);
  };
  const snapshot = async (deadlineEpochMs?: number) => {
    await auditWorkers();
    const frozen =
      deadlineEpochMs === undefined
        ? requests.map((request) => ({ ...request }))
        : networkAtDeadline(revisions, deadlineEpochMs);
    for (const row of frozen) {
      const undelivered = settleRow(row);
      if (!row.finished || row.failed || !hasDigestibleBody(row)) {
        continue;
      }
      const bodyless = hasNoBody(row);
      if (undelivered) {
        // getResponseBody returns an empty body here, which is not the response.
        row.bodyDigestUnavailable =
          "Response body was not delivered to a renderer";
        continue;
      }
      const requestId = requestIds.get(row.id);
      const bodySession = bodySessions.get(row.id) ?? session;
      if (!requestId || active.get(requestId)?.id !== row.id) {
        row.bodyDigestUnavailable =
          "Exact response body unavailable for redirected request hop";
        continue;
      }
      try {
        // CDP identity, not URL/order matching, selects the completed response.
        // Reads remain passive and happen only after the frozen measurement window.
        let body = Buffer.alloc(0);
        row.bodyDigestEncoding = "empty-body";
        if (!bodyless) {
          // oxlint-disable-next-line no-await-in-loop -- Read completed protocol bodies serially after timing collection.
          const response = await bodySession.send("Network.getResponseBody", {
            requestId,
          });
          body = Buffer.from(
            response.body,
            response.base64Encoded ? "base64" : "utf-8"
          );
          row.bodyDigestEncoding = response.base64Encoded
            ? "base64-bytes"
            : "utf8-text";
        }
        row.decodedBodySha256 = createHash("sha256").update(body).digest("hex");
      } catch (error) {
        row.bodyDigestUnavailable = String(error);
      }
    }
    return frozen;
  };
  return {
    coverage: (): NetworkCoverage => {
      const reasons = [...gaps];
      if (workerVerification !== undefined) {
        reasons.push(workerVerification);
      }
      return {
        complete: reasons.length === 0,
        reasons: reasons.toSorted(),
        scope: "page-tree",
      };
    },
    requests,
    session,
    snapshot,
    targets,
  };
}
