// Per-request waterfall for the CookieBench SvelteKit fixture. macOS port of
// round8/desktop-lanes/sveltekit/bin/waterfall.mjs (only change: load sampling via sysctl).
// profile, plus a static look at the HTML. CookieBench's envelope records
// request start and bytes but no end time, so this script records its own.
//
// Profile (from benchmarks/profiles/mobile.json): 390x844, DPR 3, isMobile,
// hasTouch, the profile UA, Emulation.setCPUThrottlingRate 4,
// Network.emulateNetworkConditions 200,000 B/s down, 93,750 B/s up, 150 ms.
// Fresh context per visit (cold cache). Control (/baseline) and candidate
// (/) alternate.
//
// Times are milliseconds from the document's Network.requestWillBeSent.
// Request start = requestWillBeSent, end = loadingFinished, bytes =
// loadingFinished.encodedDataLength (headers + body on the wire, the same
// source CookieBench uses for initial.transfer). LCP and FCP come from
// PerformanceObserver in the page. Resource Timing entries are saved too.
import { spawn } from "node:child_process";
import { open, readFile, unlink } from "node:fs/promises";
import { openSync, readFileSync, writeFileSync } from "node:fs";
import { get } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import { brotliDecompressSync, gunzipSync } from "node:zlib";

const { values: args } = parseArgs({
  options: {
    cookiebench: { type: "string" },
    fixture: { type: "string" },
    port: { type: "string" },
    profile: { type: "string", default: "mobile" },
    visits: { type: "string", default: "3" },
    out: { type: "string" },
    "no-server": { type: "boolean", default: false },
    // --cmp cookie-yes: candidate is /baseline/?cmp=cookie-yes on the
    // registered host over the fixture's TLS port, as the October config.
    cmp: { type: "string" },
    "tls-port": { type: "string" },
  },
});
const cb = args.cookiebench;
const fix = args.fixture;
const port = Number(args.port);
const visits = Number(args.visits);
const out = args.out;
const plainOrigin = `http://127.0.0.1:${port}`;
const cmp = args.cmp;
const cmpHost = "benchmarks-with-cookie-yes.vercel.app";
const tlsPort = Number(args["tls-port"] ?? port + 300);
const origin = cmp ? `https://${cmpHost}:${tlsPort}` : plainOrigin;
const candidatePath = cmp ? `/baseline/?cmp=${cmp}&scripts=2` : "/?scripts=2";
const bannerSelector = cmp ? ".cky-consent-container" : '[data-testid="consent-banner-root"]';
const require = createRequire(path.join(cb, "packages/runner/package.json"));
const { chromium } = require("playwright");
const profile = JSON.parse(
  readFileSync(path.join(cb, `benchmarks/profiles/${args.profile}.json`), "utf8")
);

