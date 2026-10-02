import { ANALYSIS_VERSION, decodeResult } from "@cookiebench/schema";
import type {
  FixtureConfig,
  MetricUnit,
  ResultEnvelope,
  Sample,
  ScenarioConfig,
} from "@cookiebench/schema";

import { artifactEligibility } from "./artifacts.ts";
import type { summarizeLcpAttribution } from "./lcp.ts";
import { lcpComparison } from "./lcp.ts";
import type { MetricContext } from "./validity.ts";
import { measurementValidity, metricEligibility } from "./validity.ts";

export type { CorrectnessSummary } from "./correctness.ts";
export { sampleCorrectness, summarizeCorrectness } from "./correctness.ts";
export { summarizeLcpAttribution } from "./lcp.ts";
export type { MetricContext } from "./validity.ts";
export { measurementValidity, metricEligibility } from "./validity.ts";

export { ANALYSIS_VERSION } from "@cookiebench/schema";

export interface MetricSummary {
  attempts: number;
  available: number;
  excluded: number;
  includedIncomplete: number;
  eligibilityReasons: string[];
  passed: number;
  failed: number;
  incomplete: number;
  missing: number;
  measured: number;
  mean: number | null;
  median: number | null;
  p75: number | null;
  min: number | null;
  max: number | null;
}
export interface PairedSummary {
  count: number;
  medianDifference: number | null;
  p75Difference: number | null;
  confidenceInterval: {
    low: number;
    high: number;
    level: 0.95;
    method: "paired-percentile-bootstrap";
    resamples: number;
  } | null;
  conclusion: "candidate-lower" | "candidate-higher" | "inconclusive";
}
export interface Comparison {
  baselineFixtureId: string;
  candidateFixtureId: string;
  deployment: {
    baseline: FixtureConfig["deployment"] | null;
    candidate: FixtureConfig["deployment"] | null;
  };
  scenarioId: string;
  unit: MetricUnit | null;
  baseline: MetricSummary;
  candidate: MetricSummary;
  paired: PairedSummary;
  eligible: boolean;
  eligibilityReasons: string[];
  lcpAttribution?: {
    baseline: ReturnType<typeof summarizeLcpAttribution>;
    candidate: ReturnType<typeof summarizeLcpAttribution>;
  };
}
export interface Analysis {
  analysisVersion: string;
  metricKey: string;
  sourceRunIds: string[];
  comparisons: Comparison[];
}

