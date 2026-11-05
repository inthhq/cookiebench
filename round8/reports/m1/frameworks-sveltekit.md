# Lane `sveltekit`: c15t canary on SvelteKit, M1 Pro (round 8)

## Summary

c15t canary `d4803ef60` on SvelteKit does not meet the bar today. On mobile,
LCP is +372 ms over control (95% CI 364–388). CookieYes, on the same
machine in the same session, is +148 (136–152), so c15t misses by 224 ms.
Accept is also slower: consent-effective 53 vs 42 ms, scripts-complete 237
vs 178 ms. The banner target is met by a wide margin (222 vs 1,163 ms),
and nothing measured from the tap exceeds 475 ms.

The cause is bytes before the hero: +98.7 KB on the wire over control (24
requests vs 14). That confirms the desktop's ~+93 KB. About 72 KB of that
is c15t first-load JS, 48.5 KB of it `@c15t/core`. The desktop's
double-shipped stylesheet is also confirmed: the 69,195-byte first-paint
sheet is in the HTML (`c15tHandle`) and again, byte for byte, in
first-load chunk `DvcrdEh6.js`. On the wire each copy is about 7.8 KB
brotli, not 69 KB. The slow accept comes from two `@c15t/core` chunks
(persistence writer and save outbox, 7.5 KB) that load lazily at the tap
and share the 200 KB/s link with the gated scripts.

## Scorecard (mobile-article-v1, this Mac, same session)

| Target | c15t canary | CookieYes | Met |
| --- | ---: | ---: | --- |
| banner.visible earlier than CookieYes | 222 | 1,163 | **yes** (−941 ms) |
| LCP Δ at or below CookieYes | +372 (364–388) | +148 (136–152) | **no**, +224 ms |
| accept consent-effective ≤ CookieYes, median (max) | 53 (62) | 42 (46) | **no**, +11 ms median, +16 max |
| accept scripts-complete < CookieYes, median (max) | 237 (244) | 178 (181) | **no**, +59 ms median |
| nothing from the tap over 1,000 ms | largest sample 475 (preferences dialog) | | **yes** |

## Table: mobile-article-v1

`load` is 15 pairs; action scenarios are 10 iterations. All runs use 3
warm-ups and seed 20261009. LCP and FCP intervals come from CookieBench
`compare` (95% paired bootstrap). Every row passed the BRIEF-M1 gates:
control FCP median ≤ 400 ms, no 1-minute load sample above 10, and no
failed sample except the controls' expected `required-measurement-unavailable`
on action scenarios.

| Measure | c15t canary | CookieYes |
| --- | ---: | ---: |
| LCP Δ vs control (95% CI) | **+372 (364–388)** | +148 (136–152) |
| LCP median (control) | 3,548 (3,176) | 3,324 (3,176) |
| FCP median (Δ, CI) | 276 (+40, 32–44) | 244 (+4, 0–8) |
| banner.visible median | **222** | 1,163 |
| initial.transfer Δ (10 s window) | +123,134 (656,073 vs 532,939) | +30,401 (563,340 vs 532,939) |
| initial.requests Δ | +13 (28 vs 15) | +9 (24 vs 15) |
| initial.long-task-blocking median | 11 | 0 |
| Bytes finished before hero end, over control (waterfall, 5 pairs) | **+98,681** (24 vs 14 requests) | not measured¹ |
| `accept` consent-effective median (max) | 53 (62) | 42 (46) |
| `accept` scripts-complete median (max) | 237 (244) | 178 (181) |
| `accept` dismissed / input-to-next-paint | 53 / 56 | 42 / 44 |
| `accept` first gated script from navigation, median (max) | 1,220 (1,235) | 1,962 (1,988) |
| `reject` consent-effective median (max) | 48 (53) | 41 (50) |
| `reject` dismissed / input-to-next-paint | 48 / 48 | 41 / 44 |
| `save` consent-effective median (max) | 18 (19) | unsupported² |
| `save` scripts-complete median (max) | 169 (176) | unsupported² |
| `save` dismissed / input-to-next-paint | 18 / 24 | — |
| `preferences` dialog visible median (max) | 455 (475) | not in config³ |
| `preferences` banner dismissed / input-to-next-paint | 46 / 48 | — |
| `returning-accepted` first gated script from navigation, median (max) | 335 (351) | not in config³ |
| `returning-accepted` LCP median (control) | 240 (232) | — |

