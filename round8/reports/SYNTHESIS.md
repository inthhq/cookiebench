# c15t mobile LCP on CookieBench: fleet synthesis

Date: 2026-11-02. Six Opus 5.5 lanes, all measured on this machine with the
CookieBench runner (mobile-article-v1) via `harness/bench.sh`. Baseline is
canary HEAD `c35b112b7`.

## The cause

The LCP element is the 494 KB hero image in every visit. At 200 KB/s the
control page's LCP is 3.4 s because the image saturates the link. Every KB
c15t downloads before the image finishes costs about 5 ms (measured slope
4.75 ms/KB). Main-thread work is not a factor: long-task blocking is 11 ms in
both arms. Request count is not a factor either: the fixture is HTTP/1.1 and
the hero never waits for a connection.

CookieYes's hosted script is cheap because it is small (31 KB), not because
it loads late. All of its bytes still land before the image finishes. "Late"
only helps when it means after the image.

## Where canary's 85.7 KB before the hero goes

| Part | Bytes (brotli) | Share |
| --- | ---: | ---: |
| JS behind the `ConsentRoot` client boundary | 67.8 KB | 79% |
| Script-loader chunk fetched at mount with nothing granted | 6.1 KB | 7% |
| HTML (inline first-paint sheet 7.8 KB, markup, flight state) | 11.8 KB | 14% |

## Results per lane

| Lane | Change | Bytes before hero | LCP delta (15 pairs unless noted) | Branch / commit |
| --- | --- | ---: | ---: | --- |
| harness | none (baseline) | +85.7 KB | **+396 ms** (392–398) | — |
| css-critical | banner-only inline sheet | −2.3 KB | 392 ms at 5 pairs (not resolvable) | `kaylee/split-first-paint-css` `c814eec03` |
| eager-graph | script-loader chunk after priority images | −5.6 KB | 388 ms at 5 pairs (directional) | `kaylee/eager-graph-lcp-trims` `ed9495320` |
| scheduling | opt-in `deferConsent()` island, hero-or-input trigger | −67 KB | **+32 ms** (28–36) | `kaylee/lcp-defer-banner-client-js` `d4234da66` |
| defer-default | deferral as `ConsentRoot` default, no app change | −65 KB | **+48 ms** (44–56) | `kaylee/defer-consent-engine-default` `2a7c3ea2a` |

CookieYes hosted on the same profile: +180 ms. Both deferral variants beat it
by a wide margin with the banner still visible at ~245 ms.

## The trade-off, measured (defer-default vs canary)

| Measure | canary | defer-default |
| --- | ---: | ---: |
| LCP delta | +396 | +48 |
| banner.visible | 260 | 244 |
| Page under `ConsentRoot` hydrated | 1,929 | 1,563 (earlier: engine no longer in first-load JS) |
| Banner hydrated by React (no tap) | 2,039 | 4,127 |
| Accept: banner hidden after tap | 40 | 27 |
| Accept: input-to-next-paint | 40 | 32 |
| Accept: consent effective after tap | 40 | **872** |
| Accept: first gated script after tap | 58 | **1,135** |
| Tap at 1.0 s: first gated script | 2,398 | 2,909 (+511) |
| Tap at 2.5 s: first gated script | 2,794 | 3,837 (+1,043) |
| Returning, warm, `useScriptLoader` script | 636 | 720 (+84) |
| Returning, cold, `useScriptLoader` script | 2,414 | 2,828 (+414) |
| Returning, config `scripts` with server start | unaffected | unaffected |
| CookieBench readiness failures (5 s window) | 0 | 0 of 35 samples |

What a fresh visitor experiences: the banner paints at the same time, the
tap hides it just as fast, and the choice is saved about 0.8 s later than
today because the 65 KB engine downloads on the tap over a 200 KB/s link.
Nothing is lost; it lands later. On a real network the gap is far smaller.

## How defer-default works

- Server render unchanged: full provider, banner HTML, inline CSS, early-tap
  script, server script start. Plus a JSON boot snapshot after the page.
