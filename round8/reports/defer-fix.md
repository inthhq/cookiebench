# Lane `defer-fix`: harden `ConsentRoot`'s deferred engine

## Verdict

All four fixes are in, each in its own commit, on top of defer-default (`2a7c3ea2a`).

- **Mobile LCP cost: +56 ms (52–68), 15 pairs.** Canary HEAD measured +400 ms (380–404) in the same session. defer-default reported +48 ms (44–56); the 8 ms difference is about +0.6 KB of shell JS and within run-to-run noise.
- **Banner visibility did not regress** in any table: 242–266 ms on mobile against 244–263 ms on canary, and 67 vs 65 ms on desktop.
- **Desktop LCP cost: +28 ms (16–48)**, against +40 ms (28–52) on canary.
- **Fix 1** (runnable scripts start the engine): an `alwaysLoad` hook script now runs at 2,849 ms, against 4,469 ms before the fix and 2,400 ms on canary. The trade-off: on such a page the 65 KB engine downloads alongside the hero again, so LCP returns to canary's level for that page.
- **Fix 2** (free trigger): with a scroll at 1.8 s, Accept at 2.8 s takes effect 91 ms after the tap. Before the fix it took 967 ms. CookieBench's own scenarios can't show this, because there the tap is the first input.
- **Fix 3** (cold returning visitors): a learned preload starts the engine's chunks at 211 ms. The first hook script runs at 2,587 ms, against 2,811 ms before and 2,393 ms on canary. That closes 224 of the 418 ms gap.
- **Fix 4** found two real bugs:
  - `useEventDispatcher` threw before attach and kept throwing after it.
  - `usePersistence` threw on the stand-in.
  - Also fixed: mounting `useNetworkBlocker`/`useIframeBlocker` loaded the engine early, the script loader's per-kernel state was split across two keys, and IAB roots went through the stand-in.
- **Remaining cost for fresh visitors:** an action taken before the engine loads still waits for it.
  - CookieBench `accept`: consent takes effect 953 ms after the tap; canary 69 ms.
  - `preferences`: the dialog opens 891 ms after the tap; canary 44 ms.
  - 1 of 10 `preferences` samples completed after the measurement window.

## Commits

Branch `t3/98c1f078` (worktree `/home/kaylee/.t3/worktrees/c15t-private/t3-98c1f078`). Not pushed. Base: `2a7c3ea2a` (defer-default) and its parent `d4234da66`.

| Commit | Subject |
| --- | --- |
| `fdeb90cff` | fix(react): start the deferred engine for scripts that may run now |
| `c3ec305ca` | feat(react): load the deferred engine at the first input or scroll |
| `a6835915a` | fix(react): make page hooks safe under the deferred engine's stand-in |
| `6b8e8dcaf` | feat(nextjs): preload the deferred engine for visitors it must serve at once |
| `16b0eac46` | docs(next): describe when ConsentRoot loads its consent engine (+ `.tegami/2026-11-02-deferred-consent-engine.md`) |

23 files, +1,155 / −84 over `2a7c3ea2a`.

## Per-fix evidence

The probe is `defer-fix/bin/probe.mjs`: mobile profile throttling, the CookieBench lock, 5 reps, medians in ms from navigation. It ran on three builds of the same fixture copy:

- canary HEAD `c35b112b7` (`defer-fix/work-head`, port 4381);
- the base `2a7c3ea2a` (`defer-fix/work-base`);
- this branch (`harness/work/4390`).

The fixture copy (`defer-fix/cb-src`) adds one thing: `?always=1` makes `Probe` pass one more script to `useScriptLoader`, `{ alwaysLoad: true, category: 'measurement' }`. The default page is unchanged.

