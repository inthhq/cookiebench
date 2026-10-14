import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const FRAMEWORKS = [
  "react",
  "nextjs",
  "tanstack-start",
  "nuxt",
  "astro",
  "script",
];
const read = (f) => JSON.parse(readFileSync(f, "utf-8"));
const lastAttempt = (dir) => {
  const attempts = readdirSync(dir)
    .filter((d) => d.startsWith("attempt-"))
    .toSorted();
  return path.join(dir, attempts.at(-1));
};
const median = (m) => (m && m.median != null ? m.median : null);

function load(root, fw) {
  const dir = path.join(root, `${fw}-load`);
  if (!existsSync(dir)) return null;
  const attempt = lastAttempt(dir);
  const report = read(path.join(attempt, "report/stdout.json"));
  const groups = Object.fromEntries(
    report.groups.map((g) => [g.baseline ? "baseline" : "c15t", g])
  );
  const metric = (arm, key) => median(groups[arm]?.metrics[key]);
  const compare = (name) => {
    const f = path.join(attempt, `compare-${name}/stdout.json`);
    if (!existsSync(f)) return null;
    const c = read(f).comparisons?.[0];
    if (!c) return null;
    return {
      eligible: c.eligible,
      reasons: c.eligibilityReasons,
      delta: c.paired?.medianDifference ?? null,
      low: c.eligible ? (c.paired?.confidenceInterval?.low ?? null) : null,
      high: c.eligible ? (c.paired?.confidenceInterval?.high ?? null) : null,
      conclusion: c.paired?.conclusion ?? null,
      pairs: c.paired?.count ?? null,
    };
  };
  const keys = [
    "page.lcp",
    "page.fcp",
    "page.ttfb",
    "page.primary-content-paint",
    "page.cls",
    "banner.visible",
    "initial.transfer",
    "initial.requests",
    "initial.long-task-blocking",
  ];
  return {
    passed: groups.c15t?.correctness?.verified ?? null,
    attempts: groups.c15t?.correctness?.attempts ?? null,
    baselinePassed: groups.baseline?.correctness?.verified ?? null,
    baseline: Object.fromEntries(keys.map((k) => [k, metric("baseline", k)])),
    c15t: Object.fromEntries(keys.map((k) => [k, metric("c15t", k)])),
    lcp: compare("page.lcp"),
    transfer: compare("initial.transfer"),
    cls: compare("page.cls"),
  };
}

function flows(root, fw) {
  const dir = path.join(root, `${fw}-correctness`);
  if (!existsSync(dir)) return null;
  const report = read(path.join(lastAttempt(dir), "report/stdout.json"));
  const out = {
    passed: 0,
    attempts: 0,
    baselinePassed: 0,
    baselineAttempts: 0,
    inp: {},
  };
  for (const g of report.groups) {
    const c = g.correctness;
    if (g.baseline) {
      out.baselinePassed += c.verified;
      out.baselineAttempts += c.attempts;
      continue;
    }
    out.passed += c.verified;
    out.attempts += c.attempts;
    const m = g.metrics["action.input-to-next-paint"];
    if (["accept", "reject", "save"].includes(g.scenarioId))
      out.inp[g.scenarioId] = median(m);
  }
  return out;
}

function conditions(root) {
  const index = read(path.join(root, "index.json"));
  return {
    complete: index.complete,
    completedAt: index.completedAt,
    ...index.measurementConditions,
  };
}

const runs = JSON.parse(process.argv[2]);
const result = {};
for (const [name, spec] of Object.entries(runs)) {
  result[name] = {
    conditions: conditions(spec.load),
    flowConditions:
      spec.flows !== spec.load ? conditions(spec.flows) : undefined,
    frameworks: Object.fromEntries(
      FRAMEWORKS.map((fw) => [
        fw,
        { load: load(spec.load, fw), flows: flows(spec.flows, fw) },
      ])
    ),
  };
}
process.stdout.write(JSON.stringify(result, null, 2));
