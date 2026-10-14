# c15t 3.0.0, desktop and mobile, October 14 2026

The six c15t fixtures (React, Next.js, TanStack Start, Nuxt, Astro and Script) rerun on the stable `3.0.0` release. Plans, profiles, scenarios and seed match the alpha.11 run, recorded in commit `b3e4b4e` under `results/2026-10-11-alpha11-c15t/`. Only the c15t version, tarball, integrity and lockfile hash changed in each configuration.

Both runs used the same Apple M1 Pro (macOS 25.6.0), Chromium `153.0.8010.12` and Node `v24.21.0`. Collector hash `f359851e4f7b15d549e882d641cd3205f71af1a18aebd8f02f4fc5b2eb21eb1d` covers every 3.0.0 entry. The alpha.11 load envelopes used `c2520e37…`, before the runner fix that changed action windows and pre-run priming. Each version is paired with its own same-run baseline.

## Evidence

| Directory | Contents | Result |
| --- | --- | --- |
| `desktop/` | 15-pair loads and flow checks | 180/180 load pairs passed. 47/48 flow cells verified |
| `mobile/` | Same plan on the mobile profile | 180/180 load pairs passed. 48/48 flow cells verified |
| `desktop-nuxt-correctness-retry/` | Desktop Nuxt flows, run again | 8/8 flow cells verified |

The first desktop Nuxt accept read `unknown`, not failed. Its `POST /subjects` write to the Inth backend and the CORS preflight were still pending at the 1.5 s cutoff. About 1.8 s after the write started, c15t loaded its write retry queue chunk. The fixture server compressed that chunk on demand, which marks the sample `server-cold-encoding`. The retry used the same configuration and collector. The original attempt remains in `desktop/`.

## Results

LCP cost is the median of paired differences against the framework baseline, with a 95% family-wise interval.

| Framework | Desktop alpha.11 | Desktop 3.0.0 | Mobile alpha.11 | Mobile 3.0.0 | Transfer added, 3.0.0 |
| --- | --: | --: | --: | --: | --: |
| React | +16 [16, 20] | +16 [16, 20] | +532 [520, 552] | +532 [508, 548] | 95.2 KB |
| Next.js | +8 [8, 16] | +16 [8, 24] | +400 [396, 400] | +400 [392, 404] | 101.6 KB |
| TanStack Start | +20 [8, 20] | +4 [-4, 8] | +432 [428, 448] | +440 [424, 448] | 107.5 KB |
| Nuxt | +20 [8, 24] | +12 [4, 24] | +520 [504, 524] | +532 [516, 552] | 110.0 KB |
| Astro | +8 [4, 16] | +4 [-8, 16] | +336 [324, 340] | +332 [328, 336] | 69.4 KB |
| Script | +4 [4, 8] | +4 [4, 4] | +436 [428, 448] | +432 [428, 436] | 82.0 KB |

Intervals overlap for every framework and profile, so this run shows no clear LCP change from alpha.11. Transfer grew by 20 to 182 bytes per integration.

## Rebuild

```sh
node results/2026-10-14-v3-c15t/compare.mjs '{"v3-desktop":{"load":"results/2026-10-14-v3-c15t/desktop","flows":"results/2026-10-14-v3-c15t/desktop"}}'
```

`compare.mjs` reads the recorded reports and comparisons only. `comparison.json` holds its output for both alpha.11 profiles (extracted before those raw files left the tree), both 3.0.0 profiles and the Nuxt retry.
