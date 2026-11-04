# Lane `tanstack`: c15t on CookieBench's TanStack Start fixture (round 8)

**Status: interim, 2026-11-04 18:20.** Not one CookieBench run has passed
the gate yet. The 1-minute load average stayed between 17 and 170 from
10:06 to 18:20 because of other agents' monorepo test suites (vitest, tsc
and about 27 Docker containers, including ClickHouse). Every measured run
went over the brief's load limit of 8, and the astro, script and sveltekit
lanes discarded theirs for the same reason. The queue is still running and
will replace each row below once a run passes the gate. Byte counts are
reliable now: they barely depend on CPU, and they match across discarded
runs to within a few bytes. Every timing below comes from a discarded run
and is marked that way.

## Summary

c15t canary `d4803ef60` on TanStack Start does not meet the bar today.
The banner is in the server HTML and visible at about 360 ms. CookieYes
shows its banner at 1,500–2,000 ms, so that target is met. LCP is the
target that fails. Canary finishes **+91.8 KB in 7 more requests before
the hero image** than the no-consent control, and its LCP delta reads
+408 / +410 ms in two discarded runs. CookieYes adds +30.4 KB in total
and reads +228 / +372 ms, measured at loads of 110 and 170. At the
measured slope of about 5 ms per KB, matching CookieYes means cutting
roughly 50 KB from what loads before the hero. The cause is that
`@c15t/tanstack-start`'s `ConsentRoot` always mounts the eager
`ConsentProvider` from `@c15t/react/provider`. The whole consent engine
(54.6 KB `routes` chunk, mostly `@c15t/core`), a second copy of the 69 KB
first-paint stylesheet held as a JS string (about 10 KB), and the script
loader (5.8 KB) all download alongside the hero.

`kaylee/instant-commit` `ad86f4805` does **not** reach the instant-commit
shell on TanStack Start. Its LCP (+428 / +444 ms, discarded) and transfer
(+112.8 KB) are within noise of canary. The stock fixture also crashes on
canary at SSR: `consentRequestMiddleware()` regressed since 3.0.0. I
measured with a one-line fixture patch, described under Caveats.

## Scorecard (mobile-article-v1)

| Target | c15t canary | CookieYes | Met |
| --- | --- | --- | --- |
| banner.visible earlier than CookieYes | 360 / 369 ms¹ | 1,970 / 1,532 ms¹ | yes (deterministic: banner is server HTML) |
| LCP Δ at or below CookieYes | +408 (340–704) / +410¹ | +228 / +372¹ | **no**: +91.8 KB before the hero vs CookieYes +30.4 KB in total |
| accept consent-effective ≤ CookieYes | not yet measured | not yet measured | — |
| accept scripts-complete < CookieYes | not yet measured | not yet measured | — |
| nothing from the tap over 1,000 ms | not yet measured² | — | — |

1. Discarded runs, load 38–170. Only `s1-canary-load-20261104-145427` has
   a CookieBench interval, because all its samples passed.
2. The unthrottled-load smoke `accept` on instant-commit (1 iteration, load
   about 50) read consent-effective 146 ms and scripts-complete 340 ms. It
   is a smoke check only.

## Mobile, `load` (15 pairs, seed 20261009, 3 warm-ups)

Each run's own control. Every row is **discarded** (see the ledger). Byte
and request counts repeat to within 13 B from run to run.

| Measure | canary `d4803ef60` | instant-commit `ad86f4805` | CookieYes |
| --- | ---: | ---: | ---: |
| page.lcp Δ, compare (95% CI) | +408 (340–704); +410 (no CI) | +428; +444 (no CI) | +228; +372 (no CI) |
| page.fcp Δ | +64; +204 | +46; +64 | +82; +120 |
| banner.visible | 360; 369 | 336; 397 | 1,970; 1,532 |
| initial.transfer, candidate − control | 705,144 − 589,703 = **+115,441 B** | 702,426 − 589,626 = **+112,800 B** | 620,094 − 589,703 = **+30,391 B** |
| initial.requests | 18 vs 7 (**+11**) | 17 vs 7 (**+10**) | 16 vs 7 (**+9**) |
| initial.long-task-blocking (cand / ctrl) | 300 / 161; 368 / 252 | 219 / 227; 454 / 195 | 407 / 279; 369 / 360 |
| Load max during run | 38.3; 49.8 | 34.9; 34.7 | 109.8; 169.9 |

