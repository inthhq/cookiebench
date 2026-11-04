# Fleet brief: c15t mobile LCP cost on CookieBench (Next.js)

You are one of several agents working on this in parallel. Read this whole
file before you start. Your own task message tells you which lane you own.

## The problem

CookieBench (https://cookiebench.com, repo cloned at
`/home/kaylee/.t3/scratch/cookiebench`) reports "additional mobile LCP time"
per CMP on an identical Next.js article page. October 2026 numbers, Next.js,
mobile profile, median paired delta against a no-CMP control:

| CMP | LCP delta |
| --- | ---: |
| CookieYes (hosted script, injected after hydration) | ~180 ms |
| c15t 3.0.0 (`c15t/next`, SSR banner) | ~400 ms (older run: 436 ms) |
| Osano | ~440 ms |
| OneTrust | ~390 ms |

We want c15t at or below CookieYes without giving up what makes c15t good:
the banner is in the first HTML and visible at FCP, clicks work, and
consent-gated scripts for returning visitors start early.

## What the mobile profile is

From `docs/measurement-audit.md` and the methodology page:

- Playwright Chromium, emulated mobile 390x844 DPR 3, touch UA.
- 4x CPU slowdown. Network: 200 KB/s down, 93.75 KB/s up, 150 ms latency.
- Fresh context, cold cache, 15 paired visits (control and CMP alternated),
  3 discarded warm-ups. Reported value is the median of per-pair differences.
- The page is `packages/fixture-support/src/page.ts`. The LCP element is the
  493 KB hero image `courtyard.png` with `fetchpriority="high"` in both the
  control and the c15t arm, confirmed in the raw results.

## The data that matters (mobile, Next.js, 2026-10-15 rerun)

From `results/2026-10-15-matrix-rerun/mobile/nextjs-load/result.json` and
`nextjs-cookie-yes-load/result.json`:

| Cell | initial.transfer | initial.requests | FCP | LCP | banner.visible |
| --- | ---: | ---: | ---: | ---: | ---: |
| Next.js control | 613,076 B | 10 | 220 | 3,424 | n/a |
| c15t | 717,106 B (+104 KB) | 16 (+6) | 236 | 3,824 (+400) | 243 ms |
| CookieYes control | 613,071 B | 10 | 228 | 3,428 | n/a |
| CookieYes hosted | 644,093 B (+31 KB) | 19 (+9) | 228 | 3,608 (+180) | 2,268 ms |

Control LCP is 3.4 s because 613 KB at 200 KB/s is about 3.1 s. Every byte
that competes with the hero image before it finishes costs about 5 ms per KB.
c15t's +104 KB predicts ~520 ms if all of it lands before the image; the
observed 400 ms says most of it does. CookieYes's +31 KB predicts ~155 ms;
observed 180 ms. The LCP cost is bandwidth contention, not rendering, not
main-thread work (long-task blocking is 11 ms in both arms).

So the two levers are:

1. Fewer bytes before the hero image completes. Either ship less, or ship
   it later than the image.
2. Fewer requests that each pay 150 ms latency and a connection slot while
   the image is loading.

Banner visibility is already 243 ms because the banner is in the HTML. Do
not trade that away. CookieYes's 2,268 ms banner time is why their LCP is
cheap: they load almost nothing until after hydration. We want the banner at
FCP AND the LCP cost of a late loader. That is the balance the user asked
for.

## Where c15t's bytes come from (prior measurements, Next.js consumer)

`benchmarks/reports/client-payload-2026-09-25/README.md` in the c15t repo.
v3 initial payload over a no-consent baseline: about 68 KB gzip JS and 22 KB
gzip CSS. JS by area (raw / est. gzip):

| Area | Bytes |
| --- | ---: |
| `@c15t/core/kernel` | 38,790 / 11,729 |
| `@c15t/schema/shared` | 29,693 / 9,225 |
| `@c15t/core/modules/persistence` | 21,257 / 6,428 |
| `@c15t/react` provider, draft, hooks | 21,350 / 6,769 |
| `@c15t/core/libs` | 15,384 / 5,004 |
| `@c15t/react` banner | 13,525 / 4,090 |
| `@c15t/core/transports` | 12,963 / 3,989 |
| `@c15t/react` shared components | 12,907 / 4,353 |
| `@c15t/core/consent-record` | 10,677 / 3,376 |
| `@c15t/ui/theme` | 5,625 / 1,701 |
| `@c15t/core/modules/iframe-blocker` | 3,488 / 1,482 |

