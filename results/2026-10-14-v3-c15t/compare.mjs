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
const median = (m) => m?.median ?? null;

function load(root, fw) {
  const dir = path.join(root, `${fw}-load`);
  if (!existsSync(dir)) {
    return null;
  }
  const attempt = lastAttempt(dir);
  const report = read(path.join(attempt, "report/stdout.json"));
  const groups = Object.fromEntries(
    report.groups.map((g) => [g.baseline ? "baseline" : "c15t", g])
  );
  const metric = (arm, key) => median(groups[arm]?.metrics[key]);
  const compare = (name) => {
    const f = path.join(attempt, `compare-${name}/stdout.json`);
    if (!existsSync(f)) {
      return null;
    }
    const c = read(f).comparisons?.[0];
    if (!c) {
      return null;
    }
    return {
      conclusion: c.paired?.conclusion ?? null,
      delta: c.paired?.medianDifference ?? null,
      eligible: c.eligible,
      high: c.eligible ? (c.paired?.confidenceInterval?.high ?? null) : null,
      low: c.eligible ? (c.paired?.confidenceInterval?.low ?? null) : null,
      pairs: c.paired?.count ?? null,
      reasons: c.eligibilityReasons,
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
    attempts: groups.c15t?.correctness?.attempts ?? null,
    baseline: Object.fromEntries(keys.map((k) => [k, metric("baseline", k)])),
    baselinePassed: groups.baseline?.correctness?.verified ?? null,
    c15t: Object.fromEntries(keys.map((k) => [k, metric("c15t", k)])),
    cls: compare("page.cls"),
    lcp: compare("page.lcp"),
    passed: groups.c15t?.correctness?.verified ?? null,
    transfer: compare("initial.transfer"),
  };
}

function flows(root, fw) {
  const dir = path.join(root, `${fw}-correctness`);
  if (!existsSync(dir)) {
    return null;
  }
  const report = read(path.join(lastAttempt(dir), "report/stdout.json"));
  const out = {
    attempts: 0,
    baselineAttempts: 0,
    baselinePassed: 0,
    inp: {},
    passed: 0,
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
    if (["accept", "reject", "save"].includes(g.scenarioId)) {
      out.inp[g.scenarioId] = median(m);
    }
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
      spec.flows === spec.load ? undefined : conditions(spec.flows),
    frameworks: Object.fromEntries(
      FRAMEWORKS.map((fw) => [
        fw,
        { flows: flows(spec.flows, fw), load: load(spec.load, fw) },
      ])
    ),
  };
}
process.stdout.write(JSON.stringify(result, null, 2));