- First-load client chunk is a 6.9 KB shell (5.7 KB c15t) that fills the
  contexts with a stand-in kernel built from the boot snapshot. Reads return
  server state; setters queue and replay; commands load the engine.
- Engine (65 KB br, one chunk group) loads when: every `fetchpriority=high`
  image has loaded, or input lands on the banner/overlay, or an early tap is
  queued, or `load` with no priority image, or 10 s.
- Defers only when a prompt is needed (banner active, not IAB, no experiment,
  nothing granted). Returning visitors load the engine as soon as the shell
  runs.
- Splitting hook modules alone took the shell from 15 KB to 6.4 KB: `hooks.ts`
  was pulling experiment, cookie, vendor and English copy into any page using
  `useSnapshot`.
- 43 files, +2,992/−442. nextjs 396 tests pass, react passes in batches,
  check-types clean. No docs, no release note yet.

## Open risks on defer-default (from its own report)

- Fresh-visitor consent-effective at 872 ms on the throttled profile, 0.6 s
  of margin inside CookieBench's 1.5 s action window.
- Cold returning visitors with `useScriptLoader` scripts: +414 ms. Fix idea:
  emit preload links for the engine chunk when the server knows the visitor
  is returning (needs chunk URLs from Turbopack; untested).
- Core `WeakMap`s keyed by kernel (`surface-actions/rules`, script-loader
  registries, iab-controls) see the stand-in outside the engine and the real
  kernel inside. No broken flow found; not audited map by map.
- `ProviderServices.runtime` is undefined before attach; `useEventDispatcher`
  in page code before attach would throw. Not covered.
- `useNetworkBlocker`, `usePersistence`, `useIframeBlocker` under the
  stand-in: untested before attach.
- Customize before the engine loads: replay opens the dialog later; latency
  not measured. Keyboard reject, save, preferences, withdraw scenarios not run.
- React 18 Pages Router path covered by node tests only.
- Boot snapshot carries 5.8 KB raw of English copy (+2.1 KB br HTML).

## Findings that are not about LCP

- CookieBench `withdraw` fails on clean canary HEAD: "dismissed" and
  "consent effective" never observed. Cause unknown. Needs its own look.
- `@c15t/ui` does not build under Node 26 (`tcm`/yargs `require is not
  defined`). System Bun 1.4.3 rejects the repo lockfile. The harness carries
  Node 24.21.0 and Bun 1.3.11 under `harness/tools/`.
- The react suite crashes in one run on canary unless `@c15t/integrations`
  is built first (`#inline-start` resolves to `dist`).
- `consent.resolution` in CookieBench is the fixture's hydration stamp, not
  a network wait.

## Recommendation

1. Take `kaylee/defer-consent-engine-default` as the direction. Harden the
   open risks above, add docs and a release note, then run the full
   CookieBench protocol (all scenarios, both profiles) through the harness.
2. Add the free improvement: also trigger the engine load on the first
   pointerdown, keydown or scroll anywhere on the page. LCP observation ends
   at first input or scroll, so this costs zero LCP by definition and cuts
   the consent-effective gap for anyone who scrolls before tapping Accept.
3. Fix cold returning visitors with a server-emitted preload for the engine
   chunk when the boot data says "eager".
4. Stack `kaylee/split-first-paint-css` (clean, tested, no file overlap).
   Worth ~2.3 KB of the remaining ~20 KB before the hero.
5. Drop `kaylee/eager-graph-lcp-trims`: defer-default already keeps the
   loader chunk out of the pre-hero window, and both touch
   `packages/react/src/module-hooks/script-loader.ts`.
6. Drop `kaylee/lcp-defer-banner-client-js` as a separate PR; its commit is
   already the parent of defer-default's and the opt-in helper is redundant.
7. Investigate the `withdraw` failure separately.

Expected standing after 1–4: about +40 ms against CookieYes's +180 ms,
banner at FCP, no change for returning visitors with server-started scripts.