Those numbers are from September. The repo is now at 3.2.0-canary.0 and the
CookieBench fixture pins c15t 3.0.0 from npm. Re-measure before you trust
them. The CookieBench fixture (`benchmarks/with-c15t-nextjs/`) imports NO c15t
stylesheet in `app/layout.tsx`, so find out how the banner CSS actually
reaches the page in that fixture (inline `<style>`? a chunk? a `<link>`?)
before you reason about CSS.

## Ideas to steal from CookieYes's open SDK

Cloned at `/home/kaylee/.t3/scratch/cookieyes` (MIT). Note that CookieBench
measured their hosted platform script, not this SDK, but the SDK shows how
they think:

- `sdk/nextjs/src/styles.tsx`: `<CookieYesStyles />` inlines a small
  `critical.css` (banner paint rules only) into `<head>` with a published
  CSP hash, and links the full stylesheet with `media="print"`, swapped to
  `all` after the SDK mounts. `sdk/ui/src/styles/critical.css` and
  `sdk/ui/src/styles/deferred-stylesheets.ts`.
- `sdk/nextjs/src/styles-route.ts`: a Route Handler serving the full sheet,
  compressing its own body, immutable cache with a content-hash query.
- They claim 11.5 KB gzip for the whole banner. Read `sdk/ui/src/markup/`
  and `sdk/core` to see what they leave out versus `@c15t/core`.

## Repos and paths

- c15t monorepo: `/home/kaylee/.t3/projects/c15t-private` (branch `canary`,
  HEAD `c35b112b7`). Read its `AGENTS.md` first; it is the repo's agent guide
  (Bun 1.3.11, rslib, Vitest, Oxlint). Build with `bun run build` or
  `bun turbo run build --filter=<pkg>`.
- CookieBench: `/home/kaylee/.t3/scratch/cookiebench`. Pins Node 24.21.0
  (`.node-version`) and pnpm 11.25.0 (`packageManager`). This machine has
  Node 26.12.1, no corepack, and `~/.local/bin/pnpm` is NOT pnpm (it is an
  unrelated 1.4.3 tool). Use `bunx pnpm@11.25.0 ...` or `npx -y pnpm@11.25.0`.
  Playwright 1.63 Chromium may need `bunx pnpm@11.25.0 exec playwright install
  chromium` (installed builds live in `~/.cache/ms-playwright`).
- `docs/source-build.md` in CookieBench describes `pnpm source:prepare
  --checkout <c15t checkout>`, which packs c15t from a commit with `bun pm
  pack` and builds isolated consumers. It is heavy. A lighter path is fine:
  pack only the packages the Next fixture needs (`c15t` and its workspace
  deps), point a copy of `benchmarks/with-c15t-nextjs` at the tarballs via
  pnpm overrides, `next build`, then run
  `cookiebench run --config <copy>/run.json --scenario load --profile
  mobile-article-v1 --iterations N --warmups 1`. Read
  `packages/runner/src/index.ts` and `packages/cli` for the real flags.
- CookieYes SDK: `/home/kaylee/.t3/scratch/cookieyes`.
- c15t's own Next bench: `benchmarks/nextjs-browser-bench` (has a `mobile`
  throttle profile and records `lcpMs`, see `benchmarks/shared/src/browser.ts`).
  Useful for quick A/B inside the repo, but the CookieBench fixture is the
  thing being scored, so confirm there.

## Shared machine rules

Other agents are running benchmarks on this machine at the same time.

- Never run `ec quiet`, `pkill node`, `pkill chrome`, or anything that kills
  processes you did not start. Kill only your own PIDs.
- Ports: your task message assigns you a port base. The fixture hard-codes
  4322 (proxy) and 4412 (next start) in `package.json` and `run.json`
  (`url`, `readinessUrl`, `serverEventsUrl`). Change all of them in YOUR copy
  of the fixture to your assigned ports. Never use 4322/4412.
- Work on CookieBench in your own copy: `cp -r` the fixture dir or the whole
  repo under `/home/kaylee/.t3/scratch/lcp-fleet/<your-lane>/`. Do not edit
  `/home/kaylee/.t3/scratch/cookiebench` in place.
