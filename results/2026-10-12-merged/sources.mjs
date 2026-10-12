import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repo = fileURLToPath(new URL("../..", import.meta.url));
export const here = import.meta.dirname;
export const frameworks = [
  "nextjs",
  "nuxt",
  "astro",
  "tanstack-start",
  "react",
  "script",
];
export const profiles = ["desktop", "mobile"];
export const extraMetrics = ["page.ttfb", "page.fcp"];
export const batchMetrics = [
  "page.lcp",
  "page.primary-content-paint",
  "page.cls",
  "initial.transfer",
  "initial.decoded-body",
];
export const pairedMetrics = [...extraMetrics, ...batchMetrics];
export const metricKeys = [
  "banner.visible",
  "page.ttfb",
  "page.fcp",
  "page.lcp",
  "page.primary-content-paint",
  "page.cls",
  "initial.long-task-blocking",
  "initial.transfer",
  "initial.decoded-body",
  "initial.requests",
  "initial.third-party-requests",
  "consent.resolution",
];
export const runs = {
  alpha11: {
    description: "Validated alpha.11 loads and desktop correctness",
    directory: "results/2026-10-11-alpha11-c15t",
    id: "c15t-alpha11-2026-10-11",
  },
  alpha11Correctness: {
    description:
      "Mobile correctness after repairing baseline observation windows",
    directory: "results/2026-10-11-alpha11-c15t/mobile-correctness-retry",
    id: "c15t-alpha11-mobile-correctness-retry",
  },
  cookieYesHydration: {
    description: "Next.js CookieYes loaded after hydration",
    directory: "results/2026-10-11-cookie-yes-hydration",
    id: "cookie-yes-hydration-2026-10-11",
  },
  matrix: {
    description: "Original full CMP scan; c15t rows replaced in this merge",
    directory: "results/2026-10-11",
    id: "matrix-2026-10-11",
  },
};

export const relative = (file) => path.relative(repo, file);
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const readJson = (file) =>
  JSON.parse(fs.readFileSync(path.resolve(repo, file), "utf-8"));
export const fileHash = (file) =>
  sha256(fs.readFileSync(path.resolve(repo, file)));
export const writeJson = (file, value) =>
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const indexes = new Map();
export function indexFor(run, profile) {
  const { directory } = runs[run];
  const file = `${directory}${run === "alpha11Correctness" ? "" : `/${profile}`}/index.json`;
  if (!indexes.has(file)) {
    const index = readJson(file);
    assert.equal(index.complete, true, `Incomplete index: ${file}`);
    indexes.set(file, { file, hash: fileHash(file), index });
  }
  return indexes.get(file);
}

export function sourceFor(run, profile, entryId) {
  const { index, file, hash } = indexFor(run, profile);
  const entry = index.results.find((item) => item.id === entryId);
  assert.ok(entry, `Missing entry: ${file} ${entryId}`);
  assert.equal(entry.status, "recorded");
  assert.equal(
    fileHash(entry.envelopeFile),
    entry.envelopeSha256,
    `Changed raw envelope: ${entry.envelopeFile}`
  );
  const envelope = readJson(entry.envelopeFile);
  assert.equal(
    envelope.manifest.environment.collectorSourceHash,
    index.measurementConditions.collectorSourceHash
  );
  return {
    entry,
    envelope,
    index,
    provenance: {
      collectorVersion: envelope.manifest.collectorVersion,
      createdAt: envelope.manifest.createdAt,
      entryId,
      envelopeFile: entry.envelopeFile,
      envelopeSha256: entry.envelopeSha256,
      indexFile: file,
      indexSha256: hash,
      manifestId: envelope.manifest.id,
      measurementConditions: index.measurementConditions,
      methodologyVersion: envelope.manifest.methodologyVersion,
      profile: envelope.manifest.profile,
      run: runs[run].id,
      scenarios: envelope.scenarios.map(({ id, action, observationMs }) => ({
        action,
        id,
        observationMs,
      })),
    },
  };
}

export const competitorRun = (framework, product) =>
  framework === "nextjs" && product === "cookie-yes"
    ? "cookieYesHydration"
    : "matrix";
