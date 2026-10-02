import { decodeAnalysis } from "@cookiebench/schema";
import type {
  FixtureConfig,
  ResultEnvelope,
  Sample,
  ScenarioConfig,
} from "@cookiebench/schema";
import { describe, expect, it } from "vitest";

import { calibrationArtifact } from "../../schema/test/cpu-calibration-fixture.ts";
import {
  compareResults,
  pairedDifferences,
  percentile,
  summarize,
} from "./index.ts";
import { INVALIDATED_COLLECTORS } from "./validity.ts";

const runId = "11111111-1111-4111-8111-111111111111";
const sample = (value: number, index = 0): Sample => ({
  attempt: 0,
  failures: [],
  fixtureId: "baseline",
  id: `22222222-2222-4222-8222-${String(index).padStart(12, "0")}`,
  iteration: index,
  measurements: [
    {
      key: "initial.requests",
      method: "passive-v1",
      status: "measured",
      unit: "count",
      value,
    },
  ],
  pairId: `pair-${index}`,
  runId,
  scenarioId: "load",
  status: "passed",
});
const fixture: FixtureConfig = {
  adapter: {
    accept: "#accept",
    banner: "#banner",
    reject: "#reject",
    stateGlobal: "state",
  },
  baseline: true,
  configurationHash: "config",
  framework: "react",
  frameworkVersion: "19",
  id: "baseline",
  mode: "hosted",
  product: "baseline",
  revision: "1",
  schemaVersion: 3,
  url: "http://localhost:3000",
  version: "1",
};
const scenario: ScenarioConfig = {
  action: "load",
  actionDeadlineMs: 1000,
  cache: "cold",
  expectedBanner: false,
  followupOffsetMs: 100,
  id: "load",
  input: "pointer",
  navigationTimeoutMs: 1000,
  observationMs: 2000,
  readiness: "ready",
  visitor: "fresh",
  workload: { categories: ["analytics"], scriptCount: 1 },
};
const envelope = (candidate = false): ResultEnvelope => ({
  artifacts: [],
  capabilities: [],
  fixtures: [
    { ...fixture, baseline: !candidate, id: candidate ? "vendor" : "baseline" },
  ],
  manifest: {
    collectorVersion: "v3",
    createdAt: "2026-09-27T12:00:00Z",
    environment: { os: "linux" },
    id: runId,
    methodologyVersion: "v3",
    profile: {
      cpuSlowdown: 1,
      deviceScaleFactor: 1,
      id: "desktop",
      isMobile: false,
      locale: "en-US",
      network: {
        downloadBytesPerSecond: 100_000,
        latencyMs: 0,
        uploadBytesPerSecond: 100_000,
      },
      region: "US",
      viewport: { height: 720, width: 1280 },
    },
    seed: 42,
    versions: { chromium: "123" },
  },
  samples: Array.from({ length: 30 }, (_, index) => ({
    ...sample(candidate ? 2 : 1, index),
    fixtureId: candidate ? "vendor" : "baseline",
  })),
  scenarios: [{ ...scenario, expectedBanner: candidate }],
  schemaVersion: 3,
  status: "passed",
});