| Probe | canary | base `2a7c3ea2a` | this branch |
| --- | ---: | ---: | ---: |
| `?always=1`: the `alwaysLoad` hook script runs | 2,400 | 4,469 | **2,849** |
| `?always=1`: probe LCP | 3,864 | 3,508 | 3,920 |
| Cold returning visitor (storage kept, cache off): first hook script | 2,393 | 2,811 | **2,587** |
| Scroll at 1.8 s, Accept at 2.8 s: consent effective after the tap | not run | 967 | **91** |
| Scroll at 1.8 s, Accept at 2.8 s: first gated script | not run | 4,106 | 3,113 |
| Customize at 1.0 s: dialog open after the tap | 1,437 | 1,881 | 1,889 |
| Customize at 1.0 s: banner hidden after the tap | 1,036 | 1,472 | 1,482 |
| Accept at 1.0 s: banner hidden after the tap | 70 | 60 | 67 |
| Accept at 1.0 s: consent effective after the tap | 1,026 | 1,487 | 1,474 |
| Accept at 1.0 s: first gated script | 2,391 | 2,903 | 2,891 |
| Page under `ConsentRoot` hydrated (no tap) | 1,920 | 1,561 | 1,581 |

Console and page errors: 0 in every probe visit.

### Fix 1: ungated hook scripts no longer wait for the hero

- **Change.**
  - `useScriptLoader` asks for the engine as soon as it receives a script the stand-in's snapshot lets run (`alwaysLoad`, or a category condition that holds, such as `necessary`). It does this on mount and through `updateScripts`.
  - `ConsentRoot`'s plan does the same for config/prop `scripts` (`scriptsNeedEngine`), except entries the server already started from the HTML.
  - `isRunnableNow` is a 30-line condition evaluator in the first-load chunk. Vendor and IAB checks stay with the loader.
- **Evidence.**
  - `deferred-script-loader.test.tsx`: a gated script leaves the engine waiting; `alwaysLoad`/`necessary` on mount, and a runnable script passed later, request it. Plus a table for `isRunnableNow` and `scriptsNeedEngine`. The three hook tests fail with the hook change reverted (checked).
  - Probe: 4,469 → 2,849 ms. The engine's three chunks start at 1,574 ms (hydration), not after the hero (3,477 ms).
- **Why still +449 vs canary.**
  - Canary fetches a 6 KB loader chunk at hydration. This branch fetches the 65 KB engine at hydration, then the 10 KB loader chunk after attach (2,397 ms).
  - The hook only learns about the script in an effect, at hydration, so the engine can't start earlier.
- **Trade-off.** A page whose hook passes an always-runnable script loads the engine before the hero finishes, so its LCP is about canary's (probe LCP 3,920 vs 3,864). The brief asked for this behaviour; it is in the docs. A page that wants the LCP win can move such a script to config `scripts` with a `serverStart`.

### Fix 2: page-wide trigger

- **Change.**
  - `pointerdown`, `keydown` and `scroll` anywhere (capture on `window`) start the engine.
  - `focusin` still counts only on the banner/overlay.
  - If the page has already scrolled when the trigger is scheduled (`scrollY > 0`), it fires at once. Without this, a scroll before hydration would be missed, because the listeners only exist after hydration (~1.56 s).
  - The hero-image, early-tap, `load` and 10 s triggers are unchanged.
- **Evidence.**
  - `deferred-kernel.test.ts`: the trigger fires on each event (scroll on `document` and on an element), once only, with listeners removed afterwards; also when already scrolled, and on banner focus and pointer.
  - Probe: base 967 ms vs this branch 91 ms from tap to consent. The engine chunks start 8 ms after the scroll (1,812 ms).
- **LCP.** In the 15-pair `load` run CookieBench does not scroll or tap, so this trigger cannot fire there, and LCP is unchanged within noise (+56 vs +48). I did not build a scenario that scrolls during `load`. The claim that it costs zero LCP rests on the LCP spec: observation stops at the first input or scroll.

### Fix 3: cold returning visitors

**What I tried.**

1. **`next/dynamic` from the package.** I patched the built `dist/root.js` in the fixture to wrap `import('./root-engine.js')` in `next/dynamic` with SSR, two variants (`.then(...)` and a bare `import()`).
   - Next 16.0.7 / Turbopack did not add `loadableGenerated.modules` to the call in `node_modules`.
   - `react-loadable-manifest.json` stayed `{}`, so `PreloadChunks` emits nothing.
   - `next/dynamic` without `.js` doesn't even resolve from the package (ESM).
