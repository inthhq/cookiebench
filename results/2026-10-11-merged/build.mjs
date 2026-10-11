// Usage: node results/2026-10-11-merged/paired.mjs
//        node results/2026-10-11-merged/build.mjs [destination]
// Merges the October 11 framework matrix with the Next.js CookieYes rerun that
// loads CookieYes after hydration. Every row except Next.js CookieYes comes
// from the matrix, c15t 3.0.0-alpha.10 included. Each row keeps its own run's
// no-CMP baseline, so deltas never cross runs. paired.mjs must run first: it
// writes the paired TTFB and FCP comparisons the batch runner doesn't make.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const dest = process.argv[2] ?? fileURLToPath(new URL(".", import.meta.url));
const frameworks = ["nextjs", "nuxt", "astro", "tanstack-start", "react", "script"];
const profiles = ["desktop", "mobile"];
const keys = [
  "banner.visible", "page.ttfb", "page.fcp", "page.lcp", "page.primary-content-paint", "page.cls",
  "initial.long-task-blocking", "initial.transfer", "initial.decoded-body", "initial.requests",
  "initial.third-party-requests", "consent.resolution",
];
const batchMetrics = ["page.lcp", "page.primary-content-paint", "page.cls", "initial.transfer", "initial.decoded-body"];
const extraMetrics = ["page.ttfb", "page.fcp"];
const pairedMetrics = [...extraMetrics, ...batchMetrics];
const runs = {
  matrix: {
    id: "matrix-2026-10-11",
    description: "All ten CMPs on six frameworks, c15t at 3.0.0-alpha.10",
    measuredAt: "2026-10-11 overnight",
    htmlBrotliQuality: 5,
  },
  cookieYesHydration: {
    id: "cookie-yes-hydration-2026-10-11",
    description: "Next.js CookieYes and its no-CMP page, with CookieYes loaded after hydration",
    measuredAt: "2026-10-11 morning",
    htmlBrotliQuality: 5,
  },
};
// How each competitor's script is added to the page. c15t ships inside the app.
const vendorTiming = (fw, run, product) =>
  product === "c15t" ? "bundled" : run === "cookieYesHydration" ? "after-hydration" : "head";