describe("deterministic aggregation", () => {
  it("retains fractional means without creating fabricated resource arrays", () => {
    expect(
      summarize([sample(1), sample(2, 1)], "initial.requests")
    ).toMatchObject({ mean: 1.5, median: 1.5, p75: 1.75 });
  });
  it("preserves missing and failed counts without turning missing into zero", () => {
    const failed: Sample = {
      ...sample(0, 1),
      failures: [{ code: "missing-banner", message: "Expected banner absent" }],
      measurements: [],
      status: "failed",
    };
    expect(summarize([sample(2), failed], "initial.requests")).toMatchObject({
      attempts: 2,
      failed: 1,
      mean: 2,
      measured: 1,
      missing: 1,
    });
    expect(summarize([failed], "initial.requests")).toMatchObject({
      mean: null,
      median: null,
      p75: null,
    });
  });
  it("uses R-7 percentiles and rejects nonfinite data", () => {
    expect(percentile([4, 1, 3, 2], 0.75)).toBe(3.25);
    expect(percentile([], 0.75)).toBeNull();
    expect(() => percentile([Number.NaN], 0.75)).toThrow();
  });
  it("keeps signed paired differences and withholds small-sample intervals", () => {
    expect(
      pairedDifferences([sample(3)], [sample(1)], "initial.requests")
    ).toMatchObject({
      conclusion: "inconclusive",
      confidenceInterval: null,
      count: 1,
      medianDifference: -2,
    });
    expect(
      pairedDifferences(
        [sample(3)],
        [{ ...sample(1), pairId: "different" }],
        "initial.requests"
      ).count
    ).toBe(0);
  });
  it("reports the change in p75 separately from the p75 of pair differences", () => {
    const timing = (fixtureId: string, value: number, index: number) => ({
      ...sample(0, index),
      fixtureId,
      measurements: [
        {
          key: "page.lcp",
          method: "native-lcp",
          status: "measured" as const,
          unit: "ms" as const,
          value,
        },
      ],
    });
    const paired = pairedDifferences(
      [100, 200, 100, 100].map((value, index) =>
        timing("baseline", value, index)
      ),
      [200, 100, 100, 100].map((value, index) =>
        timing("vendor", value, index)
      ),
      "page.lcp"
    );
    // Both arms have p75 125 ms, but the within-pair differences have p75 25 ms.
    expect(paired).toMatchObject({
      p75Delta: { confidenceInterval: null, estimate: 0 },
      pairDifferenceP75: 25,
    });
    expect(paired).not.toHaveProperty("p75Difference");
  });
  it("compares valid pairs deterministically and never grades the baseline", () => {
    const result = compareResults(
      envelope(),
      envelope(true),
      "initial.requests"
    );
    expect(
      compareResults(envelope(), envelope(true), "initial.requests")
    ).toEqual(result);
    expect(result.comparisons[0]).toMatchObject({
      eligible: true,
      paired: {
        conclusion: "candidate-higher",
        confidenceInterval: { high: 1, low: 1 },
        count: 30,
        medianDifference: 1,
        p75Delta: { confidenceInterval: { high: 1, low: 1 }, estimate: 1 },
      },
    });
    expect(result).not.toHaveProperty("score");
    expect(decodeAnalysis(result)).toEqual(result);
  });
  it("withholds missing measured remote identity while retaining paired observations", () => {
    const candidate = envelope(true);
    const result = compareResults(
      envelope(),
      {
        ...candidate,
        fixtures: candidate.fixtures.map((item) => ({
          ...item,
          artifactPolicy: "mutable-network",
        })),
      },
      "initial.requests"
    );
    expect(result.comparisons[0]).toMatchObject({
      eligible: false,
      paired: { count: 30, medianDifference: 1 },
    });
    expect(result.comparisons[0]?.eligibilityReasons.join(",")).toContain(
      "identity is missing"
    );
  });
  it.each(["methodologyVersion", "collectorVersion"] as const)(
    "rejects incompatible %s",
    (field) => {
      const candidate = envelope(true);
      expect(() =>
        compareResults(
          envelope(),
          {
            ...candidate,
            manifest: { ...candidate.manifest, [field]: "other" },
          },
          "initial.requests"
        )
      ).toThrow(/Incompatible/u);
    }
  );
  it("rejects different windows, framework versions, profiles and methods", () => {
    const candidate = envelope(true);
    expect(() =>
      compareResults(
        envelope(),
        { ...candidate, scenarios: [{ ...scenario, observationMs: 999 }] },
        "initial.requests"
      )
    ).toThrow(/Incompatible scenario/u);
    expect(() =>
      compareResults(
        envelope(),
        {
          ...candidate,
          fixtures: [
            {
              ...fixture,
              baseline: false,
              frameworkVersion: "20",
              id: "vendor",
            },
          ],
        },
        "initial.requests"
      )
    ).toThrow(/compatible baseline/u);
    expect(() =>
      compareResults(
        envelope(),
        {
          ...candidate,
          manifest: {
            ...candidate.manifest,
            profile: { ...candidate.manifest.profile, cpuSlowdown: 4 },
          },
        },
        "initial.requests"
      )
    ).toThrow(/profile/u);
    expect(() =>
      compareResults(
        envelope(),
        {
          ...candidate,
          samples: candidate.samples.map((item) => ({
            ...item,
            measurements: item.measurements.map((measurement) => ({
              ...measurement,
              method: "different",
            })),
          })),
        },
        "initial.requests"
      )
    ).toThrow(/methods/u);
  });
  it("compares one reused calibration and rejects a new calibration with the same numeric rate", () => {
    const baseline = envelope();
    const candidate = envelope(true);
    const profile = {
      ...baseline.manifest.profile,
      cpuCalibration: { artifact: calibrationArtifact, tier: "mid" as const },
      cpuSlowdown: 2,
    };
    const calibratedBaseline = {
      ...baseline,
      manifest: { ...baseline.manifest, profile },
    };
    const calibratedCandidate = {
      ...candidate,
      manifest: { ...candidate.manifest, profile },
    };
    expect(() =>
      compareResults(
        calibratedBaseline,
        calibratedCandidate,
        "initial.requests"
      )
    ).not.toThrow();
    expect(() =>
      compareResults(
        calibratedBaseline,
        {
          ...calibratedCandidate,
          manifest: {
            ...calibratedCandidate.manifest,
            profile: {
              ...profile,
              cpuCalibration: {
                ...profile.cpuCalibration,
                artifact: {
                  ...calibrationArtifact,
                  id: "33333333-3333-4333-8333-333333333333",
                },
              },
            },
          },
        },
        "initial.requests"
      )
    ).toThrow(/profile/u);
    expect(() =>
      compareResults(calibratedBaseline, candidate, "initial.requests")
    ).toThrow(/profile/u);
  });
});

