# Lane `cookieyes-ideas`: CookieYes techniques mapped onto c15t's mobile LCP cost

Read-only research. I ran no benchmarks and changed nothing in the c15t repo
or in CookieBench. Every number below comes from an existing artifact. The
command or file for each one is listed.

## 0. Summary

- CookieYes's hosted script did not get its LCP cost down by loading late.
  Every one of its 9 requests starts between 1.40 s and 2.61 s, while the hero
  image is still downloading (the image finishes at about 3.4–3.6 s). All of
  its ~31 KB competes with the image, and 31 KB × ~5.8 ms/KB ≈ the observed
  +180 ms. On this fixture, loading late only cost them banner visibility
  (2.27 s). The whole saving comes from loading little.
- The only lateness that helps is *after the priority image finishes*. c15t
  already has that primitive (`AFTER_PRIORITY_IMAGES` in
  `packages/core/src/runtime/script-server-start.ts`, after-`load` idle
  warming in `packages/react/src/chunk-warming.ts`). It already ships the
  piece that keeps clicks working before hydration
  (`EARLY_CONSENT_TAP_SCRIPT`, present in the fixture HTML today).
- c15t's pre-image cost on the fixture is about 81 KB: +11.9 KB of HTML,
  +64.1 KB of eager JS, and a 5.0 KB chunk at hydration. 81 KB × 5 ms ≈ 405 ms;
  observed +400 ms. The 23 KB that loads after `load` costs nothing.
- CookieYes's own Next.js SDK (not what CookieBench measured) would put about
  18 KB before the image: 11.9 KB brotli JS, 1.5 KB inline critical CSS, about
  1.5 KB of markup, and a 3.4 KB deferred sheet. Predicted LCP cost is about
  90 ms. It beats c15t on bandwidth by about 60 KB.
- Proposals 1–5 below are incremental trims. Together they remove about
  25–30 KB before the image (about 120–145 ms), which leaves c15t near
  255–280 ms. That is still above CookieYes's 180 ms. Only proposal 6 (load
  the engine after priority images, with the existing early-tap script
  covering clicks) gets c15t under 180 ms without moving the banner off FCP.

## 1. What I measured and where it came from

| Source | What | Command / path |
| --- | --- | --- |
| CookieBench Oct 15 rerun, mobile | Per-request start time and transfer bytes for the c15t, control and CookieYes arms (15 pairs each) | `results/2026-10-15-matrix-rerun/mobile/{nextjs-load,nextjs-cookie-yes-load}/attempt-001/envelope.json`, parsed with `/home/kaylee/.t3/scratch/lcp-fleet/cookieyes-ideas/waterfall.py` and an inline aggregator (medians over 15 samples) |
| c15t fixture HTML (canary build, saved by the `payload` lane) | Brotli-11 attribution of the HTML delta to `<style>`, flight payload and markup | `/home/kaylee/.t3/scratch/lcp-fleet/payload/{c15t,baseline}.html` |
| c15t eager chunks (canary build, `payload` lane, with source maps) | Brotli-11 bytes per source module, scaled from each module's share of raw chunk text | `cookieyes-ideas/attribute.py` run on `payload/cb/benchmarks/with-c15t-nextjs/.next/static/chunks/{7d7c7d0cb5ee5b3e,a1d5871937d2c8aa,cb3dd297d91250b2}.js` |
| c15t 3.0.0 from npm | Confirmed the first-paint sheet and the Next deferred-sheet alias are identical in 3.0.0 | `curl` of `@c15t/{ui,nextjs,react}-3.0.0.tgz` into `cookieyes-ideas/npm300/` |
| CookieYes SDK | Size report (gzip-9 and brotli-11 deltas over an empty Next 16.3 app, measured 2026-10-30) | `/home/kaylee/.t3/scratch/cookieyes/tools/size/size-report.json`, `budgets.json` |

The envelope records `startedAt` per request but no end time, so the
"before the hero image" column below is inferred from start time against the
LCP time (3,824 ms median). Every request that started at about 211 ms or
1.8 s overlapped the image download.

Fixture protocol: both the c15t arm (`http://127.0.0.1:4322`) and the
CookieYes arm (`https://…:4622`, Node `https`) are HTTP/1.1. Chrome allows 6
connections per host. CookieYes's requests go to a third-party host with its
own connection pool, so they never take a first-party socket.

