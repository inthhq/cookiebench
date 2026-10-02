import { setTimeout as delay } from "node:timers/promises";

import type { DeviceProfile, FixtureConfig } from "@cookiebench/schema";
import type { Browser } from "playwright";

/** Cold server work, as reported by the fixture server's encoding log. */
export interface EncodingMiss {
  at: number;
  bytes: number;
  durationMs: number;
  source: string;
}

function missLogUrl(fixture: FixtureConfig): string | undefined {
  const base = fixture.server?.readinessUrl;
  return base ? new URL("/controlled/encoding-misses", base).href : undefined;
}

/**
 * Read the fixture server's on-demand encoding log. Servers without the log,
 * such as remote deployments or the reference fixture, return undefined.
 */
export async function readEncodingMisses(
  fixture: FixtureConfig
): Promise<EncodingMiss[] | undefined> {
  const url = missLogUrl(fixture);
  if (!url) {
    return undefined;
  }
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) {
      await response.body?.cancel();
      return undefined;
    }
    const rows: unknown = await response.json();
    return Array.isArray(rows) ? (rows as EncodingMiss[]) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * One unmeasured visit per fixture-support URL after readiness, in a throwaway context
 * with the profile's device emulation and no throttling. It fills server-side
 * encoding caches for the document, its subresources and anything it
 * prefetches, so that work cannot land in the first measured visit.
 */
export async function primeFixture(
  browser: Browser,
  fixture: FixtureConfig,
  profile: DeviceProfile,
  scriptCount: number,
  dwellMs = 0
) {
  const initial = await readEncodingMisses(fixture);
  if (initial === undefined) {
    // Only fixture-support servers cache encodings; others have nothing to fill.
    return { coldEncodings: undefined, primed: false, url: fixture.url };
  }
  const context = await browser.newContext({
    deviceScaleFactor: profile.deviceScaleFactor,
    hasTouch: profile.hasTouch,
    isMobile: profile.isMobile,
    locale: profile.locale,
    userAgent: profile.userAgent,
    viewport: profile.viewport,
  });
  try {
    const page = await context.newPage();
    // Playwright's networkidle load state is sticky once reached, so track
    // requests directly to wait out work that starts later.
    let inFlight = 0;
    let lastActivity = performance.now();
    const started = () => {
      inFlight += 1;
      lastActivity = performance.now();
    };
    const ended = () => {
      inFlight = Math.max(0, inFlight - 1);
      lastActivity = performance.now();
    };
    page.on("request", started);
    page.on("requestfinished", ended);
    page.on("requestfailed", ended);
    const settle = async () => {
      // Remote CMPs may never go quiet; the per-sample guard still applies.
      const since = performance.now();
      const deadline = since + 10_000;
      // Quiet means 500 ms with nothing in flight, counted from this call so
      // work an action is about to start is not missed.
      const busy = () =>
        inFlight > 0 || performance.now() - Math.max(lastActivity, since) < 500;
      while (performance.now() < deadline && busy()) {
        // oxlint-disable-next-line no-await-in-loop -- Poll until the page's requests settle.
        await delay(50);
      }
    };
    const url = new URL(fixture.url);
    url.searchParams.set("scripts", String(scriptCount));
    url.searchParams.set("token", "cookiebench-prime");
    const navigatedAt = performance.now();
    await page.goto(url.href, { timeout: 60_000, waitUntil: "load" });
    await settle();
    // A measured visit stays open for its observation window, and some CMPs
    // fetch modules at idle after the network first goes quiet. Stay at least
    // that long so those requests happen here first.
    const remaining = navigatedAt + dwellMs - performance.now();
    if (remaining > 0) {
      await delay(remaining);
      await settle();
    }
    // Some CMPs load their preferences dialog as a separate chunk on first
    // open; open it here so a measured save cannot be the first request.
    const { preferences } = fixture.adapter;
    if (!fixture.baseline && preferences) {
      try {
        await page.locator(preferences).first().click({ timeout: 10_000 });
      } catch {
        /* Best effort, as above. */
      }
      await settle();
    }
  } finally {
    await context.close();
  }
  const after = await readEncodingMisses(fixture);
  return {
    coldEncodings:
      after === undefined ? undefined : after.length - initial.length,
    primed: true,
    url: fixture.url,
  };
}
