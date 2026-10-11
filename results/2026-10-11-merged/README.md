# Cookiebench framework matrix, October 11 2026

Ten CMPs on six frameworks, desktop and mobile, with c15t at 3.0.0-alpha.10. Every row comes from the overnight matrix except Next.js CookieYes. That row comes from a rerun that loads CookieYes after hydration.

## Files

- `matrix-desktop.json`, `matrix-mobile.json`: one entry per framework, with one product per CMP. Each product carries its medians, its own no-CMP baseline, paired deltas against that baseline, its consent-flow checks, and the click timing from each flow.
- `matrix.csv`: the same rows flattened, both profiles in one file.
- `paired.mjs`: runs the paired TTFB and FCP comparisons into `paired/`. The batch runner doesn't compare those two metrics.
- `paired/`: the TTFB and FCP comparison output, one file per load entry and metric.
- `build.mjs`: rebuilds the three data files from `../2026-10-11`, `../2026-10-11-cookie-yes-hydration` and `paired/`.

To rebuild, run from the repository root:

```sh
node results/2026-10-11-merged/paired.mjs
node results/2026-10-11-merged/build.mjs
```

## Where each row comes from

| Run | Rows | Measured |
| --- | --- | --- |
| `matrix-2026-10-11` | Every CMP on every framework, except Next.js CookieYes | Overnight |
| `cookie-yes-hydration-2026-10-11` | Next.js CookieYes and its no-CMP page | Morning |

Both runs compress HTML at Brotli quality 5 and give mobile banners a 10 s window. That fixes the quality-11 bug and the 5 s window from the October 9 data.

Each row's `baseline` comes from its own run and host, and every delta compares a CMP with that baseline only. CookieYes only renders on its registered host, so its rows run in a separate batch with a no-CMP page on that host (`host: registered-host`).

### c15t on Next.js

The overnight build awaits `resolveConsent()` inside a Suspense boundary. c15t's documented default passes the promise to `ConsentRoot` unawaited, which streams. We compared the two builds afterwards: they serve identical HTML with the same TTFB, because consent resolves from the build-time manifest before React's first flush. The Next.js c15t numbers hold for the streamed layout too.

Either layout makes the c15t route dynamic, while the no-CMP page is prerendered. That's most of c15t's desktop TTFB and FCP cost on Next.js (+17 ms TTFB, +28 ms FCP). Nuxt, TanStack Start and Astro show smaller TTFB costs (+6 to +13 ms on desktop) for the same reason.

### CookieYes on Next.js loads after hydration

In the overnight run, the fixture added CookieYes's script in `<head>`, as on every other framework. On mobile Next.js, accept, reject and save all failed. The rerun waits until the page has hydrated, then adds the script, and all three flows pass. The row's `vendorTiming` reads `after-hydration`; every other competitor reads `head`, and c15t reads `bundled`.

The fix has a cost, so Next.js CookieYes isn't a like-for-like match with CookieYes on the other frameworks:

| Next.js CookieYes | Script in `<head>` (overnight) | After hydration (this dataset) |
| --- | --- | --- |
| Desktop banner visible | 291 ms | 387 ms |
| Mobile banner visible | 1,313 ms | 2,417 ms |
| Mobile LCP added | +156 ms | +176 ms |
| Mobile accept / reject | failed | verified |

## Which numbers to compare

- **Banner visible** and the **deltas** compare fairly across every row.
- **Absolute times** compare fairly within a framework, for rows from the same run and host. The CookieYes rows have their own registered-host baseline, and Next.js CookieYes is from the morning rerun. Show their absolute times next to their own baseline.

## Paired TTFB and FCP

The batch runner compares LCP, primary content paint, CLS and bytes. `paired.mjs` runs the same `compare` command for `page.ttfb` and `page.fcp` on the same envelopes.

The batch's comparisons form one Bonferroni family of 365 per profile. The TTFB and FCP comparisons form a separate family of 120 per profile: 60 CMP rows times two metrics. Their intervals are therefore slightly less conservative than the batch's, at the same 95% family-wise level.

## Known gaps

