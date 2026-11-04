# Lane `remeasure`: commit-path numbers on a quieter machine

## Summary

- **Next.js mobile `load`:** commit path `fd020fd7c` +64 ms LCP (56 to 72), canary +404 (396 to 412), CookieYes +184 (172 to 192). The commit-path lane measured +64, +400 and +176 (competitors lane).
- **Next.js action scenarios:** every kept commit-path sample is under 1,000 ms from the tap. The highest are 644 ms (`preferences` preferences-visible) and 345 ms (`accept` scripts-complete).
- **Next.js probe, Accept at 1.0 s:** commit path's last gated script runs 1,035 ms after the tap (median). All 5 reps are over 1,000 ms (1,016 to 1,344), and consent itself is over 1,000 ms in 1 of 5 reps (1,167). The commit-path lane measured 1,041. Canary is at 1,422 here.
- **Next.js returning visitors (probe, cold cache):** commit path 2,547 ms to the first gated script, canary 2,404. That is +143 ms; the commit-path lane measured 2,681 vs 2,429 (+252).
- **React mobile `load`:** commit path `ca5fa8eeb` +292 ms LCP (284 to 296), base `267563fa4` +276 (248 to 288), canary +588 (576 to 596), CookieYes +116 (104 to 136). The commit-path lane measured +288 and +276.
- **React `accept`:** commit path consent-effective 266 ms (max 272), scripts-complete 357 (max 361). Base scripts-complete is 1,001 ms (max 1,190), over 1,000.

## Setup

- **Machine:** the same AMD Ryzen 7 2700 the other lanes used, with Chromium from Playwright 1.63.0 and Node 24.21.0. Two or more other agents were running test suites during the session. Load reached 30–43 at times; see the run log.
- **Session:** Next.js ran 15:47–19:17 on 2026-11-03, React 19:17–00:47, and the Accept-at-2.5 s probe reruns 00:47–02:03. A T3 server restart at about 20:45 killed the React queue in the middle of `react-base` `accept`. That run was moved to `remeasure/runs/_aborted/`, and the rest resumed at 20:53 in a systemd user unit.
- **Settings:** seed 20261009, 3 warm-ups, 15 pairs for `load` and 10 iterations for actions, on every arm. Each run includes its control, so every run has its own control FCP.
- **Lock:** every run took `/tmp/cookiebench-v3-measurement.lock`. CookieBench runs took it through the runner. The probes used `probe.mjs`'s own lock, with its retry interval changed from 10 s to 20 s; that is the only change from `commit-path/bin/probe.mjs`.
- **Load gate:** before each attempt the queue waited for a 1-minute load under 4 (up to 30 min). This was added after the first attempt hit load 18 within 30 s; that attempt is in `runs/_aborted/`.
- **Ports:** 4900–4924. Ports are not compiled into the Next or Vite builds (checked), so each config carries its own server start command. No consumer files were edited.

### Consumers and configs (no rebuilds)

None of these consumers has a `head.txt`. Provenance was checked as follows.

| Arm | Consumer | How the commit was checked |
| --- | --- | --- |
| Next.js canary `c35b112b7` | `commit-path/work-canary` | Its tarballs are byte-identical to `react-competitors/packs/canary/`, whose `head.txt` is `c35b112b7…` |
| Next.js commit path `fd020fd7c` | `commit-path/work-cand2` | Built at 14:26:07 from worktree `t3-6d4b6b88`, 1 s after `fd020fd7c` was committed (14:26:06), clean tree. Its `@c15t/react` tarball has no `warmDialogChunk` in `deferred/shell.js`, which is that commit's change (3 occurrences at `de8de11db`, 0 at `fd020fd7c`) |
| Next.js CookieYes | `competitors/cookiebench`, config `competitors/configs/nextjs-cookie-yes-mobile.json` | October config, after hydration (`--after-hydration cookie-yes`) |
| React canary `c35b112b7` | `react-competitors/consumers/canary` | `react-competitors/packs/canary/head.txt` |
| React base `267563fa4` | `react-competitors/consumers/shell-v5` | Its `@c15t/react` and `@c15t/core` tarballs are byte-identical to `commit-path/react-bench/work/rbase/packs/` (`head.txt` `267563fa4`) |
| React commit path `ca5fa8eeb` | `commit-path/react-bench/work/rcand` | `build/head.txt` `ca5fa8eeb…`, `checkout.diff` empty |
| React CookieYes | `react-competitors/consumers/stock`, config `react-competitors/configs/react-cookie-yes-mobile.json` | October config, head-start, as react-competitors ran it |

