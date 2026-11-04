# Lane `payload`: every byte and request c15t adds to the CookieBench Next.js fixture

c15t canary HEAD `c35b112b7` (3.2.0-canary.0), packed from worktree `t3/ecc2d6ef`. No c15t source changes.

## Bottom line

- c15t adds **85.7 KB (brotli, as transferred) before the hero image finishes**. LCP moves +412 ms (median of 11 pairs). The slope is 4.75 ms per KB, so the cost is bandwidth.
- Where the 85.7 KB goes:
  - **79% is the JS of one client boundary** (`ConsentFixture` → `ConsentRoot` and friends): 67.8 KB.
  - **7% is a lazy script-loader chunk** that still lands before the hero: 6.1 KB.
  - **14% is HTML**: 11.8 KB, of which the inline CSS is 8.6 KB.
- **CSS splitting helps, but only a little.** All of the CSS is 8.6 KB (~43 ms), and none of it can go without losing the styled banner at FCP. Realistic splits save 2.6–5.0 KB, which is **13–25 ms**.
- The large lever is to get the engine JS out of the window before the hero. Done fully, that is up to ~74 KB (~370 ms). Done partly, by lazy-loading the parts a fresh visitor doesn't need before the first click, it is ~19 KB (~95 ms).
- **Load makes no remote request.** Accept POSTs to `https://benchmarks-inth.inth.app/subjects`.
- **`consent.resolution` (1,816 ms in October, 2,052 ms here) is hydration time, not a network wait.** The fixture's `Probe` stamps it in a `useEffect`. Its first snapshot already holds `status: "matched"` from the server, so the stamp lands when the client tree hydrates. It still happens.

## 1. What I measured

Setup:

- Built with Node 24.21.0. Under Node 26, `@c15t/ui`'s `tcm` (yargs) fails with `require is not defined`, so the build needs Node 24. Command: `bun turbo run build --filter=c15t...`.
- Packed 13 packages with `bun pm pack` into `/home/kaylee/.t3/scratch/lcp-fleet/payload/tarballs/`.
- Private workspace: `/home/kaylee/.t3/scratch/lcp-fleet/payload/cb/`. It holds copies of `fixture-support`, `schema` and `with-c15t-nextjs`, and `pnpm-workspace.yaml` overrides every `@c15t/*` package to the tarballs. Ports are 4340 (proxy) and 4430 (next).
- `next.config.ts` adds `productionBrowserSourceMaps: true`.
- Ran `pnpm exec next build` (Next 16.0.7, Turbopack), then `pnpm start`, i.e. the CookieBench proxy. The proxy serves HTML as streamed Brotli q5 and static assets as Brotli q11.

Browser runs used my own Playwright script, not the CookieBench runner. The profile matches `mobile-article-v1`:

- 390×844, DPR 3, touch, the CookieBench UA.
- CPU throttled 4×.
- `Network.emulateNetworkConditions`: 200,000 B/s down, 93,750 B/s up, 150 ms latency.
- Cache disabled, fresh context per visit, `/` and `/baseline` alternated.

Command: `node measure/visit.mjs http://127.0.0.1:4340/ 8 ../wf-8.json --alternate http://127.0.0.1:4340/baseline`, plus 3 more pairs in `wf-3.json`. I dropped the first visit of the first run (cold browser, FCP 828 ms).

