# Round 8 on the M1: setup

Setup finished 2026-11-04 22:35 local. Everything below is built, installed and smoke-tested. Measurement lanes do no setup: source `env.sh`, pick a config, and call `cb-run.sh`.

## Status

| Item | Result |
| --- | --- |
| Toolchain | Node 24.21.0, Bun 1.3.11 (private), pnpm 11.25.0 |
| `ec quiet` | Stopped 0 dev processes and 6 Docker containers (listed below) |
| c15t canary `d4803ef60` | Built, 14 tarballs in `packs/canary/` |
| c15t instant-commit `ad86f4805` | Built, 14 tarballs in `packs/instant-commit/`, worktree trimmed to 143 MB |
| CookieBench worktree (`kaylee/round8-m1` @ `7b5bbb0`) | Installed against canary tarballs; 4 fixtures built |
| tanstack ic copy | Installed against instant-commit tarballs; fixture built |
| Smoke, c15t mobile `load` ×1 | 4/4 fixtures passed (plus tanstack ic: passed) |
| Smoke, CookieYes mobile `load` ×1 | 4/4 fixtures passed (registered host works) |
| sveltekit correctness pass | **11/12 verified.** `withdraw` fails, and astro fails it the same way on canary. Not a fixture fault, so no fixture change and no commit |
| Disk free after setup | 18 GiB |

## Paths

