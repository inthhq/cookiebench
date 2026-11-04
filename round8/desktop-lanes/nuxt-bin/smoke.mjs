// Functional smoke test of a built Nuxt fixture copy.
//   node smoke.mjs <fixtureDir> <portBase> [--throttle]
// Serves the fixture (proxy portBase, nuxt +1, baseline +2) and checks:
// fresh visit (banner, engine timing, console), accept after hero, early
// accept before hydration, customize + save, returning visitor.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const [fix, portArg, ...flags] = process.argv.slice(2);
const port = Number(portArg);
const throttle = flags.includes("--throttle");
const origin = `http://127.0.0.1:${port}`;
const require = createRequire(path.join(fix, "../../packages/runner/package.json"));
const { chromium } = require("playwright");

const server = spawn(
  "node",
  ["../../packages/fixture-support/src/serve.ts", "--port", String(port), "--upstream-port", String(port + 1),
    "--baseline-upstream-port", String(port + 2), "--baseline-entry", ".output-baseline/server/index.mjs",
    "--", "node", ".output/server/index.mjs"],
  { cwd: fix, detached: true, stdio: "ignore" }
);
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stop);
process.on("SIGINT", () => process.exit(1));
for (let i = 0; i < 300; i++) {
  try { if ((await fetch(`${origin}/health`)).ok) break; } catch {}
  await sleep(100);
}
const browser = await chromium.launch();
const log = (...a) => console.log(...a);
const errors = [];
const newPage = async (ctx, name) => {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name} pageerror: ${e}`));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${name} ${m.type()}: ${m.text()}`); });
  const reqs = [];
  const t0 = Date.now();
  page.on("request", (r) => reqs.push({ t: Date.now() - t0, url: r.url() }));
  if (throttle) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
  }
  return { page, reqs, t0 };
};
const ctxOptions = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const bridge = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__cookiebench ?? null)));
const record = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("c15t")));
const js = (reqs) => reqs.filter((r) => /\/_nuxt\/.*\.js/.test(r.url)).map((r) => `${r.t}:${r.url.split("/").pop()}`);
const controlled = (reqs) => reqs.filter((r) => r.url.includes("/controlled/script")).map((r) => r.t);
try {
  // 1. Fresh visit, accept after the hero.
  {
    const ctx = await browser.newContext(ctxOptions);
    const { page, reqs, t0 } = await newPage(ctx, "fresh");
    await page.goto(`${origin}/?scripts=2&token=smoke`);
    await page.waitForSelector('[data-testid="consent-banner-root"]', { state: "visible", timeout: 20000 });
    log("[fresh] banner visible at", Date.now() - t0);
    log("[fresh] js at domcontentloaded:", js(reqs).length);
    await page.waitForFunction(() => { const i = document.querySelector("img[fetchpriority=high]"); return i && i.complete; }, null, { timeout: 30000 });
    const hero = Date.now() - t0;
    log("[fresh] hero complete at", hero);
    await sleep(throttle ? 4000 : 1000);
    log("[fresh] js requests:", js(reqs).join(" "));
    log("[fresh] js after hero:", js(reqs).filter((s) => Number(s.split(":")[0]) >= hero).length);
    log("[fresh] bridge before:", JSON.stringify(await bridge(page)));
    const tClick = Date.now() - t0;
    await page.click('[data-testid="consent-banner-accept-button"]');
    await page.waitForFunction(() => window.__cookiebench?.consent === "accepted", null, { timeout: 10000 }).catch(() => log("[fresh] consent not accepted"));
    log("[fresh] consent accepted after", Date.now() - t0 - tClick);
    await page.waitForSelector('[data-testid="consent-banner-root"]', { state: "hidden", timeout: 10000 }).catch(() => log("[fresh] banner still visible"));
    await sleep(throttle ? 3000 : 1000);
    log("[fresh] controlled script requests at", controlled(reqs), "click at", tClick);
    log("[fresh] storage keys:", await record(page), "cookies:", (await ctx.cookies()).map((c) => c.name).join(","));
    log("[fresh] bridge after:", JSON.stringify(await bridge(page)));
    log("[fresh] banner elements:", await page.$$eval('[data-testid="consent-banner-root"]', (els) => els.length));
    // Returning visitor, same context.
    const r = await newPage(ctx, "returning");
    await r.page.goto(`${origin}/?scripts=2&token=smoke2`);
    await r.page.waitForFunction(() => window.__cookiebench?.consent === "accepted", null, { timeout: 15000 }).catch(() => log("[returning] not accepted"));
    await sleep(1500);
    log("[returning] banner present:", await r.page.$('[data-testid="consent-banner-root"]').then(Boolean), "controlled at", controlled(r.reqs), "js:", js(r.reqs).length);
    await ctx.close();
  }
  // 2. Accept before hydration.
  {
    const ctx = await browser.newContext(ctxOptions);
    const { page, reqs, t0 } = await newPage(ctx, "early");
    await page.goto(`${origin}/?scripts=2&token=early`, { waitUntil: "commit" });
    await page.waitForSelector('[data-testid="consent-banner-accept-button"]', { state: "visible", timeout: 20000 });
    const tClick = Date.now() - t0;
    await page.click('[data-testid="consent-banner-accept-button"]', { noWaitAfter: true });
    log("[early] clicked at", tClick, "hydrated:", await page.evaluate(() => Boolean(window.useNuxtApp?.()?.isHydrating === false)));
    await page.waitForFunction(() => window.__cookiebench?.consent === "accepted", null, { timeout: 20000 }).catch(() => log("[early] consent not accepted"));
    log("[early] consent accepted at", Date.now() - t0);
    await sleep(throttle ? 6000 : 2000);
    log("[early] controlled at", controlled(reqs), "storage:", await record(page));
    log("[early] banner visible:", await page.isVisible('[data-testid="consent-banner-root"]'));
    await ctx.close();
  }
  // 3. Customize, toggle, save.
  {
    const ctx = await browser.newContext(ctxOptions);
    const { page, reqs, t0 } = await newPage(ctx, "customize");
    await page.goto(`${origin}/?scripts=2&token=cust`);
    await page.waitForSelector('[data-testid="consent-banner-customize-button"]', { state: "visible", timeout: 20000 });
    await page.waitForFunction(() => document.documentElement.dataset.consentReady === "true", null, { timeout: 20000 });
    const tClick = Date.now() - t0;
    await page.click('[data-testid="consent-banner-customize-button"]');
    await page.waitForSelector('[data-testid="consent-dialog-root"]', { state: "visible", timeout: 20000 }).catch(() => log("[customize] no dialog"));
    log("[customize] dialog after", Date.now() - t0 - tClick, "banner visible:", await page.isVisible('[data-testid="consent-banner-root"]'));
    await page.click('[data-testid="consent-widget-switch-measurement"]').catch((e) => log("[customize] toggle failed", String(e).slice(0, 120)));
    const tSave = Date.now() - t0;
    await page.click('[data-testid="consent-widget-footer-save-button"]').catch((e) => log("[customize] save failed", String(e).slice(0, 120)));
    await page.waitForFunction(() => window.__cookiebench?.consent && window.__cookiebench.consent !== "unset", null, { timeout: 10000 }).catch(() => log("[customize] no consent"));
    log("[customize] consent after save", Date.now() - t0 - tSave, JSON.stringify(await bridge(page)));
    await sleep(throttle ? 4000 : 1000);
    log("[customize] dialog visible:", await page.isVisible('[data-testid="consent-dialog-root"]'), "controlled at", controlled(reqs), "storage:", await record(page));
    await ctx.close();
  }
} finally {
  log("errors:", errors.length ? `\n  ${errors.join("\n  ")}` : "none");
  await browser.close();
  stop();
}