| Metric (11 pairs, median) | Baseline `/baseline` | c15t `/` | Delta | Oct 2026-10-15 c15t 3.0.0 |
| --- | ---: | ---: | ---: | ---: |
| Transfer before hero end | 613,270 B | 698,969 B | **+85,699 B** | – |
| Transfer, whole visit (2.5 s observe; +4,700 B writer at ~6.8 s) | 613,270 B | 717,973 B | +104.7 KB | 717,106 B (+104 KB) |
| Requests before hero end | 10 | 13 | +3 | – |
| Requests, whole visit | 10 | 16 | +6 | 16 (+6) |
| FCP | 248 ms | 276 ms | +48 ms (paired median) | 236 |
| Hero response end | 3,415 ms | 3,820 ms | +405 ms | – |
| LCP | 3,444 ms | 3,848 ms | **+412 ms** (range 292–472) | 3,824 (+400) |
| Banner visible (rAF poll, rect > 0) | – | 259 ms | – | 243 |
| `__cookiebench.resolvedAt` (consent.resolution) | – | 2,052 ms | – | 1,816 |
| Accept tapped at 614 ms (before hydration): banner hidden | – | 702 ms | – | – |
| …save POST / first gated script | – | 2,286 / 2,376 ms | – | – |
| Accept tapped at 2,622 ms (hydrated): hidden / POST / script | – | 2,712 / 2,927 / 2,886 ms | – | – |

The CPU is shared with other agents, which is likely why resolvedAt runs higher than October. Byte numbers are deterministic. For the Accept test I fulfilled the remote `/subjects` POST locally.

## 2. Waterfall, one c15t visit (pair 2), with baseline

Chunk contents come from source maps; see §3.

| Start | First byte | End | Transfer B | Before hero end | Request |
| ---: | ---: | ---: | ---: | --- | --- |
| 0 | 161 | 235 | 15,598 | yes | `/` HTML (baseline: 3,802) |
| 212 | 501 | 500 | 5,694 | yes | Next webpack runtime (shared) |
| 214 | 1,669 | 1,667 | 76,715 | yes | Next framework / react-dom (shared; ends at 1,293 in baseline) |
| 214 | 807 | 805 | 19,418 | yes | Next main (shared) |
| 215 | 486 | 482 | 3,946 | yes | Turbopack runtime (shared) |
| 215 | 559 | 557 | 6,556 | yes | Next app-router client (shared) |
| 215 | 831 | 828 | **6,750** | yes | c15t `ConsentFixture` chunk 1/3 `a1d5871937d2c8aa` |
| 215 | 1,467 | 1,465 | **43,320** | yes | c15t `ConsentFixture` chunk 2/3 `7d7c7d0cb5ee5b3e` (engine) |
| 216 | 1,136 | 1,135 | **18,927** | yes | c15t `ConsentFixture` chunk 3/3 `cb3dd297d91250b2` |
| 227 | 425 | 3,820 | 493,920 | – | hero `courtyard.png` (baseline end: 3,402) |
| 1,948 | 2,114 | 2,112 | 916 | yes | page `reading-list.js` (shared) |
| 1,952 | 2,188 | 2,185 | **6,068** | yes | c15t script-loader, lazy `bc2d8499ee370752`; pulled in by the fixture's `useScriptLoader` |
| 2,116 | 2,276 | 2,276 | 1,142 | yes | page `reading-list.json` (shared) |
| 3,829 | 4,068 | 4,067 | 8,000 | no | c15t dialog warmup: panel + trigger `58d7dc200f2d1aa4` |
| 3,831 | 4,091 | 4,090 | 11,004 | no | c15t dialog warmup: dialog CSS + preferences `a5731e5646c343b9` |
| ~6,830 | | ~7,010 | 4,700 | no | c15t persistence writer, idle `b9ea5ef10d2a0c43` |

Notes:

- The baseline instead loads `4ee9fe1c18f4d11f` (1,161 B, the `Interaction` client component).
- No stylesheet request, font, image, manifest or `/init` request on load. All requests go to 127.0.0.1.
- Dialog warmup waits for `window.load` and then idle (`packages/react/src/chunk-warming.ts`). The hero is part of `load`, so warmup already runs after LCP.
- The three initial c15t chunks are one client reference: `5:I[8264,[a1d5…,7d7c…,cb3d…],"ConsentFixture"]`.

## 3. Where the bytes are

### HTML: +11.8 KB brotli

15,051 B body against 3,282 B for baseline. Marginal cost of each part, measured by removing it and recompressing at Brotli q5 (`measure/html-split.mjs`):

