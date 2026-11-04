// Unthrottled functional check of the fixture (not a measurement).
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://127.0.0.1:4317";
const browser = await chromium.launch();
const out = {};
async function visit(path, fn) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
  await page.goto(base + path, { waitUntil: "load" });
  const r = await fn(page);
  await ctx.close();
  return { ...r, errors };
}
out.accept = await visit("/?scripts=2&token=smoke-a", async (page) => {
  await page.waitForSelector('html[data-consent-ready="true"]', { timeout: 10000 });
  const banner = await page.isVisible('[data-testid="consent-banner-root"]');
  await page.click('[data-testid="consent-banner-accept-button"]');
  await page.waitForFunction(() => window.__cookiebench?.scripts?.length >= 2, null, { timeout: 10000 });
  const state = await page.evaluate(() => ({ ...window.__cookiebench }));
  const bannerAfter = await page.isVisible('[data-testid="consent-banner-root"]');
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('html[data-consent-ready="true"]');
  const reload = await page.evaluate(() => ({ ...window.__cookiebench, bannerInHtml: !!document.querySelector('[data-testid="consent-banner-root"]') }));
  return { banner, state, bannerAfter, reload };
});
out.reject = await visit("/?scripts=2&token=smoke-r", async (page) => {
  await page.waitForSelector('html[data-consent-ready="true"]');
  await page.click('[data-testid="consent-banner-reject-button"]');
  await page.waitForFunction(() => window.__cookiebench?.consent === "rejected", null, { timeout: 10000 });
  await page.waitForTimeout(1000);
  return { state: await page.evaluate(() => ({ ...window.__cookiebench })) };
});
out.save = await visit("/?scripts=2&token=smoke-s", async (page) => {
  await page.waitForSelector('html[data-consent-ready="true"]');
  await page.click('[data-testid="consent-banner-customize-button"]');
  await page.waitForSelector('[data-testid="consent-dialog-root"]', { state: "visible", timeout: 10000 });
  await page.click('[data-testid="consent-widget-switch-measurement"]');
  await page.click('[data-testid="consent-widget-footer-save-button"]');
  await page.waitForFunction(() => window.__cookiebench?.consent === "custom", null, { timeout: 10000 });
  await page.waitForTimeout(1000);
  const state = await page.evaluate(() => ({ ...window.__cookiebench }));
  await page.click("#reopen-preferences");
  const reopened = await page.waitForSelector('[data-testid="consent-dialog-root"]', { state: "visible", timeout: 10000 }).then(() => true, () => false);
  return { state, reopened };
});
out.baseline = await visit("/baseline/?scripts=2&token=smoke-b", async (page) => {
  await page.waitForSelector('#page-action[data-interaction-installed="true"]', { timeout: 10000 });
  const res = await page.evaluate(() => performance.getEntriesByType("resource").map((e) => e.name.replace(location.origin, "")));
  return { c15t: res.filter((n) => /c15t/i.test(n)), resources: res.length, html: (await page.content()).includes("c15t") };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
