# Lane `eager-graph`: trimming c15t's eager client JS on the CookieBench Next fixture

## Summary

- Branch `kaylee/eager-graph-lcp-trims` in worktree
  `/home/kaylee/.t3/worktrees/c15t-private/t3-fd67f1a2`. One commit on top of
  `c35b112b7`: `ed9495320 perf(react): load useScriptLoader's chunk after
  priority images when nothing can run`. Not pushed, no PR.
- A (script-loader chunk) is done. For a fresh visitor the 6,030 B loader chunk
  now starts right after the hero image finishes (about 3.80 s) instead of at
  mount (about 2.0 s). The eager graph grows 259–279 B br from the new hook
  code. Own-script LCP is about 28 ms lower and CookieBench's paired LCP delta
  went from 400 to 388 ms. That is 5 pairs, so it shows a direction, not a
  proven result.
- I skipped B (English copy) and all of C (opt-in subsystems). Each has a
  reason in the code: a synchronous use at kernel construction or render that
  the server and client must agree on, or a documented ordering guarantee.
  Skipping them is cheaper than guessing. Details are in section 4.
- Trade-off of A: when a visitor taps Accept before the hero image finishes,
  the gated scripts wait for the chunk. `action.scripts-complete` goes from
  282–288 ms to 487–488 ms. Input-to-next-paint is unchanged (48 ms against
  72–104 ms on base).

## 1. Per-change bytes

Eager = c15t-only `<script src>` chunks in the HTML (not referenced by
`/baseline`), sizes as served by the fixture proxy (brotli q11). Measured with
`/home/kaylee/.t3/scratch/lcp-fleet/eager-graph/measure.mjs` on a fixture
built with `productionBrowserSourceMaps: true`, so each chunk carries about
40 B of `sourceMappingURL` comment. The harness numbers further down are
without source maps.

| Change | Commit | Eager c15t JS br | Δ | Loader chunk (`__c15tAdopted`, 6,030–6,067 B) before hero end | Notes |
| --- | --- | ---: | ---: | --- | --- |
| Baseline (`c35b112b7`) | — | 67,721 | — | yes, starts 1,990–2,816 ms | 3 eager chunks, rebuilt twice, byte-identical |
| A: loader after priority images or first grant | `ed9495320` | 67,980–68,000 | +259 to +279 | **no**, starts 3,799–3,835 ms (hero end 3,791–3,828) | +bytes = new hook code in the eager chunk |
| B: English copy lazily | skipped | — | (1,823 would be the ceiling) | — | see 4.1 |
| C: opt-in subsystems | skipped | — | (5–7 KB was the estimate) | — | see 4.2 |

Bytes before the hero image finishes (harness waterfall, median-LCP visit,
excluding the hero itself):

| Build | Finished before hero end | Over control |
| --- | ---: | ---: |
| base (old hook) | 204,743 B, 12 requests | +85,635 B |
| A | 199,145 B, 11 requests | +79,975 B |

## 2. LCP (CookieBench via harness `bench.sh`, 5 pairs, 1 warm-up)

Commands, run back to back:

```sh
# base: working tree temporarily set to the HEAD~1 hook; recorded in checkout.diff
WORK_DIR=/home/kaylee/.t3/scratch/lcp-fleet/eager-graph/bench LABEL=base-hook WATERFALL_VISITS=3 \
  /home/kaylee/.t3/scratch/lcp-fleet/harness/bench.sh <worktree> 4370 5
WORK_DIR=/home/kaylee/.t3/scratch/lcp-fleet/eager-graph/bench LABEL=A-ed94953 WATERFALL_VISITS=3 \
  /home/kaylee/.t3/scratch/lcp-fleet/harness/bench.sh <worktree> 4370 5
```

Output: `/home/kaylee/.t3/scratch/lcp-fleet/eager-graph/bench/out/{base-hook-20261102-210331,A-ed94953-20261102-210602}/`.

