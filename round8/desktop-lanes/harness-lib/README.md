# CookieBench mobile LCP harness for c15t checkouts

Measures what a c15t checkout costs on CookieBench's Next.js fixture
(`benchmarks/with-c15t-nextjs`), mobile profile, `load` scenario, paired
against the no-CMP `/baseline` page served by the same build and server.

## Run it

```sh
/home/kaylee/.t3/scratch/lcp-fleet/harness/bench.sh <c15t-checkout> <port-base> [iterations]

# canary HEAD baseline, as run for the report
LABEL=baseline-c35b112b7 WATERFALL_VISITS=5 \
  /home/kaylee/.t3/scratch/lcp-fleet/harness/bench.sh \
  /home/kaylee/.t3/worktrees/c15t-private/t3-2b07ced9 4330 15
```

- `<port-base>` is the fixture proxy port. Next listens on `<port-base>+90`
  (the fixture's own pair is 4322/4412). Use your lane's assigned ports, for
  example `bench.sh ~/my-worktree 4340` uses 4340 and 4430. Set `NEXT_PORT`
  if your assigned Next port is not base+90. The script refuses 4322/4412 and
  ports already in use.
- `iterations` defaults to 15 pairs. Warm-ups default to 1 (`WARMUPS=`).
- 5 pairs is enough for a direction; use 15 for a claim.

Output: `work/<port-base>/out/<label>-<timestamp>/`, with `summary.md` (the
table), `envelope.json` (raw CookieBench samples), `compare-*.json`,
`waterfall.md` / `waterfall.json`, `html.md` / `html.json`, `run.json` (the
exact CookieBench config), `packs.tsv` (tarballs used), `checkout.diff`
(uncommitted changes in the checkout at run time), and every step's log.

Typical wall time when the measurement lock is free: c15t build 30 s with a
warm turbo cache (2–3 min cold), pack + install + `next build` about 25 s,
15 pairs about 6 min, waterfall about 1.5 min.

### Options (environment variables)

| Variable | Effect |
| --- | --- |
| `LABEL` | Output dir name. Default: short HEAD sha, `-dirty` if tracked files changed |
| `WARMUPS` | CookieBench warm-ups per arm, default 1 |
| `WATERFALL_VISITS` | Pairs for the waterfall script, default 3 |
| `SKIP_C15T_BUILD=1` | Reuse the checkout's existing `dist/` |
| `SKIP_RUN=1` | Stop after `next build` |
| `SKIP_WATERFALL=1` | Skip the Playwright waterfall |
| `PRIVATE_LOCK=1` | Do not queue on the machine-wide CookieBench lock (see below) |
| `LOCK_WAIT_MIN` | How long to wait for the lock, default 120 |
| `BUILD_CONCURRENCY` | turbo concurrency for the c15t build, default 4 |
| `WORK_DIR` | Private work dir, default `work/<port-base>` |
| `NODE24_BIN` | Node 24 binary; default resolved through `nub` from CookieBench's `.node-version` |

## What it does

1. **Toolchain.** Puts Node 24.21.0 (from `~/.cache/nub/node/24.21.0`), Bun
   1.3.11 and pnpm 11.25.0 (both installed once into `harness/tools/`) first
   on `PATH`.
2. **Build c15t** in the checkout: `bun install --frozen-lockfile` if there is
   no `node_modules`, then `bun run turbo run build --filter='c15t...'`.
3. **Pack** `c15t` and every public workspace package it reaches through
   dependencies, optional or peer dependencies (13 packages: c15t, astro,
   core, dev-tools, iab, nextjs, react, schema, svelte, tanstack-start,
   translations, ui, vue), with `bun pm pack --ignore-scripts`. That is the
   same walk as CookieBench's `packages/source-build`, minus the
   `prepack` hook, which only regenerates docs and would dirty the checkout.
   Tarballs are named by content hash so pnpm can't reuse a stale one.
4. **Consumer.** rsyncs CookieBench (without `.git`, `results`, or other
   fixtures) into `work/<port-base>/cookiebench`, points the fixture's `c15t`
   dependency and pnpm `overrides` at the tarballs (`autoInstallPeers: false`,
   as source-build does), and rewrites the ports in the fixture's
   `package.json` start script and `run.json` (`url`, `readinessUrl`,
   `serverEventsUrl`). Runs `pnpm install`, then checks that every installed
   c15t package's `package.json` is byte-identical to its tarball and that no
   registry copy is left.
5. `next build` in the private fixture.
6. **CookieBench**: writes `run.json` with the fixture's two fixtures, the
   `benchmarks/profiles/mobile.json` profile, only the `load` scenario,
   absolute `server.cwd`, and no runner-side build, then runs
   `node packages/cli/src/index.ts run --config run.json --scenario load
   --iterations N --warmups W`, followed by `cookiebench compare` for
   `page.lcp`, `page.fcp`, `initial.transfer` and `initial.requests`.
7. **Waterfall** (`lib/waterfall.mjs`): starts the fixture server itself,
   primes the proxy's Brotli cache with one unthrottled visit to each page,
   fetches the HTML and every `<script src>` chunk to describe them, then
   runs paired throttled visits and writes the per-request table.
8. `lib/summarize.mjs` prints the table.

## Which numbers come from which tool

| Number | Source |
| --- | --- |
| initial.transfer, initial.requests, FCP, LCP, banner.visible per arm | CookieBench envelope (`envelope.json`), median of the measured samples |
| Paired LCP / FCP / transfer / request deltas and intervals | `cookiebench compare` (paired percentile bootstrap, 95% when run without `--family`) |
| Per-request start, end, bytes, "finished before hero" | `lib/waterfall.mjs`, CDP `Network.*` events in my own Playwright session |
| Waterfall-visit LCP / FCP | `lib/waterfall.mjs`, `PerformanceObserver` in the page |
| HTML contents, chunk sizes | `lib/waterfall.mjs`, plain HTTP fetches against the running fixture |

CookieBench's envelope records each request's start time, bytes and
"finished" flag but no end time (`packages/runner/src/network.ts` keeps only
`startedAt`), so it cannot say what finished before the hero image. The
waterfall script reproduces the profile: 390x844, DPR 3, `isMobile`,
`hasTouch`, the profile's user agent, `Emulation.setCPUThrottlingRate` 4,
`Network.emulateNetworkConditions` 200,000 B/s down, 93,750 B/s up, 150 ms,
fresh context per visit. It does not reproduce CookieBench's readiness
gating, observers or CPU calibration, so its LCP values run close to but not
exactly on CookieBench's. Use CookieBench for the LCP delta and the waterfall
for the shape.

## Shared-machine behaviour

- The CookieBench runner allows one measured run per machine through
  `$TMPDIR/cookiebench-v3-measurement.lock` and exits at once if another run
  holds it. `bench.sh` retries every 20 s until it gets the lock
  (`LOCK_WAIT_MIN`, default 120). `waterfall.mjs` takes the same lock with the
  same protocol. So a bench never measures while another CookieBench run is
  measuring. Build, pack and install do not take the lock.
- `PRIVATE_LOCK=1` points `TMPDIR` at `work/<port-base>/tmp`, which skips the
  queue. Your run then shares CPU with whatever else is measuring. LCP here is
  bandwidth-bound, so paired deltas mostly hold, but say so when you report.
- Each port base gets its own work dir and a `flock` on it; two benches with
  the same port base refuse to run at once.
- The script kills only the fixture server it starts (by process group).
  The CookieBench runner manages its own server.
- The c15t checkout is changed only by its own build (`dist/`, generated
  `version.ts`, and turbo cache in the main worktree, as the repo intends).

## Toolchain notes

- No `npm`, no corepack. `~/.local/bin/pnpm` is not pnpm. The system Bun is
  1.4.3 and rejects c15t's frozen lockfile ("overrides in package.json
  changed"); Bun 1.3.11 accepts it. Both pinned tools are in
  `harness/tools/node_modules/.bin`, installed with the system Bun.
- Node 26 breaks the c15t build: `@c15t/ui`'s `tcm` step loads yargs 17's
  extensionless CJS file, which Node 26 treats as ESM (`require is not
  defined in ES module scope`). Node 24.21.0 builds cleanly. `nub` already
  resolves 24.21.0 inside CookieBench through its `.node-version`.
- Next infers `/home/kaylee` as the Turbopack workspace root because of
  `/home/kaylee/package-lock.json`, and embeds an absolute
  `/ROOT/.t3/scratch/...` path in one shared client chunk (`i.ab = ...`). It
  is the same in both arms, so it does not affect the delta, and its length
  depends on the work dir path, so absolute byte counts can differ by a few
  bytes between agents' work dirs. The fixture config is left as CookieBench
  ships it.
- Compression: the fixture proxy (`packages/fixture-support/src/serve.ts`)
  asks Next for identity bytes and compresses every compressible response
  itself, Brotli quality 11 or gzip by `Accept-Encoding`, cached by content
  hash. Chromium asks for br, so the HTML and every `_next/static` chunk,
  c15t's included, arrive as `br`; `courtyard.png` is sent identity.
  Next's own compression never reaches the browser. The first request for a
  new body pays the Brotli time, so CookieBench primes after readiness and
  the waterfall script does an unthrottled priming visit.
- Playwright 1.63's Chromium is already in `~/.cache/ms-playwright`
  (`chromium-1243`); no install was needed.

## Reading the results

- `cookiebench compare` gives an interval only when every pair is eligible.
  One incomplete sample (for example the hero still loading at the 5 s
  cutoff) turns it into `inconclusive` with no interval. `summary.md` then
  also prints a harness paired statistic over the complete pairs (median of
  differences, 95% percentile bootstrap, fixed seed). It is labelled as
  harness output, not CookieBench output.
- Check control FCP first. On a quiet machine it is 220–260 ms. If it is
  higher, the host was CPU-starved; `summary.md` prints a warning above 400
  ms. Under load (load average 20–28 on 16 threads) a run showed control FCP
  716 ms, 7 of 30 samples incomplete and a ±130 ms LCP interval.
- `initial.transfer` for c15t is bimodal: two dialog chunks (19 KB) start
  when the page `load` event fires, just after the hero image ends. They count
  as initial when they finish before CookieBench's cutoff (quiet machine) and
  not when they don't (loaded machine). They do not affect LCP. Use "bytes
  finished before hero end" from the waterfall for the LCP-relevant bytes.
- The fixture is HTTP/1.1 (six connections per host). Chrome's emulated
  150 ms latency is added when the response body completes, not to the
  headers, so `page.ttfb` and Resource Timing `responseStart` read 5–20 ms
  while each request's end still carries the 150 ms.