const delta = (index: number) => ((index * 37) % 30) - 10 + index * 0.13;

describe("family-wise interval control", () => {
  const lcp = (
    fixtureId: string,
    value: number,
    index: number,
    offset = 0
  ): Sample => ({
    ...sample(0, index + offset),
    fixtureId,
    measurements: [
      {
        key: "page.lcp",
        method: "native-lcp",
        status: "measured",
        unit: "ms",
        value,
      },
    ],
    pairId: `pair-${index}`,
  });
  it("records the declared family and widens intervals to its Bonferroni level", () => {
    // Seven of 30 pairs go the other way: clear for one comparison, not across 90.
    const candidate = envelope(true);
    const shifted: ResultEnvelope = {
      ...candidate,
      samples: candidate.samples.map((item, index) => ({
        ...item,
        measurements: item.measurements.map((measurement) => ({
          ...measurement,
          value: index < 7 ? 0 : 2,
        })),
      })),
    };
    const single = compareResults(envelope(), shifted, "initial.requests");
    expect(single.multiplicity).toEqual({
      comparisons: 1,
      family: "compare-invocation",
      familyLevel: 0.95,
      intervalLevel: 0.975,
      intervals: 2,
      method: "bonferroni",
    });
    expect(single.comparisons[0]?.paired.conclusion).toBe("candidate-higher");
    const family = compareResults(envelope(), shifted, "initial.requests", {
      family: { comparisons: 90, id: "batch:test" },
    });
    expect(family.multiplicity).toMatchObject({
      comparisons: 90,
      family: "batch:test",
      intervalLevel: 1 - 0.05 / 180,
      intervals: 180,
    });
    expect(family.comparisons[0]?.paired).toMatchObject({
      conclusion: "inconclusive",
      confidenceInterval: { level: 1 - 0.05 / 180 },
      p75Delta: { confidenceInterval: { level: 1 - 0.05 / 180 } },
    });
    expect(decodeAnalysis(family)).toEqual(family);
    expect(() =>
      compareResults(envelope(), shifted, "initial.requests", {
        family: { comparisons: 0, id: "too-small" },
      })
    ).toThrow(/fewer than the 1/u);
  });
  it("draws a separate deterministic bootstrap stream for each comparison", () => {
    const baseline: ResultEnvelope = {
      ...envelope(),
      samples: Array.from({ length: 30 }, (_, index) =>
        lcp("baseline", 500, index)
      ),
    };
    const original = envelope(true);
    const candidate: ResultEnvelope = {
      ...original,
      fixtures: ["vendor-a", "vendor-b"].map((id) => ({
        ...fixture,
        baseline: false,
        id,
      })),
      samples: ["vendor-a", "vendor-b"].flatMap((id, cell) =>
        Array.from({ length: 30 }, (_, index) =>
          lcp(id, 500 + delta(index), index, cell * 30)
        )
      ),
    };
    const analysis = compareResults(baseline, candidate, "page.lcp");
    const [first, second] = analysis.comparisons.map(
      (comparison) => comparison.paired
    );
    expect(analysis.multiplicity.comparisons).toBe(2);
    expect(first?.medianDifference).toBe(second?.medianDifference);
    expect(first?.confidenceInterval).not.toBeNull();
    expect(first?.confidenceInterval).not.toEqual(second?.confidenceInterval);
    expect(compareResults(baseline, candidate, "page.lcp")).toEqual(analysis);
  });
});