// ------------------------------------------------------------ machine lock
// Same file and protocol as CookieBench's measurementLock, so this script
// never measures while a CookieBench run does, and vice versa.
const lockPath = path.join(tmpdir(), "cookiebench-v3-measurement.lock");
async function acquireLock() {
  let announced = false;
  for (;;) {
    try {
      const file = await open(lockPath, "wx");
      await file.writeFile(String(process.pid));
      await file.close();
      return;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    let pid = NaN;
    try {
      pid = Number(await readFile(lockPath, "utf8"));
    } catch {}
    let alive = true;
    try {
      process.kill(pid, 0);
    } catch (error) {
      alive = error.code !== "ESRCH";
    }
    if (!alive) {
      await unlink(lockPath).catch(() => {});
      continue;
    }
    if (!announced) console.log(`waiting for measurement lock (PID ${pid})`);
    announced = true;
    await sleep(15_000);
  }
}
async function releaseLock() {
  try {
    if (Number(await readFile(lockPath, "utf8")) === process.pid) {
      await unlink(lockPath);
    }
  } catch {}
}

// ------------------------------------------------------------ server
let server;
function stopServer() {
  if (server?.pid && server.exitCode === null) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
  }
}
process.on("exit", stopServer);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    stopServer();
    await releaseLock();
    process.exit(130);
  });
}
async function startServer() {
  const log = openSync(path.join(out, "waterfall-server.log"), "w");
  let env = process.env;
  let command = ["pnpm", ["start"]];
  if (cmp) {
    const { execFileSync } = await import("node:child_process");
    const cert = path.join(out, "cert.pem");
    const key = path.join(out, "key.pem");
    execFileSync("openssl", ["req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:P-256", "-nodes", "-keyout", key, "-out", cert, "-days", "1", "-subj", `/CN=${cmpHost}`, "-addext", `subjectAltName=DNS:${cmpHost}`], { stdio: "ignore" });
    env = { ...process.env, COOKIEBENCH_TLS_CERT: cert, COOKIEBENCH_TLS_KEY: key };
    command = ["node", ["../../packages/fixture-support/src/serve.ts", "--port", String(port), "--tls-port", String(tlsPort), "--upstream-port", String(port + 100), "--baseline-upstream-port", String(port + 200), "--baseline-entry", "build-baseline/index.js", "--", "node", "build/index.js"]];
  }
  server = spawn(command[0], command[1], {
    cwd: fix,
    detached: true,
    env,
    stdio: ["ignore", log, log],
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("fixture server exited");
    try {
      const r = await fetch(`${plainOrigin}/health`, { signal: AbortSignal.timeout(500) });
      if (r.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error("fixture server readiness timeout");
}

// ------------------------------------------------------------ HTML
function fetchRaw(url, encoding = "br, gzip") {
  return new Promise((resolve, reject) => {
    get(url, { headers: { "accept-encoding": encoding } }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks);
        const enc = res.headers["content-encoding"] ?? "identity";
        const body =
          enc === "br" ? brotliDecompressSync(raw) : enc === "gzip" ? gunzipSync(raw) : raw;
        resolve({ enc, encoded: raw.length, body: body.toString("utf8"), decoded: body.length, status: res.statusCode });
      });
    }).on("error", reject);
  });
}
async function inspectHtml() {
  const report = {};
  for (const [arm, url] of [["control", "/baseline/"], ["candidate", candidatePath]]) {
    const doc = await fetchRaw(plainOrigin + url);
    const html = doc.body;
    const scripts = [...html.matchAll(/<script\b([^>]*)\bsrc="([^"]+)"([^>]*)>/g)].map((m) => ({
      src: m[2],
      async: /\basync\b/.test(m[1] + m[3]),
      nomodule: /\bnomodule\b/i.test(m[1] + m[3]),
    }));
    const links = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]);
    const styles = [...html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/g)].map((m) => ({
      attrs: m[1].trim(),
      bytes: Buffer.byteLength(m[2]),
      c15t: /c15t/.test(m[2]),
      head: m[2].slice(0, 80),
    }));
    const inline = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
      (m) => Buffer.byteLength(m[1])
    );
    const chunks = [];
    for (const s of scripts) {
      const abs = new URL(s.src, plainOrigin + url);
      if (abs.origin !== plainOrigin) continue;
      const r = await fetchRaw(abs.href);
      const id = await fetchRaw(abs.href, "identity");
      chunks.push({
        src: s.src,
        async: s.async,
        nomodule: s.nomodule,
        enc: r.enc,
        encoded: r.encoded,
        raw: id.decoded,
        c15t: /c15t|consent-banner|ConsentBanner/.test(r.body),
      });
    }
    report[arm] = {
      url,
      encoding: doc.enc,
      encodedBytes: doc.encoded,
      decodedBytes: doc.decoded,
      scripts: chunks,
      links,
      styles,
      inlineScripts: { count: inline.length, bytes: inline.reduce((a, b) => a + b, 0) },
      bannerOffset: html.indexOf(cmp ? "cky-consent" : "consent-banner-root"),
      heroOffset: html.indexOf("courtyard.png"),
      c15tClassCount: (html.match(/c15t-/g) ?? []).length,
    };
  }
  return report;
}

