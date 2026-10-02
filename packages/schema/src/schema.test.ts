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
  it("rejects a current analysis that publishes a verdict for an ineligible comparison", () => {
    const current = {
      ...historical,
      analysisVersion: ANALYSIS_VERSION,
      multiplicity: {
        comparisons: 1,
        family: "compare-invocation",
        familyLevel: 0.95,
        intervalLevel: 0.95,
        method: "bonferroni",
      },
    };
    expect(() => decodeAnalysis(current)).toThrow();
    expect(() =>
      decodeAnalysis({
        ...current,
        comparisons: [
          {
            ...comparison,
            paired: {
              ...comparison.paired,
              conclusion: "inconclusive",
              confidenceInterval: null,
            },
          },
        ],
      })
    ).not.toThrow();
    expect(() =>
      decodeAnalysis({
        ...current,
        comparisons: [
          { ...comparison, eligibilityReasons: [], eligible: true },
        ],
      })
    ).not.toThrow();
    expect(() =>
      decodeAnalysis({
        ...current,
        comparisons: [{ ...comparison, eligibilityReasons: [] }],
      })
    ).toThrow();
  });
  it("requires every current interval to use the declared family's adjusted level", () => {
    const eligible = { ...comparison, eligibilityReasons: [], eligible: true };
    const family = {
      comparisons: 90,
      family: "batch:plan",
      familyLevel: 0.95,
      intervalLevel: 1 - 0.05 / 90,
      method: "bonferroni",
    };
    const current = {
      ...historical,
      analysisVersion: ANALYSIS_VERSION,
      comparisons: [eligible],
      multiplicity: family,
    };
    expect(() => decodeAnalysis(current)).toThrow();
    expect(() =>
      decodeAnalysis({
        ...current,
        comparisons: [
          {
            ...eligible,
            paired: {
              ...eligible.paired,
              confidenceInterval: {
                ...eligible.paired.confidenceInterval,
                level: family.intervalLevel,
              },
            },
          },
        ],
      })
    ).not.toThrow();
    expect(() =>
      decodeAnalysis({
        ...current,
        multiplicity: { ...family, intervalLevel: 0.95 },
      })
    ).toThrow();
  });
});
