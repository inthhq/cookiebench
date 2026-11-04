// Unthrottled smoke: open / and /headless.html on the running fixture server,
// wait for html[data-consent-ready], report banner presence and requests.
import { createRequire } from "node:module";
import path from "node:path";
const [cb, port = "4310"] = process.argv.slice(2);
const require = createRequire(path.join(cb, "packages/runner/package.json"));
const { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true });
for (const [url, banner] of [
  ["/", '[data-testid="consent-banner-root"]'],
  ["/headless.html", "#banner"],
  ["/baseline", '[data-testid="consent-banner-root"]'],
]) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const reqs = [];
  const errors = [];
  page.on("request", (r) => reqs.push(r.url()));
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}${url}`);
  const ready = await page
    .waitForSelector('html[data-consent-ready="true"]', { state: "attached", timeout: 15000 })
    .then(() => Date.now() - t0)
    .catch(() => null);
  const visible = await page.locator(banner).first().isVisible().catch(() => false);
  console.log(JSON.stringify({ url, ready, visible, errors, reqs: reqs.map((u) => u.replace(/token=[^&]+/, "token=…")) }, null, 1));
  await ctx.close();
}
await browser.close();
