# Lane `nuxt`: deferred consent engine for the Nuxt module

## Verdict

The deferral is built, tested and measured on branch
`kaylee/nuxt-deferred-engine` (head `b02c13061`, worktree `t3-bf3d3057`, not
pushed). Against CookieYes in the same session, on the mobile profile:

| Target | Result | Met |
| --- | --- | --- |
| banner.visible earlier than CookieYes | 245 vs 1,250 ms | yes |
| LCP below CookieYes | +396 vs +176 ms | **no** |
| Accept consent-effective ≤ CookieYes | median 22 vs 15, max 28 vs 35 | no on median (+7 ms), yes on max |
| Accept scripts-complete ≤ CookieYes | median 193 vs 184, max 206 vs 202 | no (+9 ms median, +4 ms max) |
| Nothing from the tap over 1,000 ms | largest sample 831 ms (preferences) | yes |

Against canary `c35b112b7` the head takes mobile LCP from +1,244 ms to +396
ms and bytes finished before the hero from +124.7 KB to +48.7 KB. Accept and
reject now take effect in the tap's task (22 / 17 ms), faster than canary's
hydrated banner (36 / 30 ms).

The LCP target is not reachable on this fixture by deferring alone. The
remaining +48.7 KB before the hero includes 8.6 KB of script loader that the
fixture's own `consent.vue` imports statically, 10.4 KB of HTML (5.8 KB of
it the c15t component styles Nuxt inlines), and about 5 KB of Vue and Nuxt
runtime the baseline page does not use. To get under +176 ms at the slope
measured here (7.9 ms per KB) the page has to carry no more than about
22 KB before the hero. See "What is left".

## Table: mobile-article-v1, same session

All rows come from `b02c13061` (head), `c35b112b7` (canary, tarballs from
`harness/work/4330/out/baseline-c35b112b7-*`) and CookieYes hosted. October's
configs, ported. `load` has 15 pairs, the action scenarios 10 iterations, 3
warm-ups. LCP and FCP intervals are CookieBench `compare` (95% paired
percentile bootstrap). Every row below passed the gate: control FCP median
≤ 400 ms, every 1-minute load sample ≤ 8 while the run held the lock, no
failed sample.

| Measure | canary | **head** | CookieYes |
| --- | ---: | ---: | ---: |
| LCP Δ vs control (95% CI) | +1,244 (1,232–1,244) | **+396 (384–404)** | +176 (168–188) |
| FCP (Δ) | 288 (+44, 36–56) | 272 (+28, 20–36) | 260 (+8, −8–28) |
| banner.visible | 262 | **245** | 1,250 |
| initial.transfer Δ (10 s window, all bytes) | +146,071 | +137,116 | +30,420 |
| initial.requests Δ | +54 | +46 | +9 |
| initial.long-task-blocking | 88 | 38 | 10 |
| Bytes finished before hero, over control (waterfall, 5 pairs) | +124,654 | **+48,655** | not measured¹ |
| Requests finished before hero (control: 8) | 53 | 25 | not measured |
| `accept` consent-effective median (max) | 36 (91) | **22 (28)** | 15 (35) |
| `accept` scripts-complete median (max) | 254 (302) | **193 (206)** | 184 (202) |
| `accept` dismissed / input-to-next-paint | 122 / 40 | 22 / 24 | 15 / 20 |
| `reject` consent-effective median (max) | 30 (90) | **17 (22)** | 16 (27) |
| `reject` dismissed | 115 | 17 | 16 |
| `preferences` dismissed | 116 | 37 | not in config² |
| `preferences` dialog visible median (max) | 532 (548) | **799 (831)** | not in config² |
| `save` consent-effective median (max) | 32 (56) | 31 (96) | unsupported³ |
| `save` scripts-complete median (max) | 183 (196) | **407 (451)** | unsupported³ |
| `returning-accepted` first gated script from navigation, median (max) | 435 (465) | **430 (506)** | not in config² |
| `returning-accepted` page.lcp (control) | 476 (320) | 322 (314) | — |

1. The waterfall script does not handle CookieYes's TLS host. CookieYes's
   whole transfer is +30.4 KB.
2. October's `nuxt-cookie-yes-mobile.json` has `load`, `accept`, `reject`
   and `save` only.
