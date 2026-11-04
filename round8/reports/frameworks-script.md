# Round 8, lane `script`: c15t canary as the `@c15t/browser` script tag on `with-c15t-script`

**Status: interim, 2026-11-04 19:40. No run has passed the gates yet.**
From 09:50 to 19:40 the 1-minute load average on this machine never fell
below 10 for long. It ran 10–166, driven by other sessions' vitest suites,
pnpm installs, ClickHouse and a browser agent, none of them mine. All nine
mobile `load` attempts were discarded under the brief's load rule (any
sample above 8 while the run held the lock). Following the user's
instruction to the astro lane at 17:35 (keep the rules, run the core rows
first, write the report now and update it), the queue keeps running. Every
timing below comes from a discarded run and is marked *directional*. Bytes
and request counts don't depend on load: they repeat to within 83 B across
all ten runs.

## Summary

c15t canary `d4803ef60` as a script tag does not meet the bar today, and it
misses on two targets, not one. **LCP:** `c15t.js` is a single 85.3 KB
(Brotli) classic script. It requests at the same moment as the hero image
(197 vs 196 ms after navigation), so almost all of it shares the 200 KB/s
link with the hero. The directional LCP delta is +452 ms (432–472) in the
least-loaded run, against October's CookieYes +176 (160–200) on this
fixture. **Banner:** the banner can't render until `c15t.js` has downloaded,
run, and fetched `/init` cross-origin from the Inth backend. It shows at
1.7–2.1 s in the quieter runs, against October's CookieYes 1,070 ms. On
Next.js, Astro and TanStack the banner is in the server HTML. Here nothing
renders a banner before the engine. To match CookieYes on LCP, the script
tag can carry about 33 KB before the hero instead of 88 KB. To beat it on
the banner, the banner has to show without waiting for the full bundle and
a cross-origin round trip. Neither is possible with today's one-file build;
see "What is left".

## Scorecard (mobile-article-v1)

| Target | c15t canary | CookieYes | Met |
| --- | --- | --- | --- |
| banner.visible earlier than CookieYes | 1,736 / 1,762 / 1,948 ms¹ | 1,070 (October, M1 Pro)² | **no**, directional |
| LCP Δ at or below CookieYes | +452 (432–472)¹ | +176 (160–200, October)² | **no**: +88.5 KB transfer vs CookieYes +30.8 KB |
| accept consent-effective ≤ CookieYes | not yet measured | not yet measured | — |
| accept scripts-complete < CookieYes | not yet measured | not yet measured | — |
| nothing from the tap over 1,000 ms | not yet measured | — | — |

1. Discarded runs `m-c15t-load-20261104-154612` (load median 14, max 29),
   `-150124`, `-141650`. Not results.
2. No same-session CookieYes run yet. October's rerun
   (`results/2026-10-15-matrix-rerun/summary.json`, Apple M1 Pro). The
   competitors lane measured CookieYes on Next.js here within 0–8 ms of
   October, so the LCP figure is a fair stand-in. Banner time depends on
   CookieYes's CDN and may move.

## Mobile `load`, 15 pairs, seed 20261009, 3 warm-ups

October's `script-mobile.json` reduced to `script-tag-baseline-inth-init` +
`script-tag-c15t-inth-init`, 10 s window. All ten runs are **discarded**.

| Run | Load median / max | Control FCP | Passed | LCP Δ (compare 95% CI) | FCP Δ | banner.visible | transfer Δ | requests Δ | long-task (cand.) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `-095752` | 72.7 / 102.4 | 470 | 11/15 | +198 (no CI) | −28 | 3,356 | +88,471 | +3 | 309 |
| `-110147` | 63.3 / 80.8 | 458 | 14/15 | +408 (no CI) | −16 | 2,690 | +88,471 | +3 | 346 |
| `-114513` | 64.1 / 74.3 | 450 | 14/15 | +568 (no CI) | +36 | 2,673 | +88,551 | +3 | 605 |
| `-122354` | 22.9 / 29.9 | 348 | 15/15 | +328 (−532 to +604) | −64 | 2,061 | +88,551 | +3 | 228 |
| `-130121` | 19.1 / 40.7 | 280 | 15/15 | +428 (288–540) | 0 | 2,088 | +88,553 | +3 | 236 |
| `-133839` | 50.5 / 74.7 | 384 | 14/15 | +464 (no CI) | +4 | 2,130 | +88,470 | +3 | 250 |
| `-141650` | 31.0 / 53.2 | 308 | 15/15 | +444 (348–520) | +24 | 1,948 | +88,471 | +3 | 261 |
| `-150124` | 23.6 / 29.1 | 280 | 14/15 | +452 (no CI) | +2 | 1,762 | +88,471 | +3 | 69 |
| `-154612` | 14.0 / 28.7 | 280 | 15/15 | **+452 (432–472)** | −12 | 1,736 | +88,470 | +3 | 62 |
| `-191804` | 22.2 / 45.8 | 268 | 15/15 | +456 (356–548) | 0 | 1,943 | +88,471 | +3 | 214 |

