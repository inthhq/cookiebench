# Lane `competitors`: same-machine CookieBench numbers for the competitors on Next.js

## Verdict

- On this machine, with October's exact Next.js configs, **defer-default costs +44 ms of mobile LCP (44–52). CookieYes costs +176 ms (168–188).** Every other CMP costs +388 ms or more. defer-default's banner is visible at 242 ms. CookieYes's appears at 2,369 ms.
- The CookieYes number matches October exactly (+176 ms on the M1 Pro), so the "+180 ms" target in the brief holds on this machine.
- c15t 3.0.0 measured +388 ms here (October: +400) and canary +396 ms. Both use the same config and runner as the competitors.
- Bandwidth-bound vendors match October within about 30 ms. CPU-heavy ones cost more here: OneTrust +512 (October +384), Ketch +1,784 (+1,760), Didomi +1,332 (+1,284). Their long-task blocking is 4–9x October's. This box is an AMD Ryzen 7 2700, and 4x CPU slowdown on it is slower than 4x on an M1 Pro. c15t's ranking is not affected, because c15t's cost is bytes, not CPU.
- The trade-off on `accept`: defer-default's consent takes effect 870 ms after the tap. CookieYes takes 18 ms, OneTrust 52 ms, canary 43 ms. Taps paint just as fast (32 ms vs 24–48 ms).
- Desktop (unthrottled): every competitor's LCP delta is 0 within noise. All three c15t arms are +16 to +24 ms, and c15t's banner shows at about 60 ms against 372–1,404 ms for the rest.

## Setup

- Machine: AMD Ryzen 7 2700 (16 threads), CachyOS Linux, Chromium 153.0.8010.12 (Playwright 1.63.0), Node v24.21.0. October ran on an Apple M1 Pro with the same Chromium, Node and Playwright.
- CookieBench: private copy of `/home/kaylee/.t3/scratch/cookiebench` at `eee967e`, in `/home/kaylee/.t3/scratch/lcp-fleet/competitors/cookiebench`. Its own `pnpm install` gives c15t 3.0.0 from npm, the version the stock fixture pins.
- Configs: October's `results/2026-10-15-matrix-rerun/configs/nextjs-{mobile,desktop}.json` and `nextjs-cookie-yes-{mobile,desktop}.json`, rewritten by `competitors/bin/make-configs.py`. The script changes only:
  - Ports. Main fixture: proxy 4400, Next 4490. CookieYes: proxy 4520, TLS 4521, Next 4529. `url`, `readinessUrl`, `serverEventsUrl` and the start args are all rewritten.
  - `server.cwd` made absolute.
  - Runner-side `build` dropped, because the fixture is built once with `next build`.
- Scenario settings, profile, seed (20261009), warm-ups (3) and pairs (15) are October's. The `load` window is 10 s. The harness lane's window is 5 s.
- CookieYes runs against `benchmarks-with-cookie-yes.vercel.app:4521`, resolved to 127.0.0.1 over TLS with the runner's run-scoped certificate, and injected after hydration (`--after-hydration cookie-yes`). This is how October ran it.
- c15t canary and defer-default under the same config (`competitors/bin/make-c15t-configs.py`):
  - Fixtures reduced to `nextjs-baseline` + `nextjs-c15t`, pointed at private consumers in `competitors/c15t-{canary,defer}/`.
  - Those consumers are installed from the exact tarballs of the harness runs: `harness/work/4330/out/baseline-c35b112b7-20261102-193548/packs.tsv` (canary `c35b112b7`) and `harness/work/4380/out/defer-final-20261102-214742/packs.tsv` (defer-default `2a7c3ea2a`).
  - Ports: canary 4530/4539, defer-default 4540/4549.
- Intervals: `cookiebench compare` gives a 95% paired percentile bootstrap. I recomputed October's comparisons the same way, without their 365-comparison Bonferroni family, so both sides use the same interval method. Where compare marks a cell ineligible, the interval is my own bootstrap over the 15 pairs, marked "own" (`bin/summarize.py`, fixed seed).
- Every run took `/tmp/cookiebench-v3-measurement.lock` through the runner, retrying every 20 s (`bin/cb-run.sh`). The longest wait was about 1 h, behind other lanes.