const readJson = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null);
const med = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Medians over passed load visits. A fixture with no passed visits (Osano, whose
// byte totals are withheld) falls back to its incomplete visits per metric.
function stats(env, id) {
  const samples = env.samples.filter((x) => x.fixtureId === id && x.scenarioId === "load" && x.kind !== "warmup");
  const passed = samples.filter((x) => x.status === "passed");
  const basis = passed.length ? passed : samples.filter((x) => x.status === "incomplete");
  const medians = Object.fromEntries(keys.map((k) => [k, med(basis.map((x) => x.measurements.find((m) => m.key === k)).filter((m) => m?.status === "measured").map((m) => m.value))]));
  const document = med(basis.map((x) => x.diagnostics?.requests?.find((r) => r.resourceType === "Document")?.decodedBodyBytes).filter((v) => v != null));
  const reasons = {};
  for (const s of samples.filter((x) => x.status !== "passed")) {
    for (const f of s.failures ?? []) reasons[f.message] = (reasons[f.message] ?? 0) + 1;
  }
  return {
    visits: samples.length,
    passed: passed.length,
    sampleBasis: passed.length ? "passed" : "incomplete",
    failureReasons: Object.entries(reasons).map(([message, visits]) => ({ message, visits })),
    medians: { ...medians, "document.decoded-body": document },
  };
}

function correctness(file, fixtureId) {
  const result = readJson(file);
  if (!result) return null;
  const caps = (result.details?.capabilities ?? []).filter((c) => c.fixtureId === fixtureId);
  return Object.fromEntries(caps.map((c) => [c.capability.replace(/^consent-flow:/, ""), c.status]));
}

// Input to next paint for the one click in each consent-flow check. The browser
// reports no Event Timing entry for interactions under 16 ms, so a missing value
// after a click that took effect reads "below-16ms". With no evidence the click
// landed, it reads "unknown". The followup is a page-control click made a set
// offset after the consent click, in a separate visit.
const tookEffect = (sample) =>
  sample.measurements.some((m) => ["action.dismissed", "action.consent-effective"].includes(m.key) && m.status === "measured");
function click(sample, key, landed) {
  const m = sample?.measurements.find((x) => x.key === key);
  if (m?.status === "measured") return { ms: m.value, status: "measured" };
  return { ms: null, status: sample && landed ? "below-16ms" : "unknown" };
}

function interactions(file, fixtureId) {
  const env = readJson(file);
  if (!env) return null;
  return Object.fromEntries(["accept", "reject", "save"].map((flow) => {
    const s = env.samples.find((x) => x.fixtureId === fixtureId && x.scenarioId === flow);
    const probe = s?.diagnostics?.followupProbe;
    const first = click(s, "action.input-to-next-paint", s && tookEffect(s));
    const followup = click(probe, "action.followup-input-to-next-paint", probe?.status === "passed");
    return [flow, {
      inputToNextPaint: first.ms,
      status: first.status,
      visit: s?.status ?? null,
      followupInputToNextPaint: followup.ms,
      followupStatus: followup.status,
      followupOffsetMs: s?.diagnostics?.followupOffsetMs ?? null,
    }];
  }));
}

function loadEntry(profile, fw, run, suffix = "") {
  const dir = `${repo}/results/${run === "cookieYesHydration" ? "2026-10-11-cookie-yes-hydration" : "2026-10-11"}/${profile}`;
  const entry = `${fw}${suffix}-load`;
  return {
    env: readJson(`${dir}/${entry}/attempt-001/envelope.json`),
    compare: (m) =>
      extraMetrics.includes(m)
        ? readJson(fileURLToPath(new URL(`paired/${profile}/${entry}/compare-${m}.json`, import.meta.url)))
        : readJson(`${dir}/${entry}/attempt-001/compare-${m}/stdout.json`),
    flows: `${dir}/${fw}${suffix}-correctness/result.json`,
    flowEnvelope: `${dir}/${fw}${suffix}-correctness/attempt-001/envelope.json`,
  };
}

function rowsFor(profile, fw, run, suffix, keep) {
  const { env, compare, flows, flowEnvelope } = loadEntry(profile, fw, run, suffix);
  if (!env) throw new Error(`missing envelope: ${profile} ${fw}${suffix} ${run}`);
  const base = env.fixtures.find((x) => x.baseline);
  const baseline = { fixtureId: base.id, ...stats(env, base.id) };
  const comparisons = Object.fromEntries(pairedMetrics.map((m) => {
    const result = compare(m);
    if (!result) throw new Error(`missing ${m} comparison: ${profile} ${fw}${suffix} ${run}`);
    return [m, result.comparisons];
  }));
  return env.fixtures.filter((f) => !f.baseline && keep(f)).map((f) => {
    const paired = {};
    for (const m of pairedMetrics) {
      const c = comparisons[m].find((x) => x.candidateFixtureId === f.id)?.paired;
      paired[m] = c
        ? { medianDifference: c.medianDifference, ci: c.confidenceInterval ? [c.confidenceInterval.low, c.confidenceInterval.high] : null, ciLevel: c.confidenceInterval?.level ?? null, pairs: c.count, conclusion: c.conclusion }
        : null;
    }
    return {
      framework: fw,
      frameworkVersion: f.frameworkVersion,
      product: f.product,
      version: f.version,
      fixtureId: f.id,
      run: runs[run].id,
      host: suffix ? "registered-host" : "local",
      vendorTiming: vendorTiming(fw, run, f.product),
      ...stats(env, f.id),
      baseline,
      paired,
      flows: correctness(flows, f.id),
      interactions: interactions(flowEnvelope, f.id),
    };
  });
}

fs.mkdirSync(dest, { recursive: true });
const csv = [[
  "profile", "framework", "framework_version", "product", "version", "run", "host", "passed", "visits", "sample_basis",
  "banner_ms", "ttfb_ms", "fcp_ms", "lcp_ms", "blocking_ms", "cls", "transfer_bytes", "requests", "third_party_requests", "document_bytes",
  "baseline_fcp_ms", "baseline_lcp_ms", "baseline_transfer_bytes",
  "lcp_added_ms", "lcp_added_low", "lcp_added_high", "lcp_conclusion",
  "transfer_added_bytes", "transfer_added_low", "transfer_added_high",
  "flow_load", "flow_accept", "flow_reject", "flow_save",
  "accept_inp_ms", "accept_inp_status", "reject_inp_ms", "reject_inp_status", "save_inp_ms", "save_inp_status",
  "failure_reasons",
  "vendor_timing", "baseline_ttfb_ms",
  "ttfb_added_ms", "ttfb_added_low", "ttfb_added_high", "ttfb_conclusion",
  "fcp_added_ms", "fcp_added_low", "fcp_added_high", "fcp_conclusion",
].join(",")];

for (const profile of profiles) {
  const out = { profile, generatedAt: new Date().toISOString(), runs, frameworks: {} };
  for (const fw of frameworks) {
    const matrix = rowsFor(profile, fw, "matrix", "", () => true);
    const c15t = matrix.filter((r) => r.product === "c15t");
    const competitors = matrix.filter((r) => r.product !== "c15t");
    const cookieYes = rowsFor(profile, fw, fw === "nextjs" ? "cookieYesHydration" : "matrix", "-cookie-yes", () => true);
    const products = [...c15t, ...competitors, ...cookieYes];
    out.frameworks[fw] = { frameworkVersion: products[0].frameworkVersion, products };
    for (const r of products) {
      const m = r.medians, b = r.baseline.medians, ix = r.interactions ?? {}, lcp = r.paired["page.lcp"], tr = r.paired["initial.transfer"];
      const ttfb = r.paired["page.ttfb"], fcp = r.paired["page.fcp"];
      csv.push([
        profile, fw, r.frameworkVersion, r.product, r.version, r.run, r.host, r.passed, r.visits, r.sampleBasis,
        m["banner.visible"], m["page.ttfb"], m["page.fcp"], m["page.lcp"], m["initial.long-task-blocking"], m["page.cls"],
        m["initial.transfer"], m["initial.requests"], m["initial.third-party-requests"], m["document.decoded-body"],
        b["page.fcp"], b["page.lcp"], b["initial.transfer"],
        lcp?.medianDifference, lcp?.ci?.[0], lcp?.ci?.[1], lcp?.conclusion,
        tr?.medianDifference, tr?.ci?.[0], tr?.ci?.[1],
        r.flows?.load, r.flows?.accept, r.flows?.reject, r.flows?.save,
        ...["accept", "reject", "save"].flatMap((flow) => [ix[flow]?.inputToNextPaint, ix[flow]?.status]),
        `"${r.failureReasons.map((f) => `${f.message} (${f.visits})`).join("; ").replaceAll("\"", "'")}"`,
        r.vendorTiming, b["page.ttfb"],
        ttfb?.medianDifference, ttfb?.ci?.[0], ttfb?.ci?.[1], ttfb?.conclusion,
        fcp?.medianDifference, fcp?.ci?.[0], fcp?.ci?.[1], fcp?.conclusion,
      ].map((v) => (v == null ? "" : typeof v === "number" ? Math.round(v * 1000) / 1000 : v)).join(","));
    }
  }
  fs.writeFileSync(path.join(dest, `matrix-${profile}.json`), `${JSON.stringify(out, null, 2)}\n`);
}
fs.writeFileSync(path.join(dest, "matrix.csv"), `${csv.join("\n")}\n`);
console.log(csv.length - 1, "rows");
