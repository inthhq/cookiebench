import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  ANALYSIS_VERSION,
  AdapterConfig,
  decodeAnalysis,
  decodeCapability,
  decodeMeasurement,
  decodeScenario,
} from "./index.ts";

const measured = {
  key: "initial.transfer",
  method: "cdp-response-v1",
  status: "measured",
  unit: "bytes",
  value: 0,
};

describe("measurement boundary", () => {
  it("keeps measured zero distinct from unavailable", () => {
    expect(decodeMeasurement(measured)).toEqual(measured);
    const missing = {
      key: "initial.transfer",
      method: "cdp-response-v1",
      reason: "Cache information absent",
      status: "unavailable",
      unit: "bytes",
    };
    expect(decodeMeasurement(missing)).toEqual(missing);
  });
  it.each([
    Number.NaN,
    Infinity,
    -Infinity,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])("rejects invalid raw byte value %s", (value) => {
    expect(() => decodeMeasurement({ ...measured, value })).toThrow();
  });
  it("requires a measured value and forbids values for missing metrics", () => {
    expect(() =>
      decodeMeasurement({ ...measured, value: undefined })
    ).toThrow();
    expect(() =>
      decodeMeasurement({
        ...measured,
        reason: "Not collected",
        status: "unavailable",
      })
    ).toThrow();
  });
  it("allows fractional milliseconds and CLS above one", () => {
    expect(
      decodeMeasurement({
        ...measured,
        key: "page.lcp",
        unit: "ms",
        value: 1.25,
      })
    ).toMatchObject({ value: 1.25 });
    expect(
      decodeMeasurement({
        ...measured,
        key: "page.cls",
        unit: "score",
        value: 1.5,
      })
    ).toMatchObject({ value: 1.5 });
  });
  it("enforces metric units and coverage bounds", () => {
    expect(() => decodeMeasurement({ ...measured, key: "page.lcp" })).toThrow();
    expect(() =>
      decodeMeasurement({
        ...measured,
        key: "banner.coverage",
        unit: "ratio",
        value: 1.1,
      })
    ).toThrow();
    expect(() =>
      decodeMeasurement({ ...measured, key: "unknown.metric" })
    ).toThrow();
    expect(
      decodeMeasurement({ ...measured, key: "custom.example" })
    ).toMatchObject({ key: "custom.example" });
  });
  it("requires executed evidence and a date before calling a capability verified", () => {
    const check = {
      capability: "typed-sdk",
      evidence: [],
      fixtureId: "fixture",
      framework: "react",
      id: "11111111-1111-4111-8111-111111111111",
      mode: "hosted",
      status: "verified",
    };
    expect(() => decodeCapability(check)).toThrow();
    expect(
      decodeCapability({
        ...check,
        evidence: ["artifacts/typecheck.log"],
        verifiedAt: "2026-09-27T12:00:00Z",
      })
    ).toMatchObject({ status: "verified" });
  });
});

describe("workload boundary", () => {
  const scenario = {
    action: "load",
    actionDeadlineMs: 1000,
    cache: "cold",
    expectedBanner: true,
    followupOffsetMs: 100,
    id: "load",
    input: "pointer",
    navigationTimeoutMs: 1000,
    observationMs: 1000,
    readiness: "ready",
    visitor: "fresh",
  };
  it("rejects uncategorized scripts and duplicate categories", () => {
    expect(() =>
      decodeScenario({
        ...scenario,
        workload: { categories: [], scriptCount: 1 },
      })
    ).toThrow();
    expect(() =>
      decodeScenario({
        ...scenario,
        workload: {
          categories: ["measurement", "measurement"],
          scriptCount: 2,
        },
      })
    ).toThrow();
    expect(
      decodeScenario({
        ...scenario,
        workload: { categories: ["measurement", "marketing"], scriptCount: 2 },
      }).workload.scriptCount
    ).toBe(2);
    expect(
      decodeScenario({
        ...scenario,
        workload: { categories: [], scriptCount: 0 },
      }).workload.categories
    ).toEqual([]);
  });
});

describe("explicit fixture readiness", () => {
  const decodeAdapter = Schema.decodeUnknownSync(AdapterConfig);
  const adapter = {
    accept: "#accept",
    banner: "#banner",
    reject: "#reject",
    stateGlobal: "__cookiebench",
  };
  it("keeps the existing default and accepts only the declared public-state option", () => {
    expect(decodeAdapter(adapter).readinessSource).toBeUndefined();
    expect(
      decodeAdapter({ ...adapter, readinessSource: "public-state" })
        .readinessSource
    ).toBe("public-state");
    expect(() =>
      decodeAdapter({ ...adapter, readinessSource: "banner-visible" })
    ).toThrow();
  });
});

