# Lane `react-arm`: c15t React arm (Vite, client-rendered, browser `/init`)

## Verdict

The mobile LCP cost of `c15t/react` on CookieBench's React fixture drops from
**+592 ms to +280 ms** (15 pairs each, same machine), and the banner shows
**200 ms earlier** (1,081 ms against 1,281 ms on canary). CookieYes's hosted
script on the same fixture and machine costs +112 ms, with its banner at
1,059 ms. So c15t's banner now arrives at about the same time as CookieYes's,
and the remaining LCP gap is 168 ms, about 41 KB of JavaScript.

The trade-off: a fresh visitor's Accept still hides the banner in 27 ms, but
the choice takes effect 565 ms after the tap instead of 28 ms, because the
engine downloads on the tap. Returning visitors' gated scripts start 244 ms
later on mobile (994 ms against 750 ms) and 260 ms later on desktop (390 ms
against 130 ms). Desktop LCP and banner time are unchanged within noise.

The fixture is unmodified: `ConsentProvider` + `hosted()` + `consentManifest()`.

## Diagnosis

The page is client-rendered: the HTML is an empty `#root`, the hero `<img
fetchpriority="high">` is inserted by React after the JS runs. Two things
follow, measured in the canary waterfall (own Playwright script, mobile
profile, 3 pairs, `work/canary/out/waterfall-mobile-20261102-232247/`):

| Request (canary, median visit) | Transfer B | Start | End | Before hero end |
| --- | ---: | ---: | ---: | --- |
| `/` HTML (includes the 3.1 KB inline `/init` prefetch script) | 2,037 | 0 | 169 | yes |
| `cmp-*.js`: fixture entry + all of c15t's eager code | 69,290 | 200 | 1,015 | yes |
| `jsx-runtime`, `page` (React, same as control) | 54,670 | 202 | 926 | yes |
| `storage-keys` | 664 | 203 | 386 | yes |
| `benchmarks-inth.inth.app/init` | 1,946 | 223 | 469 | yes |
| hero `courtyard.png` | 493,920 | **1,233** (control 738) | 4,022 | (hero) |
| `script-loader` (fetched at mount, nothing granted) | 5,771 | 1,364 | 1,570 | yes |
| `panel`, `preferences`, `preference-draft` (dialog idle warm-up) | 19,099 | 1,426 | 1,758 | yes |
| `writer` | 4,576 | 4,317 | 4,496 | no |

1. **The c15t JS delays the hero's start.** The React render that inserts the
   hero waits for `cmp-*.js` (69 KB br). The hero starts at 1,233 ms
   against 738 ms in the control. FCP moves by the same amount (+452 ms).
2. **Then 25 KB of lazy chunks download alongside the hero**: the
   script-loader (requested at mount although nothing is granted) and the
   dialog's idle warm-up, which keys off the window `load` event. On this
   page `load` fires before React has even inserted the hero.
3. **`/init` is not the bottleneck.** The inline prefetch sends it at
   ~210 ms and it answers at ~465 ms, well before the JS has run (~1,000 ms).
   It is 1.9 KB. What decides `banner.visible` is when the JS has
   downloaded, parsed at 4x CPU and rendered: canary 1,281 ms.
4. **CSS is a small part**: the banner's styles ride inside the JS as strings
   (~7 KB br in the eager chunk after the banner-only split).

Bytes before the hero ends, waterfall: canary +97.6 KB over control. 4.75
ms/KB predicts ~460 ms; with the hero also starting ~500 ms late, the observed
+592 ms fits.

A manifest or offline mode would not change the picture: `/init` already
lands before the JS. It would remove one 1.9 KB request and the 150 ms
round trip, neither of which is on the critical path here.

### Why not the Next.js deferral as is

In Next.js the banner is server HTML, so the engine can wait for the hero for
free. Here nothing is on the page until JS runs. Deferring the whole engine
and banner would push the banner to ~4 s. So the banner and what it needs
must stay eager, and the rest must leave the first-load chunk.

## What I built

Branch `kaylee/react-mobile-lcp-banner-shell` (worktree
`/home/kaylee/.t3/worktrees/c15t-private/t3-9c24af1c`), on top of
`kaylee/defer-consent-engine-default` (`2a7c3ea2a`), not pushed:

| Commit | What |
| --- | --- |
| `05f691f37` | `perf(ui)`: banner-only inline sheets. Cherry-pick of the css-critical lane's `c814eec03`, unchanged. |
| `3a401131f` | `feat(core)`: `@c15t/core/runtime/deferred-snapshot` and `@c15t/core/transports/hosted-factory`. |
| `51e614d58` | `perf(core)`: `consentManifest()` puts a page's eager c15t modules in one chunk. |
| `5aca20ae2` | `perf(react)`: client-rendered `ConsentProvider` shows the banner before the engine. |
| `267563fa4` | `docs`: `.tegami` release note. |

43 files, +2,270 / −206 over `2a7c3ea2a`.

### How it works

- **`ConsentProvider` from `@c15t/react` resolves through a `#consent-provider`
  package import**: `browser` → `deferred/client-provider.js`, `default` →
  `provider.js`. Server builds, SSR adapters and `@c15t/react/provider` get
  the old provider unchanged.
- **The client root** reuses defer-default's `DeferredConsentShell` and
  stand-in kernel. On mount it looks up the inline `/init` prefetch the
  hosted transport will consume (without consuming it). When it resolves,
  it builds the snapshot with core's own `buildInitialSnapshot` from the
  `/init` payload and hands it to the stand-in with a new `setSnapshot()`. The
  stock `ConsentBanner` renders from that: right copy, right buttons for the
  resolved policy, no engine.
- **When the engine loads**: after every `img[fetchpriority=high]` has loaded
  (the hero), or on the first `pointerdown`/`keydown`/`scroll` anywhere
  (LCP observation stops there anyway), or on input inside the banner, or
  an early tap, or 10 s. The engine (real `ConsentProvider`, runtime,
  persistence, hosted transport) takes the same prefetched `/init`, so no
  second request (tested).
- **Taps before the engine**: `save`/`dismissNotice` on the stand-in now mark
  the snapshot `activeUI: 'none'` until the engine has applied them, so the
  banner hides at the tap. Then the engine saves.
- **Engine loads at once** when a consent record is stored (returning
  visitor), or when `/init` says something the shell does not read (IAB,
  vendors, unknown contract), or the snapshot is not "banner, nothing
  granted" (`canDeferEngine`).
- **Old path, engine with the page**, for `prefetch`, `experiment`,
  `consentSource`, `networkBlocker`, `scripts`, `vendors`, `enabled: false`,
  a borrowed `runtime`, a non-`hosted()` mode, a custom `fetch`/`initURL`/
  headers, or no inline prefetch.
- **`hosted()` from `@c15t/react` no longer imports the hosted transport.** It
  returns the same recognisable factory through `createHostedModeFactory`;
  the provider module fills the transport builder when it loads. A runtime
  built before that gets a lazy wrapper. This took 3.9 KB br out of first load.
- **Dialog idle warm-up waits for priority images** (`whenPriorityImagesLoad`
  in `deferred/trigger.ts`), as well as the `load` event. On a
  client-rendered page `load` fires before the hero is inserted.
- **`consentManifest()` adds one Rolldown `$initial` group for
  `node_modules/@c15t|c15t`, without dependencies** (Rolldown ≥ 1.2, client
  builds, only when the app sets no chunking). Without it Rolldown split
  c15t's eager code into 11 chunks (shared with lazy chunks). The baseline
  page loads none of it (checked).

## Numbers

All runs: this machine, CookieBench runner from my private copy of the
workspace (`react-arm/work/<label>/cookiebench`), `mobile-article-v1` and
`desktop-article-v1` profiles, 1 warm-up per arm, measurement lock held.
Canary = HEAD `c35b112b7` packed into the same fixture. Commands:
`react-arm/bench-react.sh run <label> <profile> <scenarios> <n>`; CookieYes:
`react-arm/run-cy.sh` with October's `react-cookie-yes-*.json` config,
ported to my ports. Deltas are medians of per-pair differences, 95%
percentile bootstrap from my own summariser (`lib/summarize-react.mjs`, no
multiplicity correction).

### Mobile, `load`, 15 pairs

| | canary | **shell-v5** | CookieYes (same machine) | Oct c15t | Oct CookieYes |
| --- | ---: | ---: | ---: | ---: | ---: |
| LCP delta | +592 (568–596) | **+280 (260–284)** | +112 (104–136) | +536 | +104 |
| FCP delta | +452 | **+272** | +64 | +388 | +44 |
| banner.visible | 1,281 | **1,081** | 1,059 | 1,112 | 1,010 |
| initial.transfer delta (5 s window) | +102,180 | +107,085 | +30,287 | +97,462 | +30,799 |
| initial.requests | 14 | 18 | 16 | 14 | 16 |
| long-task blocking | 58 | 2 | 0 | 0 | 0 |
| c15t first-load JS (br) | 68,869 | **41,114** + 565 entry + 576 helper | — | — | — |
| Bytes finished before hero end, over control (waterfall) | +97,595 | **+46,229** | not measured | — | — |
| Hero request start (waterfall) | 1,233 | 962 | — | — | — |

