# Lane `tanstack`: c15t on CookieBench's TanStack Start fixture (round 8, M1)

**Status: complete, 2026-11-05 01:53.** Every queued run is kept, except
CookieYes `save`, which CookieYes does not support. All timings come from
this Mac (Apple M1 Pro). Each arm is compared with its own paired control
and with CookieYes, both measured here in the same session.

## Summary

c15t canary `d4803ef60` on TanStack Start **does not meet the bar on
mobile**. It meets two of five targets: the banner is first, and nothing
from the tap is near 1,000 ms. It misses LCP by **276 ms**: +448 ms
(95% CI +444 to +452) against CookieYes's +172 ms (+172 to +184). It also
misses both accept targets, by 12–13 ms. The banner is in the server HTML
and visible at 275 ms, against 1,235 ms for CookieYes.

The LCP cost is bytes. Canary finishes **+91.8 KB in 7 more requests
before the hero**, at 4.9 ms per KB on this Mac. `@c15t/tanstack-start`'s
`ConsentRoot` always mounts the eager `@c15t/react/provider`, so the whole
consent engine (the 54.6 KB `routes` chunk, two-thirds `@c15t/core`)
downloads alongside the hero. A second copy of the 69 KB first-paint
stylesheet, held as a JS string (7.8 KB on the wire), and the script
loader (5.8 KB) do too. Matching CookieYes means cutting about 56 KB
before the hero. Porting the deferred shell to `ConsentRoot` would remove
most of it.

`kaylee/instant-commit` `ad86f4805` **does not reach the instant-commit
shell** on TanStack Start (tarball and bundle evidence below). It measures
the same as canary: LCP +436 ms and accept 56 / 192 ms. On desktop both
CMPs are close to free: c15t +8 ms (+4 to +20) and CookieYes +0
(−12 to 0). c15t's banner shows at 25 ms against CookieYes's 310 ms.

## Scorecard (mobile-article-v1, this Mac)

| Target | c15t canary | CookieYes | Met |
| --- | --- | --- | --- |
| banner.visible earlier than CookieYes | 275 ms (max 281) | 1,235 ms (max 3,274) | **yes**, by 960 ms |
| LCP Δ at or below CookieYes | +448 (+444 to +452) | +172 (+172 to +184) | **no**, 276 ms over (intervals 260 ms apart) |
| accept consent-effective ≤ CookieYes | 56 ms (max 64; range 52–64) | 44 ms (max 50; range 39–50) | **no**, 12 ms over; the ranges do not overlap |
| accept scripts-complete < CookieYes | 191 ms (max 196; range 189–196) | 178 ms (max 180; range 175–180) | **no**, 13 ms over; the ranges do not overlap |
| nothing from the tap over 1,000 ms | max: accept 196 (scripts-complete), reject 54, save 177, preferences-visible 426 | — | **yes** |

Also measured: reject consent-effective is 51 ms for c15t against 44 ms
for CookieYes, so CookieYes is faster there too. `save` has no CookieYes
comparison (`unsupported-action`, as in October). The returning visitor
sees no banner, and LCP is 236 ms against 228 ms for the control.

## Measured tables (this Mac)

Mobile is `mobile-article-v1` (390x844 DPR 3, 4x CPU, 200 KB/s, 150 ms); desktop is `desktop-article-v1-browser-ua`. Seed 20261009, 3 warm-ups, 15 pairs for `load`, 10 for actions. Each arm is compared to its own paired control from the same build and server.

<!-- auto:tables -->
### mobile-article-v1, `load`

