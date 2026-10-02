import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { cpus, platform, release, totalmem } from "node:os";
import path from "node:path";

import { decodeResult, METHODOLOGY_VERSION } from "@cookiebench/schema";
import type {
  ResultEnvelope,
  Sample,
  FixtureConfig,
  ScenarioConfig,
} from "@cookiebench/schema";
import { Effect } from "effect";

import { decodeRunConfig } from "./config.ts";
import type { RunConfig } from "./config.ts";
import { validateCalibrationRuntime } from "./cpu-calibration.ts";
import {
  attempt,
  browserResource,
  measurementLock,
  productionServer,
  RunnerError,
  BrowserService,
} from "./lifecycle.ts";
import { seededOrder } from "./order.ts";
import { hashCollectorSource } from "./provenance.ts";
import { runSample } from "./scenario.ts";

export { RunnerError, BrowserService } from "./lifecycle.ts";
export {
  REFERENCE_VARIANTS,
  desktopProfile,
  referenceFixture,
  referenceScenario,
  referenceRunConfig,
} from "./reference.ts";
export { classifyHostname } from "./network.ts";
export { runInstrumentationOverhead } from "./overhead.ts";
export { RunConfig, decodeRunConfig } from "./config.ts";
export { runCpuCalibration, applyCpuCalibration } from "./cpu-calibration.ts";
const require = createRequire(import.meta.url);
function combinedStatus(
  samples: readonly { status: Sample["status"] }[]
): Sample["status"] {
  if (samples.some((sample) => sample.status === "incomplete")) {
    return "incomplete";
  }
  if (samples.some((sample) => sample.status === "failed")) {
    return "failed";
  }
  return "passed";
}
const COLLECTOR_VERSION = "cookiebench-runner-3.2.2";
export const runBenchmark = (input: RunConfig) =>
  Effect.scoped(
    Effect.gen(function* benchmarkScope() {
      const config = yield* Effect.try({
        catch: (cause) =>
          new RunnerError({
            cause,
            code: "configuration",
            message: String(cause),
          }),
        try: () => decodeRunConfig(input),
      });
      yield* measurementLock();
      const collectorSourceHash = yield* attempt("collector-source-hash", () =>
        hashCollectorSource(import.meta.dirname)
      );
      const manifestId = randomUUID();
      const createdAt = new Date().toISOString();
      const samples: Sample[] = [];
      const prepared = new Set<string>();
      for (const fixture of config.fixtures) {
        if (fixture.server && !prepared.has(fixture.server.readinessUrl)) {
          yield* productionServer(fixture);
          prepared.add(fixture.server.readinessUrl);
        }
      }
      const browser = yield* browserResource(config.executablePath);
      yield* validateCalibrationRuntime(
        config.profile,
        browser,
        config.executablePath
      );
      const vitalsSource = yield* attempt("collector-load", () =>
        readFile(
          path.join(
            path.dirname(require.resolve("web-vitals")),
            "web-vitals.iife.js"
          ),
          "utf-8"
        )
      );
      const execute = (
        fixture: typeof FixtureConfig.Type,
        scenario: typeof ScenarioConfig.Type,
        iteration: number
      ) =>
        Effect.gen(function* sampleScope() {
          const options = {
            browser,
            fixture,
            iteration,
            profile: config.profile,
            runId: manifestId,
            scenario,
            vitalsSource,
          };
          const primary = yield* runSample({ ...options, probe: "primary" });
          if (
            fixture.baseline ||
            !fixture.adapter.pageAction ||
            !["accept", "reject", "save", "withdraw"].includes(scenario.action)
          ) {
            return primary;
          }
          const followup = yield* runSample({ ...options, probe: "followup" });
          const followupMetric = followup.measurements.find(
            (metric) => metric.key === "action.followup-input-to-next-paint"
          );
          const failures = [
            ...primary.failures,
            ...followup.failures.map((failure) => ({
              code: `followup:${failure.code}`,
              message: failure.message,
            })),
          ];
          return {
            ...primary,
            diagnostics: {
              ...primary.diagnostics,
              followupProbe: followup,
              primaryOutcome: {
                failures: primary.failures,
                status: primary.status,
              },
            },
            failures,
            measurements: primary.measurements.map((metric) =>
              metric.key === "action.followup-input-to-next-paint" &&
              followupMetric
                ? followupMetric
                : metric
            ),
            status: combinedStatus([primary, followup]),
          };
        }).pipe(
          Effect.provideService(BrowserService, { browser }),
          // oxlint-disable-next-line promise/prefer-await-to-then, promise/prefer-await-to-callbacks -- Effect.catch handles the typed error channel, not a Promise.
          Effect.catch((error) =>
            Effect.succeed({
              attempt: 1,
              diagnostics: { phase: "infrastructure" },
              failures: [{ code: error.code, message: error.message }],
              fixtureId: fixture.id,
              id: randomUUID(),
              iteration,
              measurements: [],
              runId: manifestId,
              scenarioId: scenario.id,
              status: "incomplete" as const,
            } satisfies Sample)
          )
        );
      for (let warmup = 0; warmup < (config.warmups ?? 0); warmup += 1) {
        for (const fixture of config.fixtures) {
          for (const scenario of config.scenarios) {
            yield* execute(fixture, scenario, warmup);
          }
        }
      }
      const nextFixtureOrder = seededOrder(config.fixtures, config.seed);
      for (let iteration = 0; iteration < config.iterations; iteration += 1) {
        // No Promise.all: measured workloads run serially, under a machine-wide process lock.
        for (const scenario of config.scenarios) {
          for (const fixture of nextFixtureOrder()) {
            const sample = yield* execute(fixture, scenario, iteration);
            samples.push({ ...sample, pairId: `${scenario.id}:${iteration}` });
          }
        }
      }
      const version = (name: string): string => {
        const packagePath =
          name === "web-vitals"
            ? path.join(
                path.dirname(require.resolve(name)),
                "..",
                "package.json"
              )
            : require.resolve(`${name}/package.json`);
        try {
          return (require(packagePath) as { version: string }).version;
        } catch {
          return "unavailable";
        }
      };
      let lockfileHash = "unavailable";
      try {
        lockfileHash = createHash("sha256")
          .update(
            yield* attempt("lockfile-read", () =>
              readFile(new URL("../../../pnpm-lock.yaml", import.meta.url))
            )
          )
          .digest("hex");
      } catch {
        /* Missing provenance remains explicit. */
      }
      const result: ResultEnvelope = {
        artifacts: [],
        capabilities: config.fixtures
          .filter((fixture) => !fixture.baseline)
          .flatMap((fixture) =>
            config.scenarios.map((scenario) => {
              const relevant = samples.filter(
                (sample) =>
                  sample.fixtureId === fixture.id &&
                  sample.scenarioId === scenario.id
              );
              const passed =
                relevant.length > 0 &&
                relevant.every((sample) => sample.status === "passed");
              let capabilityStatus: "verified" | "failed" | "unknown" =
                "unknown";
              if (relevant.some((sample) => sample.status === "failed")) {
                capabilityStatus = "failed";
              }
              if (passed) {
                capabilityStatus = "verified";
              }
              return {
                capability: `consent-flow:${scenario.id}`,
                evidence: relevant.map((sample) => `sample:${sample.id}`),
                fixtureId: fixture.id,
                framework: fixture.framework,
                id: randomUUID(),
                mode: fixture.mode,
                reason: `${relevant.filter((sample) => sample.status === "passed").length}/${relevant.length} declared scenario attempts passed; this check covers only the recorded action, state, workload and profile`,
                status: capabilityStatus,
                verifiedAt: new Date().toISOString(),
              };
            })
          ),
        fixtures: config.fixtures,
        manifest: {
          collectorVersion: COLLECTOR_VERSION,
          createdAt,
          environment: {
            collectorSourceHash,
            cpu: cpus()[0]?.model ?? "unavailable",
            lockfileHash,
            logicalCpus: String(cpus().length),
            memoryBytes: String(totalmem()),
            order:
              "continuous LCG32 Fisher-Yates using full fractional draws; seeded fixture permutation within scenario and iteration",
            platform: platform(),
            region: config.profile.region,
            regionMethod:
              "declared label only; no geolocation or egress-region emulation",
            release: release(),
            serverCache:
              "production server shared for run; browser cache declared per scenario",
            warmups: String(config.warmups ?? 0),
          },
          id: manifestId,
          methodologyVersion: METHODOLOGY_VERSION,
          profile: config.profile,
          seed: config.seed,
          versions: {
            browser: browser.version(),
            effect: version("effect"),
            node: process.version,
            playwright: version("playwright"),
            "web-vitals": version("web-vitals"),
          },
        },
        samples,
        scenarios: config.scenarios,
        schemaVersion: 3,
        status: combinedStatus(samples),
      };
      return yield* Effect.try({
        catch: (cause) =>
          new RunnerError({
            cause,
            code: "result-validation",
            message: String(cause),
          }),
        try: () => decodeResult(result),
      });
    })
  );
export const runBenchmarkPromise = (
  config: RunConfig,
  options?: { signal?: AbortSignal }
) => Effect.runPromise(runBenchmark(config), options);
export const verifyCapabilities = (config: RunConfig) =>
  runBenchmark(config).pipe(Effect.map((result) => result.capabilities));
