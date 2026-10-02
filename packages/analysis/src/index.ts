import { createHash } from "node:crypto";

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
import {
  censoringWindow,
  isRightCensored,
  measurementValidity,
  metricEligibility,
} from "./validity.ts";

export type { CorrectnessSummary } from "./correctness.ts";
export { sampleCorrectness, summarizeCorrectness } from "./correctness.ts";
export { summarizeLcpAttribution } from "./lcp.ts";
export type { MetricContext } from "./validity.ts";
export { measurementValidity, metricEligibility } from "./validity.ts";

export { ANALYSIS_VERSION } from "@cookiebench/schema";

export type CensoredStatistic = "max" | "mean" | "median" | "p75";
export interface MetricSummary {
  attempts: number;
  available: number;
  /**
   * Present for action completion endpoints, which the runner stops observing
   * at input + observationMs. `censored` counts included visits that completed
   * only after that window; `measured` counts exact values.
   */
  censoring: {
    censored: number;
    exceedsWindow: CensoredStatistic[];
    windowMs: number;
  } | null;
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
export interface ConfidenceInterval {
  low: number;
  high: number;
  /** Per-interval level after the family-wise adjustment in Analysis.multiplicity. */
  level: number;
  method: "paired-percentile-bootstrap";
  resamples: number;
}
export interface PairedSummary {
  count: number;
  /** Median of within-pair candidate-minus-baseline differences. */
  medianDifference: number | null;
  /** 75th percentile of within-pair differences. This is not a change in p75. */
  pairDifferenceP75: number | null;
  /** p75(candidate) - p75(baseline) over the paired observations. */
  p75Delta: {
    estimate: number | null;
    confidenceInterval: ConfidenceInterval | null;
  };
  /** Interval for medianDifference; the conclusion follows from it alone. */
  confidenceInterval: ConfidenceInterval | null;
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
/**
 * Bonferroni control over a declared family of paired comparisons. Each interval
 * uses `intervalLevel`, so all intervals in the family hold jointly with
 * probability of at least `familyLevel`.
 */
export interface Multiplicity {
  method: "bonferroni";
  family: string;
  comparisons: number;
  /** Each comparison contributes its median-difference and p75-delta intervals. */
  intervals: number;
  familyLevel: 0.95;
  intervalLevel: number;
}
export interface ComparisonFamily {
  /** Stable label for the family, for example a batch plan hash. */
  id: string;
  /** Every paired comparison the family declares, regardless of outcome. */
  comparisons: number;
}
export interface Analysis {
  analysisVersion: string;
  metricKey: string;
  multiplicity: Multiplicity;
  sourceRunIds: string[];
  comparisons: Comparison[];
}

const FAMILY_LEVEL = 0.95;
const INTERVALS_PER_COMPARISON = 2;

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
/** R-7 percentile over exact values plus censored values that exceed all of them. */
function censoredPercentile(
  values: readonly number[],
  censored: number,
  probability: number
): number | "exceeds-window" | null {
  if (censored === 0) {
    return percentile(values, probability);
  }
  const position = (values.length + censored - 1) * probability;
  if (Math.ceil(position) >= values.length) {
    return "exceeds-window";
  }
  const sorted = values.toSorted((a, b) => a - b);
  const lower = sorted[Math.floor(position)];
  const upper = sorted[Math.ceil(position)];
  if (lower === undefined || upper === undefined) {
    return null;
  }
  return lower + (upper - lower) * (position - Math.floor(position));
}

/**
 * Summarizes eligible values. Action completion endpoints verified only after
 * the observation window are right-censored: they count toward percentiles as
 * values beyond the window, and a statistic that depends on them is null and
 * listed in `censoring.exceedsWindow`.
 */
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
  const window = censoringWindow(key, context);
  const censoredSamples = samples.filter((sample) =>
    isRightCensored(sample, key, context)
  );
  const censored = censoredSamples.length;
  const exceedsWindow: CensoredStatistic[] =
    censored > 0 ? ["mean", "max"] : [];
  const statistic = (name: "median" | "p75", probability: number) => {
    const value = censoredPercentile(values, censored, probability);
    if (value === "exceeds-window") {
      exceedsWindow.push(name);
      return null;
    }
    return value;
  };
  const median = statistic("median", 0.5);
  const p75 = statistic("p75", 0.75);
  return {
    attempts: samples.length,
    available,
    censoring:
      window === undefined
        ? null
        : {
            censored,
            exceedsWindow: exceedsWindow.toSorted(),
            windowMs: window,
          },
    eligibilityReasons: [
      ...new Set(
        samples
          .filter((sample) => !censoredSamples.includes(sample))
          .flatMap((sample) => metricEligibility(sample, key, context))
      ),
    ],
    excluded:
      available -
      values.length -
      censoredSamples.filter(
        (sample) => metric(sample, key)?.status === "measured"
      ).length,
    failed: samples.filter((sample) => sample.status === "failed").length,
    includedIncomplete: eligible.filter(
      (sample) => sample.status === "incomplete"
    ).length,
    incomplete: samples.filter((sample) => sample.status === "incomplete")
      .length,
    max: values.length && censored === 0 ? Math.max(...values) : null,
    mean:
      values.length && censored === 0
        ? values.reduce((sum, value) => sum + value / values.length, 0)
        : null,
    measured: values.length,
    median,
    min: values.length ? Math.min(...values) : null,
    missing: samples.filter(
      (sample) => metric(sample, key)?.status !== "measured"
    ).length,
    p75,
    passed: samples.filter((sample) => sample.status === "passed").length,
  };
}

/** Hashing the comparison identity gives each comparison its own deterministic bootstrap stream. */
function comparisonSeed(seed: number, key: string): number {
  return Number.parseInt(
    createHash("sha256")
      .update(`${seed}\u0000${key}`)
      .digest("hex")
      .slice(0, 8),
    16
  );
}

/** Enough resamples to place about ten draws beyond each adjusted tail. */
function resamplesFor(level: number): number {
  const tail = (1 - level) / 2;
  return Math.max(2000, Math.ceil(10 / tail / 1000) * 1000);
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

interface PairedValue {
  baseline: number;
  candidate: number;
}

/** Eligible baseline and candidate values matched within one run. */
function pairValues(
  baseline: readonly Sample[],
  candidate: readonly Sample[],
  key: string,
  contexts?: { baseline: MetricContext; candidate: MetricContext }
): PairedValue[] {
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
  const values: PairedValue[] = [];
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
      values.push({ baseline: reference.value, candidate: value.value });
    }
  }
  return values;
}