- **c15t configs:** each consumer's own `run.json` with the profile swapped in, as the commit-path lane used them. That gives a 5 s `load` window and a 5 s action deadline. The CookieYes configs are October's, with a 10 s window. LCP lands at about 3.5 s, inside both windows.
- **Mobile profile:** `mobile-article-v1`, identical to the profile in the October configs (diffed).
- **Desktop profile:** `desktop-article-v1-browser-ua`, taken from `competitors/configs/nextjs-cookie-yes-desktop.json`.

### Discard rules (as briefed)

- **Control FCP:** a mobile run is discarded if its control FCP median exceeds 400 ms (Next.js) or 800 ms (React).
- **Load:** a run is discarded if any 1-minute load sample taken while that run held the lock exceeds 8. Samples are tagged with the lock owner's PID, so time spent waiting for the lock is excluded.
- **Failed samples:** a run is discarded on any failed sample. One exception: on action scenarios the no-CMP control has no banner to act on, so its `required-measurement-unavailable` samples are expected and are not counted.
- **Probes:** they have no control, so for them only the load and failed-rep rules apply. Load is sampled every 30 s and most probe cases finish in 40–80 s, so each probe case has 1–2 load samples.

### Commands

From `/home/kaylee/.t3/scratch/lcp-fleet/remeasure`:

```sh
bin/mkcfg.py <c15t-next|c15t-react|competitor> <fixture-dir|config> <scenario> <mobile|desktop> <old=new ports> configs/<name>.json <label>
bin/queue-next.sh; bin/queue-react.sh            # after the restart: bin/resume-react.sh; then bin/extra.sh
# each job: bin/run.sh <config> <scenario> <N> <label> <cookiebench-dir>
#   = node packages/cli/src/index.ts run --config <cfg> --scenario <s> --iterations N --warmups 3 --seed 20261009
# then bin/check.py <run> <400|800|none>
# probes: bin/probe-run.sh rm <arm> <fixture> <proxy> <next> <case> -- --reps 5 --wait 6000 [--tap 1000 | --tap 2500 | --scroll 1800 --tap 2800 | --returning warm|cold]
python3 bin/summarize.py next|react
```

**Intervals:** the LCP interval is my own 95% paired percentile bootstrap (20,000 resamples, seed 20261009). For every `load` row, `cookiebench compare`'s interval is shown next to it; compare labels its interval level 0.975.

## Next.js, mobile-article-v1

### `load`, 15 pairs

| Arm | LCP Δ (95% CI) | compare CI | FCP Δ | banner.visible | Control FCP / LCP | Passed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| canary `c35b112b7` | **+404 (+396 to +412)** | +396 to +412 | +24 | 247 | 244 / 3,452 | 15/15 |
| commit path `fd020fd7c` | **+64 (+56 to +72)** | +56 to +72 | +16 | 242 | 252 / 3,452 | 15/15 |
| CookieYes hosted, after hydration | **+184 (+172 to +192)** | +172 to +196 | +8 | 2,377 | 248 / 3,452 | 15/15 |

### Action scenarios, 10 iterations

Median (max), ms from the tap. `scripts-complete` is n/a for `reject` and `reject-keyboard`, where no gated script should run. `preferences` adds `preferences-visible`, given here in the consent-effective column with a label.