const family = (comparisons: number) => ({
  comparisons,
  family: "compare-invocation",
  familyLevel: 0.95,
  intervalLevel: 1 - 0.05 / (comparisons * 2),
  intervals: comparisons * 2,
  method: "bonferroni",
});
const interval = (level: number) => ({
  high: -1,
  level,
  low: -1,
  method: "paired-percentile-bootstrap",
  resamples: 2000,
});

describe("analysis records", () => {
  const summary = {
    attempts: 40,
    failed: 0,
    incomplete: 0,
    max: 2,
    mean: 2,
    measured: 40,
    median: 2,
    min: 2,
    missing: 0,
    p75: 2,
    passed: 40,
  };
  // Shape written by cookiebench-analysis-v3.2.0, including a verdict on an ineligible comparison.
  const comparison = {
    baseline: summary,
    baselineFixtureId: "baseline",
    candidate: { ...summary, failed: 6, measured: 34, missing: 6 },
    candidateFixtureId: "vendor",
    eligibilityReasons: ["Required metric measurements are missing."],
    eligible: false,
    paired: {
      conclusion: "candidate-lower",
      confidenceInterval: {
        high: -1,
        level: 0.95,
        low: -1,
        method: "paired-percentile-bootstrap",
        resamples: 2000,
      },
      count: 34,
      medianDifference: -1,
      p75Difference: -1,
    },
    scenarioId: "load",
    unit: "ms",
  };
  const historical = {
    analysisVersion: "cookiebench-analysis-v3.2.0",
    comparisons: [comparison],
    metricKey: "page.lcp",
    sourceRunIds: ["11111111-1111-4111-8111-111111111111"],
  };
  it("keeps historical analyses decodable as recorded", () => {
    expect(decodeAnalysis(historical)).toEqual(historical);
  });
  const descriptive = {
    conclusion: "inconclusive",
    confidenceInterval: null,
    count: 34,
    medianDifference: -1,
    p75Delta: { confidenceInterval: null, estimate: -1 },
    pairDifferenceP75: -1,
  };
  const verdict = (level: number) => ({
    ...descriptive,
    conclusion: "candidate-lower",
    confidenceInterval: interval(level),
    p75Delta: { confidenceInterval: interval(level), estimate: -1 },
  });
  const current = (
    paired: object,
    overrides: object = {},
    multiplicity: object = family(1)
  ) => ({
    ...historical,
    analysisVersion: ANALYSIS_VERSION,
    comparisons: [
      {
        ...comparison,
        baseline: { ...comparison.baseline, censoring: null },
        candidate: { ...comparison.candidate, censoring: null },
        paired,
        ...overrides,
      },
    ],
    multiplicity,
  });
  const eligible = { eligibilityReasons: [], eligible: true };
  it("rejects a current analysis that publishes a verdict for an ineligible comparison", () => {
    expect(() => decodeAnalysis(current(verdict(0.975)))).toThrow();
    expect(() => decodeAnalysis(current(descriptive))).not.toThrow();
    expect(() =>
      decodeAnalysis(current(verdict(0.975), eligible))
    ).not.toThrow();
    expect(() =>
      decodeAnalysis(current(verdict(0.975), { eligibilityReasons: [] }))
    ).toThrow();
  });
  it("requires every current interval to use the declared family's adjusted level", () => {
    expect(() =>
      decodeAnalysis(current(verdict(0.975), eligible, family(90)))
    ).toThrow();
    expect(() =>
      decodeAnalysis(current(verdict(1 - 0.05 / 180), eligible, family(90)))
    ).not.toThrow();
    expect(() =>
      decodeAnalysis(
        current(verdict(0.975), eligible, {
          ...family(90),
          intervalLevel: 0.975,
        })
      )
    ).toThrow();
  });
  it("names the within-pair quantile separately from the p75 delta in current analyses", () => {
    expect(() =>
      decodeAnalysis(current({ ...descriptive, p75Difference: -1 }))
    ).toThrow();
    const { p75Delta: _omitted, ...withoutDelta } = descriptive;
    expect(() => decodeAnalysis(current(withoutDelta))).toThrow();
  });
  it("requires statistics beyond the observation window to be withheld", () => {
    const censoring = { censored: 1, exceedsWindow: ["p75"], windowMs: 1500 };
    const action = (candidate: object) =>
      current(descriptive, { candidate: { ...candidate, censoring } });
    expect(() => decodeAnalysis(action(comparison.candidate))).toThrow();
    expect(() =>
      decodeAnalysis(
        action({ ...comparison.candidate, max: null, mean: null, p75: null })
      )
    ).not.toThrow();
  });
});