| Part | Raw B | Marginal br q5 | Marginal gzip |
| --- | ---: | ---: | ---: |
| `<style data-precedence="c15t" data-href="c15t-first-paint">` | 69,262 | **8,619** | 8,827 |
| RSC flight: serialized consent state (`initialTranslations` 2.2 KB raw, policy resolution 0.9 KB, …) | 3,910 | 1,381 | 1,464 |
| RSC flight: root tree, larger than baseline | 4,135 (vs 2,696) | 771 | 774 |
| Banner markup (incl. "Secured by inth" wordmark) | 3,036 | 812 | 892 |
| Early-tap capture script | 924 | 440 | 498 |
| 3 `<script async>` tags + fixture Probe buttons | 382 | 59 | 64 |

### How the CSS reaches the page

`app/layout.tsx` imports no stylesheet. The CSS gets in like this:

- `ConsentBanner` renders `SurfaceStyles` with `FIRST_PAINT_SHEETS` (`packages/react/src/components/shared/first-paint-sheets.ts`).
- That emits React 19's `<style href precedence="c15t">`, which React hoists into `<head>` during SSR.
- `withConsentManifest` (`packages/nextjs/src/build.ts:306`) aliases `@c15t/ui/styles/sheets/first-paint` to `first-paint-deferred` in browser bundles, so the 69 KB string does not ship again in JS.

So in this fixture:

- **Inline:** 69,195 B (8.6 KB br), not render-blocking. It is parser-inserted, so it holds nothing up.
- **Render-blocking stylesheets:** 0 B.
- **Lazy:** the dialog sheet, 35,903 B raw, in the warmup chunk after the hero.
- **Returning visitors** get no inline sheet. They fetch `first-paint.js` as a separate chunk, `248917385433f0c2`: 8,373 B, after load, even though no surface is visible. That's wasted, but it lands after LCP.

Which first-paint rules apply? I walked every rule in the page (`measure/css-match.mjs`), stripping hover/focus/active states, then checking the selector with `querySelector` and the media query against a 390 px touch screen:

| Category | Bytes | Share | Main owners |
| --- | ---: | ---: | --- |
| No element on the page matches | 40,066 | 58% | prompt 12.9 K (other variants/positions/dark), button 10.9 K, panel-trigger 10.1 K, branding 3.3 K, consent-gate 1.4 K |
| Custom properties (tokens + component variables) | 14,722 | 21% | includes ~4.7 K of dialog/manager/tabs/preference-item/collapsible vars and ~1.0 K of gate vars |
| Applies to the banner now | 8,814 | 13% | branding 3.5 K, prompt 3.1 K, button 1.2 K, actions 1.0 K |
| Selector matches but media query is off (≥640 px, hover:hover, reduced motion) | 3,535 | 5% | button, actions |
| Hover/focus/active state for rendered elements | 1,829 | 3% | button |

None of the sheet styles the dialog's own components; those rules are all in the separate dialog sheet. What the sheet does carry for closed surfaces:

- ~4.7 K of dialog variables.
- The panel-trigger rules, 10.1 K. The trigger is not shown while the banner is up.
- The ConsentGate rules, 2.4 K. No gate on this page.

| Subset of the first-paint sheet | Raw | br q5 | gzip | Saving vs full (br) |
| --- | ---: | ---: | ---: | ---: |
| Full sheet (today) | 69,195 | 8,654 | 8,968 | – |
| Generic banner sheet: drop panel-trigger, consent-gate, dialog/gate vars | 51,424 | 6,051 | 6,282 | −2,603 |
| Config-specific: rules for the rendered variant + states + desktop media + banner vars | 24,317 | 3,664 | 3,869 | −4,990 |
| Same, without hover/focus or desktop rules | 18,323 | 3,236 | 3,416 | −5,418 |

### JS: +67.8 KB br initial (+78.0 KB gzip, 233 KB raw), plus 5.6 KB br lazy before the hero

