# Round 8, lane `astro`: c15t canary on CookieBench `with-c15t-astro` (M1)

**Status: complete, 2026-11-05 02:30.** All 13 queued runs are done: 12
kept, plus CookieYes `save`, which can't be measured (its adapter has no
`save` selector). The first attempt hit a lock race in the runner, and I
aborted one queued attempt to swap runners. Both were rerun. Every timing here comes from this Mac (Apple M1 Pro, macOS 26),
with controls and CookieYes measured in the same session. Desktop-lane and
October numbers appear only where labelled.

## Summary

c15t canary `d4803ef60` on Astro meets 1 of 5 targets. The banner is server
HTML and shows at 254 ms, 22 ms after control FCP. CookieYes shows its banner
at 1,053 ms, so c15t is 799 ms earlier.

LCP misses by 176 ms. On mobile c15t adds **+352 ms (348 to 356)** over the
same build's no-CMP page, and CookieYes adds **+176 ms (168 to 184)**. The
gap is bytes. c15t finishes 72 KB more than control before the hero image
finishes, and at this profile's 200 KB/s each KB costs 5.1 ms. CookieYes adds
30 KB. To match CookieYes, c15t has to move about 38 KB out of the hero
window. The consent engine (`client.js`, 47.7 KB br) is more than that by
itself, and deferring it as the Next.js, React and Nuxt lanes did would land
around +110 to +125 ms.

Accept misses by about 10 ms. consent-effective is 50 ms against 41, and
scripts-complete is 188 ms against 177. The cause isn't attributed yet.

Customize misses the 1,000 ms ceiling: the dialog appears at 1,148 ms,
because its 73 KB of Svelte and UI chunks load in three dependent waves.

On desktop (12.5 MB/s, no throttle) the bytes barely matter. c15t adds +8 ms
LCP (0 to 16) and CookieYes adds +0 (0 to 12).

## Scorecard (mobile-article-v1)

| Target | c15t canary | CookieYes | Met | Source |
| --- | ---: | ---: | --- | --- |
| banner.visible earlier than CookieYes | 254 ms (224–276) | 1,053 ms (1,007–1,358) | **yes**, by 799 ms | kept `load` runs, median (min–max) |
| LCP Δ ≤ CookieYes | +352 (348 to 356) ms | +176 (168 to 184) ms | **no**, by 176 ms | kept `load` runs |
| accept consent-effective ≤ CookieYes | 50 ms (max 53) | 41 ms (max 45) | **no**, by 10 ms (8 to 12.5)¹ | kept `accept` runs, 10 samples each |
| accept scripts-complete < CookieYes | 188 ms (max 194) | 177 ms (max 184) | **no**, by 12 ms (5.5 to 15.5)¹ | kept `accept` runs |
| nothing from the tap over 1,000 ms | preferences-visible 1,148 ms (max 1,156) | n/a (CookieYes runs no `preferences`) | **no**, by 148 ms | kept `preferences` run, 10 samples; every other c15t action metric is ≤ 194 ms |

1. Unpaired: the two arms run in separate sessions against separate
   controls, so `compare` gives no c15t-vs-CookieYes interval. The interval
   is a 95% percentile bootstrap of the difference of medians (20,000
   resamples). The distributions do not overlap: c15t's fastest
   consent-effective (47 ms) is slower than CookieYes's slowest (45 ms).

## Mobile `load`, 15 pairs, seed 20261009, 3 warm-ups

| Arm | Run | Passed | Control FCP / LCP | LCP Δ (compare CI) | FCP Δ (CI) | banner.visible | transfer Δ B | requests Δ | long-task cand (ctrl) | load max |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t canary | `c15t-mobile-load-20261104-225222` | 15/15 | 232 / 2,844 | +352 (348 to 356) | +20 (16 to 28) | 254 | +76,648 (76,646 to 76,656) | +7 | 0 (0) | 8.15 |
| CookieYes | `cy-mobile-load-20261104-230007` | 15/15 | 224 / 2,848 | +176 (168 to 184) | +8 (4 to 16) | 1,053 | +30,316 (30,297 to 30,316) | +9 | 0 (0) | 5.79 |

Both arms: 15/15 samples passed, no long tasks in either arm. Each arm is
paired with its own control (`astro-baseline` for c15t,
`astro-baseline-registered-host` for CookieYes). The two controls agree to
within 8 ms FCP and 4 ms LCP.

## Desktop `load`, 15 pairs, seed 20261009, 3 warm-ups