describe("paired comparison boundaries", () => {
  const otherRunId = "33333333-3333-4333-8333-333333333333";
  it("never pairs reused pair IDs from separate runs", () => {
    expect(
      pairedDifferences(
        [sample(3)],
        [{ ...sample(1), runId: otherRunId }],
        "initial.requests"
      )
    ).toMatchObject({
      confidenceInterval: null,
      count: 0,
      medianDifference: null,
    });
    const candidate = envelope(true);
    const independent = {
      ...candidate,
      manifest: { ...candidate.manifest, id: otherRunId },
      samples: candidate.samples.map((item) => ({
        ...item,
        runId: otherRunId,
      })),
    };
    const [comparison] = compareResults(
      envelope(),
      independent,
      "initial.requests"
    ).comparisons;
    expect(comparison).toMatchObject({ eligible: false, paired: { count: 0 } });
    expect(comparison?.eligibilityReasons.join(" ")).toContain(
      "one-to-one pairing"
    );
  });
  it("requires complete successful one-to-one coverage, even with 30 surviving pairs", () => {
    const baseline = envelope();
    const extra = {
      ...baseline,
      samples: [...baseline.samples, sample(1, 30)],
    };
    const [comparison] = compareResults(
      extra,
      envelope(true),
      "initial.requests"
    ).comparisons;
    expect(comparison).toMatchObject({
      eligible: false,
      paired: {
        conclusion: "inconclusive",
        confidenceInterval: null,
        count: 30,
        medianDifference: 1,
      },
    });
    expect(comparison?.eligibilityReasons.join(" ")).toContain(
      "one-to-one pairing"
    );
    const failed = {
      ...baseline,
      samples: baseline.samples.map((item, index) =>
        index === 0
          ? {
              ...item,
              failures: [
                { code: "unresponsive", message: "Control did not respond" },
              ],
              status: "failed" as const,
            }
          : item
      ),
      status: "failed" as const,
    };
    expect(
      compareResults(failed, envelope(true), "initial.requests").comparisons[0]
    ).toMatchObject({ eligible: false, paired: { count: 29 } });
  });
  it("withholds the interval and verdict when failed candidate visits leave 34 surviving pairs", () => {
    const visits = (candidate: boolean): ResultEnvelope => {
      const original = envelope(candidate);
      return {
        ...original,
        samples: Array.from({ length: 40 }, (_, index) => {
          const item = {
            ...sample(candidate ? 1 : 2, index),
            fixtureId: candidate ? "vendor" : "baseline",
          };
          // The six slowest CMP visits fail before recording the metric.
          return candidate && index >= 34
            ? {
                ...item,
                failures: [{ code: "page-unresponsive", message: "No LCP" }],
                measurements: [],
                status: "failed" as const,
              }
            : item;
        }),
        status: candidate ? "failed" : "passed",
      };
    };
    const analysis = compareResults(
      visits(false),
      visits(true),
      "initial.requests"
    );
    expect(analysis.comparisons[0]).toMatchObject({
      baseline: { measured: 40 },
      candidate: { measured: 34 },
      eligible: false,
      paired: {
        conclusion: "inconclusive",
        confidenceInterval: null,
        count: 34,
        medianDifference: -1,
      },
    });
    expect(decodeAnalysis(analysis)).toEqual(analysis);
  });
  it("rejects duplicate attempt pairs rather than reusing a control", () => {
    expect(() =>
      pairedDifferences([sample(1), sample(1)], [sample(2)], "initial.requests")
    ).toThrow(/Duplicate baseline/u);
    expect(() =>
      pairedDifferences([sample(1)], [sample(2), sample(2)], "initial.requests")
    ).toThrow(/Duplicate candidate/u);
  });
  it("withholds action deltas when the baseline ran a load-only window", () => {
    const baseline = envelope();
    const candidate = envelope(true);
    const action = { ...scenario, action: "accept" as const };
    const [comparison] = compareResults(
      { ...baseline, scenarios: [action] },
      { ...candidate, scenarios: [action] },
      "initial.requests"
    ).comparisons;
    expect(comparison).toMatchObject({
      eligible: false,
      paired: { confidenceInterval: null, count: 0, medianDifference: null },
    });
    expect(comparison?.eligibilityReasons.join(" ")).toContain("load-only");
  });
});