3. Both CookieYes `save` runs failed every sample with
   `unsupported-action` / `followup:unsupported-action` (0/10 twice).

Desktop (`desktop-article-v1`, 15 pairs, gated):

| | canary | head | CookieYes |
| --- | ---: | ---: | ---: |
| LCP Δ | +124 (no interval⁴) | +68 (56–76) | +4 (−8–8) |
| FCP Δ | +30 | +20 (4–32) | +8 (0–20) |
| banner.visible | 47 | 40 | 278 |

4. `compare` gave no interval for canary desktop.

October (M1 Pro) had c15t 3.0.0 on Nuxt at +532 mobile and +16 desktop.
Canary here is +1,244 and +124. I did not run 3.0.0 on this machine, so I
cannot say how much of that comes from the machine and how much from
3.0.0 → canary.

## How it was measured

- Private CookieBench copy per arm: `nuxt/work/{canary,head}/cookiebench`
  (rsync of `/home/kaylee/.t3/scratch/cookiebench` at `eee967e`, only the
  Nuxt fixture). The fixture's `@c15t/core` and `@c15t/vue` deps and pnpm
  `overrides` point at tarballs, and `pnpm install` + the fixture's own
  `pnpm build` (nuxt build + baseline build) run in the copy.
  `verify-install.mjs` checks each installed package against its tarball.
  Script: `nuxt/bin/prepare.sh`.
- Head tarballs: `nuxt/bin/pack-head.sh` builds `@c15t/vue...` with turbo,
  then packs the closure with `harness/lib/closure.mjs` and
  `bun pm pack --ignore-scripts` (`nuxt/packs-head.tsv`, `.head` =
  `b02c13061`, empty `.diff`). Canary tarballs: the harness lane's
  `c35b112b7` packs, copied to `nuxt/packs-canary/`.
- Configs: `nuxt/bin/make-configs.py` ports October's
  `nuxt-{mobile,desktop}.json` (reduced to `nuxt-baseline` + `nuxt-c15t`) and
  `nuxt-cookie-yes-{mobile,desktop}.json`. It changes ports
  4314/4414/4514/4614 to 5100–5103 (canary, also CookieYes) and 5110–5113
  (head), makes `server.cwd` absolute and drops the runner-side build.
  `preferences` and `returning-accepted` are copied from the fixture's
  `run.json`, because October's Nuxt config has neither. Seed 42 and window
  sizes are October's.
- Runs: `nuxt/bin/cb-run.sh <config> <scenario> <n> 3 <label>`. It starts only
  when the 1-minute load is under 6, queues on
  `/tmp/cookiebench-v3-measurement.lock` (retry every 20 s) and samples
  `/proc/loadavg` every 10 s while it holds the lock. Order: head, canary,
  CookieYes per scenario (`queue-session.sh`), then gated retries
  (`queue-retry.sh`, `queue-final.sh`). Table: `nuxt/bin/table.py`.
- Waterfall: `nuxt/bin/waterfall-nuxt.mjs`, react-arm's
  `waterfall-react.mjs` with the control at `/baseline/`. 5 pairs per arm,
  lock held, load max 5.75 (head) and 3.14 (canary).
- Byte attribution: a source-mapped copy of each build
  (`nuxt/bin/attr-build.sh`) and react-arm's `attribute-run.ts` over the
  chunks the HTML preloads (`nuxt/bin/attr.sh`). Brotli shares are split by
  raw size within each chunk.

### Discarded runs

Other agents' builds and tests ran all night (load peaks 12–65). Discarded,
values kept in `nuxt/runs/` (the first set renamed `_discarded-*`):