- CPU is shared (16 cores, 31 GB). LCP here is bandwidth-bound, so paired
  control/candidate comparison stays meaningful under load, but report bytes
  (deterministic) as the primary evidence and LCP delta as confirmation.
  Run at least 5 pairs for a directional result, 15 for a claim.
- Do not push to any remote. Do not open PRs. Do not commit on `canary`. If
  you are in a worktree you may commit on your branch.
- Do not add PLAN.md, NOTES.md or similar inside the c15t repo. Scratch goes
  under `/home/kaylee/.t3/scratch/lcp-fleet/<your-lane>/`.

## What to report

Write `/home/kaylee/.t3/scratch/lcp-fleet/reports/<your-lane>.md` and end
your final message with the same content. Include:

1. What you measured, with the exact command and config path, and a table:
   initial.transfer, initial.requests, FCP, LCP delta (median of pairs, with
   interval if the tool prints one), banner.visible, and for any change that
   affects interactivity: time until the Accept button responds
   (`action.input-to-next-paint` or your own measure) and, for a returning
   visitor with consent, when the first gated script starts.
2. The resource waterfall for one c15t visit: every request with transfer
   bytes, start and end time, and whether it finished before the hero image.
3. Theories ranked by expected ms saved per unit of risk, each with the
   evidence that supports it and what would falsify it.
4. For an implementation lane: the diff (branch name and commit), what it
   breaks or trades off, and which tests you ran.
5. Anything you could not verify, stated plainly.

Write plainly. No marketing language. Numbers in tables, not prose.

## Updates from finished lanes (read these)

- **Build c15t with Node 24, not 26.** Under Node 26 `@c15t/ui`'s CSS-module
  typings step (`tcm`, yargs) fails with `require is not defined`. The
  `payload` lane unpacked Node 24.21.0 under
  `/home/kaylee/.t3/scratch/lcp-fleet/payload/tools/`; `payload/env.sh` puts
  it on PATH. Reuse it.
- **Reusable measurement:** `payload/measure/visit.mjs` runs the mobile
  profile with Playwright and alternates `/` and `/baseline`, recording a
  per-request waterfall, FCP, LCP, banner visible. `payload/measure/
  attribute-run.ts` attributes chunk bytes per module from source maps.
  `payload/cb/` is a working private copy of the fixture workspace with pnpm
  overrides to tarballs (ports 4340/4430, do not reuse those ports).
- **Confirmed numbers at canary HEAD (11 pairs):** +85.7 KB before the hero
  image finishes, LCP +412 ms, 4.75 ms per KB. 79% of those bytes are the JS
  behind the `ConsentFixture` client boundary (67.8 KB br), 7% the
  script-loader chunk fetched at mount (6.1 KB), 14% HTML (11.8 KB, of
  which the inline first-paint sheet is 8.6 KB).
- **CSS is a small lever:** the whole inline sheet is 8.6 KB (~43 ms); the
  splits that keep the banner styled at FCP save 13–25 ms. Dropping the
  inline sheet for a `media=print` swap is rejected: it unstyles the banner
  at FCP.
- **`consent.resolution` is a hydration stamp**, not a network wait. The
  fixture's Probe sets it in a `useEffect` on the first snapshot, which is
  already `matched` from the server. No remote request happens on load.
- **Early taps already work before hydration:** a tap at 614 ms hid the
  banner at 702 ms via the inline early-tap script. The save POST and gated
  scripts then ran at ~2.3 s (after hydration).
- Reports so far: `reports/cookieyes-ideas.md`, `reports/payload.md`.
- **Harness is ready.** `/home/kaylee/.t3/scratch/lcp-fleet/harness/bench.sh <c15t-checkout> <port-base> [iterations]`
  builds, packs, installs into a private fixture copy, runs CookieBench
  mobile `load` paired, and writes `harness/work/<port-base>/out/<label>/summary.md`
  with LCP delta, bytes-before-hero and a waterfall. It queues on
  `/tmp/cookiebench-v3-measurement.lock` so lanes don't measure over each
  other. Baseline canary HEAD `c35b112b7`: **+396 ms (392–398), +85,654 B
  before the hero.** Use the same checkout path you edit; it builds it. A run
  whose control FCP is over 400 ms was taken on a loaded machine; rerun it.
  Details: `harness/README.md`, `reports/harness.md`.

### Update 2026-11-03 (round 3: React arm)