## 2. Waterfalls

### c15t arm (3.0.0), medians of 15 visits

LCP median 3,824 ms. Control LCP 3,424 ms. banner.visible about 243–263 ms.

| Start (ms) | Request | Transfer (B) | Over control | Overlaps hero image? |
| ---: | --- | ---: | ---: | --- |
| 0 | document | 15,694 | +11,889 (control 3,805) | yes (delays discovery of everything below) |
| 211 | `1d208d68…` Next runtime | 5,711 | 0 | yes |
| 211 | `cee7a8a1…` React/Next | 76,553 | 0 | yes |
| 211 | `2014111e…` | 19,426 | 0 | yes |
| 211 | `turbopack-…` | 3,922 | 0 | yes |
| 211 | `040ff58a…` | 6,533 | 0 | yes |
| 211 | `1d4d246e…` c15t | 6,624 | +6,624 (replaces control's 1,148 B `5a7ba7f2…`) | yes |
| 211 | `0566232c…` c15t | 40,506 | +40,506 | yes |
| 211 | `0166fbde…` c15t | 18,167 | +18,167 | yes |
| 230 | `courtyard.png` (LCP) | 493,920 | 0 (starts +48 ms later than control) | — |
| 1,802 | `reading-list.js` (page) | 916 | 0 (starts +406 ms later than control) | yes |
| 1,803 | `3f6733d5…` c15t, loaded at mount | 5,015 | +5,015 | yes |
| 1,963 | `reading-list.json` (page) | 1,142 | 0 | yes |
| 3,822 | `65dd40f2…` c15t, warmed after `load` | 7,962 | +7,962 | no |
| 3,823 | `221e031a…` c15t, warmed after `load` | 10,949 | +10,949 | no |
| 6,822 | `ec9ca0c5…` c15t | 4,066 | +4,066 | no |

Over control: +81,053 B before the image ends, +22,977 B after it, total
+104,030 B (CookieBench reported +104 KB). The host page's own hydration
work (`reading-list.js`) also starts 406 ms later, so c15t delays the
article's hydration by about the same amount it delays LCP.

In the canary build the 5 KB mount-time chunk matches the script-loader
chunk (`bc2d8499…`, 17,722 B raw / 5,619 B br, contains `__c15tAdopted`). The
fixture's `Probe` calls `useScriptLoader`, and
`packages/react/src/module-hooks/script-loader.ts` imports
`@c15t/core/modules/script-loader` in a mount effect whatever the consent
state. This match is by marker and size; I did not trace the 3.0.0 chunk
hash.

### CookieYes hosted arm, one CMP visit (sample 0)

LCP 3,616 ms (paired control 3,432). banner.visible 2,277 ms.

| Start (ms) | Request | Transfer (B) |
| ---: | --- | ---: |
| 0 | document (+ inline bootstrap) | 5,147 (+1,347 over control) |
| 180–181 | same 6 Next chunks + `courtyard.png` as control | — |
| 1,395 | `reading-list.js` (hydration done) | 916 |
| 1,401 | `cdn-cookieyes.com/…/script.js` (injected after hydration) | 9,000 |
| 1,714 | `log.cookieyes.com/api/v1/log` | 220 |
| 1,716 | `banner.js` | 12,415 |
| 2,008 | `translations/…json` | 1,153 |
| 2,258 | `revisit.svg` | 1,316 |
| 2,259 | `config/…json` | 2,106 |
| 2,441 | `audit-table/…json` | 996 |
| 2,609 | `close.svg`, `poweredbtcky.svg` | 851 + 1,637 |

Total ≈ 31,041 B and 9 requests, all started before the image finished.

## 3. Does "load late" or "load little" explain CookieYes's 180 ms?

| Factor | CookieYes hosted | Effect on LCP here |
| --- | --- | --- |
| Starts after hydration (1.4 s) | yes | None. The image is still downloading until about 3.5 s, so every byte still competes. |
| Few bytes (31 KB) | yes | All of the 180 ms (31 KB × 5.8 ms/KB). |
| Separate origin | yes | Does not take a first-party HTTP/1.1 socket. Bandwidth is still shared. |
| Banner at 2.27 s | consequence of loading late | This is the cost c15t must not pay. |

So the useful lesson from CookieYes is "load little". "Late" only helps once
it means after the priority image has finished. c15t already uses that rule
for vendor scripts.

## 4. CookieYes SDK compared with c15t, design by design

### 4.1 Next adapter (`sdk/nextjs`)

| Technique | CookieYes file | What it does | c15t today |
| --- | --- | --- | --- |
| Inline critical CSS | `styles.tsx` (`CookieYesStyles`), `sdk/ui/src/styles/critical.css` | Banner-only subset of the full sheet, 6,848 B raw / 1,808 gz / 1,527 br, inlined in `<head>`, kept ≤ 2 KB gz by `critical-css.test.ts` | Already inlines a sheet (`SurfaceStyles` hoists `<style href precedence="c15t">`, `packages/react/src/components/shared/surface-styles.tsx`), but the sheet is 69,195 B raw / 8,872 gz / ~7,700 br and covers the banner, trigger and ConsentGate with all 285 tokens. |
| CSP hash for the inline style | `CRITICAL_CSS_HASH` | Static per release, so a strict `style-src` needs no nonce | Nonce only. With a nonce, React 19 renders the style next to the surface instead of hoisting it. No byte effect. |
| Deferred full sheet with `media="print"`, switched to `all` by already-shipping code | `styles.tsx`, `sdk/ui/src/styles/deferred-stylesheets.ts` | Extra request at parse time, low priority | c15t is already better: dialog CSS rides inside the lazy dialog chunk (`DIALOG_SHEETS`), and the browser bundle gets `first-paint-deferred.js` (142 B) through the `withConsentManifest` alias (`packages/nextjs/src/build.ts`), so the first-paint text ships once. Nothing to copy. On HTTP/1.1 the print-media link would compete with the image anyway. |
| Self-compressing Route Handler | `styles-route.ts` | Works around `next start` not compressing Route Handler responses | Not needed for CSS (it is in static chunks). Possibly relevant to c15t's own JSON route handlers on self-hosted `next start`; I found compression only in `core/src/server/consent-proxy.ts`. Not on the fixture's path: the fixture made no consent route request. |
| SSR banner, no banner for a decided visitor | `server.ts` (`getServerConsent`), `react/.../CookieYesProvider.tsx` | | Same in c15t (`resolveConsent`, server-start scripts). |
| Client JS | one `"use client"` barrel re-exporting `@cookieyes/react` | 13,535 B gz / 11,923 B br initial over an empty Next app (`size-report.json`, `nextjs` fixture, banner and preferences) | About 64 KB br eager on the fixture. |
| Lazy subsystems | `core/src/integrations-lazy.ts` (integration runner, 1.2 KB gz), `ui/src/styles/load-theme-runtime.ts` (custom theme maths only when `theme` is set) | | c15t lazy-loads more subsystems than CookieYes does (dialog, writer, script loader, network blocker, offline mode, manifest transport, IAB), but the eager graph still carries several opt-in pieces (see proposal 4). |
| Vanilla first-paint shell | `sdk/vanilla/src/shell.ts` (`renderShell`), `morph.ts`, `widget.ts` (`data-cy-entered`) | Static banner HTML plus critical CSS paints with no script. `start()` replaces it in the same task without re-running the entry animation. | The model for proposal 6. |

### 4.2 UI layer (`sdk/ui`)

| | CookieYes | c15t first-paint sheet |
| --- | --- | --- |
| Inline CSS size | 6,848 raw / 1,527 br | 69,195 raw / ~7,700 br |
| Tokens | 12 `--cy-*` vars in `:root` | 285 vars, 13,192 B raw in `:root` |
| Dark mode | `@media (prefers-color-scheme: dark)`, about 1 KB raw | `.dark` class rules, 8,200 B raw |
| Entry animation | opacity-only 0.2 s fade; `data-cy-entered` stops a replay on re-parent | `@starting-style`, reduced-motion block 3,381 B raw |
| Surfaces in the inline sheet | banner only | banner, trigger (3,776), toolbar (4,102), branding (5,653), ConsentGate placeholder (721) |
| Guard tests | `critical-css.test.ts` (subset byte-identical, ≤ 2 KB gz), `styles-parity.test.ts` (every `var()` declared), `banner-footprint.test.ts` | `design-token-literals.test.ts` |

### 4.3 Engine (`sdk/core`, about 7.8 KB gz initial)

| Area | CookieYes | c15t | Can c15t drop it? | Can c15t defer it past the image, or move it to the server? |
| --- | --- | --- | --- | --- |
| Regulation model | 3 literals (`GDPR`, `CCPA`, `DEFAULT`), geo-header lookup (`region.ts`) | Policy manifest, presets, schema resolution (`@c15t/schema/shared`, about 3.4 KB br eager) | No | Yes, when the server sent `initialPolicyResolution` (it does on the fixture) |
| Cookie codec | flat `key:value,…` string, about 1 KB (`cookie.ts`) | Record codec, storage, mount, hydrate (about 6.9 KB br eager) | No (audit records, fingerprints) | The read path, when the server sent `initialRecords` |
| Consent records | sent only if a backend is set (`record-queue.ts`) | consent-record evaluate/validate/normalize (about 3.4 KB br), save outbox, hosted records | No | Yes, until the first save |
| IAB TCF | none | already out of the initial graph (Sept report) | — | already done |
| Vendors, experiments | none | `libs/vendors.js` 1.8 KB, `libs/experiment.js` + storage 1.3 KB br eager | No | Yes, when not configured |
| GPC | `readGpc` | small | No | — |
| Translations | English inline in core (3.8 KB raw) | English in JS (`@c15t/translations/4649.js`, 1.8 KB br) **and** in the flight state (`initialTranslations`, 2,169 B raw) | No | Yes: the client copy duplicates the server copy |

### 4.4 Their `matrix/` and published numbers

`matrix/` is a peer-compatibility matrix (Next 14–16 × React 18–19 install,
typecheck, SSR fetch, jsdom). It has no performance data. `matrix-results.json`
records pass/fail only. Their size figures come from `tools/size/measure.mjs`:
the gzip-9 delta of client JS against an empty Next 16.3 app, CSS reported
separately. Published values: core 7,796; banner only 11,869; Next adapter
13,535; CSS `styles.css` 3,923 gz and `critical.css` 1,808 gz. Their
first-paint note (`contributing/design/banner-first-paint.md`) reports FCP
about 232 ms and click → visible response 10–13 ms on Pixel 5, CPU ×4,
1.6 Mbps / 150 ms, from a local harness that is not in their repo.

Predicted bytes before the hero image on the CookieBench fixture (not
measured; CookieBench measured the hosted script):

| | JS br | Inline CSS br | HTML markup/state br | Other | Total | Predicted LCP cost at 5 ms/KB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| CookieYes Next SDK | 11.9 | 1.5 | ~1.5 (est.) | 3.4 deferred sheet (+1 request, competes on HTTP/1.1) | ~18 KB | ~90 ms |
| CookieYes hosted (measured) | — | — | 1.3 | 29.7 third-party | 31 KB | 180 ms observed |
| c15t 3.0.0 (measured) | 64.1 + 5.0 | ~7.7 | ~2.6 (state + markup) | — | 81 KB | 400 ms observed |

## 5. Where c15t's pre-image bytes go (canary build, brotli-11)

HTML delta (`c15t.html` against `baseline.html`, brotli-11): +10,350 B.

| Part | Raw | Brotli (approx.) |
| --- | ---: | ---: |
| First-paint `<style>` | 69,195 | ~7,730 |
| Flight state for `ConsentRoot` (`6:{initialRecords,…}`) | 3,871 | ~1,200 (2,169 raw of it is English translations) |
| Banner markup and Suspense scaffolding | ~6,000 | ~1,400 |

Eager c15t JS: 67,643 B br in 3 chunks. Largest areas:

| Area | Brotli |
| --- | ---: |
| `@c15t/react/components` (banner, shared UI, primitives) | 8,193 |
| `@c15t/core/modules/persistence` (record codec 2,089, storage 1,958, mount 1,806, hydrate 522) | 7,018 |
| `@c15t/core/kernel/*` (choice 2,643, init-lifecycle 1,683, save-outbox 1,466, patch 1,329, snapshot 1,294, …) | ~12,000 |
| `@c15t/schema/shared` (policy-resolution-wire 1,791, rule invariants 890) | 3,377 |
| `@c15t/ui/utils` (dom 1,447, theme-slots 964) | 2,896 |
| `@c15t/core/libs/vendors.js` | 1,833 |
| `@c15t/translations` English | 1,824 |
| `@c15t/react/provider.js` + hooks | ~3,700 |
| `@c15t/core/consent-record/*` | ~3,400 |
| `@c15t/core/libs/experiment*.js` | 1,346 |
| `@c15t/core/modules/network-blocker/hold.js` | 849 |
| `@c15t/react/module-hooks/iframe-blocker.js` | 490 |
| transports (`hosted-records`, `subject-body`, `init-output`) | 1,318 |

## 6. Proposals, ranked by expected ms saved per unit of risk

The estimates use the fixture's ~5 ms per KB of brotli bytes before the hero
image. Proposals 4–6 overlap, so their savings do not add up.

### 1. Load the script-loader chunk only when something can run

- **CookieYes:** nothing loads before a category is granted. The integration
  runner is behind `import()` and only runs when configured.
- **c15t files:** `packages/react/src/module-hooks/script-loader.ts`, which
  imports the module in a mount effect. Wait until the snapshot grants a
  category that some `scripts` entry needs, or until `AFTER_PRIORITY_IMAGES`
  fires, whichever comes first. For returning visitors the inline server start
  already inserts the tags, and the loader adopts them later.
- **Saved:** 5.0 KB and 1 request before the image. About 25 ms.
- **banner.visible / clicks:** no change. After Accept, gated scripts wait one
  extra chunk fetch (~150 ms latency plus 5 KB) if the click lands before the
  image finishes.
- **Risk:** low. Watch for a returning visitor on a page without server start
  (static export): there the loader must start eagerly when consent is granted.
- **First experiment:** in the fixture copy with a canary tarball, check that
  the `__c15tAdopted` chunk is absent before `load` on a fresh visit, and that
  `scripts.executions` and `action.scripts-complete` still pass in the accept
  scenario.

### 2. Banner-only critical sheet; give the trigger and ConsentGate their own sheets

- **CookieYes:** `critical.css` is a generated exact subset of the full
  sheet, only the rules the banner needs to paint, guarded at ≤ 2 KB gz. It
  keeps dark mode through `prefers-color-scheme`.
- **c15t files:** `packages/ui/scripts/generate-css-entrypoints.ts` (sheet
  generation), `@c15t/ui/styles/sheets/first-paint`,
  `packages/react/src/components/shared/first-paint-sheets.ts`. Split it into
  `banner` (tokens the banner uses, banner, button, branding if shown, reduced
  motion) and `trigger` / `consent-gate` sheets that those surfaces render
  themselves. Drop the dialog-only tokens from the inline `:root` block; the
  dialog sheet can declare them. The sheet `id` scheme and
  `first-paint-deferred` alias in `packages/nextjs/src/build.ts` need the same
  split.
- **Saved:** inline sheet from ~7.7 KB br to an estimated 2.5–3.5 KB br, so
  4–5 KB off the first response. About 20–25 ms. It also moves Next's
  `<script src>` tags and the hero image earlier in the HTML (the image
  request currently starts 48 ms later than in control). Returning visitors,
  who get only the trigger, would stop paying 7.7 KB per HTML response.
- **banner.visible / clicks:** no change if the subset is right. If a rule is
  missing, the banner paints unstyled until the client inserts the rest.
  CookieYes's history shows this exact failure (commit `8a9ea78`: tokens lost,
  banner transparent until hydration).
