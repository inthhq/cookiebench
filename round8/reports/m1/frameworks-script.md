# Round 8 on the M1, lane `script`: c15t canary as the `@c15t/browser` script tag

**Status: final, 2026-11-05 02:20. Queue complete. 13 rows kept (11 CookieBench runs and 2 waterfalls). CookieYes `save` is unsupported by its adapter.**

Fixture `with-c15t-script`, October's `inth-init` variant: `/?scripts=2`, a classic
`<script src="/vendor/c15t.js" data-manual>` at the end of `<body>`, then the fixture calls
`c15t.init()` against the Inth backend (`benchmarks-inth.inth.app`). c15t canary
`d4803ef60`. The served `dist/vendor/c15t.js` is byte-identical to the packed
`@c15t/browser` tarball's (sha256 `5fdb54a0…`, 371,839 B raw, 85,272 B Brotli 11).
Machine: Apple M1 Pro, macOS 26. **Every timing in this report was measured on this Mac**,
except numbers labelled *October* or *desktop*.

## Summary

c15t canary as a script tag does not meet the bar on mobile today. Both load targets
miss by a wide margin and both accept targets miss by a few milliseconds:

- **LCP:** +456 ms (452–464) against CookieYes's +172 (160–184) on this Mac, a 284 ms gap.
  The single 85.7 KB `c15t.js` is requested at 176 ms, the same moment as the hero, and
  all of it finishes before the hero does: 88.5 KB over control against CookieYes's
  30.3 KB. At the slope measured here (4.9 ms per KB), matching CookieYes means carrying
  about 30 KB before the hero, 58 KB less than today.
- **Banner:** 1,602 ms against CookieYes's 1,089. The banner can't show until `c15t.js`
  has downloaded (ends 1,229 ms) and run, and then the cross-origin `/init` (1,263–1,512)
  has returned.
- **Accept:** consent-effective 45 ms median against 39, and scripts-complete 180 against
  177.
- **What passes:** nothing measured from a tap reaches 1,000 ms (the largest is 184 ms).
  On desktop, c15t beats CookieYes on both LCP (+4 vs +12) and banner (290 vs 373 ms).
- **Headless variant:** with the fixture's own banner markup and the 46.3 KB headless
  bundle, the LCP delta drops to +288 ms and the banner to 1,149 ms. It still misses
  both targets, by 116 ms and 60 ms.

## Scorecard (mobile-article-v1, this Mac, same session)

| Target | c15t canary | CookieYes | Met |
| --- | --- | --- | --- |
| banner.visible earlier than CookieYes | 1,602 ms median (1,537–1,696) | 1,089 (1,022–1,204) | **no**, +513 ms |
| LCP Δ at or below CookieYes | +456 (452–464) | +172 (160–184) | **no**, +284 ms |
| accept consent-effective ≤ CookieYes | 45 median, max 47 | 39, max 50 | **no** on median (+6 ms); yes on max |
| accept scripts-complete < CookieYes | 180 median, max 184 | 177, max 180 | **no**, +3 ms median, +4 ms max |
| nothing from the tap over 1,000 ms | largest 184 ms (accept scripts-complete max) | — | **yes** |

Headless variant, for reference: banner 1,149 ms (no, +60 ms) and LCP +288 (284–300)
(no, +116 ms).

## Mobile `mobile-article-v1`

`load` runs 15 pairs and the action scenarios 10 iterations, each with 3 warm-ups and
seed 20261009. Deltas and intervals come from CookieBench `compare` (95% paired bootstrap).
Each arm has its own paired control from the same server: `/baseline` for c15t and
headless, and `/baseline` on the registered host over TLS for CookieYes.

