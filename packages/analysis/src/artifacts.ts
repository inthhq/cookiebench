import type { FixtureConfig, Sample } from "@cookiebench/schema";
import { Option, Schema } from "effect";

const decodeCoverage = Schema.decodeUnknownOption(
  Schema.Struct({
    complete: Schema.Boolean,
    reasons: Schema.Array(Schema.String),
    scope: Schema.Literal("page-target"),
  })
);

function completeCoverage(sample: Pick<Sample, "diagnostics">): boolean {
  const decoded = decodeCoverage(sample.diagnostics?.networkCoverage);
  return (
    Option.isSome(decoded) &&
    decoded.value.complete &&
    decoded.value.reasons.length === 0
  );
}

const decodeRequests = Schema.decodeUnknownOption(
  Schema.Array(
    Schema.Struct({
      bodyDigestEncoding: Schema.optionalKey(
        Schema.Literals(["base64-bytes", "utf8-text", "empty-body"])
      ),
      bodyDigestUnavailable: Schema.optionalKey(Schema.String),
      decodedBodySha256: Schema.optionalKey(
        Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u))
      ),
      failed: Schema.optionalKey(Schema.String),
      finished: Schema.Boolean,
      party: Schema.String,
      resourceType: Schema.String,
      responseContentType: Schema.optionalKey(Schema.String),
      url: Schema.String,
    })
  )
);

function identity(sample: Pick<Sample, "diagnostics">): string | undefined {
  const decoded = decodeRequests(sample.diagnostics?.requests);
  if (Option.isNone(decoded)) {
    return undefined;
  }
  const relevant = decoded.value.filter(
    (row) =>
      row.party === "third-party" &&
      (["Script", "Stylesheet"].includes(row.resourceType) ||
        /javascript|json|css/iu.test(row.responseContentType ?? ""))
  );
  if (
    !relevant.length ||
    relevant.some(
      (row) =>
        !row.finished ||
        row.failed ||
        row.bodyDigestUnavailable ||
        !row.decodedBodySha256
    )
  ) {
    return undefined;
  }
  return JSON.stringify(
    [
      ...new Set(
        relevant.map((row) =>
          JSON.stringify([
            row.url,
            row.decodedBodySha256,
            row.bodyDigestEncoding ?? "legacy-unspecified",
          ])
        )
      ),
    ].toSorted()
  );
}

/** Dated captured response identity, with explicit collection coverage and no refetching. */
export function artifactEligibility(
  fixture: Pick<FixtureConfig, "artifactPolicy">,
  samples: readonly Pick<Sample, "diagnostics">[]
): string[] {
  if (fixture.artifactPolicy !== "mutable-network") {
    return [];
  }
  const identities = samples.map(identity);
  const reasons: string[] = [];
  if (samples.some((sample) => !completeCoverage(sample))) {
    reasons.push(
      "Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified."
    );
  }
  if (!identities.length || identities.includes(undefined)) {
    reasons.push(
      "Measured remote script/style/config response identity is missing or incomplete in one or more attempts."
    );
  }
  if (new Set(identities.filter((item) => item !== undefined)).size > 1) {
    reasons.push(
      "Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional."
    );
  }
  return reasons;
}
