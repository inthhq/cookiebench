import type { CpuCalibrationArtifact } from "../src/index.ts";

export const calibrationArtifact: CpuCalibrationArtifact = {
  browser: {
    headless: true,
    jsVersion: "15.3.0",
    launchExecutable: "/test/chromium",
    product: "HeadlessChrome/153.0.8010.12",
    revision: "test-browser-revision",
    version: "153.0.8010.12",
  },
  createdAt: "2026-10-01T00:00:00Z",
  host: {
    arch: "arm64",
    cpuModel: "Test CPU",
    hostname: "test-host",
    logicalCpus: 8,
    memoryBytes: 16_000_000_000,
    platform: "darwin",
    release: "25.0.0",
  },
  id: "11111111-1111-4111-8111-111111111111",
  method: "chrome-devtools",
  results: { low: 8, mid: 2 },
  samples: [
    { phase: "calibration", rate: 1, score: 2000 },
    ...[2000, 2001, 2002].map((score) => ({
      phase: "baseline-validation" as const,
      rate: 1,
      score,
    })),
    ...[264, 265, 263].map((score) => ({
      phase: "tier-validation" as const,
      rate: 8,
      score,
      tier: "low" as const,
    })),
    ...[1000, 1001, 999].map((score) => ({
      phase: "tier-validation" as const,
      rate: 2,
      score,
      tier: "mid" as const,
    })),
  ],
  schemaVersion: 1,
  sourceRevision: "933872b3f8520add8c43e30adf00c32622f6bdf4",
  sourceSha256:
    "f3835db080555d9850e2d058f8792eb6b74586d91545fbc88eefad0439cb7836",
  validation: {
    baselineScores: [2000, 2001, 2002],
    baselineStable: true,
    low: { eligible: true, reasons: [], scores: [264, 265, 263] },
    maxRelativeError: 0.15,
    maxRelativeSpread: 0.15,
    mid: { eligible: true, reasons: [], scores: [1000, 1001, 999] },
    policy: "cookiebench-cpu-validation-v1",
  },
};
