# Round 8 brief: c15t on every CookieBench framework, same machine

You are one of four lanes. Each lane owns one framework. Read this whole file,
then `/home/kaylee/.t3/scratch/lcp-fleet/BRIEF.md` (the original problem),
`reports/competitors.md`, `reports/remeasure.md` and `reports/nuxt.md` under
`/home/kaylee/.t3/scratch/lcp-fleet/reports/` (how the earlier lanes measured
and reported). Your task message names your lane.

## Goal

The user wants one honest picture of c15t's performance on every framework
CookieBench covers, measured on this machine, against CookieYes measured the
same way, before shipping the LCP work. Next.js, React and Nuxt are done
(rounds 5–7). This round covers the rest:

| Lane | Fixture (in the CookieBench clone) | c15t package | Fixture ports (proxy / upstream) |
| --- | --- | --- | --- |
| tanstack | `benchmarks/with-c15t-tanstack-start` | `c15t/tanstack-start` (@c15t/react path) | 4316 / 4416 |
| astro | `benchmarks/with-c15t-astro` | `@c15t/astro` (+ `@c15t/svelte` island) | 4315 / 4415 / 4515 baseline |
| script | `benchmarks/with-c15t-script` | `@c15t/browser` script tag (`inth-init` variant from October) | 4310 / 4410 |
| sveltekit | none yet: build `benchmarks/with-c15t-sveltekit` | `@c15t/svelte` + `@c15t/svelte/kit` | 4317 / 4417 / 4517 baseline |

The CookieYes configs for the first three live in
`/home/kaylee/.t3/scratch/cookiebench/results/2026-10-15-matrix-rerun/configs/<framework>-cookie-yes-{mobile,desktop}.json`
(c15t configs next to them as `<framework>-{mobile,desktop}.json`). The sveltekit lane
derives its configs from the astro ones.

## What to measure

Arms, each with its paired no-CMP control from the same build and server:

1. **c15t canary** `d4803ef60` (origin/canary HEAD). Build it from your
   worktree, pack the workspace packages into tarballs, point the fixture at
   the tarballs. Do not measure a published npm version; the point is the
   current source.
2. **CookieYes**, October config, hosted script on the registered host. Same
   profile, same session, same machine.
3. **tanstack lane only:** also `kaylee/instant-commit` `ad86f4805` as a
   candidate arm (its worktree is `/home/kaylee/.t3/worktrees/c15t-private/t3-aa75fb1a`,
   read-only for you; make your own checkout of that commit if you need to
   build it). First check whether `c15t/tanstack-start` actually reaches the
   instant-commit shell (`packages/react/src/deferred/instant.ts`,
   `packages/core/src/surface-actions/instant-commit.ts`). Report whether it
   does; measure it either way.

Profiles and scenarios:

- **Mobile** `mobile-article-v1` (390x844 DPR 3, 4x CPU, 200 KB/s, 150 ms):
  `load` (15 pairs), `accept`, `reject`, `save` (10 iterations each), and
  `preferences` and `returning-accepted` where the framework's October config
  has them. Seed 20261009, 3 warm-ups.
- **Desktop** `desktop-article-v1`: `load` (15 pairs) at least.
- Metrics to report per arm: `page.lcp` paired median delta with
  `cookiebench compare`'s interval, `page.fcp` delta, `banner.visible`,
  `initial.transfer` and `initial.requests` deltas, `initial.long-task-blocking`,
  and for each action `action.consent-effective`, `action.scripts-complete`,
  `action.dismissed`, `action.preferences-visible` median and max.
- A Playwright waterfall (3–5 pairs) for the c15t canary arm giving bytes and
  requests finished before the hero ends, over control. `harness/lib/` and the
  nuxt lane's scripts (`/home/kaylee/.t3/scratch/lcp-fleet/nuxt/`) have
  working waterfall scripts to copy. Say what is in those bytes, by package
  and by chunk, the way `reports/nuxt.md` does.

Targets (the user's shipping bar, for the report's scorecard):

- banner.visible earlier than CookieYes
- LCP delta at or below CookieYes
- accept consent-effective ≤ CookieYes; accept scripts-complete < CookieYes
- nothing measured from the tap over 1,000 ms on mobile

## Rules of measurement (same as rounds 5–7)