export const entryName = (framework, product, kind) =>
  `${framework}${product === "cookie-yes" ? "-cookie-yes" : ""}-${kind}`;

export function comparisonsFor(source, profile, entryId, alpha11 = false) {
  const evidence = {};
  for (const metric of [...pairedMetrics, "initial.encoded-body"]) {
    const file = extraMetrics.includes(metric)
      ? `${alpha11 ? relative(here) : "results/2026-10-11-merged"}/paired/${profile}/${entryId}/compare-${metric}.json`
      : `${path.dirname(source.entry.envelopeFile)}/compare-${metric}/stdout.json`;
    const analysis = readJson(file);
    assert.equal(analysis.metricKey, metric);
    assert.deepEqual(analysis.sourceRunIds, [source.envelope.manifest.id]);
    evidence[metric] = { analysis, file, sha256: fileHash(file) };
  }
  return evidence;
}

export function pairedValue(comparison) {
  const { paired } = comparison;
  return {
    ci: paired.confidenceInterval
      ? [paired.confidenceInterval.low, paired.confidenceInterval.high]
      : null,
    ciLevel: paired.confidenceInterval?.level ?? null,
    conclusion: paired.conclusion,
    medianDifference: paired.medianDifference,
    pairs: paired.count,
  };
}

function median(values) {
  if (!values.length) {
    return null;
  }
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function stats(envelope, fixtureId) {
  const samples = envelope.samples.filter(
    (sample) =>
      sample.fixtureId === fixtureId &&
      sample.scenarioId === "load" &&
      sample.kind !== "warmup"
  );
  const passed = samples.filter((sample) => sample.status === "passed");
  const basis = passed.length
    ? passed
    : samples.filter((sample) => sample.status === "incomplete");
  const medians = Object.fromEntries(
    metricKeys.map((key) => [
      key,
      median(
        basis.flatMap((sample) => {
          const metric = sample.measurements.find((item) => item.key === key);
          return metric?.status === "measured" ? [metric.value] : [];
        })
      ),
    ])
  );
  medians["document.decoded-body"] = median(
    basis
      .map(
        (sample) =>
          sample.diagnostics?.requests?.find(
            (request) => request.resourceType === "Document"
          )?.decodedBodyBytes
      )
      .filter((value) => value !== null && value !== undefined)
  );
  const reasons = new Map();
  for (const sample of samples.filter((item) => item.status !== "passed")) {
    for (const failure of sample.failures ?? []) {
      reasons.set(failure.message, (reasons.get(failure.message) ?? 0) + 1);
    }
  }
  return {
    failureReasons: [...reasons].map(([message, visits]) => ({
      message,
      visits,
    })),
    medians,
    passed: passed.length,
    sampleBasis: passed.length ? "passed" : "incomplete",
    visits: samples.length,
  };
}

function timing(sample, key) {
  const measurement = sample?.measurements.find((item) => item.key === key);
  return measurement?.status === "measured"
    ? { reason: null, status: "measured", value: measurement.value }
    : {
        reason: measurement?.reason ?? "No recorded measurement",
        status: measurement?.status ?? "unknown",
        value: null,
      };
}

export function interactions(envelope, fixtureId) {
  return Object.fromEntries(
    ["accept", "reject", "save"].map((flow) => {
      const sample = envelope.samples.find(
        (item) => item.fixtureId === fixtureId && item.scenarioId === flow
      );
      const probe = sample?.diagnostics?.followupProbe;
      const first = timing(sample, "action.input-to-next-paint");
      const followup = timing(probe, "action.followup-input-to-next-paint");
      return [
        flow,
        {
          failures: sample?.failures ?? [],
          followupFailures: probe?.failures ?? [],
          followupInputToNextPaint: followup.value,
          followupOffsetMs: sample?.diagnostics?.followupOffsetMs ?? null,
          followupReason: followup.reason,
          followupStatus: followup.status,
          followupVisit: probe?.status ?? null,
          inputToNextPaint: first.value,
          reason: first.reason,
          sampleId: sample?.id ?? null,
          status: first.status,
          visit: sample?.status ?? null,
        },
      ];
    })
  );
}