Commands (all from `/home/kaylee/.t3/scratch/lcp-fleet/competitors`):

```sh
source env.sh                        # Node 24.21.0 + pnpm 11.25.0 from harness/tools
python3 bin/make-configs.py          # competitor configs -> configs/
python3 bin/make-c15t-configs.py     # canary / defer-default configs -> configs/
bin/cb-run.sh configs/nextjs-mobile.json            load   15 3 nextjs-mobile-load
bin/cb-run.sh configs/nextjs-cookie-yes-mobile.json load   15 3 nextjs-cookie-yes-mobile-load
bin/cb-run.sh configs/c15t-canary-mobile.json       load   15 3 c15t-canary-mobile-load-retry
bin/cb-run.sh configs/c15t-defer-mobile.json        load   15 3 c15t-defer-mobile-load
bin/cb-run.sh configs/nextjs-cookie-yes-mobile.json accept 10 3 nextjs-cookie-yes-mobile-accept
bin/cb-run.sh configs/nextjs-mobile-accept-subset.json accept 10 3 nextjs-mobile-accept   # baseline, c15t 3.0.0, OneTrust, Osano
bin/cb-run.sh configs/c15t-defer-mobile.json        accept 10 3 c15t-defer-mobile-accept
bin/cb-run.sh configs/c15t-canary-mobile.json       accept 10 3 c15t-canary-mobile-accept
bin/cb-run.sh configs/nextjs-desktop.json           load   15 3 nextjs-desktop-load
bin/cb-run.sh configs/nextjs-cookie-yes-desktop.json load  15 3 nextjs-cookie-yes-desktop-load
bin/cb-run.sh configs/c15t-canary-desktop.json      load   15 3 c15t-canary-desktop-load
bin/cb-run.sh configs/c15t-defer-desktop.json       load   15 3 c15t-defer-desktop-load
python3 bin/summarize.py runs/<run-dir>    # tables below
```

`cb-run.sh` runs `node packages/cli/src/index.ts run --config <cfg> --scenario <s> --iterations N --warmups 3 --seed 20261009`, then `compare` for each metric. Each run dir has `config.json`, `envelope.json`, `compare-*.json`, `loadavg.txt` (sampled every 30 s) and the runner's stdout and stderr.

## 1. Mobile `load` (mobile-article-v1, 15 pairs, 3 warm-ups, 10 s window)

**Same machine, this lane.** The control for the main matrix is `nextjs-baseline`: FCP 252, LCP 3,452, 613,096 B, 10 requests, long-task 81 ms. The CookieYes control is `nextjs-baseline-registered-host`: FCP 244, LCP 3,460, 613,096 B, 10 requests, long-task 76 ms. The c15t canary and defer-default runs each have their own control, with FCP 252 and 248 and LCP 3,452 for both.

Deltas are paired medians against each run's own control. Values without "Δ" are candidate medians.