| Scenario | Arm | input-to-next-paint | dismissed | consent-effective | scripts-complete | Passed |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| accept | canary | 40 (56) | 40 (55) | 40 (55) | 261 (264) | 10/10 |
| accept | commit path | 32 (56) | 29 (48) | **317 (343)** | **320 (345)** | 10/10 |
| accept | CookieYes | 24 (32) | 19 (24) | 19 (24) | 188 (195) | 10/10 |
| reject | canary | 44 (64) | 41 (64) | 41 (64) | n/a | 10/10 |
| reject | commit path | 32 (40) | 25 (35) | **306 (334)** | n/a | 10/10 |
| reject-keyboard | canary | 32 (32) | 29 (31) | 29 (31) | n/a | 10/10 |
| reject-keyboard | commit path | 16 (24) | 15 (18) | **299 (309)** | n/a | 10/10 |
| preferences | canary | 40 (56) | 40 (54) | preferences-visible 454 (466) | n/a | 10/10 |
| preferences | commit path | 32 (48) | 29 (42) | preferences-visible **626 (644)** | n/a | 10/10 |
| save | canary | 40 (152) | 33 (130) | 33 (130) | 182 (264) | 10/10 |
| save | commit path | 24 (32) | 52 (82) | **52 (82)** | **217 (242)** | 10/10 |

banner.visible in these runs: canary 241–247, commit path 243–252, CookieYes 2,401.

`returning-accepted` (warm, 10 iterations):

| Arm | First gated script from navigation | LCP Δ (own, 10 pairs) | Passed |
| --- | ---: | ---: | ---: |
| canary | 682 (925) | +2 | 10/10 |
| commit path | 734 (1,735) | +8 | 10/10 |

In the commit-path run, the 1,735 ms value is iteration 7. That sample's candidate FCP was 416 ms, against 264–296 in the other nine. The sample passed and the run met every rule, so it is kept. Without it, the commit-path max is 862.

### Probes

`probe.mjs`, 5 reps each, mobile throttling. Median (max), ms. "After tap" is measured from the tap; "first gated script" is measured from navigation.

| Probe | Arm | Consent after tap | Last gated script after tap | First gated script from navigation | Errors |
| --- | --- | ---: | ---: | ---: | ---: |
| Accept at 1.0 s | canary | 1,054 (1,418) | 1,422 (1,773) | 2,432 (2,776) | 0 |
| Accept at 1.0 s | commit path | **863 (1,167)** | **1,035 (1,344)** | 2,045 (2,356) | 0 |
| Accept at 2.5 s, run 1 | canary | 215 (291) | 494 (1,745) | 3,008 (4,271) | 0 |
| Accept at 2.5 s, run 1 | commit path | 370 (5,265) | 371 (5,445) | 2,882 (7,960) | 0 |
| Accept at 2.5 s, run 2 | canary | 103 (114) | 292 (304) | 2,792 (2,820) | 0 |
| Accept at 2.5 s, run 2 | commit path | **374 (384)** | **376 (386)** | 2,889 (2,899) | 0 |
| Scroll 1.8 s, Accept 2.8 s | canary | 105 (111) | 287 (298) | 3,100 (3,106) | 0 |
| Scroll 1.8 s, Accept 2.8 s | commit path | 93 (100) | 307 (310) | 3,110 (3,122) | 0 |

**Accept at 1.0 s, per rep** (consent after tap / last script after tap / page hydrated):

- canary: 1,418 / 1,773 / 2,247, 1,006 / 1,380 / 1,897, 1,054 / 1,433 / 1,937, 1,027 / 1,384 / 1,901, 1,066 / 1,422 / 1,936.
- commit path: 1,167 / 1,344 / 1,908, 860 / 1,032 / 1,602, 840 / 1,016 / 1,582, 925 / 1,097 / 1,662, 863 / 1,035 / 1,599.

**Accept at 2.5 s, run 1** passed every rule but has one outlier rep in each arm.

- **commit path, rep 0:** three first-load chunks of 3.9–9.5 KB (`turbopack-*.js`, `01fe381d…`, `2572ca6e…`) finished at 7.3–7.5 s; in the other reps they finished at 0.53–0.87 s. Hydration finished at 7,583 ms, and consent followed hydration.
- **canary:** two reps tapped late or ran scripts late, at 3,089 ms and 1,745 ms after the tap.

