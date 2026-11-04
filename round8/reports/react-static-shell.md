# Lane `react-static-shell`: the React banner from `index.html`

## Verdict

The banner now shows **before CookieYes's**: 473 ms against 1,057 ms,
mobile `load`, 15 pairs, same quiet session (machine load at most 3.9).
The commit-path base shows it at 1,074 ms. LCP cost **+252 ms (248–264)**
against the base's +280 (268–292), so it improves rather than regresses.
CookieYes is +124 (104–128). Accept and returning-visitor timings are
unchanged from the base, within 3 ms.

The fixture is unchanged. The work is all in `consentManifest()` and
`@c15t/react`.

### Mobile, same session (18:01–18:33, load max 3.9 / 2.4 / 2.4 / 4.9 / 2.0)

| | CookieYes | commit path `ca5fa8eeb` (consumer `rcand`) | **head `b81ae23dc`** |
| --- | ---: | ---: | ---: |
| `load` LCP Δ, 95% CI (15 pairs) | +124 (104–128) | +280 (268–292) | **+252 (248–264)** |
| `load` FCP (Δ) | 788 (+48) | 1,020 (+284) | **496 (−240)** |
| `load` banner.visible | 1,057 | 1,074 | **473** |
| `load` control FCP | 740 | 740 | 736 |
| `load` initial.transfer Δ | +30,307 (10 s window) | +111,139 (5 s) | +111,705 (5 s) |
| `load` requests (Δ) | 16 (+9) | 20 (+13) | 20 (+13) |
| `load` long-task blocking Δ | 0 | 0 | 0 |
| Bytes finished before hero end, over control (waterfall, 3 pairs) | not measured | +48,222 | +48,800 |
| Hero request start (waterfall; control 690/692) | – | 969 | 944 |
| `accept` banner.visible | – | 1,107 | 478 |
| `accept` input-to-next-paint / dismissed | (24 / 16)¹ | 32 / 30 | 32 / 29 |
| `accept` consent-effective, median (max) | (16)¹ | 264 (270) | **267 (269)** |
| `accept` scripts-complete, median (max) | (185)¹ | 353 (358) | **356 (365)** |
| `returning-accepted` first gated script from navigation, median (max) | – | 996 (1,013) | **999 (1,006)** |
| `returning-accepted` LCP Δ | – | not summarised² | +60 (56–78) |
| Samples passed (`load` / `accept` / `returning`) | 15 / – / – | 15 / 10 / 10 | 15 / 10 / 10 |

1. CookieYes `accept` is from `reports/react-competitors.md`, not this
   session. Not rerun here.
2. The base's returning-visitor LCP is in its envelope; I did not tabulate
   it. Its LCP median is 562, against 566 for head.

Commands (`react-static-shell/`): `./run-cy.sh cy-mobile.json load 15 3
<label>` (react-competitors' October config, ported to ports 5053/5054 and
my copy of the stock consumer), and `WARMUPS=3 PORT=<p> ./bench-react.sh
run <rcand|head> mobile <load | accept,returning-accepted> <n>`. CookieYes
uses October's 10 s observation window. The c15t runs use the fixture
`run.json`'s 5 s window. Only `initial.transfer` depends on the window.
`bench-react.sh waterfall <label> 3 mobile` (react-arm's
`lib/waterfall-react.mjs`) produced the waterfalls.
`lib/scenario-table.mjs` produced the accept and returning rows.

### Desktop `load`, 15 pairs (17:48–18:01, load max ≤ 2.7)

| | CookieYes | commit path | head |
| --- | ---: | ---: | ---: |
| LCP Δ (CI) | −4 (−16–12) | +20 (8–32) | +16 (0–28) |
| banner.visible | 351 | 262 | 230 |

CookieYes ran under the `desktop-article-v1-browser-ua` profile from its
config. The c15t runs used the fixture's `desktop.json`
(`desktop-article-v1`).

### Discarded runs (load sample over 8)

| Run | Load max | Result, not used |
| --- | ---: | --- |
| CookieYes mobile `load` 17:06 | 10.2 | +120 (112–144), banner 1,097 |
| head mobile `load` 17:21 | 8.13 | +244 (200–288), banner 525 |
| commit path `accept,returning` 17:33 | 11.44 | consent-effective 263, returning 1,000 |

A head `accept,returning` run at 17:40 (load 7.32) gave 271 / 360 / 1,016.
A commit-path `load` at 17:18 (load 5.5) gave +292 (284–304). Both agree
with the table. Every control FCP median was 736–792, under 800. No run had
a failed sample.

