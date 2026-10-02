import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { cpus, platform, release } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { decodeResult } from "@cookiebench/schema";
import type {
  FixtureConfig,
  ResultEnvelope,
  Sample,
} from "@cookiebench/schema";
import { Effect } from "effect";
import type { Browser } from "playwright";

import {
  installObserver,
  installVitals,
  PAINT_GRACE_MS,
} from "./browser-observer.ts";
import { decodeRunConfig } from "./config.ts";
import type { RunConfig } from "./config.ts";
import { validateCalibrationRuntime } from "./cpu-calibration.ts";
import {
  attempt,
  browserResource,
  measurementLock,
  productionServer,
  RunnerError,
} from "./lifecycle.ts";
import { measured } from "./measure.ts";
import { captureDocuments, installNavigationCapture } from "./navigation.ts";
import { collectNetwork } from "./network.ts";
import { seededOrder } from "./order.ts";
import { hashCollectorSource } from "./provenance.ts";

const require = createRequire(import.meta.url);
const METHODS = {
  fcp: "native paint entry at navigation-relative deadline; 250 ms presentation grace before drain; identical minimal observer in both audit arms",
  lcp: "native LCP entry at navigation-relative deadline; 250 ms presentation grace before drain; identical minimal observer in both audit arms",
  task: "CDP Performance.TaskDuration delta before navigation to recorded endpoint; threadTicks; seconds converted to ms",
};

interface AuditPaint {
  entries: {
    name: string;
    entryType: string;
    startTime: number;
    duration: number;
  }[];
  supported: string[];
  deadline: number;
  stoppedAt?: number;
}
declare global {
  interface Window {
    __auditPaint: AuditPaint;
    __settleAuditPaint: () => Promise<AuditPaint>;
  }
}

// Both arms share only native paint entry collection, one deadline timer and the same presentation grace.
export function installAuditPaint(deadline: number, graceMs: number) {
  const data: AuditPaint = {
    deadline,
    entries: [],
    supported: [...PerformanceObserver.supportedEntryTypes],
  };
  window.__auditPaint = data;
  const observers: PerformanceObserver[] = [];
  const collect = (entries: PerformanceEntry[]) => {
    data.entries.push(
      ...entries
        .filter((entry) => entry.startTime <= deadline)
        .map((entry) => ({
          duration: entry.duration,
          entryType: entry.entryType,
          name: entry.name,
          startTime: entry.startTime,
        }))
    );
  };
  for (const type of ["paint", "largest-contentful-paint"]) {
    if (!data.supported.includes(type)) {
      continue;
    }
    const observer = new PerformanceObserver((list) =>
      collect(list.getEntries())
    );
    observer.observe({ buffered: true, type });
    observers.push(observer);
  }
  let settling: Promise<AuditPaint> | undefined;
  const settle = () => {
    // oxlint-disable-next-line promise/avoid-new -- The page-side timer callback resolves the one shared settlement.
    settling ??= new Promise((resolve) => {
      const drainAfterGrace = () => {
        const remaining = deadline + graceMs - performance.now();
        if (remaining > 0) {
          setTimeout(drainAfterGrace, remaining);
          return;
        }
        for (const observer of observers) {
          collect(observer.takeRecords());
          observer.disconnect();
        }
        data.stoppedAt = performance.now();
        resolve(data);
      };
      drainAfterGrace();
    });
    return settling;
  };
  window.__settleAuditPaint = settle;
  setTimeout(settle, Math.max(0, deadline - performance.now()));
}

export function validateOverheadConfig(input: RunConfig): RunConfig {
  const config = decodeRunConfig(input);
  const [fixture] = config.fixtures;
  const [scenario] = config.scenarios;
  if (
    config.fixtures.length !== 1 ||
    !fixture.baseline ||
    config.scenarios.length !== 1 ||
    scenario.action !== "load" ||
    scenario.visitor !== "fresh" ||
    scenario.cache !== "cold" ||
    scenario.expectedBanner
  ) {
    throw new Error(
      "Instrumentation audit requires one baseline fixture and one cold, fresh load scenario without an expected banner"
    );
  }
  return config;
}

