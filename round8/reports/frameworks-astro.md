# Round 8, lane `astro`: c15t canary on CookieBench `with-c15t-astro`

**Status: partial, updated 2026-11-04 20:40. No run has passed the gates yet.**
Since 09:52, load on this machine has been 10–139, from vitest suites in
other monorepo worktrees. Every measured run so far was discarded under the
brief's rule (any 1-minute load sample above 8). At 17:35 the user chose to
keep the rules, reorder the queue (c15t mobile load, CookieYes mobile load,
c15t accept, CookieYes accept, waterfall, then the rest) and have this report
written now, then updated as kept runs land. Every LCP or action number
below marked *directional* comes from a discarded run and is not a result.
Byte counts do not depend on load: they repeat to within 70 B across all
runs.

## Summary

c15t canary `d4803ef60` does not meet the bar on Astro today, judging by
bytes and directional timings. The banner is server HTML and visible at FCP
(277–312 ms in the two least-loaded runs, against CookieYes's 1.7–2.3 s), so
the banner target is met. But the first load carries +76.7 KB and +7
requests over the no-CMP page. About 71 KB of that starts before the hero
image and competes with it: the whole consent engine (`client.js`, 47.7 KB
br), the script loader (`page.js`, 10.3 KB), and a 69 KB raw first-paint
stylesheet inlined in the HTML (+11.2 KB br HTML in total). CookieYes adds
+30.3 KB. Directional LCP cost: c15t +292 to +372 ms (8 runs), against CookieYes
+36 to +320 ms (both CookieYes runs were heavily loaded). To reach CookieYes's
typical +150–180 ms, c15t would have to start about 35–40 KB fewer bytes
before the hero. The Next.js, React and Nuxt lanes got there by deferring
the engine. That is not done for `@c15t/astro`.

## Scorecard (mobile-article-v1)

| Target | c15t canary | CookieYes | Met | Source |
| --- | ---: | ---: | --- | --- |
| banner.visible earlier than CookieYes | 277 / 312 ms | 1,669 / 2,348 ms | yes (directional) | discarded load runs |
| LCP Δ ≤ CookieYes | +292 to +372 ms (8 runs) | +36 / +320 ms | unknown; bytes say no | discarded load runs |
| accept consent-effective ≤ CookieYes | 31 / 63 ms (smoke, 2 samples) | 21 ms (smoke, 1 sample) | pending | smoke runs only |
| accept scripts-complete < CookieYes | 202 / 234 ms (smoke) | 191 ms (smoke) | pending | smoke runs only |
| nothing from the tap over 1,000 ms | preferences-visible 1,294 ms (smoke, 1 sample, load 36) | n/a | at risk | smoke run only |

## Mobile `load`, 15 pairs, seed 20261009, 3 warm-ups

No kept run yet. Discarded runs, all directional:

| Run | Arm | Load max | Control FCP / LCP | LCP Δ (compare CI) | FCP Δ | banner.visible | transfer Δ | requests Δ | long-task (control) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 11:09 | c15t | 66.9 | 972 / 3,628 | +348 (−108 to 820) | +0 | 699 | +76,657 | +7 | 1,068 (522) |
| 12:49 | c15t | 63.9 | 332 / 2,988 | +296 (no CI, 2 failed control samples) | +38 | 312 | +76,720 | +7 | 72 (4) |
| 13:58 | c15t | 139.0 | 1,748 / 4,544 | +306 (no CI) | +300 | 1,635 | +76,657 | +7 | 2,168 (1,319) |
| 14:38 | c15t | 23.1 | 256 / 2,916 | **+356 (224 to 396)** | +48 (12 to 128) | 277 | +76,719 | +7 | 34 (0) |
| 17:35 | c15t | 47.4 | 448 / 3,004 | +336 (216 to 484) | +60 | 368 | +76,657 | +7 | 207 (11) |
| 18:43 | c15t | 78.7 | 432 / 2,992 | +372 (268 to 536), 1 failed sample | +16 | 316 | +76,689 | +7 | 123 (40) |
| 19:21 | c15t | 58.7 | 384 / 3,172 | +326 (no CI), 4 failed samples | +118 | 475 | +76,656 | +7 | 458 (27) |
| 20:00 | c15t | 59.2 | 404 / 3,040 | +292 (188 to 516) | +32 | 577 | +76,656 | +7 | 260 (52) |
| 15:15 | CookieYes | 90.2 | 536 / 3,506 | +320 (no CI) | +216 | 2,348 | +30,342 | +9 | 429 (133) |
| 16:06 | CookieYes | 79.8 | 332 / 3,196 | +36 (no CI, 3 failed samples) | −16 | 1,669 | +30,318 | +9 | 233 (74) |

The 14:38 c15t run is the closest to valid: 15/15 samples passed and
control FCP was 256 ms, but load ran 9–23 (median 10.4) for the whole run.

Desktop `load`: not run yet (phase 2).

## Mobile actions

Not run yet. Smoke runs at load 22–36, 1–2 samples each, not results:

| Scenario | Arm | input-to-next-paint | dismissed | consent-effective | scripts-complete | preferences-visible |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| accept | c15t | 32 / 64 | 31 / 63 | 31 / 63 | 202 / 234 | — |
| accept | CookieYes | 32 | 21 | 21 | 191 | — |
| preferences | c15t | 40 | 712 | — | — | 1,294 |

October's `astro-cookie-yes-mobile.json` has `load`, `accept`, `reject` and
`save`; its adapter has no `save` selector, so CookieYes `save` is expected
to fail as unsupported (as on Nuxt). `preferences` and `returning-accepted`
are c15t-only, copied from the fixture's `run.json`.

## What loads, and where the bytes are

Static fetch of the built fixture (`static/index.html`, `static/baseline.html`)
plus the per-request lists CookieBench recorded in the discarded runs
(`bin/requests.py`, medians over 15 samples; CookieBench records starts,
not ends). The own-script waterfall with end times is queued after the
essentials; until it lands, "before the hero" means "starts before the hero
starts loading, or within 0.5 s of it" (the hero takes about 2.7 s on this
profile).