I reran both arms (run 2, tag `rm2`). Run 2 had no outliers.

### Returning visitor with a stored Accept

First gated script, ms from navigation, median (max).

| Source | canary | commit path | Difference |
| --- | ---: | ---: | ---: |
| CookieBench `returning-accepted`, warm, 10 iterations | 682 (925) | 734 (1,735) | +52 |
| Probe, `--returning warm`, 5 reps | 2,578 (2,625) | 2,540 (2,551) | −38 |
| Probe, `--returning cold`, 5 reps | 2,404 (2,476) | 2,547 (2,603) | +143 |

The probe's `warm` mode downloaded the 76.6 KB first-load chunk over the network in every rep, so it did not use the HTTP cache. Its numbers follow hydration (1.9–2.1 s), like the cold reps. Only the CookieBench row measures a warm cache.

### Desktop `load`, 15 pairs

| Arm | LCP Δ (95% CI) | compare CI | FCP Δ | banner.visible | Control FCP / LCP | Passed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| canary | +28 (+16 to +36) | +12 to +36 | +40 | 60 | 64 / 120 | 15/15 |
| commit path | +24 (+12 to +36) | +12 to +36 | +36 | 66 | 68 / 124 | 15/15 |

### Next.js against `reports/commit-path.md`

| Measure | commit-path lane | Here | Change |
| --- | ---: | ---: | ---: |
| `load` LCP Δ, commit path | +64 (52–72) | +64 (56–72) | 0 |
| `load` LCP Δ, canary | +400 (388–408) | +404 (396–412) | +4 |
| `load` LCP Δ, CookieYes (competitors lane) | +176 (168–188) | +184 (172–192) | +8 |
| `load` banner.visible, commit path | 250 | 242 | −8 |
| `accept` consent-effective (max) | 324 (384) | 317 (343) | −7 |
| `accept` scripts-complete (max) | 327 (392) | 320 (345) | −7 |
| `accept` dismissed / input-to-next-paint | 33 / 36 | 29 / 32 | −4 / −4 |
| `reject` consent-effective (max) | 300 (344) | 306 (334) | +6 |
| `reject-keyboard` consent-effective (max) | 308 (756) | 299 (309) | −9 (max −447) |
| `preferences` dismissed | 38 | 29 | −9 |
| `preferences` preferences-visible (max) | 644 (663) | 626 (644) | −18 |
| `save` consent-effective / scripts-complete | 57 / 221 | 52 / 217 | −5 / −4 |
| Probe, Accept at 1.0 s: consent / last script after tap | 870 / 1,041 | 863 / 1,035 | −7 / −6 |
| Probe, Accept at 1.0 s: first script from navigation | 2,049 | 2,045 | −4 |
| Probe, Accept at 2.5 s: consent / last script (run 2) | 378 / 379 | 374 / 376 | −4 / −3 |
| Probe, scroll then Accept: consent / last script | 96 / 318 | 93 / 307 | −3 / −11 |
| Returning warm (CookieBench), commit path / canary | 780 / 664 | 734 / 682 | −46 / +18 |
| Returning cold (probe), commit path / canary | 2,681 / 2,429 | 2,547 / 2,404 | −134 / −25 |
| Samples passed, commit path, all scenarios | 9, 9, 10, 10, 10, 10 | all 10/10 in kept runs | — |

**Next.js paragraph.**

- **Within 18 ms:** every commit-path median above moved 18 ms or less except two, the cold returning visitor and the warm returning visitor.
- **Maxima:** the `reject-keyboard` max fell from 756 to 309.
- **Cold returning gap:** the cold returning-visitor gap to canary is +143 ms here, against +252 there (commit path 2,681 → 2,547).
- **Warm returning:** commit path 780 → 734, so its gap to canary went from +116 to +52.
- **CookieBench scenarios:** no kept sample crosses 1,000 ms from the tap.
- **Accept at 1.0 s probe:** the last gated script crosses 1,000 ms in all 5 commit-path reps (median 1,035, range 1,016–1,344). Consent crosses it in 1 rep (1,167). Canary crosses it in all 5 reps for the last script and all 5 for consent (1,006–1,418).
- **Outlier:** one rep of the first Accept-at-2.5 s probe run reached 5,265 ms. It came from first-load chunks delivered 7 s late, not from the commit, and the rerun's max was 384.