Profile `desktop-article-v1-browser-ua`: 1365x768, DPR 1, no CPU throttle,
12.5 MB/s, 0 ms latency.

| Arm | Run | Passed | Control FCP / LCP | LCP Δ (compare CI) | FCP Δ (CI) | banner.visible | transfer Δ B | requests Δ | long-task cand (ctrl) | load max |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t canary | `c15t-desktop-load-20261105-013035` | 15/15 | 28 / 76 | +8 (0 to 16) | +8 (8 to 8) | 15 | +76,648 (76,647 to 76,696) | +7 | 0 (0) | 7.08 |
| CookieYes | `cy-desktop-load-20261105-022402` | 15/15 | 28 / 76 | +0 (0 to 12) | +0 (0 to 4) | 291 | +30,273 (30,271 to 30,277) | +9 | 0 (0) | 4.30 |

At 12.5 MB/s, 76.6 KB costs about 6 ms of line time, so the bytes that cost
352 ms on mobile cost 8 ms here. The LCP intervals overlap, so desktop LCP
can't separate the two arms. The banner still comes first with c15t: 15 ms
against CookieYes's 291 ms. CookieBench times `banner.visible` from layout
(the first observer tick where the element has a rendered footprint,
`runner/src/browser-observer.ts`), not from a paint entry. That is why
c15t's value can fall below FCP here.

## Mobile actions, 10 iterations, seed 20261009, 3 warm-ups

Candidate median / max (n). Times run from the tap. Controls have no banner,
so their action metrics are `required-measurement-unavailable`, as expected
(exit 2).

Banner visible in the accept runs: c15t 253 ms, CookieYes 1,077 ms. On accept
and reject, c15t trails CookieYes by 6–12 ms, less than one 60 Hz frame.
Apart from the Customize dialog, nothing in either arm comes near 1,000 ms
from the tap.

