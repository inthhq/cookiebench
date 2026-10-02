import { Schema } from "effect";

import { ProfileCpuCalibration } from "./cpu-calibration.ts";

export {
  CpuCalibrationArtifact,
  CpuCalibrationTier,
  decodeCpuCalibrationArtifact,
  decodeCpuCalibrationTier,
} from "./cpu-calibration.ts";

export const SCHEMA_VERSION = 3;
export const METHODOLOGY_VERSION = "cookiebench-v3.2.2";
export const Text = Schema.String.check(Schema.isNonEmpty());
export const Finite = Schema.Number.check(Schema.isFinite());
export const NonNegative = Finite.check(Schema.isGreaterThanOrEqualTo(0));
export const UUID = Schema.String.check(Schema.isUUID());
export const Count = NonNegative.check(
  Schema.isInt(),
  Schema.makeFilter(Number.isSafeInteger)
);
export const Positive = Finite.check(Schema.isGreaterThan(0));
export const Framework = Schema.Literals([
  "script-tag",
  "react",
  "nextjs",
  "vue",
  "nuxt",
  "astro",
  "tanstack-start",
]);
export type Framework = typeof Framework.Type;
export const DeploymentMode = Schema.Literals([
  "hosted",
  "self-hosted",
  "manifest",
  "local-only",
]);
const StringRecord = Schema.Record(Schema.String, Schema.String);
const Diagnostics = Schema.Record(Schema.String, Schema.Unknown);
const HttpUrl = Text.check(
  Schema.makeFilter((value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  })
);
const Timestamp = Text.check(
  Schema.makeFilter((value) => Number.isFinite(Date.parse(value)))
);
const Hash = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u));