## React (client-rendered fixture), mobile-article-v1

### `load`, 15 pairs

| Arm | LCP Δ (95% CI) | compare CI | FCP Δ | banner.visible | Control FCP / LCP | Passed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| canary `c35b112b7` | **+588 (+576 to +596)** | +576 to +596 | +440 | 1,255 | 736 / 3,364 | 15/15 |
| base `267563fa4` | **+276 (+248 to +288)** | +248 to +288 | +276 | 1,064 | 736 / 3,368 | 15/15 |
| commit path `ca5fa8eeb` | **+292 (+284 to +296)** | +284 to +296 | +284 | 1,081 | 736 / 3,368 | 15/15 |
| CookieYes head-start | **+116 (+104 to +136)** | +104 to +136 | +56 | 1,073 | 740 / 3,372 | 15/15 |

### `accept`, 10 iterations

Median (max), ms from the tap.

| Arm | input-to-next-paint | dismissed | consent-effective | scripts-complete | banner.visible | Passed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| canary | 32 (80) | 28 (79) | 28 (79) | 370 (396) | 1,304 | 10/10 |
| base | 32 (88) | 30 (84) | 570 (728) | **1,001 (1,190)** | 1,118 | 10/10 |
| commit path | 32 (40) | 33 (39) | **266 (272)** | **357 (361)** | 1,102 | 10/10 |
| CookieYes | 24 (32) | 16 (24) | 16 (24) | 185 (192) | 1,094 | 10/10 |

### `returning-accepted`, 10 iterations

| Arm | First gated script from navigation, median (max) | LCP Δ (own, 10 pairs) | Passed |
| --- | ---: | ---: | ---: |
| canary | 757 (870) | +70 | 10/10 |
| base | 1,013 (1,471) | +50 | 10/10 |
| commit path | 1,005 (1,095) | +54 | 10/10 |

### Desktop `load`, 15 pairs

| Arm | LCP Δ (95% CI) | compare CI | FCP Δ | banner.visible | Control FCP / LCP | Passed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| commit path | +16 (+4 to +28) | 0 to +28 | +16 | 241 | 72 / 136 | 15/15 |
| canary | +28 (+24 to +36) | +20 to +36 | +8 | 254 | 92 / 132 | 15/15 |

### React against `reports/commit-path.md`

| Measure | commit-path lane | Here | Change |
| --- | ---: | ---: | ---: |
| `load` LCP Δ, commit path | +288 (272–292) | +292 (284–296) | +4 |
| `load` LCP Δ, base | +276 (264–288) | +276 (248–288) | 0 |
| `load` LCP Δ, canary (react-competitors lane) | +592 (580–600) | +588 (576–596) | −4 |
| `load` LCP Δ, CookieYes (react-competitors lane) | +112 (100–128) | +116 (104–136) | +4 |
| `load` banner.visible, commit path / base | 1,099 / 1,091 | 1,081 / 1,064 | −18 / −27 |
| `load` control FCP, commit path run / base run | 740 / 748 | 736 / 736 | −4 / −12 |
| `accept` consent-effective (max), commit path | 266 (281) | 266 (272) | 0 |
| `accept` scripts-complete (max), commit path | 357 (362) | 357 (361) | 0 |
| `accept` consent-effective (max), base | 568 (607) | 570 (728) | +2 |
| `accept` scripts-complete (max), base | 994 (1,031) | 1,001 (1,190) | +7 |
| `accept` dismissed, commit path / base | 30 / 29 | 33 / 30 | +3 / +1 |
| `returning-accepted` first gated script, commit path / base | 1,004 / 1,005 | 1,005 / 1,013 | +1 / +8 |
| `returning-accepted` LCP Δ, commit path / base | +68 / +72 | +54 / +50 | −14 / −22 |
| Desktop `load` LCP Δ, commit path | not run | +16 (+4 to +28) | — |