`initial.transfer` counts everything inside 5 s. The engine now downloads
after the hero, inside that window, so this row goes up while LCP goes down.

Intermediate builds, same harness:

| Build | Change | LCP delta | banner | first-load c15t br |
| --- | --- | ---: | ---: | ---: |
| canary | — | +592 | 1,281 | 68.9 KB |
| shell-v3 | client root + hosted transport out of first load + banner CSS split | +496 (488–500) | 1,159 | 44.8 KB in 11 chunks |
| **shell-v5** | + one c15t chunk + warm-up after hero + wake on any input | **+280 (260–284)** | **1,081** | 41.1 KB in 1 chunk |

shell-v3's 25 KB of dialog chunks still landed during the hero; fixing the
warm-up trigger and the chunking is worth ~216 ms on its own.

### Mobile, `accept` and `returning-accepted`, 10 pairs

| | canary | **shell-v5** | CookieYes (same machine) |
| --- | ---: | ---: | ---: |
| accept: banner.visible | 1,326 | 1,087 | 1,096 |
| accept: input-to-next-paint | 32 | 32 | 24 |
| accept: dismissed | 28 | 27 | 16 |
| accept: **consent-effective** | 28 | **565** | 16 |
| accept: scripts-complete | 361 | 992 | 185 |
| accept: first gated script, from navigation | — | 2,023 | 1,544 |
| accept: samples passed | 10/10 | 10/10 | 10/10 |
| returning: LCP delta | +74 (68–92) | +56 | — |
| returning: FCP delta | +86 | +72 | — |
| returning: **first gated script, from navigation** | 750 | **994** | — |
| returning: samples passed | 10/10 | 10/10 | — |

(shell-v3 accept had one `page.goto` 15 s navigation timeout, recorded
incomplete; v5 had none.)

### Desktop, 15 pairs `load`, 10 pairs `accept` / `returning-accepted`

| | canary | **shell-v5** | CookieYes (same machine) | Oct c15t | Oct CookieYes |
| --- | ---: | ---: | ---: | ---: | ---: |
| LCP delta | +28 (16–44) | **+16 (0–20)** | +12 (−4–16) | +20 | 0 |
| FCP delta | +16 | +8 | −8 | +16 | 0 |
| banner.visible | 250 | **249** | 277 | 257 | 323 |
| initial.requests | 14 | 19 | 16 | 14 | 16 |
| accept: consent-effective | 11 | **96** | — | 40 | 41 |
| accept: input-to-next-paint | 16 | 16 | — | 48 | 40 |
| accept: dismissed | 11 | 11 | — | 40 | 41 |
| accept: banner.visible | 195 | 243 | — | — | — |
| returning: LCP delta | +28 (18–32) | +34 (18–44) | — | — | — |
| returning: **first gated script, from navigation** | 130 | **390** | — | — | — |
| samples passed | all | all | all | | |

## Trade-off chosen and why

Kept eager: the banner, its CSS, the stand-in kernel, the snapshot evaluator
and the early-tap logic, so the banner shows as soon as the JS and `/init`
are in. That is now as early as CookieYes's banner on mobile and earlier on
desktop. The engine, persistence, hosted transport, dialog and script loader
wait until the hero has loaded or the visitor touches the page.

The cost is consent-effective after a tap that comes before the engine:
565 ms on the throttled profile, inside CookieBench's 1.5 s action window.
The banner hides at once, the choice lands later. A scroll or any tap on the
page loads the engine earlier. For returning visitors the engine starts at
once, but as a second request after the first-load chunk: +244 ms to the
first gated script on mobile, +260 ms on desktop. On desktop a fresh
visitor's choice takes effect 96 ms after the tap instead of 11 ms.

I did not pick a byte diet of the eager provider (option b). The
engine-related modules on canary are ~28 KB br of the 69; removing them from
first load was the only way to get the dialog and loader chunks out from
under the hero too.

## Where the remaining 168 ms over CookieYes sits

41 KB br first-load, by source (raw bytes in the eager chunk):