Action scenarios (`accept`, `reject`, `save`, `preferences`,
`returning-accepted`) and desktop `load`: queued, no result yet.

## Waterfall: bytes before the hero (canary)

`frameworks/tanstack/bin/waterfall-tanstack.mjs` uses the mobile profile
with 5 pairs, alternating control `/baseline` and candidate `/?scripts=2`.
It ran under load 56–90, which shifts timings but not which bytes finish
before the hero.

| Pair | Control LCP | c15t LCP | Δ LCP | Δ bytes before hero | Δ requests |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 3,356 | 3,792 | +436 | +91,830 | +7 |
| 2 | 3,368 | 3,960 | +592 | +91,817 | +7 |
| 3 | 3,400 | 3,860 | +460 | +91,830 | +7 |
| 4 | 3,440 | 3,800 | +360 | +91,818 | +7 |
| 5 | 3,456 | 3,968 | +512 | +91,818 | +7 |

Median: **+91.8 KB, +7 requests, +460 ms, so about 5.0 ms per KB**. The
Next.js lanes measured 4.75 ms per KB.

### What those 91.8 KB are (median pair, wire bytes)

| Part | Wire B | Contents |
| --- | ---: | --- |
| Document over control (14,507 vs ~2.4 KB) | +12.1 KB | inline first-paint `<style>` 7.8 KB br alone (69,262 B raw, first thing in `<head>`); router dehydration +1.3 KB; banner markup 1.3 KB; c15t inline script 0.4 KB |
| `routes-*.js` | 54.6 KB | 194 KB raw: `@c15t/core` 67%, `@c15t/react` 18%, `@c15t/schema` 6%, `@c15t/ui`, `@c15t/tanstack-start` (the engine, behind the consent route) |
| `branding-*.js` | 12.0 KB | 80 KB raw, of which 69,197 B is **the same first-paint stylesheet as a JS template literal** (React 19 `<style href precedence>` needs the text on the client to hydrate it), plus logo/branding (4.5 KB raw) |
| `script-loader-*.js` | 5.8 KB | `@c15t/core` script loader, fetched at mount by the fixture's `useScriptLoader` |
| `experiment-*.js` | 3.0 KB | `@c15t/core/libs/experiment` |
| `4649-*.js` | 2.1 KB | `@c15t/translations` (English) |
| `policy-actions-*.js` | 1.7 KB | `@c15t/core/libs/policy-actions` |
| `has`, `storage-keys` | 1.4 KB | `@c15t/core` |

By package (JS before the hero, wire bytes split by raw share):
`@c15t/core` 48.5 KB, `@c15t/react` 11.0, `@c15t/schema` 3.5,
`@c15t/ui` 3.2, `@c15t/translations` 2.4, `@c15t/tanstack-start` 0.8.
The largest c15t modules are script-loader `mount` 2.8 KB, `kernel/choice`
2.7, translations 2.1, persistence `record-codec` 2.0, `persistence/mount`
1.9, schema `policy-resolution-wire` 1.8, `record-storage` 1.8,
`init-lifecycle` 1.7, `policy-actions` 1.7, script-loader `loader` 1.7,
`react/provider` 1.6. Full tables:
`frameworks/tanstack/runs/w1-canary-waterfall-20261104-165144/attr.md`.

### Instant-commit `ad86f4805` waterfall

The run is `w1-ic-waterfall-20261104-175633`, taken at load 54–72. Pair 5
was skipped after a 90 s navigation timeout. An earlier attempt crashed
at load 93.

| Pair | Control LCP | c15t LCP | Δ LCP | Δ bytes before hero | Δ requests |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 3,484 | 3,848 | +364 | +88,830 | +6 |
| 2 | 3,404 | 3,972 | +568 | +88,828 | +6 |
| 3 | 3,456 | 4,144 | +688 | +81,869 | +4 |
| 4 | 3,696 | 4,060 | +364 | +88,829 | +6 |