export const Command = Schema.Struct({
  args: Schema.Array(Schema.String),
  command: Text,
});
export const ServerConfig = Schema.Struct({
  build: Schema.optionalKey(Command),
  cwd: Text,
  readinessTimeoutMs: Positive,
  readinessUrl: HttpUrl,
  start: Command,
});
export const AdapterConfig = Schema.Struct({
  accept: Text,
  acceptPreparation: Schema.optionalKey(Schema.Array(Text)),
  acknowledgement: Schema.optionalKey(Text),
  banner: Text,
  categoryToggle: Schema.optionalKey(Text),
  controlledRequestPath: Schema.optionalKey(Text),
  overlay: Schema.optionalKey(Text),
  pageAction: Schema.optionalKey(Text),
  preferences: Schema.optionalKey(Text),
  preferencesPanel: Schema.optionalKey(Text),
  primaryContent: Schema.optionalKey(Text),
  readinessSource: Schema.optionalKey(Schema.Literals(["public-state"])),
  ready: Schema.optionalKey(Text),
  reject: Text,
  rejectPreparation: Schema.optionalKey(Schema.Array(Text)),
  reopen: Schema.optionalKey(Text),
  save: Schema.optionalKey(Text),
  savePreparation: Schema.optionalKey(Schema.Array(Text)),
  serverEventsUrl: Schema.optionalKey(HttpUrl),
  stateGlobal: Text,
  withdraw: Schema.optionalKey(Text),
  withdrawPreparation: Schema.optionalKey(Schema.Array(Text)),
});
export const Provenance = Schema.Struct({
  artifactIntegrity: Text,
  lockfileHash: Hash,
  sourceCommit: Schema.optionalKey(Text),
  sourceUrl: Schema.optionalKey(HttpUrl),
});
export type Provenance = typeof Provenance.Type;
export const Deployment = Schema.Struct({
  assets: Schema.Literals(["local", "remote", "mixed"]),
  backend: Schema.Literals(["none", "controlled-local", "remote-service"]),
});
export type Deployment = typeof Deployment.Type;
export const FixtureConfig = Schema.Struct({
  adapter: AdapterConfig,
  artifactPolicy: Schema.optionalKey(
    Schema.Literals(["immutable-release", "mutable-network"])
  ),
  baseline: Schema.Boolean,
  configurationHash: Text,
  deployment: Schema.optionalKey(Deployment),
  framework: Framework,
  frameworkVersion: Text,
  id: Text,
  mode: DeploymentMode,
  presentation: Schema.optionalKey(
    Schema.Literals(["default", "custom", "headless"])
  ),
  product: Text,
  provenance: Schema.optionalKey(Provenance),
  revision: Text,
  schemaVersion: Schema.Literal(3),
  server: Schema.optionalKey(ServerConfig),
  url: HttpUrl,
  version: Text,
});
export type FixtureConfig = typeof FixtureConfig.Type;
export const ScenarioConfig = Schema.Struct({
  action: Schema.Literals([
    "load",
    "accept",
    "reject",
    "save",
    "withdraw",
    "preferences",
  ]),
  actionDeadlineMs: Positive,
  cache: Schema.Literals(["cold", "warm"]),
  expectedBanner: Schema.Boolean,
  followupOffsetMs: NonNegative,
  id: Text,
  input: Schema.Literals(["pointer", "keyboard"]),
  navigationTimeoutMs: Positive,
  observationMs: Positive,
  readiness: Schema.Literals(["early", "ready"]),
  visitor: Schema.Literals([
    "fresh",
    "returning-accepted",
    "returning-rejected",
  ]),
  workload: Schema.Struct({
    categories: Schema.Array(Text),
    scriptCount: Count,
  }).check(
    Schema.makeFilter(
      (workload) =>
        new Set(workload.categories).size === workload.categories.length &&
        (workload.scriptCount === 0 || workload.categories.length > 0)
    )
  ),
});
export type ScenarioConfig = typeof ScenarioConfig.Type;
export const DeviceProfile = Schema.Struct({
  cpuCalibration: Schema.optionalKey(ProfileCpuCalibration),
  cpuSlowdown: Positive,
  deviceScaleFactor: Positive,
  hasTouch: Schema.optionalKey(Schema.Boolean),
  id: Text,
  isMobile: Schema.Boolean,
  locale: Text,
  network: Schema.Struct({
    downloadBytesPerSecond: Positive,
    latencyMs: NonNegative,
    uploadBytesPerSecond: Positive,
  }),
  region: Text,
  userAgent: Schema.optionalKey(Text),
  viewport: Schema.Struct({
    height: Count.check(Schema.isGreaterThan(0)),
    width: Count.check(Schema.isGreaterThan(0)),
  }),
}).check(
  Schema.makeFilter(
    (profile) => {
      const calibration = profile.cpuCalibration;
      if (calibration === undefined) {
        return true;
      }
      const { artifact, tier } = calibration;
      const rate = artifact.results[tier];
      return (
        typeof rate === "number" &&
        rate >= 1 &&
        artifact.validation.baselineStable &&
        artifact.validation[tier].eligible &&
        profile.cpuSlowdown === rate
      );
    },
    {
      message:
        "CPU calibration must select an eligible tier with a matching slowdown of at least 1.",
    }
  )
);
export type DeviceProfile = typeof DeviceProfile.Type;

export const MetricUnit = Schema.Literals([
  "ms",
  "bytes",
  "count",
  "ratio",
  "score",
]);
export type MetricUnit = typeof MetricUnit.Type;
export const METRIC_UNITS: Readonly<Record<string, MetricUnit>> = {
  "action.acknowledgement": "ms",
  "action.consent-effective": "ms",
  "action.dismissed": "ms",
  "action.followup-input-to-next-paint": "ms",
  "action.input-to-next-paint": "ms",
  "action.local-persisted": "ms",
  "action.long-task-blocking": "ms",
  "action.preferences-visible": "ms",
  "action.remote-persisted": "ms",
  "action.scripts-complete": "ms",
  "banner.coverage": "ratio",
  "banner.visible": "ms",
  "consent.resolution": "ms",
  "deferred.decoded-body": "bytes",
  "deferred.encoded-body": "bytes",
  "deferred.requests": "count",
  "deferred.third-party-requests": "count",
  "deferred.transfer": "bytes",
  "initial.decoded-body": "bytes",
  "initial.encoded-body": "bytes",
  "initial.long-task-blocking": "ms",
  "initial.requests": "count",
  "initial.third-party-requests": "count",
  "initial.transfer": "bytes",
  "observation.callbacks": "count",
  "observation.frame-interval": "ms",
  "page.cls": "score",
  "page.fcp": "ms",
  "page.lab-inp": "ms",
  "page.lcp": "ms",
  "page.primary-content-paint": "ms",
  "page.primary-visible": "ms",
  "page.ttfb": "ms",
  "scripts.duplicates": "count",
  "scripts.executions": "count",
};
const validMetricUnit = (measurement: { key: string; unit: MetricUnit }) =>
  METRIC_UNITS[measurement.key] === measurement.unit ||
  (measurement.key.startsWith("custom.") &&
    METRIC_UNITS[measurement.key] === undefined);
