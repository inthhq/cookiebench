import { createHash } from "node:crypto";

export interface LegacyImport {
  sourceSha256: string;
  sourcePath: string;
  originalText: string;
  originalJson: unknown;
  methodologyVersion: "legacy";
  collectorVersion: "legacy-unknown";
  units: "unknown-ambiguous";
  comparisonEligible: false;
  recordCount: number;
  sampleCount: number;
  reconciliation: {
    identities: string[];
    sampleCounts: number[];
    notes: string[];
  };
}

/** Preserve the bytes and observed structure, including untrustworthy old scores. */
export function parseLegacy(
  bytes: Uint8Array,
  sourcePath: string
): LegacyImport {
  const originalText = new TextDecoder("utf-8", {
    fatal: true,
    ignoreBOM: true,
  }).decode(bytes);
  const originalJson: unknown = JSON.parse(
    originalText.replace(/^\uFEFF/u, "")
  );
  if (typeof originalJson !== "object" || originalJson === null) {
    throw new Error("Legacy input must be a JSON object or array.");
  }
  const records = Array.isArray(originalJson) ? originalJson : [originalJson];
  const identities: string[] = [];
  const sampleCounts: number[] = [];
  for (const [index, item] of records.entries()) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`Legacy record ${index} must be an object.`);
    }
    const record = item as Record<string, unknown>;
    let identity = `source-record-${index}`;
    if (typeof record.app === "string") {
      identity = record.app;
    }
    if (typeof record.name === "string") {
      identity = record.name;
    }
    identities.push(identity);
    const samples =
      [record.details, record.iterations, record.results].find(Array.isArray) ??
      [];
    sampleCounts.push(samples.length);
  }
  return {
    collectorVersion: "legacy-unknown",
    comparisonEligible: false,
    methodologyVersion: "legacy",
    originalJson,
    originalText,
    reconciliation: {
      identities,
      notes: [
        "Historical size fields mix bytes and KiB; no conversion was attempted.",
        "Scores and aggregated values are retained only in the original JSON.",
        "Sample counts include only observed detail arrays, never inferred iteration totals.",
      ],
      sampleCounts,
    },
    recordCount: records.length,
    sampleCount: sampleCounts.reduce((sum, count) => sum + count, 0),
    sourcePath,
    sourceSha256: createHash("sha256").update(bytes).digest("hex"),
    units: "unknown-ambiguous",
  };
}