2. **Server manifests.** The engine chunk appears in no server manifest. `page_client-reference-manifest.js` lists only the client boundary's own chunk (`consent.tsx`), not chunks reached through `import()`. So the server has no chunk URL to emit.
3. **`ReactDOM.preload` from the shell.** Rejected: the shell already starts `import()` as soon as its chunk executes. A preload from the same chunk gains nothing.

**What works: a learned preload.**

- When the shell imports the engine, it records the script URLs the import added. They go in `localStorage` (`c15t-engine-chunks`), keyed by the sorted `src` list of the `async` scripts in `<head>`, so a new build changes the key.
- When the boot snapshot says "eager", the server's boot data includes an inline script that preloads those URLs (`<link rel=preload as=script fetchpriority=low>`) while the HTML parses.
- For deferrable visitors the same `<script>` element is rendered empty, so the client hydrates the same elements.
- The inline script text sits in its own module and is not in the first-load chunk. I grep-checked the built chunk.

**Evidence.**

- `engine-preload.test.ts`: it records only the added scripts, records nothing on a failed import, preloads for the same build, does nothing after a new build, and ignores corrupt data.
- `deferred-root.test.tsx`: the fresh-visitor server HTML has no preload; the returning visitor's does.
- `root-server-start.test.tsx`: the regexes now expect the script.
- End-to-end check (`defer-fix/bin/check-preload.mjs`): a fresh visit learns 3 chunks; the return HTML preloads exactly those 3; no errors.
- Probe, cold returning: 2,811 → 2,587 ms (spread 2,519–2,961). The engine chunks start at 211–214 ms.

**Remaining +194 ms vs canary:**

