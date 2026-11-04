# Lane `react-gap`: closing c15t's remaining React LCP gap to CookieYes

**Final head for `react-competitors`: `ecb4bed8d`** on branch `kaylee/react-lcp-gap`
(worktree `/home/kaylee/.t3/worktrees/c15t-private/t3-8112a0d5`), stacked on
`267563fa4`. Not pushed.

## Verdict

Within the constraints (banner no later than ~1,081 ms, consent-effective at or
under 565 ms, fixture unchanged), none of the four theories took a measurable
amount off the branch's +276 ms. Final head, same session, mobile `load`, 15 pairs:

| | canary | branch `267563fa4` | **final `ecb4bed8d`** | CookieYes |
| --- | ---: | ---: | ---: | ---: |
| LCP delta (95% CI) | +608 (596–624) | +276 (208–312) | **+292 (278–316)** | +120 (112–140) |
| banner.visible | 1,285 | 1,097 | 1,105 | 1,068 |
| accept: consent-effective | 31 | 564 | **565** | 20 |

The final head removes 1.6 KB brotli from first load (the trigger's and
ConsentGate's CSS). That is worth ~8 ms, below what 15 pairs resolve. Both
gains that were larger broke a constraint:

- **Full byte diet** (`kaylee/react-lcp-gap-full-diet`): −5.8 KB, LCP +248
  (232–268), banner 1,104. But consent-effective goes from 564 to **599**, and
  every sample in its 10 sits above every base sample (587–655 against
  562–579). The moved code (vendor resolution, experiment assignment, journey,
  cookie writes) belongs to the engine, so an early tap now downloads it while
  the hero has the link. On this profile, moving a KB from first load into the
  engine chunk saves ~5 ms of LCP and costs ~7 ms of consent-effective.
- **Page first + banner bytes in the idle gap** (private fixture bound): +100 ms
  with the banner at 1,025. My library versions of that bound measured
  +316 and +232. The bound works only because of this fixture's timing, and a
  single banner chunk needs a module-path allowlist that spans three packages.
  The work is parked on `kaylee/react-lcp-gap-lazy-shell-wip` (`7b50ffaba`).

What the gap is made of, from the waterfalls: the hero's start is not the
lever. Every byte that finishes before `page.js` delays the hero about 1:1,
whether c15t is on the render path or not. The only cheap bytes are those that
arrive between `page.js` ending and the hero's first byte (~210 ms, ~42 KB). On
CookieYes's side, the wiring is not "after hydration" on this fixture:
`script.js` (8.9 KB) starts at 200 ms and `banner.js` (12.3 KB) at 505 ms, and
the rest (~9 KB) loads during the hero. The banner needs ~35–40 KB of c15t JS
against ~21 KB of CookieYes JS before its banner.

## Theories (waterfall: own Playwright script, mobile profile, 3 pairs, medians)

| Theory / build | Hero start Δ vs control | Bytes before hero end Δ | LCP Δ | banner.visible | Verdict |
| --- | ---: | ---: | ---: | ---: | --- |
| Branch `267563fa4` | +272 (963 vs 691) | +46,228 | +276 | 1,061 | reference |
| 1a. Same bytes, c15t never executed (`/bytes`: chunk + `/init` preloaded) | +238 | +46,853 | +244 | – | bound: executing c15t costs ~32 ms |
| 1b. Page first, c15t `import()` at entry eval (private fixture copy) | **+17** (706) | +44,805 | +232 | **1,227** | fails: LCP same, banner +214 |
| 1c. Page first, c15t chunks preloaded when `/init` answers (private fixture + HTML patch) | +105 | +45,036 | **+100** | 1,025 | bound only, fixture modified |
| 1d. Library version of 1c, static 17.6 KB (`shell-a`) | +319 | +49,550 | +316 | 1,337 | worse |
| 1e. 1d with a light pending snapshot, static 10.6 KB, 13 lazy chunks (`shell-c`) | +223 | +53,140 | +232 | 1,253 | no gain; parked |
| 2. Full byte diet (module splits) | +229 | +40,450 | +228 | 1,013 | CookieBench: +248, but consent-effective 599 |
| 2'. Sheet split only (final) | not run | −1.6 KB vs branch (chunk size) | CookieBench +292 (CI overlaps branch) | 1,105 | kept |
| 3. Nothing optional before the hero | – | – | – | – | already true on the branch (see below) |
| 4. Build-time static banner in `index.html` | – | – | – | – | not built (see below) |

CookieBench 15-pair `load` runs exist for 2 and 2' (table below). 1b–1e failed
the waterfall check, and 1c modifies the fixture, so they were not run in
CookieBench.

### 1. c15t off the hero's critical path

- 1a shows what the critical path costs: the same bytes, never executed, give
  +244 against +276. Taking c15t off the render path can save at most ~32 ms.
- 1b achieves that: the hero starts at 706 (control 689). But c15t's 45 KB then
  shares the link with the hero, so LCP stays at +232 and the banner moves to
  1,227.
- 1c is the only arrangement that pays off. The page renders first and the inline
  `/init` script preloads the c15t chunks when `/init` answers (~445 ms). Their
  bytes then arrive mostly between `page.js` ending (731) and the hero's first
  byte, and LCP drops to +100. It depends on two things:
  - `/init` answering ~150–200 ms before the app's own chunk finishes. On a
    heavier or lighter page the window moves.
  - The banner bytes travelling as one long request. Chromium's throttling
    splits bandwidth per request, so small chunks finish inside `page.js`
    instead of after it.
- What I built toward 1c (`kaylee/react-lcp-gap-lazy-shell-wip`, not for merge):
  - `ConsentBanner` is a browser-only deferred surface (`#consent-banner`
    import map).
  - The `/init` reader and the banner live in a lazy `client-shell` module.
  - The pending snapshot is built without the record evaluator, with an
    exhaustive equality test against `buildInitialSnapshot`.
  - `consentManifest()` writes the shell's chunk URLs into the prefetch script,
    and the script preloads them after `/init`.
  - The schema's safe-fallback rule sits in its own module.
- Result: static chunk 10.6 KB, but 13 lazy chunks. They all finished inside
  `page.js`, which ended at 830 instead of 731.
- Two more problems found:
  - React's Suspense reveal throttle (~300 ms) held the banner back. A
    non-suspending client render fixes that.
  - A Rolldown group for "modules the shell imports" captured 202 KB raw and
    pulled `client-engine` into the preload. Module reachability passes through
    `@c15t/core`'s root barrel.
- That build also changed the control page: Rolldown split its runtime helpers
  into a 381 B chunk that `baseline.html` then loaded. The final head does not
  (baseline is byte-identical to the branch's).

### 2. Byte diet

- Attribution of the branch's eager chunk (`tools/eager-live.mjs`, reachability
  from the entry's imports over the unminified build): 47 KB raw / 10.8 KB br
  of it was only reachable from lazy chunks.
- `consentManifest()`'s `$initial` group assigns whole modules. A module the
  banner path calls once brought every export the engine uses from it:
  - `vendors.js` came in for `isValidVendorId`.
  - `experiment.js` came in for the presentation merge.
  - `journey.js` came in for `hasStoredConsentRecord`.
  - `first-paint-sheets.ts` imported the trigger's 10 KB of CSS.
- Splitting those took the chunk from 41,114 to 35,334 B br. No duplication:
  total c15t bytes in 5 s went from 106,243 to 106,562 B. The bytes moved behind
  the hero, into `client-engine`, `has`, `transports` and `panel`.
- That move is exactly why consent-effective regressed: the engine chunks are
  what an early Accept waits for. The trigger and ConsentGate sheets are the
  only moved bytes nothing on the Accept path loads.
- English copy out of first load: ~2 KB br. Not done:
  - `consent-copy`'s fallbacks import it.
  - `buildInitialSnapshot` reaches it through `applyTranslationOverrides`.
  - Removing it means a shell-only copy path. Expected ~10 ms, under noise.
- Remaining modules reachable only from lazy chunks: ~7.7 KB raw / 2.3 KB br
  (policy helpers, request headers, storage keys). Moving them has the same
  consent-effective cost.

### 3. Nothing optional before the hero

Confirmed on the branch and the final head. Requests that finish before the hero
ends: HTML, `cmp` entry, `jsx-runtime`, `page`, `preload-helper`, the `c15t`
chunk, `/init`, and the page's own `reading-list.js/json`.

- No script-loader, dialog, persistence or transport chunk starts before the
  hero ends.
- `storage-keys` is no longer requested at all; canary requested it.
- `preload-helper` (994 B on the wire) is Vite's dynamic-import helper. Folding it
  into the c15t group would make a baseline page that uses dynamic imports load
  the c15t chunk, so I left it.

### 4. Build-time static banner

Not prototyped. The cost is not in setup. It conflicts with the consent-effective
constraint:

- A static banner lets the 35–40 KB React banner path wait for the hero, which
  is where the LCP win would come from. Then an Accept before the hero needs the
  shell and the engine (~70 KB) over a link shared with the hero.
- The Next.js `defer-default` branch is this pattern measured: +44 ms LCP,
  consent-effective 870 ms.
- It also needs:
  - a geo-independent static markup, filled with copy and buttons from `/init`
    by the inline script;
  - a swap to the React banner without a visible change;
  - an HTML transform in `consentManifest()`.
- The only route to both a low LCP and a fast consent-effective is an Accept
  path that saves without the React engine (a vanilla runtime the React shell
  later attaches to). That is an architecture change, not a lane-sized one.

## What I built

Branch `kaylee/react-lcp-gap`:

| Commit | What |
| --- | --- |
| `417845321` | `perf(react)`: `TRIGGER_SHEETS` and `CONSENT_GATE_SHEETS` move to `trigger-sheets.ts` / `consent-gate-sheets.ts`; `first-paint-sheets.ts` keeps only the banner's. 5 files. |
| `ecb4bed8d` | `docs`: release note figure 41 KB → 40 KB. |

Reference branches, not for merge:

| Branch | Head | What |
| --- | --- | --- |
| `kaylee/react-lcp-gap-full-diet` | `f8e93836e` | full module-split diet (−5.8 KB br, consent-effective +35 ms) |
| `kaylee/react-lcp-gap-lazy-shell-wip` | `7b50ffaba` | lazy banner shell + `/init`-triggered preload (+232 ms; see 1e). Has new tests: pending-snapshot equality (49 cases), preload-after-`/init` (4), `bannerShellPreloads` (4) |

## Full before/after (same session, same machine; load average 6–10 from unrelated dev servers)

Mobile `load`, 15 pairs, pass 2 (no other work of mine running):

| | canary | branch | full diet | **final** | CookieYes |
| --- | ---: | ---: | ---: | ---: | ---: |
| LCP delta (CI) | +608 (596–624) | +276 (208–312) | +248 (232–268) | **+292 (278–316)** | +120 (112–140) |
| FCP delta | +456 | +280 | +264 | +276 | +60 |
| banner.visible | 1,285 | 1,097 | 1,104 | 1,105 | 1,068 |
| initial.transfer delta (5 s) | +102,099 | +107,084 | +107,404 | +107,300 | +30,285 |
| initial.requests | 14 | 18 | 18 | 18 | 16 |
| long-task blocking | 62 | 11 | 28 | 25 | 0 |
| c15t first-load chunk, br | 68,869 | 41,114 | 35,334 | 39,547 | – |
| samples passed | 15/15 | 15/15 | 15/15 | 14/15 (1 incomplete) | 15/15 |

Pass 1 ran while my test suites were running (canary and branch long-task
blocking 121/184 ms, control FCP up to 880). The deltas are consistent with
pass 2: canary +604, branch +286, full diet +252, CookieYes +112.

Mobile `accept`, 10 pairs:

| | canary (p1) | branch (p2) | full diet (p2) | **final (p2)** | CookieYes (p1) |
| --- | ---: | ---: | ---: | ---: | ---: |
| banner.visible | 1,300 | 1,096 | 1,083 | 1,095 | 1,150 |
| input-to-next-paint | 32 | 32 | 32 | 32 | 24 |
| dismissed | 31 | 26 | 27 | 29 | 20 |
| **consent-effective** | 31 | 564 | 599 | **565** | 20 |
| first gated script, from navigation | 1,594 | 2,018 | 2,046 | 2,031 | 1,784 |
| samples passed (c15t arm) | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |

Desktop `load`, 15 pairs:

| | canary | branch | full diet | **final** | CookieYes |
| --- | ---: | ---: | ---: | ---: | ---: |
| LCP delta (CI) | +32 (20–52) | +24 (20–104) | +12 (0–24) | **+16 (8–20)** | −4 (−12–12) |
| banner.visible | 227 | 264 | 243 | 261 | 291 |
| samples passed | 13/15 (1 failed, 1 incomplete) | 15/15 | 15/15 | 15/15 | 15/15 |

Commands:

- `react-gap/bench-react.sh run <label> <mobile|desktop> <load|accept> <n>` on
  port 4700.
- CookieYes: `react-gap/run-cy.sh` with October's config ported to 4700/4701.
  react-arm's CookieYes config had TLS on 4412; mine does not.
- Waterfalls: `bench-react.sh waterfall <label> 3 mobile`, with
  `WF_ARGS=--candidate /bytes` for 1a.
- Run output: `react-gap/work/<label>/out/*/summary.md`.

## Tests run

| Suite | Result |
| --- | --- |
| core (`bun run --cwd packages/core test`) on the full diet tree | 148 files, 2,886 pass, coverage gate passes. Final head's core equals `267563fa4`'s. |
| react, final head, in batches (`src/__tests__`, `src/components`, `src/deferred`, then `src/component-hooks src/hooks src/server src/utils`) | 137 files, 1,070 pass |
| react, single full run | dies on the vitest mocker "Unhandled Rejection" seen by react-arm; not a test failure |
| nextjs, final head | 37 files, 396 pass. Needs `@c15t/integrations` built first, or `#inline-start` does not resolve and 4 files fail. |
| check-types core, react, nextjs, final head | pass (`c15t` has no `check-types` script) |
| New tests | none on the final head: a module move with no behaviour change. New tests are on the WIP branch. |

react-arm's "rest" batch reported exit 1 because zsh does not word-split
`$b`; it matched no files. Run with explicit arguments, it passes (19 files).

## Remaining risks

- The final head's gain is not resolvable on this profile. Its value is that the
  trigger and ConsentGate CSS no longer ride with the banner for every
  `consentManifest()` app.
- consent-effective at 565 ms is the branch's trade, unchanged. Any further
  first-load cut that moves engine code reproduces the full diet's +35 ms.
- CookieBench banner.visible and long-task blocking move with machine load: the
  branch measured 1,081 in react-arm's session and 1,097 here.

## Not verified

- Theory 1c (+100) was measured only with a modified private fixture and a
  hand-patched `index.html`. The library version never reached it.
- Whether 1c's `/init`-triggered preload helps or hurts on pages with other
  bundle sizes or faster networks.
- The WIP branch's hydration path (browser `ConsentBanner` suspending without a
  boundary while hydrating server HTML). No test, not run in an SSR app.
- TanStack Start with the WIP branch's explicit `ConsentBanner` export: not built.
- The `reject`, `save`, `preferences` and `withdraw` scenarios.
- Desktop `accept`.
- `benchmarks/react-browser-bench`.
- React 18.
- Non-Rolldown bundlers.

## Artifacts

- Harness copy: `react-gap/bench-react.sh`, `run-cy.sh`, `lib/`. Added a
  `--candidate` option to `waterfall-react.mjs` and `PACKS_FROM` to the build
  step.
- Analysis tools: `react-gap/tools/eager-live.mjs` (lazy-only bytes in the
  eager chunk), `analyze.sh`, `why.mjs`.
- Theory 1 fixture patch: `react-gap/exp-t1.patch`. Lazy-shell diff:
  `react-gap/lazy-shell-wip.patch` (tracked files only; the WIP branch has all).
- Logs: `react-gap/final-queue.log`, `pass2-queue.log`, `tests-*.log`,
  `react-batch*.log`.