| Measure | c15t canary `d4803ef60` | instant-commit `ad86f4805` | CookieYes |
| --- | ---: | ---: | ---: |
| Run | `m-canary-load-20261104-223958` | `m-ic-load-20261105-000243` | `m-cy-load-20261104-225328` |
| page.lcp Δ, compare (95% CI) | +448 (+444 to +452) | +436 (+428 to +436) | +172 (+172 to +184) |
| page.lcp median, cand / ctrl | 3,760 / 3,312 | 3,744 / 3,308 | 3,488 / 3,308 |
| page.fcp Δ (95% CI) | +28 (+24 to +36) | +12 (+8 to +20) | +4 (+4 to +8) |
| page.fcp median, cand / ctrl | 268 / 240 | 240 / 224 | 236 / 232 |
| banner.visible median / max | 275 / 281 | 250 / 258 | 1,235 / 3,274 |
| initial.transfer Δ (B) | +115,442 (+115,439 to +115,445) | +112,796 (+112,790 to +112,797) | +30,367 (+30,345 to +30,368) |
| initial.transfer cand / ctrl | 705,145 / 589,703 | 702,422 / 589,626 | 620,070 / 589,703 |
| initial.requests cand / ctrl | 18 / 7 | 17 / 7 | 16 / 7 |
| initial.long-task-blocking cand / ctrl | 0 / 0 | 0 / 0 | 0 / 0 |
| samples passed | 15/15 | 15/15 | 15/15 |
| load max during run | 5.82 | 5.81 | 8.33 |

### desktop-article-v1-browser-ua, `load`

| Measure | c15t canary `d4803ef60` | CookieYes |
| --- | ---: | ---: |
| Run | `d-canary-load-20261105-012628` | `d-cy-load-20261105-014927` |
| page.lcp Δ, compare (95% CI) | +8 (+4 to +20) | +0 (-12 to +0) |
| page.lcp median, cand / ctrl | 88 / 84 | 84 / 84 |
| page.fcp Δ (95% CI) | +8 (+8 to +12) | +0 (+0 to +0) |
| page.fcp median, cand / ctrl | 40 / 32 | 32 / 32 |
| banner.visible median / max | 25 / 28 | 310 / 543 |
| initial.transfer Δ (B) | +115,440 (+115,439 to +115,442) | +30,328 (+30,322 to +30,367) |
| initial.transfer cand / ctrl | 705,143 / 589,703 | 620,031 / 589,703 |
| initial.requests cand / ctrl | 18 / 7 | 16 / 7 |
| initial.long-task-blocking cand / ctrl | 0 / 0 | 0 / 0 |
| samples passed | 15/15 | 15/15 |
| load max during run | 6.53 | 7.27 |

### mobile `accept` (median / max, ms)

| Measure | c15t canary `d4803ef60` | instant-commit `ad86f4805` | CookieYes |
| --- | ---: | ---: | ---: |
| Run | `m-canary-accept-20261105-001826` | `m-ic-accept-20261105-005740` | `m-cy-accept-20261105-004749` |
| INP | 56 / 64 | 56 / 64 | 48 / 56 |
| dismissed | 56 / 64 | 56 / 59 | 44 / 50 |
| consent-effective | 56 / 64 | 56 / 59 | 44 / 50 |
| scripts-complete | 191 / 196 | 192 / 198 | 178 / 180 |
| banner.visible | 261 / 268 | 249 / 256 | 1,184 / 1,230 |
| samples passed | 10/10 | 10/10 | 10/10 |
| control page.fcp median | 226 | 224 | 226 |
| load max during run | 5.01 | 3.98 | 4.44 |

### mobile `reject` (median / max, ms)

| Measure | c15t canary `d4803ef60` | CookieYes |
| --- | ---: | ---: |
| Run | `m-canary-reject-20261105-010101` | `m-cy-reject-20261105-012212` |
| INP | 56 / 56 | 48 / 56 |
| dismissed | 51 / 54 | 44 / 53 |
| consent-effective | 51 / 54 | 44 / 53 |
| banner.visible | 265 / 287 | 1,185 / 1,303 |
| samples passed | 10/10 | 10/10 |
| control page.fcp median | 232 | 228 |
| load max during run | 4.99 | 4.96 |

### mobile `save` (median / max, ms)