| Run | Reason | Value it read |
| --- | --- | --- |
| canary load ×6 (19:53, 21:27, 01:19, 02:40, 03:16, 03:34) | load 32.8 / 12.3 / 36.4 / 9.0 / 27.4 / 9.8 | LCP Δ +1,232 to +1,256 |
| canary load 19:43 | my own `bun install` ran during it | stopped |
| head load ×2 (20:43, 20:54) | load 40.3 / 64.7, 3 and 1 failed samples | +390 / +388 |
| CookieYes load ×3 | load 23.2 / 32.1, control FCP 428 | +172 / +208 |
| canary accept ×2 | load 8.34 / 8.06 | 39 / 42 consent-effective |
| head accept 22:20 | load 13.1 | 28 / 200 |
| CookieYes accept 22:29 | 1 failed sample (`followup:restoration-not-ready`) | 15 / 186 |
| head / canary reject first runs | load 8.89 / 15.3 | 17 / 32 |
| CookieYes reject ×2 | load 41.3, 42.5 + 1 failed sample | 54 / 18 |
| head preferences 23:08 | load 8.38 | 807 |
| head / canary returning-accepted first runs | load 28.3 / 27.1 + control FCP 478; canary 02:33 load 8.51 | 999 / 1,046 / 460 |
| head / canary desktop first runs | load 26.3 / 24.9, 2 failed samples each | +56 / +366 |
| CookieYes save ×2 | every sample failed (`unsupported-action`) | — |

The kept CookieYes `accept` run is the 02:10 run, not the 20:40 reference
run, so all three arms of each scenario come from the same overnight
session.

## Byte diagnosis

### Canary: +124.7 KB finished before the hero (53 requests vs 8)

HTML preloads (static, brotli 11): canary 153.1 KB in 48 assets, baseline
page 48.8 KB in 3.

| Part | Bytes |
| --- | ---: |
| c15t JS in first-load `modulepreload` chunks (attribution) | ~95 KB br |
| — `@c15t/core` (kernel, persistence, script loader, transports, init) | 52.1 KB |
| — `@c15t/vue` (plugin, banner, kernel context, surfaces) | 10.2 KB |
| — `@c15t/schema` (policy-resolution wire reader, rule invariants) | 6.5 KB |
| — `@c15t/ui` (theme, DOM utils, styles JS) | 5.6 KB |
| — `@c15t/translations` | 2.6 KB |
| c15t stylesheet preloads (`tag`, `description-content`, `button` CSS) | 5.7 KB br |
| HTML over baseline (inline component CSS 5.8 KB br, payload 1.6 KB) | +8.9 KB br |

The banner is server HTML at 262 ms. All of this downloads with the entry,
before the 494 KB hero. Nuxt's renderer preloads every chunk the rendered
banner reaches, plus the plugin's static imports of the whole runtime.

### Head: +48.7 KB finished before the hero (25 requests vs 8)

The engine chunk group (35.4 KB entry plus 23 chunks and 5 stylesheets,
about 80 KB on the wire) starts 9 ms after the hero ends, at 3,514 ms.

| Part | Bytes (br) | Note |
| --- | ---: | --- |
| HTML over control | +10.4 KB (12,560 vs 2,173 on the wire) | |
| — c15t component styles Nuxt inlines | 5.8 KB (49.7 KB raw in 5 `<style>`) | banner 18.3, button 19.0, tokens 2.3 + 7.6, actions 2.4 KB raw |
| — Nuxt payload | 2.0 KB | `c15t:consent` plus `c15t:boot` (+0.4 KB over canary) |
| c15t JS in first load | 24.1 KB | of 77.1 KB first-load JS |
| — script loader, `vendors`, `has` | 8.6 KB | the fixture's `consent.vue` imports `createScriptLoader` from `@c15t/core` |
| — instant commit, clear-epoch read, subject id, cookie libs | 4.0 KB | needed for a commit in the tap's task |
| — deferred shell, stand-in, trigger, plain-script start | 2.9 KB | |
| — plugin, `ConsentRoot`, composables, symbols | 2.8 KB | |
| — `@c15t/ui` theme utils, slots, color scheme | 2.7 KB | the tokens `<style>` is regenerated on the client |
| — `@c15t/core` experiment | 1.6 KB | reached through `composables/config` |
| — `@c15t/schema` defaults, geo headers | 1.1 KB | |
| Vue/Nuxt runtime the baseline page does not ship | ~4.9 KB | 77.1 − 24.1 − 48.1 KB (baseline JS) |
| c15t `policy-actions` chunk, `rel=prefetch` | 1.8 KB | fetched before the hero |

LCP cost per KB before the hero: 7.9 ms (head) and 10.0 ms (canary) on Nuxt.
The Next.js lanes measured 4.75. Canary's long-task total is 88–331 ms
against 38 for head, so part of canary's cost is CPU. I did not separate the
two.