| CMP | Samples OK | **LCP Δ (95% CI)** | October LCP Δ (M1 Pro) | FCP (Δ) | banner.visible | banner.coverage | initial.transfer B (Δ) | initial.requests (Δ) | 3rd-party req | long-task ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **c15t defer-default** `2a7c3ea2a` | 15/15 | **+44 (44 to 52)** | — | 268 (+16) | 242 | 0.39 | 734,196 (+121,098)¹ | 17 (+7) | 0 | 71 |
| CookieYes (hosted, after hydration) | 15/15 | **+176 (168 to 188)** | +176 (168 to 184) | 252 (+8) | 2,369 | 0.40 | 643,642 (+30,546) | 19 (+9) | 9 | 74 |
| c15t 3.0.0 (npm, stock fixture) | 15/15 | +388 (344 to 412) | +400 (392 to 404) | 276 (+24) | 250 | 0.39 | 717,153 (+104,057) | 16 (+6) | 0 | 86 |
| c15t canary `c35b112b7` | 15/15 | +396 (388 to 408) | — | 272 (+20) | 246 | 0.39 | 722,423 (+109,292) | 16 (+6) | 0 | 81 |
| Osano | 15/15 | +432 (392 to 460) | +432 (424 to 436) | 256 (+4) | 2,236 | 0.64 | 700,502 (+87,406) | 14 (+4) | 4 | 279 |
| Cookie Control | 15/15 | +508 (488 to 520) | +488 (476 to 504) | 256 (+8) | 2,548 | 0.02 | 711,629 (+98,533) | 12 (+2) | 2 | 321 |
| OneTrust | 15/15 | +512 (492 to 552) | +384 (344 to 424) | 260 (+8) | 3,972 | 0.71 | 826,444 (+213,348) | 22 (+12) | 12 | 235 |
| iubenda | 15/15 | +616 (604 to 632) | +616 (608 to 620) | 252 (+4) | 2,705 | 1.00 | 735,019 (+121,923) | 14 (+4) | 4 | 148 |
| Enzuzo | 15/15 | +772 (own: 764 to 780)² | +768 (own: 764 to 772)² | 252 (0) | 2,776 | 0.02 | 766,291 (+153,195) | 12 (+2) | 2 | 311 |
| Usercentrics | 15/15 | +848 (832 to 860) | +868 (844 to 884) | 252 (+4) | 4,173 | 0.56 | 777,694 (+164,598) | 27 (+17) | 17 | 169 |
| Didomi | 15/15 | +1,332 (1,240 to 1,340) | +1,284 (1,280 to 1,344) | 256 (+12) | 4,530 | 0.85 | 878,859 (+265,763) | 14 (+4) | 4 | 410 |
| Ketch | 15/15 | +1,784 (own: 1,772 to 1,824)² | +1,760 (own: 1,752 to 1,764)² | 260 (+8) | 7,838 | 0.88 | 1,150,328 (+537,232) | 19 (+9) | 9 | 1,204 |

1. `initial.transfer` counts everything that arrives inside the 10 s window, so for defer-default it includes the 65 KB engine that loads after the hero. The LCP-relevant figure is bytes finished before the hero: +20.3 KB for defer-default against +85.7 KB for canary, from the harness waterfall in `reports/defer-default.md`. CookieBench can't produce that number.
2. `cookiebench compare` gives no interval because the vendor's remote script, style or config bytes changed between visits inside the cell. October had the same gap. The "own" interval is my bootstrap over the 15 pairs.

**Same machine, harness lane** (`reports/harness.md`, `reports/defer-default.md`). Same machine and runner, but a 5 s window and 1 warm-up. That is why `initial.transfer` differs from the table above, while LCP agrees within 4 ms:

| c15t arm | LCP Δ (95% CI) | FCP (Δ) | banner.visible | banner.coverage | initial.transfer B (Δ) | initial.requests (Δ) | 3rd-party req | long-task ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| canary HEAD `c35b112b7` | +396 (own: 392 to 398, 14 pairs)³ | 284 (+28) | 260 | 0.39 | 717,849 (+104,712) | 15 (+5) | 0 | 144 |
| defer-default `2a7c3ea2a` | +48 (44 to 56) | 272 (+32) | 244 | 0.39 | 729,609 (+116,447) | 16 (+6) | 0 | 87 |

3. One candidate sample had the hero still loading at the 5 s cutoff, so compare gave no interval. The interval is the harness bootstrap.

**October rerun only** (M1 Pro, Next.js mobile). Control: FCP 220, LCP 3,424, long-task 11 ms. These numbers are not same-machine.