### Requests, c15t arm vs control (14:38 run)

| Request | Start ms | Transfer B | In control | Note |
| --- | ---: | ---: | --- | --- |
| Document `/` | 0 | 13,164 | 1,970 | +11,194 B |
| `_astro/page.DX6gX_0K.js` | 227 | 10,251 | no | Astro page script: script loader, client mode, transports |
| `page-assets/courtyard.png` (hero) | 235 | 493,920 | yes (203) | starts 32 ms later than control |
| 3 Astro component scripts (`prompt`, `panel`, `index.astro`) | 236 | 1,789 | no | banner click delegation, dialog link, fixture bridge |
| `_astro/client.BzHgniYz.js` | 416 | 47,672 | no | the consent engine |
| `_astro/browser.CZTzyqHL.js` | 453 | 1,127 | no | `@cookiebench/fixture-support` bridge (fixture code) |
| `page-assets/reading-list.js` | 1,147 | 916 | yes (244) | pushed back 900 ms |
| `page-assets/reading-list.json` | 1,317 | 1,142 | yes (420) | |
| `_astro/writer.Dhm8pbMG.js` | 6,246 | 4,686 | no | after the hero |
| **Total over control** | | **+76,719 / +7 requests** | | ~72 KB of it starts before 0.5 s |

CookieYes, same method (16:06 run): HTML +1.1 KB (head-start snippet),
`script.js` 8.9 KB at 306 ms, `banner.js` 12.3 KB at 829 ms, then config,
translations, audit table and three SVGs from 1.1 to 2.2 s. +30,318 B and
+9 requests, almost all of it during the hero download.

### HTML: +11.2 KB br (80,164 raw vs 3,922)

Brotli q11 share of each part (`bin/html-parts.py`; the server sends 12,702 B
br, my q11 gives 11,213):

| Part | Raw B | Brotli share B |
| --- | ---: | ---: |
| `<style data-c15t-styles="c15t-first-paint">` | 69,401 | ~7,700 |
| `<script type="application/json" data-c15t-config>` | 3,536 | ~1,200 |
| Banner markup | ~3,100 | ~700 |
| Colour-scheme inline script | 119 | ~70 |

The inline sheet is not banner-only. By selector, raw bytes: theme tokens on
`:root` 11.7 KB, `.c15t-dark` 8.2 KB, button 11.0 KB, root 8.2 KB, branding
6.3 KB, toolbar 4.3 KB, trigger 4.0 KB, theme root 3.3 KB, action 2.3 KB,
banner 1.3 KB, overlay 1.1 KB, card 1.0 KB, the rest under 1 KB each.

### First-load JS: 58.2 KB br over 6 chunks (source-mapped rebuild)