## What I built

Branch `kaylee/nuxt-deferred-engine`, on `kaylee/react-deferred-commit-path`
(`9c16ae024`, which carries the banner-only CSS split `05f691f37`).

| Commit | Subject |
| --- | --- |
| `822bf709d` | feat(core): plan a banner or dialog save in the tap's own task (cherry-pick of `eae015cdb` from `kaylee/instant-commit`; core only) |
| `9766a0fd2` | feat(core): read the clear epoch and subject id ahead of an instant commit (the `packages/core` hunk of `6aeb9ac29`) |
| `a8434bc2d` | perf(vue): load the Nuxt module's consent engine after the page |
| `b02c13061` | docs(nuxt): describe when the module loads its consent engine (+ `.tegami/2026-11-03-nuxt-deferred-consent-engine.md`) |

26 files, +3,498 / −253 over `9c16ae024`. Nothing in `packages/react`,
`packages/nextjs` or the Vite `consentManifest` plugin changed.

### Server (`runtime/plugin.nuxt.ts`, `runtime/deferred/boot.ts`)

- The server builds the full engine context, as before. It renders the SSR
  banner, the inline first-paint styles, the early-tap script and the
  server script start.
- `canDeferEngine(snapshot, config)` decides. It defers when the banner is
  active, nothing optional is granted, `planInstantCommit` can record both
  `'all'` and `'none'`, and no option needs the engine at once (IAB,
  experiment, `consentSource`, `gpp`, `networkBlocker`, or a `scripts` entry
  that may run now and the server did not start). It also requires a
  per-request server render with a resolved policy.
- Deferred: the payload gets `c15t:boot` (the snapshot the server rendered).
  An `app:rendered` hook marks the banner's component modules lazily
  hydrated, the way Nuxt's own lazy-hydration components do. The HTML keeps
  their inlined styles but loses their chunk preloads. The global components
  (`ConsentRoot`, `ConsentWidget`, `ConsentGate`, dialog link/trigger) keep
  theirs.
- Not deferred: the server adds `c15t:deferred-engine` to `ssrContext.modules`,
  so Nuxt preloads the engine and its imports. The module copies the engine's
  client manifest entry under that fixed key at `build:manifest`
  (`prefetch.ts`, `preloadDeferredEngine`). With `ssr: false` the entry
  preloads the engine and the banner on every page. The old
  `preloadConsentBanner` call is gone.
- Server-only branches in the plugin sit behind `import.meta.server`, so the
  client build drops the subject cookie, the resolver import and the preload
  marking. I checked by grep in the built chunks.

### Browser first load (`runtime/deferred/shell.ts`, `stand-in.ts`, `trigger.ts`, `scripts.ts`)

- `createDeferredContext` returns the same `VueConsentKernelContext` shape.
  Its refs (`snapshot`, `init`, `activeUI`, `storedConsent`) are filled from
  the boot snapshot over a stand-in kernel, so `provide`/`inject`,
  `useConsentKernel`, `useConsentSnapshot` and `createScriptLoader({ kernel })`
  work unchanged. The stand-in follows the React lanes' design: reads come
  from the snapshot; setters queue (quiet ones such as
  `registerConsentCategories` do not wake the engine); commands load it;
  `set.activeUI` shows a surface locally; after attach every read forwards
  to the engine. The object stays the same for the app's lifetime.
- Engine trigger: every `img[fetchpriority=high]` loaded or failed (window
  `load` when there is none), the first pointerdown, keydown or scroll
  outside the banner, focus on a stock surface, page code that needs the
  engine, or 10 s. The engine and the banner chunk load in one round trip
  (`Promise.all`).
- Tap before the engine. The early-tap script's notify hook (`n`) calls
  `routeTap`. For accept or reject it runs `planInstantCommit` on the
  stand-in's snapshot in the tap's task, with the clear epoch and a subject
  id read after hydration. Then it inserts the plain config `scripts` the
  choice allows (`__c15tStarted`, adopted later by the loader) and commits
  the snapshot on the stand-in. The refs and page loaders on the kernel hear
  it in the same task; the fixture's loader inserts `/controlled/script`
  there. The early-tap style moves to `c15t-early-commit` so the engine's
  banner replays nothing.
