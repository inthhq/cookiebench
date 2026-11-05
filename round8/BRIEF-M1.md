# Round 8 on the M1 MacBook: c15t on every CookieBench framework

This branch (`kaylee/round8-m1` of inthhq/cookiebench) is the hand-off from
the Linux desktop, where round 8 could not get a single clean run because
other sessions kept the load at 20–300. Everything runs on this Mac now.
This directory is not for merging; it carries the brief, the desktop lanes'
scripts for reference, the earlier reports, and two fixture changes that
are real and are committed on this branch:

- `benchmarks/with-c15t-sveltekit/`: a new SvelteKit fixture (adapter-node,
  ports 4317 / 4417 / 4517 baseline / TLS 4617), modelled on the astro one.
  Its correctness pass on the desktop verified 7 of 12 c15t scenarios at
  load 77; the rest timed out under load. Treat it as unproven until a quiet
  correctness pass passes 12/12.
- `benchmarks/with-c15t-tanstack-start/src/consent-state.ts`: the one-line
  removal of `consentRequestMiddleware()` from the server function. Canary
  c15t crashes at SSR with it ("Cannot destructure property 'headers' of
  'e.response'"); 3.0.0 did not. That is a c15t regression to fix
  separately, not a fixture problem. The baseline route is untouched.

Read `BRIEF-round8-desktop.md` for the goal, targets and report shape, and
`BRIEF-original.md` for the problem. `reports/` has every earlier lane
report; `frameworks-{astro,tanstack,script}.md` are the desktop's interim
reports for this round, with bytes and directional timings. The
`desktop-lanes/` scripts have Linux paths and systemd calls; copy the logic,
not the paths.

## What differs on the M1

- **Machine:** Apple M1 Pro, 8 cores, 16 GiB, macOS 26. October's CookieBench
  matrix (`results/2026-10-15-matrix-rerun`) was taken on an M1 Pro, so
  October's numbers are the closest reference, but take fresh controls and
  a fresh CookieYes on this machine; do not compare against the desktop's
  numbers or October's without saying so.
- **Disk: about 24 GiB free.** One c15t build, one set of tarballs, one
  CookieBench workspace, shared by every lane. No per-lane copies of
  CookieBench or c15t. Clean `dist-*`, traces and old envelopes you no
  longer need. Check `df -h ~` before every build.
- **Load:** baseline is about 7 with Chrome, OrbStack and agents. Run
  `ec quiet` once before measuring and report what it stopped. Gates for
  this machine: start a measured run only when the 1-minute load is at or
  below 6 (wait up to 30 min, then go and note it); discard if any 30-second
  sample during the run is above 10, if control FCP median is above 400 ms
  on mobile for a server-rendered fixture, or if any sample failed (a
  control's `required-measurement-unavailable` on action scenarios is
  expected). Wrap long queues in `caffeinate -dims`.
- **Ports:** 4312 is held by Executor; the Next.js fixture is not in this
  round, so leave it. Script 4310/4410, astro 4315/4415/4515/4615, tanstack
  4316/4416/4616, sveltekit 4317/4417/4517/4617.
- **Toolchain:** Node 24.21.0 via fnm (`fnm use 24.21.0`; Node 26 breaks the
  c15t build). Bun must be 1.3.11 for the c15t checkout (`BUN_INSTALL=~/.t3/scratch/lcp-fleet/tools/bun curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.11"`), never the system 1.3.14, which rewrites `bun.lock`. pnpm: whatever CookieBench's `packageManager` pins (use `corepack` or `npx pnpm@<version>`). Playwright Chromium 1243 is installed under `~/Library/Caches/ms-playwright`.
- **CookieYes:** the registered host `benchmarks-with-cookie-yes.vercel.app`
  resolves through the fixture server's `--tls-port` (port + 300); see
  `benchmarks/plans/matrix.ts` and October's configs under
  `results/2026-10-15-matrix-rerun/configs/`. `/etc/hosts` has no entry;
  check how October's runs resolved it here before adding one.

## Layout on the M1

- c15t: `~/.t3/projects/c15t-private` (origin inthhq/c15t-private). Lanes
  use a worktree at the pinned commit, never the project checkout itself.
  Pins: canary `d4803ef60` (origin/canary has moved on since, including a
  UI padding fix `eef7731fa`; stay on the pin for comparability), and
  `kaylee/instant-commit` `ad86f4805` (pushed to origin).
- CookieBench: `~/Desktop/cookiebench` (origin inthhq/cookiebench, main at
  `eee967e`). Make one worktree of this branch, `kaylee/round8-m1`, under
  `~/.t3/scratch/lcp-fleet/cookiebench`, and install once.
- Lane directory: `~/.t3/scratch/lcp-fleet/` with `tools/`, `packs/`
  (tarballs), `cookiebench/` (the worktree), `frameworks/<lane>/{runs,configs,bin}`,
  `reports/`. Ledger per lane at `frameworks/<lane>/runs/ledger.log`, one
  line per run: `<time> KEEP|DISCARD <label> <reason>`.

## Phases

**Setup lane** (one agent, first): toolchain; c15t worktree at `d4803ef60`,
`bun install --frozen-lockfile`, `bun run turbo run build --filter='c15t...'
--filter='@c15t/browser...' --filter='@c15t/svelte...' --filter='@c15t/astro...'`;
pack `c15t` and every workspace package it reaches with `bun pm pack
--ignore-scripts` into `packs/canary/` (the desktop's `harness-lib/bench.sh`
shows the dependency walk; 13 packages, plus `@c15t/svelte` and
`@c15t/browser` if not already reached). Same for `ad86f4805` into
`packs/instant-commit/` (only the tanstack lane needs it; build it in a
second worktree, then delete that worktree's `node_modules` and `dist` to
save disk). CookieBench worktree, `pnpm` overrides pointed at the canary
tarballs, `pnpm install`, build the four fixtures (`with-c15t-script`,
`with-c15t-astro`, `with-c15t-tanstack-start`, `with-c15t-sveltekit`), one
1-iteration smoke `load` per fixture, and a full correctness pass for
sveltekit. Write `~/.t3/scratch/lcp-fleet/SETUP.md` with every path, port,
command and the smoke results, so the measurement lanes do no setup.

**Measurement lanes** (four agents, after setup, one per framework): each
runs its queue behind CookieBench's lock (`/tmp/cookiebench-v3-measurement.lock`,
retry every 20 s) and the gates above, in this order: c15t mobile `load`
(15 pairs), CookieYes mobile `load`, c15t mobile `accept`, CookieYes
`accept`, c15t waterfall (3–5 pairs), then `reject`, `save`, `preferences`
and `returning-accepted` where the framework's config has them, then
desktop `load` for c15t and CookieYes. Seed 20261009, 3 warm-ups, 10
iterations for actions. The tanstack lane adds the `ad86f4805` arm for
`load` and `accept` (expect no change: the adapter never reaches the
instant-commit shell; confirm with the tarball diff).

Report: `~/.t3/scratch/lcp-fleet/reports/frameworks-<lane>.md` in the shape
of `reports/nuxt.md`, with the scorecard first. Write it after the first
kept `load` run and update it in place. The final message to the parent is
the full report text, not a summary, because the parent cannot read this
machine's files.

## Outcome

All four measurement lanes (astro, tanstack, script, sveltekit) completed on 2026-11-05.

- Final reports: `round8/reports/m1/frameworks-<lane>.md`. Shared setup notes: `round8/reports/m1/SETUP-m1.md`.
- Lane scripts and run configs: `round8/m1-lanes/<lane>/{bin,configs}/`. The shared runner wrapper and environment: `round8/m1-lanes/tools/{cb-run.sh,env.sh}`.

Two shared-tooling findings from the lanes:

1. When two runners poll at once, the stale-lock recovery in `packages/runner/src/lifecycle.ts` throws a raw `EEXIST` on `cookiebench-v3-measurement.lock.recovery` instead of reporting "Another measured workload is active". The shared `cb-run.sh` retries only on that message, so the run fails rather than waits.
2. The CookieYes adapter declares no `save` action, so every CookieYes `save` run fails with `unsupported-action`.