| Measure | c15t canary `d4803ef60` |
| --- | ---: |
| Run | `m-canary-save-20261105-010328` |
| INP | 24 / 24 |
| dismissed | 17 / 19 |
| consent-effective | 17 / 19 |
| scripts-complete | 171 / 177 |
| banner.visible | 262 / 268 |
| samples passed | 10/10 |
| control page.fcp median | 222 |
| load max during run | 4.53 |

### mobile `preferences` (median / max, ms)

| Measure | c15t canary `d4803ef60` |
| --- | ---: |
| Run | `m-canary-preferences-20261105-010621` |
| INP | 56 / 64 |
| dismissed | 51 / 60 |
| preferences-visible | 422 / 426 |
| banner.visible | 264 / 272 |
| samples passed | 10/10 |
| control page.fcp median | 224 |
| load max during run | 4.58 |

### mobile `returning-accepted` (median / max, ms)

| Measure | c15t canary `d4803ef60` |
| --- | ---: |
| Run | `m-canary-returning-accepted-20261105-011458` |
| page.lcp, cand / ctrl (median) | 236 / 228 |
| page.fcp, cand / ctrl (median) | 236 / 228 |
| consent.resolution, cand / ctrl (median) | 364 / – |
| initial.transfer, cand / ctrl (median) | 5,451 / 4,833 |
| initial.requests, cand / ctrl (median) | 16 / 7 |
| scripts.executions, cand / ctrl (median) | 2 / 0 |
| banner shown (samples) | 0 |
| samples passed | 10/10 |
| control page.fcp median | 228 |
| load max during run | 6.18 |
<!-- /auto:tables -->

## Waterfall: bytes before the hero (canary, this Mac)

`frameworks/tanstack/bin/waterfall-tanstack.mjs` (the desktop script, with
macOS load sampling) reproduces the mobile profile in Playwright. It ran 5
pairs, alternating control `/baseline` and candidate `/?scripts=2`, cold
context each visit, behind the shared lock. Load at start was 4.20 and max
4.63. Run: `wf-canary-20261105-010006`.

| Pair | Control LCP | c15t LCP | Δ LCP | Δ bytes before hero | Δ requests |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 3,296 | 3,756 | +460 | +91,816 | +7 |
| 2 | 3,296 | 3,748 | +452 | +91,818 | +7 |
| 3 | 3,292 | 3,756 | +464 | +91,820 | +7 |
| 4 | 3,312 | 3,748 | +436 | +91,817 | +7 |
| 5 | 3,292 | 3,740 | +448 | +91,831 | +7 |

Median: **+91.8 KB and +7 requests before the hero, +452 ms, so 4.9 ms
per KB** on this Mac. CookieBench's own run gives +448 ms over the same
build. The desktop measured the same +91.8 KB, and its 5.0 ms/KB slope was
taken under load 56–90. The hero request starts early in both arms (176–179 ms control,
216 ms c15t), so it is not blocked. It shares the 200 KB/s link with every
chunk that downloads alongside it, so each extra byte finished before it
delays its end.

### What those 91.8 KB are (median pair 2, wire bytes)

| Part | Wire B | Contents |
| --- | ---: | --- |
| Document over control (14,505 vs 2,775) | +11,730 | Inline first-paint `<style data-precedence="c15t" data-href="c15t-first-paint">`, 69,195 B raw and 7,778 B brotli alone. It is the first thing in `<head>` and pushes the hero `<img>` from byte 2,094 to byte 71,735. Also banner markup and a fourth inline script (+4.7 KB raw) |
| `routes-*.js` | 54,588 | 194 KB raw: `@c15t/core` 67%, `@c15t/react` 18%, `@c15t/schema` 6%, plus `@c15t/ui` and `@c15t/tanstack-start`. This is the consent engine, pulled in by the `/` route |
| `branding-*.js` | 11,976 | 80,072 B raw. 69,195 B of it is **the same first-paint stylesheet again, as a JS template literal** (same length and opening as the inline `<style>`; 7,778 B brotli alone). The rest is 3.8 KB brotli of branding and surface-style code (`@c15t/react` 8.7 KB raw) |
| `script-loader-*.js` | 5,755 | `@c15t/core` script loader (99%), fetched at mount |
| `experiment-*.js` | 2,971 | `@c15t/core/libs/experiment` |
| `4649-*.js` | 2,086 | `@c15t/translations` (English) |
| `policy-actions-*.js` | 1,744 | `@c15t/core/libs/policy-actions` |
| `has-*.js`, `storage-keys-*.js` | 1,427 | `@c15t/core` |
| **Total over control** | **+91,818** (B, request count +7) | |