- **Risk:** low to medium. Copy CookieYes's guards: a test that the banner
  sheet is an exact subset of `styles.css`, a test that every `var()` used has
  a declaration, and a byte ceiling.
- **First experiment:** generate a banner-only subset by hand (rules matching
  `.c15t-ui-banner*`, `.c15t-ui-button*`, the `:root` vars those rules
  reference), swap it into a fixture copy, then compare HTML brotli bytes and
  screenshot the banner with JS disabled. No LCP run is needed to prove the
  bytes.

### 3. Do not ship English copy in the client when the server state carries it

- **c15t files:** `packages/core/src/translations/index.ts` (static import of
  `@c15t/translations` English), the provider's use of `initialTranslations`.
  Load English lazily only in client-only mode, or when the server state has
  no translations.
- **CookieYes:** does not do this (English sits in core). This one is
  c15t-specific: the copy is shipped twice.
- **Saved:** 1.8 KB br. About 9 ms.
- **Effect:** none on banner or clicks.
- **Risk:** low. A language switch before the engine loads needs the lazy
  path.
- **First experiment:** grep the eager chunks for `'Accept All'` after the
  change. Expect 0 occurrences, against 2 now (one in the JS, one in the
  flight state).

### 4. Keep opt-in subsystems out of the eager graph unless configured