Attribution uses `benchmarks/bundle-test-app/client-payload/attribute.ts` (source-map segments). The runner is `measure/attribute-run.ts`. Per-area br and gz are estimated as the area's share of chunk raw bytes times the chunk's compressed size.

| Area (initial `ConsentFixture` chunks) | Raw | est. br | est. gzip |
| --- | ---: | ---: | ---: |
| **Engine total** | **156,000** | **~45,600** | **~52,700** |
| · core kernel (choice 9.5 K, init-lifecycle 6.1 K, patch 4.8 K, snapshot 4.7 K, save-outbox 5.3 K, setters, record-validation, records, dispatch) | 42,055 | 11,664 | 13,465 |
| · core persistence (record-codec 7.5 K, record-storage 7.1 K, mount 6.5 K, hydrate 1.9 K, clear) | 25,329 | 7,025 | 8,110 |
| · core libs (vendors 5.9 K, policy-actions 3.6 K, experiment 3.4 K + storage 0.9 K, cookie 3.4 K, journey, failed-response) | 24,221 | 7,389 | 8,449 |
| · core runtime (provider-runtime 5.4 K, assemble 4.1 K, client-mode 2.6 K, runtime-kernel 2.5 K, journey, streamed-init, script-loader-preload) | 20,445 | 5,717 | 6,610 |
| · `@c15t/schema` (policy-resolution-wire 6.5 K, policy-rule-invariants 3.2 K, init params, canonical order); no presets | 12,105 | 3,380 | 3,899 |
| · core consent-record (evaluate 3.8 K, validation 2.5 K, normalize, evaluation-policy) | 11,570 | 3,463 | 4,009 |
| · core other (modules/has 3.8 K, policy 1.8 K, consent types, translations resolver) | 9,644 | 2,847 | 3,264 |
| · core transports (hosted-records 2.0 K, subject-body 1.5 K, init-output, save-rejection) | 6,655 | 1,846 | 2,131 |
| · blockers (network-blocker hold 2.6 K, react iframe-blocker hook 1.8 K) | 4,370 | 1,338 | 1,574 |
| · surface-actions (early-taps 1.4 K, early-tap-script 1.1 K, save, rules) | 3,546 | 1,054 | 1,208 |
| **Banner UI** (prompt 13.2 K; shared: button 3.3 K, logo 2.6 K, branding 1.9 K, surface-styles 1.6 K, legal-links 1.3 K; `@c15t/ui` dom 4.7 K, theme-slots 3.5 K, color-scheme 0.9 K) | 38,515 | **11,371** | 13,065 |
| **React provider / hooks / context + `@c15t/nextjs` root** (provider 5.5 K, hooks, module-hooks, component-config 2.3 K, draft-context, kernel-selector, chunk-warming, nextjs root 1.7 K) | 24,823 | **7,352** | 8,487 |
| **Translations** (static English `4649.js` 5.6 K + index 1.0 K); the server also sends them in the flight state | 6,957 | 2,217 | 2,627 |
| App/fixture code | 2,718 | 831 | 978 |
| Lazy before hero: core script-loader (mount 8.4 K, loader 5.2 K) | 17,516 | 5,530 | 6,098 |

What is in the Next chunk graph only because `ConsentRoot` sits in a client component in the initial tree? All three initial chunks:

- They are 233 KB raw / 67.6 KB br, minus 2.7 KB of fixture code.
- Next gives every module a `'use client'` boundary statically reaches its own `<script async>` in `<head>`. Those scripts share the link with the hero from t≈215 ms.
- The banner itself is already in the HTML, and the early-tap script makes taps work before hydration (measured: tap at 614 ms, hidden at 702 ms). So none of this JS is needed for the banner to be visible or for a tap to look answered. It is needed to save the choice, run gated scripts, open the dialog, and give app code its hooks.
- `ConsentDialog` is already deferred.