- **Osano accept and reject on mobile.** These checks fail on five frameworks and read failed or `unknown` on TanStack Start. The click works: the banner closes and consent takes effect. Afterwards, a page control doesn't respond (`followup:page-unresponsive`), so the harness fails the check. On desktop they pass, except on TanStack Start, where Osano's public consent state never became ready (`public-state-not-ready`) and accept, reject and save read `unknown`.
- **Nuxt Osano on desktop.** One of 15 load visits timed out navigating, so the row has 14 passed visits and no confidence intervals.
- **Ketch on mobile.** The banner shows at 7.5–8.5 s, inside the new 10 s window, so these rows have real values instead of "over 5 s".
- **No confidence interval on Enzuzo and Ketch.** Their remote script or config changed during the run, so the harness marks their artifact identity provisional and withholds intervals. The conclusion reads `inconclusive`, and the median difference is still there.
- **Nuxt decoded bytes on desktop.** The baseline is missing `initial.decoded-body` in some visits, so no Nuxt desktop row has an interval on decoded bytes. Transfer bytes are complete.
- **Save flows.** Cookie Control and CookieYes have no granular save flow, so `save` reads `unknown` for them.
- **CookieYes bytes.** The CookieYes site configuration has no cookies assigned, so its bytes are probably a few KB lower than a real site's.
- **One machine, one configuration per CMP.** Mobile is an emulated profile (about 200 KB/s and a slower CPU), not a real device.

## Fields

`medians` keys, all medians over passed load visits (15 per row unless `passed` says otherwise):

- `banner.visible`: ms from navigation to the banner showing.
- `page.ttfb`, `page.fcp`, `page.lcp`: ms.
- `page.primary-content-paint`: ms until the page's own main content paints.
- `page.cls`: layout shift score.
- `initial.long-task-blocking`: ms of main-thread blocking in the initial window.
- `initial.transfer`, `initial.decoded-body`: bytes over the wire and after decompression.
- `initial.requests`, `initial.third-party-requests`: request counts.
- `consent.resolution`: ms until the consent state is ready (c15t only).
- `document.decoded-body`: HTML size in bytes.

`vendorTiming` is how the CMP reaches the page: `bundled` (c15t, inside the app), `head` (a script in `<head>`), or `after-hydration` (a script added once the page has hydrated).

`paired` holds one entry per metric, measuring the CMP against its own baseline over 15 visit pairs. The metrics are `page.ttfb`, `page.fcp`, `page.lcp`, `page.primary-content-paint`, `page.cls`, `initial.transfer` and `initial.decoded-body`. Each entry has:

- `medianDifference`.
- `ci`, with `ciLevel`.
- `conclusion`: `candidate-higher`, `candidate-lower` or `inconclusive`.

`flows` holds `load`, `accept`, `reject` and `save`. Each is `verified`, `failed` or `unknown`.

`interactions` holds `accept`, `reject` and `save`, timed in the same consent-flow checks:

- `inputToNextPaint`: ms from the click on the banner button to the next paint, from the browser's Event Timing API, in 8 ms steps.
- `status`:
  - `measured`: there's a value.
  - `below-16ms`: the click took effect, but the browser reported no timing. It doesn't report interactions under 16 ms, so read it as "under 16 ms", not as zero.
  - `unknown`: nothing shows the click landed, for example because the banner never appeared.
- `visit`: the status of the visit the click came from (`passed`, `incomplete` or `failed`).
- `followupInputToNextPaint`, `followupStatus`: the same measurement for a click on a page control `followupOffsetMs` after the consent click, in a separate visit. It shows whether the page responds right after the banner closes.

These are lab click timings, not INP. Field INP is the slowest interaction over a whole page visit. There's one click per flow per framework, so they show outliers but can't rank CMPs that sit within 8 ms of each other.

The CSV has the same data as the JSON. The columns after `failure_reasons` are new since October 9:

- `vendor_timing`, `baseline_ttfb_ms`.
- `ttfb_added_ms`, `ttfb_added_low`, `ttfb_added_high`, `ttfb_conclusion`.
- `fcp_added_ms`, `fcp_added_low`, `fcp_added_high`, `fcp_conclusion`.