// ------------------------------------------------------------ visits
async function visit(browser, arm, url) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    userAgent: profile.userAgent,
    locale: profile.locale,
    ignoreHTTPSErrors: Boolean(cmp),
  });
  await context.addInitScript((bannerSelector) => {
    window.__wf = { lcp: [], fcp: null, banner: null, marks: [] };
    const poll = () => {
      const el = document.querySelector(bannerSelector);
      if (el) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && Number(cs.opacity) > 0) {
          window.__wf.banner = performance.now();
          return;
        }
      }
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        window.__wf.lcp.push({ startTime: e.startTime, url: e.url, size: e.size, id: e.id });
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        if (e.name === "first-contentful-paint") window.__wf.fcp = e.startTime;
    }).observe({ type: "paint", buffered: true });
  }, bannerSelector);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpuSlowdown });
  const navStartWall = Date.now();
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: profile.network.latencyMs,
    downloadThroughput: profile.network.downloadBytesPerSecond,
    uploadThroughput: profile.network.uploadBytesPerSecond,
  });
  const rows = new Map();
  cdp.on("Network.requestWillBeSent", (e) => {
    if (rows.has(e.requestId)) return; // redirect hop
    rows.set(e.requestId, {
      url: e.request.url,
      type: e.type,
      priority: e.request.initialPriority,
      start: e.timestamp,
    });
  });
  cdp.on("Network.responseReceived", (e) => {
    const r = rows.get(e.requestId);
    if (!r) return;
    const h = Object.fromEntries(Object.entries(e.response.headers).map(([k, v]) => [k.toLowerCase(), v]));
    r.status = e.response.status;
    r.encoding = h["content-encoding"] ?? "identity";
    r.responseStart = e.response.timing ? e.response.timing.requestTime + e.response.timing.receiveHeadersStart / 1000 : e.timestamp;
  });
  cdp.on("Network.loadingFinished", (e) => {
    const r = rows.get(e.requestId);
    if (!r) return;
    r.end = e.timestamp;
    r.bytes = e.encodedDataLength;
  });
  cdp.on("Network.loadingFailed", (e) => {
    const r = rows.get(e.requestId);
    if (!r) return;
    r.end = e.timestamp;
    r.failed = e.errorText;
  });
  await page.goto(origin + url, { waitUntil: "load", timeout: 90_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await sleep(1000);
  const perf = await page.evaluate(() => ({
    lcp: window.__wf.lcp,
    fcp: window.__wf.fcp,
    banner: window.__wf.banner,
    nav: performance.getEntriesByType("navigation")[0]?.toJSON(),
    resources: performance.getEntriesByType("resource").map((e) => ({
      name: e.name,
      initiatorType: e.initiatorType,
      startTime: e.startTime,
      responseStart: e.responseStart,
      responseEnd: e.responseEnd,
      transferSize: e.transferSize,
      encodedBodySize: e.encodedBodySize,
      decodedBodySize: e.decodedBodySize,
      renderBlockingStatus: e.renderBlockingStatus,
    })),
  }));
  await context.close();
  const list = [...rows.values()].sort((a, b) => a.start - b.start);
  const t0 = list.find((r) => r.type === "Document")?.start ?? list[0].start;
  const rel = (t) => (t == null ? null : Math.round((t - t0) * 1000));
  const requests = list.map((r) => ({
    url: r.url,
    type: r.type,
    priority: r.priority,
    status: r.status,
    encoding: r.encoding,
    bytes: r.bytes ?? null,
    start: rel(r.start),
    responseStart: rel(r.responseStart),
    end: rel(r.end),
    failed: r.failed,
  }));
  const hero = requests.find((r) => r.url.includes("courtyard.png"));
  const lcp = perf.lcp.at(-1);
  const navT0 = perf.nav ? 0 : 0;
  return { arm, url, banner: perf.banner, lcp: lcp?.startTime ?? null, lcpUrl: lcp?.url ?? null, fcp: perf.fcp, heroEnd: hero?.end ?? null, requests, resources: perf.resources, nav: perf.nav };
}

// ------------------------------------------------------------ report
const kb = (n) => (n == null ? "" : n.toLocaleString("en-US"));
const short = (u) => {
  const x = new URL(u);
  const p = x.pathname + (x.pathname === "/" ? x.search.replace(/token=[^&]+&?/, "") : "");
  return x.host === `127.0.0.1:${port}` || x.host === `${cmpHost}:${tlsPort}` ? p : `${x.host}${p}`;
};
function waterfallTable(v, controlUrls) {
  const lines = [
    `| # | URL | Type | Enc | Transfer B | Start ms | End ms | Before hero end |${controlUrls ? " Not in control |" : ""}`,
    `| ---: | --- | --- | --- | ---: | ---: | ---: | --- |${controlUrls ? " --- |" : ""}`,
  ];
  v.requests.forEach((r, i) => {
    const isHero = r.url.includes("courtyard.png");
    const before = isHero ? "(hero)" : r.end == null ? "unfinished" : r.end <= v.heroEnd ? "yes" : "no";
    lines.push(
      `| ${i + 1} | \`${short(r.url)}\` | ${r.type} | ${r.encoding ?? ""} | ${kb(r.bytes)} | ${r.start} | ${r.end ?? ""} | ${before} |${controlUrls ? ` ${controlUrls.has(short(r.url).replace(/\?.*$/, "")) ? "" : "yes"} |` : ""}`
    );
  });
  return lines.join("\n");
}
function beforeHero(v) {
  const rows = v.requests.filter((r) => !r.url.includes("courtyard.png") && r.end != null && r.end <= v.heroEnd);
  return { count: rows.length, bytes: rows.reduce((a, r) => a + (r.bytes ?? 0), 0) };
}
function htmlReport(h) {
  const lines = ["## HTML and script chunks (own fetch, `waterfall.mjs`)", ""];
  lines.push("| | Control `/baseline/` | Candidate `/` |", "| --- | ---: | ---: |");
  const c = h.control;
  const k = h.candidate;
  const row = (label, a, b) => lines.push(`| ${label} | ${a} | ${b} |`);
  row("Document encoding", c.encoding, k.encoding);
  row("Document bytes, encoded", kb(c.encodedBytes), kb(k.encodedBytes));
  row("Document bytes, decoded", kb(c.decodedBytes), kb(k.decodedBytes));
  const mod = (x) => x.scripts.filter((s) => !s.nomodule);
  row("`<script src>` tags (excl. `noModule`)", `${mod(c).length} (+${c.scripts.length - mod(c).length} noModule)`, `${mod(k).length} (+${k.scripts.length - mod(k).length} noModule)`);
  row("Module script bytes, encoded (sum)", kb(mod(c).reduce((a, s) => a + s.encoded, 0)), kb(mod(k).reduce((a, s) => a + s.encoded, 0)));
  row("Module script bytes, raw (sum)", kb(mod(c).reduce((a, s) => a + s.raw, 0)), kb(mod(k).reduce((a, s) => a + s.raw, 0)));
  row("Inline `<script>` blocks / bytes", `${c.inlineScripts.count} / ${kb(c.inlineScripts.bytes)}`, `${k.inlineScripts.count} / ${kb(k.inlineScripts.bytes)}`);
  row("`<style>` blocks / bytes", `${c.styles.length} / ${kb(c.styles.reduce((a, s) => a + s.bytes, 0))}`, `${k.styles.length} / ${kb(k.styles.reduce((a, s) => a + s.bytes, 0))}`);
  row("`<style>` blocks mentioning c15t / bytes", `${c.styles.filter((s) => s.c15t).length} / ${kb(c.styles.filter((s) => s.c15t).reduce((a, s) => a + s.bytes, 0))}`, `${k.styles.filter((s) => s.c15t).length} / ${kb(k.styles.filter((s) => s.c15t).reduce((a, s) => a + s.bytes, 0))}`);
  row("`<link>` tags", c.links.length, k.links.length);
  row("Byte offset of `consent-banner-root`", c.bannerOffset, k.bannerOffset);
  row("Byte offset of hero `courtyard.png`", c.heroOffset, k.heroOffset);
  lines.push("", "Candidate `<style>` blocks:", "", "| Attributes | Bytes | Mentions c15t | Starts with |", "| --- | ---: | --- | --- |");
  for (const s of k.styles) lines.push(`| \`${s.attrs || "(none)"}\` | ${kb(s.bytes)} | ${s.c15t ? "yes" : "no"} | \`${s.head.replace(/\|/g, "\\|").replace(/\s+/g, " ").slice(0, 60)}\` |`);
  lines.push("", "Candidate `<link>` tags:", "");
  for (const l of k.links) lines.push(`- \`${l}\``);
  const base = new Set(c.scripts.map((s) => s.src));
  lines.push("", "Candidate `<script src>` chunks (`only in candidate` = not referenced by the control page):", "", "| Chunk | Loading | Enc | Encoded B | Raw B | Only in candidate | Contains c15t strings |", "| --- | --- | --- | ---: | ---: | --- | --- |");
  for (const s of k.scripts) lines.push(`| \`${s.src}\` | ${s.nomodule ? "noModule (not fetched)" : s.async ? "async" : "sync"} | ${s.enc} | ${kb(s.encoded)} | ${kb(s.raw)} | ${base.has(s.src) ? "no" : "yes"} | ${s.c15t ? "yes" : "no"} |`);
  const only = k.scripts.filter((s) => !base.has(s.src));
  lines.push("", `Candidate-only chunks: ${only.length}, ${kb(only.reduce((a, s) => a + s.encoded, 0))} B encoded, ${kb(only.reduce((a, s) => a + s.raw, 0))} B raw.`);
  return lines.join("\n");
}

// ------------------------------------------------------------ main
const median = (xs) => {
  const s = xs.filter((x) => x != null).sort((a, b) => a - b);
  return s.length ? s[(s.length - 1) >> 1] : null;
};
const loadSamples = [];
const { execFileSync: execLoad } = await import("node:child_process");
// macOS: "{ 4.40 4.84 5.31 }" from sysctl
const sampleLoad = () => loadSamples.push([Date.now(), Number(execLoad("sysctl", ["-n", "vm.loadavg"], { encoding: "utf8" }).trim().split(/\s+/)[1])]);
let sampler;
try {
  await acquireLock();
  sampleLoad();
  sampler = setInterval(sampleLoad, 10_000);
  if (!args["no-server"]) await startServer();
  const browser = await chromium.launch({
    headless: true,
    args: cmp ? [`--host-resolver-rules=MAP ${cmpHost} 127.0.0.1`] : [],
  });
  try {
    // Prime the proxy's Brotli cache (it compresses each new body once, at
    // quality 11) so measured visits get cached encodings, as CookieBench's
    // own priming does.
    const primeCtx = await browser.newContext({ ignoreHTTPSErrors: Boolean(cmp) });
    const primePage = await primeCtx.newPage();
    for (const u of ["/baseline/", candidatePath]) {
      await primePage.goto(origin + u, { waitUntil: "load" });
      await primePage.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    }
    await primeCtx.close();
    const html = await inspectHtml();
    writeFileSync(path.join(out, "html.json"), JSON.stringify(html, null, 2));
    writeFileSync(path.join(out, "html.md"), `${htmlReport(html)}\n`);

    const results = [];
    for (let i = 0; i < visits; i++) {
      results.push(await visit(browser, "control", "/baseline/"));
      results.push(await visit(browser, "candidate", candidatePath));
      const [c, k] = results.slice(-2);
      console.log(`pair ${i + 1}: control LCP ${Math.round(c.lcp)} hero end ${c.heroEnd} | candidate LCP ${Math.round(k.lcp)} hero end ${k.heroEnd}`);
    }
    writeFileSync(path.join(out, "waterfall.json"), JSON.stringify(results, null, 2));

    const control = results.filter((r) => r.arm === "control");
    const cand = results.filter((r) => r.arm === "candidate");
    const mLcp = median(cand.map((r) => r.lcp));
    const rep = cand.find((r) => r.lcp === mLcp) ?? cand[0];
    const repControl = control[cand.indexOf(rep)] ?? control[0];
    const bc = beforeHero(repControl);
    const bk = beforeHero(rep);
    const lines = ["## Waterfall (own Playwright script, `waterfall.mjs`)", ""];
    lines.push(
      `Mobile profile reproduced: ${profile.viewport.width}x${profile.viewport.height} DPR ${profile.deviceScaleFactor}, CPU ${profile.cpuSlowdown}x, ${profile.network.downloadBytesPerSecond} B/s down, ${profile.network.uploadBytesPerSecond} B/s up, ${profile.network.latencyMs} ms latency. ${visits} pairs, fresh context each visit.`,
      ""
    );
    lines.push("| Visit | LCP ms | FCP ms | Banner visible ms | Hero start ms | Hero end ms | /init start–end ms | Requests | Bytes finished before hero end (excl. hero) |", "| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |");
    results.forEach((r, i) => {
      const b = beforeHero(r);
      const hero = r.requests.find((q) => q.url.includes("courtyard.png"));
      const init = r.requests.find((q) => /\/init\b/.test(q.url) && q.type !== "Preflight");
      lines.push(`| ${Math.floor(i / 2) + 1} ${r.arm} | ${Math.round(r.lcp)} | ${Math.round(r.fcp)} | ${r.banner == null ? "–" : Math.round(r.banner)} | ${hero?.start ?? ""} | ${r.heroEnd} | ${init ? `${init.start}–${init.end}` : "–"} | ${r.requests.length} | ${kb(b.bytes)} (${b.count} req) |`);
    });
    lines.push(
      "",
      `Median own-script LCP: control ${Math.round(median(control.map((r) => r.lcp)))} ms, candidate ${Math.round(mLcp)} ms. Median FCP: control ${Math.round(median(control.map((r) => r.fcp)))}, candidate ${Math.round(median(cand.map((r) => r.fcp)))}. Median banner visible (rAF poll): ${Math.round(median(cand.map((r) => r.banner)))} ms. Median hero start: control ${median(control.map((r) => r.requests.find((q) => q.url.includes("courtyard.png"))?.start))}, candidate ${median(cand.map((r) => r.requests.find((q) => q.url.includes("courtyard.png"))?.start))}. Median bytes before hero end: control ${kb(median(control.map((r) => beforeHero(r).bytes)))}, candidate ${kb(median(cand.map((r) => beforeHero(r).bytes)))}.`,
      `Representative candidate visit (median LCP, pair ${cand.indexOf(rep) + 1}): ${bk.count} requests / ${kb(bk.bytes)} B finished before the hero image, against ${bc.count} / ${kb(bc.bytes)} B in the paired control visit (difference ${kb(bk.bytes - bc.bytes)} B).`,
      "",
      `### Candidate visit, pair ${cand.indexOf(rep) + 1} (LCP ${Math.round(rep.lcp)} ms, hero end ${rep.heroEnd} ms)`,
      "",
      waterfallTable(rep, new Set(control.flatMap((c) => c.requests.map((r) => short(r.url).replace(/\?.*$/, ""))))),
      "",
      `### Paired control visit (LCP ${Math.round(repControl.lcp)} ms, hero end ${repControl.heroEnd} ms)`,
      "",
      waterfallTable(repControl)
    );
    writeFileSync(path.join(out, "waterfall.md"), `${lines.join("\n")}\n`);
  } finally {
    await browser.close();
  }
} finally {
  clearInterval(sampler);
  writeFileSync(path.join(out, "loadavg.json"), JSON.stringify(loadSamples));
  stopServer();
  await releaseLock();
}