| Measure | c15t canary | CookieYes | c15t headless |
| --- | ---: | ---: | ---: |
| **LCP Δ vs control (95% CI)** | **+456 (452–464)** | **+172 (160–184)** | **+288 (284–300)** |
| LCP, candidate / control median | 3,312 / 2,860 | 3,040 / 2,860 | 3,144 / 2,856 |
| FCP Δ (95% CI) | 0 (−4–4) | +4 (−8–12) | +4 (0–16) |
| FCP, candidate / control median | 228 / 228 | 236 / 232 | 224 / 220 |
| **banner.visible** median (min–max) | **1,602 (1,537–1,696)** | **1,089 (1,022–1,204)** | **1,149 (1,120–1,241)** |
| consent.resolution median | 1,546 | not reported | 1,141 |
| initial.transfer Δ (B, 10 s window) | +88,553 | +30,305 | +60,264¹ |
| initial.requests Δ | +3 | +9 | +4 |
| initial.long-task-blocking (candidate median) | 0 | 0 | 0 |
| `/init` start, median-LCP sample | 1,267 | — | 867 |
| `accept` consent-effective median (max) | 45 (47) | 39 (50) | not run |
| `accept` scripts-complete median (max) | 180 (184) | 177 (180) | not run |
| `accept` dismissed median (max) | 75 (84) | 39 (50) | not run |
| `accept` input-to-next-paint median (max) | 48 (72) | 40 (56) | not run |
| `reject` consent-effective median (max) | 42 (48) | 40 (43) | not run |
| `reject` dismissed median (max) | 67 (81) | 40 (43) | not run |
| `reject` input-to-next-paint median (max) | 48 (64) | 40 (48) | not run |
| `save` consent-effective median (max) | 13 (17) | unsupported² | not run |
| `save` scripts-complete median (max) | 171 (174) | unsupported² | not run |
| `save` dismissed median (max) | 169 (173) | unsupported² | not run |
| `save` input-to-next-paint median (max) | 16 (24) | unsupported² | not run |
| `preferences` dialog visible median (max) | 80 (83) | not in config | not run |
| `preferences` input-to-next-paint median (max) | 76 (80) | not in config | not run |
| `returning-accepted` page.lcp, candidate / control | 234 / 236 | not in config | not run |
| `returning-accepted` first gated script from navigation, median (max) | 581 (589) | not in config | not run |
| `returning-accepted` initial.transfer (warm cache) | 5,671 B | not in config | not run |

1. Includes `writer-*.js` (4,576 B), which the headless build fetches lazily at about
   6.2 s, after the hero. Bytes requested before the hero are about 55.7 KB over control.
2. The CookieYes adapter declares no `save` action. All 10 samples of the one attempt
   failed `unsupported-action`, so I stopped the retries.

`returning-accepted` (warm cache, stored accepted consent): c15t still calls `/init`
(starts at 406 ms) before it loads the two gated scripts (587–588 ms), so the stored
choice waits on a cross-origin round trip.

## Desktop `desktop-article-v1-browser-ua`, `load`, 15 pairs

| Measure | c15t canary | CookieYes |
| --- | ---: | ---: |
| **LCP Δ vs control (95% CI)** | **+4 (4–8)** | +12 (12–12) |
| LCP, candidate / control median | 80 / 76 | 76 / 64 |
| FCP Δ (95% CI) | 0 (−4–0) | +4 (4–4) |
| **banner.visible** median (min–max) | **290 (189–422)** | 373 (274–673) |
| initial.transfer Δ (B) | +88,471 | +30,282 |
| initial.requests Δ | +3 | +9 |
| initial.long-task-blocking | 0 | 0 |

On desktop, c15t meets both load targets.

## Waterfall: what finishes before the hero ends (own Playwright, 5 pairs each)

`bin/waterfall-script.mjs` is a macOS port of the desktop lane's script. It reproduces the
mobile profile over CDP, uses a fresh context per visit, alternates control and candidate,
and runs under the shared lock. Runs: `wf-m-c15t-20261105-003741` (load max 4.4) and
`wf-m-cy-20261105-003830` (load max 4.3).

| Arm | LCP control / candidate (median) | Hero end Δ | Requests before hero end (control 5) | **Bytes before hero end, over control** | Banner (rAF poll) median |
| --- | ---: | ---: | ---: | ---: | ---: |
| c15t canary | 2,844 / 3,304 | +465 | 8 | **+88,472** | 1,556 |
| CookieYes | 2,852 / 3,024 | +177 | 14 | **+30,309** | 1,098 |

All five c15t candidate visits land within 8 ms of each other (LCP 3,296–3,304), and the
byte counts repeat within 10 B.

**c15t, median visit (pair 2), requests not in control:**