- The loader chunk (10.3 KB, vs canary's 6 KB) is requested only after the engine attaches, at 2,081 ms, against 1,947 ms on canary.
- Hydration is about 70 ms later, because the preloaded engine bytes share the link with the page's chunks.

The next step would be to start `loadScriptLoader()` when the engine *module* resolves rather than after attach. That is worth about 90 ms on this trace. I did not do it.

**Limits.**

- The first visit after a deploy gets no preload.
- With storage blocked, nothing changes from defer-default.
- Warm returning (`returning-accepted`, CookieBench): first gated script at 735 ms vs canary's 625 ms (+110). defer-default measured +84 in its run. The preload does little when the chunks are already cached.

### Fix 4: hooks under the stand-in (audit)

| Item | Finding | Fix | Test |
| --- | --- | --- | --- |
| `useEventDispatcher` before attach | **Bug.** It read `services.runtime` once per render. Under the stand-in that is `undefined`, so `track()`/`pageview()` threw (`undefined.scripts`). The memo also kept the `undefined` after attach. | Reads the runtime per call. Events sent before attach queue on `services.ready` and are delivered after it, without loading the engine. The dispatcher's identity stays stable across the `enabled` toggle (existing test). | `deferred-hooks.test.tsx`: early event delivered after attach, engine not requested. Fails with the fix reverted. |
| `usePersistence` before attach | **Bug.** `createPersistence` calls `kernel.hydrate`, which the stand-in lacks, so the effect threw. | Waits for the engine (`deferredModules(kernel)`), then creates persistence. Does not load the engine. | Same file; fails with the fix reverted. |
| `useNetworkBlocker` / `useIframeBlocker` before attach | No crash. They only use `getSnapshot`, `subscribe` and `set.registerConsentCategories`/`set.vendors`. But those setters called `requestEngine`, so mounting either hook loaded the engine at hydration and lost the LCP win. Blocking works from the stand-in's snapshot (nothing optional granted). | `registerConsentCategories` and `vendors` queue without requesting the engine (`QUIET_SETTERS`), and replay at attach. | Setter test; fails with the fix reverted. |
| WeakMap: script-loader `diagnostics` registries, `libs/vendors` owner `registries` | **Split keys.** The provider's loader for `options.scripts` registers on the engine's kernel; the hook's loader registered on the stand-in. Devtools' `getScriptDiagnostics(kernel)` and vendor ownership saw two sets. | The hook creates its loader on the engine's kernel (`attachedKernel`) and recreates it when the engine swaps kernels (`enabled` toggle). | `deferred-hooks.test.tsx`: both loaders appear on the engine kernel; the stand-in has none. Fails with the fix reverted. |
| WeakMap: `surface-actions/rules.ts` `actions` | Safe. `beginAction` and `actions.get` in `saveConsentSurface` use the same kernel object within one call (from `useDraftKernel`). The stand-in routes reads to the engine but keeps its own identity, so each call is self-consistent. No change. | none | none |
| WeakMap: `modules/iab-controls` registrations | Risk. `IABProvider` would call `createIAB` with the stand-in, which has no `iab` state. | Roots with `model === 'iab'` or a loaded `IABProvider` (registry symbol `c15t.react.iab-provider`) take the eager plan. | Unit test of the mark only; no nextjs plan test. |
| WeakMap: `events.ts` `pageviewStates` | Keyed by runtime, not kernel; fine once the dispatcher reads the live runtime. | none | none |
| WeakMap: `persistence/mount.ts` `handedOver` | Internal kernels only; never sees the stand-in once `usePersistence` waits. | none | none |
| `ProviderServices.runtime` undefined before attach | Documented on the type. A new internal `ready` promise is set only by the stand-in. Other readers (`useConsentSaveAction`, devtools, early-tap replay, `useSetLanguage`) use the services' functions, which the stand-in implements. | see the first row | none |

## Scenario table, mobile profile, 10 actions each (15 pairs for `load`)

Run with CookieBench as shipped (`--scenario <id> --iterations N --warmups 1`), using `defer-fix/bin/cb-run.sh`. Action scenarios run the c15t fixture only; `load` runs paired. Candidate = this branch built from `61a93367b`, a pre-rebase hash. It has the same code as `6b8e8dcaf` except two later changes: the `scrollY` check, later folded into `c3ec305ca`, and the dispatcher stability fix, later folded into `a6835915a`. The fixture uses neither path in these scenarios. The final commit's 5-pair `load` check is listed under Artifacts. canary = `c35b112b7`. Values are medians in ms.

### `load`

| Measure | canary | this branch |
| --- | ---: | ---: |
| Samples passed | 15/15 | 15/15 |
| LCP delta vs control (CookieBench compare, 97.5% interval) | **+400 (380–404)** | **+56 (52–68)** |
| FCP delta vs control | +24 (−16 to 32) | +28 (20–32) |
| FCP (c15t arm) | 272 | 276 |
| banner.visible | 246 | 250 |
| initial.transfer delta (5 s window, includes post-hero bytes) | +104,770 | +117,382 |
| initial.requests delta | +5 | +6 |
| Bytes finished before the hero, excl. hero (waterfall, median pair) | +85,654 (harness baseline) | **+20,988** |

The c15t first-load chunk is 7,505 B br (`92a9f1f2…`, 21.9 KB raw), against 6,871 B in defer-default. The +634 B is `isRunnableNow`, `scriptsNeedEngine`, the learning half of the preload, the IAB mark check and the trigger changes. The document is 18,414 B br (defer-default 18,409).

Waterfall: the engine's chunks start at 3,484–3,487 ms, after the hero ends (3,477 ms).

### Desktop `load`, 15 pairs

| Measure | canary | this branch |
| --- | ---: | ---: |
| LCP delta vs control | +40 (28–52) | +28 (16–48) |
| FCP delta | +40 (16–52) | +32 (16–64) |
| banner.visible | 65 | 67 |

### Action scenarios

| Scenario | Build | Passed | banner.visible | input-to-next-paint | dismissed | consent-effective | scripts-complete |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accept | canary | 10/10 | 263 | 72 | 69 | 69 | 234 |
| accept | branch | 10/10 | 266 | 40 | 38 | **953** | **1,341** |
| reject | canary | 10/10 | 245 | 40 | 39 | 39 | n/a |
| reject | branch | 10/10 | 243 | 32 | 28 | **889** | n/a |
| save | canary | 10/10 | 244 | 40 | 32 | 32 | 180 |
| save | branch | 10/10 | 242 | 40 | 35 | 35 | 185 |
| preferences | canary | 9/10¹ | 260 | 48 | 44 | n/a | n/a |
| preferences | branch | 9/10² | 244 | 32 | **891** | n/a | n/a |
| withdraw | canary | 0/10³ | n/a | n/a | n/a | n/a | n/a |
| withdraw | branch | 0/10³ | n/a | n/a | n/a | n/a | n/a |
| reject-keyboard | canary | 10/10 | 248 | 32 | 27 | 27 | n/a |
| reject-keyboard | branch | 10/10 | 245 | 16 (n=9) | 9 | **873** | n/a |
| returning-accepted | canary | 10/10 | no banner | | | | first gated script 625 |
| returning-accepted | branch | 10/10 | no banner | | | | first gated script **735** |
| returning-rejected | canary | 10/10 | no banner | | | | n/a |
| returning-rejected | branch | 10/10 | no banner | | | | n/a |

`page.lcp` in the returning scenarios: canary 272 / 278, branch 284 / 284.

Notes:

1. canary `preferences` sample 4: "Declared readiness condition did not become true".
2. branch `preferences` sample 7: "Action completion was verified only after the measurement cutoff". The dialog took 1,256 ms; the other nine took 877–957 ms. This is the Customize-before-engine path; one sample in ten falls outside the window.
3. **`withdraw` fails on both builds in the same way**: all 10 samples report "Required observations unavailable: action.dismissed, action.consent-effective". This branch does not change it.

`save` is unchanged: it runs after the dialog is open, by which time the engine has loaded.

Customize tapped before the engine loads: the CookieBench `preferences` row above (891 ms from tap to dialog, against 44 ms on canary), and the probe at 1.0 s (dialog 1,889 ms after the tap, against 1,437 ms on canary, where hydration was the limit). Fix 2 does not help here, because the tap is the first input.

### Banner visibility, hard constraint

| Run | canary | this branch |
| --- | ---: | ---: |
| load, mobile | 246 | 250 |
| load, desktop | 65 | 67 |
| accept / reject / save | 263 / 245 / 244 | 266 / 243 / 242 |
| preferences / reject-keyboard | 260 / 248 | 244 / 245 |
| probes (no tap / tap at 1 s) | 249 / 306 | 245 / 286 |

No regression beyond noise.

## Docs and release note

- `docs/frameworks/next/optimization.mdx`:
  - New section "Know when ConsentRoot loads its engine": the loading table, the cases that load or render the engine at once, and hook behaviour before the engine.
  - The "Start returning visitors' scripts sooner" section now describes the learned preload instead of "c15t does not add a modulepreload".
- `docs/frameworks/next/content-security-policy.mdx`: a bullet for the new inline script, which takes `options.nonce`, has the same content for every visitor (hashable), and fails safe.
- `.tegami/2026-11-02-deferred-consent-engine.md`: `c15t`, `@c15t/nextjs` and `@c15t/react` minor. It covers the whole deferred engine, since `2a7c3ea2a` had no note.
- `bun run lint:docs` changed nothing beyond the two pages.

## Tests run

- `packages/react` deferred suites: 5 files, 40 tests, pass. New files: `deferred-script-loader.test.tsx`, `deferred-hooks.test.tsx`, `engine-preload.test.ts`. Extended: `deferred-kernel.test.ts`, `deferred-root.test.tsx`.
- `packages/react` full suite, with `@c15t/integrations` built first, on a quiet machine: 139 files, 1,093 tests, all pass. Three files (`astro-iab-loader`, `dialog-stylesheet`, `experiment`) left failure screenshots, so at least one attempt each failed and passed on vitest's retry. defer-default also reported `dialog-stylesheet` failing once under load. I did not investigate them further.
- `packages/nextjs` full suite: 37 files, 396 tests, all pass.
- `packages/core` (`turbo run test --filter=@c15t/core`): passes.
- `check-types` for `@c15t/react`, `@c15t/nextjs`, `@c15t/core` and `c15t`: 18/18 tasks pass.
- Oxlint and Oxfmt are clean on all changed files; the pre-commit hook ran.

An earlier full-suite run, taken while CookieBench scenarios were measuring, failed three tests:

- `event-dispatcher.test.tsx` was a real regression from fix 4: the dispatcher's identity changed across the `enabled` toggle. Fixed in `a6835915a` and verified.
- `split-entry-deferral.test.tsx` (an 11 s timeout) and nextjs `ssr-policy.test.tsx` "server reads the notice dismissal…" passed when run alone, and pass in the final full runs above.

## Remaining risks

- **Fresh visitors' early actions** still wait for the 65 KB engine: about 0.9 s after the tap on the throttled profile, for consent to take effect and for Customize. One `preferences` sample in ten missed CookieBench's window. Fix 2 removes the wait for anyone who scrolls or taps the page first. A tap that is the first input still pays it.
- **Hook scripts that may run now** bring back the LCP cost on that page (by design, per fix 1). Config `scripts` with `serverStart` avoid it.
- **Cold returning** is still +194 ms vs canary. The next step is to request the loader chunk when the engine module resolves (about 90 ms). The rest is hydration sharing the link with the preloaded engine.
- **The learned preload** depends on `localStorage`, on the `async` head-script key staying stable within a build, and on the bundler inserting `<script>` elements for chunks (Turbopack does). Rspack/webpack via `next build --webpack` is not tested.
- **Quiet setters.** `set.vendors` from a module hook is applied only at attach. A page that reads `snapshot.vendors` before then sees the server's list. Gating is unaffected, since nothing optional is granted.
- **IAB detection** relies on `@c15t/react/iab` having evaluated before `ConsentRoot`'s first render. That holds when the app imports it statically; a lazily imported `IABProvider` under a non-IAB snapshot would still get the stand-in.
- **Not covered by a browser test:**
  - the nextjs `planRoot` branches for IAB, the script check and the preload;
  - React 18 Pages Router hydration with the new boot-data script (only the node server-start tests cover React 18 there).
- From defer-default and unchanged: the boot snapshot carries 5.8 KB raw of English copy, and `ConsentRoot` rendered client-only suspends once.

## Not verified

- **Fix 2 on LCP in a run that scrolls or taps during load.** CookieBench's `load` does neither, so the 15-pair number cannot show it.
- **Probe numbers** are 5 reps each, from my own script, not CookieBench. CookieBench has no cold-returning, scroll-then-tap or `alwaysLoad`-hook scenario.
- **Desktop action scenarios** were not run, only desktop `load`.
- **Webpack builds** of the fixture were not tried; only Turbopack, the Next 16 default.
- **Sequencing.** The 2-hour background limit stopped the first measurement sequence during `reject-keyboard`. I discarded that partial run and reran `reject-keyboard`, `returning-*` and the probes. Other lanes held the lock in between, so the scenario pairs (branch then canary) were taken minutes apart, not interleaved.

## Artifacts

All under `/home/kaylee/.t3/scratch/lcp-fleet/`:

- `harness/work/4390/out/defer-fix-20261102-230454/`: 15-pair mobile `load` with waterfall.
- `harness/work/4390/out/final-check-20261103-020133/`: 5-pair `load` of the final commit `16b0eac46`: LCP +56 ms (36–64), banner.visible 245, 5/5 passed.
- `defer-fix/runs/*/envelope.json`: every scenario and the HEAD/desktop `load` runs (`compare-*.json` alongside).
- `defer-fix/probes/*.jsonl`: probes. `-4381` is canary, `-base` is `2a7c3ea2a`, `-4390`/`work-cand` is this branch.
- `defer-fix/bin/`: `cb-run.sh`, `measure-all.sh`, `probe.mjs`, `check-preload.mjs`, `table.js`, `serve.sh`/`stop.sh`.
- `defer-fix/cb-src`: the fixture copy with the `?always=1` variant.
- `defer-fix/work-base`: the base `2a7c3ea2a` fixture build used for the base probes. Its source worktree was removed after the runs.