/** R-7 interpolation, also used by R and NumPy's default quantile. */
export function percentile(
  values: readonly number[],
  probability: number
): number | null {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new RangeError("Probability must be between zero and one.");
  }
  if (values.some((value) => !Number.isFinite(value))) {
    throw new RangeError("Percentiles require finite values.");
  }
  if (values.length === 0) {
    return null;
  }
  const sorted = values.toSorted((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const lower = sorted[Math.floor(position)];
  const upper = sorted[Math.ceil(position)];
  if (lower === undefined || upper === undefined) {
    return null;
  }
  return lower + (upper - lower) * (position - Math.floor(position));
}

function metric(sample: Sample, key: string) {
  return sample.measurements.find((measurement) => measurement.key === key);
}
export function summarize(
  samples: readonly Sample[],
  key: string,
  context?: MetricContext
): MetricSummary {
  const eligible = samples.filter(
    (sample) => metricEligibility(sample, key, context).length === 0
  );
  const available = samples.filter(
    (sample) => metric(sample, key)?.status === "measured"
  ).length;
  const values = eligible.flatMap((sample) => {
    const measurement = metric(sample, key);
    return measurement?.status === "measured" ? [measurement.value] : [];
  });
  return {
    attempts: samples.length,
    available,
    eligibilityReasons: [
      ...new Set(
        samples.flatMap((sample) => metricEligibility(sample, key, context))
      ),
    ],
    excluded: available - values.length,
    failed: samples.filter((sample) => sample.status === "failed").length,
    includedIncomplete: eligible.filter(
      (sample) => sample.status === "incomplete"
    ).length,
    incomplete: samples.filter((sample) => sample.status === "incomplete")
      .length,
    max: values.length ? Math.max(...values) : null,
    mean: values.length
      ? values.reduce((sum, value) => sum + value / values.length, 0)
      : null,
    measured: values.length,
    median: percentile(values, 0.5),
    min: values.length ? Math.min(...values) : null,
    missing: samples.filter(
      (sample) => metric(sample, key)?.status !== "measured"
    ).length,
    p75: percentile(values, 0.75),
    passed: samples.filter((sample) => sample.status === "passed").length,
  };
}

function random(seed: number) {
  let state = seed % 4_294_967_296;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

function eligiblePair(
  sample: Sample,
  control: Sample | undefined,
  key: string,
  contexts?: { baseline: MetricContext; candidate: MetricContext }
): boolean {
  return (
    control !== undefined &&
    metricEligibility(sample, key, contexts?.candidate).length === 0 &&
    metricEligibility(control, key, contexts?.baseline).length === 0
  );
}

function conclusion(
  interval: PairedSummary["confidenceInterval"]
): PairedSummary["conclusion"] {
  if (interval && interval.high < 0) {
    return "candidate-lower";
  }
  if (interval && interval.low > 0) {
    return "candidate-higher";
  }
  return "inconclusive";
}

/** Signed candidate-minus-baseline differences for eligible pairs within one run. */
function pairDifferences(
  baseline: readonly Sample[],
  candidate: readonly Sample[],
  key: string,
  contexts?: { baseline: MetricContext; candidate: MetricContext }
): number[] {
  const pairs = new Map<string, Sample>();
  for (const sample of baseline) {
    if (!sample.pairId) {
      continue;
    }
    const id = `${sample.runId}:${sample.scenarioId}:${sample.pairId}:${sample.attempt}`;
    if (pairs.has(id)) {
      throw new Error(`Duplicate baseline pair ${id}`);
    }
    pairs.set(id, sample);
  }
  const seen = new Set<string>();
  const differences: number[] = [];
  for (const sample of candidate) {
    if (!sample.pairId) {
      continue;
    }
    const id = `${sample.runId}:${sample.scenarioId}:${sample.pairId}:${sample.attempt}`;
    if (seen.has(id)) {
      throw new Error(`Duplicate candidate pair ${id}`);
    }
    seen.add(id);
    const control = pairs.get(id);
    const value = metric(sample, key);
    const reference = control && metric(control, key);
    if (
      eligiblePair(sample, control, key, contexts) &&
      value?.status === "measured" &&
      reference?.status === "measured"
    ) {
      if (value.unit !== reference.unit || value.method !== reference.method) {
        throw new Error(
          "Paired metric units and collection methods must match."
        );
      }
      differences.push(value.value - reference.value);
    }
  }
  return differences;
}

function summarizeDifferences(
  differences: readonly number[],
  interval?: { seed: number }
): PairedSummary {
  let confidenceInterval: PairedSummary["confidenceInterval"] = null;
  // Small batches do not support a stable-looking uncertainty interval.
  if (interval && differences.length >= 30) {
    const drawRandom = random(interval.seed);
    const medians = Array.from({ length: 2000 }, () => {
      const draw = Array.from({ length: differences.length }, () => {
        const value =
          differences[Math.floor(drawRandom() * differences.length)];
        if (value === undefined) {
          throw new Error("Bootstrap index outside nonempty sample.");
        }
        return value;
      });
      const median = percentile(draw, 0.5);
      if (median === null) {
        throw new Error("Bootstrap requires nonempty samples.");
      }
      return median;
    });
    const low = percentile(medians, 0.025);
    const high = percentile(medians, 0.975);
    if (low !== null && high !== null) {
      confidenceInterval = {
        high,
        level: 0.95,
        low,
        method: "paired-percentile-bootstrap",
        resamples: 2000,
      };
    }
  }
  return {
    conclusion: conclusion(confidenceInterval),
    confidenceInterval,
    count: differences.length,
    medianDifference: percentile(differences, 0.5),
    p75Difference: percentile(differences, 0.75),
  };
}

/**
 * Describes paired differences. An interval and verdict are computed only when
 * `interval` is supplied; compareResults supplies it for eligible comparisons.
 */
export function pairedDifferences(
  baseline: readonly Sample[],
  candidate: readonly Sample[],
  key: string,
  options: {
    contexts?: { baseline: MetricContext; candidate: MetricContext };
    interval?: { seed: number };
  } = {}
): PairedSummary {
  return summarizeDifferences(
    pairDifferences(baseline, candidate, key, options.contexts),
    options.interval
  );
}

function stable(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stable).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}
function ensureRunCompatibility(
  baseline: ResultEnvelope,
  candidate: ResultEnvelope
) {
  for (const tool of [
    "node",
    "pnpm",
    "effect",
    "@effect/platform-node",
    "@effect/sql-pg",
    "playwright",
    "chromium",
    "browser",
    "web-vitals",
  ]) {
    if (
      baseline.manifest.versions[tool] !== candidate.manifest.versions[tool]
    ) {
      throw new Error(`Incompatible run version ${tool}.`);
    }
  }

  for (const field of [
    "methodologyVersion",
    "collectorVersion",
    "profile",
    "environment",
  ] as const) {
    if (
      stable(baseline.manifest[field]) !== stable(candidate.manifest[field])
    ) {
      throw new Error(`Incompatible run ${field}.`);
    }
  }
}
function compatibleFixture(baseline: FixtureConfig, candidate: FixtureConfig) {
  return (
    baseline.framework === candidate.framework &&
    baseline.frameworkVersion === candidate.frameworkVersion &&
    baseline.mode === candidate.mode
  );
}

function hasComparableLoadWindow(scenario: ScenarioConfig): boolean {
  return scenario.action === "load" && scenario.visitor === "fresh";
}

function deployments(
  baseline: FixtureConfig,
  candidate: FixtureConfig
): Comparison["deployment"] {
  return {
    baseline: baseline.deployment ?? null,
    candidate: candidate.deployment ?? null,
  };
}

/** Eligibility conditions that depend on the recorded cells and their pairing. */
function coverageReasons(
  comparableWindow: boolean,
  cells: readonly (readonly Sample[])[],
  summaries: readonly MetricSummary[],
  pairs: number
): string[] {
  const reasons: string[] = [];
  if (!comparableWindow) {
    reasons.push(
      "Paired baseline comparisons require fresh-visitor load-only scenarios with matching observation windows and blocked optional workloads."
    );
  }
  if (cells.some((cell) => cell.length === 0)) {
    reasons.push("No samples in one or both comparison cells.");
  }
  if (summaries.some((summary) => summary.excluded > 0)) {
    reasons.push("One or more recorded metric values are ineligible.");
  }
  if (summaries.some((summary) => summary.missing > 0)) {
    reasons.push("Required metric measurements are missing.");
  }
  if (summaries.some((summary) => summary.measured !== pairs)) {
    reasons.push(
      "Eligible metric observations do not have complete one-to-one pairing within the same run."
    );
  }
  if (pairs < 30) {
    reasons.push("Fewer than 30 eligible paired metric observations.");
  }
  return reasons;
}

export function compareResults(
  baselineInput: ResultEnvelope,
  candidateInput: ResultEnvelope,
  metricKey: string
): Analysis {
  const baseline = decodeResult(baselineInput);
  const candidate = decodeResult(candidateInput);
  ensureRunCompatibility(baseline, candidate);
  const comparisons: Comparison[] = [];
  for (const fixture of candidate.fixtures.filter((item) => !item.baseline)) {
    const controls = baseline.fixtures.filter(
      (item) => item.baseline && compatibleFixture(item, fixture)
    );
    if (controls.length !== 1) {
      throw new Error(
        `Expected one compatible baseline for fixture ${fixture.id}.`
      );
    }
    const [control] = controls;
    if (!control) {
      throw new Error("Missing baseline.");
    }
    for (const scenario of candidate.scenarios) {
      const controlScenario = baseline.scenarios.find(
        (item) => item.id === scenario.id
      );
      // A no-CMP baseline never expects a banner. All other protocol fields must match.
      if (
        !controlScenario ||
        stable({ ...controlScenario, expectedBanner: false }) !==
          stable({ ...scenario, expectedBanner: false })
      ) {
        throw new Error(`Incompatible scenario ${scenario.id}.`);
      }
      const baselineSamples = baseline.samples.filter(
        (sample) =>
          sample.fixtureId === control.id && sample.scenarioId === scenario.id
      );
      const candidateSamples = candidate.samples.filter(
        (sample) =>
          sample.fixtureId === fixture.id && sample.scenarioId === scenario.id
      );
      const metrics = [...baselineSamples, ...candidateSamples].flatMap(
        (sample) => {
          const measurement = metric(sample, metricKey);
          return measurement ? [measurement] : [];
        }
      );
      const units = new Set(metrics.map((measurement) => measurement.unit));
      const methods = new Set(metrics.map((measurement) => measurement.method));
      if (units.size > 1 || methods.size > 1) {
        throw new Error(`Incompatible metric ${metricKey} units or methods.`);
      }
      const contexts = {
        baseline: {
          fixture: control,
          manifest: baseline.manifest,
          scenario: controlScenario,
        },
        candidate: { fixture, manifest: candidate.manifest, scenario },
      };
      const baselineSummary = summarize(
        baselineSamples,
        metricKey,
        contexts.baseline
      );
      const candidateSummary = summarize(
        candidateSamples,
        metricKey,
        contexts.candidate
      );
      const comparableWindow = hasComparableLoadWindow(scenario);
      // The current runner coerces baseline actions to load-only. Those windows cannot support action deltas.
      const differences = pairDifferences(
        comparableWindow ? baselineSamples : [],
        comparableWindow ? candidateSamples : [],
        metricKey,
        contexts
      );
      const reasons: string[] = [
        ...measurementValidity(
          candidate.manifest,
          fixture,
          metricKey,
          scenario
        ),
        ...measurementValidity(
          baseline.manifest,
          control,
          metricKey,
          controlScenario
        ),
        ...artifactEligibility(fixture, candidateSamples),
        ...artifactEligibility(control, baselineSamples),
        ...coverageReasons(
          comparableWindow,
          [baselineSamples, candidateSamples],
          [baselineSummary, candidateSummary],
          differences.length
        ),
      ];
      const eligibilityReasons = [...new Set(reasons)];
      const eligible = eligibilityReasons.length === 0;
      comparisons.push({
        ...lcpComparison(
          metricKey,
          baselineSamples,
          candidateSamples,
          contexts
        ),
        baseline: baselineSummary,
        baselineFixtureId: control.id,
        candidate: candidateSummary,
        candidateFixtureId: fixture.id,
        deployment: deployments(control, fixture),
        eligibilityReasons,
        eligible,
        // An ineligible comparison stays descriptive: no interval or verdict.
        paired: summarizeDifferences(
          differences,
          eligible ? { seed: candidate.manifest.seed } : undefined
        ),
        scenarioId: scenario.id,
        unit: metrics[0]?.unit ?? null,
      });
    }
  }
  return {
    analysisVersion: ANALYSIS_VERSION,
    comparisons,
    metricKey,
    sourceRunIds: [...new Set([baseline.manifest.id, candidate.manifest.id])],
  };
}