- One task later `deferred/commit.ts` (own chunk) re-plans with
  `planEarlyCommit` from the same snapshot, subject and clock. It keeps the
  instant snapshot when equal, stores the record (localStorage + cookie),
  queues the outbox save and calls `onChoiceRecorded` and
  `onPermissionsChanged`. Then the engine is requested.
- Customize before the engine: the banner is hidden and the dialog opens
  from the stand-in. The engine loads once the dialog is in the DOM. A save
  from the dialog goes through the same commit path (`hooks.early` on
  `commands.save`).

### Engine (`runtime/deferred/engine.ts`)

- `createNuxtEngineContext` builds the runtime as the old plugin did. After a
  commit it seeds `initialRecords` with the committed records and `now` with
  the client clock, and filters `onPermissionsChanged` against what the app
  already heard. The shell calls `replaySaves()` after `start()`, so the
  queued save goes out once and nothing is recorded again.
- The stock banner hydrates after attach from `ConsentBannerHost`
  (`lazy-surfaces.ts`). Until it has hydrated it reads a view of the context
  pinned to the server snapshot, so a choice made before then does not
  change what it hydrates.

### Smaller changes

- `display-data.ts`, `init-headers.ts`, `provide.ts`, `client-data.ts` split
  out of `kernel.ts` and `plugin.nuxt.ts` (re-exported unchanged), so the
  first-load chunk does not import the runtime.
- `nuxt-root.vue` reads `showTrigger` from the injected config instead of
  `useConsentConfig()`.
- Docs: `docs/frameworks/nuxt/rendering.mdx`, new section "When the consent
  engine loads". Release note: `c15t`, `@c15t/core`, `@c15t/vue` minor.

## Tests

| Suite | Result |
| --- | --- |
| `packages/vue` (`vitest run`, final head) | 78 files, 673 tests, all pass (canary base: 76 files, 659) |
| New `nuxt-deferred-context.test.ts` | 5 tests: the context reads the boot snapshot without loading the engine; an accept before the engine commits in the tap's task (refs, a page `createScriptLoader` inserts both scripts, commit chunk not yet called, engine not requested); one task later the record is stored and the engine requested; the engine adopts the record, sends exactly one save, emits no `choice:recorded`, and the context forwards to it; a tap recorded before `start()` is replayed and the queue emptied; Customize opens the dialog from the stand-in and a dialog save commits at once |
| New `nuxt-deferred-boot.test.ts` | 9 tests: `canDeferEngine` cases (fresh choice banner, returning, opt-out, notice, IAB / gpp / networkBlocker / experiment / consentSource, scripts with and without server start); the trigger's copies of the early-tap names match the inline script text; `preloadDeferredEngine` with and without SSR, and with no c15t engine |
| `packages/core` `src/surface-actions` | 3 files, 251 tests pass (includes the cherry-picked `instant-commit.test.ts`) |
| `check-types:nuxt` (`nuxt typecheck playground`) | passes |
| `check-types:vue` (`vue-tsc`) | 1 error, `src/vite.ts(78,19)` TS2684. Neither that file nor `packages/core/src/build.ts` changes on this branch; the error comes with the base. I did not rerun it on `9c16ae024` alone. |
| oxlint, oxfmt on changed files | clean (run per file; a multi-file call reported "no files" under this worktree path) |

## Risks

- **Customize is slower than canary: 799 ms vs 532** to the dialog. On canary
  the banner's chunks (buttons, tag, description styles) are already loaded
  when the dialog opens; on the head they arrive with the dialog over the
  200 KB/s link. Under 1,000 ms, over the 500 ms target.
- **`save` scripts-complete 407 vs 183 ms.** The engine group (~80 KB) starts
  once the dialog is shown and shares the link with the two controlled
  scripts the save allows. Consent takes effect at 31 ms.
- **Accept and reject are 7 and 1 ms slower than CookieYes's median**,
  scripts-complete 9 ms. Within run-to-run spread; not under.
- **Page scripts the plugin does not know about** (the fixture's own
  `createScriptLoader`) start from the stand-in's listeners, not from
  `startPlainScripts`. They are not preloaded on press as on Next.js.