The LCP delta settles at +444 to +464 (+456 in the tenth run) once control FCP is back under 400.
October measured c15t 3.0.0 on this fixture at +432 (424–444), banner
1,954 ms, transfer +83,896 B.

CookieYes mobile, desktop, action scenarios and the headless variant: not
run yet (queued behind the c15t `load` row).

## What loads, and where the bytes are

### Requests (CookieBench's own records, median-LCP sample of `-154612`)

| Request | Start ms | Transfer B | In control |
| --- | ---: | ---: | --- |
| document `/?scripts=2` | 0 | 1,796 | 1,709 (`/baseline`) |
| `/assets/cmp-*.js` (fixture: `c15t.init`, bridge) | 195 | 759 | 465 (`baseline-*.js`) |
| `/assets/page-*.js` | 196 | 1,240 | same |
| `/assets/dom-*.js` (fixture helper) | 196 | 523 | no |
| hero `courtyard.png` | 196 | 493,920 | same |
| **`/vendor/c15t.js`** | **197** | **85,693** | no |
| `/page-assets/reading-list.js` | **1,268** | 916 | starts at 399 |
| **`benchmarks-inth.inth.app/init`** | **1,318** | 1,874 | no |
| `/page-assets/reading-list.json` | 1,439 | 1,142 | starts at 566 |

- `c15t.js` starts with the hero and its 85.7 KB is on the wire for the
  whole first half of the hero download, so nearly all of it lands before
  the hero ends. At October's 5 ms/KB that predicts ~430 ms. The measured
  delta is +452.
