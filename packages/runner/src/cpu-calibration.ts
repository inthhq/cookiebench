import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import { arch, cpus, hostname, platform, release, totalmem } from "node:os";

import {
  decodeCpuCalibrationArtifact,
  DeviceProfile,
} from "@cookiebench/schema";
import type {
  CpuCalibrationArtifact,
  CpuCalibrationTier,
} from "@cookiebench/schema";
import { DateTime, Effect, Schema } from "effect";
import type { Browser } from "playwright";

import {
  CALIBRATION_DURATION_MS,
  CHROME_CALIBRATION_REVISION,
  runChromeCalibration,
  validateChromeCalibration,
} from "./chrome-calibration.ts";
import type {
  CalibrationMeasure,
  CalibrationSample,
} from "./chrome-calibration.ts";
import { attempt, browserResource, measurementLock } from "./lifecycle.ts";
import { computeBenchmarkIndex } from "./vendor/chrome-devtools-benchmark.ts";

export function calibrationHost(): CpuCalibrationArtifact["host"] {
  return {
    arch: arch(),
    cpuModel: cpus()[0]?.model ?? "unavailable",
    hostname: hostname(),
    logicalCpus: cpus().length,
    memoryBytes: totalmem(),
    platform: platform(),
    release: release(),
  };
}

export async function calibrationBrowser(
  browser: Browser,
  executablePath?: string
): Promise<CpuCalibrationArtifact["browser"]> {
  const session = await browser.newBrowserCDPSession();
  try {
    const { product, revision, jsVersion } =
      await session.send("Browser.getVersion");
    return {
      headless: true,
      jsVersion,
      // This is the requested launch identity, not a claim about the spawned binary.
      launchExecutable: executablePath
        ? await realpath(executablePath)
        : "playwright:chromium:default-headless",
      product,
      revision,
      version: browser.version(),
    };
  } finally {
    await session.detach();
  }
}

/** Resolve a saved artifact without substituting a fixed slowdown on failure. */
export function applyCpuCalibration(
  profile: DeviceProfile,
  input: CpuCalibrationArtifact,
  tier: CpuCalibrationTier
): DeviceProfile {
  const artifact = decodeCpuCalibrationArtifact(input);
  const rate = artifact.results[tier];
  if (
    typeof rate !== "number" ||
    rate < 1 ||
    !artifact.validation[tier].eligible
  ) {
    throw new Error(
      `CPU calibration ${artifact.id} cannot be used for ${tier}: ${artifact.validation[tier].reasons.join(" ")}`
    );
  }
  return Schema.decodeUnknownSync(DeviceProfile)({
    ...profile,
    cpuCalibration: { artifact, tier },
    cpuSlowdown: rate,
  });
}

export function assertCalibrationIdentity(
  profile: DeviceProfile,
  current: Pick<CpuCalibrationArtifact, "host" | "browser">
): void {
  const calibration = profile.cpuCalibration;
  if (!calibration) {
    return;
  }
  // Re-decode the embedded evidence, including eligibility and resolved rate.
  Schema.decodeUnknownSync(DeviceProfile)(profile);
  const mismatch = Object.entries(calibration.artifact.host).find(
    ([key, value]) => current.host[key as keyof typeof current.host] !== value
  );
  if (mismatch) {
    throw new Error(
      `CPU calibration host mismatch: ${mismatch[0]}. Recalibrate on this host.`
    );
  }
  const browserMismatch = Object.entries(calibration.artifact.browser).find(
    ([key, value]) =>
      current.browser[key as keyof typeof current.browser] !== value
  );
  if (browserMismatch) {
    throw new Error(
      `CPU calibration browser mismatch: ${browserMismatch[0]}. Recalibrate with this browser.`
    );
  }
}

export const validateCalibrationRuntime = Effect.fn(
  "calibration.validateRuntime"
)(function* checkRuntime(
  profile: DeviceProfile,
  browser: Browser,
  executablePath: string | undefined
) {
  if (!profile.cpuCalibration) {
    return;
  }
  yield* attempt("cpu-calibration-identity", async () => {
    assertCalibrationIdentity(profile, {
      browser: await calibrationBrowser(browser, executablePath),
      host: calibrationHost(),
    });
  });
});

const calibrateCpu = Effect.fn("calibration.run")(function* calibrate(
  options: { executablePath?: string } | undefined
) {
  yield* measurementLock();
  const browser = yield* browserResource(options?.executablePath);
  const browserIdentity = yield* attempt("cpu-calibration-browser", () =>
    calibrationBrowser(browser, options?.executablePath)
  );
  const context = yield* Effect.acquireRelease(
    attempt("cpu-calibration-context", () => browser.newContext()),
    (owned) => Effect.promise(() => owned.close())
  );
  const createdAt = DateTime.formatIso(yield* DateTime.now);
  const artifact = yield* attempt("cpu-calibration", async (signal) => {
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    const samples: CalibrationSample[] = [];
    try {
      await page.goto("about:blank");
      await session.send("Runtime.evaluate", {
        expression: `window.runBenchmark = () => (${computeBenchmarkIndex.toString()})(${CALIBRATION_DURATION_MS});`,
      });
      const measure: CalibrationMeasure = async (rate, phase, tier) => {
        signal.throwIfAborted();
        await session.send("Emulation.setCPUThrottlingRate", { rate });
        signal.throwIfAborted();
        const response = await session.send("Runtime.evaluate", {
          expression: "runBenchmark()",
        });
        signal.throwIfAborted();
        const score = response.result.value;
        if (
          response.exceptionDetails ||
          typeof score !== "number" ||
          !Number.isFinite(score)
        ) {
          throw new Error(
            `Unexpected CPU benchmark score: ${String(score)}. ${response.result.description ?? ""}`
          );
        }
        samples.push({ phase, rate, score, ...(tier ? { tier } : {}) });
        return score;
      };
      const results = await runChromeCalibration(measure);
      const baselineScores = samples
        .filter((sample) => sample.phase === "calibration" && sample.rate === 1)
        .map((sample) => sample.score);
      const validation = await validateChromeCalibration(
        results,
        measure,
        baselineScores
      );
      return decodeCpuCalibrationArtifact({
        browser: browserIdentity,
        createdAt,
        host: calibrationHost(),
        id: randomUUID(),
        method: "chrome-devtools",
        results,
        samples,
        schemaVersion: 1,
        sourceRevision: CHROME_CALIBRATION_REVISION,
        sourceSha256:
          "f3835db080555d9850e2d058f8792eb6b74586d91545fbc88eefad0439cb7836",
        validation,
      });
    } finally {
      // The context/browser finalizers also run on Effect interruption.
      if (!page.isClosed()) {
        await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      }
    }
  });
  return artifact;
}, Effect.scoped);

export const runCpuCalibration = (options?: { executablePath?: string }) =>
  calibrateCpu(options);