- **Stand-in identity:** the fixture's script loader is created on the
  stand-in kernel and stays there. Its diagnostics and vendor owners are
  keyed by the stand-in, not the engine's kernel (the same risk the React
  lanes named).
- **`ConsentRuntime` is `undefined` before attach** (`context.runtime`);
  `context.iab` is `undefined` too. The devtools plugin and
  `useEventDispatcher` read `runtime` and were not tested under the stand-in.
- **The lazy-hydration marking** relies on Nuxt 4.5's renderer reading
  `ssrContext['~lazyHydratedModules']` as a preload exclude list. That is a
  private field; another Nuxt version may ignore it, and the HTML would then
  preload the banner chunk again (bytes, not breakage).
- **The fixed manifest key** (`c15t:deferred-engine`) depends on
  `build:manifest` running before `precomputeDependencies`. True in Nuxt
  4.5.2's vite-builder; not checked in Nuxt 3 or webpack/rspack builders.
- **`c15t:boot` adds ~1.4 KB raw to the payload** (0.4 KB br) and duplicates
  part of `c15t:consent`.
- **Hydration mismatch warning.** Every visit logs "Hydration completed but
  contains mismatches", on canary as well as head. I did not trace it.
- **Banner impression:** a visitor who taps before the engine gets no
  `surface:shown` for that banner (same as the commit-path lane).

## What is left

- **LCP below CookieYes.** Needs about 26 KB fewer bytes before the hero.
  Candidates, in brotli: drop the client-side tokens regeneration and
  experiment theming from first load (≈4 KB); stop the `policy-actions`
  prefetch (1.8 KB); trim the payload duplicate (0.4 KB). Those add up to
  about 6 KB, or about 50 ms. The rest is the fixture's static
  `createScriptLoader` import (8.6 KB), the inline component CSS (5.8 KB;
  the banner and button sheets are 37 KB raw) and Nuxt/Vue runtime the
  baseline lacks. Closing the gap needs a smaller inline sheet for Nuxt (the
  banner-only split does not apply to Nuxt's per-component inlining) and a
  fixture that loads its script loader lazily, or a lighter loader on the
  stand-in.
- **Customize to under 500 ms:** preload the dialog's chunks at
  pointerdown on Customize, or move the shared button and tag code out of
  the dialog group.
- **Not run:** `reject-keyboard`, `withdraw`, `accept-early`; desktop action
  scenarios; a waterfall for CookieYes; c15t 3.0.0 on this machine.

## Not verified

- CookieYes's bytes before the hero (no waterfall, TLS host).
- Why canary costs +1,244 ms here against October's +532 for 3.0.0.
- Nuxt 3, `ssr: false`, prerendered, cached and `routeRules` paths in a
  browser. Only unit tests cover the eager branch's preload key; no browser
  test covers a returning visitor's preload. CookieBench `returning-accepted`
  did run (head 430 ms vs canary 435 ms first gated script).
- The pre-hydration tap path in CookieBench: its scenarios tap after
  readiness. My own unthrottled probe tapped at 76 ms and saw consent at
  213 ms with no errors. The throttled smoke run (tap at 324 ms) saw consent
  at 1,153 ms from navigation, about 830 ms after the tap. That number comes
  from my script, not CookieBench.
- `vue-tsc`'s `src/vite.ts` error on the base commit alone.

## Artifacts

All under `/home/kaylee/.t3/scratch/lcp-fleet/nuxt/`:

- `bin/`: `prepare.sh`, `pack-head.sh`, `make-configs.py`, `cb-run.sh`,
  `queue-*.sh`, `table.py`, `waterfall-nuxt.mjs`, `static-assets.sh`,
  `attr-build.sh`, `attr.sh`, `attr-summary.py`, `html-parts.py`,
  `smoke.mjs`, `probe-click.mjs`, `heavy-ok.sh`
- `configs/`: ported configs
- `runs/s1-*`: kept runs (each has `config.json`, `envelope.json`,
  `compare-*.json`, `loadavg.txt`); `runs/_discarded-*`; waterfalls in
  `runs/s1-{head,canary}-waterfall/waterfall.md`
- `static/`: HTML, asset tables, attribution JSON (`attr-canary.json`,
  `attr-head-final.json`)
- `work/{canary,head}/cookiebench`: the fixture builds measured