Compared with September's report (`@c15t/core` 107 KB raw initial in the docs-site consumer), core here is 146 KB raw. The setups differ: this one uses `withConsentManifest` + streamed `resolveConsent`, and the runtime/ folder (20 KB raw) is new. So treat that as a different consumer, not a measured regression.

## 4. Ranked cuts

Each estimate counts bytes that stop landing before the hero, at 5 ms per KB br.

| # | Cut | br saved before hero | gzip saved | Est. LCP | Cost / risk |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | **Load the consent client graph after `load`/idle or on first tap.** Keep the SSR banner markup, inline sheet and early-tap script, and stop making the initial tree a client boundary that statically pulls in the engine. Implies a server-rendered banner shell plus a small client island that `import()`s the runtime. | ~67.8 KB (+6.1 KB script-loader) | ~77 KB (+6.2) | **−340 to −370 ms** | Banner at FCP unchanged. Tap still hides the banner in ~90 ms through early taps. The save POST and gated scripts after an early Accept move from ~2.3 s to after the hero (~4.0–4.3 s on this profile). Customize before load must fetch engine + dialog. `consent.resolution` in CookieBench moves from ~2.0 s to ~4 s, because the bridge stamps on hydration. App hooks (`useSnapshot` etc.) are unavailable until the engine loads. Returning visitors' gated scripts start later unless a small loader handles them from server state. Large API and architecture change. |
| 2 | **Lazy-load engine parts a fresh visitor doesn't need before the first click**: the save path (kernel `choice`, save-outbox, setters, record-validation, records), consent-record evaluation, transports, the persistence codec/storage when the server reports no records, vendors, experiment. Warm at idle after load like the dialog. | ~19 KB (estimate from the area table; not verified module by module) | ~22 KB | **−95 ms** | The first Accept needs one more chunk (~20 KB + 150 ms latency on this profile). Early taps hide that visually, but the POST and gated scripts come later by that much. Returning visitors with a cookie must keep the codec eager; the server knows which case applies. Needs care: kernel modules may be wired into snapshot creation. |
| 3 | **Don't fetch the script-loader chunk before any category is granted** (fresh visitor, no consent). Load it on grant, or after load. | 6.1 KB | 6.2 KB | **−30 ms** | No cost for fresh visitors: no granted category means nothing to load. Returning visitors with consent keep it eager (the server knows). |
| 4a | **CSS: drop panel-trigger, consent-gate and dialog/gate variables from the first-paint sheet**; they ship with the surfaces that use them. | 2.6 KB | 2.7 KB | **−13 ms** | The trigger after dismissal and any ConsentGate must bring their own sheet. The trigger chunk is already lazy, so it adds bytes there, not a request. Check the gate's SSR path. |
| 4b | **CSS: SSR only the rules for the rendered variant/position/scheme; defer the rest** (sheet ~3.7 KB br). | 5.0 KB (includes 4a) | 5.1 KB | **−25 ms** | Runtime variant/theme switches need the deferred sheet. Dark-scheme rules must stay inline when the OS scheme could be dark, or dark-mode users see the wrong colors first. The SSR side needs a rule-to-variant map. |
| 4c | CSS: no inline sheet; `media=print` swap after load (CookieYes pattern) | 8.6 KB | 8.8 KB | −43 ms | **Reject.** The banner paints unstyled or invisible at FCP, which is what we're protecting. CookieYes's pattern also adds a request; here nothing beyond the banner rules is needed on load. |
| 5 | **Don't ship English translations twice**: drop the static English import from the Next client path when server state carries `initialTranslations`. | 2.2 KB | 2.6 KB | −11 ms | Offline/no-server modes still need defaults; move them to a lazy chunk. |
| 6 | Theme runtime (`@c15t/ui` theme-slots, color-scheme, dom utils) lazy or server-applied | ~2.9 KB | ~3.4 KB | −14 ms | Runtime theme changes and color-scheme sync would wait for the chunk. |
| 7 | Branding/logo (logo.js, branding.js, wordmark markup, branding CSS that applies) | ~2 KB | ~2.3 KB | −10 ms | Product decision. |
| 8 | Slim the flight state (fingerprints/proof/translations duplicate) | ~0.7–1.4 KB | similar | −4 to −7 ms | Client loses data it may re-validate; check the save path. |
| 9 | Iframe/network blocker hooks lazy when not configured | ~1.3 KB | ~1.6 KB | −7 ms | None if unconfigured. |
| 10 | Client-side `@c15t/schema` validation of the server-resolved policy made lazy | ~3.4 KB | ~3.9 KB | −17 ms | Weaker client-side checks on server data. Correctness/security posture decision. |
| 11 | Merge the 3 initial chunks (+ script-loader) into fewer requests | ~1.3 KB (headers) | – | −6 ms | Not a lever here. The link is saturated from ~215 ms to hero end (4.75 ms/KB observed against 5.0 theoretical), so per-request latency is hidden. |

