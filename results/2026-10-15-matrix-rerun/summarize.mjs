/**
 * Reads the recorded matrix batches and prints one row per CMP, framework and
 * profile. It starts no browsers; every value comes from a batch report or
 * comparison already on disk.
 *
 *   node results/2026-10-15-matrix-rerun/summarize.mjs > results/2026-10-15-matrix-rerun/summary.json
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname);
const read = (file) => JSON.parse(readFileSync(file, "utf-8"));
const lastAttempt = (directory) =>
  path.join(
    directory,
    readdirSync(directory)
      .filter((name) => name.startsWith("attempt-"))
      .toSorted()
      .at(-1)
  );
const median = (metric) => metric?.median ?? null;
// The script tag's c15t fixture is `script-tag-c15t-inth-init`.
const product = (fixture) =>
  fixture
    .replace(/^(?:script-tag|react|nextjs|nuxt|astro|tanstack-start)-/u, "")
    .replace(/^c15t-.*$/u, "c15t");
const framework = (entry) =>
  entry.replace(/(?:-cookie-yes)?-(?:load|correctness)$/u, "");

const loadKeys = [
  "banner.visible",
  "initial.long-task-blocking",
  "initial.transfer",
  "page.cls",
  "page.fcp",
  "page.lcp",
];
const compared = ["page.lcp", "initial.transfer", "page.primary-content-paint"];

function comparison(attempt, metric, fixture) {
  const file = path.join(attempt, `compare-${metric}`, "stdout.json");
  if (!existsSync(file)) {
    return null;
  }
  const found = read(file).comparisons?.find(
    (entry) => entry.candidateFixtureId === fixture
  );
  if (!found) {
    return null;
  }
  const interval = found.eligible ? found.paired?.confidenceInterval : null;
  return {
    conclusion: found.paired?.conclusion ?? null,
    delta: found.paired?.medianDifference ?? null,
    eligibilityReasons: found.eligibilityReasons,
    eligible: found.eligible,
    high: interval?.high ?? null,
    low: interval?.low ?? null,
  };
}

function flowStatus({ attempts, failed, verified }) {
  if (verified === attempts) {
    return "verified";
  }
  return failed > 0 ? "failed" : "unknown";
}

function flowCells(report) {
  return report.groups
    .filter((group) => !group.baseline)
    .map((group) => [
      group,
      {
        inputToNextPaint: median(group.metrics["action.input-to-next-paint"]),
        reasons: group.correctness.reasons,
        status: flowStatus(group.correctness),
      },
    ]);
}

function profileRows(profile) {
  const directory = path.join(root, profile);
  const index = read(path.join(directory, "index.json"));
  const rows = new Map();
  const row = (fixture, entry) => {
    const key = fixture;
    if (!rows.has(key)) {
      rows.set(key, {
        fixture,
        flows: null,
        framework: framework(entry),
        load: null,
        product: product(fixture),
        profile,
      });
    }
    return rows.get(key);
  };
  for (const result of index.results) {
    if (result.kind === "audit") {
      continue;
    }
    const attempt = lastAttempt(path.join(directory, result.id));
    const report = read(path.join(attempt, "report", "stdout.json"));
    if (result.kind === "load") {
      const baseline = report.groups.find((group) => group.baseline);
      for (const group of report.groups.filter((entry) => !entry.baseline)) {
        row(group.fixtureId, result.id).load = {
          baseline: Object.fromEntries(
            loadKeys.map((key) => [key, median(baseline.metrics[key])])
          ),
          baselineFixture: baseline.fixtureId,
          comparisons: Object.fromEntries(
            compared.map((metric) => [
              metric,
              comparison(attempt, metric, group.fixtureId),
            ])
          ),
          correctness: group.correctness,
          medians: Object.fromEntries(
            loadKeys.map((key) => [key, median(group.metrics[key])])
          ),
        };
      }
    } else {
      for (const [group, cell] of flowCells(report)) {
        const target = row(group.fixtureId, result.id);
        target.flows ??= {};
        target.flows[group.scenarioId] = cell;
      }
    }
  }
  // A retry reruns a flows entry with the same config. The original cell stays
  // as recorded; the retry's cell sits beside it.
  for (const retry of readdirSync(root).filter(
    (name) => name.startsWith(`${profile}-`) && name.endsWith("-retry")
  )) {
    const retryIndex = read(path.join(root, retry, "index.json"));
    for (const result of retryIndex.results) {
      const attempt = lastAttempt(path.join(root, retry, result.id));
      const report = read(path.join(attempt, "report", "stdout.json"));
      for (const [group, cell] of flowCells(report)) {
        const original = rows.get(group.fixtureId)?.flows?.[group.scenarioId];
        if (original) {
          original.retry = { directory: retry, ...cell };
        }
      }
    }
  }
  return {
    conditions: {
      comparisonFamily: index.comparisonFamily,
      completedAt: index.completedAt,
      ...index.measurementConditions,
    },
    rows: [...rows.values()],
  };
}

const profiles = ["desktop", "mobile"].filter((profile) =>
  existsSync(path.join(root, profile, "index.json"))
);
process.stdout.write(
  `${JSON.stringify(
    Object.fromEntries(
      profiles.map((profile) => [profile, profileRows(profile)])
    ),
    null,
    2
  )}\n`
);