1. `waterfall.mjs` takes `--cmp cookie-yes`, but the brief's queue covers
   the c15t arm only, so I did not run it.
2. Both CookieYes `save` attempts failed every sample with
   `unsupported-action` / `followup:unsupported-action` ("Adapter does not
   declare the save action"), 0/10 twice. That matches Nuxt in round 7.
3. `cy-mobile.json` (from October's astro CookieYes config) has `load`,
   `accept`, `reject` and `save` only.

## Table: desktop-article-v1-browser-ua, `load`, 15 pairs

| Measure | c15t canary | CookieYes |
| --- | ---: | ---: |
| LCP Δ (95% CI) | +8 (4–12) | 0 (0–0) |
| LCP median (control) | 88 (84) | 84 (84) |
| FCP median (Δ, CI) | 36 (+8, 8–12) | 32 (0, 0–4) |
| banner.visible median | 25 | 325 |
| initial.transfer Δ | +123,134 | +30,360 |
| initial.requests Δ | +13 | +9 |
| initial.long-task-blocking | 0 | 0 |

There are no October or desktop SvelteKit numbers to compare with, because
the fixture is new this round.

## Waterfall (c15t canary, mobile, 5 pairs)

`bin/waterfall.mjs` is a macOS port of the desktop's script; the only
change is load sampling through `sysctl`. It holds the shared lock, uses a
fresh context per visit and alternates control `/baseline/` with candidate
`/?scripts=2`. Bytes are `encodedDataLength` (headers plus body on the
wire). The run's max 1-minute load was 5.73. All 5 pairs agree to within
4 bytes.

| | Control | c15t |
| --- | ---: | ---: |
| Own-script LCP, median | 3,164 | 3,540 |
| FCP, median | 216 | 260 |
| Banner visible (rAF poll), median | — | 247 |
| Hero request start, median | 177 | 217 |
| Hero end (representative pair) | 3,161 | 3,531 |
| Requests finished before hero end (excl. hero) | 14 | 24 |
| Bytes finished before hero end | 39,019 | 137,700 |
| **Difference** | | **+98,681** |

Of the +98.7 KB, +11.5 KB is HTML (13,658 vs 2,206 on the wire) and +87.2
KB is JS (122.0 vs 34.8 KB). After the hero, the dialog chunks
`ChsfL3jx.js` (18.1 KB, holding two more c15t CSS strings of 35.9 and 25.3
KB raw) and `D9IHYmc1.js` (1.8 KB, preference draft) load at 3,536 ms,
off the LCP path.

### HTML (+11.5 KB on the wire, 82,202 vs 4,827 B decoded)

| Part | Raw B | Brotli B |
| --- | ---: | ---: |
| `<style data-c15t-styles="c15t-first-paint">` that `c15tHandle` writes | 69,195 | ~7,778 (alone) |
| Inline script over control (3,977 vs 559) | +3,418 | |
| Banner and dialog markup, links, the rest | ~4,800 | |

The banner markup sits at byte 74,770 of the HTML, after the 69 KB
stylesheet. The hero `<img>` sits at byte 72,908; in the control it is at
byte 2,726. The hero request starts 40 ms later than in the control (217
vs 177 ms).

### The first-paint sheet ships twice: confirmed

The sheet the server inlines (`build/server/chunks/surface-styles.js`) and
the template literal in client chunk `DvcrdEh6.js` are identical once
unescaped: 69,195 bytes each. `@c15t/svelte/dist/surface-styles.js`
statically imports `@c15t/ui/styles/sheets/first-paint` for
`ensureSurfaceStyles`. That function skips the insert when `c15tHandle`
already wrote the sheet, but the bytes still download. Compressed alone,
the literal is 7,778 B; removing it shrinks `DvcrdEh6.js` from 16,713 to
8,967 B brotli, which saves 7,746 B. The desktop's "69 KB shipped twice"
is right about the raw size. On the wire the duplicate costs about 7.7 KB.

### First-load JS by package (21 chunks, 113.5 KB brotli 11, 402 KB raw)

I attributed bytes in a source-mapped copy of the same build
(`attr/with-c15t-sveltekit`, `build: { sourcemap: true }`). All 90 client
chunks match the measured build byte for byte. Brotli is split by raw
share within each chunk, except the CSS literal, which I compressed on its
own.

| Package | Raw B | Brotli B (est.) |
| --- | ---: | ---: |
| `@c15t/core` | 163,459 | ~48,500 |
| `@c15t/ui` first-paint sheet (CSS string in `DvcrdEh6.js`) | 69,195 | 7,746 |
| `@c15t/svelte` | 28,580 | ~6,700 |
| `@c15t/schema` | 13,172 | ~4,300 |
| `@c15t/ui` JS | 11,725 | ~2,300 |
| `@c15t/translations` | 6,779 | ~2,000 |
| **c15t total** | ~293,000 | **~71,500** |
| svelte, @sveltejs/kit, devalue, clsx, app code, unmapped | ~109,000 | ~42,000 (the control's whole JS is 34.8 KB on the wire) |

`@c15t/core` by directory (brotli, est.): kernel 10.4 KB, persistence 6.9,
libs 6.3, runtime 6.1, script loader 5.4, consent-record 3.3, transports
1.9, network blocker 1.8, save outbox 1.5, iframe blocker 1.0, cookie libs
1.0, other 2.9. `@c15t/svelte` components (prompt, provider): 5.0 KB.

### By chunk

| Chunk | Wire B | What is in it |
| --- | ---: | --- |
| `nodes/0.CG9icKmy.js` (layout node) | 38,849 | `@c15t/core` kernel (choice, init-lifecycle, patch, snapshot), persistence (record codec, storage, mount), runtime (provider-runtime, client-mode, assemble); `@c15t/svelte` prompt and provider components |
| `DvcrdEh6.js` | 17,119 | the 69 KB first-paint sheet again, plus `@c15t/svelte` and `@c15t/ui` surface code |
| `0D3tWA5M.js` (`modulepreload fetchpriority="low"`) | 6,799 | script loader (mount, loader, callbacks) and network blocker. It finishes at 1,167 ms, before the hero |
| `_FwURPMd.js` | 4,357 | `@c15t/schema` |
| `BH36oZlj.js` | 4,263 | `policy-actions`, `experiment`, cookie libs |
| `DYpbT5d9.js` | 3,122 | consent-record evaluate, `has` |
| `I3h0wq_t.js` | 2,621 | `vendors`, `has` |
| `DozCdLDO.js` | 2,223 | `@c15t/translations` |
| `DZFQVyO2.js`, `O_T8OosP.js` | 1,992 | consent-record validation, schema |
| `D0VOGHuz.js` (svelte), `C2A9d25w.js` (kit + devalue), `CukQX57Y.js` | 34,187 | framework; the control's matching chunks are 12.3, 13.6 and 2.1 KB, so the c15t page carries about 6 KB more Svelte and Kit runtime |

### Accept: what loads at the tap

In every c15t `accept` sample, the tap requests two `@c15t/core` chunks
that first load did not include. They are `7GYg8lxp.js` (4.6 KB on the
wire: persistence writer `reconcile`, `writer`, `encode`, `store`) and
`D7NQFJ0Q.js` (3.0 KB: `save-outbox/queue`). The gated
`/controlled/script` requests start 7–60 ms after the first of these
(per-sample gaps 8, 56, 8, 56, 59, 7, 52, 54, 8, 60). Then the backend
`POST /subjects` goes out. CookieYes's tap fetches only the two gated
scripts and a 81-byte log POST. On the 200 KB/s link, 7.5 KB takes about
38 ms plus the 150 ms latency round trip. That is consistent with the
+59 ms scripts-complete gap, but I did not isolate it with a trace.

## What is left

The LCP slope measured here is 372 ms / 98.7 KB = **3.77 ms per KB**
before the hero. (Nuxt measured 7.9 in round 7 on the desktop and the
Next.js lanes 4.75; neither was on this Mac.) Every estimate below assumes
that slope is linear.

**LCP at or below CookieYes:** 224 ms to recover, which is about **59 KB
fewer before the hero**.

| Change | KB before hero | Est. ms at 3.77 ms/KB | Where |
| --- | ---: | ---: | --- |
| Don't ship the first-paint sheet in client JS when the server already wrote it (import it lazily inside `ensureSurfaceStyles`, CSR only) | −7.7 | −29 | `@c15t/svelte` `surface-styles.js` |
| Load the script loader and network blocker chunk (`0D3tWA5M.js`, low-priority modulepreload) after the hero | −6.8 | −26 | `@c15t/svelte` module preload |
| Defer the consent engine until after the hero, as the Nuxt lane did with the deferred shell: `@c15t/core` in `nodes/0` and side chunks, `@c15t/schema`, `@c15t/translations` | about −55 (includes the line above) | about −207 | `@c15t/svelte` provider |
| Smaller inline first-paint sheet (banner-only split, as `05f691f37` did for React) | part of 7.8 | ≤ −29 | `@c15t/ui` / `c15tHandle` |
| Svelte and Kit runtime the baseline page lacks | ~6 | ~23 | intrinsic to the components; not counted |

Deferring the engine plus dropping the duplicate sheet comes to about
−62 KB, or −235 ms, which puts c15t at roughly +137 ms. That is level with
CookieYes (+148, CI 136–152), not clearly under it. A smaller inline sheet
would be needed for a margin.

**Accept consent-effective and scripts-complete:** fetch the persistence
writer and save-outbox chunks (7.5 KB) after the hero, at idle, so the tap
doesn't download them. Expected effect: scripts-complete −40 to −60 ms
(about 237 → 180–195, against CookieYes's 178) and part of the +11 ms on
consent-effective. That is not measured. The Nuxt lane's instant commit
(plan the choice in the tap's task) would be the further step if the
median must be under 42 ms.

## Run ledger

`runs/ledger.log` has one line per attempt. Control FCP is the median of
the control arm. "Load" is the highest 30-second 1-minute load sample
while the run held the lock.

| Time | Verdict | Run | Control FCP | Max load | Result |
| --- | --- | --- | ---: | ---: | --- |
| 22:46 | KEEP | `c15t-mobile-load-20261104-223950` | 240 | 5.83 | LCP Δ +372 (364–388) |
| 22:52 | DISCARD | `cy-mobile-load-20261104-224634` | — | — | lock race (EEXIST on `.lock.recovery`), never measured |
| 22:55 | DISCARD | `cy-mobile-load-20261104-225202` | — | — | lock race, never measured |
| 22:56 | DISCARD | `cy-mobile-load-20261104-225547` | — | — | aborted while queued on the lock (queue restart), never measured |
| 23:33 | KEEP | `cy-mobile-load-20261104-225618` | 236 | 8.63 | LCP Δ +148 (136–152); gate waited 30 min, started at 8.38 |
| 23:36 | KEEP | `c15t-mobile-accept-20261104-233312` | 230 | 5.77 | CE 53, SC 237 |
| 00:09 | KEEP | `cy-mobile-accept-20261104-233621` | 230 | 6.55 | CE 42, SC 178; gate waited 30 min, started at 6.55 |
| 00:19 | KEEP | `c15t-waterfall-20261105-000908` | 216 (own script) | 5.73 | +98,681 B before hero |
| 00:22 | KEEP | `c15t-mobile-reject-20261105-001916` | 232 | 5.35 | CE 48 |
| 00:24 | KEEP | `c15t-mobile-save-20261105-002225` | 230 | 4.86 | CE 18, SC 169 |
| 00:26 | KEEP | `c15t-mobile-preferences-20261105-002451` | 228 | 4.56 | dialog 455 (475) |
| 01:13 | KEEP | `c15t-mobile-returning-accepted-20261105-002606` | 232 | 5.06 | first script 335 (351) |
| 01:34 | KEEP | `cy-mobile-reject-20261105-011332` | 224 | 4.25 | CE 41 |
| 01:36 | DISCARD | `cy-mobile-save-20261105-013430` | 224 | 4.76 | 10/10 `unsupported-action` |
| 01:46 | DISCARD | `cy-mobile-save-20261105-013602` | — | — | lock race, never measured (not counted) |
| 01:54 | DISCARD | `cy-mobile-save-20261105-014625` | 228 | 5.49 | 10/10 `unsupported-action`; gave up (adapter has no `save`) |
| 01:58 | KEEP | `c15t-desktop-load-20261105-015428` | 28 | 7.33 | LCP Δ +8 (4–12) |
| 02:07 | DISCARD | `cy-desktop-load-20261105-015800` | — | — | lock race, never measured (not counted) |
| 02:20 | KEEP | `cy-desktop-load-20261105-020720` | 32 | 4.44 | LCP Δ 0 (0–0) |

No run was discarded for load or for control FCP. Every kept mobile run
had all candidate samples pass (15/15 or 10/10).

## Caveats

- **Fixture provenance.** `benchmarks/with-c15t-sveltekit` comes from
  CookieBench branch `kaylee/round8-m1` at `7b5bbb0` ("feat(bench): add a
  SvelteKit fixture and round 8 hand-off for the M1"), built on the
  desktop. Setup changed only its `package.json` (`@c15t/svelte` →
  `file:` canary tarball `c15t-svelte-6548800f9057.tgz`), plus the
  workspace `pnpm-workspace.yaml` overrides and lockfile. This lane
  changed nothing in `$CB`. The attribution build is a separate copy at
  `frameworks/sveltekit/attr/with-c15t-sveltekit` with one change:
  `build: { sourcemap: true }`. Its 90 chunks are byte-identical to the
  measured build.
- **Fixture correctness:** setup verified 11 of 12 scenarios. `withdraw`
  fails because c15t's `reloadOnConsentRevoked` defaults to on. astro
  fails it the same way on canary, so it is not a fixture fault, and it
  was not in this queue.
- **CookieYes mobile `load` ran at higher load:** the gate waited 30 min,
  then started at 8.38 with a max of 8.63. That is inside the M1 rule (10)
  but over the desktop brief's 8. Its control FCP (236) and LCP (3,176)
  match the c15t run's control exactly, so I kept it.
- **CookieBench lock race:** when two runners contend, the loser of the
  `.lock.recovery` guard throws `EEXIST` instead of "Another measured
  workload is active". `cb-run.sh` only retries the second message, so 4
  attempts ended with no samples. My queue now logs them as `lock-race`
  and retries without counting them. The fix belongs in CookieBench
  (`packages/runner/src/lifecycle.ts`: treat `EEXIST` on the recovery file
  as busy).
- **Waterfall** bytes come from my own Playwright script and include
  headers; CookieBench's `initial.transfer` is a 10 s window and includes
  the post-hero dialog chunks. The brotli split by package is an estimate
  (raw share within each chunk).
- **The accept diagnosis** comes from request start times in the
  envelope, not a CPU or network trace. The proposed fix is unmeasured.
- **Slope linearity:** the "what is left" ms figures scale linearly from a
  single point (c15t vs control).
- **Not run:** CookieYes waterfall, CookieYes `preferences` and
  `returning-accepted` (not in its config), CookieYes `save` (adapter
  doesn't declare it), desktop action scenarios, `withdraw`,
  `accept-early`, `reject-keyboard`.
- **Background:** Chrome, OrbStack, Executor and three other measurement
  lanes ran throughout. The lock serialised the measurements; the load
  samples above are the only evidence of interference.

## Artifacts

Everything is under `/Users/kayleewilliams/.t3/scratch/lcp-fleet/frameworks/sveltekit/`:

- `bin/`: `queue.sh` (judge, ledger, retries, lock-race handling),
  `drive.sh` (the full queue), `judge.py`, `table.py` (desktop's, with the
  M1 load rule of 10), `waterfall.mjs` + `waterfall-run.sh` (macOS port),
  `attribute-run.ts` (pointing at `$LCP/c15t-canary`'s `attribute.ts`),
  `with-lock.mjs` (ran the attribution build under the shared lock),
  `report-tables.py`, `plan1.txt`, `plan1b.txt`, `plan2.txt`.
  `phase2.sh` was superseded by `drive.sh` and never ran a measurement.
- `configs/`: as written by setup, unchanged.
- `runs/<label>-<stamp>/`: kept runs, each with `config.json`,
  `envelope.json`, `compare-*.json`, `loadavg.txt`, `meta.txt`, `started`,
  `ended`. Discarded runs are in `runs/_discarded/`. The ledger is
  `runs/ledger.log`; queue events are in `runs/queue.log`.
- `runs/c15t-waterfall-20261105-000908/`: `waterfall.md`,
  `waterfall.json`, `html.md`, `html.json`, `loadavg.json`.
- `attr/`: `attr-canary.json` (first-load and post-hero attribution by
  package and module), `attr-accept.json` (chunks fetched at the tap),
  `chunk-map.json` (measured chunk to source-mapped chunk, 90/90
  identical), and the source-mapped build copy `with-c15t-sveltekit/`
  (26 MB, deletable).
