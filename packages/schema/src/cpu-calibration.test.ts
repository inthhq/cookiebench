import { Schema } from "effect";
import { expect, test } from "vitest";

import { calibrationArtifact } from "../test/cpu-calibration-fixture.ts";
import { decodeCpuCalibrationArtifact, DeviceProfile } from "./index.ts";

const decodeProfile = Schema.decodeUnknownSync(DeviceProfile, {
  onExcessProperty: "error",
});
const profile = {
  cpuSlowdown: 2,
  deviceScaleFactor: 1,
  id: "desktop",
  isMobile: false,
  locale: "en-GB",
  network: {
    downloadBytesPerSecond: 1000,
    latencyMs: 0,
    uploadBytesPerSecond: 1000,
  },
  region: "GB",
  viewport: { height: 768, width: 1365 },
};

test("manual profiles remain readable and calibration survives decoding", () => {
  expect(decodeProfile(profile)).toEqual(profile);
  const calibrated = {
    ...profile,
    cpuCalibration: { artifact: calibrationArtifact, tier: "mid" },
  };
  expect(decodeProfile(calibrated)).toEqual(calibrated);
});

test("calibrated profiles require the selected numeric slowdown", () => {
  const calibrated = {
    ...profile,
    cpuCalibration: { artifact: calibrationArtifact, tier: "mid" },
  };
  expect(() => decodeProfile({ ...calibrated, cpuSlowdown: 4 })).toThrow(
    /matching slowdown/u
  );
  expect(() =>
    decodeProfile({
      ...profile,
      cpuCalibration: { artifact: calibrationArtifact },
    })
  ).toThrow();
  expect(() =>
    decodeProfile({
      ...profile,
      cpuCalibration: { artifact: calibrationArtifact, tier: "high" },
    })
  ).toThrow();
});

test.each(["DEVICE_TOO_WEAK", 0.75, 0, -1] as const)(
  "preserves unsuccessful raw output %s but cannot apply it",
  (rate) => {
    const artifact = {
      ...calibrationArtifact,
      results: { ...calibrationArtifact.results, mid: rate },
      samples: calibrationArtifact.samples.filter(
        (sample) => sample.tier !== "mid"
      ),
      validation: {
        ...calibrationArtifact.validation,
        mid: {
          eligible: false,
          reasons: ["Target cannot be applied"],
          scores: [],
        },
      },
    };
    expect(decodeCpuCalibrationArtifact(artifact).results.mid).toBe(rate);
    expect(() =>
      decodeProfile({
        ...profile,
        cpuCalibration: { artifact, tier: "mid" },
        cpuSlowdown: typeof rate === "number" ? rate : 2,
      })
    ).toThrow();
  }
);

test("edited eligibility flags cannot override recorded evidence", () => {
  for (const validation of [
    { ...calibrationArtifact.validation, baselineStable: false },
    {
      ...calibrationArtifact.validation,
      mid: {
        eligible: false,
        reasons: ["Target did not converge"],
        scores: [600, 600, 600],
      },
    },
  ]) {
    const artifact = { ...calibrationArtifact, validation };
    expect(() => decodeCpuCalibrationArtifact(artifact)).toThrow(/recorded/u);
    expect(() =>
      decodeProfile({ ...profile, cpuCalibration: { artifact, tier: "mid" } })
    ).toThrow();
  }
});

test("out-of-target validation is preserved but cannot be marked eligible", () => {
  const artifact = {
    ...calibrationArtifact,
    samples: calibrationArtifact.samples.map((sample) =>
      sample.tier === "mid" ? { ...sample, score: 600 } : sample
    ),
    validation: {
      ...calibrationArtifact.validation,
      mid: {
        eligible: false,
        reasons: ["Target did not converge"],
        scores: [600, 600, 600],
      },
    },
  };
  expect(decodeCpuCalibrationArtifact(artifact)).toEqual(artifact);
  expect(() =>
    decodeProfile({ ...profile, cpuCalibration: { artifact, tier: "mid" } })
  ).toThrow(/eligible/u);
  expect(() =>
    decodeCpuCalibrationArtifact({
      ...artifact,
      validation: {
        ...artifact.validation,
        mid: { ...artifact.validation.mid, eligible: true, reasons: [] },
      },
    })
  ).toThrow(/recorded/u);
});

test.each([Number.NaN, Infinity, -Infinity])(
  "rejects nonfinite calibration evidence %s",
  (rate) => {
    expect(() =>
      decodeCpuCalibrationArtifact({
        ...calibrationArtifact,
        results: { low: rate, mid: 2 },
      })
    ).toThrow();
  }
);