| Request | Transfer B | Start–end ms | What it is |
| --- | ---: | --- | --- |
| `/vendor/c15t.js` | 85,693 | 176–1,229 | engine, UI and stylesheet in one parser-blocking classic script |
| document (+87 B over control) | 1,796 | 0–170 | the `<script>` tag and modulepreloads |
| `/assets/cmp-*.js` | 759 | 175–342 | fixture bridge (`c15t.init`, `__cookiebench`) |
| `/assets/dom-*.js` | 523 | 175–366 | fixture helper |
| `benchmarks-inth.inth.app/init` | 1,875 | 1,263–1,512 | cross-origin init, starts 34 ms after `c15t.js` ends |

The article's own `reading-list.js` starts at 1,239 ms here, against 352 ms in the control,
because `c15t.js` blocks the parser for about 890 ms.

**CookieYes, median visit (pair 3):** `script.js` 8,878 B (180–469), then `banner.js`
12,319 B (484–779), the `log` ping 221 B, translations 1,031 B, config 1,983 B, audit table
899 B and three SVGs 3,854 B, plus 1,124 B more in the document. All of it finishes before
the hero ends. Its banner shows at 1,012, 1,062 and 1,098 ms in three visits and at 1,328
and 1,662 ms in the other two.

### `c15t.js` by package

The attribution below is static. It comes from the *desktop* lane's source-mapped attribution of
the same `d4803ef60` file, which has the same sha256 as this Mac's copy (85,272 B Brotli 11,
100,825 B gzip 9 measured here).

| Area | Raw B | Brotli share B |
| --- | ---: | ---: |
| `@c15t/core` (kernel, persistence, script loader, transports, runtime) | 185,133 | 48,891 |
| `@c15t/browser` stylesheet held as a JS string (`generated/styles.ts`) | 105,705 | 11,350 |
| `@c15t/browser` UI (banner, dialog, widget, vendor list, trigger, branding) | 31,034 | 8,665 |
| `@c15t/browser` client, global, auto-init, gated scripts | 15,689 | 5,145 |
| `@c15t/ui` (theme utils, DOM utils) | 12,353 | 4,172 |
| `@c15t/schema` (policy-resolution wire reader, rule invariants) | 12,657 | 3,792 |
| `@c15t/translations` | 7,179 | 2,355 |
| runtime, unmapped, valibot | 2,082 | 903 |

The rspack build inlines everything. It has no `import()`, and the dialog and writer are
bundled statically.

### Headless variant (what it is)

`headless.html?scripts=2` (`run-headless.json`, fixture `script-tag-c15t-headless`). The
page ships its own banner markup, hidden, in the HTML. A Vite ES module
(`headless-*.js`, 166,031 B raw, **46,260 B br**) imports `@c15t/browser/headless` and
unhides the banner when the snapshot's `activeUI` is `banner`. It has no stock UI and no
c15t stylesheet. `loader-and-blocker-*.js` (6,394 B br) loads after `/init`, and
`writer-*.js` (4,156 B br) loads lazily at about 6.2 s. The mobile `load` row took 6.6 min
of lock time.

## What is left

**Slope.** Between the two arms, LCP rises by 4.9 ms per KB finished before the hero:
(456 − 172) / (88.5 − 30.3 KB). The headless row agrees: 5.1 ms per KB from c15t to
headless, and 4.6 from headless to CookieYes.

| Target | Gap | What would close it | Estimate at 4.9 ms/KB |
| --- | --- | --- | --- |
| LCP ≤ CookieYes (+172) | 284 ms, ~58 KB | Split the script tag into a small first stage (banner markup, critical CSS, early-tap capture, the `/init` call) and an engine loaded after the hero, as the deferred-engine branches do for React, Next.js and Nuxt. `rslib.config.ts` uses `create-runtime-static` and inlines the dialog and writer, so this build has no chunk loading today. | First stage ≤ ~30 KB br before the hero |
| | | Ship the stylesheet as CSS (a `<link>` or a first-paint subset) instead of a 105.7 KB raw JS string. | −11.4 KB ≈ −56 ms |
| | | Load the dialog, widget and vendor list on Customize. | −8.7 KB ≈ −43 ms |
| | | Measured reference: the headless bundle (no stock UI or stylesheet) cuts 33 KB and 168 ms. It still sits 116 ms above CookieYes. | another ~24 KB from the engine |
| banner < CookieYes (1,089) | 513 ms | Start `/init` from the head, not from inside `c15t.js` after it has run. In both builds the banner follows the `/init` start by about 290 ms (c15t 1,267 → 1,602; headless 867 → 1,149), so every millisecond `/init` starts earlier comes off the banner until the UI code becomes the limit. To beat 1,089 ms, `/init` has to start before ~800 ms. | `/init` at ~180 ms puts the banner near 500 ms, if the banner's code has arrived |
| | | Render the banner from that small first stage. Today it waits for all 85.7 KB, which share the link with the hero (176–1,229 ms). A ~20 KB first stage would finish around 430 ms at the ~81 B/ms `c15t.js` got here. | banner ≈ max(first stage, `/init` end) + render |
| | | `returning-accepted`: let stored consent load gated scripts without waiting for `/init` (today 406 → 587 ms). | ~180 ms earlier gated scripts for returning visitors |
| accept consent-effective ≤ 39 | +6 ms median | Not profiled. CookieYes hides the banner in the same frame it records consent (dismissed = consent-effective, 39 ms). c15t's consent-effective lands at 45 ms and dismissal at 75. | — |
| accept scripts-complete < 177 | +3 ms median, +4 max | Gated scripts start after consent-effective, so this follows the 6 ms above. Both arms pay the same 150 ms latency for `/controlled/script`. | closes if consent-effective does |

