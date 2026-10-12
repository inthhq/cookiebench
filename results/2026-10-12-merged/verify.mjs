import assert from "node:assert/strict";
import path from "node:path";

import {
  fileHash,
  frameworks,
  here,
  interactions,
  pairedMetrics,
  pairedValue,
  profiles,
  readJson,
  sourceFor,
  stats,
  writeJson,
} from "./sources.mjs";

const receipt = {
  profiles: {},
  rawHashesChecked: 0,
  retainedCompetitorRows: 0,
  updatedC15tRows: 0,
};
const sourceCache = new Map();
const getSource = (provenance) => {
  const key = provenance.envelopeFile;
  if (!sourceCache.has(key)) {
    assert.equal(fileHash(provenance.indexFile), provenance.indexSha256);
    assert.equal(fileHash(key), provenance.envelopeSha256);
    const envelope = readJson(key);
    assert.equal(envelope.manifest.id, provenance.manifestId);
    assert.equal(
      envelope.manifest.environment.collectorSourceHash,
      provenance.measurementConditions.collectorSourceHash
    );
    assert.deepEqual(envelope.manifest.profile, provenance.profile);
    sourceCache.set(key, envelope);
    receipt.rawHashesChecked += 1;
  }
  return sourceCache.get(key);
};

function assertClean(samples) {
  for (const sample of samples) {
    assert.equal(sample.status, "passed");
    assert.equal(sample.failures.length, 0);
    assert.deepEqual(sample.diagnostics.browserErrors, []);
    assert.equal(sample.diagnostics.networkCoverage.complete, true);
    assert.ok(
      !sample.diagnostics.serverEvents.some((event) =>
        /cold|encod/iu.test(event.type ?? event.kind ?? "")
      )
    );
  }
}

