# Lane `react-competitors`: same-machine CookieBench numbers for the React fixture

## Verdict

On this machine, with October's React configs ported, here is the mobile LCP cost on `with-c15t-react` (15 pairs each):

| CMP | LCP Δ (ms) |
| --- | ---: |
| CookieYes | +112 |
| c15t branch `267563fa4` | +280 |
| Cookie Control | +280 |
| OneTrust | +336 |
| Osano | +396 |
| iubenda | +412 |
| c15t 3.0.0 | +572 |
| c15t canary | +592 |

- **The branch ties Cookie Control and beats OneTrust, Osano and iubenda.** It is 168 ms behind CookieYes. Its banner shows at 1,101 ms, 39 ms after CookieYes's (1,062) and 649 ms or more before any other CMP's.
- **Stock c15t is the most expensive of the eight.** That holds for both 3.0.0 and canary.
- **Bytes match October.** Every vendor's transfer is within 2.1 KB of October's.
- **Two rows moved because of CPU:**
  - OneTrust: +336 here against +244 in October, with long tasks of 126 ms against 16.
  - c15t 3.0.0: +572 against +536, with long tasks of 39 ms against 0, and FCP Δ +436 against +388.
- **Two rows are cheaper here, unexplained.** Cookie Control (−36 ms) and iubenda (−44 ms) are cheaper than in October with the same bytes and *more* long-task time. CPU does not explain it.
- **One order change.** In October OneTrust was cheaper than Cookie Control (244 vs 316). Here it is dearer (336 vs 280).
- **On `accept`, the branch's choice takes effect 568 ms after the tap.** CookieYes takes 16, Cookie Control 27, OneTrust 51 and canary 26.
- **Desktop.** Every competitor's LCP delta is 0 within noise. The c15t costs are:
  - 3.0.0: +36 to +40
  - canary: +28
  - branch: +12 (0 to 24)
- **Earlier same-machine runs agree.** These numbers match the react-arm lane's runs (5 s window, 1 warm-up): canary +592 in both, branch +280 in both, CookieYes +112 in both.

## Setup

- Machine: AMD Ryzen 7 2700, CachyOS, Chromium from Playwright 1.63.0, Node 24.21.0 and pnpm 11.25.0 (`react-competitors/env.sh`, copied from `competitors/env.sh`). October ran on an M1 Pro.
- CookieBench: three private workspaces of `/home/kaylee/.t3/scratch/cookiebench` at `eee967e`, React fixture only, under `react-competitors/consumers/{stock,canary,shell-v5}/cookiebench` (`bin/build-consumer.sh`).
  - `stock`: the fixture as pinned, c15t 3.0.0 from npm.
  - `canary`: tarballs of `c35b112b7`.
  - `shell-v5`: tarballs of branch `kaylee/react-mobile-lcp-banner-shell`.
  - The canary and shell-v5 tarballs are copied from `react-arm/work/{canary,shell-v5}/packs/` into `react-competitors/packs/`. Both `dist/` builds are byte-identical, file for file, to the react-arm lane's builds.
- **Which branch commit.** react-arm built shell-v5 from `3c7938029` plus uncommitted changes. Its `packages/` content equals `267563fa4`, except for line wrapping in one test file (`core/src/__tests__/build.test.ts`). So row 8 is `267563fa4`. `react-gap` had no report when I reached row 8, and all of its consumers (`react-gap/work/*/build/head.txt`) are `267563fa4` plus uncommitted experiments, so I measured `267563fa4`.
- **Configs.** October's `results/2026-10-15-matrix-rerun/configs/react-{mobile,desktop}.json` and `react-cookie-yes-{mobile,desktop}.json`, rewritten by `bin/make-configs.py` the way `competitors/bin/make-configs.py` ports the Next.js ones. It changes only these things:
  - Ports: stock 4311→4600; CookieYes 4311→4620 and TLS 4611→4621; canary 4630; branch 4640.
  - Absolute `server.cwd`.
  - Runner-side `build` dropped.
  - Fixture list reduced to the CMPs below. The c15t canary and branch configs are `react-baseline` + `react-c15t` pointed at their consumer, as in `make-c15t-configs.py`.
  - Scenarios, adapters, profile and revisions are October's: `load` window 10 s, `accept` observation 1.5 s.
