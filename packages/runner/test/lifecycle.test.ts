/* oxlint-disable promise/avoid-new -- Barriers hold successful owners while every competing acquisition reports its outcome. */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import type * as Filesystem from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Effect } from "effect";
import { expect, test, vi } from "vitest";

import { measurementLock } from "../src/lifecycle.ts";

const schedule = vi.hoisted(() => ({
  acquired: Promise.resolve(true),
  filename: "",
  staleReads: 0,
}));
vi.mock("node:fs/promises", async (original) => {
  const filesystem = await original<typeof Filesystem>();
  return {
    ...filesystem,
    readFile: async (...args: Parameters<typeof filesystem.readFile>) => {
      const content = await filesystem.readFile(...args);
      if (args[0] === schedule.filename && String(content) === "2147483647") {
        schedule.staleReads += 1;
        if (schedule.staleReads > 1) {
          // Hold stale readers until the first contender owns the replacement.
          await schedule.acquired;
        }
      }
      return content;
    },
  };
});

test("concurrent stale-lock recovery admits exactly one owner and interruption releases it", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "cookiebench-lock-test-")
  );
  const filename = path.join(directory, "measurement.lock");
  const controller = new AbortController();
  const running: Promise<void>[] = [];
  const { promise, resolve: notifyAcquired } = Promise.withResolvers<boolean>();
  schedule.filename = filename;
  schedule.staleReads = 0;
  schedule.acquired = promise;
  try {
    await writeFile(filename, "2147483647");
    const outcomes = Array.from(
      { length: 12 },
      () =>
        new Promise<boolean>((resolve) => {
          running.push(
            (async () => {
              try {
                await Effect.runPromise(
                  Effect.scoped(
                    Effect.gen(function* contenderScope() {
                      yield* measurementLock(filename);
                      notifyAcquired(true);
                      resolve(true);
                      yield* Effect.never;
                    })
                  ),
                  { signal: controller.signal }
                );
              } catch {
                resolve(false);
              }
            })()
          );
        })
    );
    // A successful contender holds its scope until all other attempts report.
    const acquired = await Promise.all(outcomes);
    expect(acquired.filter(Boolean)).toHaveLength(1);
    expect(await readFile(filename, "utf-8")).toBe(String(process.pid));
    controller.abort();
    await Promise.all(running);
    await expect(readFile(filename, "utf-8")).rejects.toMatchObject({
      code: "ENOENT",
    });
    await Effect.runPromise(Effect.scoped(measurementLock(filename)));
  } finally {
    controller.abort();
    await Promise.all(running);
    await rm(directory, { force: true, recursive: true });
  }
});