JS before the hero by package, with wire bytes split by raw share:
`@c15t/core` 48.4 KB, `@c15t/react` 9.7, `@c15t/schema` 3.5, `@c15t/ui` 3.0,
`@c15t/translations` 2.4, `@c15t/tanstack-start` 0.8. The `branding` chunk
did not map to the source-mapped build because Rolldown named it
`surface-styles` there. Its split above comes from the literal. The largest
c15t modules (wire B) are script-loader `mount` 2,825, `kernel/choice`
2,686, translations 2,086, persistence `record-codec` 1,989,
`persistence/mount` 1,861, schema `policy-resolution-wire` 1,800,
`record-storage` 1,772, `init-lifecycle` 1,745, `policy-actions` 1,744,
script-loader `loader` 1,734 and `react/provider` 1,638. Full tables:
`frameworks/tanstack/runs/wf-canary-20261105-010006/attr.md`.

After the hero, `panel` (6.7 KB), `preferences` (10.7 KB),
`preference-draft` (1.8 KB) and `writer` (4.5 KB) arrive. That is dialog
warming, and it is why CookieBench's initial phase shows +115.4 KB against
+91.8 KB before the hero.

## Does `c15t/tanstack-start` reach the instant-commit shell?

**No.** Checked on this Mac's tarballs and builds:

- The `@c15t/tanstack-start` tarball is byte-identical in both arms
  (sha256 `9658ab6d9c7e…`, `c15t-tanstack-start-9658ab6d9c7e.tgz`).
  `c15t/tanstack-start` re-exports it.
- Its `dist/root.js` imports `ConsentProvider` from `@c15t/react/provider`,
  the eager provider. On `ad86f4805` the deferred path is reached only
  through `@c15t/react`'s root export (`#consent-provider`, whose browser
  condition is `deferred/client-provider.js`). TanStack Start does not
  import that export.
- Neither arm's built client bundle contains `c15t-early-commit`, the
  marker string of `deferred/shell.js`, so the deferred shell never ships.
- What does differ between the arms is in shared packages: `branding` is
  80,072 → 73,261 B raw (the banner-only CSS split), `experiment` is folded
  into `policy-actions` (3,583 → 10,662 B), and `routes` is 194,188 →
  196,582 B. That is about 2.6 KB less transfer, and nothing on the
  instant-commit path.

Measured, the instant-commit arm matches canary: LCP +436 vs +448 ms
(intervals 8 ms apart), accept consent-effective 56 vs 56 ms, and
scripts-complete 192 vs 191 ms.

## What is left

Estimates use this Mac's slope, **4.9 ms per KB before the hero**. To
close the LCP gap to CookieYes (276 ms), canary has to get from +91.8 KB
to about +35 KB before the hero, a cut of roughly 56 KB.

