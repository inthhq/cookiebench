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
  scriptCount: number
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
    const url = new URL(fixture.url);
    url.searchParams.set("scripts", String(scriptCount));
    url.searchParams.set("token", "cookiebench-prime");
    await page.goto(url.href, { timeout: 60_000, waitUntil: "load" });
    try {
      // Prefetches and lazy chunks follow load; remote CMPs may never go idle.
      await page.waitForLoadState("networkidle", { timeout: 10_000 });
    } catch {
      /* The bounded wait is best effort; the per-sample guard still applies. */
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