- Combined same-machine table: `reports/SYNTHESIS.md`, section "Update 2026-11-03".
- React arm so far: branch `kaylee/react-mobile-lcp-banner-shell` (`267563fa4`, worktree `/home/kaylee/.t3/worktrees/c15t-private/t3-9c24af1c`) gives +280 ms mobile LCP vs +592 canary; CookieYes on the same fixture here is +112. Diagnosis and remaining-byte table: `reports/react-arm.md`. React harness: `react-arm/bench-react.sh` (port 4410) and `react-arm/lib/*` (config maker, waterfall, summarize).
- Next.js competitor harness and October config port: `competitors/bin/*`, `competitors/env.sh`, `competitors/configs/`. Reuse `make-configs.py` as the model for React configs. October React configs: `cookiebench/results/2026-10-15-matrix-rerun/configs/react-*.json`.
- Ports still assigned: harness 4330/4380, react-arm 4410, competitors 4400/4490/4520-4549. New lanes pick from 4600+ and 4700+. Never 4322/4412.
- Lock: `/tmp/cookiebench-v3-measurement.lock`, retry every 20 s, measure only while control FCP (mobile) stays under 400 ms.

### Update 2026-11-03 (round 4: hard limit on consent latency)

User constraint: on the mobile profile, nothing measured from the Accept tap
may exceed 1,000 ms, and the target is well under. Current defer branches
fail it: Next.js tap-to-scripts-complete 1,341 ms (consent-effective 953);
React 1,003 (565). The cause is the full 65 KB engine downloading at the tap
while the hero still saturates the 200 KB/s link. Branch heads:
Next.js `kaylee/defer-engine-lcp-fixes` `16b0eac46` (worktree t3-98c1f078);
React `kaylee/react-mobile-lcp-banner-shell` `267563fa4` (worktree t3-9c24af1c)
plus optional CSS split `417845321` on `kaylee/react-lcp-gap`.
Reports: `reports/defer-fix.md`, `reports/react-gap.md`, `reports/SYNTHESIS.md`.
Ports for round 4: 4800-4899.

### Update 2026-11-03 (round 5: remeasure)

`ec quiet` was run at 15:31 (stopped 15 database containers and one stale
Next server from the commit-path lane). Two unrelated Claude agents are still
running in other worktrees; expect occasional load. Commit-path branches:
Next.js `kaylee/deferred-commit-path` (`fd020fd7c` measured head), React
`kaylee/react-deferred-commit-path` (`ca5fa8eeb` measured, `9c16ae024` head),
consumers and scripts under `commit-path/`. Report: `reports/commit-path.md`.

### Update 2026-11-03 (round 6: beat CookieYes on every column)

User targets, mobile profile, same session as CookieYes:
1. banner.visible earlier than CookieYes on both fixtures (Next.js already
   250 vs 2,369; React loses, 1,099 vs 1,062).
2. tap-to-consent-effective and tap-to-scripts-complete faster than CookieYes
   (CookieYes: 18 / 188 Next.js, 16 / 185 React; commit path today:
   324 / 327 and 266 / 357). "Consent-effective" in CookieBench is the
   fixture's `updateBridge(snapshot)` React effect on `useSnapshot()`
   (`cookiebench/packages/fixture-support/src/browser.ts`), so it fires when
   the React snapshot carries the explicit choice. `scripts-complete` is when
   the `/controlled/script` tags registered through `useScriptLoader` have
   executed.
3. LCP within 30 ms of the commit-path branches (+64 Next.js, +288 React).
Base for new work: `kaylee/react-deferred-commit-path` (contains the Next.js
commit path, defer-fix and react-arm). A `remeasure` lane holds the lock
intermittently; queue behind it. Ports: lane A 5000-5049, lane B 5050-5099.

### Update 2026-11-03 (round 7: Nuxt)

Instant commit on Next.js (lane `instant-commit`, branch `kaylee/instant-commit`,
interim from run envelopes): LCP +56, banner 238, accept consent-effective
24 (max 25), scripts-complete 183 (max 187) vs CookieYes 19 / 186 same
session. React arm of that lane and the `remeasure` lane still running.
React static shell: `kaylee/react-static-shell` (`reports/react-static-shell.md`).
CookieBench has a Nuxt fixture (`benchmarks/with-c15t-nuxt`) and October
configs `nuxt-{mobile,desktop}.json`, `nuxt-cookie-yes-*.json`. Ports for
the Nuxt lane: 5100-5149.