- **CookieYes:** the integration runner sits behind one `import()` that only
  core knows about. The theme runtime loads only when `theme` is set. Records
  are created only when a backend is set. Iframe blocking is an explicit call.
- **c15t files and bytes in the eager graph that the fixture does not use:**
  `core/src/libs/vendors.js` (1.8 KB; no vendors configured),
  `core/src/libs/experiment.js` + `experiment-storage.js` (1.3 KB; no
  experiment), `core/src/modules/network-blocker/hold.js` (0.85 KB; no
  network blocker), `react/src/module-hooks/iframe-blocker.js` (0.5 KB),
  `core/src/kernel/save-outbox` (1.5 KB, needed at first save),
  transports `hosted-records` / `subject-body` / `init-output` (1.3 KB, needed
  at first save), `modules/revocation-reload.js` (0.3 KB).
- **Saved:** 5–7.5 KB br. About 25–37 ms.
- **Effect:** none on banner.visible. The first save loads about 3 KB more if
  it comes before idle warming. Let warming start them after `load`.
- **Risk:** medium. Some of these exist eagerly for ordering guarantees.
  `network-blocker/hold` must be installed before any request it holds, so it
  can only be skipped when it is not configured, never deferred.
- **First experiment:** on canary, build the fixture with each module
  replaced by an `import()` stub one at a time, and re-run `attribute.py`
  for byte deltas. Then run the reject, accept and withdraw correctness
  scenarios.