const Measured = Schema.Struct({
  key: Text,
  method: Text,
  status: Schema.Literal("measured"),
  unit: MetricUnit,
  value: NonNegative,
}).check(
  Schema.makeFilter((measurement) => {
    if (!validMetricUnit(measurement)) {
      return false;
    }
    if (measurement.unit === "bytes" || measurement.unit === "count") {
      return Number.isSafeInteger(measurement.value);
    }
    if (measurement.unit === "ratio") {
      return measurement.value <= 1;
    }
    return true;
  })
);
const Missing = Schema.Struct({
  key: Text,
  method: Text,
  reason: Text,
  status: Schema.Literals(["unavailable", "unsupported", "failed"]),
  unit: MetricUnit,
}).check(Schema.makeFilter(validMetricUnit));
export const Measurement = Schema.Union([Measured, Missing]);
export type Measurement = typeof Measurement.Type;
export const Failure = Schema.Struct({ code: Text, message: Text });
export const Sample = Schema.Struct({
  attempt: Count,
  diagnostics: Schema.optionalKey(Diagnostics),
  failures: Schema.Array(Failure),
  fixtureId: Text,
  id: UUID,
  iteration: Count,
  measurements: Schema.Array(Measurement),
  pairId: Schema.optionalKey(Text),
  runId: UUID,
  scenarioId: Text,
  status: Schema.Literals(["passed", "failed", "incomplete"]),
}).check(
  Schema.makeFilter(
    (sample) =>
      new Set(sample.measurements.map((metric) => metric.key)).size ===
        sample.measurements.length &&
      (sample.status !== "passed" ||
        (sample.failures.length === 0 &&
          sample.measurements.every((metric) => metric.status !== "failed"))) &&
      (sample.status !== "failed" || sample.failures.length > 0)
  )
);
export type Sample = typeof Sample.Type;
export const RunManifest = Schema.Struct({
  collectorVersion: Text,
  createdAt: Timestamp,
  environment: StringRecord,
  id: UUID,
  methodologyVersion: Text,
  profile: DeviceProfile,
  seed: Count,
  versions: StringRecord,
});
export type RunManifest = typeof RunManifest.Type;
export const CapabilityCheck = Schema.Struct({
  capability: Text,
  evidence: Schema.Array(Text),
  fixtureId: Text,
  framework: Framework,
  id: UUID,
  mode: DeploymentMode,
  reason: Schema.optionalKey(Text),
  status: Schema.Literals([
    "verified",
    "failed",
    "documented",
    "unsupported",
    "unknown",
  ]),
  verifiedAt: Schema.optionalKey(Timestamp),
}).check(
  Schema.makeFilter(
    (check) =>
      check.status !== "verified" ||
      (check.evidence.length > 0 && check.verifiedAt !== undefined)
  )
);
export type CapabilityCheck = typeof CapabilityCheck.Type;
export const Artifact = Schema.Struct({
  id: UUID,
  mediaType: Text,
  path: Text,
  sampleId: Schema.optionalKey(UUID),
  sha256: Hash,
  sizeBytes: Count,
});
export type Artifact = typeof Artifact.Type;
export const ResultEnvelope = Schema.Struct({
  artifacts: Schema.Array(Artifact),
  capabilities: Schema.Array(CapabilityCheck),
  fixtures: Schema.Array(FixtureConfig),
  manifest: RunManifest,
  samples: Schema.Array(Sample),
  scenarios: Schema.Array(ScenarioConfig),
  schemaVersion: Schema.Literal(3),
  status: Schema.Literals(["passed", "failed", "incomplete"]),
}).check(
  Schema.makeFilter((result) => {
    const fixtures = new Set(result.fixtures.map((fixture) => fixture.id));
    const scenarios = new Set(result.scenarios.map((scenario) => scenario.id));
    const samples = new Set(result.samples.map((sample) => sample.id));
    return (
      fixtures.size === result.fixtures.length &&
      scenarios.size === result.scenarios.length &&
      samples.size === result.samples.length &&
      result.samples.every(
        (sample) =>
          sample.runId === result.manifest.id &&
          fixtures.has(sample.fixtureId) &&
          scenarios.has(sample.scenarioId)
      ) &&
      result.capabilities.every((check) => fixtures.has(check.fixtureId)) &&
      result.artifacts.every(
        (artifact) =>
          artifact.sampleId === undefined || samples.has(artifact.sampleId)
      ) &&
      (result.status !== "passed" ||
        (result.samples.length > 0 &&
          result.samples.every(
            (sample) =>
              sample.status === "passed" && sample.failures.length === 0
          )))
    );
  })
);
export type ResultEnvelope = typeof ResultEnvelope.Type;
const strict = { onExcessProperty: "error" } as const;
export const decodeFixture = Schema.decodeUnknownSync(FixtureConfig, strict);
export const decodeScenario = Schema.decodeUnknownSync(ScenarioConfig, strict);
export const decodeMeasurement = Schema.decodeUnknownSync(Measurement, strict);
export const decodeResult = Schema.decodeUnknownSync(ResultEnvelope, strict);
export const decodeCapability = Schema.decodeUnknownSync(
  CapabilityCheck,
  strict
);