**React paragraph.**

- **Medians:** every commit-path median moved 4 ms or less except two. `load` banner.visible moved −18 ms, and `returning-accepted` LCP Δ moved −14 ms (that one has no compare interval).
- **Taps:** no commit-path sample crosses 1,000 ms from the tap; the highest is 361 ms (`accept` scripts-complete).
- **Base:** base's `accept` scripts-complete median is 1,001 ms (max 1,190). Commit-path lane: 994 (1,031).
- **Returning visitors:** the commit path's first gated script is 1,005 ms from navigation, against 757 for canary. That figure is measured from navigation, not from a tap.
- **Desktop:** commit path +16 ms (+4 to +28), canary +28 (+24 to +36). The intervals overlap.

## Run log: control FCP and load

Load is the 1-minute average, sampled every 30 s while the run held the measurement lock. Control FCP is min / median / max over the run's control samples. Every row the queues ran is listed.

### Next.js

| Finished | Verdict | Run | Control FCP | Load median / max (samples) | Reason |
| --- | --- | --- | --- | --- | --- |
| 15:42 | ABORTED | next-canary-mobile-load | — | 18.4 at 30 s | Stopped by me after the first load sample; another agent's vitest run. Kept in `runs/_aborted/`, not used. |
| 15:51 | KEEP | next-canary-mobile-load | 228 / 244 / 256 | 1.76 / 2.5 (7) | — |
| 15:54 | KEEP | next-cand-mobile-load | 232 / 252 / 284 | 1.75 / 2.18 (7) | — |
| 16:01 | KEEP | next-cookieyes-mobile-load | 232 / 248 / 268 | 2.23 / 3.81 (13) | — |
| 16:04 | KEEP | next-canary-mobile-accept | 232 / 244 / 260 | 2.31 / 2.56 (5) | — |
| 16:07 | DISCARD | next-cand-mobile-accept | 232 / 244 / 264 | 2.01 / 2.37 (6) | 1 failed sample: c15t #4 `controls-not-ready`, `state-unavailable` |
| 16:11 | KEEP | next-cand-mobile-accept | 232 / 242 / 248 | 2.26 / 2.55 (6) | — |
| 16:14 | KEEP | next-cookieyes-mobile-accept | 236 / 252 / 256 | 2.12 / 2.21 (6) | — |
| 16:17 | KEEP | next-canary-mobile-reject | 236 / 248 / 256 | 2.0 / 2.84 (5) | — |
| 16:21 | KEEP | next-cand-mobile-reject | 232 / 244 / 252 | 2.06 / 2.57 (8) | — |
| 16:22 | KEEP | next-canary-mobile-preferences | 236 / 248 / 256 | 2.03 / 2.15 (2) | — |
| 16:24 | KEEP | next-cand-mobile-preferences | 232 / 250 / 260 | 2.12 / 2.24 (2) | — |
| 16:27 | DISCARD | next-canary-mobile-reject-keyboard | 248 / 250 / 276 | 2.01 / 23.9 (5) | load 23.9; 2 failed: #6 `followup:banner-missing`, #7 `sample-browser` |
| 16:32 | DISCARD | next-canary-mobile-reject-keyboard | 232 / 248 / 260 | 6.92 / 12.16 (5) | load 12.16 |
| 16:35 | KEEP | next-canary-mobile-reject-keyboard | 236 / 246 / 256 | 2.71 / 3.6 (5) | — |
| 16:39 | KEEP | next-cand-mobile-reject-keyboard | 228 / 244 / 252 | 1.54 / 1.93 (6) | — |
| 16:42 | KEEP | next-canary-mobile-save | 232 / 248 / 252 | 2.15 / 2.44 (5) | — |
| 16:45 | KEEP | next-cand-mobile-save | 244 / 248 / 276 | 3.26 / 4.06 (5) | — |
| 16:51 | DISCARD | next-canary-mobile-returning-accepted | 268 / 292 / 720 | 18.68 / 30.59 (9) | load 30.59 |
| 16:59 | DISCARD | next-canary-mobile-returning-accepted | 264 / 274 / 296 | 4.87 / 11.94 (7) | load 11.94 |
| 17:04 | KEEP | next-canary-mobile-returning-accepted | 260 / 278 / 356 | 3.25 / 5.85 (7) | — |
| 17:11 | DISCARD | next-cand-mobile-returning-accepted | 256 / 276 / 2,892 | 20.63 / 32.6 (11) | load 32.6 |
| 17:25 | KEEP | next-cand-mobile-returning-accepted | 252 / 272 / 284 | 3.85 / 6.27 (8) | — |
| 17:28 | KEEP | probe canary tap1000 | — | 3.92 (1) | — |
| 17:28 | KEEP | probe cand tap1000 | — | 3.72 (1) | — |
| 17:29 | KEEP | probe canary tap2500 (run 1) | — | 6.58 (1) | — |
| 17:53 | KEEP | probe cand tap2500 (run 1) | — | 2.35 / 2.58 (2) | — |
| 17:57 | KEEP | probe canary scroll1800tap2800 | — | 0.93 / 1.18 (2) | — |
| 18:04 | KEEP | probe cand scroll1800tap2800 | — | 2.67 (1) | — |
| 18:54 | KEEP | probe canary returning-warm | — | 4.9 (1) | — |
| 19:08 | KEEP | probe cand returning-warm | — | 1.36 (1) | — |
| 19:09 | KEEP | probe canary returning-cold | — | 1.31 (1) | — |
| 19:09 | KEEP | probe cand returning-cold | — | 1.22 (1) | — |
| 19:13 | KEEP | next-canary-desktop-load | 40 / 64 / 76 | 1.26 / 1.31 (7) | — |
| 19:17 | KEEP | next-cand-desktop-load | 44 / 68 / 76 | 0.76 / 0.94 (7) | — |
| 00:51 | DISCARD | probe canary tap2500 (run 2) | — | 32.15 (1) | load 32.15 |
| 01:12 | KEEP | probe canary tap2500 (run 2) | — | 3.95 (1) | — |
| 01:20 | DISCARD | probe cand tap2500 (run 2) | — | 41.88 (1) | load 41.88 |
| 01:37 | DISCARD | probe cand tap2500 (run 2) | — | 41.37 (1) | load 41.37 |
| 02:03 | KEEP | probe cand tap2500 (run 2) | — | 3.25 (1) | — |

