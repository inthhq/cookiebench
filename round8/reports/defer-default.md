# Lane `defer-default`: deferral as the default behaviour of `ConsentRoot`

## Verdict

**It works, and it can be the default, with one trade-off to decide on.**

- The quickstart shape works unchanged: `ConsentRoot` wraps `{children}`, and `Probe` calls `useSnapshot`, `useSetActiveUI`, `useSaveConsents` and `useScriptLoader`. The fixture is unmodified.
- Mobile LCP cost on CookieBench drops from **+396 ms to +48 ms** (15 pairs, 44–56). The banner is still in the first HTML and visible at 244 ms.
- The page under `ConsentRoot` hydrates **about 370 ms earlier** than on canary, because c15t's engine is no longer in its first-load JS.
- **Cost for fresh visitors:** consent takes effect later after a tap, because the engine downloads after the tap. CookieBench `action.consent-effective` goes from 40 ms to 872 ms. The banner still hides at the tap (27 ms).
- **Cost for returning visitors** whose scripts come from `useScriptLoader`: those scripts start +84 ms later with a warm cache and +414 ms later with a cold one. Config `scripts` with the server start are not affected.

Every CookieBench sample passed: `load` 15/15, `accept` 10/10, `returning-accepted` 10/10. None hit the 5 s readiness window.

## Branch and commits

Branch `t3/92c937ce`, not pushed.

- `d4234da66`: the scheduling lane's opt-in `deferConsent()`, fast-forwarded. It is now redundant, but I left it in.
- `2a7c3ea2a` `feat(nextjs): load ConsentRoot's consent engine after the page`: this lane.

## Numbers against canary HEAD

Setup:

- CookieBench mobile profile, unmodified `with-c15t-nextjs` fixture.
- Candidate: harness at port 4380.
- Canary HEAD (`c35b112b7`): built into `defer-default/work-head` (4381) for the scenario and probe runs. The LCP row uses the harness lane's HEAD baseline.

Commands:

- LCP: `LABEL=defer-final harness/bench.sh <worktree> 4380 15`
- Scenarios: `defer-default/bin/cb-run.sh <work-dir> <accept|returning-accepted> 10 <label>`
- Taps and cold returning: `defer-default/bin/probe.mjs --throttle`, 5 reps, median. It uses the same throttling as the profile and takes the CookieBench lock.

| Measure | canary HEAD | defer-default | Change |
| --- | ---: | ---: | ---: |
| **LCP delta vs control**, `load`, 15 pairs | +396 (392–398) | **+48 (44–56)** | −348 |
| Same, earlier build (`defer-v1`, before the chunk-group fix) | | +40 (36–60) | |
| Bytes finished before the hero, excluding the hero (waterfall) | +85,654 B | +20,348 B | −65.3 KB |
| c15t first-load JS (`<script>` tags in HTML), br | 67,559 B in 3 chunks | 6,871 B in 1 chunk¹ | −60.7 KB |
| HTML, br | 15,612 B | 18,409 B | +2.8 KB² |
| `initial.requests` (5 s window) | 15 | 16 | +1 |
| `initial.transfer` (5 s window, everything that arrives) | 717,849 | 729,609 | +11.8 KB³ |
| `banner.visible` | 260 | 244 | same |
| Page under `ConsentRoot` hydrated (probe: `#reopen-preferences` has React props) | 1,929 | 1,563 | −366 |
| Banner hydrated by React, no tap (probe: Accept has React props) | 2,039 | 4,127 | +2,088 |
| `accept`: runner clicks (readiness) at | 2,189 | 1,693 | −496⁴ |
| `accept`: `action.input-to-next-paint` | 40 | 32 | −8 |
| `accept`: `action.dismissed` | 40 | 27 | −13 |
| `accept`: `action.consent-effective` | 40 | **872** | +832 |
| `accept`: `action.scripts-complete` | 252 | 1,310 | +1,058 |
| `accept`: first gated script, from input (server events) | 58 | 1,135 | +1,077 |
| `accept`: first gated script, from navigation | 2,244 | 2,828 | +584 |
| Tap at 1.0 s: banner hidden | 1,076 | 1,076 | same |
| Tap at 1.0 s: first gated script runs | 2,398 | 2,909 | **+511** |
| Tap at 2.5 s: banner hidden | 2,605 | 2,584 | same |
| Tap at 2.5 s: first gated script runs | 2,794 | 3,837 | **+1,043** |
| Returning, warm cache (`returning-accepted`, 10): first gated script | 636 | 720 | **+84** |
| Returning, warm: `page.lcp` | 280 | 278 | same |
| Returning, cold cache (probe): first gated script | 2,414 | 2,828 | **+414** |
| Returning, cold: probe LCP | 3,880 | 3,924 | +44 |
| All c15t JS over a visit (unthrottled, 9 s, br) | 91.2 KB | 99.9 KB⁵ | +8.7 KB |