/** The seed drives a continuous PRNG, rather than low-bit alternation by iteration. */
export function overheadOrder(
  seed: number,
  pairs: number
): ("minimal" | "full")[][] {
  const next = seededOrder(["minimal", "full"] as const, seed);
  return Array.from({ length: pairs }, next);
}

const auditSample = Effect.fn("instrumentation.auditSample")(
  function* auditVisit(
    browser: Browser,
    config: RunConfig,
    fixture: FixtureConfig,
    runId: string,
    iteration: number,
    arm: "minimal" | "full",
    vitalsSource: string
  ) {
    const [scenario] = config.scenarios;
    const context = yield* Effect.acquireRelease(
      attempt("audit-context", () =>
        browser.newContext({
          deviceScaleFactor: config.profile.deviceScaleFactor,
          hasTouch: config.profile.hasTouch,
          isMobile: config.profile.isMobile,
          locale: config.profile.locale,
          userAgent: config.profile.userAgent,
          viewport: config.profile.viewport,
        })
      ),
      (resource) => Effect.promise(() => resource.close())
    );
    return yield* attempt("audit-measurement", async (signal) => {
      const page = await context.newPage();
      signal.addEventListener(
        "abort",
        () => {
          void page.close().catch(() => {
            /* Context scope also owns the page. */
          });
        },
        { once: true }
      );
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const session = await context.newCDPSession(page);
      await session.send("Network.enable");
      await session.send("Emulation.setCPUThrottlingRate", {
        rate: config.profile.cpuSlowdown,
      });
      await session.send("Network.emulateNetworkConditions", {
        downloadThroughput: config.profile.network.downloadBytesPerSecond,
        latency: config.profile.network.latencyMs,
        offline: false,
        uploadThroughput: config.profile.network.uploadBytesPerSecond,
      });
      await session.send("Performance.enable", { timeDomain: "threadTicks" });
      const url = new URL(fixture.url);
      url.searchParams.set("scripts", String(scenario.workload.scriptCount));
      // Every trial navigates to exactly the same URL, including within each pair.
      const network =
        arm === "full" ? await collectNetwork(page, url.href) : undefined;
      const documentEvidence = network
        ? await captureDocuments(network.session, "__cookiebenchCapture")
        : undefined;
      let init = `(${installAuditPaint.toString()})(${scenario.observationMs}, ${PAINT_GRACE_MS});`;
      if (arm === "full") {
        init += `\n(${installObserver.toString()})(${JSON.stringify({ ...fixture.adapter, categories: scenario.workload.categories, fixedDeadlineMs: scenario.observationMs, maxDurationMs: scenario.observationMs, paintGraceMs: PAINT_GRACE_MS })});\n${vitalsSource}\nwindow.webVitals = webVitals;\n(${installVitals.toString()})();\n(${installNavigationCapture.toString()})("__cookiebenchCapture", ${JSON.stringify(fixture.adapter.stateGlobal)});`;
      }
      await page.addInitScript({ content: init });
      const before = await session.send("Performance.getMetrics");
      await page.goto(url.href, {
        timeout: scenario.navigationTimeoutMs,
        waitUntil: "domcontentloaded",
      });
      const remaining = await page.evaluate(
        (deadline) => Math.max(0, deadline - performance.now()),
        scenario.observationMs
      );
      await delay(remaining, undefined, { signal });
      const after = await session.send("Performance.getMetrics");
      const raw = await page.evaluate(async () => {
        const endpointAt = performance.now();
        const [paint, observations] = await Promise.all([
          window.__settleAuditPaint(),
          window.__bench?.settle(),
        ]);
        return {
          endpointAt,
          observations,
          paint,
          timeOrigin: performance.timeOrigin,
          userAgent: navigator.userAgent,
        };
      });
      const startMetrics = Object.fromEntries(
        before.metrics.map((metric) => [metric.name, metric.value])
      );
      const endMetrics = Object.fromEntries(
        after.metrics.map((metric) => [metric.name, metric.value])
      );
      const duration = (name: string) =>
        startMetrics[name] !== undefined && endMetrics[name] !== undefined
          ? (endMetrics[name] - startMetrics[name]) * 1000
          : undefined;
      const metrics = [
        measured(
          "custom.audit.fcp",
          "ms",
          raw.paint.entries.find(
            (entry) => entry.name === "first-contentful-paint"
          )?.startTime,
          METHODS.fcp
        ),
        measured(
          "custom.audit.lcp",
          "ms",
          raw.paint.entries.findLast(
            (entry) => entry.entryType === "largest-contentful-paint"
          )?.startTime,
          METHODS.lcp
        ),
        measured(
          "custom.audit.task-duration",
          "ms",
          duration("TaskDuration"),
          METHODS.task
        ),
        measured(
          "custom.audit.script-duration",
          "ms",
          duration("ScriptDuration"),
          METHODS.task.replace("TaskDuration", "ScriptDuration")
        ),
        measured(
          "custom.audit.layout-duration",
          "ms",
          duration("LayoutDuration"),
          METHODS.task.replace("TaskDuration", "LayoutDuration")
        ),
        measured(
          "custom.audit.observed-window",
          "ms",
          raw.endpointAt,
          "actual browser timestamp of raw snapshot; no duration normalization"
        ),
      ];
      const failures = [
        ...metrics
          .filter((metric) => metric.status !== "measured")
          .map((metric) => ({
            code: "audit-metric-unavailable",
            message: metric.key,
          })),
        ...errors.map((message) => ({ code: "audit-page-error", message })),
      ];
      return {
        attempt: 1,
        diagnostics: {
          arm,
          browserErrors: errors,
          deviceEmulation: {
            hasTouch: config.profile.hasTouch ?? false,
            isMobile: config.profile.isMobile,
            userAgent: raw.userAgent,
          },
          documentEvidence,
          networkCoverage: network?.coverage(),
          performanceAfter: after,
          performanceBefore: before,
          ...raw,
          requests: network
            ? await network.snapshot(raw.timeOrigin + scenario.observationMs)
            : undefined,
        },
        failures,
        fixtureId: fixture.id,
        id: randomUUID(),
        iteration,
        measurements: metrics,
        pairId: `${scenario.id}:${iteration}`,
        runId,
        scenarioId: scenario.id,
        status: failures.length ? "incomplete" : "passed",
      } satisfies Sample;
    });
  }
);