it("withholds returning-visitor deltas against a baseline without an equivalent released workload", () => {
  const baseline = envelope();
  const candidate = envelope(true);
  const returning = {
    ...scenario,
    expectedBanner: false,
    visitor: "returning-accepted" as const,
  };
  const [comparison] = compareResults(
    { ...baseline, scenarios: [returning] },
    { ...candidate, scenarios: [returning] },
    "initial.requests"
  ).comparisons;
  expect(comparison).toMatchObject({
    eligible: false,
    paired: { count: 0, medianDifference: null },
  });
  expect(comparison?.eligibilityReasons.join(" ")).toContain("fresh-visitor");
});

it.each(Object.keys(INVALIDATED_COLLECTORS))(
  "never requalifies invalidated encoded body evidence from %s",
  (hash) => {
    const historical = (candidate: boolean): ResultEnvelope => {
      const original = envelope(candidate);
      return {
        ...original,
        manifest: {
          ...original.manifest,
          environment: { collectorSourceHash: hash },
        },
        samples: original.samples.map((item) => ({
          ...item,
          measurements: item.measurements.map((metric) => ({
            ...metric,
            key: "initial.encoded-body",
            unit: "bytes",
          })),
        })),
      };
    };
    const baseline = historical(false);
    const candidate = historical(true);
    const unchanged = JSON.stringify([baseline, candidate]);
    const [comparison] = compareResults(
      baseline,
      candidate,
      "initial.encoded-body"
    ).comparisons;
    expect(comparison).toMatchObject({
      baseline: { available: 30, excluded: 30, measured: 0 },
      eligible: false,
      paired: { count: 0, medianDifference: null },
    });
    expect(comparison?.eligibilityReasons.join(" ")).toContain("invalidated");
    expect(JSON.stringify([baseline, candidate])).toBe(unchanged);
  }
);