Notes:

1. About 1.1 KB of that chunk is fixture code (`consent.tsx`, `fixture-support/browser.ts`). The control page ships its own 1,134 B chunk. c15t's own share is about 5.7 KB br: the shell, the stand-in kernel, hooks, contexts, `@c15t/ui` theme-slots (3.5 KB raw) and color-scheme.
2. The boot data (JSON snapshots) is 12.7 KB raw and +2.1 KB br at q11. Of that, 5.8 KB raw is the default English translations in the pre-resolution snapshot.
3. In `load`, CookieBench counts every byte that arrives within 5 s. Deferral moves bytes after the hero but does not remove them, so this row does not track LCP.
4. CookieBench's readiness is the fixture bridge's `data-consent-ready`. `Probe` sets it from the server snapshot as soon as the page hydrates, so the runner clicks about 0.5 s earlier, on a banner that is still server HTML.
5. 104.2 KB including the idle persistence writer (4.2 KB), which did not load in the HEAD visit within 9 s.

Raw files (in `/home/kaylee/.t3/scratch/lcp-fleet/`):

- `harness/work/4380/out/defer-final-*/`: final LCP run.
- `harness/work/4380/out/defer-v1-*/`: earlier LCP run.
- `defer-default/runs/*/envelope.json`: scenario runs.
- `defer-default/probe-*.jsonl`: tap and returning probes.

## How it works (API shape)

### What stays the same for users

- `import { ConsentRoot, ConsentBanner, ConsentDialog, useSnapshot, … } from 'c15t/next'`. Same names, props and compound parts (`ConsentBanner.Root`, `ConsentDialog.Card`, …).
- The server render is the same as canary's: the whole provider, the banner HTML, the inline first-paint CSS, the early-tap script and the server script start.
- No opt-in, and no app restructuring.

### What changes

1. **Server.** `ConsentRoot` renders the full engine root (`EagerConsentRoot`, the old `root.tsx`).
   - After the page, in the same Suspense boundary as the server script start, it adds `<script type="application/json" data-c15t-boot>`.
   - That script holds the snapshot the page was rendered from (`s`) and, for a streamed state, the snapshot the banner was rendered from (`r`).
   - It is emitted only when there is a `state`.
2. **Browser, first-load chunk.** `ConsentRoot` is a shell (`@c15t/react/deferred` plus `nextjs/src/root.tsx`). It fills c15t's contexts with a **stand-in kernel** built from the boot snapshots, then renders `{children}` at once.
   - The stand-in is an ES `Proxy`, and the same object for the root's lifetime. No context value ever changes, so React never forces a dehydrated boundary to client-render.
   - Reads return the server snapshots.
   - `set.*` calls queue, and replay on the real kernel.
   - `commands.*` load the engine and resolve with the real kernel's result.
   - `events.on` subscribes once the engine attaches.
   - After attach, every property read goes to the real kernel. Subscribers stay on the stand-in, which forwards changes and survives a kernel swap.