The `returning-accepted` controls run with a warm cache. That is why their FCP is 272–278 rather than 244–252; both medians are under 400.

### React

| Finished | Verdict | Run | Control FCP | Load median / max (samples) | Reason |
| --- | --- | --- | --- | --- | --- |
| 19:23 | KEEP | react-canary-mobile-load | 724 / 736 / 748 | 1.39 / 1.66 (7) | — |
| 19:29 | KEEP | react-base-mobile-load | 732 / 736 / 800 | 1.61 / 2.01 (7) | — |
| 19:35 | KEEP | react-cand-mobile-load | 724 / 736 / 752 | 2.72 / 4.22 (8) | — |
| 19:42 | KEEP | react-cookieyes-mobile-load | 732 / 740 / 760 | 1.78 / 3.33 (13) | — |
| 20:08 | DISCARD | react-canary-mobile-accept | 740 / 758 / 796 | 9.8 / 16.77 (5) | load 16.77 |
| 20:33 | KEEP | react-canary-mobile-accept | 736 / 748 / 1,028 | 4.21 / 5.34 (4) | — |
| ~20:45 | ABORTED | react-base-mobile-accept | — | — | Queue killed by the T3 server restart. Kept in `runs/_aborted/`, not used. |
| 21:32 | DISCARD | react-base-mobile-accept | 736 / 798 / 1,240 | 14.5 / 36.51 (5) | load 36.51; 3 failed: #1 and #9 `missing-script-execution`, #5 `observation-window-exceeded` |
| 22:05 | DISCARD | react-base-mobile-accept | 976 / 1,024 / 1,232 | 34.02 / 43.28 (6) | load 43.28; control FCP 1,024 > 800; 1 failed: #1 `sample-browser` |
| 22:34 | KEEP | react-base-mobile-accept | 740 / 754 / 776 | 4.03 / 6.71 (4) | — |
| 22:39 | DISCARD | react-cand-mobile-accept | 732 / 756 / 800 | 22.33 / 33.78 (6) | load 33.78 |
| 23:12 | DISCARD | react-cand-mobile-accept | 732 / 756 / 912 | 18.16 / 34.46 (6) | load 34.46; 2 failed: #6 `followup:banner-missing`, #7 `sample-browser` |
| 23:20 | KEEP | react-cand-mobile-accept | 732 / 742 / 764 | 2.41 / 2.61 (5) | — |
| 23:23 | KEEP | react-cookieyes-mobile-accept | 728 / 740 / 828 | 3.58 / 3.92 (5) | — |
| 23:27 | KEEP | react-canary-mobile-returning-accepted | 452 / 494 / 516 | 3.61 / 4.92 (7) | — |
| 23:45 | KEEP | react-base-mobile-returning-accepted | 472 / 496 / 560 | 4.88 / 7.7 (8) | — |
| 23:50 | DISCARD | react-cand-mobile-returning-accepted | 488 / 514 / 788 | 3.69 / 17.99 (8) | load 17.99 |
| 00:30 | DISCARD | react-cand-mobile-returning-accepted | 452 / 488 / 520 | 4.56 / 16.21 (8) | load 16.21 |
| 00:34 | KEEP | react-cand-mobile-returning-accepted | 452 / 502 / 528 | 3.26 / 3.64 (7) | — |
| 00:37 | KEEP | react-cand-desktop-load | 60 / 72 / 100 | 3.04 / 3.51 (6) | — |
| 00:41 | DISCARD | react-canary-desktop-load | 60 / 92 / 152 | 5.45 / 8.55 (7) | load 8.55 |
| 00:47 | KEEP | react-canary-desktop-load | 60 / 92 / 112 | 2.3 / 3.91 (7) | — |