it("LCP comparisons retain absolute medians and distinguish the recorded elements", () => {
  const input = (candidate: boolean): ResultEnvelope => {
    const original = envelope(candidate);
    return {
      ...original,
      samples: original.samples.map((item) => ({
        ...item,
        diagnostics: {
          observations: {
            vitals: {
              LCP: {
                entries: [
                  {
                    element: {
                      id: candidate ? "banner" : "article",
                      tag: "DIV",
                    },
                    url: "",
                  },
                ],
              },
            },
          },
        },
        measurements: [
          {
            key: "page.lcp",
            method: "test-native",
            status: "measured",
            unit: "ms",
            value: candidate ? 600 : 24,
          },
        ],
      })),
    };
  };
  const [comparison] = compareResults(
    input(false),
    input(true),
    "page.lcp"
  ).comparisons;
  expect(comparison).toMatchObject({
    baseline: { median: 24 },
    candidate: { median: 600 },
    lcpAttribution: {
      baseline: { elements: [{ id: "article", samples: 30 }], missing: 0 },
      candidate: { elements: [{ id: "banner", samples: 30 }], missing: 0 },
    },
    paired: { medianDifference: 576 },
  });
});

function paintEnvelope(candidate = false): ResultEnvelope {
  const original = envelope(candidate);
  return {
    ...original,
    samples: original.samples.map((item) => ({
      ...item,
      failures: [
        {
          code: "required-measurement-unavailable",
          message: "Required observations unavailable: initial.transfer",
        },
      ],
      measurements: [
        {
          key: "page.lcp",
          method: "native-lcp",
          status: "measured",
          unit: "ms",
          value: candidate ? 60 : 20,
        },
        {
          key: "initial.transfer",
          method: "cdp",
          reason: "Network coverage incomplete",
          status: "unavailable",
          unit: "bytes",
        },
      ],
      status: "incomplete",
    })),
    status: "incomplete",
  };
}

it("retains native paint summaries and full pairing when only network totals are unavailable", () => {
  const baseline = paintEnvelope();
  const candidate = paintEnvelope(true);
  const retained = JSON.stringify([baseline, candidate]);
  const [comparison] = compareResults(
    baseline,
    candidate,
    "page.lcp"
  ).comparisons;
  expect(comparison).toMatchObject({
    baseline: {
      attempts: 30,
      available: 30,
      eligibilityReasons: [],
      excluded: 0,
      includedIncomplete: 30,
      incomplete: 30,
      measured: 30,
      median: 20,
      missing: 0,
    },
    candidate: { measured: 30, median: 60 },
    eligible: true,
    lcpAttribution: { baseline: { missing: 30 }, candidate: { missing: 30 } },
    paired: { count: 30, medianDifference: 40 },
  });
  expect(JSON.stringify([baseline, candidate])).toBe(retained);
  expect(
    compareResults(baseline, candidate, "initial.transfer").comparisons[0]
  ).toMatchObject({
    candidate: { measured: 0, median: null, missing: 30 },
    eligible: false,
    paired: { count: 0 },
  });
});

it("does not admit missing paint, true consent failures, unknown incompleteness or unmatched metric pairs", () => {
  const baseline = paintEnvelope();
  const original = paintEnvelope(true);
  const candidate: ResultEnvelope = {
    ...original,
    samples: original.samples.map((item, index) => {
      if (index === 0) {
        return { ...item, measurements: [] };
      }
      if (index === 1) {
        return {
          ...item,
          failures: [
            ...item.failures,
            {
              code: "consent-mismatch",
              message: "Analytics incorrectly permitted",
            },
          ],
        };
      }
      if (index === 2) {
        return { ...item, failures: [] };
      }
      if (index === 3) {
        return { ...item, pairId: "unmatched" };
      }
      return item;
    }),
  };
  expect(
    compareResults(baseline, candidate, "page.lcp").comparisons[0]
  ).toMatchObject({
    candidate: {
      attempts: 30,
      available: 29,
      excluded: 2,
      measured: 27,
      missing: 1,
    },
    eligible: false,
    paired: { count: 26 },
  });
});