3. **Banner and dialog.** `c15t/next`'s `ConsentBanner` and `ConsentDialog` render in their own `<Suspense>`.
   - On the client they read their component from the engine module once the engine has attached. Until then React keeps the server HTML.
   - Taps go to the existing early-tap script, which hides the banner and replays the choice when the banner hydrates.
4. **When the engine loads.** `canDeferEngine(snapshot)` decides:
   - **Defer** when `activeUI === 'banner'`, not IAB, no experiment, and no category in `consentCategories` (configured plus discovered) is effectively allowed. The engine then waits for:
     - every loading `img[fetchpriority=high]` to fire load or error (the same rule as `AFTER_PRIORITY_IMAGES`), or
     - `pointerdown`/`keydown`/`focusin` on the banner or overlay, or
     - an early tap already queued, or
     - `load` when there is no priority image, or
     - a 10 s timeout.
   - **Otherwise** the shell chunk starts `import()` as soon as it executes, before hydration.
   - Roots the stand-in cannot serve render the engine before hydrating, which is the old behaviour minus the static import: experiment, network blocker, `enabled: false`, no `state`, no boot data.
5. **Engine chunk.** `root-engine.tsx` holds the real `ConsentProvider`, a publisher that attaches the kernel after `runtime.start()` (and after any streamed init has applied), the banner and the dialog wrapper. They are one `import()`, so Turbopack makes one chunk group (3 requests, 65 KB br).
   - Importing banner, dialog and engine separately made Turbopack copy shared modules into each group: about 36 KB extra per visit in `defer-v1`.
   - `useScriptLoader` takes its loader from the engine chunk under a stand-in kernel, and only after attach. A fresh visitor no longer fetches the 6 KB loader before the hero.
6. **Hook modules split.** These hooks move into modules of their own, re-exported unchanged: `useResolvedPresentation`/`useResolvedTheme`/`usePromptPresentation`/`usePreferencesPresentation`, `useVendorAllowed`, `useCategoryAllowed` and `useTranslationLanguage`. Turbopack keeps whole modules, so `hooks.ts` and `kernel-selector.ts` were pulling in experiment, cookie, vendor, consent-evaluation and the 5.6 KB English translations for any page using `useSnapshot`. This alone took the first-load chunk from 15 KB to 6.4 KB br.

### Verified in the built HTML

The c15t page's `<script src>` list is the control's six chunks plus one c15t chunk of 6,871 B br. The engine's chunks start at 3,473 ms, after the hero ends at 3,468 ms (final waterfall, pair 1).

## The duplicate CSS question

**No. The inline first-paint CSS appears once.**

- I took 300-character samples every 8 KB through the 69,195 B `<style data-href="c15t-first-paint">` in canary's built HTML.
- Each matches at exactly one offset, inside the `<style>`. None appears in the RSC flight pushes (7 pushes, 13.3 KB raw).
- So it costs no extra brotli bytes.
- Short substrings do repeat inside the sheet, because the same declarations appear under several selectors. A short-snippet search reports 2–3 hits, which is probably where the scheduling lane's impression came from.
- I checked the canary HEAD build and this branch's build. I did not check the scheduling lane's patched fixture.

## Risks

- **Fresh visitors' actions wait for the engine.** In CookieBench `accept`, consent takes effect 872 ms after the tap; on canary it is 40 ms. This is inside the 1.5 s observation window, but with only about 0.6 s margin, on a 200 KB/s link. The engine (65 KB br) is downloaded on the tap while the hero is still loading.
- **Returning visitors with `useScriptLoader` scripts start later:** +84 ms warm, +414 ms cold. The engine now loads when the shell chunk runs, not with the first `<script>` tags. Two possible fixes, both untested:
  - When the boot data says "eager", the server could emit preload links for the engine chunk. That needs the chunk URLs, which Turbopack does not hand to library code; `next/dynamic` SSR preloading might.
  - Keep the static engine import when the server knows the visitor is returning. That is not possible from a client boundary.