Every failed sample in a discarded run came from a run that also had load over 8, except one: `next-cand-mobile-accept` attempt 1, which failed at load 2.4.

## Not verified

- **Bytes before the hero:** no waterfall was run. The brief did not ask for one, and the consumers are the commit-path lane's, whose waterfall used the v6 build.
- **Accept at 2.5 s, run 1 outlier:** why three small first-load chunks took 7 s on one commit-path visit. The machine load sample for that probe was 2.4–2.6.
- **`returning-accepted` outlier:** why commit-path iteration 7 had FCP 416 and first gated script 1,735.
- **Returning-visitor intervals:** `cookiebench compare` gives no interval for `returning-accepted`. It accepts only fresh-visitor load scenarios, so the LCP deltas there are my own medians over 10 pairs, with no interval.
- **Probe warm mode:** it refetched the first-load chunk in every rep, so it is not a warm-cache measure. I did not find out why.
- **Not re-measured:** React head `9c16ae024` (only `ca5fa8eeb` was measured), Next.js base `16b0eac46`, and React `reject`, `preferences`, `save` and `reject-keyboard`.

## Files

All under `/home/kaylee/.t3/scratch/lcp-fleet/remeasure/`:

- `configs/`: one config per arm, scenario and profile.
- `runs/<label>-<ts>/`: `config.json`, `envelope.json`, `compare-*.json`, `loadavg.txt` (epoch, 1/5/15-min load, lock owner PID), `runner.pids`, runner logs.
- `runs/_discarded-*`, `runs/_aborted/`: runs not used.
- `runs/ledger-{next,react,next-extra}.log`: every keep or discard decision with the check output.
- `probes/{rm,rm2}-<arm>-<case>.{jsonl,load,pid,server.log}`: probe output; `probes/_discarded-*` holds probe runs not used.
- `bin/`: `mkcfg.py`, `run.sh`, `check.py`, `probe.mjs`, `probe-run.sh`, `probe-check.py`, `lib.sh`, `queue-next.sh`, `queue-react.sh`, `resume-react.sh`, `extra.sh`, `summarize.py`.
