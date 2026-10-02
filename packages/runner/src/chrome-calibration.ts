/* oxlint-disable no-await-in-loop -- Chrome calibration and validation samples must run serially. */
// Copyright 2024 The Chromium Authors
// Adapted from Chrome DevTools CalibrationController.ts, revision
// 933872b3f8520add8c43e30adf00c32622f6bdf4. See vendor/LICENSE.chromium.
// https://github.com/ChromeDevTools/devtools-frontend/blob/933872b3f8520add8c43e30adf00c32622f6bdf4/front_end/panels/mobile_throttling/CalibrationController.ts

import type {
  CpuCalibrationArtifact,
  CpuCalibrationTier,
} from "@cookiebench/schema";

export const CHROME_CALIBRATION_REVISION =
  "933872b3f8520add8c43e30adf00c32622f6bdf4";
export const CALIBRATION_TARGETS = { low: 264, mid: 1000 } as const;
export const CALIBRATION_DURATION_MS = 250;
export type CalibrationSample = CpuCalibrationArtifact["samples"][number];
export type CalibrationMeasure = (
  rate: number,
  phase: CalibrationSample["phase"],
  tier?: CpuCalibrationTier
) => Promise<number>;

const truncate = (value: number) => Number(value.toFixed(2));

/** Chrome's search, including cache, retry, bounds, and stopping rules. */
export async function runChromeCalibration(
  measure: CalibrationMeasure
): Promise<CpuCalibrationArtifact["results"]> {
  async function benchmark(
    rate: number,
    phase: CalibrationSample["phase"]
  ): Promise<number> {
    const score = await measure(rate, phase);
    if (!Number.isFinite(score)) {
      throw new TypeError(`unexpected score from benchmark: ${score}`);
    }
    return score;
  }
  await benchmark(1, "warmup");
  const scoreCache = new Map<number, number>();
  async function run(rate: number): Promise<number> {
    const cached = scoreCache.get(rate);
    if (cached !== undefined) {
      return cached;
    }
    const score = await benchmark(rate, "calibration");
    scoreCache.set(rate, score);
    return score;
  }
  async function find(
    target: number,
    lowerRate: number,
    upperRate: number
  ): Promise<number> {
    const lower = { rate: lowerRate, score: await run(lowerRate) };
    const upper = { rate: upperRate, score: await run(upperRate) };
    let rate = 0;
    let iterations = 0;
    const maxIterations = 8;
    // oxlint-disable-next-line no-plusplus -- Preserve Chrome's post-increment stopping rule.
    while (iterations++ < maxIterations) {
      rate = truncate((upper.rate + lower.rate) / 2);
      const score = await run(rate);
      if (Math.abs(target - score) < 10) {
        break;
      }
      if (score < target) {
        upper.rate = rate;
        upper.score = score;
      } else {
        lower.rate = rate;
        lower.score = score;
      }
    }
    return truncate(rate);
  }

  let actualScore = await run(1);
  let mid: number | "DEVICE_TOO_WEAK" | undefined;
  if (actualScore < CALIBRATION_TARGETS.mid) {
    scoreCache.clear();
    actualScore = await run(1);
    if (actualScore < CALIBRATION_TARGETS.mid) {
      if (actualScore < CALIBRATION_TARGETS.low) {
        return { low: "DEVICE_TOO_WEAK", mid: "DEVICE_TOO_WEAK" };
      }
      mid = "DEVICE_TOO_WEAK";
    }
  }
  const low = await find(
    CALIBRATION_TARGETS.low,
    1,
    (actualScore / CALIBRATION_TARGETS.low) * 1.5
  );
  if (mid === undefined) {
    const midToLowRatio = CALIBRATION_TARGETS.mid / CALIBRATION_TARGETS.low;
    const r = low / midToLowRatio;
    mid = await find(CALIBRATION_TARGETS.mid, r - r / 4, r + r / 4);
  }
  return { low, mid };
}

export const VALIDATION_POLICY = {
  maxRelativeError: 0.15,
  maxRelativeSpread: 0.15,
  policy: "cookiebench-cpu-validation-v1",
} as const;

function median(scores: readonly number[]): number {
  const sorted = scores.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
function stable(scores: readonly number[]): boolean {
  const center = median(scores);
  return (
    center > 0 &&
    (Math.max(...scores) - Math.min(...scores)) / center <=
      VALIDATION_POLICY.maxRelativeSpread
  );
}

/** CookieBench checks are separate from Chrome's returned rates. No refitting. */
export async function validateChromeCalibration(
  results: CpuCalibrationArtifact["results"],
  measure: CalibrationMeasure,
  calibrationBaselineScores: readonly number[]
): Promise<CpuCalibrationArtifact["validation"]> {
  const baselineScores: number[] = [];
  for (let index = 0; index < 3; index += 1) {
    baselineScores.push(await measure(1, "baseline-validation"));
  }
  const baselineStable = stable([
    ...calibrationBaselineScores,
    ...baselineScores,
  ]);
  async function validateTier(
    tier: CpuCalibrationTier
  ): Promise<CpuCalibrationArtifact["validation"]["low"]> {
    const rate = results[tier];
    const scores: number[] = [];
    const reasons: string[] = [];
    if (!baselineStable) {
      reasons.push(
        "Unthrottled scores varied by more than 15% of their median."
      );
    }
    if (typeof rate !== "number") {
      reasons.push("Chrome reported DEVICE_TOO_WEAK for this tier.");
    } else if (!Number.isFinite(rate) || rate < 1) {
      reasons.push(
        "Chrome returned a CPU multiplier below 1 or a non-finite multiplier."
      );
    } else {
      for (let index = 0; index < 3; index += 1) {
        scores.push(await measure(rate, "tier-validation", tier));
      }
      if (!stable(scores)) {
        reasons.push(
          "Validation scores varied by more than 15% of their median."
        );
      }
      if (
        Math.abs(median(scores) - CALIBRATION_TARGETS[tier]) /
          CALIBRATION_TARGETS[tier] >
        VALIDATION_POLICY.maxRelativeError
      ) {
        reasons.push(
          "Validation median missed Chrome's target score by more than 15%."
        );
      }
    }
    return { eligible: reasons.length === 0, reasons, scores };
  }
  const low = await validateTier("low");
  const mid = await validateTier("mid");
  return { ...VALIDATION_POLICY, baselineScores, baselineStable, low, mid };
}