- **Stand-in identity.** Some core modules key `WeakMap`s by kernel: `surface-actions/rules.ts` `actions`, script-loader `registries`, `iab-controls`. Code outside the engine sees the stand-in; code inside sees the real kernel. I found no broken flow in the tests or the fixture (accept, page-initiated save, dialog via `set.activeUI`), but I did not audit each map.
- **`ProviderServices.runtime` is `undefined` before the engine attaches.** `useEventDispatcher()` called in a page component before attach would read `undefined.…`. Not covered.
- **Other module hooks under a stand-in kernel** are untested before attach: `useNetworkBlocker`, `usePersistence`, `useIframeBlocker`. A network blocker in config forces the eager path; one added only through the hook does not.
- **Hydration snapshot bytes.** The pre-resolution snapshot carries the default English translations: 5.8 KB raw, most of the +2.1 KB br of HTML. It is needed only if page components render translations before the state resolves.
- **Theme slots.** `applyThemeSlots` (3.5 KB raw) is in the first-load chunk so the shell can build `uiConfig` itself. Moving it later means changing a context value, which would force-render dehydrated boundaries.
- **React 18 (Pages Router)** uses the throw-a-promise fallback in `read()`. It is covered by the node server-start tests only, not by a browser hydration test.
- **Tests that render `ConsentRoot` synchronously** need the engine loaded first. The nextjs browser tests now call an internal `preloadConsentRoot()` in a setup file. Apps that render `ConsentRoot` client-only see one suspended render.
- **No docs page, no `.tegami` note.** This is a prototype.

## Tests run

- `bun run --cwd packages/nextjs test`: 37 files, 396 tests pass. Canary: 35 files, 391 tests.
- Changed or added nextjs tests:
  - `react-server-entry.test.ts` now expects the deferred banner and dialog.
  - `root-server-start.test.tsx` allows the JSON boot script before the server start.
  - `setup-browser.ts` preloads the engine.
- `packages/react`: 138 test files, run in six batches. All pass.
  - The full single run crashes the vitest browser connection on canary too. The cause is `@c15t/integrations` not being built (`#inline-start` resolves to `dist`); building it fixes that.
  - `dialog-stylesheet` and `provider-modules` each failed once under load and passed on rerun, alone and in their batch.
- New react tests, all passing:
  - `deferred/__tests__/deferred-root.test.tsx`: streamed SSR into an iframe, then hydrate. Covers: no hydration errors; the page hydrates while the banner stays server HTML; the engine is not loaded before the trigger; a page action loads it and the save lands; after an unprompted load the banner hydrates in place (same element) and Accept works; a returning visitor loads the engine during hydration.
  - `deferred/__tests__/deferred-kernel.test.ts`: queue and replay, forwarding, subscriber handover, events, the trigger (priority image, banner input, early taps), and the copied early-tap constants staying equal to core's.
- `packages/core`: unchanged, and its tests pass (`turbo run test --filter=@c15t/core`).
- `bun turbo run check-types --filter=@c15t/react --filter=@c15t/nextjs --filter=@c15t/core --filter=c15t`: passes.
- oxlint on the changed files: clean. The pre-commit oxfmt ran.

## Not verified

- **Customize tapped before the engine loads.** The early-tap script records it and the replay opens the dialog after the engine and dialog chunks arrive. The latency was not measured.
- **Keyboard path** (`reject-keyboard`) and the `save`/`preferences`/`withdraw` scenarios were not run.
- **Apps where the banner is not the stock `ConsentBanner`** (headless `useHeadlessConsentUI` in page code). They hydrate against the stand-in and their clicks load the engine, but no test covers it.
- **The cold returning-visitor numbers** come from my probe (5 reps), not CookieBench, which has no cold returning scenario.
- **Machine load:** LCP runs used the CookieBench lock. Control FCP was 244 ms (final) and 248 ms (v1), under the harness's 400 ms load warning.
- **The scratch HEAD worktree** at `defer-default/head` was removed after the runs. The HEAD fixture build in `defer-default/work-head` is kept.