| Area | Raw B |
| --- | ---: |
| Banner CSS strings (tokens, button, banner) | 64,484 raw, ~7 KB br |
| React banner components | 24,110 |
| Core: early taps, policy actions, journey, cookies, vendors | 20,888 |
| Core: snapshot builder, consent-record evaluation, policy | 16,853 |
| `@c15t/ui` (theme slots, dom utils) | 11,970 |
| `@c15t/schema` (policy-resolution wire reader, invariants) | 11,399 |
| React hooks, contexts | 10,233 |
| English copy (`@c15t/translations`) | 8,288 |
| Stand-in shell | 6,932 |
| Experiment helpers | 4,183 |

Next levers, not done:

1. English copy (8 KB raw): the banner's fallback copy is only needed
   before `/init`; the shell renders from `/init`.
2. `vendors.js` and `experiment.js` come in through `@c15t/core`'s root barrel
   via `c15t/react`'s index; a narrower import would drop ~9 KB raw.
3. A static banner in `index.html` (CookieYes's `renderShell`): would paint
   at FCP (~750 ms) but needs the policy at build time
   (`consentManifest` snapshot) and an HTML transform; not attempted.
4. Returning visitors: `modulepreload` the engine chunk when a consent cookie
   exists (needs an inline script; the chunk URL is known at build time).

## Tests run

| Suite | Result |
| --- | --- |
| `packages/core` (`bun run test`) | 148 files, 2,884 tests pass, coverage gate passes (run before the `consentManifest` chunk-group commit; `build.test.ts`, `deferred-snapshot.test.ts` and `src/transports` rerun on final HEAD: 4 files, 123 pass) |
| `packages/react`, in batches (`src/__tests__`, `src/components`, `src/deferred`, rest) | 137 files, 1,070 tests pass |
| `packages/react` single full run | one run failed: 6 tests from an alias-order bug I then fixed, and a second run died on a vitest mock "Unhandled Rejection"; batches pass |
| `packages/nextjs` | 37 files, 396 tests pass |
| `check-types` (core, react, nextjs, c15t), final HEAD | passes |
| New: `core/.../deferred-snapshot.test.ts` | shell snapshot equals the kernel's after init on the real GB `/init` payload; IAB/vendor/unknown contract fall back; lookup finds without consuming |
| New: `react/.../client-provider.test.tsx` | page renders before `/init`; banner from the prefetched answer; Accept hides at once and the engine saves with no `/init` of its own; returning visitor gets no banner |
| New/updated: stand-in kernel tests | `setSnapshot`, tap-hides-until-applied, commands go straight to engine after attach, wake on any input |
| New: idle warming waits for priority images | passes |
| New: `consentManifest` chunk group gating | passes |
| Fixture smoke (`lib/smoke.mjs`), throttled and not | banner, accept, returning, early reject, customize, no console errors |

`benchmarks/react-browser-bench` not run; CookieBench was the target and lock
time was the bottleneck.

## Not verified

- **CookieYes numbers are mine** (same machine, October config ported); the
  `competitors` lane did Next.js only. They match October within 10 ms.
- `reject`, `save`, `preferences`, `withdraw`, `reject-keyboard` scenarios not
  run in CookieBench. Customize and early reject only in my smoke script.
- React 18, StrictMode, multiple providers on one page: not tested with the
  client root.
- The hydration path (an app that server-renders `@c15t/react`'s
  `ConsentProvider` and hydrates it in a browser build, with no prefetch)
  renders the stand-in's pending state and loads the engine at once. No test
  covers it; the nextjs adapter imports `@c15t/react/provider` and is not
  affected.
- Rolldown < 1.2, webpack, esbuild and Rspack apps: the `#consent-provider`
  `browser` condition is standard, but only Vite 8/Rolldown 1.2 was built.
- Cherry-picked banner-only CSS commit is the css-critical lane's, untouched.
- I did not isolate each shell-v5 change in its own run (lock time): the
  216 ms between shell-v3 and shell-v5 covers the single chunk, the warm-up
  after the hero and the wake-on-input together. The waterfall shows the
  mechanism: no dialog or loader chunk before the hero in v5.
- No docs page update; release note only.

## Artifacts

- Harness: `react-arm/bench-react.sh`, `run-cy.sh`, `queue.sh`, `lib/`
- Runs: `react-arm/work/{canary,shell-v3,shell-v5,cookieyes}/out/*/`
  (`envelope.json`, `summary.md`, waterfalls)
- Attribution: `react-arm/attr/*.json`
- October baseline: `cookiebench/results/2026-10-15-matrix-rerun/{mobile,desktop}/react-{load,cookie-yes-load}`