### 5. Trust the server-resolved state: defer the record read path and policy wire validation

- **CookieYes:** no schema validation at all, and its region resolution is
  shared code that runs the same on server and client.
- **c15t files:** `core/src/modules/persistence/{record-codec,record-storage,mount,hydrate}`,
  `schema/shared/policy-resolution-wire.js`,
  `schema/shared/policy-rule-invariants.js`, and the provider path that
  applies `initialRecords` / `initialPolicyResolution`
  (`core/src/runtime/streamed-init.ts`, `provider-runtime.ts`). When the
  server sent decoded records and a resolved policy, apply them as trusted
  data and load the codec and validator after `AFTER_PRIORITY_IMAGES`, on
  first save, or on a storage event.
- **Saved:** 8–10 KB br. About 40–50 ms.
- **Effect:** none on banner.visible. A save before the codec loads waits for
  one chunk (the writer is already lazy, so this adds to an existing wait).
- **Risk:** medium to high. Persistence mount also handles cross-tab sync and
  the localStorage mirror, and validation protects flows where state comes
  from storage or a remote manifest. Keep eager loading in client-only mode.
- **First experiment:** count how many eager modules import
  `record-codec` / `policy-resolution-wire` with `initialRecords` present. A
  Turbopack build with `productionBrowserSourceMaps` plus `attribute.py`
  gives the reachable set. If the codec is needed to *read* the server state,
  the proposal dies.