- Every run queues on `/tmp/cookiebench-v3-measurement.lock` (CookieBench
  does this itself; retry every 20 s on "Another measured workload is
  active"). Never bypass it. Builds and installs can overlap with other
  lanes' measurements; measurements cannot.
- Load gate: do not start a measured run while the 1-minute load average is
  above 4. Wait up to 30 min, then note it and go.
- Discard and rerun a run if: any 1-minute load sample above 8 while it held
  the lock; any failed sample (except a control's expected
  `required-measurement-unavailable` on action scenarios); control FCP median
  above 400 ms on a server-rendered fixture (tanstack, astro, sveltekit,
  script) on mobile. Log every run, kept or discarded, with its reason.
- Sample the load average every 30 s during a run (`cb-run.sh` in
  `/home/kaylee/.t3/scratch/lcp-fleet/competitors/bin/` shows how).
- Use `python3 -I` for any script that reads result files.

## Toolchain and workspace

- Node 24.21.0: `/home/kaylee/.cache/nub/node/24.21.0/bin`. Node 26 breaks the
  c15t build. Bun 1.3.11 and pnpm 11.25.0 are in
  `/home/kaylee/.t3/scratch/lcp-fleet/harness/tools/` (`source
  /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh`). System bun 1.4.3
  rewrites `bun.lock`; do not use it in a c15t checkout.
- CookieBench: clone at `/home/kaylee/.t3/scratch/cookiebench` (read-only
  for you). Make your own private copy under your lane directory (rsync,
  excluding `node_modules` and `results`) the way
  `harness/bench.sh` and the competitors lane did, so lanes do not fight
  over `pnpm install` or `package.json` edits.
- Lane directory: `/home/kaylee/.t3/scratch/lcp-fleet/frameworks/<lane>/`.
  Keep runs under `runs/`, each run in its own dir with `config.json`,
  `envelope.json`, `compare-*.json`, `loadavg.txt`, `started`, `ended`,
  `meta.txt`. Write `runs/ledger.log` with one line per run:
  `<time> KEEP|DISCARD <label> <reason>`.
- Your c15t checkout is the worktree you were started in. Build with the
  repo's commands (`bun install --frozen-lockfile`, `bun run turbo run build
  --filter='c15t...'`; add `--filter='@c15t/browser...'` or
  `--filter='@c15t/svelte...'` as your package needs). Pack with
  `bun pm pack --ignore-scripts` per package, as `harness/bench.sh` does.
- Do not touch other lanes' directories or worktrees, the main checkout
  `/home/kaylee/.t3/projects/c15t-private`, or any `t3-*` worktree that is
  not yours. Do not push. Do not run `ec quiet` or kill processes you did not
  start. Only kill servers you started.
- The CookieYes host `benchmarks-with-cookie-yes.vercel.app` resolves locally
  through the fixture server's `--tls-port` (port + 300); see
  `benchmarks/plans/matrix.ts` and the October config for the exact flags.

## sveltekit lane: building the fixture

There is no `with-c15t-sveltekit` fixture in CookieBench. Build one in your
private CookieBench copy, modelled on `with-c15t-astro` (closest: SSR
banner, baseline build without the integration, `fixture-support` page and
server) and the c15t repo's `benchmarks/sveltekit-browser-bench` and
`examples/sveltekit` (how `c15tHandle`, `loadConsent`, `createConsentRoute`
are wired). It must render the shared article page from
`packages/fixture-support/src/page.ts` with the same hero image, the same
`data-testid` adapter selectors as the astro fixture, a `/baseline` route
with no c15t in the module graph, the `/controlled/script` gated script, and
`html[data-consent-ready="true"]`. Use `adapter-node`, port 4317, upstream
4417, baseline upstream 4517, TLS 4617. Write the fixture's `run.json` with
the same scenarios as astro's and a `cookie-yes` config derived from
`astro-cookie-yes-*.json`. Put the fixture under version control in your
private copy and include the diff as a patch file in your lane directory so
it can be upstreamed to CookieBench later. If something in the fixture
contract is unclear, read `packages/fixture-support/src/*.ts` and the astro
fixture's `src/pages/index.astro`; do not guess selectors.

## Report

Write `/home/kaylee/.t3/scratch/lcp-fleet/reports/frameworks-<lane>.md`.
Follow the shape of `reports/nuxt.md`: a scorecard against the targets at
the top, then one table per profile with every arm, then the waterfall byte
breakdown, then "what is left" (what would have to change in c15t or the
fixture to meet each missed target, with KB and ms estimates at the slope
you measured), then the run ledger with control FCP and load per run, then
caveats and artifacts. State every number you could not get and why. Do not
round the interval away. Keep prose short; numbers in tables.

Also leave a one-paragraph summary at the top with the headline: does c15t
on this framework meet the bar today, and if not, by how much and why.