Totals, overlap removed:

- **Without changing the client-boundary structure** (2 + 3 + 4b + 5 + 6 + 9): ~36 KB br, **~180 ms**. That would put c15t at ~230 ms over control, still above CookieYes's ~180 ms.
- **With #1:** what remains before the hero is mostly the 11.8 KB of HTML (~60 ms, or ~35 ms with 4b). That beats CookieYes while keeping the banner at FCP. The cost is that the saved choice and returning-visitor gated scripts land later.

Evidence per theory, and what would disprove it:

- **#1/#2/#3 (JS):** byte attribution plus the 4.75 ms/KB slope. Disproved if a build with the chunks moved after `load` does not move LCP by about 5 ms per KB removed.
- **#4 (CSS):** inline sheet bytes and coverage. Disproved if removing the trigger/gate rules changes SSR banner rendering. Run the React surface-styles tests and a visual check of every variant/position.
- **`consent.resolution` = hydration:** Probe sets `resolvedAt` on the first snapshot with `matched`, which the server state already has. In every run, resolvedAt sits ~350–400 ms after the framework chunk finishes, at 4× CPU. Disproved if the snapshot starts as non-matched on the client.

## 5. Not verified / caveats

- I did not run the CookieBench runner (`cookiebench run`). Numbers come from my Playwright script with the same profile and the same proxy, and they reproduce October's +104 KB, 16 requests and +400 ms. `action.input-to-next-paint` was not measured. The Accept timings above are my own rAF/fetch probes.
- No cut was implemented or measured. Every LCP estimate is bytes × 5 ms/KB. The #2 module list is an estimate from attribution, not a working lazy split. Some kernel modules may be needed at hydration.
- Per-area br/gzip are proportional estimates. Chunk totals are exact, and Node Brotli q11 matches the observed transfer within header bytes.
- CSS coverage covers one config (default floating bottom-left, opt-in, light, 390 px). "No element matches" includes rules other configs need. That is why the generic cut (4a) is smaller than the config-specific one (4b).
- Next inferred `/home/kaylee` as the workspace root (a `package-lock.json` there). The original fixture on this machine would do the same. I did not check whether that affects chunking.
- Accept sends a real POST to `https://benchmarks-inth.inth.app/subjects`. One unthrottled run reached it during my remote-host check; the early-tap test fulfilled it locally.

Artifacts in `/home/kaylee/.t3/scratch/lcp-fleet/payload/`:

- `wf-*.json`: waterfalls.
- `attr.json`, `attr-extra.json`: per-module attribution.
- `areas.txt`, `modules.txt`, `js-groups.txt`, `css-usage.txt`: tables.
- `first-paint.css`, `subset-*.css`: the inline sheet and its subsets.
- `css-match.json`: rule-level coverage.
- `measure/*.mjs|ts|py`: scripts.

Server: `cd cb/benchmarks/with-c15t-nextjs && source ../../../env.sh && pnpm start` (ports 4340/4430).
