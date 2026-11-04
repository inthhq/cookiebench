// probe-click.mjs <fixtureDir> <portBase> [--throttle] [--wait ms]
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
const [fix, portArg, ...flags] = process.argv.slice(2);
const port = Number(portArg);
const throttle = flags.includes("--throttle");
const waitIdx = flags.indexOf("--wait"); const waitMs = waitIdx >= 0 ? Number(flags[waitIdx + 1]) : 1500;
const origin = `http://127.0.0.1:${port}`;
const require = createRequire(path.join(fix, "../../packages/runner/package.json"));
const { chromium } = require("playwright");
const server = spawn("node", ["../../packages/fixture-support/src/serve.ts", "--port", String(port), "--upstream-port", String(port + 1), "--baseline-upstream-port", String(port + 2), "--baseline-entry", ".output-baseline/server/index.mjs", "--", "node", ".output/server/index.mjs"], { cwd: fix, detached: true, stdio: "ignore" });
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stop);
for (let i = 0; i < 300; i++) { try { if ((await fetch(`${origin}/health`)).ok) break; } catch {} await sleep(100); }
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    window.__probe = { events: [] };
    const mark = (name) => window.__probe.events.push([name, Math.round(performance.now())]);
    for (const type of ["pointerdown", "click"]) addEventListener(type, () => mark(type), true);
    let last;
    setInterval(() => { const c = window.__cookiebench?.consent; if (c !== last) { last = c; mark("consent:" + c); } }, 2);
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name.includes("/controlled/script")) mark("script-end:" + Math.round(e.responseEnd)); }).observe({ type: "resource", buffered: true });
  });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
  if (throttle) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
  }
  await page.goto(`${origin}/?scripts=2&token=probe`);
  await page.waitForFunction(() => document.documentElement.dataset.consentReady === "true", null, { timeout: 30000 });
  await sleep(waitMs);
  const state = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="consent-banner-root"]');
    const q = window.__c15tEarlyTaps;
    return { hydrated: Boolean(root && root.__vueParentComponent), queue: q ? Object.keys(q) : null, styles: [...document.querySelectorAll("style[id^=c15t-early]")].map((s) => s.id) };
  });
  console.log("before click", JSON.stringify(state));
  const box = await page.locator('[data-testid="consent-banner-accept-button"]').boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(throttle ? 3000 : 800);
  const ev = await page.evaluate(() => window.__probe.events);
  const tap = ev.find((e) => e[0] === "pointerdown" || e[0] === "click");
  console.log("events since tap:", JSON.stringify(ev.filter((e) => e[1] >= (tap?.[1] ?? 0)).map(([n, t]) => [n, t - tap[1]])));
  console.log("errors", errors);
} finally { await browser.close(); stop(); }
