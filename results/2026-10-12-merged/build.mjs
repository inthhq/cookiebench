import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  comparisonsFor,
  competitorRun,
  entryName,
  fileHash,
  frameworks,
  here,
  interactions,
  pairedMetrics,
  pairedValue,
  profiles,
  readJson,
  relative,
  runs,
  sourceFor,
  stats,
  writeJson,
} from "./sources.mjs";

const destination = process.argv[2] ? path.resolve(process.argv[2]) : here;
fs.mkdirSync(destination, { recursive: true });
const mobileValidationFile =
  "results/2026-10-11-alpha11-c15t/mobile/validation.json";
const mobileValidation = readJson(mobileValidationFile);
assert.equal(
  mobileValidation.originalIndexSha256,
  fileHash("results/2026-10-11-alpha11-c15t/mobile/index.json")
);
const csvHeader = [
  "profile",
  "framework",
  "framework_version",
  "product",
  "version",
  "run",
  "host",
  "passed",
  "visits",
  "sample_basis",
  "banner_ms",
  "ttfb_ms",
  "fcp_ms",
  "lcp_ms",
  "blocking_ms",
  "cls",
  "transfer_bytes",
  "requests",
  "third_party_requests",
  "document_bytes",
  "baseline_fcp_ms",
  "baseline_lcp_ms",
  "baseline_transfer_bytes",
  "lcp_added_ms",
  "lcp_added_low",
  "lcp_added_high",
  "lcp_conclusion",
  "transfer_added_bytes",
  "transfer_added_low",
  "transfer_added_high",
  "flow_load",
  "flow_accept",
  "flow_reject",
  "flow_save",
  ...["accept", "reject", "save"].flatMap((flow) => [
    `${flow}_input_to_next_paint_ms`,
    `${flow}_input_to_next_paint_status`,
  ]),
  "failure_reasons",
  "vendor_timing",
  "baseline_ttfb_ms",
  "ttfb_added_ms",
  "ttfb_added_low",
  "ttfb_added_high",
  "ttfb_conclusion",
  "fcp_added_ms",
  "fcp_added_low",
  "fcp_added_high",
  "fcp_conclusion",
  ...["accept", "reject", "save"].flatMap((flow) => [
    `${flow}_followup_input_to_next_paint_ms`,
    `${flow}_followup_input_to_next_paint_status`,
    `${flow}_visit`,
    `${flow}_followup_visit`,
  ]),
  "load_envelope",
  "correctness_envelope",
  "load_cpu",
  "correctness_cpu",
  "load_collector_hash",
  "correctness_collector_hash",
  "lcp_eligible",
  "lcp_eligibility_reasons",
  "lcp_ci_family",
  "lcp_ci_family_size",
  "ttfb_fcp_ci_family",
  "ttfb_fcp_ci_family_size",
];
const csv = [csvHeader];

function correctnessSummary(source, fixtureId) {
  return source.entry.details.cells
    .filter((cell) => cell.fixtureId === fixtureId || cell.baseline)
    .map((cell) => ({
      attempts: cell.attempts,
      baseline: cell.baseline,
      correctness: cell.correctness,
      failed: cell.failed,
      failures: cell.failures,
      fixtureId: cell.fixtureId,
      incomplete: cell.incomplete,
      passed: cell.passed,
      scenario: cell.scenarioId,
    }));
}