| Scenario | Arm | Run | Passed | Control FCP | input-to-next-paint | dismissed | consent-effective | scripts-complete | preferences-visible | load max |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| accept | c15t | `c15t-mobile-accept-20261104-234259` | 10/10 | 222 | 56 / 56 (10) | 50 / 53 (10) | 50 / 53 (10) | 188 / 194 (10) | — | 5.38 |
| accept | CookieYes | `cy-mobile-accept-20261104-234608` | 10/10 | 224 | 40 / 48 (10) | 41 / 45 (10) | 41 / 45 (10) | 177 / 184 (10) | — | 5.21 |
| reject | c15t | `c15t-mobile-reject-20261105-000248` | 10/10 | 226 | 48 / 56 (10) | 45 / 49 (10) | 45 / 49 (10) | — (nothing to load) | — | 4.95 |
| reject | CookieYes | `cy-mobile-reject-20261105-005501` | 10/10 | 226 | 40 / 48 (10) | 39 / 44 (10) | 39 / 44 (10) | — (nothing to load) | — | 4.57 |
| save | c15t | `c15t-mobile-save-20261105-000557` | 10/10 | 224 | 24 / 40 (10) | 19 / 23 (10) | 19 / 23 (10) | 171 / 174 (10) | — | 5.19 |
| save | CookieYes | `cy-mobile-save-20261105-012904` | 0/10 | — | not measurable: `unsupported-action` on all 10 samples (October's CookieYes adapter has no `save` selector) | | | | | 4.62 |
| preferences | c15t | `c15t-mobile-preferences-20261105-001147` | 10/10 | 222 | 48 / 56 (10) | 621 / 626 (10) | — | — | **1,148 / 1,156 (10)** | 4.16 |

`returning-accepted`, c15t, 10/10 (`c15t-mobile-returning-accepted-20261105-004525`,
warm cache, consent stored, control FCP 228, load max 4.88). Medians of
per-pair differences. `compare` refuses intervals here: it pairs only
fresh-visitor load scenarios.

| Metric | c15t | Control | Δ |
| --- | ---: | ---: | ---: |
| FCP | 248 | 228 | +20 |
| LCP | 262 | 228 | +38 |
| initial.transfer B | 13,170 | 1,970 | +11,200 |
| initial.requests | 12 | 4 | +8 (2 are the consented gated scripts) |
| first `/controlled/script` after navigation | 280 ms (max 292) | — | |
| long-task blocking | 0 | 0 | 0 |

All JS comes from cache on a return visit. The +11.2 KB is the document:
77,416 B decoded against 80,164 fresh, so a returning visitor with consent
already stored still downloads the 69 KB first-paint sheet and the config
JSON for a banner that never shows.

In `preferences`, `dismissed` is when the banner hides on the way to the
dialog.

**Why Customize takes 1.15 s.** The dialog is lazy, and its chunks arrive in
three dependent waves. Each wave waits for the previous one to download and
run. Median start after the tap, over 10 samples:

| Wave | Starts after tap | Requests | Transfer B |
| --- | ---: | --- | ---: |
| 1 | 3–5 ms | `svelte.js`, `dialog.css`, `primitives.css` | 9,796 |
| 2 | 168 ms | `index-client.js`, `snippet.js`, `panel-surface.js` | 26,204 |
| 3 | 618–620 ms | `panel.js`, `index.js` (svelte runtime, 20.6 KB), `theme-slots.js`, `preference-draft.js`, `policy-actions.js` | 37,303 |
| | | **11 requests** | **73,303** |

At 200 KB/s, 73.3 KB is 367 ms of transfer. The other ~780 ms is two
dependency hops (150 ms latency plus parse and run at 4x CPU each) and the
Svelte mount. The dialog becomes visible 528 ms after wave 3 starts.

## What loads, and where the bytes are

### Requests, c15t arm vs control (kept run, median start over 15 samples)

CookieBench records request starts, not ends. End times are in the
waterfall section below.

| Request | Start ms | Transfer B | In control | Note |
| --- | ---: | ---: | --- | --- |
| Document `/` | 0 | 13,102 | 1,970 | +11,132 B |
| `_astro/page.uX5u8Xi7.js` | 214 | 10,242 | no | Astro page script: script loader, client mode, transports |
| `page-assets/courtyard.png` (hero) | 249 | 493,920 | yes, starts at 183 | starts 66 ms later than control |
| 3 Astro component scripts (`prompt`, `panel`, `index.astro`) | 250 | 1,789 | no | banner click delegation, dialog link, fixture bridge |
| `_astro/client.BzHgniYz.js` | 423 | 47,672 | no | the consent engine |
| `_astro/browser.CZTzyqHL.js` | 440 | 1,127 | no | CookieBench fixture bridge (fixture code) |
| `page-assets/reading-list.js` | 1,093 | 916 | yes, at 220 | pushed back 873 ms |
| `page-assets/reading-list.json` | 1,257 | 1,142 | yes, at 380 | |
| `_astro/writer.Dhm8pbMG.js` | 6,194 | 4,686 | no | after the hero |
| **Total over control** | | **+76,648 / +7 requests** | | |

### Requests, CookieYes arm vs control (kept run)

| Request | Start ms | Transfer B | Note |
| --- | ---: | ---: | --- |
| Document (`/baseline/?cmp=cookie-yes`) | 0 | 3,083 | +1,113 B: head snippet |
| `page-assets/courtyard.png` (hero) | 183 | 493,920 | starts at 188 in control: no delay |
| `client_data/…/script.js` | 188 | 8,877 | loader |
| `api/v1/log` | 515 | 220 | ping |
| `client_data/…/banner.js` | 516 | 12,319 | banner |
| translations, config, audit table JSON | 802–1,234 | 3,912 | |
| 3 SVGs (`revisit`, `close`, `poweredbtcky`) | 1,051–1,402 | 3,852 | |
| **Total over control** | | **+30,316 / +9 requests** | all during the hero download |

CookieYes's document carries no styles or markup for the banner, so the hero
starts as early as in its control. c15t's +11 KB document and its
`page.js` in the head push the hero start back 66 ms.

### Waterfall: what finishes before the hero (own Playwright script, 5 pairs)

`bin/waterfall-astro.mjs`, ported from the desktop with macOS load sampling.
Mobile profile reproduced over CDP (390x844 DPR 3, 4x CPU, 200,000 B/s,
150 ms). Fresh context per visit, control and candidate alternating, run
under the machine lock at load max 4.48. Run dir `c15t-waterfall-20261104-234844`.

| Median over 5 pairs | Control | c15t | Δ |
| --- | ---: | ---: | ---: |
| LCP (own PerformanceObserver) | 2,828 | 3,192 | +364 |
| FCP | 216 | 244 | +28 |
| Banner visible (rAF poll) | — | 268 | |
| Hero start | 175 | 243 | +68 |
| Hero end | 2,818 | 3,185 | +367 |
| Bytes finished before hero end, excluding hero | 4,028 (3 req) | 75,988 (9 req) | **+71,960 (+6 req)** |

The pairs barely vary: c15t LCP 3,192–3,208, control 2,816–2,844, bytes before
the hero within 6 B. The own-script LCP delta (+364) matches CookieBench's
(+352, 348 to 356).

**Slope: +367 ms hero end for +72.0 KB, 5.1 ms per KB**, the same as the
profile's 200 KB/s line rate (5.0 ms/KB). Of the 367 ms, 68 ms is the later
hero start (the +11 KB document and head `page.js` go first) and 299 ms is
the hero downloading more slowly while sharing the link.

Representative c15t visit (pair 1, LCP 3,192, hero 245–3,187 ms):

| # | Request | Transfer B | Start–end ms | Finished before hero | In control |
| ---: | --- | ---: | --- | --- | --- |
| 1 | Document `/` | 13,105 | 0–222 | yes | 1,970 B, 0–169 |
| 2 | `_astro/page.uX5u8Xi7.js` | 10,242 | 215–469 | yes | no |
| 3 | `page-assets/courtyard.png` (hero) | 493,920 | 245–3,187 | — | 176–2,825 |
| 4–6 | `prompt`, `panel`, `index.astro` component scripts | 1,789 | 246–435 | yes | no |
| 7 | `_astro/client.BzHgniYz.js` | 47,672 | 418–1,057 | yes | no |
| 8 | `_astro/browser.CZTzyqHL.js` (fixture bridge) | 1,127 | 436–606 | yes | no |
| 9–10 | `reading-list.js`, `reading-list.json` | 2,058 | 1,089–1,416 | yes | yes, 184–517 |

Every c15t byte of the first load except `writer.js` (4.7 KB, fetched at
about 6.2 s) finishes before the hero. Nothing c15t loads is lazy relative
to the hero.

### What those 72 KB are

| Part | Transfer B over control | Share of 72.0 KB | Content |
| --- | ---: | ---: | --- |
| `client.BzHgniYz.js` | 47,672 | 66% | consent engine: `@c15t/core` kernel, persistence, libs, consent record, runtime; `@c15t/schema`; `@c15t/astro/client`; translations; `@c15t/ui/utils` |
| Document HTML | +11,135 | 15% | first-paint sheet (69.4 KB raw, ~7.7 KB br), config JSON (3.5 KB raw, ~1.2 KB br), banner markup (~0.7 KB br) |
| `page.uX5u8Xi7.js` | 10,242 | 14% | script loader, client mode, transports |
| 3 component scripts | 1,789 | 2% | banner click delegation, dialog link, fixture bridge entry |
| `browser.CZTzyqHL.js` | 1,127 | 2% | CookieBench fixture bridge (fixture code, not c15t) |
| **Total** | **71,965** | | |

The document is byte-identical to the desktop's (80,164 B decoded), so the
desktop's brotli split of the HTML holds. Inside the 69.4 KB first-paint
sheet, by raw bytes: `:root` theme tokens 11.7 KB, button 11.0 KB, `.c15t-dark`
8.2 KB, root 8.2 KB, branding 6.3 KB, toolbar 4.3 KB, trigger 4.0 KB, theme
root 3.3 KB, action 2.3 KB, banner 1.3 KB. Under 4 KB of it styles the
banner itself.

### Package attribution (static, from the desktop's source-mapped rebuild)

This Mac's build has the same content hashes as the desktop's for
`client.BzHgniYz.js`, `browser.CZTzyqHL.js`, `writer.Dhm8pbMG.js` and the
three component scripts, so the desktop's attribution of those chunks holds
byte for byte. `page.js` differs (`uX5u8Xi7`, 10,242 B here; `DX6gX_0K`,
10,251 B on the desktop), so its split is approximate.

First-load JS, 58.2 KB br over 6 chunks, by package (desktop's
source-mapped rebuild; chunk names and sizes match this build except
`page.js`):

| Package | Raw B | Brotli B (est.) |
| --- | ---: | ---: |
| `@c15t/core` | 151,524 | 44,466 |
| `@c15t/astro` | 15,322 | 4,487 |
| `@c15t/schema` | 13,528 | 3,909 |
| `@c15t/translations` | 6,800 | 1,950 |
| `@c15t/ui` | 5,592 | 1,606 |
| fixture code (`fixture-support`, page script) | 2,536 | 1,010 |
| unmapped | 2,361 | 771 |

| Area | Brotli B (est.) | Chunk |
| --- | ---: | --- |
| `@c15t/core/kernel` (choice, init lifecycle, patch, snapshot, save outbox) | 12,141 | client |
| `@c15t/core/modules/persistence` | 7,083 | client |
| `@c15t/core/modules/script-loader` | 5,622 | page |
| `@c15t/core/libs` (vendors, experiment, cookies, journey) | 5,405 | client |
| `@c15t/core/runtime` (client mode, assemble, runtime kernel) | 4,438 | page + client |
| `@c15t/schema/shared` | 3,909 | client |
| `@c15t/core/consent-record` | 3,140 | client |
| `@c15t/astro/client` | 3,066 | client |
| `@c15t/core/transports` | 1,730 | page |
| `@c15t/translations` | 1,652 | client |
| `@c15t/ui/utils` (dom) | 1,584 | client |
| iframe-blocker, has, network-blocker, astro inline scripts | 3,621 | client |

There is no Svelte in the first load. `@c15t/astro` renders the banner as
server HTML, and a delegated click handler drives it. Svelte, `@c15t/svelte`
and the `@c15t/ui` dialog (about 65 KB br plus 8.8 KB CSS, per the desktop's
attribution) load only on Customize.

## What is left

Slope measured here: 5.1 ms of hero delay per KB that finishes before the
hero (waterfall, 367 ms for 72.0 KB). CookieYes fits the same line: +176 ms
for 30.3 KB, all during the hero download, is 5.8 ms per KB. To match
CookieYes's +176 ms, c15t must keep at most about 34 KB in the hero window,
so it has to move about **38 KB** out.

| Missed target | Change | KB out of the hero window | LCP estimate |
| --- | --- | ---: | ---: |
| LCP Δ ≤ CookieYes (gap 176 ms) | Defer `client.js` (engine, 47.7 KB) until after the hero has loaded or the first input, as the Next.js, React and Nuxt lanes did. Taps before the engine arrives need an instant-commit path in the server-rendered banner's click handler. | 47.7 | −240 ms → about +110 to +125 ms |
| same | Banner-only first-paint sheet: ship toolbar, trigger, branding, dark tokens and unused button variants after paint | ~5–6 of the 7.7 br | −25 to −30 ms |
| same | Load the script loader lazily: `page.js` imports it statically (10.2 KB, of which script-loader ~5.6) | up to ~6 | up to −30 ms |
| same | Start the hero earlier: the +11 KB document and head `page.js` delay the hero start by 68 ms. A smaller sheet and a deferred `page.js` give some of it back. | (included above) | part of the −68 ms start delay |
| accept consent-effective ≤ CookieYes (gap 10 ms, 8 to 12.5) and scripts-complete (gap 12 ms) | Not attributed: the accept runs record no trace. 10 ms at 4x CPU is about 2.5 ms of real main-thread work between the tap and the dismissed banner. The next step is a performance trace of the accept handler (`@c15t/astro/client` delegation → kernel choice → persistence write). | — | −10 ms needed |
| none (returning visits) | Skip the first-paint sheet and banner markup when the request carries stored consent (the server already reads the cookie to decide not to show the banner) | ~10 KB br per returning visit | the +20 ms FCP and some of the +38 ms LCP on returning visits; not measured |
| nothing over 1,000 ms (preferences-visible 1,148) | Flatten the dialog's three waves into one: emit `modulepreload` for the wave 2 and 3 chunks when the Customize tap lands (or on pointerdown), so all 11 requests start together | 0 (same 73 KB, after the tap) | about −450 to −600 ms (two dependency hops), to roughly 550–700 ms. Not measured. |
| same | Or prefetch the dialog group at idle after the hero has loaded | 0 in the hero window | to about the mount time (~150–250 ms). Not measured. |

Deferring the engine alone clears the LCP target if the slope holds (72 −
47.7 = 24 KB left, about +125 ms with the start delay). That moves accept
onto the instant-commit path, so the accept numbers would need measuring
again.

## Run ledger

`frameworks/astro/runs/ledger.log`, one line per attempt. Control FCP is the median.

| Time | Verdict | Run | Reason | Control FCP | Load max |
| --- | --- | --- | --- | ---: | ---: |
| 22:51 | DISCARD | `_discarded-c15t-mobile-load-20261104-224026` | no envelope: runner lost the lock-recovery race (`EEXIST … lock.recovery`)¹ | — | 4.28 |
| 22:52 | DISCARD | `_discarded-c15t-mobile-load-20261104-225142` | aborted while queued on the lock, never measured (runner swap)¹ | — | — |
| 23:00 | KEEP | `c15t-mobile-load-20261104-225222` | gates passed | 232 | 8.15 |
| 23:42 | KEEP | `cy-mobile-load-20261104-230007` | gates passed (started 23:36 after a 36 min gate and lock wait) | 224 | 5.79 |
| 23:46 | KEEP | `c15t-mobile-accept-20261104-234259` | gates passed (exit 2: control incomplete, expected) | 222 | 5.38 |
| 23:48 | KEEP | `cy-mobile-accept-20261104-234608` | gates passed (exit 2: control incomplete, expected) | 224 | 5.21 |
| 00:02 | KEEP | `c15t-waterfall-20261104-234844` | waterfall, 5 pairs, exit 0 | 216 (own script) | 4.48 |
| 00:05 | KEEP | `c15t-mobile-reject-20261105-000248` | gates passed (exit 2: control incomplete, expected) | 226 | 4.95 |
| 00:11 | KEEP | `c15t-mobile-save-20261105-000557` | gates passed (exit 2: control incomplete, expected) | 224 | 5.19 |
| 00:45 | KEEP | `c15t-mobile-preferences-20261105-001147` | gates passed (exit 2: control incomplete, expected) | 222 | 4.16 |
| 00:55 | KEEP | `c15t-mobile-returning-accepted-20261105-004525` | gates passed | 228 | 4.88 |
| 01:29 | KEEP | `cy-mobile-reject-20261105-005501` | gates passed (exit 2: control incomplete, expected) | 226 | 4.57 |
| 01:30 | DISCARD | `cy-mobile-save-20261105-012904` | `unsupported-action` ×10, as expected (adapter has no `save` selector); not retried | — | 4.62 |
| 02:24 | KEEP | `c15t-desktop-load-20261105-013035` | gates passed (no FCP limit on desktop; waited 53 min for the lock) | 28 | 7.08 |
| 02:27 | KEEP | `cy-desktop-load-20261105-022402` | gates passed | 28 | 4.30 |

1. When two runners find the lock taken at the same moment, CookieBench's
   stale-lock check (`packages/runner/src/lifecycle.ts`, `measurementLock`)
   lets one take `cookiebench-v3-measurement.lock.recovery` and the other
   exits with `EEXIST`. The shared `tools/bin/cb-run.sh` only retries on
   "Another measured workload is active". This lane now uses
   `frameworks/astro/bin/cb-run.sh`, the same script with that error added to
   the retry match. The other lanes still use the shared script and can hit
   the same race.

## Caveats

- Waterfall timings come from the lane's own Playwright script, not
  CookieBench. They agree with CookieBench's LCP delta to 12 ms.
- No kept run waited out the 30-minute load gate. Every kept run's max
  1-minute load was ≤ 8.15, under the discard limit of 10. The highest was
  the c15t mobile `load` (8.15; median 5.51). Every mobile control FCP median
  was 222–232 ms, under the 400 ms limit.
- The CookieYes arm loads its script and assets from the registered host
  `benchmarks-with-cookie-yes.vercel.app`, resolved to 127.0.0.1 through the
  fixture's TLS port 4615. Both arms' bytes are served locally under the same
  throttle.
- The cross-arm accept intervals are unpaired bootstraps (see the scorecard
  note). `compare` intervals are paired against each arm's own control.
- The package attribution and the HTML split come from the desktop lane's
  source-mapped build. They are static, and this build's chunk hashes match
  the desktop's (except `page.js`). The c15t-only bytes and the waterfall
  were measured here.
- Seed 20261009 on the command line (October's astro configs say 42).
- `browser.CZTzyqHL.js` (1.1 KB) is CookieBench's fixture bridge. It ships
  only in the c15t arm, so it counts against c15t in `initial.transfer`.

## Artifacts

Under `/Users/kayleewilliams/.t3/scratch/lcp-fleet/frameworks/astro/`:
`configs/`, `bin/` (`queue.sh`, `cb-run.sh`, `check.py`, `table.py`, `md.py`,
`requests.py`, `waterfall.sh`, `waterfall-astro.mjs`), `runs/` (every
attempt; discarded ones prefixed `_discarded-`), `runs/ledger.log`,
`runs/queue.log`. Report tables regenerate with `python3 -I bin/md.py`.
Shared setup notes: `/Users/kayleewilliams/.t3/scratch/lcp-fleet/SETUP.md`.