The fixture puts `c15t.js` at the end of `<body>` with no `defer`; the docs show the tag
in `<head>` with `defer`. Adding `defer` would stop the parser block (`reading-list.js`
+890 ms) but not the byte contention with the hero, so I expect no LCP change. Not measured.

## Run ledger

`frameworks/script/runs/ledger.log` has one line per attempt (KEEP, DISCARD, LOCKRACE,
ABORT, GAVE-UP). Gate: 1-minute load ≤ 6 to start. Discard on any 30 s sample > 10, a
control FCP median > 400 ms (mobile), or any failed sample other than a control's
`required-measurement-unavailable` on action scenarios.

| Finished | Verdict | Label | Run dir | Control FCP median (min–max) | Load median / max | Note |
| --- | --- | --- | --- | ---: | ---: | --- |
| 22:43–22:49 | DISCARD ×4, GAVE-UP | m-c15t-load | `_discarded-m-c15t-load-20261104-22{4048,4312,4611,4755}` | — | ≤ 5.4 | runner exited on `EEXIST … lock.recovery` before measuring |
| 22:52 | DISCARD | m-cy-load | `_discarded-m-cy-load-20261104-224938` | — | 5.0 | same lock race, never measured |
| 23:11 | ABORT | m-cy-load | `_aborted-m-cy-load-20261104-225223` | — | — | stopped in the gate to restart with race handling |
| 23:33 | LOCKRACE ×2 | m-c15t-load | removed | — | — | race, retried, not counted |
| 23:55 | **KEEP** | m-c15t-load | `m-c15t-load-20261104-233403` | 228 (220–252) | 4.69 / 7.45 | 15/15 + 15/15 |
| 00:02 | DISCARD | m-cy-load | `_discarded-m-cy-load-20261104-235524` | 228 (216–252) | 4.75 / 6.67 | 1 CookieYes `banner-missing`: CDN `script.js` 0 B, no status |
| 00:32 | **KEEP** | m-cy-load | `m-cy-load-20261105-000202` | 232 (220–248) | 4.18 / 5.45 | 15/15 + 15/15 |
| 00:35 | **KEEP** | m-c15t-accept | `m-c15t-accept-20261105-003242` | 224 (212–232) | 4.13 / 4.25 | 10/10 |
| 00:37 | **KEEP** | m-cy-accept | `m-cy-accept-20261105-003504` | 222 (220–236) | 4.62 / 4.93 | 10/10 |
| 00:38 | **KEEP** | wf-m-c15t | `wf-m-c15t-20261105-003741` | 216 (own script) | — / 4.40 | 5 pairs |
| 00:39 | **KEEP** | wf-m-cy | `wf-m-cy-20261105-003830` | 212 (own script) | — / 4.31 | 5 pairs |
| 00:41 | **KEEP** | m-c15t-reject | `m-c15t-reject-20261105-003918` | 220 (212–240) | 2.82 / 3.30 | 10/10 |
| 00:44 | **KEEP** | m-c15t-save | `m-c15t-save-20261105-004141` | 220 (212–248) | 4.53 / 5.16 | 10/10 |
| 01:31 | **KEEP** | m-c15t-preferences | `m-c15t-preferences-20261105-004413` | 220 (220–224) | 4.08 / 4.15 | 10/10; started at load 4.08³ |
| 01:43 | **KEEP** | m-c15t-returning | `m-c15t-returning-20261105-013155` | 236 (224–240) | 5.67 / 8.64 | 10/10 + 10/10 |
| 01:45 | **KEEP** | m-cy-reject | `m-cy-reject-20261105-014318` | 220 (220–228) | 5.27 / 5.98 | 10/10 |
| 01:59 | DISCARD | m-cy-save | `_discarded-m-cy-save-20261105-014555` | 224 (220–228) | 4.46 / 5.12 | 10/10 `unsupported-action` |
| 01:59 | ABORT | m-cy-save | `_aborted-m-cy-save-20261105-015930` | — | — | stopped after 9 s: cannot pass |
| 02:03 | **KEEP** | d-c15t-load | `d-c15t-load-20261105-015946` | 28 (28–32) | 4.61 / 5.21 | 15/15 + 15/15 |
| 02:06 | DISCARD | d-cy-load | `_discarded-d-cy-load-20261105-020317` | 24 (24–32) | 4.17 / 5.15 | 1 CookieYes `banner-missing`: CDN `script.js` 0 B, no status |
| 02:10 | **KEEP** | d-cy-load | `d-cy-load-20261105-020645` | 24 (24–28) | 5.06 / 5.96 | 15/15 + 15/15 |
| 02:16 | **KEEP** | m-hl-load | `m-hl-load-20261105-021014` | 220 (212–244) | 3.69 / 5.84 | 15/15 + 15/15 |

