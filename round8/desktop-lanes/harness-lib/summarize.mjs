// Compact table from a bench output dir: CookieBench envelope + compare
// outputs, then the waterfall and HTML notes from waterfall.mjs.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const out = process.argv[2];
const read = (f) => JSON.parse(readFileSync(path.join(out, f), "utf8"));
const env = read("envelope.json");
const meta = readFileSync(path.join(out, "meta.txt"), "utf8");
const arms = { control: "nextjs-baseline", candidate: "nextjs-c15t" };
const keys = ["initial.transfer", "initial.requests", "page.fcp", "page.lcp", "banner.visible"];
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmt = (v) => (v == null ? "n/a" : Math.round(v).toLocaleString("en-US"));
const values = {};
const counts = {};
for (const [arm, id] of Object.entries(arms)) {
  const samples = env.samples.filter((s) => s.fixtureId === id && s.scenarioId === "load");
  counts[arm] = { total: samples.length, passed: samples.filter((s) => s.status === "passed").length };
  values[arm] = Object.fromEntries(
    keys.map((k) => [
      k,
      samples
        .map((s) => s.measurements.find((m) => m.key === k))
        .filter((m) => m && m.status === "measured" && typeof m.value === "number")
        .map((m) => m.value),
    ])
  );
}
const lines = [];
lines.push(`## CookieBench (mobile-article-v1, load)`, "");
lines.push("```", meta.trim(), "```", "");
lines.push(
  `Samples: control ${counts.control.passed}/${counts.control.total} passed, candidate ${counts.candidate.passed}/${counts.candidate.total} passed. Source: CookieBench envelope (\`envelope.json\`), medians per arm.`,
  ""
);
const controlFcp = median(values.control["page.fcp"]);
if (controlFcp != null && controlFcp > 400) {
  lines.push(
    `> **Load warning:** control FCP median is ${fmt(controlFcp)} ms. On an idle machine it is 220–260 ms. The host was CPU-starved during this run; expect incomplete samples and wide intervals. Rerun when \`uptime\` load is lower.`,
    ""
  );
}
lines.push("| Metric | Control median | Candidate median | Candidate min–max |", "| --- | ---: | ---: | ---: |");
for (const k of keys) {
  const c = values.candidate[k];
  lines.push(
    `| ${k} | ${fmt(median(values.control[k]))} | ${fmt(median(c))} | ${c.length ? `${fmt(Math.min(...c))}–${fmt(Math.max(...c))}` : "n/a"} |`
  );
}
lines.push("", "Paired deltas from `cookiebench compare` (candidate − control, median of per-pair differences):", "");
lines.push("| Metric | Pairs | Median delta | Interval | Level | Conclusion |", "| --- | ---: | ---: | --- | ---: | --- |");
for (const k of ["page.lcp", "page.fcp", "initial.transfer", "initial.requests"]) {
  const f = path.join(out, `compare-${k}.json`);
  if (!existsSync(f)) continue;
  try {
    const c = JSON.parse(readFileSync(f, "utf8")).comparisons.find((x) => x.candidateFixtureId === arms.candidate);
    const p = c?.paired;
    const ci = p?.confidenceInterval;
    lines.push(
      `| ${k} | ${p?.count ?? "?"} | ${fmt(p?.medianDifference)} | ${ci ? `${fmt(ci.low)} to ${fmt(ci.high)}` : "n/a"} | ${ci ? ci.level.toFixed(3) : ""} | ${p?.conclusion ?? (c?.eligibilityReasons ?? []).join(", ")} |`
    );
  } catch (e) {
    lines.push(`| ${k} | compare output unreadable: ${e.message} | | | | |`);
  }
}
// Fallback when cookiebench compare declines (it needs every pair eligible):
// pair by pairId, keep pairs where both arms measured the metric, median of
// differences, 95% percentile bootstrap of that median (10,000 resamples,
// fixed seed). Labelled as harness output, not CookieBench output.
const bad = env.samples.filter((s) => s.scenarioId === "load" && s.status !== "passed");
if (bad.length) {
  lines.push("", "Samples that did not pass:", "");
  for (const s of bad) lines.push(`- ${s.fixtureId} ${s.pairId}: ${s.status}, ${(s.failures ?? []).map((f) => f.message).join("; ")}`);
}
let seed = 12345;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pairedDiffs = (key) => {
  const byPair = new Map();
  for (const s of env.samples.filter((x) => x.scenarioId === "load")) {
    const m = s.measurements.find((x) => x.key === key);
    if (!m || m.status !== "measured" || typeof m.value !== "number") continue;
    const e = byPair.get(s.pairId) ?? {};
    e[s.fixtureId] = m.value;
    byPair.set(s.pairId, e);
  }
  return [...byPair.values()].filter((e) => arms.control in e && arms.candidate in e).map((e) => e[arms.candidate] - e[arms.control]);
};
lines.push("", "Harness paired statistic (same data, pairs where both arms measured; use when `compare` reports n/a):", "");
lines.push("| Metric | Complete pairs | Median delta | 95% bootstrap interval |", "| --- | ---: | ---: | --- |");
for (const k of ["page.lcp", "page.fcp", "initial.transfer", "initial.requests"]) {
  const d = pairedDiffs(k);
  if (!d.length) continue;
  const meds = Array.from({ length: 10000 }, () => median(Array.from({ length: d.length }, () => d[Math.floor(rand() * d.length)]))).sort((a, b) => a - b);
  lines.push(`| ${k} | ${d.length} | ${fmt(median(d))} | ${fmt(meds[249])} to ${fmt(meds[9749])} |`);
}
for (const f of ["waterfall.md", "html.md"]) {
  if (existsSync(path.join(out, f))) lines.push("", readFileSync(path.join(out, f), "utf8").trim());
}
process.stdout.write(`${lines.join("\n")}\n`);
