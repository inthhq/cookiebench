// Usage: node results/2026-10-14/paired.mjs
//        node results/2026-10-14/build.mjs
// Builds the October 14 matrix from the sandbox batches alone. Every row keeps
// its own entry's no-CMP baseline; CookieYes keeps its registered-host one.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  auditMetrics,
  comparisonsFor,
  entryName,
  fileHash,
  frameworks,
  here,
  indexFor,
  interactions,
  pairedMetrics,
  pairedValue,
  profiles,
  readJson,
  relative,
  run,
  sourceFor,
  stats,
  writeJson,
} from "./sources.mjs";

const csvHeader = [
  "profile",
  "framework",
  "framework_version",
  "product",
  "version",
  "host",
  "load_cpu_slowdown",
  "correctness_cpu_slowdown",
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
  "baseline_ttfb_ms",
  "baseline_fcp_ms",
  "baseline_lcp_ms",
  "baseline_transfer_bytes",
  ...["ttfb", "fcp", "lcp"].flatMap((metric) => [
    `${metric}_added_ms`,
    `${metric}_added_low`,
    `${metric}_added_high`,
    `${metric}_conclusion`,
  ]),
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
    `${flow}_followup_input_to_next_paint_ms`,
    `${flow}_followup_input_to_next_paint_status`,
    `${flow}_visit`,
    `${flow}_followup_visit`,
  ]),
  "failure_reasons",
  "vendor_timing",
  "load_envelope",
  "correctness_envelope",
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

function vendorTiming(fixture) {
  if (fixture.product === "c15t") {
    return "bundled";
  }
  return fixture.revision.endsWith("-after-hydration")
    ? "after-hydration"
    : "head";
}