## Artifacts

- Shared brief: `BRIEF.md`
- Harness: `harness/bench.sh`, `harness/README.md`
- Lane reports: `reports/{harness,payload,cookieyes-ideas,scheduling,css-critical,eager-graph,defer-default}.md`
- Worktrees: `/home/kaylee/.t3/worktrees/c15t-private/t3-{92c937ce,9387ee4d,fd67f1a2,8778ea0f}`

## Update 2026-11-03: same-machine comparison, Next.js and React

All rows below were measured on this machine (Ryzen 7 2700) by the
`competitors`, `defer-fix` and `react-arm` lanes with the CookieBench runner.
"Oct" columns are October's M1 Pro matrix (`results/2026-10-15-matrix-rerun`).
Every c15t branch row keeps the banner inside the first paint; nothing else does.

### Next.js, mobile-article-v1, `load` 15 pairs

| CMP | LCP Δ (95% CI) | Oct LCP Δ | banner.visible | accept: consent-effective |
| --- | ---: | ---: | ---: | ---: |
| c15t defer-default `2a7c3ea2a` | +44 (44–52) | — | 242 | 870 |
| c15t defer-fix `t3/98c1f078` (harness, 5 s window) | +56 (52–68) | — | 250 | 953 |
| CookieYes hosted | +176 (168–188) | +176 | 2,369 | 18 |
| c15t 3.0.0 npm | +388 (344–412) | +400 | 250 | 43 |
| c15t canary `c35b112b7` | +396 (388–408) | — | 246 | 43 |
| Osano | +432 (392–460) | +432 | 2,236 | failed |
| Cookie Control | +508 (488–520) | +488 | 2,548 | — |
| OneTrust | +512 (492–552) | +384 | 3,972 | 52 |
| iubenda | +616 (604–632) | +616 | 2,705 | — |
| Enzuzo | +772 | +768 | 2,776 | — |
| Usercentrics | +848 (832–860) | +868 | 4,173 | — |
| Didomi | +1,332 (1,240–1,340) | +1,284 | 4,530 | — |
| Ketch | +1,784 | +1,760 | 7,838 | — |

OneTrust, Didomi, Ketch and Cookie Control cost more here than in October
because their cost is CPU and 4x on this Ryzen is slower than 4x on an M1
Pro. Byte-bound vendors (CookieYes, Osano, iubenda, c15t) reproduce within 12 ms.

### Next.js, desktop, `load` 15 pairs

| CMP | LCP Δ | banner.visible |
| --- | ---: | ---: |
| c15t defer-default | +16 (4–28) | 61 |
| c15t canary | +16 (4–28) | 60 |
| c15t defer-fix (harness) | +28 (16–48) vs canary +40 same session | 67 |
| c15t 3.0.0 | +24 (12–40) | 58 |
| CookieYes | 0 | 376 |
| Cookie Control | 0 | 372 |
| iubenda | +4 | 436 |
| Enzuzo | 0 | 493 |
| Didomi | +8 | 514 |
| OneTrust | −4 | 638 |
| Osano | 0 | 703 |
| Usercentrics | +4 | 710 |
| Ketch | 0 | 1,404 |

### React (Vite, client-rendered), mobile, `load` 15 pairs

Same machine: c15t canary, the `kaylee/react-mobile-lcp-banner-shell` branch
and CookieYes. Other vendors are October M1 Pro numbers (not re-run here).

| CMP | LCP Δ | banner.visible | accept: consent-effective | Source |
| --- | ---: | ---: | ---: | --- |
| CookieYes | +112 (104–136) | 1,059 | 16 | here |
| CookieYes | +104 (80–132) | 1,010 | — | Oct |
| OneTrust | +244 (188–344) | 3,535 | — | Oct |
| c15t react-arm branch | +280 (260–284) | 1,081 | 565 | here |
| Cookie Control | +316 | 1,690 | — | Oct |
| Osano | +376 | 1,578 | failed | Oct |
| iubenda | +456 | 2,070 | — | Oct |
| c15t 3.0.0 | +536 (508–548) | 1,112 | — | Oct |
| c15t canary | +592 (568–596) | 1,281 | 28 | here |
| Enzuzo | +600 | 2,111 | — | Oct |
| Usercentrics | +748 | 3,429 | — | Oct |
| Didomi | +1,100 | 3,347 | — | Oct |
| Ketch | +1,848 | 7,088 | — | Oct |