| Metric | base | A |
| --- | ---: | ---: |
| initial.transfer (candidate median) | 717,690 | 718,142 |
| initial.requests | 15 | 15 |
| FCP (candidate median) | 272 | 276 |
| LCP delta, median of 5 pairs | 400 (95% bootstrap 400 to 412) | 388 (360 to 900, one slow pair) |
| banner.visible | 246 | 254 |
| Own-script waterfall LCP, median of 3 | 3,844 | 3,816 |
| Hero end, median-LCP visit | 3,822 | 3,791 |

`initial.transfer` does not drop. CookieBench's initial window runs past
`load`, so the loader chunk is still counted. A changes when it downloads,
not whether. The ~28 ms LCP gain is consistent with 5–6 KB × 5 ms/KB. With 5
pairs and one outlier, treat it as directional.

## 3. Correctness

### CookieBench scenarios (mobile profile, 2 iterations, 1 warm-up)

Config: `/home/kaylee/.t3/scratch/lcp-fleet/eager-graph/out/{base-scen,A2-scen}/scenarios-run.json`
(the fixture's `run.json` with the mobile profile and scenarios `accept`, `reject`, `withdraw`,
`returning-accepted`, `returning-rejected`). Script: `eager-graph/scenarios.sh`.

| Scenario | base | A | scripts.executions (base / A) | Notes |
| --- | --- | --- | --- | --- |
| accept | 2/2 passed | 2/2 passed | 2 / 2 | scripts-complete 282, 288 → 488, 487 ms; INP 72, 104 → 48, 48 ms |
| reject | 2/2 passed | 2/2 passed | 0 / 0 | INP 184, 256 → 56, 48 ms |
| withdraw | 0/2 incomplete | 0/2 incomplete | n/a | Fails the same way on base: `action.dismissed` and `action.consent-effective` never observed. Not caused by A. Upstream results never ran withdraw for c15t. |
| returning-accepted | 2/2 passed | 2/2 passed | 2 / 2 | loader still loads at mount, because the snapshot grants |
| returning-rejected | 2/2 passed | 2/2 passed | 0 / 0 | |

My first A scenario run overlapped a full react test suite. It showed INP
296–352 ms and long-task blocking 214–433 ms. The clean rerun above (A2) shows
48–56 ms and 0–89 ms. I'm treating the first run as CPU contention.

### Package tests

| Suite | Result |
| --- | --- |
| `packages/react` full | 135 files / 1,057 tests passed (clean run). Two earlier runs overlapped CookieBench and hit flakes: `dialog-stylesheet`, `provider-modules`, `iab-dialog-deferred`. All three pass alone and in the clean full run. |
| `packages/core` full | 147 files / 2,879 tests passed |
| `packages/nextjs` full | 390/391 twice. `ssr-policy` "server reads the notice dismissal…" failed once, and `root-script-loader-preload-consent-source` once. Against a base-built react `dist` (nextjs tests read `../react/dist`), base also failed 1/391 in each of two runs: `root-script-loader-preload-disabled` and the same `ssr-policy` test. Both pass alone. Flaky under load, not A. |
| New: `react/src/__tests__/script-loader-hook-deferral.test.tsx` | 4 tests. Nothing granted: waits for the priority image, then loads. A grant while the image loads: loads and runs the script. Returning grant: loads at mount. Script with `vendor`: loads at mount. The first two fail against the old hook. |

Setup note: react's suite needs `@c15t/integrations` built (`#inline-start`
subpath import). The harness build does not build it. I ran `bun turbo run
build --filter=@c15t/integrations`.

## 4. What changed, and what was skipped and why

### A. `useScriptLoader` (done)

File: `packages/react/src/module-hooks/script-loader.ts`.

- Loads the loader immediately when any script is `alwaysLoad`, already has
  consent (`evaluateConsent` on the kernel snapshot), uses
  `observeConsentBeforeLoad`, names a `vendor`, carries IAB fields
  (`vendorId`, `iabPurposes`, `iabLegIntPurposes`, `iabSpecialFeatures`), uses
  a category condition instead of a plain name, or when the hook got
  `onDebug`.
  - Vendor slugs: the loader declares them into the kernel
    (`declareOwnedVendors`), and the dialog and gate read that. Deferring would
    hide hook-declared vendors (covered by `vendor-options.test.tsx`).
  - Condition categories: the loader registers the categories they name. For
    plain-name categories, the hook now registers them itself at once
    (`kernel.set.registerConsentCategories`), the same call the loader makes.