## How it works

### Build (`consentManifest()`, `packages/core`)

`vite build` of a client page (Rolldown, not SSR, with an HTML input, the
`/init` prefetch on) does three things.

1. **Sheets out of the JavaScript.** `resolveId` gives `@c15t/react`'s
   imports of `@c15t/ui/styles/sheets/{tokens,button,banner,trigger,consent-gate}`
   their existing `-deferred` twins: same `id`, no text, and a `load()`.
   That is the mechanism the Next.js adapter already uses for SSR HTML. Only
   importers inside `@c15t/react` are affected, so Vue and Svelte keep
   theirs. The input check reads the resolved config, so a framework plugin
   that sets JS entries (React Router) turns it off.
2. **Sheets into the page.** `transformIndexHtml` finds the page's entry
   chunk, walks its static imports, and looks for
   `@c15t/react/dist/components/prompt/atoms/root.js`. On such a page only,
   it adds `<style data-href="c15t-…" data-precedence="c15t">` for tokens,
   button and banner at the end of `<head>`, after the module preloads.
   React 19 adopts these for the banner's `<style href precedence>`, and
   `useSurfaceSheetsReady` finds them. The fixture's `baseline.html` gets
   nothing (tested).
3. **The banner.** It fetches `${backendURL}/manifest` once with a 10 s
   timeout. A failure warns and skips the banner; it never fails the build.
   It resolves `/init` locally per policy pack with `resolveManifestInit`,
   in the page's `<html lang>` or English. It then loads
   `@c15t/react/static-banner` from the installed package, which
   server-renders `<ConsentBanner />` inside the same `DeferredConsentShell`
   and the same `snapshotFromPrefetchedInit` snapshot the client root uses.
   The first pack that yields a choice banner wins (here `europe_opt_in`).
   The output is `<div data-c15t-static-banner hidden>` holding the
   server-rendered banner, including the existing `EARLY_CONSENT_TAP_SCRIPT`
   that `EarlyTapScript` renders on a server, followed by the reveal script.

### Reveal (`packages/core/src/libs/static-banner.ts`, inline)

- At parse: if a consent cookie, a localStorage record or a notice
  dismissal is stored (the same keys the client root reads), it removes the
  banner. A returning visitor never sees it.
- When the page's single `/init` prefetch resolves, it reveals the banner
  only if all of these hold:
  - status `matched`;
  - same `fingerprints.policy`;
  - same language;
  - same branding;
  - no vendors or GVL;
  - same policy contract;
  - same FNV-1a hash of title, description, Accept, Reject, Customize and
    "Secured by";
  - still nothing stored.
- Otherwise it removes the banner.

It reveals on the `/init` answer, not at parse. This manifest is
location-dependent (EU and Quebec choice, California opt-out, world no
banner), so a reveal at parse would flash a wrong banner for every non-EU
visitor. On this page `/init` answers at about 450 ms, which already puts
the banner 580 ms ahead of CookieYes.

### Takeover (`packages/react`)

React renders into `#root` with `createRoot`. It cannot hydrate an element
outside its root, so "adopt" means replace. CookieYes's `renderShell` does
the same.

- `ConsentBannerRootChildren` removes `[data-c15t-static-banner]` in a
  layout effect when it shows. That is the same commit, before paint. The
  tests count one banner root in every animation frame and found no frame
  with zero or two.
- `useLateEntry` returns false while a static banner is shown, so the React
  banner does not fade in again.
- The client markup equals the build's, apart from the branding link's
  `?ref=<host>` (tested on `outerHTML`).
- The client provider also removes the static banner when its snapshot
  shows no banner.
- **A tap before React mounts:** the early-tap script hides the banner and
  queues the tap. `scheduleDeferredEngine`'s existing `onTap` routes it
  through the commit path once `/init` resolves. That is one save, the
  cookie, and both gated scripts (tested, and checked on the throttled
  fixture: tap at 539 ms, one `POST /subjects`, 2 scripts, no banner frame
  after the tap).
- I did not change the commit logic or `deferred/` tap handling.

### `modulepreload`

The brief asked for this, but Vite already emits
`<link rel="modulepreload" href="/assets/c15t-*.js">` in `index.html` in
both the base and head builds. I added nothing and did not measure a
variant.

## What the shell contains (fixture build, `index.html`)

