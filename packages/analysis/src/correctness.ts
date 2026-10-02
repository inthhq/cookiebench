import type { Sample } from "@cookiebench/schema";
import { Option, Schema } from "effect";

const assertionFailures = new Set([
  "backend-persistence-failed",
  "banner-missing",
  "choice-lost-on-reload",
  "consent-mismatch",
  "controls-not-ready",
  "duplicate-script-execution",
  "first-input-failed",
  "forbidden-frame-load",
  "forbidden-script-execution",
  "forbidden-server-egress",
  "forbidden-storage-write",
  "incorrect-permissions",
  "missing-script-execution",
  "page-unresponsive",
  "unexpected-banner",
]);
const completed = Schema.Struct({
  correctnessChecksCompleted: Schema.optionalKey(Schema.Boolean),
});
const decodeCompletion = Schema.decodeUnknownOption(
  Schema.Struct({
    ...completed.fields,
    followupProbe: Schema.optionalKey(
      Schema.Struct({ diagnostics: Schema.optionalKey(completed) })
    ),
  })
);

export interface CorrectnessSummary {
  attempts: number;
  verified: number;
  failed: number;
  unknown: number;
  reasons: string[];
}

export function sampleCorrectness(sample: Sample): {
  status: "verified" | "failed" | "unknown";
  reasons: string[];
} {
  const failures = sample.failures.map((failure) => ({
    ...failure,
    unprefixedCode: failure.code.replace(/^followup:/u, ""),
  }));
  const assertions = failures.filter((failure) =>
    assertionFailures.has(failure.unprefixedCode)
  );
  if (assertions.length > 0) {
    return {
      reasons: assertions.map(
        (failure) => `${failure.code}: ${failure.message}`
      ),
      status: "failed",
    };
  }
  const reasons = failures
    .filter(
      (failure) => failure.unprefixedCode !== "required-measurement-unavailable"
    )
    .map((failure) => `${failure.code}: ${failure.message}`);
  const evidence = decodeCompletion(sample.diagnostics);
  if (
    Option.isNone(evidence) ||
    evidence.value.correctnessChecksCompleted !== true
  ) {
    reasons.push(
      "The collector did not establish completion of all required correctness checks."
    );
  } else if (
    evidence.value.followupProbe &&
    evidence.value.followupProbe.diagnostics?.correctnessChecksCompleted !==
      true
  ) {
    reasons.push(
      "The followup probe did not establish completion of all required correctness checks."
    );
  }
  if (sample.status === "failed") {
    reasons.push(
      "The attempt failed without a classified correctness assertion."
    );
  } else if (sample.status === "incomplete" && failures.length === 0) {
    reasons.push("The incomplete attempt has no recorded explanation.");
  } else if (sample.status === "passed" && failures.length > 0) {
    reasons.push("The passed attempt contains failures.");
  }
  return { reasons, status: reasons.length ? "unknown" : "verified" };
}

/** Verification needs explicit collector evidence, including the separate followup probe. */
export function summarizeCorrectness(
  samples: readonly Sample[]
): CorrectnessSummary {
  const results = samples.map(sampleCorrectness);
  return {
    attempts: samples.length,
    failed: results.filter((result) => result.status === "failed").length,
    reasons: [...new Set(results.flatMap((result) => result.reasons))],
    unknown: results.filter((result) => result.status === "unknown").length,
    verified: results.filter((result) => result.status === "verified").length,
  };
}