- **CookieYes ran from the `<head>` snippet, not after hydration.** October's React CookieYes config (`revision …-head-start`, start args without `--after-hydration`) loads the snippet at the start of `<head>`, and react-arm ran it the same way. "After hydration" is how October ran CookieYes on Next.js only. I followed October's React config.
- Runs: 15 pairs (`accept`: 10), 3 warm-ups, seed 20261009. Each run took `/tmp/cookiebench-v3-measurement.lock` through the runner, retrying every 20 s (`bin/cb-run.sh`, `bin/queue.sh`).
- **Intervals.** `cookiebench compare` gives a 95% paired percentile bootstrap. October's React envelopes were recompared the same way, without the family adjustment (`react-competitors/october/`). "own" marks my bootstrap over complete pairs, used where compare refused.
- **Noise rule.** The 400 ms control-FCP rule cannot apply to this fixture. The page is client-rendered, so a normal control FCP is about 740 ms here and 692 ms in October. I treated a mobile run as noise if its control FCP median was over 800 ms (react-arm's worst control max) or if any sample failed. One run was rerun on that basis.

Commands, from `/home/kaylee/.t3/scratch/lcp-fleet/react-competitors`:

```sh
source env.sh
bin/build-consumer.sh stock 4600
bin/build-consumer.sh canary 4630 packs/canary/packs.tsv
bin/build-consumer.sh shell-v5 4640 packs/shell-v5/packs.tsv
python3 bin/make-configs.py
bin/cb-run.sh configs/react-mobile.json                load   15 3 react-mobile-load          # baseline, c15t 3.0.0, OneTrust, Cookie Control, Osano, iubenda
bin/cb-run.sh configs/react-cookie-yes-mobile.json     load   15 3 react-cookie-yes-mobile-load
bin/cb-run.sh configs/c15t-canary-mobile.json          load   15 3 c15t-canary-mobile-load
bin/cb-run.sh configs/c15t-shell-mobile.json           load   15 3 c15t-shell-mobile-load-retry
bin/cb-run.sh configs/react-cookie-yes-mobile.json     accept 10 3 react-cookie-yes-mobile-accept
bin/cb-run.sh configs/react-mobile-accept-subset.json  accept 10 3 react-mobile-accept        # baseline, OneTrust, Cookie Control
bin/cb-run.sh configs/c15t-canary-mobile.json          accept 10 3 c15t-canary-mobile-accept
bin/cb-run.sh configs/c15t-shell-mobile.json           accept 10 3 c15t-shell-mobile-accept
bin/cb-run.sh configs/react-desktop.json               load   15 3 react-desktop-load         # and react-desktop-load-retry
bin/cb-run.sh configs/react-cookie-yes-desktop.json    load   15 3 react-cookie-yes-desktop-load
bin/cb-run.sh configs/c15t-canary-desktop.json         load   15 3 c15t-canary-desktop-load
bin/cb-run.sh configs/c15t-shell-desktop.json          load   15 3 c15t-shell-desktop-load
python3 bin/summarize.py runs/<run-dir>; python3 bin/control-table.py runs/*
```

## 1. Mobile `load` (mobile-article-v1, 15 pairs, 3 warm-ups, 10 s window)

Controls, all on this machine:

| Control | FCP | LCP | Bytes | Requests | Long-task |
| --- | ---: | ---: | ---: | ---: | ---: |
| `react-baseline`, main matrix | 736 | 3,368 | 551,860 B | 7 | 0 ms |
| CookieYes control | 740 | 3,372 | — | — | — |
| canary run | 736 | 3,368 | — | — | — |
| branch run | 744 | 3,376 | — | — | — |

October's control: FCP 692, LCP 3,308, 551,860 B, long-task 0 ms.

Deltas are paired medians against each run's own control.

| CMP | Samples OK | **LCP Δ (95% CI)** | October LCP Δ (95% CI) | FCP (Δ) | banner.visible | banner.coverage | initial.transfer B (Δ) | October transfer Δ | requests (Δ) | 3rd-party req | long-task ms (October) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CookieYes (hosted, head-start) | 15/15 | **+112 (100 to 128)** | +104 (92 to 116) | 792 (+52) | 1,062 | 0.40 | 582,146 (+30,286) | +30,799 | 16 (+9) | 9 | 0 (0) |
| **c15t branch `267563fa4`** | 15/15 | **+280 (272 to 308)** | — | 1,020 (+280) | 1,101 | 0.39 | 663,521 (+111,661)¹ | — | 19 (+12) | 1² | 10 (—) |
| Cookie Control | 15/15 | **+280 (276 to 296)** | +316 (300 to 316) | 944 (+208) | 1,750 | 0.02 | 650,263 (+98,403) | +98,404 | 9 (+2) | 2 | 208 (59) |
| OneTrust | 15/15 | **+336 (304 to 376)** | +244 (192 to 332) | 816 (+76) | 3,707 | 0.71 | 765,106 (+213,246) | +211,138 | 19 (+12) | 12 | 126 (16) |
| Osano | 15/15 | **+396 (368 to 424)** | +376 (300 to 420) | 940 (+196) | 1,808 | 0.64 | 639,147 (+87,287) | +86,816 | 11 (+4) | 4 | 179 (42) |
| iubenda | 15/15 | **+412 (404 to 420)** | +456 (444 to 512) | 768 (+32) | 2,088 | 1.00 | 673,661 (+121,801) | +121,801 | 11 (+4) | 4 | 64 (0) |
| c15t 3.0.0 (npm, stock fixture) | 15/15 | **+572 (560 to 616)** | +536 (516 to 548) | 1,168 (+436) | 1,239 | 0.39 | 649,323 (+97,463) | +97,462 | 14 (+7) | 1² | 39 (0) |
| c15t canary `c35b112b7` | 15/15 | **+592 (580 to 600)** | — | 1,184 (+444) | 1,257 | 0.39 | 653,958 (+102,098) | — | 14 (+7) | 1² | 39 (—) |

1. `initial.transfer` counts everything inside the 10 s window. The branch loads its engine after the hero, so this row is higher than canary's while LCP is lower. react-arm's waterfall puts the branch at +46.2 KB finished before the hero ends, against +97.6 KB for canary. CookieBench cannot produce that number.
2. The `/init` request to `benchmarks-inth.inth.app`.

October's other columns, for the "October vs here" check below:

| CMP | October FCP (Δ) | October banner.visible |
| --- | ---: | ---: |
| CookieYes | 744 (+48) | 1,010 |
| Cookie Control | 892 (+196) | 1,690 |
| OneTrust | 768 (+76) | 3,535 |
| Osano | 876 (+184) | 1,578 |
| iubenda | 712 (+20) | 2,070 |
| c15t 3.0.0 | 1,080 (+388) | 1,112 |

### October vs this machine

| CMP | LCP Δ change | Transfer change | Long-task change | Cause |
| --- | ---: | ---: | ---: | --- |
| OneTrust | **+92** | +2.1 KB | +110 ms | CPU. 2 KB is about 10 ms at 4.75 ms/KB. |
| c15t 3.0.0 | **+36** | 0 | +39 ms | CPU. FCP Δ grew by 48 ms. On this client-rendered page the hero is inserted only after the c15t JS has parsed and run, so a slower 4x CPU delays the hero. On Next.js c15t's cost was bytes only (competitors.md). |
| Osano | +20 | +0.5 KB | +137 ms | Within both intervals. |
| CookieYes | +8 | −0.5 KB | 0 | Within both intervals. |
| Cookie Control | **−36** | 0 | +149 ms | Not bytes, and not CPU, which is higher here. Unexplained (see Not verified). |
| iubenda | **−44** | 0 | +64 ms | Same as Cookie Control. |

The control's long-task total is 0 ms in both runs on React. On Next.js it was 81 ms here against 11 ms in October. The vendor long-task increases match the competitors lane's finding: 4x slowdown on this Ryzen makes a slower device than 4x on the M1 Pro (no `--cpu-calibration` in either run).

## 2. Mobile `accept` (10 iterations, 3 warm-ups, 1.5 s observation)

The runner clicks Accept once readiness is set and the banner is visible. The `action.*` values are measured from the tap.

| CMP | Verified | input-to-next-paint | dismissed | **consent-effective** | scripts-complete | banner.visible |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| CookieYes | 10/10 | 24 | 16 | **16** | 185 | 1,100 |
| Cookie Control | 10/10 | 24 | 17 | **27** | 192 | 1,755 |
| OneTrust | 10/10 | 16 | 426 | **51** | 211 | 3,745 |
| c15t canary `c35b112b7` | 10/10 | 32 | 26 | **26** | 372 | 1,286 |
| c15t branch `267563fa4` | 10/10 | 28 | 27 | **568** | 1,003 | 1,109 |

- The branch hides its banner at the tap (27 ms) but downloads the engine on the tap, so the choice takes effect at 568 ms. react-arm measured 565.
- October's `*-correctness` cells hold one `accept` sample each. They are context, not timing runs (input-to-next-paint / dismissed / consent-effective):

  | CMP | October |
  | --- | --- |
  | CookieYes | 40 / 37 / 37 |
  | Cookie Control | 48 / 45 / 48 |
  | OneTrust | 64 / 465 / 65 |
  | c15t 3.0.0 | 48 / 50 / 50 |

## 3. Desktop `load` (desktop-article-v1-browser-ua, unthrottled, 15 pairs, 3 warm-ups)

Controls:

| Run | Control FCP | Control LCP |
| --- | ---: | ---: |
| Main matrix | 88 | 132 |
| Main matrix rerun | 72 | 140 |
| CookieYes | 92 | 148 |
| canary | 72 | 140 |
| branch | 68 | 136 |

October's control: FCP 40, LCP 80. Desktop is CPU- and timer-bound at these scales, so medians are coarser than on mobile.

| CMP | Samples OK | LCP Δ (95% CI) | Rerun LCP Δ | October LCP Δ | FCP (Δ) | banner.visible | banner.coverage | initial.transfer B (Δ) | requests (Δ) | 3rd-party req | long-task ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CookieYes | 15/15 | −4 (−28 to 20) | — | 0 (0 to 0) | 92 (0) | 344 | 0.09 | 582,121 (+30,261) | 16 (+9) | 9 | 0 |
| Osano | 15/15 | +4 (−8 to 16) | −4 (own: −12 to 4, 13 pairs)³ | 0 (0 to 0) | 72 (+4) | 639 | 0.28 | 639,144 (+87,284) | 11 (+4) | 4 | 23 |
| OneTrust | 15/15 | +8 (0 to 16) | 0 (−12 to 20) | 0 (0 to 0) | 88 (0) | 740 | 0.20 | 765,033 (+213,173) | 19 (+12) | 12 | 3 |
| Cookie Control | 15/15 | +8 (4 to 20) | +4 (−16 to 12) | 0 (0 to 0) | 76 (0) | 396 | 0.01 | 650,264 (+98,404) | 9 (+2) | 2 | 25 |
| iubenda | 15/15 | +8 (−4 to 48) | −4 (−12 to 16) | 0 (0 to 0) | 80 (0) | 383 | 1.00 | 673,661 (+121,801) | 11 (+4) | 4 | 0 |
| **c15t branch `267563fa4`** | 15/15 | **+12 (0 to 24)** | — | — | 88 (+16) | 257 | 0.13 | 663,521 (+111,661) | 19 (+12) | 1 | 0 |
| c15t canary `c35b112b7` | 15/15 | +28 (24 to 40) | — | — | 100 (+28) | 211 | 0.13 | 653,958 (+102,098) | 14 (+7) | 1 | 0 |
| c15t 3.0.0 | 15/15 | +40 (28 to 160) | **+36 (20 to 52)** | +20 (16 to 20) | 104 (+32) | 254 | 0.13 | 649,404 (+97,544) | 14 (+7) | 1 | 0 |

3. Two of 15 Osano samples in the rerun failed `banner-missing`. The first run was 15/15.

c15t is the only CMP with a resolvable desktop LCP cost, and the only one whose banner shows before 340 ms. I reran the main desktop matrix because the first run's c15t 3.0.0 interval (28 to 160) came from a load spike to 15. The rerun narrowed it to 20 to 52.

## Machine load during runs

Load average is the 1-minute figure, sampled every 30 s during measurement. Lock-wait time is excluded from "Minutes".

| Run | Exit | Control FCP min / median / max | Load median / max | Minutes | Lock waits (×20 s) |
| --- | --- | --- | --- | ---: | ---: |
| react-mobile-load | 0 | 724 / 736 / 760 | 1.6 / 4.6 | 21 | 0 |
| react-cookie-yes-mobile-load | 0 | 724 / 740 / 764 | 1.3 / 1.8 | 7 | 7 |
| c15t-canary-mobile-load | 0 | 728 / 736 / 756 | 1.9 / 2.4 | 7 | 1 |
| c15t-shell-mobile-load (1st) | 2 | 728 / 752 / **7,184** | 5.8 / **21.2** | 7 | 0 |
| c15t-shell-mobile-load-retry | 0 | 724 / 744 / 756 | 2.9 / 5.2 | 7 | 20 |
| react-cookie-yes-mobile-accept | 2⁴ | 728 / 736 / 752 | 1.8 / 2.4 | 3 | 0 |
| react-mobile-accept | 2⁴ | 724 / 738 / 748 | 2.0 / 6.0 | 6 | 0 |
| c15t-canary-mobile-accept | 2⁴ | 728 / 736 / 760 | 3.1 / 3.3 | 2 | 1 |
| c15t-shell-mobile-accept | 2⁴ | 728 / 742 / 764 | 3.0 / 3.5 | 2 | 0 |
| react-desktop-load | 0 | 60 / 88 / 196 | 1.4 / 15.0 | 11 | 0 |
| react-desktop-load-retry | 2⁵ | 64 / 72 / 156 | 3.6 / 11.7 | 11 | 58 |
| react-cookie-yes-desktop-load | 0 | 64 / 92 / 592 | 6.5 / 11.4 | 3 | 1 |
| c15t-canary-desktop-load | 0 | 64 / 72 / 248 | 5.7 / 9.9 | 4 | 0 |
| c15t-shell-desktop-load | 0 | 64 / 68 / 100 | 1.7 / 3.8 | 4 | 27 |

4. In every `accept` run the no-CMP control has no banner to accept, so all 10 control samples read `required-measurement-unavailable`. This is expected, as on Next.js. Every candidate sample passed.
5. Osano `banner-missing` ×2.

## Failures

| What | Result | Cause |
| --- | --- | --- |
| c15t branch, mobile `load`, 1st attempt | 13/15 complete, +252 (own: 116 to 272); discarded | A machine load spike to 21.2 at 10:14:39. One control visit took FCP 7,184 ms with no LCP, and one candidate visit hit `page.goto: Timeout 15000ms`. The rerun gave 15/15 and +280 (272 to 308). |
| c15t 3.0.0, desktop `load`, 1st run | Interval 28 to 160 | Load spike to 15.0. The rerun gave +36 (20 to 52). |
| Osano, desktop `load` rerun | 2/15 `banner-missing` | The banner was not visible inside the 10 s window. The first run was 15/15. Cause not investigated. |
| All `accept` runs | Exit 2 | The control has no banner (footnote 4). Not a CMP failure. |

## Not verified

- **Bytes before the hero for competitors.** CookieBench records no request end times, and I did not run a waterfall against the competitor pages. For c15t the before-hero figures (+46.2 KB branch, +97.6 KB canary) are react-arm's, not mine.
- **Why Cookie Control and iubenda are 36–44 ms cheaper here than in October.** Their bytes are identical and their long tasks are higher. One candidate is the real response time of the vendor CDN from this network, which sits under the emulated 150 ms. I did not measure it.
- **CPU calibration** was off here and in October. The CPU attribution for OneTrust and c15t 3.0.0 rests on long-task totals and FCP, not on a profile.
- **CookieYes after hydration.** I followed October's React config, which loads CookieYes at head-start. The task's "after hydration" variant (`--after-hydration cookie-yes`) was not measured on React.
- **Osano `accept`** was not run. It was not on this lane's list, and it failed 0/10 on Next.js.
- **Reject, save, preferences, returning visitors and desktop `accept`** were not run.
- **Vendor geo behaviour.** The profile says GB, but vendors see this machine's IP. Their bytes match October to within 2.1 KB. I did not check their banner logic by region.
- **The noise threshold is my own.** "Control FCP median > 800 ms, or any failed sample" replaces the brief's 400 ms rule, which every React run would fail (normal control FCP is ~740 ms).
- **Fewer candidates per run than October.** October ran ten CMPs per pair; this lane ran five on the main matrix (and two on the accept subset). Each pair's visits are therefore closer together in time. I did not test whether that moves the deltas.

## Files

- Configs: `/home/kaylee/.t3/scratch/lcp-fleet/react-competitors/configs/`
- Runs: `/home/kaylee/.t3/scratch/lcp-fleet/react-competitors/runs/<label>-<ts>/` (`config.json`, `envelope.json`, `compare-*.json`, `loadavg.txt`, runner logs)
- October React recompares: `/home/kaylee/.t3/scratch/lcp-fleet/react-competitors/october/`
- Consumers and tarballs: `react-competitors/consumers/`, `react-competitors/packs/`
- Scripts: `react-competitors/bin/` (`build-consumer.sh`, `make-configs.py`, `cb-run.sh`, `queue.sh`, `summarize.py`, `control-table.py`)