function makeRow(original, load, correctness, comparisons, alpha11) {
  const fixture = alpha11
    ? load.envelope.fixtures.find((item) => !item.baseline)
    : load.envelope.fixtures.find((item) => item.id === original.fixtureId);
  assert.ok(fixture);
  const base = load.envelope.fixtures.find((item) => item.baseline);
  const loadStats = stats(load.envelope, fixture.id);
  const baseline = { fixtureId: base.id, ...stats(load.envelope, base.id) };
  const paired = {};
  const comparisonEvidence = {};
  for (const [metric, { analysis, file, sha256 }] of Object.entries(
    comparisons
  )) {
    const comparison = analysis.comparisons.find(
      (item) => item.candidateFixtureId === fixture.id
    );
    assert.ok(comparison, `Missing comparison: ${file} ${fixture.id}`);
    assert.equal(comparison.baselineFixtureId, base.id);
    if (pairedMetrics.includes(metric)) {
      paired[metric] = pairedValue(comparison);
    }
    comparisonEvidence[metric] = {
      analysisVersion: analysis.analysisVersion,
      baseline: comparison.baseline,
      candidate: comparison.candidate,
      eligibilityReasons: comparison.eligibilityReasons,
      eligible: comparison.eligible,
      file,
      multiplicity: analysis.multiplicity,
      sha256,
      sourceRunIds: analysis.sourceRunIds,
    };
  }
  const flows = Object.fromEntries(
    correctness.entry.details.capabilities
      .filter((capability) => capability.fixtureId === fixture.id)
      .map((capability) => [
        capability.capability.replace(/^consent-flow:/u, ""),
        capability.status,
      ])
  );
  if (!alpha11) {
    assert.deepEqual(
      loadStats.medians,
      original.medians,
      `Competitor medians changed: ${fixture.id}`
    );
    assert.deepEqual(baseline, original.baseline);
    assert.deepEqual(paired, original.paired);
    assert.deepEqual(flows, original.flows);
  }
  return {
    ...(alpha11
      ? {
          ...loadStats,
          baseline,
          fixtureId: fixture.id,
          flows,
          framework: original.framework,
          frameworkVersion: fixture.frameworkVersion,
          host: "local",
          paired,
          product: fixture.product,
          run: runs.alpha11.id,
          vendorTiming: "bundled",
          version: fixture.version,
        }
      : original),
    comparisonEvidence,
    correctnessChecks: correctnessSummary(correctness, fixture.id),
    integration: {
      artifactPolicy: fixture.artifactPolicy,
      configurationHash: fixture.configurationHash,
      deployment: fixture.deployment,
      mode: fixture.mode,
      provenance: fixture.provenance,
      revision: fixture.revision,
    },
    interactions: interactions(correctness.envelope, fixture.id),
    provenance: { correctness: correctness.provenance, load: load.provenance },
  };
}