### 6. Load the consent engine and banner hydration after priority images; the early-tap script covers clicks until then

- **CookieYes:** `@cookieyes/vanilla`'s `renderShell` + `critical.css`
  paints a styled, fixed banner with no script. `start()` replaces the shell
  in one task and marks it `data-cy-entered` so the entry animation does not
  replay. Their hosted script loads everything late. c15t would keep the
  shell at FCP and load late in the useful sense: after the image.
- **c15t files:** `packages/nextjs/src/root.tsx` (`ConsentRoot`),
  `packages/react/src/provider.tsx`, `core/src/surface-actions/early-tap-script.ts`
  (already in the fixture HTML; it queues `accept`/`reject`/`dismiss`/`customize`
  and hides the banner), `core/src/runtime/script-server-start.ts`
  (`AFTER_PRIORITY_IMAGES` to reuse). Shape: the eager client module renders
  the server banner HTML inside a Suspense boundary through
  `React.lazy(() => afterPriorityImages().then(() => import('./full-root')))`.
  The server resolves the lazy import at once. In the browser the boundary
  stays dehydrated and visible, and the early-tap listener (document capture,
  `stopImmediatePropagation`) keeps owning clicks until the runtime replays
  them. A first tap should also start the import right away. Children (the
  host page) must stay outside the lazy boundary, so hooks used by children,
  such as the fixture's `Probe` with `useSnapshot`, need a pre-engine
  snapshot from the server state.