it("allows independently measured click timing with measurement-only followup gaps but rejects followup consent failures", () => {
  const [base] = paintEnvelope(true).samples;
  if (!base) {
    throw new Error("Expected test sample");
  }
  const click: Sample = {
    ...base,
    failures: [
      {
        code: "followup:required-measurement-unavailable",
        message: "Required observations unavailable: initial.transfer",
      },
    ],
    measurements: [
      {
        key: "action.input-to-next-paint",
        method: "event-timing",
        status: "measured",
        unit: "ms",
        value: 32,
      },
    ],
  };
  const invalid: Sample = {
    ...click,
    failures: [
      ...click.failures,
      { code: "followup:consent-mismatch", message: "Choice lost on followup" },
    ],
  };
  expect(
    summarize([click, invalid], "action.input-to-next-paint")
  ).toMatchObject({
    attempts: 2,
    available: 2,
    excluded: 1,
    incomplete: 2,
    measured: 1,
    median: 32,
  });
});

it("excludes invalid historical native timings even when only unrelated measurement gaps made the sample incomplete", () => {
  const historical = (candidate: boolean): ResultEnvelope => {
    const original = paintEnvelope(candidate);
    return {
      ...original,
      manifest: {
        ...original.manifest,
        collectorVersion: "cookiebench-runner-3.0.0",
      },
    };
  };
  const [comparison] = compareResults(
    historical(false),
    historical(true),
    "page.lcp"
  ).comparisons;
  expect(comparison).toMatchObject({
    baseline: { available: 30, excluded: 30, measured: 0, median: null },
    candidate: { measured: 0 },
    eligible: false,
    paired: { count: 0, medianDifference: null },
  });
  expect(comparison?.candidate.eligibilityReasons.join(" ")).toContain(
    "invalidated"
  );
});

it("records deployment topology without rejecting expected no-CMP baseline differences", () => {
  const baseline = envelope();
  const candidate = envelope(true);
  const localBaseline: ResultEnvelope = {
    ...baseline,
    fixtures: baseline.fixtures.map((item) => ({
      ...item,
      deployment: { assets: "local", backend: "none" },
    })),
  };
  const remoteCandidate: ResultEnvelope = {
    ...candidate,
    fixtures: candidate.fixtures.map((item) => ({
      ...item,
      deployment: { assets: "mixed", backend: "remote-service" },
    })),
  };
  expect(
    compareResults(localBaseline, remoteCandidate, "initial.requests")
      .comparisons[0]
  ).toMatchObject({
    deployment: {
      baseline: { assets: "local", backend: "none" },
      candidate: { assets: "mixed", backend: "remote-service" },
    },
    eligible: true,
  });
  expect(
    compareResults(baseline, candidate, "initial.requests").comparisons[0]
  ).toMatchObject({
    deployment: { baseline: null, candidate: null },
    eligible: true,
  });
});

it("keeps native paint values descriptive when remote artifact coverage cannot qualify unseen assets", () => {
  const baseline = paintEnvelope();
  const original = paintEnvelope(true);
  const candidate: ResultEnvelope = {
    ...original,
    fixtures: original.fixtures.map((item) => ({
      ...item,
      artifactPolicy: "mutable-network",
    })),
    samples: original.samples.map((item) => ({
      ...item,
      diagnostics: {
        networkCoverage: {
          complete: false,
          reasons: ["Unobserved worker target"],
          scope: "page-target",
        },
        requests: [
          {
            decodedBodySha256: "a".repeat(64),
            finished: true,
            party: "third-party",
            resourceType: "Script",
            url: "https://vendor.test/loader.js",
          },
        ],
      },
    })),
  };
  const [comparison] = compareResults(
    baseline,
    candidate,
    "page.lcp"
  ).comparisons;
  expect(comparison).toMatchObject({
    candidate: { available: 30, excluded: 0, measured: 30, median: 60 },
    eligible: false,
    paired: { count: 30, medianDifference: 40 },
  });
  expect(comparison?.eligibilityReasons.join(" ")).toContain(
    "network coverage is missing or incomplete"
  );
});
