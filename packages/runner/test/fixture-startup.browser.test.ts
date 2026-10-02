import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";
import { Effect } from "effect";

import { decodeRunConfig } from "../src/index.ts";
import { productionServer } from "../src/lifecycle.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const vendors = [
  ["cookie-control", "body-end"],
  ["didomi", "head-start"],
  ["enzuzo", "head-start"],
  ["iubenda", "head-end"],
  ["onetrust", "head-start"],
] as const;

// This integration check builds the configured production apps and launches their
// actual package start commands. It makes no remote SDK or browser requests.
test.describe("configured competitor startup", () => {
  test.skip(
    process.env.COOKIEBENCH_COMPETITOR_STARTUP_TESTS !== "1",
    "Set COOKIEBENCH_COMPETITOR_STARTUP_TESTS=1 to build and start competitor fixtures."
  );

  for (const [vendor, placement] of vendors) {
    test(`${vendor} starts through its declared command and serves the bootstrap`, async () => {
      test.setTimeout(180_000);
      const configPath = path.join(
        root,
        "benchmarks",
        `with-${vendor}`,
        "run.json"
      );
      const config = decodeRunConfig(
        JSON.parse(await readFile(configPath, "utf-8"))
      );
      const candidate = config.fixtures.find((fixture) => !fixture.baseline);
      const baseline = config.fixtures.find((fixture) => fixture.baseline);
      if (!candidate?.server || !baseline) {
        throw new Error(
          `${vendor} must declare a production server and baseline`
        );
      }
      const server = {
        ...candidate.server,
        cwd: path.resolve(root, candidate.server.cwd),
      };
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* configuredStartup() {
            yield* productionServer({ ...candidate, server });
            yield* Effect.promise(async () => {
              const candidateResponse = await fetch(candidate.url);
              const candidateHtml = await candidateResponse.text();
              const baselineResponse = await fetch(baseline.url);
              const baselineHtml = await baselineResponse.text();
              expect(candidateResponse.status).toBe(200);
              expect(baselineResponse.status).toBe(200);
              const marker = `data-cookiebench-bootstrap="${vendor}"`;
              expect(candidateHtml.split(marker)).toHaveLength(2);
              expect(baselineHtml).not.toContain("data-cookiebench-bootstrap");
              const bootstrapAt = candidateHtml.indexOf(marker);
              const headEnd = candidateHtml.indexOf("</head>");
              if (placement === "body-end") {
                expect(bootstrapAt).toBeGreaterThan(headEnd);
                expect(bootstrapAt).toBeLessThan(
                  candidateHtml.indexOf("</body>")
                );
              } else {
                expect(bootstrapAt).toBeGreaterThan(
                  candidateHtml.indexOf("<head>")
                );
                expect(bootstrapAt).toBeLessThan(headEnd);
              }
              expect(candidateHtml).toContain('id="primary-content"');
              expect(baselineHtml).toContain('id="primary-content"');
              expect(candidateResponse.headers.has("content-length")).toBe(
                false
              );
              expect(candidateResponse.headers.has("etag")).toBe(false);
              await test.info().attach("configured-startup", {
                body: JSON.stringify({
                  candidateUrl: candidate.url,
                  placement,
                  start: server.start,
                  workingDirectory: server.cwd,
                }),
                contentType: "application/json",
              });
            });
          })
        )
      );
      await expect
        .poll(async () => {
          try {
            const response = await fetch(server.readinessUrl, {
              signal: AbortSignal.timeout(500),
            });
            await response.body?.cancel();
            return response.ok;
          } catch {
            return false;
          }
        })
        .toBe(false);
    });
  }
});