/** R-7 quantile of an ascending, nonempty typed array. */
function sortedQuantile(sorted: Float64Array, probability: number): number {
  const position = (sorted.length - 1) * probability;
  const lower = sorted[Math.floor(position)];
  const upper = sorted[Math.ceil(position)];
  if (lower === undefined || upper === undefined) {
    throw new Error("Quantile requires a nonempty sample.");
  }
  return lower + (upper - lower) * (position - Math.floor(position));
}

/** One paired bootstrap: both statistics come from the same resampled pairs. */
function bootstrapIntervals(
  pairs: readonly PairedValue[],
  interval: { level: number; seed: number }
): { median: ConfidenceInterval; p75Delta: ConfidenceInterval } {
  const drawRandom = random(interval.seed);
  const resamples = resamplesFor(interval.level);
  const medians = new Float64Array(resamples);
  const p75Deltas = new Float64Array(resamples);
  const differences = new Float64Array(pairs.length);
  const baselines = new Float64Array(pairs.length);
  const candidates = new Float64Array(pairs.length);
  for (let resample = 0; resample < resamples; resample += 1) {
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[Math.floor(drawRandom() * pairs.length)];
      if (pair === undefined) {
        throw new Error("Bootstrap index outside nonempty sample.");
      }
      differences[index] = pair.candidate - pair.baseline;
      baselines[index] = pair.baseline;
      candidates[index] = pair.candidate;
    }
    medians[resample] = sortedQuantile(differences.toSorted(), 0.5);
    p75Deltas[resample] =
      sortedQuantile(candidates.toSorted(), 0.75) -
      sortedQuantile(baselines.toSorted(), 0.75);
  }
  const tail = (1 - interval.level) / 2;
  const bounds = (draws: Float64Array): ConfidenceInterval => {
    const sorted = draws.toSorted();
    return {
      high: sortedQuantile(sorted, 1 - tail),
      level: interval.level,
      low: sortedQuantile(sorted, tail),
      method: "paired-percentile-bootstrap",
      resamples,
    };
  };
  return { median: bounds(medians), p75Delta: bounds(p75Deltas) };
}