| CMP | LCP Δ | FCP | banner.visible | banner.coverage | initial.transfer Δ | initial.requests Δ | 3rd-party req | long-task ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CookieYes | +176 | 228 | 2,268 | 0.40 | +31,022 | +9 | 9 | 11 |
| OneTrust | +384 | 224 | 3,798 | 0.71 | +211,241 | +12 | 12 | 27 |
| c15t 3.0.0 | +400 | 236 | 243 | 0.39 | +104,030 | +6 | 0 | 11 |
| Osano | +432 | 224 | 2,029 | 0.50 | +86,935 | +4 | 4 | 56 |
| Cookie Control | +488 | 220 | 2,378 | 0.02 | +98,531 | +2 | 2 | 87 |
| iubenda | +616 | 224 | 2,605 | 1.00 | +121,923 | +4 | 4 | 11 |
| Enzuzo | +768 | 228 | 2,663 | 0.02 | +152,924 | +2 | 2 | 94 |
| Usercentrics | +868 | 224 | 3,985 | 0.56 | +164,531 | +17 | 17 | 11 |
| Didomi | +1,284 | 224 | 4,117 | 0.85 | +253,607 | +4 | 4 | 131 |
| Ketch | +1,760 | 224 | 7,320 | 0.88 | +534,418 | +9 | 9 | 394 |

### What changed between October and this machine

- Bytes are within 0.5 KB for every vendor except Didomi (+12 KB) and OneTrust (+2 KB). The vendors serve the same payloads.
- The control's long-task blocking is 81 ms here against 11 ms in October, and vendor long tasks are 4–9x higher. CookieBench didn't calibrate CPU in either run (`cpuCalibration: null`), so "4x slowdown" means a slower device on this Ryzen than on the M1 Pro.
- Vendors whose cost is mostly CPU moved: OneTrust +128 ms with the same bytes, Didomi +48, Cookie Control +20, Ketch +24. Vendors whose cost is bytes did not: CookieYes 0, Osano 0, iubenda 0, Enzuzo +4.
- The order changed in one place. In October, OneTrust (+384) was cheaper than c15t 3.0.0 (+400). Here it costs +512. The order of everything else is unchanged.
- c15t 3.0.0 is 12 ms lower than in October, within its interval. c15t has no third-party requests and the same long-task total as the control, so its cost is bytes.

## 2. Mobile `accept` (10 iterations, 3 warm-ups, 1.5 s observation)

Same machine, this lane. The runner clicks Accept once the fixture's readiness marker is set and the banner is visible, so each CMP is clicked at a different time after navigation. The `action.*` metrics are measured from the tap.

| CMP | Verified | input-to-next-paint | dismissed | **consent-effective** | scripts-complete | banner.visible |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| CookieYes | 10/10 | 24 | 18 | **18** | 188 | 2,455 |
| OneTrust | 10/10 | 24 | 428 | **52** | 214 | 3,926 |
| Osano | **0/10 (failed)** | 136 | 191 | 115 | 255 | 2,186 |
| c15t 3.0.0 | 10/10 | 48 | 43 | **43** | 210 | 248 |
| c15t canary `c35b112b7` | 10/10 | 48 | 43 | **43** | 242 | 242 |
| c15t defer-default `2a7c3ea2a` | 10/10 | 32 | 26 | **870** | 1,297 | 238 |

- The Osano row comes from failed samples. Every sample failed with `followup:page-unresponsive` ("Page control did not respond after the consent action"), and one also failed with `followup:restoration-not-ready`. October recorded the same failure for Osano on mobile.
- The defer-default lane's own run measured 872 ms for consent-effective (`reports/defer-default.md`). This run reproduces it with 870.
- CookieYes's 18 ms is low because its banner appears at 2.4 s, when its whole script has already loaded. defer-default shows the banner at 238 ms, and its engine starts downloading at the tap, over a 200 KB/s link, while the hero is still loading.
- October's flow cells (`*-correctness`) hold one `accept` sample per CMP, and they were correctness checks, not timing runs. Context only: CookieYes 40 / 39 / 39, OneTrust 64 / 465 / 65, c15t 3.0.0 56 / 52 / 52, Osano 112 / 94 / 86 (failed), as input-to-next-paint / dismissed / consent-effective.

## 3. Desktop `load` (desktop-article-v1-browser-ua, unthrottled, 15 pairs, 3 warm-ups)

Same machine, this lane. Control: FCP 60, LCP 124 (CookieYes control: FCP 60, LCP 132), long-task 0 ms.