export const MetricSummary = Schema.Struct({
  attempts: Count,
  available: Schema.optionalKey(Count),
  eligibilityReasons: Schema.optionalKey(Schema.Array(Text)),
  excluded: Schema.optionalKey(Count),
  failed: Count,
  includedIncomplete: Schema.optionalKey(Count),
  incomplete: Count,
  max: Schema.NullOr(Finite),
  mean: Schema.NullOr(Finite),
  measured: Count,
  median: Schema.NullOr(Finite),
  min: Schema.NullOr(Finite),
  missing: Count,
  p75: Schema.NullOr(Finite),
  passed: Count,
});
const LcpAttributionSummary = Schema.Struct({
  elements: Schema.Array(
    Schema.Struct({
      id: Schema.NullOr(Schema.String),
      role: Schema.Literals(["content", "banner", "other", "unavailable"]),
      samples: Count,
      size: Schema.NullOr(NonNegative),
      tag: Schema.NullOr(Schema.String),
      url: Schema.NullOr(Schema.String),
    })
  ),
  missing: Count,
});

/** Analyses written by this version must satisfy the current invariants below. */
export const ANALYSIS_VERSION = "cookiebench-analysis-v3.3.0";
const HistoricalPairedSummary = Schema.Struct({
  conclusion: Schema.Literals([
    "candidate-lower",
    "candidate-higher",
    "inconclusive",
  ]),
  confidenceInterval: Schema.NullOr(
    Schema.Struct({
      high: Finite,
      level: Schema.Literal(0.95),
      low: Finite,
      method: Schema.Literal("paired-percentile-bootstrap"),
      resamples: Count,
    }).check(Schema.makeFilter((interval) => interval.low <= interval.high))
  ),
  count: Count,
  medianDifference: Schema.NullOr(Finite),
  p75Difference: Schema.NullOr(Finite),
});
const ConfidenceLevel = Finite.check(
  Schema.isGreaterThanOrEqualTo(0.95),
  Schema.isLessThan(1)
);
export const PairedSummary = Schema.Struct({
  ...HistoricalPairedSummary.fields,
  confidenceInterval: Schema.NullOr(
    Schema.Struct({
      high: Finite,
      level: ConfidenceLevel,
      low: Finite,
      method: Schema.Literal("paired-percentile-bootstrap"),
      resamples: Count,
    }).check(Schema.makeFilter((interval) => interval.low <= interval.high))
  ),
});
/** Bonferroni control: each interval uses 1 - (1 - familyLevel) / comparisons. */
export const Multiplicity = Schema.Struct({
  comparisons: Count,
  family: Text,
  familyLevel: Schema.Literal(0.95),
  intervalLevel: ConfidenceLevel,
  method: Schema.Literal("bonferroni"),
}).check(
  Schema.makeFilter(
    (multiplicity) =>
      multiplicity.intervalLevel ===
      1 -
        (1 - multiplicity.familyLevel) / Math.max(1, multiplicity.comparisons),
    { message: "The interval level must be the Bonferroni-adjusted level." }
  )
);
const HistoricalComparisonFields = {
  baseline: MetricSummary,
  baselineFixtureId: Text,
  candidate: MetricSummary,
  candidateFixtureId: Text,
  deployment: Schema.optionalKey(
    Schema.Struct({
      baseline: Schema.NullOr(Deployment),
      candidate: Schema.NullOr(Deployment),
    })
  ),
  eligibilityReasons: Schema.Array(Text),
  eligible: Schema.Boolean,
  lcpAttribution: Schema.optionalKey(
    Schema.Struct({
      baseline: LcpAttributionSummary,
      candidate: LcpAttributionSummary,
    })
  ),
  paired: HistoricalPairedSummary,
  scenarioId: Text,
  unit: Schema.NullOr(MetricUnit),
};
const ComparisonFields = {
  ...HistoricalComparisonFields,
  paired: PairedSummary,
};