function summarizePairs(
  pairs: readonly PairedValue[],
  interval?: { level: number; seed: number }
): PairedSummary {
  // Small batches do not support a stable-looking uncertainty interval.
  const intervals =
    interval && pairs.length >= 30 ? bootstrapIntervals(pairs, interval) : null;
  const differences = pairs.map((pair) => pair.candidate - pair.baseline);
  const candidateP75 = percentile(
    pairs.map((pair) => pair.candidate),
    0.75
  );
  const baselineP75 = percentile(
    pairs.map((pair) => pair.baseline),
    0.75
  );
  return {
    conclusion: conclusion(intervals?.median ?? null),
    confidenceInterval: intervals?.median ?? null,
    count: pairs.length,
    medianDifference: percentile(differences, 0.5),
    p75Delta: {
      confidenceInterval: intervals?.p75Delta ?? null,
      estimate:
        candidateP75 === null || baselineP75 === null
          ? null
          : candidateP75 - baselineP75,
    },
    pairDifferenceP75: percentile(differences, 0.75),
  };
}

/**
 * Describes paired differences. Intervals and a verdict are computed only when
 * `interval` is supplied; compareResults supplies it for eligible comparisons.
 */
export function pairedDifferences(
  baseline: readonly Sample[],
  candidate: readonly Sample[],
  key: string,
  options: {
    contexts?: { baseline: MetricContext; candidate: MetricContext };
    interval?: { level: number; seed: number };
  } = {}
): PairedSummary {
  return summarizePairs(
    pairValues(baseline, candidate, key, options.contexts),
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

/** Computes each eligible interval at the family's Bonferroni-adjusted level. */
function adjustIntervals(
  comparisons: Comparison[],
  inferential: readonly {
    index: number;
    pairs: readonly PairedValue[];
    seed: number;
  }[],
  family: ComparisonFamily,
  declarable: number
): Multiplicity {
  if (
    !Number.isSafeInteger(family.comparisons) ||
    family.comparisons < declarable
  ) {
    throw new Error(
      `Comparison family ${family.id} declares ${family.comparisons} comparisons, fewer than the ${declarable} in this analysis.`
    );
  }
  const intervals = family.comparisons * INTERVALS_PER_COMPARISON;
  const intervalLevel = 1 - (1 - FAMILY_LEVEL) / Math.max(1, intervals);
  for (const { pairs, index, seed } of inferential) {
    const comparison = comparisons[index];
    if (comparison) {
      comparison.paired = summarizePairs(pairs, {
        level: intervalLevel,
        seed,
      });
    }
  }
  return {
    comparisons: family.comparisons,
    family: family.id,
    familyLevel: FAMILY_LEVEL,
    intervalLevel,
    intervals,
    method: "bonferroni",
  };
}

/**
 * Compares every candidate fixture and scenario with its paired baseline.
 *
 * Intervals are Bonferroni-adjusted over a declared family. Without `family`,
 * the family is this invocation's fresh-load comparisons, the only ones whose
 * design permits an interval. Callers that publish several invocations
 * together, such as the batch helper, declare the combined family instead.
 */
export function compareResults(
  baselineInput: ResultEnvelope,
  candidateInput: ResultEnvelope,
  metricKey: string,
  options: { family?: ComparisonFamily } = {}
): Analysis {
  const baseline = decodeResult(baselineInput);
  const candidate = decodeResult(candidateInput);
  ensureRunCompatibility(baseline, candidate);
  const comparisons: Comparison[] = [];
  const inferential: { index: number; pairs: PairedValue[]; seed: number }[] =
    [];
  let declarable = 0;
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
      if (comparableWindow) {
        declarable += 1;
      }
      // The current runner coerces baseline actions to load-only. Those windows cannot support action deltas.
      const pairs = pairValues(
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
          pairs.length
        ),
      ];
      const eligibilityReasons = [...new Set(reasons)];
      const eligible = eligibilityReasons.length === 0;
      if (eligible) {
        inferential.push({
          index: comparisons.length,
          pairs,
          seed: comparisonSeed(
            candidate.manifest.seed,
            [metricKey, scenario.id, control.id, fixture.id].join("\u0000")
          ),
        });
      }
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
        paired: summarizePairs(pairs),
        scenarioId: scenario.id,
        unit: metrics[0]?.unit ?? null,
      });
    }
  }
  const multiplicity = adjustIntervals(
    comparisons,
    inferential,
    options.family ?? { comparisons: declarable, id: "compare-invocation" },
    declarable
  );
  return {
    analysisVersion: ANALYSIS_VERSION,
    comparisons,
    metricKey,
    multiplicity,
    sourceRunIds: [...new Set([baseline.manifest.id, candidate.manifest.id])],
  };
}