`bin/attr-build.sh` rebuilds the same fixture with `vite.build.sourcemap`;
the chunk names and bytes match the measured build. Attribution with the
c15t repo's `client-payload/attribute.ts`. Brotli per area is the chunk's
brotli split by raw share.

| Package | Raw B | Brotli B (est.) |
| --- | ---: | ---: |
| `@c15t/core` | 151,524 | 44,466 |
| `@c15t/astro` | 15,322 | 4,487 |
| `@c15t/schema` | 13,528 | 3,909 |
| `@c15t/translations` | 6,800 | 1,950 |
| `@c15t/ui` | 5,592 | 1,606 |
| fixture code (`fixture-support`, page script) | 2,536 | 1,010 |
| unmapped | 2,361 | 771 |

| Area | Raw B | Brotli B (est.) | Chunk |
| --- | ---: | ---: | --- |
| `@c15t/core/kernel` (choice, init lifecycle, patch, snapshot, save outbox) | 42,335 | 12,141 | client |
| `@c15t/core/modules/persistence` (record codec, storage, mount, hydrate) | 24,698 | 7,083 | client |
| `@c15t/core/modules/script-loader` | 17,426 | 5,622 | page |
| `@c15t/core/libs` (vendors, experiment, cookies, journey) | 18,711 | 5,405 | client |
| `@c15t/core/runtime` (client mode, assemble, runtime kernel) | 14,855 | 4,438 | page + client |
| `@c15t/schema/shared` (policy-resolution wire, rule invariants) | 13,528 | 3,909 | client |
| `@c15t/core/consent-record` | 10,948 | 3,140 | client |
| `@c15t/astro/client` | 10,692 | 3,066 | client |
| `@c15t/core/transports` | 5,460 | 1,730 | page |
| `@c15t/translations` | 5,761 | 1,652 | client |
| `@c15t/ui/utils` (dom) | 5,522 | 1,584 | client |
| `@c15t/core/modules/iframe-blocker` | 3,690 | 1,058 | client |
| `@c15t/core/modules/has` | 3,608 | 1,035 | client |
| `@c15t/core/modules/network-blocker` | 2,677 | 773 | client |
| `@c15t/astro/browser` (inline scripts) | 2,631 | 755 | client |

There is no Svelte in the first load. With `ui: "svelte"`, `@c15t/astro`
renders the banner as server HTML with no framework JavaScript. A delegated
click handler drives it, and Svelte loads only for the dialog.

### On Customize: 64.7 KB br over 10 chunks plus 8.8 KB CSS

| Package | Raw B | Brotli B (est.) |
| --- | ---: | ---: |
| `@c15t/ui` | 143,194 | 20,327 |
| `svelte` | 53,494 | 17,672 |
| `@c15t/svelte` | 52,389 | 14,497 |
| `@c15t/core` (writer, preference draft, policy actions) | 29,158 | 10,084 |
| other | 6,316 | 2,129 |

Plus `dialog.css` (5.1 KB) and `primitives.css` (3.7 KB). In the smoke run
these started 1.7 s after navigation, during the hero download, and the
dialog appeared 1,294 ms after the tap.

## What is left

Estimates use the directional slope from the 14:38 run: +356 ms for about
72 KB that start before the hero, about 5 ms per KB, close to Next.js's
4.75. They will be redone from the kept run and the waterfall.

| Missed target | Change | Bytes before hero saved | LCP estimate |
| --- | --- | ---: | ---: |
| LCP ≤ CookieYes (~+150–180 if Astro matches other fixtures) | Defer `client.js` (engine, 47.7 KB br) until the hero has loaded or the first input, as the Next.js / React / Nuxt lanes did. Needs an instant-commit path for taps before the engine arrives. | ~45 KB | −200 to −225 ms |
| same | Banner-only first-paint sheet: drop toolbar, trigger, branding and dark tokens until after paint | ~4–5 KB | −20 to −25 ms |
| same | Lazy script loader: `page.js` imports the loader statically because `consent-client.ts` passes `scripts` | up to ~6 KB | up to −30 ms |
| same | Config JSON: trim translations and policy fields the banner does not need | ~0.5–1 KB | −3 to −5 ms |
| nothing over 1,000 ms (preferences) | Preload the dialog group (`svelte`, `@c15t/svelte`, `@c15t/ui`, 65 KB) at pointerdown on Customize, or after the hero; ship a smaller dialog sheet | — | dialog visible below 1 s; not measured |

