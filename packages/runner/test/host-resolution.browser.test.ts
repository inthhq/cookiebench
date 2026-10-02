import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { FixtureConfig } from "@cookiebench/schema";
import { expect, test } from "@playwright/test";
import { Effect } from "effect";

import {
  hostResolution,
  hostResolutionArgs,
  hostResolutionEnv,
} from "../src/host-resolution.ts";
import { browserResource, productionServer } from "../src/lifecycle.ts";

const serve = fileURLToPath(
  new URL("../../fixture-support/src/serve.ts", import.meta.url)
);

test("serves a fixture under a mapped HTTPS hostname with a pinned certificate", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cookiebench-host-"));
  try {
    await writeFile(
      path.join(directory, "index.html"),
      "<!doctype html><title>mapped</title><p>mapped fixture</p>"
    );
    const fixture = {
      id: "mapped",
      resolveHost: "127.0.0.1",
      server: {
        cwd: directory,
        readinessTimeoutMs: 20_000,
        readinessUrl: "http://127.0.0.1:4390/health",
        start: {
          args: [
            serve,
            "--port",
            "4390",
            "--tls-port",
            "4391",
            "--static",
            directory,
          ],
          command: process.execPath,
        },
      },
      url: "https://fixture.cookiebench.test:4391/",
    } as unknown as FixtureConfig;
    const observed = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* mappedFixture() {
          const resolution = yield* hostResolution([fixture]);
          yield* productionServer(fixture, hostResolutionEnv(resolution));
          const pinned = yield* browserResource(
            undefined,
            hostResolutionArgs(resolution)
          );
          const unpinned = yield* browserResource(
            undefined,
            hostResolutionArgs({ hosts: resolution.hosts })
          );
          return yield* Effect.promise(async () => {
            const page = await pinned.newPage();
            const response = await page.goto(fixture.url);
            const unpinnedPage = await unpinned.newPage();
            const rejected = await unpinnedPage.goto(fixture.url).then(
              () => "loaded",
              (error: Error) => error.message
            );
            return {
              hostname: await page.evaluate(() => location.hostname),
              rejected,
              secure: await page.evaluate(() => isSecureContext),
              status: response?.status(),
              text: await page.textContent("p"),
            };
          });
        })
      )
    );
    expect(observed).toMatchObject({
      hostname: "fixture.cookiebench.test",
      secure: true,
      status: 200,
      text: "mapped fixture",
    });
    // Without the pin, Chromium still rejects the self-signed certificate.
    expect(observed.rejected).toContain("ERR_CERT_AUTHORITY_INVALID");
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