| CMP | Samples OK | LCP Δ (95% CI) | October LCP Δ | FCP (Δ) | banner.visible | banner.coverage | initial.transfer B (Δ) | initial.requests (Δ) | 3rd-party req | long-task ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t defer-default | 15/15 | +16 (4 to 28) | — | 92 (+36) | 61 | 0.13 | 734,195 (+121,097) | 17 (+7) | 0 | 0 |
| c15t canary | 15/15 | +16 (4 to 28) | — | 100 (+32) | 60 | 0.13 | 722,425 (+109,294) | 16 (+6) | 0 | 0 |
| c15t 3.0.0 | 15/15 | +24 (12 to 40) | +16 (8 to 24) | 100 (+36) | 58 | 0.13 | 717,154 (+104,058) | 16 (+6) | 0 | 0 |
| CookieYes | 15/15 | 0 (−16 to 16) | 0 (−12 to 0) | 56 (0) | 376 | 0.09 | 643,603 (+30,507) | 19 (+9) | 9 | 0 |
| Osano | 15/15 | 0 (−8 to 16) | 0 | 64 (+4) | 703 | 0.28 | 700,496 (+87,400) | 14 (+4) | 4 | 15 |
| OneTrust | 15/15 | −4 (−20 to 16) | 0 | 64 (0) | 638 | 0.20 | 826,330 (+213,234) | 22 (+12) | 12 | 0 |
| Cookie Control | 15/15 | 0 (−12 to 12) | 0 | 60 (+4) | 372 | 0.01 | 711,629 (+98,533) | 12 (+2) | 2 | 10 |
| iubenda | 15/15 | +4 (−8 to 16) | 0 | 64 (−4) | 436 | 1.00 | 735,018 (+121,922) | 14 (+4) | 4 | 0 |
| Usercentrics | 15/15 | +4 (−16 to 12) | 0 | 64 (+4) | 710 | 0.23 | 777,705 (+164,609) | 27 (+17) | 17 | 53 |
| Didomi | 15/15 | +8 (−16 to 12) | 0 | 64 (+4) | 514 | 0.28 | 878,854 (+265,758) | 14 (+4) | 4 | 47 |
| Enzuzo | 15/15 | 0 (own: −4 to 4)² | 0 (own) | 60 (0) | 493 | 0.02 | 766,579 (+153,483) | 12 (+2) | 2 | 38 |
| Ketch | 15/15 | 0 (own: −4 to 8)² | 0 (own) | 60 (−8) | 1,404 | 0.46 | 1,150,357 (+537,261) | 19 (+9) | 9 | 180 |

- On desktop, c15t is the only CMP with a resolvable LCP cost: +16 to +24 ms. It is also the only one whose banner is in the first HTML. Its FCP is +32 to +36 ms, against +12 ms in October. That is the server-rendered banner and the inline sheet, in all three c15t arms, so deferral does not change it.
- Desktop medians were higher on this machine than on the M1 Pro (control FCP 60 vs 28, LCP 124 vs 72).

## Machine load during runs

Control FCP over 400 ms marks a noisy mobile run. No measured run crossed it, so nothing needed a rerun on that ground. Load average is the 1-minute figure, sampled every 30 s during measurement only. Lock-wait time is excluded.

| Run | Exit | Control FCP min / median / max | Load median / max | Minutes |
| --- | --- | --- | --- | ---: |
| nextjs-mobile-load | 0 | 236 / 252 / 336 | 3.9 / 16.9 | 35 |
| nextjs-cookie-yes-mobile-load | 0 | 236 / 244 / 272 | 2.7 / 4.4 | 6 |
| c15t-canary-mobile-load (1st) | 1 | — (server never ready) | ~1 | 2 |
| c15t-canary-mobile-load-retry | 0 | 236 / 252 / 276 | 2.1 / 6.0 | 6 |
| c15t-defer-mobile-load | 0 | 228 / 248 / 260 | 1.8 / 2.3 | 7 |
| nextjs-cookie-yes-mobile-accept | 2⁴ | 236 / 258 / 288 | 5.9 / 7.3 | 3 |
| nextjs-mobile-accept | 2⁴ | 236 / 248 / 264 | 1.8 / 2.1 | 8 |
| c15t-defer-mobile-accept | 2⁴ | 232 / 242 / 256 | 1.8 / 2.1 | 3 |
| c15t-canary-mobile-accept | 2⁴ | 232 / 248 / 252 | 2.0 / 2.7 | 2 |
| nextjs-desktop-load | 0 | 40 / 60 / 80 | 0.9 / 2.2 | 18 |
| nextjs-cookie-yes-desktop-load | 0 | 44 / 60 / 104 | 1.1 / 1.8 | 3 |
| c15t-canary-desktop-load | 0 | 40 / 72 / 104 | 4.3 / 6.9 | 3 |
| c15t-defer-desktop-load | 0 | 40 / 60 / 84 | 2.4 / 4.0 | 3 |