3. Its `meta.txt` and ledger line say "gate timed out after 30 min". `cb-run.sh` starts the
   gate clock once and keeps it running through lock waits, so after 30 minutes queued
   behind other lanes it stops checking. The run started at load 4.08, under the gate.

## Caveats

- **Lock race.** When the shared lock frees, several waiting runners can race for its
  `.recovery` guard. The losers exit with a raw `EEXIST`, not "Another measured workload
  is active", and `cb-run.sh` retries only the latter. My first five attempts died this way
  without measuring. `job.sh` now logs them as `LOCKRACE` and retries without counting an
  attempt. The astro and sveltekit lanes hit and handled the same race.
- **CookieYes CDN.** Twice (once mobile, once desktop), one CookieYes sample got a 0-byte
  `script.js` with no HTTP status from `cdn-cookieyes.com`, so no banner appeared. Both runs
  were discarded under the any-failed-sample rule and passed on rerun. CookieYes's banner
  time includes its CDN from this network. c15t's includes a real round trip to the Inth
  backend on Vercel.
- CookieYes has no `save` action in its adapter, and October's CookieYes config has no
  `preferences` or `returning-accepted`, so those cells are empty.
- `page.lcp` in action scenarios is not the hero (the action ends the window early), so it
  is not reported for them.
- Desktop uses `desktop-article-v1-browser-ua`, as in October. The headless arm ran
  mobile `load` only.
- *October* (M1 Pro, c15t 3.0.0) for reference only: c15t +432 (424–444), banner 1,954 ms,
  transfer +83,896 B; CookieYes +176 (160–200), banner 1,070. This Mac's CookieYes
  (+172, 1,089) is within October's interval.
- The *desktop* lane's interim timings (all from runs discarded for load) are not used here.

## Artifacts

All under `/Users/kayleewilliams/.t3/scratch/lcp-fleet/frameworks/script/`:

- `bin/`:
  - `queue.sh` (the queue as run)
  - `job.sh` (run, check, keep or discard, lock-race retry)
  - `check.py` (discard rules)
  - `summary.py` and `table.py` (numbers in this report)
  - `wf-job.sh` and `waterfall-script.mjs` (macOS port)
- `configs/`: `c15t-canary-{mobile,desktop}.json`, `cy-{mobile,desktop}.json`,
  `headless-canary-mobile.json` (run-headless fixture + the same control, mobile
  `load`/`accept`/`reject`/`save`; only `load` was run)
- `runs/`:
  - `ledger.log` and `queue.out`
  - the kept run dirs above (`envelope.json`, `compare-*.json`, `loadavg.txt`, `meta.txt`)
  - the `_discarded-*` and `_aborted-*` dirs
  - the waterfall dirs: `waterfall.md`, `waterfall.json`, `html.md`