| Change | Where | Est. KB before hero | Est. ms |
| --- | --- | ---: | ---: |
| Port the deferred shell to `ConsentRoot`: render `DeferredConsentShell` from a server boot snapshot and import the engine root lazily, as `packages/nextjs/src/root.tsx` does on `kaylee/instant-commit`. `ConsentRoot` always sets `prefetch` and `__resolveStreamedInit`, and `needsEngine()` returns true for both, so it must take those from the boot data instead | `packages/tanstack-start` (+ `@c15t/react/deferred`) | −55 to −62 (most of `routes` 54.6, plus `experiment` 3.0, `policy-actions` 1.7, `has`/`storage-keys` 1.4) | −270 to −305 |
| Stop shipping the first-paint stylesheet twice. The server inlines it, so the client could adopt the existing `<style data-href="c15t-first-paint">` instead of carrying the 69 KB literal | `@c15t/react` surface styles / `@c15t/ui` | −7.8 | −38 |
| Banner-only CSS split (already on instant-commit; measured −2.6 KB total here) | `@c15t/ui` | −2.5 | −12 |
| Load the script loader after the hero when no script may run yet. Today the fixture's `useScriptLoader` fetches it at mount, and it finishes before the hero | `@c15t/react` module hooks | −5.8 | −28 |
| Keep `consentRequestMiddleware()` usable on a server function (see below) | `packages/tanstack-start/src/middleware.ts` | 0 | 0 (correctness) |

The first row alone would bring LCP to about +150–180 ms, level with
CookieYes's +172. Together with the stylesheet row it would put canary
under CookieYes.

The accept gap is small, 12–13 ms from the tap at 4x CPU. I did not profile the
tap. My guess is that c15t's dismiss (56 ms) goes through the React
engine's state update and re-render, while CookieYes removes its banner
with plain DOM code. The instant-commit shell commits the choice before
the engine runs. It is the likely way to close this on TanStack Start. Today it is unreachable here, as shown
above.

## `consentRequestMiddleware()` canary regression

The branch's tanstack fixture (`src/consent-state.ts`) drops
`consentRequestMiddleware()` from `createServerFn({ method: "GET" })`.
With the middleware, canary renders TanStack's error boundary at SSR:
"Cannot destructure property 'headers' of 'e.response' as it is undefined".
In canary `packages/tanstack-start/src/middleware.ts`, `withSetCookie`
(line 216) reads `result.response.headers` from `next()`'s result. A
server function called during SSR has no `response` on that result. 3.0.0
returned `next(...)` unchanged. With the fix the handler reads the request
headers itself, the server sets no `c15t-sid` cookie, and the browser
mints the subject ID. `/baseline` is unchanged. Both arms and CookieYes
run this same fixture source. The fix belongs in c15t: either make the
middleware pass server-function results through, or document that it is
request-middleware only.

## Run ledger

<!-- auto:ledger -->
| Time | Verdict | Run | Control FCP | Load max | Passed | Reason |
| --- | --- | --- | ---: | ---: | --- | --- |
| 22:53 | KEEP | `m-canary-load-20261104-223958` | 240 | 5.82 | 15/15 | gate ok |
| 23:07 | KEEP | `m-cy-load-20261104-225328` | 232 | 8.33 | 15/15 | gate ok |
| 23:36 | DISCARD | `m-ic-load-20261104-230754` | – | – | – | no envelope: lost the lock-recovery race before measuring |
| 00:01 | DISCARD | `m-ic-load-20261104-233606` | – | – | – | no envelope: lost the lock-recovery race before measuring |
| 00:02 | DISCARD | `m-ic-load-20261105-000153` | – | – | – | aborted in lock wait for queue restart; no measurement |
| 00:18 | KEEP | `m-ic-load-20261105-000243` | 224 | 5.81 | 15/15 | gate ok |
| 00:47 | KEEP | `m-canary-accept-20261105-001826` | 226 | 5.01 | 10/10 | gate ok |
| 00:57 | KEEP | `m-cy-accept-20261105-004749` | 226 | 4.44 | 10/10 | gate ok |
| 01:00 | KEEP | `m-ic-accept-20261105-005740` | 224 | 3.98 | 10/10 | gate ok |
| 01:01 | KEEP | `wf-canary-20261105-010006` | – | 4.63 | 5/5 | gate ok |
| 01:03 | KEEP | `m-canary-reject-20261105-010101` | 232 | 4.99 | 10/10 | gate ok |
| 01:06 | KEEP | `m-canary-save-20261105-010328` | 222 | 4.53 | 10/10 | gate ok |
| 01:14 | KEEP | `m-canary-preferences-20261105-010621` | 224 | 4.58 | 10/10 | gate ok |
| 01:22 | KEEP | `m-canary-returning-accepted-20261105-011458` | 228 | 6.18 | 10/10 | gate ok |
| 01:24 | KEEP | `m-cy-reject-20261105-012212` | 228 | 4.96 | 10/10 | gate ok |
| 01:26 | DISCARD | `m-cy-save-20261105-012453` | 228 | 5.95 | 0/10 | 10 failed candidate sample(s) ['followup:unsupported-action', 'unsupported-action'] |
| 01:49 | KEEP | `d-canary-load-20261105-012628` | 32 | 6.53 | 15/15 | gate ok |
| 01:52 | KEEP | `d-cy-load-20261105-014927` | 32 | 7.27 | 15/15 | gate ok |
<!-- /auto:ledger -->