/** Only an eligible comparison may carry an interval, and a verdict must follow from it. */
function verdictFollowsEligibility(comparison: {
  eligible: boolean;
  eligibilityReasons: readonly string[];
  paired: {
    conclusion: string;
    confidenceInterval: { low: number; high: number } | null;
  };
}): boolean {
  const { conclusion, confidenceInterval: interval } = comparison.paired;
  if (comparison.eligible !== (comparison.eligibilityReasons.length === 0)) {
    return false;
  }
  if (!comparison.eligible) {
    return interval === null && conclusion === "inconclusive";
  }
  if (conclusion === "candidate-lower") {
    return interval !== null && interval.high < 0;
  }
  if (conclusion === "candidate-higher") {
    return interval !== null && interval.low > 0;
  }
  return interval === null || (interval.low <= 0 && interval.high >= 0);
}
const CurrentAnalysis = Schema.Struct({
  analysisVersion: Schema.Literal(ANALYSIS_VERSION),
  comparisons: Schema.Array(
    Schema.Struct(ComparisonFields).check(
      Schema.makeFilter(verdictFollowsEligibility, {
        message:
          "A comparison is eligible exactly when it has no eligibility reasons; only eligible comparisons carry an interval, and a directional conclusion must follow from it.",
      })
    )
  ),
  metricKey: Text,
  multiplicity: Multiplicity,
  sourceRunIds: Schema.Array(UUID),
}).check(
  Schema.makeFilter(
    (analysis) => {
      const intervals = analysis.comparisons.flatMap((comparison) =>
        comparison.paired.confidenceInterval
          ? [comparison.paired.confidenceInterval]
          : []
      );
      return (
        intervals.length <= analysis.multiplicity.comparisons &&
        intervals.every(
          (interval) => interval.level === analysis.multiplicity.intervalLevel
        )
      );
    },
    {
      message:
        "Every interval must use the family's adjusted level, and the family must cover every interval.",
    }
  )
);
/**
 * Earlier analyses remain decodable as recorded. Before v3.3.0 an ineligible
 * comparison could still carry an interval and a directional conclusion; that
 * verdict is not evidence. Their 95% intervals had no multiplicity adjustment
 * and shared one bootstrap seed across comparisons.
 */
const HistoricalAnalysis = Schema.Struct({
  analysisVersion: Text.check(
    Schema.makeFilter((version) => version !== ANALYSIS_VERSION)
  ),
  comparisons: Schema.Array(Schema.Struct(HistoricalComparisonFields)),
  metricKey: Text,
  sourceRunIds: Schema.Array(UUID),
});
export const Analysis = Schema.Union([CurrentAnalysis, HistoricalAnalysis]);
export type Analysis = typeof Analysis.Type;
export const decodeAnalysis = Schema.decodeUnknownSync(Analysis, strict);