| Part | Raw B | Brotli B (q11) |
| --- | ---: | ---: |
| Three inline sheets (tokens 3,453, button 18,794, banner 29,990 raw) | 52,423 | 5,504 |
| Banner wrapper and markup, incl. early-tap script (942 raw / 433 br) | 4,020 | 1,350 |
| Reveal script | 1,561 | 767 |
| **`index.html` total** | 3,884 → 61,905 | 1,647 → 8,944 |
| c15t eager chunk | 186,487 → 124,983 | 43,026 → 36,308 |

On the wire (waterfall): document 2,061 → 9,358 B, c15t chunk 43,447 →
36,729 B. Net +577 B before the hero. The hero starts 25 ms earlier because
the c15t chunk finishes 59 ms earlier (762 against 821 ms), and the page
renders the hero after it. That is the likely source of the ~28 ms LCP gain.
I did not isolate it.

## Commits (branch `kaylee/react-static-shell`, worktree `t3-712818a8`, from `9c16ae024`, not pushed)

| Commit | What |
| --- | --- |
| `8b4709600` | feat(core): put a static consent banner in index.html from consentManifest() |
| `d63ceebcd` | perf(react): render the static banner at build time and replace it on mount |
| `c4a054088` | fix(core): count a stored notice dismissal and avoid named groups |
| `b81ae23dc` | refactor(core): resolve the generated module synchronously beside the async sheet alias. **Measured build.** |
| `0ee7ba8ce` | test: static banner build, reveal script and client takeover |
| `692296f17` | fix(core): read HTML inputs from the resolved config |
| `f039be287` | test: lint |
| `e03846052` | docs: `docs/frameworks/react/rendering.mdx` section and `.tegami/2026-11-03-react-static-banner.md` |

The final HEAD `e03846052` rebuilds to the same fixture `dist/`: identical
file names and sizes, and a byte-identical `index.html`.

Files: `packages/core/src/build.ts`, `build-static-banner.ts` (new),
`libs/static-banner.ts` (new); `packages/react/src/static-banner.tsx` (new,
exported as `@c15t/react/static-banner`),
`components/prompt/static-banner-shell.ts` (new),
`components/prompt/atoms/root.tsx`, `hooks/use-late-entry.ts`,
`deferred/client-provider.tsx`, `package.json`. 15 files, +1,577 / −20.

## Tests

| Suite | Result |
| --- | --- |
| core, `bun run --cwd packages/core test` (coverage gate) | 151 files, 2,912 pass |
| New core `__tests__/static-banner.test.ts` (real Vite builds, stand-in `@c15t/react`/`@c15t/ui` packages) | 6 pass. Covers: banner with the manifest's custom title and sheets in `index.html`, sheet text gone from the entry, `baseline.html` untouched; manifest without a choice banner gives sheets and no banner; failed fetch warns and builds; `staticBanner: false` changes nothing; no HTML input keeps the sheets in JS; `initPrefetch: false` gives no banner |
| New core `libs/__tests__/static-banner.test.ts` (jsdom) | 10 pass. Covers: reveal on a matching answer; **cookie → removed before `/init` answers**; notice dismissal; policy, language, copy, branding or vendors differing → removed; failed `/init` or no prefetch → removed; choice stored while in flight → removed |
| `build.test.ts` | updated to `await` the now-async `transformIndexHtml`; passes in the full run |
| New react `deferred/__tests__/static-banner.test.tsx` (Chromium) | 3 pass, 3 runs in a row. Covers: renderer output and no output without a choice prompt; **client banner replaces the static one** (one root in every frame, same `outerHTML` apart from `ref`, no `data-entry`, one `<style>` per sheet); **Accept tapped on the static banner before React is recorded once** (stored, one `/subjects`, nothing visible) |
| Mutation checks | Removing the stored-check fails the two returning-visitor tests. Removing the layout-effect removal fails both takeover tests. Removing the `useLateEntry` change fails the takeover test |
| react `src/__tests__` | 63 files, 554 pass. This needs `@c15t/integrations` built, otherwise `#inline-start` fails to resolve and the browser connection dies |
| react `src/components` / `src/component-hooks src/hooks src/server src/utils` | 52 / 379 and 19 / 121 pass |
| react `src/deferred` | 8 files, 57 tests. `commit-path.test.tsx` "customize hides the banner…" fails in some batch runs: head 2 of 6, base sources (my three React files reverted) 1 of 8. It passes alone. It is a pre-existing flake |
| `check-types` core, react, nextjs, c15t | 18/18 tasks pass |
| oxlint (repo config) and oxfmt on changed and new files | clean, apart from pre-existing findings in `build.ts` lines 778/811/843 and `client-provider.tsx` |
| Fixture smoke (`lib/smoke-shell.mjs`, throttled) | static banner at 520 ms, React at 1,052, 0 frames with two banners, 0 empty frames, 3 sheets, Accept works; returning: no banner frame and no static banner in the DOM; early tap: hidden, one POST, cookie, 2 scripts, no console errors |