function makeRow(framework, fixture, load, correctness, comparisons) {
  const base = load.envelope.fixtures.find((item) => item.baseline);
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
  // Identity first, evidence after, matching the October 12 rows.
  // oxlint-disable-next-line sort-keys
  return {
    framework,
    frameworkVersion: fixture.frameworkVersion,
    product: fixture.product,
    version: fixture.version,
    fixtureId: fixture.id,
    run: run.id,
    host: fixture.product === "cookie-yes" ? "registered-host" : "local",
    vendorTiming: vendorTiming(fixture),
    ...stats(load.envelope, fixture.id),
    baseline: { fixtureId: base.id, ...stats(load.envelope, base.id) },
    paired,
    flows,
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

const validation = { checks: [], profiles: {} };
for (const profile of profiles) {
  const { index, file: indexFile, hash: indexSha256 } = indexFor(profile);
  const output = {
    comparability:
      "Every row ran on the same Vercel Sandbox type (Intel Xeon @ 2.90GHz, 8 vCPUs, Linux), one sandbox per batch entry. Each delta uses its own entry's no-CMP baseline. Absolute timings vary between sandboxes, so compare each CMP with its paired baseline, not raw medians across frameworks.",
    cpu:
      profile === "mobile"
        ? "Calibrated to Chrome's mid-tier phone on each sandbox; each entry records its own rate."
        : "No CPU slowdown.",
    frameworks: {},
    generatedAt: new Date().toISOString(),
    index: { file: indexFile, sha256: indexSha256 },
    interactionMetric:
      "Recorded action input-to-next-paint; one attempt per flow, not finalized INP. Missing Event Timing is unavailable, not zero or a proven sub-16 ms value.",
    measurementConditions: index.measurementConditions,
    profile,
    run,
  };
  const counts = { c15tCorrectness: 0, c15tLoad: [0, 0], rows: 0 };
  for (const framework of frameworks) {
    const products = [];
    for (const product of ["c15t", "cookie-yes"]) {
      const loadId = entryName(framework, product, "load");
      const load = sourceFor(profile, loadId);
      const correctness = sourceFor(
        profile,
        entryName(framework, product, "correctness")
      );
      assert.deepEqual(
        load.envelope.fixtures.map((fixture) => fixture.id),
        correctness.envelope.fixtures.map((fixture) => fixture.id)
      );
      const comparisons = comparisonsFor(load, profile, loadId);
      for (const fixture of load.envelope.fixtures.filter(
        (item) => !item.baseline
      )) {
        products.push(
          makeRow(framework, fixture, load, correctness, comparisons)
        );
      }
    }
    // c15t first, then competitors as the matrix lists them, CookieYes last.
    assert.equal(products[0].product, "c15t");
    assert.equal(products.length, 10);
    output.frameworks[framework] = {
      frameworkVersion: products[0].frameworkVersion,
      products,
    };
    const [c15t] = products;
    assert.equal(c15t.version, "3.0.0");
    counts.c15tLoad[0] += c15t.passed;
    counts.c15tLoad[1] += c15t.visits;
    counts.c15tCorrectness += ["load", "accept", "reject", "save"].filter(
      (flow) => c15t.flows[flow] === "verified"
    ).length;
    for (const row of products) {
      counts.rows += 1;
      const m = row.medians;
      const b = row.baseline.medians;
      const ix = row.interactions;
      const transfer = row.paired["initial.transfer"];
      const le = row.comparisonEvidence["page.lcp"];
      const te = row.comparisonEvidence["page.ttfb"];
      csv.push([
        profile,
        framework,
        row.frameworkVersion,
        row.product,
        row.version,
        row.host,
        row.provenance.load.cpuSlowdown,
        row.provenance.correctness.cpuSlowdown,
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
        b["page.ttfb"],
        b["page.fcp"],
        b["page.lcp"],
        b["initial.transfer"],
        ...["page.ttfb", "page.fcp", "page.lcp"].flatMap((metric) => {
          const value = row.paired[metric];
          return [
            value.medianDifference,
            value.ci?.[0],
            value.ci?.[1],
            value.conclusion,
          ];
        }),
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
          ix[flow].followupInputToNextPaint,
          ix[flow].followupStatus,
          ix[flow].visit,
          ix[flow].followupVisit,
        ]),
        row.failureReasons
          .map((failure) => `${failure.message} (${failure.visits})`)
          .join("; "),
        row.vendorTiming,
        row.provenance.load.envelopeFile,
        row.provenance.correctness.envelopeFile,
        le.eligible,
        le.eligibilityReasons.join("; "),
        le.multiplicity.family,
        le.multiplicity.comparisons,
        te.multiplicity.family,
        te.multiplicity.comparisons,
      ]);
    }
  }
  assert.equal(counts.rows, 60);
  writeJson(path.join(here, `matrix-${profile}.json`), output);

  // The reference audit ran as its own batch after a runner fix, so it has
  // its own collector hash. It compares the minimal and full collectors on a
  // page with no CMP.
  const reference = sourceFor(`${profile}-reference`, "reference-overhead");
  const audit = Object.fromEntries(
    auditMetrics.map((metric) => {
      const file = `${path.dirname(reference.entry.envelopeFile)}/compare-${metric}/stdout.json`;
      const [comparison] = readJson(file).comparisons;
      return [
        metric,
        {
          file,
          full: comparison.candidate.median,
          minimal: comparison.baseline.median,
          paired: pairedValue(comparison),
          sha256: fileHash(file),
        },
      ];
    })
  );
  writeJson(path.join(here, `reference-overhead-${profile}.json`), {
    audit,
    cpuSlowdown: reference.provenance.cpuSlowdown,
    note: "Minimal versus full collector on the reference page without a CMP. Report separately; do not subtract it from CMP timings.",
    provenance: reference.provenance,
  });

  assert.deepEqual(
    index.results
      .filter((entry) => entry.status !== "recorded")
      .map((entry) => entry.id),
    ["reference-overhead"]
  );
  validation.profiles[profile] = {
    c15tCorrectnessVerified: `${counts.c15tCorrectness}/${frameworks.length * 4}`,
    c15tLoadPassed: `${counts.c15tLoad[0]}/${counts.c15tLoad[1]}`,
    cpuSlowdowns: [
      ...new Set(
        index.results
          .filter((entry) => entry.status === "recorded")
          .map((entry) => readJson(entry.envelopeFile).manifest.profile)
          .map((item) => item.cpuSlowdown ?? 1)
      ),
    ].toSorted((a, b) => a - b),
    entries: index.results.length,
    executionErrors: index.results
      .filter((entry) => entry.status !== "recorded")
      .map((entry) => entry.id),
    index: { file: indexFile, sha256: indexSha256 },
    referenceCpuSlowdown: reference.provenance.cpuSlowdown,
    rows: counts.rows,
  };
  validation.checks.push(
    `${profile}: index complete, every load and flow entry recorded (the main-batch reference-overhead audit is replaced by ${profile}-reference), every envelope hash and collector hash match the index`
  );
}
writeJson(path.join(here, "validation.json"), validation);

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
  path.join(here, "matrix.csv"),
  `${csv
    .map((row) => {
      assert.equal(row.length, csvHeader.length);
      return row.map(csvCell).join(",");
    })
    .join("\n")}\n`
);
console.log(`Wrote ${csv.length - 1} rows to ${relative(here)}`);
