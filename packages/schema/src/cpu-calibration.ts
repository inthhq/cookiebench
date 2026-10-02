import { Schema } from "effect";

const Text = Schema.String.check(Schema.isNonEmpty());
const Finite = Schema.Number.check(Schema.isFinite());
const Scores = Schema.Array(Finite);
function median(scores: readonly number[]) {
  const ordered = scores.toSorted((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? ((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2
    : (ordered[middle] ?? 0);
}
function stableScores(scores: readonly number[]) {
  return (
    scores.length > 0 &&
    scores.every((score) => score > 0) &&
    (Math.max(...scores) - Math.min(...scores)) / median(scores) <= 0.15
  );
}
const sameScores = (left: readonly number[], right: readonly number[]) =>
  left.length === right.length &&
  left.every((score, index) => score === right[index]);
export const CpuCalibrationTier = Schema.Literals(["low", "mid"]);
export type CpuCalibrationTier = typeof CpuCalibrationTier.Type;
const TierValidation = Schema.Struct({
  eligible: Schema.Boolean,
  reasons: Schema.Array(Text),
  scores: Scores,
});

export const CpuCalibrationArtifact = Schema.Struct({
  browser: Schema.Struct({
    headless: Schema.Literal(true),
    jsVersion: Text,
    launchExecutable: Text,
    product: Text,
    revision: Text,
    version: Text,
  }),
  createdAt: Text.check(
    Schema.makeFilter((value) => Number.isFinite(Date.parse(value)))
  ),
  host: Schema.Struct({
    arch: Text,
    cpuModel: Text,
    hostname: Text,
    logicalCpus: Finite.check(Schema.isInt(), Schema.isGreaterThan(0)),
    memoryBytes: Finite.check(Schema.isGreaterThan(0)),
    platform: Text,
    release: Text,
  }),
  id: Schema.String.check(Schema.isUUID()),
  method: Schema.Literal("chrome-devtools"),
  results: Schema.Struct({
    low: Schema.Union([Finite, Schema.Literal("DEVICE_TOO_WEAK")]),
    mid: Schema.Union([Finite, Schema.Literal("DEVICE_TOO_WEAK")]),
  }),
  samples: Schema.Array(
    Schema.Struct({
      phase: Schema.Literals([
        "warmup",
        "calibration",
        "baseline-validation",
        "tier-validation",
      ]),
      rate: Finite,
      score: Finite,
      tier: Schema.optionalKey(CpuCalibrationTier),
    })
  ),
  schemaVersion: Schema.Literal(1),
  sourceRevision: Schema.Literal("933872b3f8520add8c43e30adf00c32622f6bdf4"),
  sourceSha256: Schema.Literal(
    "f3835db080555d9850e2d058f8792eb6b74586d91545fbc88eefad0439cb7836"
  ),
  validation: Schema.Struct({
    baselineScores: Scores,
    baselineStable: Schema.Boolean,
    low: TierValidation,
    maxRelativeError: Schema.Literal(0.15),
    maxRelativeSpread: Schema.Literal(0.15),
    mid: TierValidation,
    policy: Schema.Literal("cookiebench-cpu-validation-v1"),
  }),
}).check(
  Schema.makeFilter(
    (artifact) => {
      const baseline = artifact.samples.filter(
        (sample) => sample.phase === "baseline-validation"
      );
      const upstreamBaseline = artifact.samples.filter(
        (sample) => sample.phase === "calibration" && sample.rate === 1
      );
      const stable = stableScores([
        ...upstreamBaseline.map((sample) => sample.score),
        ...artifact.validation.baselineScores,
      ]);
      if (
        baseline.length !== 3 ||
        baseline.some((sample) => sample.rate !== 1) ||
        !sameScores(
          baseline.map((sample) => sample.score),
          artifact.validation.baselineScores
        ) ||
        upstreamBaseline.length === 0 ||
        stable !== artifact.validation.baselineStable
      ) {
        return false;
      }
      return (["low", "mid"] as const).every((tier) => {
        const rate = artifact.results[tier];
        const validation = artifact.validation[tier];
        const samples = artifact.samples.filter(
          (sample) => sample.phase === "tier-validation" && sample.tier === tier
        );
        if (typeof rate !== "number" || rate < 1) {
          return (
            !validation.eligible &&
            validation.scores.length === 0 &&
            samples.length === 0 &&
            validation.reasons.length > 0
          );
        }
        if (
          samples.length !== 3 ||
          samples.some((sample) => sample.rate !== rate) ||
          !sameScores(
            samples.map((sample) => sample.score),
            validation.scores
          )
        ) {
          return false;
        }
        const target = tier === "low" ? 264 : 1000;
        const eligible =
          stable &&
          stableScores(validation.scores) &&
          Math.abs(median(validation.scores) - target) / target <= 0.15;
        return (
          validation.eligible === eligible &&
          (eligible
            ? validation.reasons.length === 0
            : validation.reasons.length > 0)
        );
      });
    },
    {
      message:
        "CPU calibration validation must agree with its recorded baseline and tier samples.",
    }
  )
);
export type CpuCalibrationArtifact = typeof CpuCalibrationArtifact.Type;
export const decodeCpuCalibrationArtifact = Schema.decodeUnknownSync(
  CpuCalibrationArtifact,
  { onExcessProperty: "error" }
);
export const decodeCpuCalibrationTier =
  Schema.decodeUnknownSync(CpuCalibrationTier);

export const ProfileCpuCalibration = Schema.Struct({
  artifact: CpuCalibrationArtifact,
  tier: CpuCalibrationTier,
});