for (const profile of profiles) {
  const matrix = readJson(path.join(here, `matrix-${profile}.json`));
  const previous = readJson(matrix.previousMerge.file);
  assert.equal(
    fileHash(matrix.previousMerge.file),
    matrix.previousMerge.sha256
  );
  assert.deepEqual(Object.keys(matrix.frameworks), frameworks);
  const count = {
    c15tCorrectnessAttempts: 0,
    c15tFollowups: 0,
    c15tLoadAttempts: 0,
    competitorIncompleteActionBaselines: 0,
    rows: 0,
    withheldLcpIntervals: 0,
  };
  const baselineSources = new Set();
  for (const framework of frameworks) {
    const rows = matrix.frameworks[framework].products;
    assert.equal(rows.length, 10);
    assert.equal(new Set(rows.map((row) => row.product)).size, 10);
    assert.equal(rows.filter((row) => row.product === "c15t").length, 1);
    for (const row of rows) {
      count.rows += 1;
      const load = getSource(row.provenance.load);
      const correctness = getSource(row.provenance.correctness);
      const fixture = load.fixtures.find((item) => item.id === row.fixtureId);
      assert.equal(fixture.product, row.product);
      assert.equal(fixture.version, row.version);
      assert.equal(fixture.frameworkVersion, row.frameworkVersion);
      assert.deepEqual(stats(load, row.fixtureId), {
        failureReasons: row.failureReasons,
        medians: row.medians,
        passed: row.passed,
        sampleBasis: row.sampleBasis,
        visits: row.visits,
      });
      assert.deepEqual(stats(load, row.baseline.fixtureId), {
        failureReasons: row.baseline.failureReasons,
        medians: row.baseline.medians,
        passed: row.baseline.passed,
        sampleBasis: row.baseline.sampleBasis,
        visits: row.baseline.visits,
      });
      assert.deepEqual(
        interactions(correctness, row.fixtureId),
        row.interactions
      );
      for (const metric of pairedMetrics) {
        const evidence = row.comparisonEvidence[metric];
        assert.equal(fileHash(evidence.file), evidence.sha256);
        const analysis = readJson(evidence.file);
        const comparison = analysis.comparisons.find(
          (item) => item.candidateFixtureId === row.fixtureId
        );
        assert.equal(comparison.baselineFixtureId, row.baseline.fixtureId);
        assert.equal(comparison.scenarioId, "load");
        assert.deepEqual(analysis.sourceRunIds, [load.manifest.id]);
        assert.deepEqual(analysis.multiplicity, evidence.multiplicity);
        assert.deepEqual(pairedValue(comparison), row.paired[metric]);
        assert.equal(comparison.eligible, evidence.eligible);
        assert.deepEqual(
          comparison.eligibilityReasons,
          evidence.eligibilityReasons
        );
        if (!comparison.eligible) {
          assert.equal(row.paired[metric].ci, null);
        }
      }
      if (row.paired["page.lcp"].ci === null) {
        count.withheldLcpIntervals += 1;
      }
      if (row.product === "c15t") {
        receipt.updatedC15tRows += 1;
        assert.equal(row.version, "3.0.0-alpha.11");
        assert.equal(
          row.provenance.load.measurementConditions.host.cpu,
          "Apple M1 Pro"
        );
        assert.equal(
          row.provenance.load.measurementConditions.collectorSourceHash,
          "c2520e37a4b74af246fe893d06281c9b40aa24bfe76c475664f16aed8363623a"
        );
        assert.equal(
          row.provenance.correctness.measurementConditions.collectorSourceHash,
          profile === "mobile"
            ? "f359851e4f7b15d549e882d641cd3205f71af1a18aebd8f02f4fc5b2eb21eb1d"
            : row.provenance.load.measurementConditions.collectorSourceHash
        );
        assert.ok(
          row.provenance.correctness.envelopeFile.includes(
            profile === "mobile" ? "/mobile-correctness-retry/" : "/desktop/"
          )
        );
        assertClean(load.samples);
        assertClean(correctness.samples);
        const probes = correctness.samples.flatMap((sample) =>
          sample.diagnostics.followupProbe
            ? [sample.diagnostics.followupProbe]
            : []
        );
        assertClean(probes);
        count.c15tLoadAttempts += load.samples.length;
        count.c15tCorrectnessAttempts += correctness.samples.length;
        count.c15tFollowups += probes.length;
        for (const scenario of ["load", "accept", "reject", "save"]) {
          assert.equal(row.flows[scenario], "verified");
        }
        for (const metric of [
          "page.ttfb",
          "page.fcp",
          "page.lcp",
          "page.primary-content-paint",
          "page.cls",
          "initial.transfer",
        ]) {
          assert.equal(row.comparisonEvidence[metric].eligible, true);
          assert.equal(row.paired[metric].pairs, 15);
          const samples = load.samples.filter(
            (sample) => sample.scenarioId === "load"
          );
          const pairs = new Map();
          for (const sample of samples) {
            pairs.set(sample.pairId, [
              ...(pairs.get(sample.pairId) ?? []),
              sample,
            ]);
          }
          assert.equal(pairs.size, 15);
          for (const pair of pairs.values()) {
            assert.equal(pair.length, 2);
            assert.equal(
              new Set(pair.map((sample) => sample.fixtureId)).size,
              2
            );
          }
        }
        assert.equal(
          row.comparisonEvidence["initial.encoded-body"].eligible,
          false
        );
        if (framework === "nuxt") {
          assert.equal(
            row.comparisonEvidence["initial.decoded-body"].eligible,
            false
          );
        }
        const summary = readJson(
          `results/2026-10-11-alpha11-c15t/${profile}/summary.json`
        ).rows.find((item) => item.framework === framework);
        assert.equal(summary.lcpMs, row.medians["page.lcp"]);
        assert.equal(summary.baselineLcpMs, row.baseline.medians["page.lcp"]);
        assert.equal(
          summary.lcpPairedDeltaMs,
          row.paired["page.lcp"].medianDifference
        );
        assert.equal(summary.bannerVisibleMs, row.medians["banner.visible"]);
        assert.equal(
          summary.transferPairedDeltaBytes,
          row.paired["initial.transfer"].medianDifference
        );
      } else {
        receipt.retainedCompetitorRows += 1;
        const old = previous.frameworks[framework].products.find(
          (item) => item.product === row.product
        );
        for (const field of [
          "frameworkVersion",
          "version",
          "fixtureId",
          "run",
          "host",
          "vendorTiming",
          "visits",
          "passed",
          "sampleBasis",
          "failureReasons",
          "medians",
          "baseline",
          "paired",
          "flows",
        ]) {
          assert.deepEqual(row[field], old[field]);
        }
        for (const flow of ["accept", "reject", "save"]) {
          for (const field of [
            "inputToNextPaint",
            "followupInputToNextPaint",
            "followupOffsetMs",
            "visit",
          ]) {
            assert.deepEqual(
              row.interactions[flow][field],
              old.interactions[flow][field]
            );
          }
        }
        assert.equal(
          row.provenance.load.measurementConditions.host.cpu,
          "AMD Ryzen 7 2700 Eight-Core Processor"
        );
        if (framework === "nextjs" && row.product === "cookie-yes") {
          assert.equal(row.vendorTiming, "after-hydration");
        }
        if (!baselineSources.has(row.provenance.correctness.envelopeFile)) {
          baselineSources.add(row.provenance.correctness.envelopeFile);
          const baselineId = correctness.fixtures.find(
            (item) => item.baseline
          ).id;
          count.competitorIncompleteActionBaselines +=
            correctness.samples.filter(
              (sample) =>
                sample.fixtureId === baselineId &&
                sample.scenarioId !== "load" &&
                sample.status === "incomplete"
            ).length;
        }
      }
    }
    sourceCache.clear();
  }
  assert.equal(count.rows, 60);
  assert.equal(count.c15tLoadAttempts, 180);
  assert.equal(count.c15tCorrectnessAttempts, 48);
  assert.equal(count.c15tFollowups, 18);
  assert.equal(
    count.competitorIncompleteActionBaselines,
    profile === "mobile" ? 36 : 0
  );
  receipt.profiles[profile] = count;
}

let originalMobileIncompleteBaselines = 0;
for (const framework of frameworks) {
  const { envelope } = sourceFor(
    "alpha11",
    "mobile",
    `${framework}-correctness`
  );
  const baselineId = envelope.fixtures.find((fixture) => fixture.baseline).id;
  const incomplete = envelope.samples.filter(
    (sample) => sample.status === "incomplete"
  );
  assert.equal(incomplete.length, 3);
  assert.ok(
    incomplete.every(
      (sample) =>
        sample.fixtureId === baselineId && sample.scenarioId !== "load"
    )
  );
  originalMobileIncompleteBaselines += incomplete.length;
}
assert.equal(originalMobileIncompleteBaselines, 18);
receipt.originalMobileIncompleteBaselines = originalMobileIncompleteBaselines;
assert.equal(receipt.retainedCompetitorRows, 108);
assert.equal(receipt.updatedC15tRows, 12);
writeJson(path.join(here, "validation.json"), {
  validatedAt: new Date().toISOString(),
  ...receipt,
});
console.log(JSON.stringify(receipt, null, 2));