Median: **+88.8 KB, +6 requests**, 3.0 KB under canary. The difference
is the document (12,047 vs 14,507 B), whose inline sheet is the
banner-only split (52,323 B raw). `routes` (55.4 KB), `branding`
(11.2 KB, still carrying the sheet as a JS literal), `script-loader`
(5.8 KB) and `policy-actions` (4.1 KB, now including `experiment`) are
the same engine as on canary. Full tables are in that run's `attr.md`.

## Does `c15t/tanstack-start` reach the instant-commit shell?

**No.** Checked on `ad86f4805`:

- `c15t/tanstack-start` is a generated re-export of `@c15t/tanstack-start`.
  The branch does not touch `packages/tanstack-start`; its tarball is
  byte-identical to canary's (`c15t-tanstack-start-478749b5ec76.tgz` in
  both arms).
- `packages/tanstack-start/src/root.tsx` imports
  `ConsentProvider` from `@c15t/react/provider`. On the branch that export
  "always keeps the engine in the page's first-load JavaScript". The
  deferred path is reached only through `@c15t/react`'s root
  `ConsentProvider` (`#consent-provider`, browser condition →
  `deferred/client-provider.js`). Next.js's own `root.tsx`, which renders
  `DeferredConsentShell`, also reaches it.
- Even if TanStack used that export, `client-provider.tsx`'s
  `needsEngine()` returns true for `options.prefetch` and
  `options.__resolveStreamedInit`. `ConsentRoot` always sets both, so the
  engine would still load at once.
- The built client bundle confirms it. `c15t-early-commit` (from
  `deferred/shell.tsx`) appears in no chunk. The only deferred code that
  ships is `whenPriorityImagesLoad` from `deferred/trigger.ts`, which the
  eager provider's dialog chunk-warming imports.

The instant-commit arm is the eager provider plus the branch's other
changes: the banner-only CSS split and dialog warming. LCP and bytes
match canary.

## What is left

These estimates use 5.0 ms per KB before the hero. Closing the LCP gap to
CookieYes (≈ +230 ms here, unconfirmed) means getting from +91.8 KB to
about +45 KB.

| Change | Where | Est. KB before hero | Est. ms |
| --- | --- | ---: | ---: |
| Port the deferred shell to `@c15t/tanstack-start`'s `ConsentRoot`: server-side boot snapshot plus `canDeferEngine`, `DeferredConsentShell`, and a lazily imported engine root, as `packages/nextjs/src/root.tsx` does on `kaylee/instant-commit`. Handle `prefetch` / `__resolveStreamedInit` from the boot data instead of bailing. | `packages/tanstack-start` (+ `@c15t/react/deferred`) | −50 to −60 (most of `routes` 54.6, `experiment` 3.0, `policy-actions` 1.7) | −250 to −300 |
| Stop shipping the first-paint stylesheet twice. The server already inlines it, so the client could adopt the existing `<style data-href>` instead of carrying the 69 KB literal. | `@c15t/react` surface styles / `@c15t/ui` sheets | −9.7 | −50 |
| Banner-only CSS split (already on instant-commit) | `@c15t/ui` | −2.3 | −12 |
| Load the script loader after the hero when nothing may run yet. Today the fixture's `useScriptLoader` fetches it at mount. | `@c15t/react` module hooks | −5.8 | −29 |
| Keep `consentRequestMiddleware()` usable on a server function, or document that it is request-only. | `packages/tanstack-start/src/middleware.ts` | 0 | 0 (correctness) |

On Next.js the deferred shell plus instant commit measured +56 ms LCP,
banner at 238 ms and accept at 24 / 183 ms. TanStack has the same
SSR-banner shape, so the first row is the one that matters. The tap
targets cannot be judged until the action scenarios run.

## Run ledger

`frameworks/tanstack/runs/ledger.log` has every run, kept or discarded,
with its reason. All runs used `/tmp/cookiebench-v3-measurement.lock`. Load
is the 1-minute average sampled every 30 s while the run held the lock.