4. Exit 2 means "incomplete". In every `accept` run the cause is the no-CMP control: there is no banner to accept, so all 10 control samples read `required-measurement-unavailable` (no LCP and no transfer after the action). This is expected and does not touch the candidate samples. The CMP results are in the capability lines.

In the mobile matrix, load peaked at 16.9 for a few minutes. The worst control FCP was 336 ms. Each pair's control visit is shared by all nine candidates, so a spike would have shown up in it.

## Failures and why

| What | Result | Cause |
| --- | --- | --- |
| Osano, mobile `accept` | 0/10 verified | `followup:page-unresponsive` on every sample, plus one `restoration-not-ready`. Same as October. |
| Enzuzo, Ketch, `load`, both profiles | No CookieBench interval | Remote script, style or config bytes changed between visits within the cell. Same as October. Medians and my own bootstrap are reported. |
| c15t canary, mobile `load`, 1st attempt | Run aborted | `Server readiness deadline exceeded` (120 s). Next logged "Starting..." and never "Ready". Load was about 1. Started by hand right after, the same fixture was healthy in 2 s and Next ready in 10.1 s. The retry passed 15/15. I did not find the cause. |
| Queue runner | Stopped once | My background queue hit the 2-hour task limit while waiting for the lock before the desktop run. No measurement was lost. The rest ran from a detached queue (`bin/queue-desktop.sh`), and the aborted dir is kept as `runs/_aborted-*`. |

## Not verified

- **Bytes before the hero for competitors.** CookieBench records no request end times, so I can't say how much of each vendor's transfer lands before the hero. I didn't run the harness waterfall against the competitor pages.
- **Why OneTrust is 128 ms more expensive here.** The bytes are the same and long-task blocking is 9x higher, which points to CPU, but I didn't profile it. CPU calibration (`--cpu-calibration`) was off here and in October. A calibrated run would put both machines on the same effective device. Calibration changes the profile, so it was out of scope.
- **Vendor geo behaviour.** The profile says `region: GB`, but vendors see this machine's real IP. They served the same bytes as October to within 0.5 KB (except Didomi and OneTrust), but I didn't check whether any of them changed banner logic by region.
- **`accept` click time.** CookieBench clicks at readiness, which comes at a different time for each CMP. The `action.*` numbers compare from-tap latency, not when the choice takes effect relative to navigation.
- **Reject, save, preferences and returning scenarios** were not run for competitors.

## Files

- Configs: `/home/kaylee/.t3/scratch/lcp-fleet/competitors/configs/` (`nextjs-{mobile,desktop}.json`, `nextjs-cookie-yes-{mobile,desktop}.json`, `nextjs-mobile-accept-subset.json`, `c15t-{canary,defer}-{mobile,desktop}.json`)
- Runs: `/home/kaylee/.t3/scratch/lcp-fleet/competitors/runs/<label>-<ts>/`
- October 95% recomputes: `/home/kaylee/.t3/scratch/lcp-fleet/competitors/october/`
- Harness envelopes recompared: `/home/kaylee/.t3/scratch/lcp-fleet/competitors/harness-envelopes/`
- Scripts: `/home/kaylee/.t3/scratch/lcp-fleet/competitors/bin/` (`make-configs.py`, `make-c15t-configs.py`, `cb-run.sh`, `summarize.py`, `queue-*.sh`)