| What | Path |
| --- | --- |
| Lane root | `/Users/kayleewilliams/.t3/scratch/lcp-fleet` (`$LCP`) |
| Environment | `$LCP/env.sh`, sourced by every lane shell and script |
| Shared tools | `$LCP/tools/bin/` (`cb-run.sh`, `make-configs.py`, `smoke-table.py`, `pack.sh`, `closure.mjs`, `prepare-cookiebench.mjs`) |
| Bun 1.3.11 | `$LCP/tools/bun/bin/bun` (`BUN_INSTALL=$LCP/tools/bun`) |
| pnpm 11.25.0 | `$LCP/tools/pnpm/node_modules/.bin/pnpm` |
| Node 24.21.0 | `/Users/kayleewilliams/.local/share/fnm/node-versions/v24.21.0/installation/bin/node` |
| c15t canary worktree | `$LCP/c15t-canary` (detached at `d4803ef6037385a59e633f8f857b609e85850ffa`, built, clean) |
| c15t instant-commit worktree | `$LCP/c15t-instant-commit` (detached at `ad86f4805ce82d7484d1d7abd313c22eb884b158`; `node_modules`, `dist`, `dist-types` deleted) |
| Canary tarballs | `$LCP/packs/canary/` + `packs.tsv` (name, path, bytes), `packs.head`, `packs.status` (empty = clean) |
| Instant-commit tarballs | `$LCP/packs/instant-commit/`, same files |
| CookieBench (shared, canary) | `$LCP/cookiebench` (`$CB`), git worktree of `~/Desktop/cookiebench`, detached at `origin/kaylee/round8-m1` = `7b5bbb0` |
| CookieBench (tanstack ic arm only) | `$LCP/cookiebench-ic`, rsync copy (no `.git`) with only `packages/`, `benchmarks/with-c15t-tanstack-start`, `benchmarks/profiles`; 320 MB |
| Lane configs | `$LCP/frameworks/<lane>/configs/` |
| Lane runs | `$LCP/frameworks/<lane>/runs/` (setup's smoke/verify dirs are already there; ledgers not started) |
| Reports | `$LCP/reports/` (empty) |
| Setup logs | `$LCP/logs/` (installs, builds, `ec-quiet.log`, smoke and verify stdout) |
| Desktop lane scripts (waterfall, attribution, tables) | `$CB/round8/desktop-lanes/<lane>/bin/`, with Linux paths. Copy the logic, not the paths |

## Toolchain

```bash
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
# node v24.21.0, bun 1.3.11, pnpm 11.25.0, TMPDIR=/tmp, $LCP, $CB
```

`env.sh` sets `TMPDIR=/tmp`. The runner's lock is `path.join(os.tmpdir(), "cookiebench-v3-measurement.lock")`, and macOS's default `TMPDIR` is a per-user `/var/folders/...` path. With `TMPDIR=/tmp`, every lane uses the brief's `/tmp/cookiebench-v3-measurement.lock`. **Every lane must source `env.sh`**, or its runs bypass the shared lock.

Never use the system bun (`~/.bun/bin/bun`, 1.3.14) in a c15t checkout: it rewrites `bun.lock`. The Bun installer appended a completions line for the private bun to `~/.zshrc`. I removed it, so `~/.zshrc` is back to its previous contents (backup at `$LCP/tools/zshrc.bak`).

Playwright Chromium: CookieBench 1.63.0 uses `chromium-1243` from `~/Library/Caches/ms-playwright` (already installed; the smokes ran on it).

## `ec quiet` (22:13, once)

Stopped 0 dev processes and 6 containers:
`inth-fix-project-slug-alias-edb55e72fba8-{postgres,clickhouse,mysql}-1` and `inth-t3-433c33de-f2a9e87e7f77-{postgres,mysql,clickhouse}-1`.
Busiest afterwards: OrbStack 45%, Google Chrome 35% + 25%, cli-proxy-api 22%, executor 13%. The 1-minute load during setup ranged from 4.2 to 7.8; at idle it sits around 5–6.

## c15t builds

```bash
cd ~/.t3/projects/c15t-private && git fetch origin
git worktree add --detach $LCP/c15t-canary d4803ef60
cd $LCP/c15t-canary && bun install --frozen-lockfile
bun run turbo run build --filter='c15t...' --filter='@c15t/browser...' \
  --filter='@c15t/svelte...' --filter='@c15t/astro...' --concurrency=4 --output-logs=errors-only
$LCP/tools/bin/pack.sh $LCP/c15t-canary $LCP/packs/canary
```

The same steps ran for `ad86f4805` into `$LCP/c15t-instant-commit` and `packs/instant-commit`. Then I deleted that worktree's `node_modules`, `dist` and `dist-types` (3.7 GB → 143 MB). To repack it you must `bun install --frozen-lockfile` and build again.

`pack.sh` runs `bun pm pack --ignore-scripts` over the workspace closure of `c15t`, `@c15t/browser`, `@c15t/svelte` and `@c15t/astro` (`closure.mjs`: deps, optional deps and peer deps). `c15t` alone reaches 13 packages; `@c15t/browser` is the 14th. Each tarball is checked for leftover `workspace:` ranges and for a `dist/` directory. Turbo shared the main checkout's cache, so both builds took about 22 s.

### Tarballs (name, file, bytes)

| Package | canary `d4803ef60` | bytes | instant-commit `ad86f4805` | bytes | Same? |
| --- | --- | ---: | --- | ---: | --- |
| `@c15t/astro` | `c15t-astro-9a5dd3d2aeeb.tgz` | 80807 | `c15t-astro-9a5dd3d2aeeb.tgz` | 80807 | same |
| `@c15t/browser` | `c15t-browser-6b95fcc6e017.tgz` | 977658 | `c15t-browser-46feac91d083.tgz` | 978049 | differs |
| `@c15t/core` | `c15t-core-2037ef1fc1f2.tgz` | 484314 | `c15t-core-ca3321433e89.tgz` | 493142 | differs |
| `@c15t/dev-tools` | `c15t-dev-tools-169c92054f53.tgz` | 29516 | same file name | 29516 | same |
| `@c15t/iab` | `c15t-iab-60aba50d0654.tgz` | 61257 | `c15t-iab-028f9d2617fc.tgz` | 61133 | differs |
| `@c15t/nextjs` | `c15t-nextjs-7cc721955122.tgz` | 64734 | `c15t-nextjs-f64bf2699c4e.tgz` | 68948 | differs |
| `@c15t/react` | `c15t-react-5390120659a6.tgz` | 182645 | `c15t-react-779b39adf006.tgz` | 203886 | differs |
| `@c15t/schema` | `c15t-schema-8156d6e4482f.tgz` | 106633 | same file name | 106633 | same |
| `@c15t/svelte` | `c15t-svelte-6548800f9057.tgz` | 123647 | `c15t-svelte-f51e4f65206d.tgz` | 123602 | differs |
| `@c15t/tanstack-start` | `c15t-tanstack-start-9658ab6d9c7e.tgz` | 46783 | same file name | 46783 | **same** |
| `@c15t/translations` | `c15t-translations-35e48add52db.tgz` | 127011 | same file name | 127011 | same |
| `@c15t/ui` | `c15t-ui-bb7e45e9b883.tgz` | 169599 | `c15t-ui-83075bf89b6b.tgz` | 178911 | differs |
| `@c15t/vue` | `c15t-vue-b8e15bbdd3d6.tgz` | 110145 | same file name | 110145 | same |
| `c15t` | `c15t-0f5ed5318f6c.tgz` | 161789 | `c15t-0d1fdf8118c9.tgz` | 161789 | differs |

For the tanstack lane: `@c15t/tanstack-start` is byte-identical between the arms. `@c15t/react`, `@c15t/core` and `@c15t/ui` differ, and the fixture pulls all three. Whether the tanstack path reaches the instant-commit code is still for the lane's tarball diff to settle.

## CookieBench

```bash
cd ~/Desktop/cookiebench && git fetch origin
git worktree add ~/.t3/scratch/lcp-fleet/cookiebench origin/kaylee/round8-m1
node $LCP/tools/bin/prepare-cookiebench.mjs $CB $LCP/packs/canary/packs.tsv
cd $CB && pnpm install --no-frozen-lockfile --reporter=append-only
```

`prepare-cookiebench.mjs` makes two changes:
- It appends `autoInstallPeers: false` and an `overrides:` block to `pnpm-workspace.yaml`, mapping all 14 packages to `file:` tarball paths.
- It sets the c15t deps of the four fixtures' `package.json` to the same `file:` specs.

It can be re-run: it replaces its own block. All c15t packages in `node_modules/.pnpm` resolve to `packs/canary` tarballs, and no npm-resolved c15t remains. The remaining peer warnings are unrelated (typescript 6 vs `^5` in astro tooling, `redis` for `@effect/platform-node`).

**Uncommitted changes in `$CB`, which you must keep:** the four fixtures' `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml`. Do not `git checkout`, `git stash` or `pnpm install --frozen-lockfile` in `$CB`; that would point the fixtures back at npm 3.0.0 or 3.2.2. Do not run `pnpm install` in `$CB` while another lane is measuring.

`$LCP/cookiebench-ic` got the same treatment with `packs/instant-commit/packs.tsv`. It started from the branch's committed `pnpm-workspace.yaml`, lockfile and tanstack `package.json`, so it carries the branch's tanstack fixture including the `consentRequestMiddleware()` removal.

### Fixtures

All were built with the fixture's own `pnpm run build`; the logs are `$LCP/logs/build-<fixture>.log`. The runner starts and stops each server itself from `server.start` in the config, so lanes never start fixture servers by hand.

| Lane | Fixture dir | Build output | Proxy | Upstream | Baseline upstream | TLS (CookieYes) |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| script | `$CB/benchmarks/with-c15t-script` | `dist/` (static) | 4310 | (4410 brief; static, unused) | n/a | 4610 |
| astro | `$CB/benchmarks/with-c15t-astro` | `dist/`, `dist-baseline/` | 4315 | 4415 | 4515 | 4615 |
| tanstack (canary + CookieYes) | `$CB/benchmarks/with-c15t-tanstack-start` | `dist/` | 4316 | 4416 | n/a | 4616 |
| tanstack (ic arm) | `$LCP/cookiebench-ic/benchmarks/with-c15t-tanstack-start` | `dist/` | 4316 | 4416 | n/a | (CookieYes runs from `$CB`) |
| sveltekit | `$CB/benchmarks/with-c15t-sveltekit` | `build/`, `build-baseline/` | 4317 | 4417 | 4517 | 4617 |

Executor holds 4312. Something else listens on `*:4321`; it isn't ours, so leave it. The two tanstack copies share ports, which is fine because the lock serialises runs.

To rebuild one fixture: `df -h ~` first, then `cd <fixture dir> && pnpm run build` (sveltekit and astro build the baseline first, then c15t).

CookieYes needs no `/etc/hosts` entry. Its configs set `resolveHost: "127.0.0.1"` on `https://benchmarks-with-cookie-yes.vercel.app:<port+300>`, and the runner passes `--host-resolver-rules=MAP ... 127.0.0.1` to Chromium (`packages/runner/src/host-resolution.ts`). The CookieYes smokes below prove it works here.

## Configs

Generated by `python3 -I $LCP/tools/bin/make-configs.py` from `$CB/results/2026-10-15-matrix-rerun/configs`. Changes from October:
- `server.cwd` is absolute, and the runner-side `build` is dropped.
- c15t configs keep only the framework's baseline and c15t fixtures. The c15t fixture is tagged `version: canary-d4803ef60` (or `ic-ad86f4805`).
- Mobile c15t configs add `preferences` and `returning-accepted` from the fixture's `run.json`, with the matrix's mobile windows (deadline ≥ 10 s, load observation ≥ 10 s).
- sveltekit has no October config. Its c15t config is the `run.json` fixtures plus October astro's scenarios and profiles. Its CookieYes config is October `astro-cookie-yes-*` with ids, ports (4315/4415/4515/4615 → 4317/4417/4517/4617) and the adapter-node entries swapped.

Desktop profile is `desktop-article-v1-browser-ua`, as October had it. Iterations, warm-ups and seed go on the command line.

| Lane | c15t mobile | c15t desktop | CookieYes mobile / desktop | Scenarios |
| --- | --- | --- | --- | --- |
| script | `frameworks/script/configs/c15t-canary-mobile.json` | `c15t-canary-desktop.json` | `cy-mobile.json` / `cy-desktop.json` | c15t mobile: load accept reject save preferences returning-accepted; desktop and CookieYes: load accept reject save |
| astro | `frameworks/astro/configs/c15t-canary-mobile.json` | `c15t-canary-desktop.json` | `cy-mobile.json` / `cy-desktop.json` | same |
| tanstack | `frameworks/tanstack/configs/c15t-canary-mobile.json`, `c15t-ic-mobile.json` | `c15t-canary-desktop.json`, `c15t-ic-desktop.json` | `cy-mobile.json` / `cy-desktop.json` | same |
| sveltekit | `frameworks/sveltekit/configs/c15t-canary-mobile.json` | `c15t-canary-desktop.json` | `cy-mobile.json` / `cy-desktop.json` | same |

Correctness configs (each fixture's `run.json` verbatim, all scenarios, its own desktop profile, cwd absolute): `frameworks/{sveltekit,astro,tanstack}/configs/verify-runjson.json`.

Fixture ids: script `script-tag-baseline-inth-init` / `script-tag-c15t-inth-init`, CookieYes `script-tag-baseline-inth-init-registered-host` / `script-tag-cookie-yes`. astro `astro-baseline` / `astro-c15t`, `astro-baseline-registered-host` / `astro-cookie-yes`. tanstack `tanstack-start-baseline` / `tanstack-start-c15t`, `tanstack-start-baseline-registered-host` / `tanstack-start-cookie-yes`. sveltekit `sveltekit-baseline` / `sveltekit-c15t`, `sveltekit-baseline-registered-host` / `sveltekit-cookie-yes`.

## Running

```bash
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
# cb-run.sh <lane> <config> <scenario|-> <iterations> <warmups> <label> [verify]
caffeinate -dims $LCP/tools/bin/cb-run.sh astro $LCP/frameworks/astro/configs/c15t-canary-mobile.json load 15 3 c15t-mobile-load
```

`cb-run.sh` does the following:
- Copies the config into `frameworks/<lane>/runs/<label>-<stamp>/`.
- Waits for the 1-minute load to be ≤ 6 (`GATE`), for up to 30 min, then notes it in `meta.txt` and goes.
- Runs with seed 20261009 and retries every 20 s on "Another measured workload is active".
- Samples `sysctl vm.loadavg` every 30 s into `loadavg.txt` (`epoch 1m 5m 15m`).
- Writes `meta.txt` (ends with `exit=<code> max_load=<max 1m sample>`), `started`, `ended`, `envelope.json`, `run.stdout.json` and `run.stderr.log`.
- Writes `compare-<metric>.json` for page.lcp, page.fcp, initial.transfer, initial.requests, initial.long-task-blocking, banner.visible, action.input-to-next-paint, action.consent-effective, action.dismissed, action.scripts-complete and action.preferences-visible.

It prints the run dir on its last line. `NO_GATE=1` skips the gate (setup used it for the smokes only). A 7th argument, `verify`, runs `capabilities verify`.

Discard rules (BRIEF-M1): `max_load` > 10; control FCP median > 400 ms on mobile for a server-rendered fixture; any failed sample, except a control's `required-measurement-unavailable` on action scenarios. Each lane writes its own `runs/ledger.log`; setup did not start any ledger.

Quick per-sample table for any run dir: `python3 -I $LCP/tools/bin/smoke-table.py <run-dir>...`

## Smoke results (mobile-article-v1, `load`, 1 iteration, 0 warm-ups, no gate; not measurements)

| Lane | Fixture | Status | FCP ms | LCP ms | banner.visible ms | initial bytes | requests | TBT ms | Max 1-min load |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| script | c15t (`inth-init`) | passed | 256 | 3316 | 1561 | 587863 | 9 | 0 | 5.27 |
| script | control | passed | 240 | 2856 | n/a | 499392 | 6 | 0 | |
| astro | c15t | passed | 260 | 3204 | 263 | 574597 | 11 | 0 | 5.15 |
| astro | control | passed | 228 | 2840 | n/a | 497948 | 4 | 0 | |
| tanstack | c15t canary | passed | 272 | 3760 | 269 | 705157 | 18 | 0 | 4.27 |
| tanstack | control | passed | 236 | 3312 | n/a | 589703 | 7 | 0 | |
| tanstack | c15t ic `ad86f4805` | passed | 252 | 3740 | 264 | 702422 | 17 | 0 | 6.31 |
| tanstack | control (ic build) | passed | 244 | 3316 | n/a | 589626 | 7 | 0 | |
| sveltekit | c15t | passed | 284 | 3548 | 227 | 656074 | 28 | 6 | 4.82 |
| sveltekit | control | passed | 236 | 3160 | n/a | 532939 | 15 | 0 | |
| script | CookieYes | passed | 240 | 3048 | 1127 | 529696 | 15 | 0 | 5.59 |
| script | control (registered host) | passed | 256 | 2864 | n/a | 499392 | 6 | 0 | |
| astro | CookieYes | passed | 248 | 3020 | 1097 | 528267 | 13 | 0 | 4.52 |
| astro | control (registered host) | passed | 240 | 2852 | n/a | 497948 | 4 | 0 | |
| tanstack | CookieYes | passed | 244 | 3500 | 1212 | 620070 | 16 | 0 | 4.18 |
| tanstack | control (registered host) | passed | 244 | 3316 | n/a | 589703 | 7 | 0 | |
| sveltekit | CookieYes | passed | 232 | 3324 | 1103 | 563317 | 24 | 0 | 6.13 |
| sveltekit | control (registered host) | passed | 232 | 3176 | n/a | 532939 | 15 | 0 | |

One iteration each, so the numbers only show that every arm loads, renders the banner and records every metric. Every control FCP is under 400 ms. tanstack canary SSR works: the branch's `consentRequestMiddleware()` removal is in the build.

Run dirs: `frameworks/<lane>/runs/smoke-c15t-mobile-load-*`, `smoke-cy-mobile-load-*`, `frameworks/tanstack/runs/smoke-ic-mobile-load-*`.

## sveltekit correctness pass

`cb-run.sh sveltekit .../verify-runjson.json - 1 0 verify-runjson verify`: `capabilities verify`, 1 attempt per scenario, the fixture's `run.json` profile (`desktop-article-v1`). Gate passed at load 4.21; max 1-minute load during the run was 7.75. Run dir: `frameworks/sveltekit/runs/verify-runjson-20261104-222518`.

| Scenario | Result |
| --- | --- |
| load | verified |
| accept | verified |
| accept-early | verified |
| accept-large | verified |
| reject | verified |
| save | verified |
| preferences | verified |
| withdraw | **unknown (0/1)**: `required-measurement-unavailable` (action.dismissed, action.consent-effective) + `followup:page-unresponsive` |
| returning-accepted | verified |
| returning-rejected | verified |
| reject-keyboard | verified |
| save-page-probe-100ms | verified |

**11/12. `withdraw` is not a fixture fault.** After the click, consent did flip to `rejected` and the banner was dismissed (`dismissedAt`/`effectiveAt` 244.6 ms). Then the page reloaded (`actionNavigated: true`), because c15t's `reloadOnConsentRevoked` defaults to on (`packages/core/src/runtime/assemble.ts:159`, `modules/revocation-reload.ts`). The runner can't time an action across a navigation.

The astro fixture is the contract's reference and also sets nothing. Run on the same canary tarballs, astro's `withdraw` fails identically: `frameworks/astro/runs/verify-withdraw-20261104-222843`, same two failure codes, `actionNavigated: true`. Earlier round-8 reports (`defer-fix.md`, `eager-graph.md`, `SYNTHESIS.md`) logged the same failure on canary for other frameworks.

Setting `reloadOnConsentRevoked: false` in the sveltekit fixture alone would make it diverge from every other fixture. So I left it, and nothing is committed on `kaylee/round8-m1`. `withdraw` is not in any lane's queue.

Contract checks beyond the scenarios: `build-baseline/` contains no `c15t` string (0 files; astro's `dist-baseline` has 4 hits). The fixture uses the astro selectors, `#reopen-preferences`, `/controlled/script` and `html[data-consent-ready="true"]`, which the verified scenarios exercise. The desktop's 7/12 was load; on this Mac every scenario except `withdraw` passes.

## Notes for the lanes

- **Load on this Mac idles at 5–6 with Chrome, OrbStack and agents**, close to the gate of 6. Expect gate waits. Setup did not close Chrome or OrbStack (not ours).
- The tanstack ic arm uses `$LCP/cookiebench-ic`. CookieYes for tanstack runs from `$CB`'s canary build, which serves `/baseline/?cmp=cookie-yes` and has no c15t in it.
- Waterfall, attribution and table scripts: `$CB/round8/desktop-lanes/<lane>/bin/` (`waterfall-*.mjs`, `attribute-run.ts`, `table.py`). They use Linux paths, `/proc/loadavg`, `sha256sum` and `stat -c`; on macOS use `sysctl -n vm.loadavg`, `shasum -a 256` and `stat -f %z`.
- Keep `$LCP/c15t-canary` as it is (3.7 GB, built). Delete `envelope.json` traces you no longer need; the smoke and verify dirs total about 5 MB.