| Run | Verdict | Control FCP | Load max | Passed | Reason |
| --- | --- | ---: | ---: | --- | --- |
| `_smoke-canary/cy/ic` 10:01–10:05 | DISCARD | — | ~35–50 | — | smoke checks, 1 iteration |
| `s1-canary-load-…100601` | DISCARD | — | — | — | aborted: gate fix, queue restarted |
| `s1-canary-load-…103814` | DISCARD | — | — | — | aborted: load never ≤ 8 from 10:38 to 14:10 |
| `s1-canary-load-…141041` | DISCARD | 416 | 49.8 | 11/15 | load, control FCP, 4 failed (load-induced: 1–8 s FCP, up to 7.9 s long tasks) |
| `s1-canary-load-…145427` | DISCARD | 372 | 38.3 | 15/15 | load |
| `s1-ic-load-…153841` | DISCARD | 352 | 34.9 | 14/15 | load, 1 failed |
| `s1-ic-load-…162108` | DISCARD | 360 | 34.7 | 12/15 | load, 3 failed |
| `s1-cy-load-…170004` | DISCARD | 472 | 109.8 | 14/15 | load, control FCP, 1 failed (`banner-missing`) |
| `w1-ic-waterfall-…172301` | DISCARD | — | 93 | 1/5 pairs | crashed: navigation timeout 90 s |
| `s1-cy-load-…173829` | DISCARD | 444 | 169.9 | 9/15 | load, control FCP, 6 failed |
| `w1-canary-waterfall-…165144` | used for bytes only | — | 56–90 | 5/5 pairs | byte counts identical across pairs; timings loaded |

## Caveats

- **Fixture patch.** On canary (and `ad86f4805`) the stock fixture's `/`
  route renders TanStack's error boundary: "Cannot destructure property
  'headers' of 'e.response' as it is undefined". The fixture attaches
  `consentRequestMiddleware()` to `createServerFn().middleware([...])`.
  Since `3b8a63767` / `16c281d68` the middleware wraps `next()`'s result in
  `withSetCookie(...)`, which reads `result.response`. A server function
  called during SSR has none. 3.0.0 returned `next(...)` unchanged. I
  dropped the middleware from that server function in my private copies
  (`frameworks/tanstack/fixture-consent-state.patch`). The handler then
  reads request headers itself, the server sets no `c15t-sid` cookie, and
  the browser mints the subject ID. `/baseline` is unchanged. A multi-line
  `.handler(\n createConsentStateHandler()\n)` broke the Start compiler, so
  the patch keeps the chain form.
- **Seed.** CLI `--seed 20261009`. The config's own seed is 1.
- **Windows.** October's: mobile `load` observation 10 s, actions 1.5 s.
  Desktop `load` 5 s.
- **Ports.** Fixture ports 4316 / 4416 / TLS 4616, as assigned. Both arms
  and CookieYes run the same ports one at a time. CookieYes runs from the
  canary copy's `/baseline?cmp=cookie-yes` on the registered host.
- **Not measured yet:** every action scenario, desktop, the instant-commit
  waterfall, and CookieYes bytes before the hero (the waterfall script does
  not handle the TLS host).
- **Gate change mid-session.** From 10:38 to 14:10 my queue refused to
  start above load 8, stricter than the brief. From 14:10 it follows the
  brief: wait up to 30 min for load ≤ 4, then go, and the ledger discards
  any run that went over 8.

## Artifacts

All under `/home/kaylee/.t3/scratch/lcp-fleet/frameworks/tanstack/`:

- `bin/`: `pack.sh`, `prepare.sh`, `make-configs.py`, `cb-run.sh`,
  `check.py`, `queue.sh`, `retry.sh`, `smoke-run.sh`, `wf-now.sh`,
  `waterfall-tanstack.mjs`, `wf-attr.py`, `attr-build.sh`, `attr.sh`,
  `attribute-run.ts`, `html-parts.py`
- `configs/`: `c15t-{canary,ic}-{mobile,desktop}.json`, `cy-{mobile,desktop}.json`
- `packs-{canary,ic}.tsv` (+ `.head`, empty `.diff`), tarballs in `packs-*/`
- `work/{canary,ic}/cookiebench`: private CookieBench copies (fixture
  patched, built); `work/src-ic`: checkout of `ad86f4805`
- `static/`: `attr-*.json`, `map-*.json`, `html-parts-*.json`, `first-load-*.txt`
- `runs/`: every run, `ledger.log`, `queue.log`; `_aborted/`, `_failed/`
- `fixture-consent-state.patch`