for (const profile of profiles) {
  const previousFile = `results/2026-10-11-merged/matrix-${profile}.json`;
  const previous = readJson(previousFile);
  const output = {
    comparability:
      "c15t was measured on Apple M1 Pro/macOS; competitors on AMD Ryzen 7 2700/Linux. Each delta uses its own run and host baseline. Cross-source timing rankings and speedup claims are not established.",
    frameworks: {},
    generatedAt: new Date().toISOString(),
    interactionMetric:
      "Recorded action input-to-next-paint; one attempt per flow, not finalized INP. Missing Event Timing is unavailable, not zero or a proven sub-16 ms value.",
    previousMerge: { file: previousFile, sha256: fileHash(previousFile) },
    profile,
    runs,
    ...(profile === "mobile"
      ? {
          correctnessRepair: {
            file: mobileValidationFile,
            original: mobileValidation.original,
            retry: mobileValidation.retry,
            sha256: fileHash(mobileValidationFile),
          },
        }
      : {}),
  };
  for (const framework of frameworks) {
    const cache = new Map();
    const resolve = (run, product) => {
      const suffix = product === "cookie-yes" ? "-cookie-yes" : "";
      const key = `${run}${suffix}`;
      if (!cache.has(key)) {
        const load = sourceFor(
          run,
          profile,
          entryName(framework, product, "load")
        );
        const correctnessRun =
          run === "alpha11" && profile === "mobile"
            ? "alpha11Correctness"
            : run;
        const correctness = sourceFor(
          correctnessRun,
          profile,
          entryName(framework, product, "correctness")
        );
        cache.set(key, {
          comparisons: comparisonsFor(
            load,
            profile,
            entryName(framework, product, "load"),
            run === "alpha11"
          ),
          correctness,
          load,
        });
      }
      return cache.get(key);
    };
    const products = previous.frameworks[framework].products.map((original) => {
      const alpha11 = original.product === "c15t";
      const run = alpha11
        ? "alpha11"
        : competitorRun(framework, original.product);
      const { load, correctness, comparisons } = resolve(run, original.product);
      return makeRow(original, load, correctness, comparisons, alpha11);
    });
    assert.equal(products.length, 10);
    output.frameworks[framework] = {
      frameworkVersion: products[0].frameworkVersion,
      products,
    };
    for (const row of products) {
      const m = row.medians;
      const b = row.baseline.medians;
      const ix = row.interactions;
      const lcp = row.paired["page.lcp"];
      const transfer = row.paired["initial.transfer"];
      const ttfb = row.paired["page.ttfb"];
      const fcp = row.paired["page.fcp"];
      const lp = row.provenance.load;
      const cp = row.provenance.correctness;
      const le = row.comparisonEvidence["page.lcp"];
      const te = row.comparisonEvidence["page.ttfb"];
      csv.push([
        profile,
        framework,
        row.frameworkVersion,
        row.product,
        row.version,
        row.run,
        row.host,
        row.passed,
        row.visits,
        row.sampleBasis,
        m["banner.visible"],
        m["page.ttfb"],
        m["page.fcp"],
        m["page.lcp"],
        m["initial.long-task-blocking"],
        m["page.cls"],
        m["initial.transfer"],
        m["initial.requests"],
        m["initial.third-party-requests"],
        m["document.decoded-body"],
        b["page.fcp"],
        b["page.lcp"],
        b["initial.transfer"],
        lcp.medianDifference,
        lcp.ci?.[0],
        lcp.ci?.[1],
        lcp.conclusion,
        transfer.medianDifference,
        transfer.ci?.[0],
        transfer.ci?.[1],
        row.flows.load,
        row.flows.accept,
        row.flows.reject,
        row.flows.save,
        ...["accept", "reject", "save"].flatMap((flow) => [
          ix[flow].inputToNextPaint,
          ix[flow].status,
        ]),
        row.failureReasons
          .map((failure) => `${failure.message} (${failure.visits})`)
          .join("; "),
        row.vendorTiming,
        b["page.ttfb"],
        ttfb.medianDifference,
        ttfb.ci?.[0],
        ttfb.ci?.[1],
        ttfb.conclusion,
        fcp.medianDifference,
        fcp.ci?.[0],
        fcp.ci?.[1],
        fcp.conclusion,
        ...["accept", "reject", "save"].flatMap((flow) => [
          ix[flow].followupInputToNextPaint,
          ix[flow].followupStatus,
          ix[flow].visit,
          ix[flow].followupVisit,
        ]),
        lp.envelopeFile,
        cp.envelopeFile,
        lp.measurementConditions.host.cpu,
        cp.measurementConditions.host.cpu,
        lp.measurementConditions.collectorSourceHash,
        cp.measurementConditions.collectorSourceHash,
        le.eligible,
        le.eligibilityReasons.join("; "),
        le.multiplicity.family,
        le.multiplicity.comparisons,
        te.multiplicity.family,
        te.multiplicity.comparisons,
      ]);
    }
  }
  writeJson(path.join(destination, `matrix-${profile}.json`), output);
}
assert.equal(csv.length - 1, 120);
const csvCell = (value) => {
  const text =
    value === null || value === undefined
      ? ""
      : String(
          typeof value === "number" ? Math.round(value * 1000) / 1000 : value
        );
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
fs.writeFileSync(
  path.join(destination, "matrix.csv"),
  `${csv
    .map((row) => {
      assert.equal(row.length, csvHeader.length);
      return row.map(csvCell).join(",");
    })
    .join("\n")}\n`
);
console.log(`Wrote 120 rows to ${relative(destination)}`);