export const runInstrumentationOverhead = Effect.fn("instrumentation.audit")(
  function* auditRun(input: RunConfig) {
    const config = yield* Effect.try({
      catch: (cause) =>
        new RunnerError({
          cause,
          code: "audit-configuration",
          message: String(cause),
        }),
      try: () => validateOverheadConfig(input),
    });
    yield* measurementLock();
    const [source] = config.fixtures;
    yield* productionServer(source);
    const browser = yield* browserResource(config.executablePath);
    yield* validateCalibrationRuntime(
      config.profile,
      browser,
      config.executablePath
    );
    const vitalsSource = yield* attempt("audit-vitals", () =>
      readFile(
        path.join(
          path.dirname(require.resolve("web-vitals")),
          "web-vitals.iife.js"
        ),
        "utf-8"
      )
    );
    const collectorSourceHash = yield* attempt("audit-source", () =>
      hashCollectorSource(import.meta.dirname)
    );
    const fixtureSourceHash =
      source.provenance?.artifactIntegrity ??
      `configuration:${source.configurationHash};revision:${source.revision}`;
    const lockfileHash = yield* attempt("audit-lockfile", async () =>
      createHash("sha256")
        .update(
          await readFile(new URL("../../../pnpm-lock.yaml", import.meta.url))
        )
        .digest("hex")
    );
    const runId = randomUUID();
    const fixtures = (["minimal", "full"] as const).map((arm) => ({
      ...source,
      baseline: arm === "minimal",
      id: `${source.id}-${arm}`,
      revision: `${source.revision}-audit-${arm}`,
    }));
    const samples: Sample[] = [];
    const warmupSamples: Sample[] = [];
    const warmups = config.warmups ?? 0;
    const orders = overheadOrder(config.seed, warmups + config.iterations);
    for (const [position, order] of orders.entries()) {
      for (const arm of order) {
        const fixture = fixtures[arm === "minimal" ? 0 : 1];
        const iteration = position - warmups;
        const sample = yield* Effect.scoped(
          auditSample(
            browser,
            config,
            fixture,
            runId,
            Math.max(0, iteration),
            arm,
            vitalsSource
          )
        ).pipe(
          // oxlint-disable-next-line promise/prefer-await-to-then, promise/prefer-await-to-callbacks -- Typed Effect error recovery preserves failed attempts.
          Effect.catch((error) =>
            Effect.succeed({
              attempt: 1,
              diagnostics: { arm },
              failures: [{ code: error.code, message: error.message }],
              fixtureId: fixture.id,
              id: randomUUID(),
              iteration: Math.max(0, iteration),
              measurements: [],
              pairId: `${config.scenarios[0].id}:${iteration}`,
              runId,
              scenarioId: config.scenarios[0].id,
              status: "incomplete",
            } satisfies Sample)
          )
        );
        // Warmup observations remain raw evidence but do not enter comparison cells.
        if (iteration >= 0) {
          samples.push(sample);
        } else {
          warmupSamples.push(sample);
        }
      }
    }
    if (samples[0]) {
      samples[0] = {
        ...samples[0],
        diagnostics: {
          ...samples[0].diagnostics,
          excludedWarmupAttempts: warmupSamples,
        },
      };
    }
    const result: ResultEnvelope = {
      artifacts: [],
      capabilities: [],
      fixtures,
      manifest: {
        collectorVersion: "cookiebench-instrumentation-audit-1.2.0",
        createdAt: new Date().toISOString(),
        environment: {
          collectorSourceHash,
          cpu: cpus()[0]?.model ?? "unavailable",
          cpuWindow:
            "before navigation through first CDP snapshot after observation deadline; raw endpoints retained; no normalization or subtraction",
          fixtureSourceHash,
          fullArm:
            "minimal arm plus production DOM observer, owned bounded main-document native vitals/Element Timing observers, unfinalized web-vitals diagnostic observers, passive network collector and production navigation capture listeners with native CDP binding",
          inputSnapshotCost:
            "not calibrated: load-only visits do not arm a consent action, dispatch trusted input or serialize input/unload snapshots; no overhead correction is applied",
          lockfileHash,
          minimalArm:
            "main-document native paint/LCP observer with timer and snapshot queue drain after a 250 ms presentation grace, shared CDP emulation and Performance domain; no DOM polling, web-vitals or network listeners",
          order: JSON.stringify(orders),
          platform: platform(),
          release: release(),
          warmups: String(warmups),
        },
        id: runId,
        methodologyVersion: "cookiebench-instrumentation-overhead-v1",
        profile: config.profile,
        seed: config.seed,
        versions: {
          browser: browser.version(),
          effect: require("effect/package.json").version,
          node: process.version,
          playwright: require("playwright/package.json").version,
          "web-vitals": require(
            path.join(
              path.dirname(require.resolve("web-vitals")),
              "..",
              "package.json"
            )
          ).version,
        },
      },
      samples,
      scenarios: config.scenarios,
      schemaVersion: 3,
      status: samples.every((sample) => sample.status === "passed")
        ? "passed"
        : "incomplete",
    };
    return yield* Effect.try({
      catch: (cause) =>
        new RunnerError({
          cause,
          code: "audit-result",
          message: String(cause),
        }),
      try: () => decodeResult(result),
    });
  },
  Effect.scoped
);