- Otherwise it subscribes to the kernel and loads on the first snapshot where
  a script can run. It also loads once every `<img fetchpriority="high">` has
  finished, or after 3 s. That is a browser copy of the server start's
  `AFTER_PRIORITY_IMAGES`. A page with no pending priority image loads at once,
  so nothing changes there.
- Returning visitors: the snapshot grants at mount, so the loader loads at
  mount as before. Static export or no server start: the same path, since the
  decision reads the client kernel, not server-start globals. The hook's
  scripts never had a server start; only `ConsentRoot` `options.scripts` do.
- Release note: `.tegami/2026-11-02-script-loader-after-priority-images.md`
  (`@c15t/react` patch).

Costs:

- Gated scripts wait for the chunk after an early Accept: about +200 ms on
  this fixture.
- The loader's debug events and script diagnostics for a fresh visitor start
  later. Devtools sees the scripts after priority images.
- `onDispose` for a hook that unmounts before the loader loads never fires.
  That window existed before (unmount before the chunk landed) and is now
  wider.
- The window `load` event moves about 180 ms later, because the chunk
  requested right after the hero holds `load`. Idle dialog warming after
  `load` starts correspondingly later.

Not changed: the provider's own runtime loader for `options.scripts`
(`react/src/provider.tsx`, via `lazyRuntimeModule`) has the same "load when
started" shape. The fixture does not use it, so I left it alone.

### 4.1 B. English copy (skipped)

The 1,823 B `@c15t/translations` English chunk is reached by at least six
eager modules, and each reads it synchronously:

- `core/src/runtime/runtime-kernel.ts`: `DEFAULT_TRANSLATIONS` and
  `resolveRuntimeTranslations` build the kernel config at construction, on
  server and client alike.
- `core/src/translations/index.ts`: `findStockTranslations` /
  `resolveLocalTranslations` for offline language switches.
- `core/src/libs/consent-copy.ts`: per-key fallbacks in `resolvePromptCopy`
  etc., during render.
- `react/src/component-hooks/use-translations.ts` and
  `react/src/utils/default-translation-config.ts`: render fallback when the
  snapshot has no translations. Also used by legal links, IAB copy and
  `prompt/atoms/root.tsx`.
- `ui/src/utils/translations.ts`.

Lazy English would make client hydration markup differ from server markup
whenever a key falls back (for example, backend copy without `noticeTitle`),
and the client-only kernel would have no default copy at construction. Doing
it safely needs a shared loaded-English holder with subscriptions, plus the
server marking `initialTranslations` as complete. That is a cross-package
redesign, not a low-risk trim.

### 4.2 C. Opt-in subsystems (skipped)

A static import is bundled whatever the runtime config says. So "skip when
not configured" only works where the code path can become async, or where the
host opts in through an import (an API change). Per item:

| Module | br | Why it stays eager |
| --- | ---: | --- |
| `core/libs/vendors.js` | 1,839 | Kernel core: `setters.ts` (`set.vendors` merge), `record-codec.ts` / `record-validation.ts` / `subject-record.ts` (`isValidVendorId`), `init-lifecycle.ts`, and `runtime-kernel.ts` call `resolveVendors` at construction, including vendors from the backend manifest prefetch. |
| `core/libs/experiment.js` + `experiment-storage.js` | 1,349 | Already split: the controller is lazy (`experiment-assignment`). The eager part (`seedExperiment`, `pickExperimentArm`) must run synchronously so the server and the first client paint use the same arm, and so `/init` carries it (`experiment.ts` comments on `seedExperiment` / `startExperiment`). |
| `core/modules/network-blocker/hold.js` | 849 | `assemble.ts` and `provider-runtime.ts` call `holdNetworkRequests` at construction when `networkBlocker` is set. It can't be deferred, and skipping it when unset needs an opt-in import. |
| `react/module-hooks/iframe-blocker.js` | 490 | Iframe blocking is on by default. `watchGatedIframes` / `holdIframe` pause gated frames that arrive before the blocker chunk, a consent guarantee (`lazy-module.ts`: "iframe blocker: gated frames … unless the host pauses them itself (React watches for them)"). |
| `core/kernel/save-outbox/*` | ~1,470 | `save-outbox/index.ts`: "The send path loads with the kernel." Queue-before-send stores an action before its transport starts, so an unload leaves a replay. The queue code is already lazy (`queue.ts`). |
| `transports/hosted-records` + `subject-body` + `init-output` | ~1,318 | `runtime/client-mode.ts`: "What first load needs is what a save needs." A server-rendered banner's first action is a save. A lazy save path would add a chunk fetch (≥150 ms here) to every early Accept POST to save ~0.6–1 KB (~3–5 ms LCP). `init-output` (`kernelConfigToInitResponse`) is used at start for the resolved prefetch. |
| `core/modules/revocation-reload.js` | 327 | `lazy-module.ts`: "The revocation reload watcher has no lazy factory: it must observe the first save." |

## 5. Resource waterfall, one A visit (harness `waterfall.mjs`, LCP 3,816 ms, hero end 3,791 ms)

| # | Request | Transfer B | Start | End | Before hero end | Not in control |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | `/?scripts=2` document | 15,607 | 0 | 229 | yes | yes |
| 2 | Next runtime chunk | 5,688 | 205 | 499 | yes | |
| 3 | React/Next chunk | 76,650 | 207 | 1,683 | yes | |
| 4 | shared chunk | 19,399 | 207 | 829 | yes | |
| 5 | turbopack runtime | 3,922 | 207 | 469 | yes | |
| 6 | shared chunk | 6,519 | 208 | 543 | yes | |
| 7 | c15t eager chunk | 6,732 | 208 | 806 | yes | yes |
| 8 | c15t eager chunk | 43,619 | 208 | 1,488 | yes | yes |
| 9 | c15t eager chunk | 18,951 | 208 | 1,128 | yes | yes |
| 10 | `courtyard.png` (LCP) | 493,920 | 211 | 3,791 | (hero) | |
| 11 | `reading-list.js` | 916 | 1,942 | 2,105 | yes | |
| 12 | `reading-list.json` | 1,142 | 2,109 | 2,270 | yes | |
| 13 | c15t script-loader chunk | 6,030 | 3,799 | 3,986 | **no** (base: 1,988–2,224, yes) | yes |
| 14 | c15t dialog chunk (idle warming) | 7,968 | 4,001 | 4,234 | no | yes |
| 15 | c15t dialog chunk (idle warming) | 10,992 | 4,002 | 4,256 | no | yes |

## 6. Ranked follow-ups for the fleet

1. The same deferral for the provider runtime's own loader (`options.scripts`
   on `ConsentRoot`): the same ~5 KB for apps that configure scripts there. It
   needs care around `script-loader-preload` and server-start adoption. Not
   measured.
2. Proposal 6 from `cookieyes-ideas` (engine after priority images) is still
   the only route to large savings. B and C show that the remaining eager
   modules are tied to synchronous construction and hydration, so per-module
   trims run out quickly.

## 7. Not verified, or limits

- LCP: 5 pairs per arm, run back to back on a shared machine through the
  machine-wide measurement lock. The A interval (360 to 900) includes one slow
  pair. The ~28 ms gain is directional, not a claim.
- Byte attribution per module is `attribute.py`'s proportional estimate from
  source maps, not exact.
- `withdraw` fails identically on base and A. I did not find out why (the
  fixture adapter or the canary dialog). It is not caused by this change.
- I did not test a static-export page or a page without `fetchpriority="high"`
  images in a browser. The logic loads at once when no priority image is
  pending (unit-tested only through the pending-image cases).
- No browser test covers the 3 s fallback timer.