## Risks

- **The app's banner differs from the stock one.** The build cannot read
  provider options: `i18n.messages`, `legalLinks`, `theme`, `components`
  slots, `<ConsentBanner>` props, or a custom banner on a page that also
  imports the stock one. The static banner then shows stock copy and styling
  until React swaps it, which is a visible change. It is on by default, and
  `staticBanner: false` turns it off. Documented. Gating on "the entry
  imports the stock banner module" catches only the custom-banner case where
  the stock module is not imported.
- **A copy, branding or policy change after the build** fails the reveal
  check, so the banner stays hidden and the React path runs as before. No
  wrong banner, but no gain until a rebuild.
- **The returning visitor downloads the static banner.** The extra
  `index.html` bytes are +7.3 KB br, while the JS is 6.7 KB smaller. First
  gated script: 999 against 996 ms.
- **Hydration mismatch:** not applicable to `createRoot`. Under
  `hydrateRoot` (SSR apps), the plugin turns itself off: `serverRendered`
  adapters, `build.ssr`, or no HTML input. A React Router or Remix app
  using plain `consentManifest()` has JS entries, so no alias and no banner.
  I did not build one.
- **CSP:** two more inline scripts and three inline styles. Vite's
  `html.cspNonce` covers them, since the post hook adds nonces. Hashes would
  need updating per build.
- **Build-time network.** A `hosted()` build now fetches `/manifest`.
  Failure only warns.
- **The deferred sheet alias** applies to the whole client build. A page
  with a c15t surface but no stock banner in its entry gets its sheets via
  `load()` on first render: one extra request, then the surface shows.

## Not verified

- CookieYes `accept` in this session. Its row uses react-competitors'
  numbers.
- `reject`, `save`, `preferences`, `reject-keyboard` and `withdraw` in
  CookieBench. Desktop `accept`.
- Tap timing before hydration in CookieBench. Its `accept` taps after
  readiness, so it hits the React banner. The pre-React tap is covered by
  the test and the smoke script only.
- React 18 (the `<style data-href>` path for non-hoisting React), StrictMode,
  multiple roots.
- Apps on webpack, esbuild or Rspack, and Vite apps without Rolldown 1.2.
  The fixture uses Vite 8.3.1 and Rolldown.
- Non-English pages, notice prompts (the shell supports `choice` only), and
  location-independent manifests, where a reveal at parse would be safe and
  earlier.
- The LCP gain is not attributed by ablation. The waterfall shows the
  c15t chunk finishing earlier; that explanation is inferred.
- A merge with the `instant-commit` lane. The only `deferred/` change is
  three lines in `client-provider.tsx`.
- `bun.lock`: my first install used bun 1.4.3, which rewrote the lockfile.
  I reverted it and reinstalled with bun 1.3.11 (`react-static-shell/tools/bun`).
  Fixture `dist/` was identical before and after.

## Next lever (not built)

The static banner now owns banner.visible, so the React banner components
and stand-in no longer need to be in first load. Taps go through the
early-tap queue and the commit chunk. Moving them behind the hero, as Next's
`ConsentRoot` does, should take most of the remaining ~36 KB br out of the
before-hero bytes. React needs a small eager provider and lazy surfaces for
that, and react-gap's lazy-shell work showed the chunking pitfalls.

## Artifacts (`/home/kaylee/.t3/scratch/lcp-fleet/react-static-shell/`)

- Runs: `runs/cy-*` (CookieYes); `work/{rcand,head}/out/*` (envelopes,
  `summary.md`, `loadavg.txt`, waterfalls `waterfall-mobile-20261103-174723`
  and `…-174823`).
- Scripts: `bench-react.sh` (copied from commit-path; samples load average),
  `run-cy.sh`, `queue*.sh`, `lib/smoke-shell.mjs`, `lib/scenario-table.mjs`,
  `cy-{mobile,desktop}.json`, `env.sh`.
- Logs: `tests-*.log`, `check-types.log`, `build-*.log`, `smoke-head.json`.