- **Saved:** most of the remaining eager JS, about 50–60 KB br (overlaps
  proposals 1, 4 and 5), plus the host page's hydration is no longer held
  back by ~400 ms. Predicted LCP cost: about 10–12 KB of HTML (6–7 KB with
  proposal 2), so about 35–60 ms against 400 ms now.
- **banner.visible:** unchanged (server HTML + inline CSS).
- **Clicks:** the visual dismissal is immediate (early-tap inserts a hiding
  `<style>`). The consent commit, `consent.resolution`, and gated scripts for
  a new visitor move to engine load: after the image (about 3.4–3.6 s on this
  fixture) or at least 150 ms + 55 KB / 200 KB/s ≈ 430 ms after a tap that
  lands earlier, and longer while the image is still downloading. CookieBench's action scenarios wait
  for the adapter's `ready` before clicking, so measured readiness moves
  later. Returning visitors are unaffected: `script-server-start` already
  inserts granted tags from an inline script before hydration.
- **Risk:** high. Two code paths own consent decisions for a while. Every
  public hook needs a pre-engine fallback. Next/Turbopack must not add the
  lazy chunk to the initial script list. Re-parenting the banner on hydration
  can replay the entry animation (CookieYes documented this failure on slow
  devices). `customize` before the engine loads needs a defined behavior.
- **First experiment (ceiling, cheap):** copy the fixture, and in the copy's
  `serve.ts` hold the responses for the c15t-only chunk URLs until
  `courtyard.png` has finished (or a fixed 3.6 s). Run 5 pairs on the mobile
  profile. Expected if the theory holds: LCP delta about 50–60 ms, banner.visible
  unchanged at about 250 ms, and a tap at 1 s dismisses the banner at once.
  This also delays the whole page's hydration, which a real implementation
  would not, so it gives an LCP ceiling, not a click-latency result. If LCP
  delta stays well above 100 ms, the bandwidth model is wrong and this
  proposal dies.
- **Second experiment (feasibility):** a minimal Next 16 app with a client
  component that renders `React.lazy` inside Suspense during SSR. Check that
  the lazy chunk does not appear in the HTML's `<script src>` list, and that
  the server HTML stays in place until the delayed import resolves.

### Not proposed

| Idea | Why not |
| --- | --- |
| `media="print"` deferred full stylesheet | c15t already defers dialog CSS inside its lazy chunk, with no extra request. On this HTTP/1.1 fixture a print-media link would still compete with the image. |
| Self-compressing styles route | c15t's deferred CSS is in Next static chunks, which Next compresses. |
| Tell Next users not to import `styles.css` | Already the documented default (`docs/frameworks/next/app-router.mdx`). |
| Fewer requests as a goal of its own | Bytes dominate. CookieBench adds 150 ms of latency per request, but requests run in parallel. The 3 eager c15t chunks cost about their bytes. Fewer chunks only matter through HTTP/1.1 socket queueing (the image is the 9th first-party subresource in the c15t arm, against 7th in control), which I could not isolate from this data. |
| CSP hash for the inline sheet | Worth doing for strict-CSP users (React keeps hoisting when no nonce is needed), but saves no bytes. |

## 7. Not verified

- No benchmark was run in this lane. All LCP figures for the proposals are
  predictions from the ~5 ms/KB model, which matched the c15t arm (405
  predicted against 400 observed) and the CookieYes arm (155–180 against 180).
- Request end times are not in the envelope. "Overlaps the hero image" is
  inferred from start time.
- Per-module brotli bytes are proportional estimates (raw share × chunk
  brotli size) from the canary build's source maps, not from 3.0.0. Canary's
  eager c15t total (67.6 KB br at q11) is close to 3.0.0's served 64.1 KB.
- The 5 KB mount-time chunk matches the script loader by marker and size in
  canary. I did not map the 3.0.0 hash `3f6733d5…`.
- The CookieYes SDK on the fixture (about 18 KB, about 90 ms) is a
  prediction from their size report. Their markup size is my estimate.
- Whether Turbopack leaves a `React.lazy` chunk out of the initial script
  list (needed for proposal 6) is untested.
- Proposal 5 assumes the server-provided `initialRecords` /
  `initialPolicyResolution` can be applied without the codec or validator. I
  did not trace the provider code far enough to confirm it.
