/* oxlint-disable no-await-in-loop, promise/avoid-new, max-classes-per-file -- Readiness retries and resource ownership are serial; child-process events require Promise adapters. The error and service define this lifecycle boundary. */
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { open, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import type { FixtureConfig } from "@cookiebench/schema";
import { Context, Data, Effect } from "effect";
import { chromium } from "playwright";
import type { Browser } from "playwright";

export class RunnerError extends Data.TaggedError("RunnerError")<{
  readonly code: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}
export const attempt = <A>(
  code: string,
  operation: (signal: AbortSignal) => Promise<A>
) =>
  Effect.tryPromise({
    catch: (cause) =>
      new RunnerError({
        cause,
        code,
        message: cause instanceof Error ? cause.message : String(cause),
      }),
    try: operation,
  });
const cleanup = (operation: () => Promise<unknown>) =>
  Effect.promise(operation);

export class BrowserService extends Context.Service<
  BrowserService,
  { browser: Browser }
>()("cookiebench/BrowserService") {}
export const browserResource = (
  executablePath?: string,
  args: readonly string[] = []
) =>
  Effect.acquireRelease(
    attempt("browser-launch", () =>
      chromium.launch({
        args: [...args],
        executablePath,
        // The CLI owns signal handling so scope finalizers close fixture servers before exit.
        handleSIGINT: false,
        handleSIGTERM: false,
        headless: true,
      })
    ),
    (browser) => cleanup(() => browser.close())
  );

async function killTree(child: ChildProcess) {
  const { pid } = child;
  if (!pid) {
    return;
  }
  const kill = (signal: NodeJS.Signals) => {
    try {
      process.kill(process.platform === "win32" ? pid : -pid, signal);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
        throw error;
      }
    }
  };
  kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve();
      } else {
        child.once("exit", () => resolve());
      }
    }),
    delay(500),
  ]);
  // Also kill descendants if the parent exited before them.
  kill("SIGKILL");
}
function processResource(
  command: { command: string; args: readonly string[] },
  cwd: string,
  env: Record<string, string> = {}
) {
  return Effect.acquireRelease(
    attempt("server-spawn", async () => {
      const child = spawn(command.command, [...command.args], {
        cwd,
        detached: process.platform !== "win32",
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let logs = "";
      child.stdout?.on("data", (data) => {
        logs = (logs + String(data)).slice(-16_384);
      });
      child.stderr?.on("data", (data) => {
        logs = (logs + String(data)).slice(-16_384);
      });
      await new Promise<void>((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
      return { child, logs: () => logs };
    }),
    ({ child }) => cleanup(() => killTree(child))
  );
}
export const productionServer = (
  fixture: FixtureConfig,
  env: Record<string, string> = {}
) =>
  Effect.gen(function* serverScope() {
    const config = fixture.server;
    if (!config) {
      return;
    }
    const command = config.build;
    if (command) {
      yield* Effect.scoped(
        Effect.gen(function* buildScope() {
          const build = yield* processResource(command, config.cwd);
          yield* attempt(
            "fixture-build",
            (signal) =>
              new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(
                  () =>
                    reject(new Error("Production build exceeded 120 seconds")),
                  120_000
                );
                const finish = (code: number | null) => {
                  clearTimeout(timeout);
                  if (code === 0) {
                    resolve();
                    return;
                  }
                  reject(new Error(`Build exited ${code}: ${build.logs()}`));
                };
                if (build.child.exitCode === null) {
                  build.child.once("exit", finish);
                } else {
                  finish(build.child.exitCode);
                }
                signal.addEventListener(
                  "abort",
                  () => {
                    clearTimeout(timeout);
                    reject(new Error("Build interrupted"));
                  },
                  { once: true }
                );
              })
          );
        })
      );
    }
    const server = yield* processResource(config.start, config.cwd, env);
    yield* attempt("server-readiness", async (signal) => {
      const deadline = performance.now() + config.readinessTimeoutMs;
      while (performance.now() < deadline) {
        if (server.child.exitCode !== null) {
          throw new Error(
            `Server exited ${server.child.exitCode}: ${server.logs()}`
          );
        }
        try {
          const response = await fetch(config.readinessUrl, {
            signal: AbortSignal.any([signal, AbortSignal.timeout(500)]),
          });
          if (response.ok) {
            await response.body?.cancel();
            return;
          }
          await response.body?.cancel();
        } catch (error) {
          if (signal.aborted) {
            throw error;
          }
        }
        await delay(50, undefined, { signal });
      }
      throw new Error(`Server readiness deadline exceeded: ${server.logs()}`);
    });
  });

export const measurementLock = (
  lockPath = path.join(tmpdir(), "cookiebench-v3-measurement.lock")
) =>
  Effect.acquireRelease(
    attempt("measurement-lock", async () => {
      const create = async () => {
        const file = await open(lockPath, "wx");
        try {
          await file.writeFile(String(process.pid));
        } catch (error) {
          await unlink(lockPath);
          throw error;
        } finally {
          await file.close();
        }
        return lockPath;
      };
      try {
        return await create();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          throw error;
        }
      }
      // Only one contender may examine and remove a stale owner. Re-read after
      // acquiring this guard; an earlier contender may already own the main lock.
      const recoveryPath = `${lockPath}.recovery`;
      const recovery = await open(recoveryPath, "wx");
      try {
        let pid: number;
        try {
          pid = Number(await readFile(lockPath, "utf-8"));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return await create();
          }
          throw error;
        }
        if (!Number.isSafeInteger(pid) || pid <= 0) {
          throw new Error(`Measurement lock has an invalid owner: ${lockPath}`);
        }
        try {
          process.kill(pid, 0);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
            throw error;
          }
          await unlink(lockPath);
          return await create();
        }
        throw new Error(`Another measured workload is active, PID ${pid}`);
      } finally {
        await recovery.close();
        await unlink(recoveryPath);
      }
    }),
    (ownedPath) => cleanup(() => unlink(ownedPath))
  );