- `c15t.js` is a classic script without `defer` at the end of `<body>`, so
  it blocks the parser. `reading-list.js` (the article's own script) starts
  870 ms later than in the control.
- `/init` starts only after `c15t.js` has run and the fixture calls
  `c15t.init()`. It is cross-origin with no preconnect, so DNS, TCP and TLS
  take about 3 × 150 ms before the request goes out. The banner follows the
  response (`consent.resolution` 1,966 ms, `banner.visible` 2,020 ms in that
  sample).
- CookieBench records no end times. The Playwright waterfall
  (`bin/waterfall-script.mjs`, 5 pairs, c15t and CookieYes) is queued right
  after the `accept` rows. A 1-pair desktop smoke run is in
  `runs/_wf-smoke-{c15t,cy}/`.

### `c15t.js` by package (source-mapped rebuild, byte-identical code)

`dist/c15t.js` from `d4803ef60`: 371,839 B raw, **85,272 B Brotli 11**,
100,902 B gzip. The rspack config inlines everything: no `import()`, the
dialog bundled statically, the writer bundled statically. 3.0.0's
`c15t.js` was 355,392 raw / 80,698 br, so canary is +4.6 KB br.

| Area | Raw B | Brotli share B¹ |
| --- | ---: | ---: |
| `@c15t/core` (kernel, persistence, script loader, transports, runtime) | 185,133 | 48,891 |
| `@c15t/browser` stylesheet held as a JS string (`generated/styles.ts`) | 105,705 | 11,350 |
| `@c15t/browser` UI (banner, dialog, widget, vendor list, trigger, branding) | 31,034 | 8,665 |
| `@c15t/browser` client, global, auto-init, gated scripts | 15,689 | 5,145 |
| `@c15t/ui` (theme utils, DOM utils) | 12,353 | 4,172 |
| `@c15t/schema` (policy-resolution wire reader, rule invariants) | 12,657 | 3,792 |
| `@c15t/translations` | 7,179 | 2,355 |
| runtime, unmapped, valibot | 2,082 | 903 |

1. Each group compressed alone, then scaled so the groups sum to the file's
   85,272 B. File: `attr/c15t-attr.json`.

Largest `@c15t/core` modules (raw): `kernel/choice` 9.5 KB,
`script-loader/mount` 8.5 KB, `persistence/record-codec` 7.2 KB,
`kernel/save-outbox/queue` 7.2 KB, `persistence/mount` 6.5 KB,
`persistence/record-storage` 6.4 KB, `kernel/init-lifecycle` 6.0 KB,
`libs/vendors` 5.5 KB, `script-loader/loader` 5.2 KB.

## What is left

Slope: +452 ms for ~86 KB before the hero, about 5.3 ms/KB (directional).

| Target | Gap | What would close it | Estimate |
| --- | --- | --- | --- |
| LCP ≤ CookieYes (+176) | ~276 ms, ~52 KB | Split the script tag into a first stage (banner markup, critical CSS, early-tap handling, `/init` call) and an engine loaded after the hero, as the deferred-engine branches do for React, Next.js and Nuxt. The script-tag build has no chunk loading today (`rslib.config.ts` replaces `create-runtime` with `create-runtime-static`, inlines the dialog and the writer). With 85 KB to place, the first stage has to stay at or under ~33 KB br. | −52 KB ≈ −276 ms |
| | | Ship the stylesheet as a `<link>` or a smaller first-paint subset instead of a 105.7 KB raw JS string. | 11.4 KB br ≈ 60 ms if it moves after the hero |
| | | Load the dialog (`0~dialog` code, vendor list, widget) on Customize. | ~8.7 KB br ≈ 46 ms |
| banner.visible < CookieYes (1,070) | ~700–900 ms | Start `/init` from the page head, not from inside `c15t.js`: an inline prefetch as the React fixture does, or at least `<link rel="preconnect">` to the backend. That saves the connection setup and the wait for `c15t.js`. | `/init` start 1,318 → ~200 ms |
| | | Render the banner from a small first stage, not after the full 85 KB. | banner ≈ `/init` RTT + first stage (≈ 600–800 ms) |
| | | Fixture/docs alignment: the docs put the tag in `<head>` with `defer`; the fixture puts it at the end of `<body>` with no `defer`. `defer` stops the parser block (+870 ms on `reading-list.js`) but not the byte contention. | no LCP change expected |
| accept / scripts-complete / 1,000 ms | — | not measured yet | — |

## Headless variant

`headless.html` with `run-headless.json` (`script-tag-c15t-headless`): the
fixture ships its own banner markup in the HTML, hidden, and bundles
`@c15t/browser/headless` with Vite as an ES module (`headless-*.js` 166 KB
raw / **46.3 KB br**, plus a lazy `loader-and-blocker-*.js`, 6.4 KB br).
The banner is unhidden once the client's snapshot says `activeUI` is
`banner`, so it also waits for `/init`. It shows c15t's cost without the
stock UI and stylesheet: 39 KB br less JS than `c15t.js`. October did not
run it. It is in the queue (`load`, `accept`, `reject`, `save` mobile,
desktop `load`, about 40 min of lock time). That is under an hour, so it will be
measured.

## Run ledger

`frameworks/script/runs/ledger.log`. Ten `DISCARD` lines for
`m-c15t-load` (table above, with control FCP and load), three `ABORT`
lines where I stopped the queue during a gate wait with no runner started.
I aborted to raise the attempt limit, then to tighten the gate, then to
add the waterfall jobs.

Gate as run: wait for 1-minute load < 4. After 30 min, until 15:45, the
run started anyway (brief: "note it and go"). From 15:46 it starts only
at load ≤ 8, because a run that starts above 8 is always discarded and
holds the shared lock through other lanes' quiet windows.

## Caveats

- No same-session CookieYes numbers yet. The CookieYes column is October's.
- `banner.visible` here includes a real round trip to the Inth backend on
  Vercel from this machine's network. It is not a local test double.
- The fixture's `c15t.js` placement (end of `<body>`, no `defer`) is not
  what the docs recommend.

## Artifacts

All under `/home/kaylee/.t3/scratch/lcp-fleet/frameworks/script/`:

- `bin/`: `pack.sh`, `prepare.sh`, `make-configs.py`, `run.sh`, `job.sh`,
  `check.py`, `queue.sh`, `table.py`, `waterfall-script.mjs`, `wf-job.sh`,
  `attr.ts`, `smoke.mjs`
- `packs/canary.tsv` (+ `.head` = `d4803ef60…`, empty `.diff`), tarballs in
  `packs/canary/`
- `work/canary/cookiebench`: the private CookieBench copy measured.
  `installed.txt`: every store copy matches its tarball, and
  `dist/vendor/c15t.js` is byte-identical to the packed `@c15t/browser`.
- `configs/`: `c15t-canary-{mobile,desktop}.json`, `cy-{mobile,desktop}.json`,
  `headless-canary-{mobile,desktop}.json`
- `runs/`: ledger, `_discarded-*`, `_aborted-*`, smoke waterfalls
- `attr/`: source-mapped `c15t.js` and `c15t-attr.json`; `ref-3.0.0/`: the
  3.0.0 tarball for comparison
