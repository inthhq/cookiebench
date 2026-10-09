# Cookiebench framework matrix, October 9 2026

Ten CMPs on six frameworks, desktop and mobile. The c15t rows are 3.0.0-alpha.9. Every other CMP comes from the overnight matrix.

## Files

- `matrix-desktop.json`, `matrix-mobile.json`: one entry per framework, with one product per CMP. Each product carries its medians, its own no-CMP baseline, paired deltas against that baseline, its consent-flow checks, and the click timing from each flow.
- `matrix.csv`: the same rows flattened, both profiles in one file.
- `build.mjs`: rebuilds the three files from `../2026-10-09` and `../2026-10-09-alpha9`. Run `node results/2026-10-09-merged/build.mjs` from the repository root.

## Where each row comes from

| Run | Rows | Measured | HTML Brotli quality |
| --- | --- | --- | --- |
| `matrix-2026-10-09` | CookieYes, Cookie Control, Didomi, Enzuzo, iubenda, Ketch, OneTrust, Osano, Usercentrics | Overnight | 11 |
| `c15t-alpha9-2026-10-09` | c15t 3.0.0-alpha.9 | Afternoon, one framework at a time | 5 |

The two runs used different builds of the same fixtures and measured their own no-CMP pages. Each row's `baseline` is the one from its own run, and the deltas only ever compare a CMP with that baseline.

CookieYes only renders on its registered host, so it ran in a separate batch with its own baseline on that host (`host: registered-host`).

## Which numbers to compare across rows

- **Banner visible** and the **deltas** (LCP added, bytes added) compare fairly across every row.
- **Mobile absolute numbers** compare fairly too. The two runs' mobile baselines agree within 8 ms on FCP and LCP.
- **Desktop absolute FCP and LCP** don't line up exactly. On desktop, the overnight baselines ran 0–24 ms slower on the server-rendered frameworks, partly from the quality-11 Brotli bug described below. If the UI shows desktop FCP or LCP as plain numbers, show them next to the row's own baseline.

Desktop baselines, TTFB / FCP / LCP in ms:

| Framework | Overnight matrix | alpha.9 run |
| --- | --- | --- |
| Next.js | 25 / 92 / 144 | 7 / 68 / 128 |
| Nuxt | 17 / 64 / 128 | 6 / 48 / 120 |
| Astro | 15 / 80 / 108 | 5 / 68 / 96 |
| TanStack Start | 11 / 68 / 124 | 9 / 68 / 128 |
| React | 2 / 72 / 132 | 2 / 80 / 144 |
| Script tag | 2 / 64 / 104 | 2 / 44 / 108 |

## The Brotli bug in the overnight rows

The fixture proxy compressed streamed HTML at Brotli quality 11. That cost about 100 ms on c15t alpha.9's 90 KB page, and the fix drops it to quality 5, as production hosts use. The competitor pages are 7–15 KB, about 3 KB over their baseline, so the bug added roughly the same few milliseconds to a competitor and to its baseline. Their deltas barely move; their desktop absolute times run a little high. The overnight matrix needs a rerun under the fix before these numbers are final.

## Known gaps

- **Osano bytes.** Osano starts a Web Worker, and the collector can't prove it saw every worker request, so it withholds byte and request totals. Osano rows have `passed: 0` and `sampleBasis: "incomplete"`. Their timings are medians over the incomplete visits, and their flow checks read `unknown`.
- **Ketch on mobile.** The banner never appeared within the 5 s observation window on any of the 15 visits per framework. Treat it as "over 5 s", not as missing data. The desktop banner takes about 1.7 s.
- **Save flows.** Cookie Control and CookieYes have no granular save flow, so `save` reads `unknown` for them.
- **Flow checks that failed.** Each flow check is one attempt, so a single failure may be noise:
  - Mobile Next.js: iubenda save; CookieYes accept and reject.
  - Mobile Nuxt and TanStack Start: Didomi reject.
  - Mobile script tag: Enzuzo reject; iubenda load.
  - Desktop React: Ketch save reads `unknown`.
  - Desktop Next.js: c15t accept reads `unknown`. The harness flagged one lazy chunk as a cold server encode (18 ms), so it withheld a verdict.
- **Confidence intervals.** Some rows (Enzuzo, Ketch, Osano) have no confidence interval on the LCP delta, and their conclusion reads `inconclusive`. The median difference is still there.

## Fields

`medians` keys, all medians over passed load visits (15 per row):

- `banner.visible`: ms from navigation to the banner showing.
- `page.ttfb`, `page.fcp`, `page.lcp`: ms.
- `page.primary-content-paint`: ms until the page's own main content paints.
- `page.cls`: layout shift score.
- `initial.long-task-blocking`: ms of main-thread blocking in the initial window.
- `initial.transfer`, `initial.decoded-body`: bytes over the wire and after decompression.
- `initial.requests`, `initial.third-party-requests`: request counts.
- `consent.resolution`: ms until the consent state is ready (c15t only).
- `document.decoded-body`: HTML size in bytes.

`paired` holds one entry per metric, measuring the CMP against its own baseline over 15 visit pairs:

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
- `visit`: the status of the visit the click came from (`passed`, `incomplete` or `failed`). Osano's visits are all `incomplete` for the byte-accounting reason above, but their click timings still stand.
- `followupInputToNextPaint`, `followupStatus`: the same measurement for a click on a page control `followupOffsetMs` after the consent click, in a separate visit. It shows whether the page responds right after the banner closes.

The CSV carries `accept_inp_ms`, `accept_inp_status` and the same pair for reject and save.

These are lab click timings, not INP. Field INP is the slowest interaction over a whole page visit. There's one click per flow per framework, so they show outliers, such as Didomi's mobile save at 104–120 ms, but can't rank CMPs that sit within 8 ms of each other. `page.lab-inp` is left out: load visits make no clicks, so the harness withholds it.