Deferring the engine alone would put c15t near +130–160 ms, if the slope
holds. That is around CookieYes's level, with the banner still at FCP.

## Run ledger

`frameworks/astro/runs/ledger.log`, every attempt. Control FCP is the median.

| Time | Verdict | Run | Reason | Control FCP | Load max |
| --- | --- | --- | --- | ---: | ---: |
| 11:05 | DISCARD | c15t mobile load | load 133.7; server readiness timeout¹ | — | 133.7 |
| 11:06 | ABORTED | c15t mobile load | queue stopped in the load gate to fix ¹; never ran | — | — |
| 12:49 | DISCARD | c15t mobile load | load 66.9; control FCP 972 | 972 | 66.9 |
| 13:58 | DISCARD | c15t mobile load | load 63.9; 2 failed control samples | 332 | 63.9 |
| 14:38 | DISCARD | c15t mobile load | load 139.0; 2 failed; control FCP 1,748 | 1,748 | 139.0 |
| 15:15 | DISCARD | c15t mobile load | load 23.1 | 256 | 23.1 |
| 16:06 | DISCARD | CookieYes mobile load | load 90.2; 2 failed; control FCP 536 | 536 | 90.2 |
| 16:44 | DISCARD | CookieYes mobile load | load 79.8; 3 failed | 332 | 79.8 |
| 17:35 | ABORTED | CookieYes mobile load | queue stopped in the load gate to reorder (user); never ran | — | — |
| 18:43 | DISCARD | c15t mobile load (queue2) | load 47.4; control FCP 448 | 448 | 47.4 |
| 19:21 | DISCARD | c15t mobile load (queue2) | load 78.7; 1 failed; control FCP 432 | 432 | 78.7 |
| 20:00 | DISCARD | c15t mobile load (queue2) | load 58.7; 4 failed | 384 | 58.7 |
| 20:39 | DISCARD | c15t mobile load (queue2) | load 59.2; control FCP 404 | 404 | 59.2 |

Ledger times are verdict times. The run tables above use run start times
(the run directory names), so the "14:38" load run is the one ledgered at
15:15.

1. My source-mapped attribution copy sat inside CookieBench's `benchmarks/*`
   workspace. pnpm 11 then saw an extra workspace project and reinstalled
   on `pnpm start` (1 min 40 s at load 133), and the runner's 120 s
   readiness deadline passed. The copy now builds, moves its output to
   `work/attr/` and is deleted; tarballs re-verified after the reinstall.

## Caveats

- Every timing above is from a discarded or smoke run. Bytes and request
  counts are stable across all runs.
- Seed 20261009 on the command line (October's astro configs say 42).
- Ports are the fixture's own (4315 proxy, 4415, 4515 baseline, 4615 TLS).
- `browser.CZTzyqHL.js` (1.1 KB) is CookieBench's fixture bridge. It ships
  only in the c15t arm, so it counts against c15t in `initial.transfer`.
- Bytes before the hero are inferred from start times until the waterfall
  runs.

## Artifacts

Under `/home/kaylee/.t3/scratch/lcp-fleet/frameworks/astro/`:

- `packs/`, `packs.tsv`, `packs.head` (`d4803ef60…`, clean tree): the 8
  tarballs (`@c15t/astro`, `core`, `dev-tools`, `iab`, `schema`, `svelte`,
  `translations`, `ui`); `work/installed.txt` verifies the install.
- `work/cookiebench/`: private CookieBench copy (`eee967e`), fixture built
  with the tarballs; `work/attr/`: source-mapped client build.
- `configs/`: `c15t-{mobile,desktop}.json`, `cy-{mobile,desktop}.json`
  (`bin/make-configs.py`).
- `bin/`: `pack.sh`, `prepare.sh`, `make-configs.py`, `cb-run.sh`,
  `check.py`, `queue2.sh` (current), `queue.sh` and `requeue.sh` (stopped),
  `table.py`, `requests.py`, `html-parts.py`, `attr-build.sh`,
  `attribute-run.ts`, `attr-summary.py`, `waterfall.sh`,
  `waterfall-astro.mjs`.
- `runs/`: every run (`_discarded-*`, `_aborted-*`), `ledger.log`,
  `queue.log`; `smoke/`: smoke envelopes; `static/`: HTML and `attr.json`.