## Caveats

- **Machine and load.** Apple M1 Pro, macOS 26, Chromium 1243 (Playwright
  1.63.0), Node 24.21.0. The other three round-8 lanes ran on the same Mac,
  serialised by `/tmp/cookiebench-v3-measurement.lock`. Gate: start at
  1-minute load ≤ 6; discard if any 30 s sample is > 10, if control FCP
  median is > 400 ms, or if any sample failed (except a control's
  `required-measurement-unavailable` on actions).
- **Lock-recovery race.** The first two instant-commit `load` attempts
  failed before measuring: `EEXIST … cookiebench-v3-measurement.lock.recovery`.
  CookieBench's stale-lock recovery (`packages/runner/src/lifecycle.ts`)
  takes a second guard file with `wx`. When two lanes poll at the same
  moment, the loser throws instead of reporting "Another measured
  workload is active", and the shared `tools/bin/cb-run.sh` retries only
  on that message. This lane switched to a local copy
  (`frameworks/tanstack/bin/cb-run.sh`) that also retries on the recovery
  error, and restarted its queue (`queue2.sh`, which skips kept labels).
  The other lanes still use the shared script.
- **Fixture patch.** Every arm runs the branch's `consent-state.ts` without
  `consentRequestMiddleware()` (see above). The server sets no `c15t-sid`
  cookie.
- **Action windows.** `page.lcp` and `initial.transfer` are omitted from
  the action tables. The action fires before the hero finishes, so they
  are not load measures there.
- **Seed** 20261009 on the CLI; the configs' own seed is 1. Windows are
  October's matrix values (mobile `load` observation 10 s).
- **Not compared:** October's matrix and the desktop's numbers appear only
  where labelled. All deltas are against controls measured in the same run
  on this Mac.

## Artifacts

All under `/Users/kayleewilliams/.t3/scratch/lcp-fleet/frameworks/tanstack/`:

- `bin/`: `queue.sh` (v1), `queue2.sh`, `cb-run.sh` (lane copy with the
  lock-race retry), `check.py` (gate and ledger), `table.py`,
  `report-refresh.py`, `waterfall-tanstack.mjs` and `wf-run.sh` (macOS
  port), `wf-attr.py`, `attr-build.sh`, `attr.sh`, `attribute-run.ts`,
  `with-lock.mjs` (holds the shared lock for the source-mapped build)
- `configs/`: `c15t-{canary,ic}-{mobile,desktop}.json`, `cy-{mobile,desktop}.json`
- `runs/`: every run dir, `ledger.log`, `queue.log`
- `static/`: `attr-{canary,ic}.json`, `map-{canary,ic}.json` (package and
  module attribution of every client chunk)
- The source-mapped builds (`attr-build.sh`) were deleted after
  attribution so no untracked files stay in the shared CookieBench
  worktree. `static/` keeps their results.
- `queue.log` records CookieYes `save` as stopped after one attempt,
  because all 10 samples failed with `unsupported-action` at quiet load.
  That failure is deterministic, so rerunning would not change it.