React desktop: c15t canary +28, branch +16 (0–20), CookieYes +12; banner
250 / 249 / 277. October: every other vendor 0, c15t +20.

### Where c15t lands after the branches

- Next.js mobile: first place, about a quarter of CookieYes's LCP cost, with
  the banner ~2.1 s earlier than CookieYes's.
- React mobile: third, behind CookieYes and (on October's M1 numbers) OneTrust,
  with the banner at the same time as CookieYes's and 2.5 s before OneTrust's.
  The remaining 168 ms over CookieYes is ~41 KB of banner, policy and copy JS.
- Desktop: unchanged, c15t is the only CMP with a measurable LCP cost (+16 to
  +28 ms) because it is the only one whose banner is in the first HTML.
- Trade-off everywhere: a fresh visitor whose first touch is Accept waits for
  the engine before consent takes effect (Next.js ~0.9 s, React ~0.57 s on the
  200 KB/s profile). The banner hides at the tap in all cases.

### Update 2026-11-03 (later): React fixture, all rows same machine

Supersedes the React table above. Lane `react-competitors`
(`reports/react-competitors.md`), October React configs ported, 15 pairs,
seed 20261009. CookieYes runs from `<head>` as October did on React.

| CMP | LCP Δ (95% CI) | Oct LCP Δ | banner.visible | accept: consent-effective |
| --- | ---: | ---: | ---: | ---: |
| CookieYes | +112 (100–128) | +104 | 1,062 | 16 |
| c15t react-arm branch `267563fa4` | +280 (272–308) | — | 1,101 | 568 |
| Cookie Control | +280 (276–296) | +316 | 1,750 | 27 |
| OneTrust | +336 (304–376) | +244 | 3,707 | 51 |
| Osano | +396 (368–424) | +376 | 1,808 | not run |
| iubenda | +412 (404–420) | +456 | 2,088 | not run |
| c15t 3.0.0 | +572 (560–616) | +536 | 1,239 | not run |
| c15t canary | +592 (580–600) | — | 1,257 | 26 |

Desktop: competitors 0 within noise; c15t branch +12, canary +28, 3.0.0 +36.
c15t's banner on desktop at 211–257 ms vs 344–740 ms for the rest.

Reading: the branch is tied second with Cookie Control, 168 ms behind
CookieYes, banner 39 ms after CookieYes's and 650 ms+ before anyone else's.
Stock c15t (3.0.0 and canary) is last of the eight on this fixture. OneTrust
and c15t 3.0.0 cost more here than in October for CPU reasons (long tasks
126 vs 16 and 39 vs 0 ms); Cookie Control and iubenda cost less here,
unexplained. Vendor transfer bytes match October within 2.1 KB.

### Update 2026-11-03 (final): React gap lane result

Lane `react-gap` (`reports/react-gap.md`) could not take a measurable part
out of the remaining 168 ms over CookieYes on the React fixture without
breaking a constraint (banner no later than ~1,080 ms, Accept
consent-effective ≤ 565 ms). Same-session mobile numbers:

| | canary | branch `267563fa4` | final `ecb4bed8d` | CookieYes |
| --- | ---: | ---: | ---: | ---: |
| LCP Δ (15 pairs) | +608 | +276 (208–312) | +292 (278–316) | +120 |
| banner.visible | 1,285 | 1,097 | 1,105 | 1,068 |
| accept consent-effective | 31 | 564 | 565 | 20 |

- Taking c15t off the hero's critical path starts the hero 222 ms earlier
  but LCP stays at +232 because the same bytes then share the link with the
  hero; the banner moves to 1,227. Running c15t's code costs ~32 ms; the
  rest is bytes.
- A +100 ms bound exists only with a modified fixture (page first, preload
  c15t chunks when the inline `/init` answers). Parked on
  `kaylee/react-lcp-gap-lazy-shell-wip`.
- Byte diet (`kaylee/react-lcp-gap-full-diet`): −5.8 KB, +248 ms, but
  consent-effective 599 ms because the moved bytes are engine code an early
  Accept now has to fetch. Only the CSS split (−1.6 KB, ~8 ms) is on the
  final head.
- Static banner in `index.html` not prototyped: Accept-before-hero would
  need banner code plus engine (~70 KB) on the shared link.

Conclusion for React: ship `267563fa4` (+ the CSS split commit if wanted).
Further gains on the client-rendered fixture need a smaller banner/policy
bundle, not a different schedule.

## Final shipping recommendation (2026-11-03)

1. Next.js: `kaylee/defer-consent-engine-default` + `kaylee/defer-engine-lcp-fixes`
   (`t3/98c1f078`, five commits) + `kaylee/split-first-paint-css`.
   Mobile +56 vs CookieYes +176; banner at ~250 ms; desktop +28.
   Cost: fresh visitor Accept-first consent-effective ~0.9 s on the 200 KB/s
   profile; scroll-first 91 ms.
2. React: `kaylee/react-mobile-lcp-banner-shell` (`267563fa4`), optionally
   `417845321` CSS split. Mobile +280 vs CookieYes +112, tied second with
   Cookie Control; banner at CookieYes's time. Cost: Accept-first
   consent-effective ~0.57 s.
3. Drop `kaylee/eager-graph-lcp-trims`, `kaylee/lcp-defer-banner-client-js`,
   `kaylee/react-lcp-gap-full-diet`, `kaylee/react-lcp-gap-lazy-shell-wip`.
4. Open items: `withdraw` CookieBench failure on canary; learned preload
   depends on localStorage and is untested on webpack; IAB roots take the
   eager plan (by design); React 18 / hydration path of the client provider
   untested.

### Update 2026-11-03 (round 4): slim commit path (`reports/commit-path.md`)

User bar: nothing from the tap over 1,000 ms on mobile. Lane `commit-path`
split the engine so a tap before the engine loads a ~10 KB commit chunk
(save record, permissions, callbacks, plain scripts, storage, queued backend
save); the full engine follows and attaches without re-saving.

Next.js mobile: canary `c35b112b7` / base `16b0eac46` / candidate `fd020fd7c`

| Measure | canary | base | candidate |
| --- | ---: | ---: | ---: |
| load LCP Δ | +400 | +48 | +64 (52–72) |
| banner.visible | 274 | 246 | 250 |
| accept consent-effective / scripts-complete | 59 / 239 | 915 / 1,331 | 324 / 327 |
| reject / reject-keyboard consent-effective | 42 / 36 | 916 / 875 | 300 / 308 |
| preferences: banner hidden / dialog visible | 39 / 454 | 888 / 1,336 | 38 / 644 |
| Accept at 1.0 s (pre-hydration): consent / last script after tap | 1,098 / 1,493 | 1,543 / 1,942 | 870 / 1,041 |
| Accept at 2.5 s: consent / last script after tap | 102 / 296 | 953 / 1,366 | 378 / 379 |
| Scroll 1.8 s then Accept 2.8 s: consent / last script | 100 / 281 | 95 / 306 | 96 / 318 |
| Returning warm / cold: first gated script | 664 / 2,429 | 836 / 2,559 | 780 / 2,681 |

React mobile: base `267563fa4` / candidate `ca5fa8eeb`: LCP +276 → +288,
banner 1,091 → 1,099, accept consent-effective / scripts-complete
568 / 994 → 266 / 357, returning 1,005 → 1,004.

Bars missed: cold returning Next.js +122 ms vs base (first-load shell grew
2 KB; fix is to move tap routing and early dialog out of the shell, not
done); Accept before hydration last script 1,041 (41 over; canary 1,493);
Customize dialog 644 (under 1,000, over the 500 target). Every CookieBench
sample in every scenario is under 1,000 ms from the tap.

Branches: `kaylee/deferred-commit-path` (11 commits on `16b0eac46`, docs +
tegami) and `kaylee/react-deferred-commit-path` (merge of the Next.js
branch into `267563fa4`; carries defer-fix's five commits). Risks: no
`onSurfaceShown` for a banner tapped before the engine; backend save
replayed without journey; React sends a second `/init` after a commit;
Accept preloads allowed scripts ~300 ms before the record is stored;
`defer.test.tsx` fails 2 tests only in parallel nextjs runs (cause unknown).

### Update 2026-11-03 (round 6a): React static banner shell (`reports/react-static-shell.md`)

Branch `kaylee/react-static-shell` (`b81ae23dc` measured, head `e03846052`)
on `9c16ae024`. `consentManifest()` renders the stock banner at build time
into `index.html` (hidden; revealed by the inline `/init` prefetch when the
answer matches the build's policy, removed at once when a choice cookie
exists), with the three banner sheets inline and the early-tap script. React
takes over the static DOM in the same frame. Default on; `staticBanner: false`.

Clean session, mobile, load ≤ 4.9:

| | CookieYes | commit path | static shell |
| --- | ---: | ---: | ---: |
| LCP Δ | +124 (104–128) | +280 (268–292) | +252 (248–264) |
| FCP | 788 | 1,020 | 496 |
| banner.visible | 1,057 | 1,074 | 473 |
| accept consent-effective / scripts-complete | 16 / 185 | 264 / 353 | 267 / 356 |
| returning first gated script | — | 996 | 999 |

Desktop: head +16, banner 230; CookieYes −4, banner 351. Bytes before hero
net +577 B (HTML +7.3 KB, chunk −6.7 KB). Risks: non-stock banners flash to
the custom one at takeover; build-time `/manifest` fetch; two inline scripts
and three inline styles for CSP. Next lever named: with the banner static,
the React banner and stand-in could defer after the hero like Next.js
(most of the remaining 36 KB before the hero).

## Update 2026-11-04 (round 5, remeasure): commit path on a load-gated machine

Source: `reports/remeasure.md`. Same Ryzen 7 2700; every run took the measurement lock and was discarded if 1-minute load exceeded 8 or a sample failed. Mobile `mobile-article-v1`, 15 pairs for `load`, 10 iterations for actions. Medians (max) in ms.

Result: every commit-path median reproduces within 18 ms of the commit-path lane. The one real change is the cold returning-visitor gap to canary, +252 → +143.

### Next.js

| Arm | load LCP Δ (95% CI) | banner.visible | accept consent / scripts | reject | reject-keyboard | preferences visible | save consent / scripts | returning first script |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| canary `c35b112b7` | +404 (396–412) | 247 | 40 (55) / 261 (264) | 41 (64) | 29 (31) | 454 (466) | 33 (130) / 182 (264) | 682 (925) |
| commit path `fd020fd7c` | +64 (56–72) | 242 | 317 (343) / 320 (345) | 306 (334) | 299 (309) | 626 (644) | 52 (82) / 217 (242) | 734 (1,735) |
| CookieYes | +184 (172–192) | 2,377 | 19 (24) / 188 (195) | — | — | — | — | — |

Desktop load: canary +28 (16–36), commit path +24 (12–36).

Probes (5 reps, consent / last gated script after tap): Accept at 1.0 s canary 1,054 / 1,422, commit path 863 / 1,035 (all 5 reps over 1,000 on the last script). Accept at 2.5 s rerun: canary 103 / 292, commit path 374 / 376. Scroll 1.8 s then Accept: canary 105 / 287, commit path 93 / 307.

### React

| Arm | load LCP Δ (95% CI) | banner.visible | accept consent / scripts | returning first script | desktop LCP Δ |
| --- | ---: | ---: | ---: | ---: | ---: |
| canary `c35b112b7` | +588 (576–596) | 1,255 | 28 (79) / 370 (396) | 757 (870) | +28 (24–36) |
| base `267563fa4` (deferred engine) | +276 (248–288) | 1,064 | 570 (728) / **1,001 (1,190)** | 1,013 (1,471) | — |
| commit path `ca5fa8eeb` | +292 (284–296) | 1,081 | 266 (272) / 357 (361) | 1,005 (1,095) | +16 (4–28) |
| CookieYes | +116 (104–136) | 1,073 | 16 (24) / 185 (192) | — | — |

Open from this lane: React returning-visitor first gated script is 1,005 ms from navigation on both deferred arms against 757 on canary (hydration-bound, not a tap). Accept-at-1.0 s on Next.js still crosses 1,000 ms on the commit path; the instant-commit lane targets exactly that.

## Update 2026-11-04 (round 7, nuxt): deferred engine for the Nuxt module

Source: `reports/nuxt.md`. Branch `kaylee/nuxt-deferred-engine` `b02c13061` on `kaylee/react-deferred-commit-path`, not pushed. Same machine, mobile `mobile-article-v1`, gated runs only (control FCP ≤ 400, load ≤ 8, no failed sample). Canary `load` was measured six times across the night, all between +1,232 and +1,256.

| Measure | canary `c35b112b7` | head `b02c13061` | CookieYes |
| --- | ---: | ---: | ---: |
| load LCP Δ (95% CI) | +1,244 (1,232–1,244) | **+396 (384–404)** | +176 (168–188) |
| banner.visible | 262 | **245** | 1,250 |
| bytes before hero over control (5-pair waterfall) | +124.7 KB | +48.7 KB | n/a (TLS host) |
| accept consent / scripts, median (max) | 36 (91) / 254 (302) | **22 (28) / 193 (206)** | 15 (35) / 184 (202) |
| reject consent | 30 (90) | **17 (22)** | 16 (27) |
| preferences dialog visible | 532 (548) | 799 (831) | not in config |
| save consent / scripts | 32 (56) / 183 (196) | 31 (96) / **407 (451)** | unsupported |
| returning-accepted first script / LCP | 435 / 476 | 430 / 322 | — |
| desktop LCP Δ | +124 | +68 (56–76) | +4 |

Targets: banner met; tap columns within 7–9 ms of CookieYes but not under; nothing over 1,000 ms (largest 831, preferences); **LCP not met**, 220 ms gap. Slope here is 7.9 ms/KB before the hero, so CookieYes parity needs ≈26 KB fewer. What remains before the hero on head: 10.4 KB HTML (5.8 KB inline component CSS Nuxt emits per component), 8.6 KB script loader the fixture's own `consent.vue` imports statically, 4 KB instant-commit path, ≈5 KB Vue/Nuxt runtime the baseline lacks, 1.8 KB `policy-actions` prefetch, ≈4 KB client tokens regeneration and experiment theming. Easy trims total ≈6 KB (≈50 ms); the rest needs a smaller Nuxt inline sheet and a lazily loaded page script loader.

Regressions vs canary to fix before shipping: Customize dialog 799 vs 532 (dialog chunks arrive with the engine group); save scripts-complete 407 vs 183 (engine group shares the link with the allowed scripts). Both are the commit-path pattern Next.js fixed with instant commit; the branch already carries the core half of instant commit (`822bf709d`, `9766a0fd2`).

Tests: `packages/vue` 673 pass (+14 new), core surface-actions 251 pass, `nuxt typecheck` passes; `vue-tsc` has one pre-existing error in `src/vite.ts` from the base.

## Update 2026-11-04 (round 6b, instant-commit): commit a banner tap in the tap's own task

Source: `reports/instant-commit.md`. Branch `kaylee/instant-commit` `ad86f4805` (measured build `aa15552b1`, later commits docs and test files) on `kaylee/react-deferred-commit-path`, not pushed. Final session 06:17–06:31, every run passed its first attempt under the discard rules (load ≤ 8, no failed sample, control FCP under limit). Medians (max) in ms.

### Next.js

| Measure | CookieYes | commit path `fd020fd7c` | **instant commit** |
| --- | ---: | ---: | ---: |
| load LCP Δ (95% CI) | +180 (168–184) | +68 (56–68) | **+64 (56–64)** |
| banner.visible | 2,373 | 239 | **238** |
| accept consent / scripts | 19 (23) / 187 (192) | 315 (339) / 317 (342) | **25 (30) / 191 (198)** |
| reject consent | 19 (22) | 305 (328) | **21 (26)** |
| reject-keyboard consent | not in config | 310 (323) | **13 (20)** |
| save consent / scripts | unsupported | 53 (61) / 214 (226) | **27 (43) / 196 (204)** |
| preferences dialog visible | not in config | 613 (634) | 615 (655) |
| returning-accepted first script | not in config | 739 | 742 |

Probes (5 reps, consent / last gated script after tap): Accept at 1.0 s commit path 849 / 1,029, instant commit 575 / **1,119** (over 1,000, 90 ms later than commit path, cause not found). Accept at 2.5 s 368 / 370 → 86 / 256. Scroll then Accept 86 / 298 → 88 / 304.

### React

| Measure | CookieYes | commit path `ca5fa8eeb` | **instant commit** |
| --- | ---: | ---: | ---: |
| load LCP Δ (95% CI) | +108 (104–124) | +288 (284–296) | **+300 (284–312)** |
| banner.visible | 1,051 | 1,079 | 1,092 |
| accept consent / scripts | 17 (27) / 185 (193) | 265 (271) / 356 (362) | **31 (37) / 195 (217)** |
| returning-accepted first script | not in config | 997 | 1,006 |

Bytes (brotli): shell +2,756 B on Next.js, +1,800 B on React (budget 3 KB); engine and commit groups both shrank. Storage write and callbacks still happen in the commit chunk a few hundred ms after the tap; consent mode update unchanged (lives in integrations scripts). Remaining gap to CookieYes: c15t's click handler lands ~5 ms later and CookieBench reads state on the next animation frame, so c15t usually lands one frame later.

Lane verdict on the "≤ CookieYes" bar: **not met by 6–14 ms on consent, 4–10 ms on scripts**; ties within run-to-run spread on Next.js scripts. 1,000 ms limit met in every CookieBench scenario; the Accept-at-1.0 s probe's last script is the one exception.

Tests: core 3,123, react 1,113 across batches, nextjs 396, check-types 18/18 pass. `test:scripts` has 2 pre-existing umbrella-export failures (base missing 5 entries, now 6; `bun run generate:umbrella` fixes).

## Shipping picture after rounds 5–7

| Fixture | Best head | LCP Δ vs CookieYes | banner vs CookieYes | accept consent / scripts vs CookieYes | over 1,000 ms? |
| --- | --- | ---: | ---: | ---: | --- |
| Next.js | instant commit | +64 vs +180 | 238 vs 2,373 | 25 / 191 vs 19 / 187 | no (probe Accept-at-1.0 s last script 1,119) |
| React | instant commit (+ static shell not yet merged) | +300 vs +108 (static shell alone +252) | 1,092 vs 1,051 (static shell 473) | 31 / 195 vs 17 / 185 | no |
| Nuxt | deferred engine | +396 vs +176 | 245 vs 1,250 | 22 / 193 vs 15 / 184 | no (max 831) |

Next: merge `kaylee/instant-commit` + `kaylee/react-static-shell`, measure the combined React head; port instant commit's dialog/save path to Nuxt (Customize 799, save scripts 407); React LCP lever "defer banner + stand-in after hero"; Nuxt inline-CSS diet.
