# CMP comparison, September 30, 2026

## Known defects (2026-10-02)

Code review found collector and fixture defects that affect rows in this report. The recorded numbers below are unchanged. The rows listed here are withdrawn pending a rerun with corrected code.

| Defect | Affected rows | Status |
| --- | --- | --- |
| The Astro and Nuxt fixture proxies compressed HTML but served JS and CSS uncompressed. | c15t Astro and c15t Nuxt `initial.transfer` and `initial.encoded-body`, both profiles. The Astro desktop transfer difference (249,949 B) is close to its decoded-body difference (251,520 B). | Withdrawn |
| c15t Nuxt desktop recorded `initial.transfer` of 1,324,995 B, above its `initial.decoded-body` of 1,057,200 B. Uncompressed transfer cannot exceed the decoded body by that margin. | All c15t Nuxt byte rows. | Withdrawn |
| A load-scenario LCP could come from a smaller text candidate when the article image had not painted by the 5 s cutoff, and still enter comparisons. | onetrust mobile `page.lcp`, whose 26 eligible candidates were attributed to `DIV#onetrust-policy-text`. All other eligible load LCP rows were attributed to the article image. | Withdrawn |
| Comparisons marked ineligible still printed an interval and a signed difference. | Every row marked `ineligible` that shows an interval, for example enzuzo, ketch, onetrust and osano desktop `page.lcp`. Their direction is not evidence. | Withdrawn as conclusions; values kept as descriptive records |
| The byte collector did not follow redirects or cross-site iframes. | ketch, onetrust and osano byte rows are unavailable. Missing values are not zero, and no byte comparison exists for these fixtures. | Unavailable |
| CPU throttling applied to the main frame only, not to cross-site iframes. | Emulated-mobile timing rows for any competitor that ran work in a cross-site iframe. This report does not record which competitors did, so every competitor mobile timing row is unverified. c15t fixtures load no iframes. | Unverified |

## Overview

Raw run artifacts are not stored in this repository. The `artifacts/` paths below name files from the original runs and cannot be checked from this checkout.

Snapshot generated 2026-10-01T14:21:34.944Z. Final analysis snapshot; entry status below determines collection completeness.

These fixtures are not like-for-like, and no row ordering or difference between CMPs is a ranking. c15t fixtures call a controlled local test backend on the same machine; on the desktop profile it adds 0 ms latency, so its responses return almost at once. Competitor fixtures call their vendors' remote services. c15t Next.js uses its native provider, Ketch and Osano load from a client effect after hydration, and the proxy injects the other competitors into `<head>` or before `</body>`. Headline tables label each row with its backend and placement.

## Readout

This report retains 3,276 recorded primary visits across the September 30 originals and October 1 corrections. The original repeated stage recorded 2,670 of 2,700 planned visits; its Nuxt mobile build failure left 30 visits unrecorded. Separate original correctness checks recorded 306 visits and instrumentation audits recorded 120. All six correction cohorts finished, adding 180 primary visits and 160 separate followup probes. Corrections preserve every original failure and do not enter original medians.

- Original c15t Next.js load cohorts had 30 eligible LCP pairs per profile. Candidate-minus-control median differences were 4 ms on desktop, with a 95% bootstrap interval of -2 to 4 ms, and 436 ms on emulated mobile, with an interval of 428 to 444 ms. Desktop was inconclusive. These compare each fixture with its own no-CMP control; c15t's controlled local backend and competitors' live remote services do not support an equivalent-production ranking.
- Original c15t Next.js mobile actions verified correctness in all 30 attempts, while raw statuses were 27 passed and three incomplete. Accept, reject and save input-to-next-paint medians were 108, 88 and 36 ms, with 10 of 10 observations included for each action. These are laboratory Event Timing durations, not field INP. Timing availability and correctness have separate denominators throughout the report.
- Under the explicit public-state readiness contract, both corrected Didomi profiles passed all 30 primary attempts and all 30 followups each. Enzuzo desktop also passed all 30 primaries and followups; mobile save passed all ten primaries and ten followups. The correction accepts matching public readiness and restored choice evidence without requiring the inconsistent HTML marker. It does not establish who removed the earlier marker. Enzuzo mobile accept/reject still produced 20 incomplete attempts because their buttons were outside the viewport, with unknown correctness and no followups.
- The corrected Nuxt mobile cohort recorded all 30 planned primaries and verified correctness for all 30. Twenty retained incomplete raw statuses because required transfer observations were unavailable. Corrected TanStack Start desktop passed all 30 primaries and 30 followups. These additional cohorts do not explain or erase the original Nuxt build timeout or TanStack outage, and their timings are not evidence of c15t speedups between collection dates.

The October 1 correction used runner and methodology 3.2.1. The original product cohorts retain 3.2.0, and instrumentation audits retain their own methodology. After stale fixture servers were stopped, the pre-collection baseline showed 76.44–79.20% CPU idle, 0.178 MiB/s swap-in and no swap-out. This was a shared host, not an isolated machine. The post-run one-minute load average was 29.17; the baseline does not describe every visit. Neither observation establishes host conditions during the originals or attributes their failures to the stopped servers. See the host start note (`artifacts/cmp-comparison-2026-09-30/corrections-001/execution-host-start-note.json`), post-run host observation (`artifacts/cmp-comparison-2026-09-30/corrections-001/host-observation-post-run.json`), correction totals (`artifacts/cmp-comparison-2026-09-30/corrections-001/totals.json`), passing postflight (`artifacts/cmp-comparison-2026-09-30/corrections-001/postflight.json`) and correction manifest (`artifacts/cmp-comparison-2026-09-30/correction-manifest.json`).

Independent reconciliation found a retained 3.2.0 collector defect in 72 original action visits and followup probes. When input never occurred, the observer had no deadline but metadata reported a 1,500 ms window. This left 144 LCP or primary-content-paint values beyond that nominal window. All 144 were already excluded by failed or unsupported behavior, so they do not enter report estimates. The raw values and the initial failed review remain preserved. This limitation affects 71 Ketch mobile visits or probes and one Cookie Control mobile unsupported-save followup. See the paint-cutoff defect evidence (`artifacts/cmp-comparison-2026-09-30/paint-cutoff-defect-evidence.json`). Reconciliation accounts for this known defect; it does not certify every raw metric as valid.

Repeated cohorts contain 2670 primary attempts, raw passed/failed/incomplete 2045/68/557, and 810 separate followup probes. Correctness-check cohorts contain 306 primary attempts, raw 163/13/130, and 183 followup probes. Warmups are excluded. Missing entries and absent probes are not passes.

The main comparison is c15t Next.js and seven competitor integrations using Next.js. Other c15t frameworks appear separately as supplementary fixture measurements. Rows are in protocol order, not performance rank. CookieYes is excluded from this batch; Usercentrics remains configuration-blocked. Separate c15t and CookieYes script-tag comparisons are listed in the README.

This batch uses a controlled local strict-opt-in backend for c15t. Competitors contact live remote vendor services. The c15t mock acknowledges consent writes without a production database; its latency does not establish hosted Inth performance. Backend and asset classifications remain explicit. No cross-topology winner or product ranking follows from these results. Manifest mode is excluded. A future managed Inth endpoint needs separate measurements with its own fixture identity and allowed benchmark hostname.

## Protocol and evidence

The repeated matrix requests 30 candidate/control load pairs plus three excluded warmup pairs for each of 15 integrations on desktop and emulated mobile. Separate candidate-only cohorts request ten accept, reject and save attempts each, with a common 500 ms followup offset. The plan requests 1,800 load visits and 900 action visits, plus up to 900 separate action followup probes. Actual observed counts appear in the entry tables. Thirty additional candidate-only cohorts exercise each integration's complete declared scenario list once. Those correctness checks retain their declared offsets and are not pooled with repeated action estimates.

Every absolute metric uses `summarize` with manifest, fixture and scenario context. A raw incomplete attempt may contribute a valid metric when its only failure concerns an unavailable unrelated measurement. Failed behavior and other blocking failures still exclude its values. Correctness uses explicit collector completion evidence independently of metric availability. Raw attempt statuses remain unchanged. Missing or censored values never become zero.

Table counts A/I/E/M mean available measured values, included values, measured values excluded by eligibility, and missing values. A = I + E; attempts = A + M. Median and p75 use included values only. Raw P/F/I means passed/failed/incomplete. Correctness V/F/U means verified/failed/unknown. All per-sample exclusions, measurement methods, failures and hashes are in report-summary.json (`artifacts/cmp-comparison-2026-09-30/report-summary.json`).

Paired differences subtract the matching no-CMP control from the candidate within each run and pair. The 95% percentile-bootstrap interval uses the analysis package's 2,000 resamples; eligibility requires at least 30 valid pairs and the recorded artifact/protocol checks. An ineligible numerical estimate is descriptive only. Action medians have no paired subtraction or confidence interval. All observations come from this batch; previous alpha.3 results are not pooled.

Load-only calibration does not measure the cost of input and unload snapshots added by the collector. Those instrumentation costs remain a limitation until independently calibrated.

Static-file fixtures now negotiate Brotli or gzip for HTML/JS/CSS. Native framework assets retain their upstream serving policy. Proxied competitor HTML is compressed after bootstrap injection for both candidate and control, with streaming flushes; already compressed upstream bodies pass through unchanged. This changes fixture identity from earlier uncompressed evidence. Transfer includes CDP-observed overhead; encoded and decoded bodies remain separate. Missing exact compressed lengths are not filled using transfer size. See [deployment and compression audit](audit-deployment-compression.md).

Recorded runtime: 153.0.8010.12, Playwright 1.63.0, Node v24.19.0; collector cookiebench-runner-3.2.0; methodology cookiebench-v3.2.0; analysis cookiebench-analysis-v3.2.0. Exact environments, profiles and source hashes remain in each envelope.

Profile desktop-article-v1: 1365 × 768, DPR 1, CPU slowdown 1, latency 0 ms, download/upload 12500000/12500000 B/s. Desktop laboratory profile.

Profile mobile-article-v1: 390 × 844, DPR 3, CPU slowdown 4, latency 150 ms, download/upload 200000/93750 B/s. Mobile/touch emulation, not a physical phone.

## Stage totals

Original cohorts were collected on September 30, 2026. Correction cohorts were collected on October 1, 2026. Each stage retains its own workload and observed counts. A later correction does not fill an earlier collection shortfall.

| Stage | Entries / envelopes / no-envelope errors | Planned / observed / unrecorded primary visits | Raw P/F/I | Observed / expected followups from recorded primaries |
| --- | --: | --: | --- | --: |
| repeated | 62 / 59 / 1 | 2700 / 2670 / 30 | 2045/68/557 | 810 / 870 |
| checks | 30 / 30 / 0 | 306 / 306 / 0 | 163/13/130 | 183 / 190 |
| audits | 2 / 2 / 0 | 120 / 120 / 0 | 120/0/0 | 0 / 0 |
| correction-001 | 6 / 6 / 0 | 180 / 180 / 0 | 140/0/40 | 160 / 180 |

Followup expectations here concern recorded primary visits. A no-envelope entry has no observed primary or followup visits. Its planned primary workload remains in the unrecorded column. Excluded and configuration-blocked entries declare no primary workload.

## Entry completion

| Entry | Stage | Status | Planned / observed / unrecorded visits | Correction of | Error, exclusion or correction reason |
| --- | --- | --- | --: | --- | --- |
| c15t-script-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-headless-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-react-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-nextjs-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-vue-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-nuxt-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-astro-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-tanstack-start-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| cookie-control-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| didomi-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| enzuzo-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| iubenda-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| ketch-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| onetrust-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| osano-desktop-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-script-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-headless-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-react-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-nextjs-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-vue-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-nuxt-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-astro-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-tanstack-start-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| cookie-control-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| didomi-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| enzuzo-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| iubenda-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| ketch-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| onetrust-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| osano-mobile-load | repeated | recorded | 60 / 60 / 0 |  |  |
| c15t-script-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-headless-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-react-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-nextjs-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-vue-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-nuxt-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-astro-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-tanstack-start-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| cookie-control-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| didomi-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| enzuzo-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| iubenda-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| ketch-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| onetrust-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| osano-desktop-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-script-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-headless-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-react-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-nextjs-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-vue-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-nuxt-mobile-actions | repeated | execution-error | 30 / 0 / 30 |  |  |
| c15t-astro-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| c15t-tanstack-start-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| cookie-control-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| didomi-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| enzuzo-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| iubenda-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| ketch-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| onetrust-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| osano-mobile-actions | repeated | recorded | 30 / 30 / 0 |  |  |
| cookieyes-excluded | repeated | excluded | 0 / 0 / 0 |  | Excluded from this batch; no benchmark-domain configuration supplied. |
| usercentrics-configuration-blocked | repeated | configuration-blocked | 0 / 0 / 0 |  | Existing public ruleset initializes with consent not required and no banner; no replacement strict-opt-in configuration supplied. |
| c15t-script-desktop-checks | checks | recorded | 10 / 10 / 0 |  |  |
| c15t-headless-desktop-checks | checks | recorded | 7 / 7 / 0 |  |  |
| c15t-react-desktop-checks | checks | recorded | 10 / 10 / 0 |  |  |
| c15t-nextjs-desktop-checks | checks | recorded | 10 / 10 / 0 |  |  |
| c15t-vue-desktop-checks | checks | recorded | 12 / 12 / 0 |  |  |
| c15t-nuxt-desktop-checks | checks | recorded | 12 / 12 / 0 |  |  |
| c15t-astro-desktop-checks | checks | recorded | 12 / 12 / 0 |  |  |
| c15t-tanstack-start-desktop-checks | checks | recorded | 10 / 10 / 0 |  |  |
| cookie-control-desktop-checks | checks | recorded | 10 / 10 / 0 |  |  |
| didomi-desktop-checks | checks | recorded | 10 / 10 / 0 |  |  |
| enzuzo-desktop-checks | checks | recorded | 10 / 10 / 0 |  |  |
| iubenda-desktop-checks | checks | recorded | 10 / 10 / 0 |  |  |
| ketch-desktop-checks | checks | recorded | 10 / 10 / 0 |  |  |
| onetrust-desktop-checks | checks | recorded | 10 / 10 / 0 |  |  |
| osano-desktop-checks | checks | recorded | 10 / 10 / 0 |  |  |
| c15t-script-mobile-checks | checks | recorded | 10 / 10 / 0 |  |  |
| c15t-headless-mobile-checks | checks | recorded | 7 / 7 / 0 |  |  |
| c15t-react-mobile-checks | checks | recorded | 10 / 10 / 0 |  |  |
| c15t-nextjs-mobile-checks | checks | recorded | 10 / 10 / 0 |  |  |
| c15t-vue-mobile-checks | checks | recorded | 12 / 12 / 0 |  |  |
| c15t-nuxt-mobile-checks | checks | recorded | 12 / 12 / 0 |  |  |
| c15t-astro-mobile-checks | checks | recorded | 12 / 12 / 0 |  |  |
| c15t-tanstack-start-mobile-checks | checks | recorded | 10 / 10 / 0 |  |  |
| cookie-control-mobile-checks | checks | recorded | 10 / 10 / 0 |  |  |
| didomi-mobile-checks | checks | recorded | 10 / 10 / 0 |  |  |
| enzuzo-mobile-checks | checks | recorded | 10 / 10 / 0 |  |  |
| iubenda-mobile-checks | checks | recorded | 10 / 10 / 0 |  |  |
| ketch-mobile-checks | checks | recorded | 10 / 10 / 0 |  |  |
| onetrust-mobile-checks | checks | recorded | 10 / 10 / 0 |  |  |
| osano-mobile-checks | checks | recorded | 10 / 10 / 0 |  |  |
| nextjs-desktop-overhead | audits | recorded | 60 / 60 / 0 |  |  |
| nextjs-mobile-overhead | audits | recorded | 60 / 60 / 0 |  |  |
| c15t-nuxt-mobile-actions-correction-001 | correction-001 | recorded | 30 / 30 / 0 | c15t-nuxt-mobile-actions | Repeat the declared action cohort after the original production-build timeout; retain build/server evidence. |
| c15t-tanstack-start-desktop-actions-correction-001 | correction-001 | recorded | 30 / 30 / 0 | c15t-tanstack-start-desktop-actions | Repeat the declared action cohort after the original fixture-server outage; retain build/server evidence. |
| didomi-desktop-actions-correction-001 | correction-001 | recorded | 30 / 30 / 0 | didomi-desktop-actions | Use the explicit public-state readiness contract in a separate revised fixture cohort; retain original DOM-marker outcomes. |
| didomi-mobile-actions-correction-001 | correction-001 | recorded | 30 / 30 / 0 | didomi-mobile-actions | Use the explicit public-state readiness contract in a separate revised fixture cohort; retain original DOM-marker outcomes. |
| enzuzo-desktop-actions-correction-001 | correction-001 | recorded | 30 / 30 / 0 | enzuzo-desktop-actions | Use the explicit public-state readiness contract in a separate revised fixture cohort; retain original DOM-marker outcomes. |
| enzuzo-mobile-actions-correction-001 | correction-001 | recorded | 30 / 30 / 0 | enzuzo-mobile-actions | Use the explicit public-state readiness contract in a separate revised fixture cohort; retain original DOM-marker outcomes. |

Original and correction stages remain separate. Corrections do not replace original statuses or enter original medians. A missing envelope records unobserved planned visits, not failed browser attempts. Each correction row names its stage, original entry, collector and methodology.

## Main Next.js fixtures

Rows are labelled by backend and script placement. c15t uses a controlled local backend; every competitor uses its vendor's remote services. Rows from different groups are not like-for-like.

| Fixture | Backend / assets | Integration and placement |
| --- | --- | --- |
| c15t Next.js | controlled-local / local | Native `c15t/next` client provider |
| cookie-control | remote-service / mixed | Proxy-injected loader before `</body>` |
| didomi, enzuzo, onetrust | remote-service / mixed | Proxy-injected loader at the start of `<head>` |
| iubenda | remote-service / mixed | Proxy-injected loader at the end of `<head>` |
| ketch, osano | remote-service / mixed | Client effect after hydration |

| Fixture/profile | Backend / assets | Raw candidate P/F/I | Correctness V/F/U | Baseline / candidate visits |
| --- | --- | --- | --- | --: |
| c15t Next.js desktop (local backend, native provider) | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| cookie-control desktop (remote, before `</body>`) | remote-service / mixed | 30/0/0 | 30/0/0 | 30 / 30 |
| didomi desktop (remote, start of `<head>`) | remote-service / mixed | 30/0/0 | 30/0/0 | 30 / 30 |
| enzuzo desktop (remote, start of `<head>`) | remote-service / mixed | 30/0/0 | 30/0/0 | 30 / 30 |
| iubenda desktop (remote, end of `<head>`) | remote-service / mixed | 30/0/0 | 30/0/0 | 30 / 30 |
| ketch desktop (remote, client effect) | remote-service / mixed | 0/0/30 | 30/0/0 | 30 / 30 |
| onetrust desktop (remote, start of `<head>`) | remote-service / mixed | 0/0/30 | 30/0/0 | 30 / 30 |
| osano desktop (remote, client effect) | remote-service / mixed | 0/0/30 | 30/0/0 | 30 / 30 |
| c15t Next.js mobile (local backend, native provider) | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| cookie-control mobile (remote, before `</body>`) | remote-service / mixed | 30/0/0 | 30/0/0 | 30 / 30 |
| didomi mobile (remote, start of `<head>`) | remote-service / mixed | 30/0/0 | 30/0/0 | 30 / 30 |
| enzuzo mobile (remote, start of `<head>`) | remote-service / mixed | 30/0/0 | 30/0/0 | 30 / 30 |
| iubenda mobile (remote, end of `<head>`) | remote-service / mixed | 30/0/0 | 30/0/0 | 30 / 30 |
| ketch mobile (remote, client effect) | remote-service / mixed | 0/30/0 | 0/30/0 | 30 / 30 |
| onetrust mobile (remote, start of `<head>`) | remote-service / mixed | 0/4/26 | 26/4/0 | 30 / 30 |
| osano mobile (remote, client effect) | remote-service / mixed | 0/1/29 | 29/1/0 | 30 / 30 |

### page.lcp

ms. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Next.js desktop (local backend, native provider) | 84 / 84; 30/30/0/0 | 84 / 88; 30/30/0/0 | 4; [-2, 4]; N=30; eligible |
| cookie-control desktop (remote, before `</body>`) | 96 / 96; 30/30/0/0 | 100 / 100; 30/30/0/0 | 4; [4, 4]; N=30; eligible |
| didomi desktop (remote, start of `<head>`) | 96 / 96; 30/30/0/0 | 100 / 100; 30/30/0/0 | 4; [4, 4]; N=30; eligible |
| enzuzo desktop (remote, start of `<head>`) | 96 / 96; 30/30/0/0 | 100 / 100; 30/30/0/0 | 4; [4, 4]; N=30; ineligible |
| iubenda desktop (remote, end of `<head>`) | 120 / 144; 30/30/0/0 | 124 / 156; 30/30/0/0 | 8; [-2, 16]; N=30; eligible |
| ketch desktop (remote, client effect) | 92 / 111; 30/30/0/0 | 90 / 112; 30/30/0/0 | 0; [-8, 4]; N=30; ineligible |
| onetrust desktop (remote, start of `<head>`) | 134 / 171; 30/30/0/0 | 188 / 244; 30/30/0/0 | 32; [18, 76]; N=30; ineligible |
| osano desktop (remote, client effect) | 88 / 122; 30/30/0/0 | 92 / 143; 30/30/0/0 | 4; [0, 6]; N=30; ineligible |
| c15t Next.js mobile (local backend, native provider) | 3,532 / 3,544; 30/30/0/0 | 3,972 / 3,975; 30/30/0/0 | 436; [428, 444]; N=30; eligible |
| cookie-control mobile (remote, before `</body>`) | 3,532 / 3,536; 30/30/0/0 | 4,020 / 4,035; 30/30/0/0 | 498; [480, 502]; N=30; eligible |
| didomi mobile (remote, start of `<head>`) | 3,512 / 3,516; 30/30/0/0 | 4,792 / 4,796; 30/30/0/0 | 1,272; [1,268, 1,284]; N=30; eligible |
| enzuzo mobile (remote, start of `<head>`) | 3,514 / 3,527; 30/30/0/0 | 4,292 / 4,307; 30/30/0/0 | 776; [774, 784]; N=30; ineligible |
| iubenda mobile (remote, end of `<head>`) | 3,528 / 3,536; 30/30/0/0 | 4,148 / 4,152; 30/30/0/0 | 616; [608, 628]; N=30; eligible |
| ketch mobile (remote, client effect) | 3,530 / 3,540; 30/30/0/0 | unavailable / unavailable; 30/0/30/0 | unavailable; no interval; N=0; ineligible |
| onetrust mobile (remote, start of `<head>`) | 3,516 / 3,531; 30/30/0/0 | 3,968 / 4,011; 30/26/4/0 | 432; no interval; N=26; ineligible |
| osano mobile (remote, client effect) | 3,524 / 3,532; 30/30/0/0 | 3,980 / 3,984; 30/29/1/0 | 452; no interval; N=29; ineligible |

### page.cls

unitless score. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Next.js desktop (local backend, native provider) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| cookie-control desktop (remote, before `</body>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| didomi desktop (remote, start of `<head>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| enzuzo desktop (remote, start of `<head>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; ineligible |
| iubenda desktop (remote, end of `<head>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| ketch desktop (remote, client effect) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; ineligible |
| onetrust desktop (remote, start of `<head>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; ineligible |
| osano desktop (remote, client effect) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; ineligible |
| c15t Next.js mobile (local backend, native provider) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| cookie-control mobile (remote, before `</body>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| didomi mobile (remote, start of `<head>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| enzuzo mobile (remote, start of `<head>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; ineligible |
| iubenda mobile (remote, end of `<head>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| ketch mobile (remote, client effect) | 0 / 0; 30/30/0/0 | unavailable / unavailable; 30/0/30/0 | unavailable; no interval; N=0; ineligible |
| onetrust mobile (remote, start of `<head>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/26/4/0 | 0; no interval; N=26; ineligible |
| osano mobile (remote, client effect) | 0 / 0; 30/30/0/0 | 0 / 0; 30/29/1/0 | 0; no interval; N=29; ineligible |

### page.primary-content-paint

ms. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Next.js desktop (local backend, native provider) | 84 / 84; 30/30/0/0 | 84 / 88; 30/30/0/0 | 4; [-2, 4]; N=30; eligible |
| cookie-control desktop (remote, before `</body>`) | 96 / 96; 30/30/0/0 | 100 / 100; 30/30/0/0 | 4; [4, 4]; N=30; eligible |
| didomi desktop (remote, start of `<head>`) | 96 / 96; 30/30/0/0 | 100 / 100; 30/30/0/0 | 4; [4, 4]; N=30; eligible |
| enzuzo desktop (remote, start of `<head>`) | 96 / 96; 30/30/0/0 | 100 / 100; 30/30/0/0 | 4; [4, 4]; N=30; ineligible |
| iubenda desktop (remote, end of `<head>`) | 120 / 144; 30/30/0/0 | 124 / 156; 30/30/0/0 | 8; [-2, 16]; N=30; eligible |
| ketch desktop (remote, client effect) | 92 / 111; 30/30/0/0 | 90 / 112; 30/30/0/0 | 0; [-8, 4]; N=30; ineligible |
| onetrust desktop (remote, start of `<head>`) | 134 / 171; 30/30/0/0 | 188 / 244; 30/30/0/0 | 32; [18, 76]; N=30; ineligible |
| osano desktop (remote, client effect) | 88 / 122; 30/30/0/0 | 92 / 143; 30/30/0/0 | 4; [0, 6]; N=30; ineligible |
| c15t Next.js mobile (local backend, native provider) | 3,532 / 3,544; 30/30/0/0 | 3,972 / 3,975; 30/30/0/0 | 436; [428, 444]; N=30; eligible |
| cookie-control mobile (remote, before `</body>`) | 3,532 / 3,536; 30/30/0/0 | 4,020 / 4,035; 30/30/0/0 | 498; [480, 502]; N=30; eligible |
| didomi mobile (remote, start of `<head>`) | 3,512 / 3,516; 30/30/0/0 | 4,792 / 4,796; 30/30/0/0 | 1,272; [1,268, 1,284]; N=30; eligible |
| enzuzo mobile (remote, start of `<head>`) | 3,514 / 3,527; 30/30/0/0 | 4,292 / 4,307; 30/30/0/0 | 776; [774, 784]; N=30; ineligible |
| iubenda mobile (remote, end of `<head>`) | 3,528 / 3,536; 30/30/0/0 | 4,148 / 4,152; 30/30/0/0 | 616; [608, 628]; N=30; eligible |
| ketch mobile (remote, client effect) | 3,530 / 3,540; 30/30/0/0 | unavailable / unavailable; 23/0/23/7 | unavailable; no interval; N=0; ineligible |
| onetrust mobile (remote, start of `<head>`) | 3,516 / 3,531; 30/30/0/0 | 4,604 / 4,620; 30/26/4/0 | 1,090; no interval; N=26; ineligible |
| osano mobile (remote, client effect) | 3,524 / 3,532; 30/30/0/0 | 3,980 / 3,984; 30/29/1/0 | 452; no interval; N=29; ineligible |

### banner.visible

ms. Values are median / p75; A/I/E/M. The no-CMP baseline has no banner.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Next.js desktop (local backend, native provider) | not applicable | 125.15 / 125.85; 30/30/0/0 | not applicable |
| cookie-control desktop (remote, before `</body>`) | not applicable | 321.55 / 354.9; 30/30/0/0 | not applicable |
| didomi desktop (remote, start of `<head>`) | not applicable | 509.95 / 648.77; 30/30/0/0 | not applicable |
| enzuzo desktop (remote, start of `<head>`) | not applicable | 351.95 / 376.33; 30/30/0/0 | not applicable |
| iubenda desktop (remote, end of `<head>`) | not applicable | 428.85 / 530.15; 30/30/0/0 | not applicable |
| ketch desktop (remote, client effect) | not applicable | 1,836.65 / 2,049.3; 30/30/0/0 | not applicable |
| onetrust desktop (remote, start of `<head>`) | not applicable | 695.65 / 773.23; 30/30/0/0 | not applicable |
| osano desktop (remote, client effect) | not applicable | 627.2 / 702.38; 30/30/0/0 | not applicable |
| c15t Next.js mobile (local backend, native provider) | not applicable | 2,405.8 / 2,422.85; 30/30/0/0 | not applicable |
| cookie-control mobile (remote, before `</body>`) | not applicable | 2,540.35 / 2,581.83; 30/30/0/0 | not applicable |
| didomi mobile (remote, start of `<head>`) | not applicable | 4,094.8 / 4,106.12; 30/30/0/0 | not applicable |
| enzuzo mobile (remote, start of `<head>`) | not applicable | 2,741.75 / 2,766.9; 30/30/0/0 | not applicable |
| iubenda mobile (remote, end of `<head>`) | not applicable | 2,702.9 / 2,753.28; 30/30/0/0 | not applicable |
| ketch mobile (remote, client effect) | not applicable | unavailable / unavailable; 0/0/0/30 | not applicable |
| onetrust mobile (remote, start of `<head>`) | not applicable | 3,947.6 / 3,989.15; 26/26/0/4 | not applicable |
| osano mobile (remote, client effect) | not applicable | 3,209 / 3,444.7; 29/29/0/1 | not applicable |

### initial.transfer

bytes. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Next.js desktop (local backend, native provider) | 631,897 / 631,897; 30/30/0/0 | 729,976 / 729,976; 30/30/0/0 | 98,079; [98,079, 98,079]; N=30; eligible |
| cookie-control desktop (remote, before `</body>`) | 631,123 / 631,123; 30/30/0/0 | 729,562 / 729,568; 30/30/0/0 | 98,439; [98,438, 98,440.03]; N=30; eligible |
| didomi desktop (remote, start of `<head>`) | 631,127 / 631,127; 30/30/0/0 | 883,978 / 883,982.75; 30/30/0/0 | 252,851; [252,850, 252,853]; N=30; eligible |
| enzuzo desktop (remote, start of `<head>`) | 631,120 / 631,120; 30/30/0/0 | 785,099.5 / 785,321; 30/30/0/0 | 153,979.5; [153,925, 154,045.5]; N=30; ineligible |
| iubenda desktop (remote, end of `<head>`) | 631,133 / 631,133; 30/30/0/0 | 752,078 / 752,086; 30/30/0/0 | 120,945; [120,945, 120,946]; N=30; eligible |
| ketch desktop (remote, client effect) | 631,899 / 631,899; 30/30/0/0 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| onetrust desktop (remote, start of `<head>`) | 631,127 / 631,127; 30/30/0/0 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| osano desktop (remote, client effect) | 631,902 / 631,902; 30/30/0/0 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| c15t Next.js mobile (local backend, native provider) | 631,897 / 631,897; 30/30/0/0 | 729,975 / 729,975; 30/30/0/0 | 98,078; [98,078, 98,078]; N=30; eligible |
| cookie-control mobile (remote, before `</body>`) | 631,140 / 631,140; 30/30/0/0 | 729,563 / 729,570; 30/30/0/0 | 98,423; [98,422, 98,430]; N=30; eligible |
| didomi mobile (remote, start of `<head>`) | 631,123 / 631,123; 30/30/0/0 | 883,123 / 883,127.75; 30/30/0/0 | 252,000; [251,998.5, 252,004]; N=30; eligible |
| enzuzo mobile (remote, start of `<head>`) | 631,120 / 631,120; 30/30/0/0 | 785,140.5 / 785,359.75; 30/30/0/0 | 154,019.5; [153,950, 154,202.5]; N=30; ineligible |
| iubenda mobile (remote, end of `<head>`) | 631,130 / 631,130; 30/30/0/0 | 752,070 / 752,077.75; 30/30/0/0 | 120,940; [120,940, 120,944]; N=30; eligible |
| ketch mobile (remote, client effect) | 631,902 / 631,902; 30/30/0/0 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| onetrust mobile (remote, start of `<head>`) | 631,112 / 631,112; 30/30/0/0 | unavailable / unavailable; 1/0/1/29 | unavailable; no interval; N=0; ineligible |
| osano mobile (remote, client effect) | 631,901 / 631,901; 30/30/0/0 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |

### initial.encoded-body

bytes. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Next.js desktop (local backend, native provider) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| cookie-control desktop (remote, before `</body>`) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| didomi desktop (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| enzuzo desktop (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| iubenda desktop (remote, end of `<head>`) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| ketch desktop (remote, client effect) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| onetrust desktop (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| osano desktop (remote, client effect) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| c15t Next.js mobile (local backend, native provider) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| cookie-control mobile (remote, before `</body>`) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| didomi mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| enzuzo mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| iubenda mobile (remote, end of `<head>`) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| ketch mobile (remote, client effect) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| onetrust mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| osano mobile (remote, client effect) | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |

### initial.decoded-body

bytes. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Next.js desktop (local backend, native provider) | 977,458 / 977,458; 30/30/0/0 | 1,330,475 / 1,330,475; 30/30/0/0 | 353,017; [353,017, 353,017]; N=30; eligible |
| cookie-control desktop (remote, before `</body>`) | 976,537 / 976,537; 30/30/0/0 | 1,322,213 / 1,322,213; 30/30/0/0 | 345,676; [345,676, 345,676]; N=30; eligible |
| didomi desktop (remote, start of `<head>`) | 976,537 / 976,537; 30/30/0/0 | 1,971,833 / 1,971,833; 30/30/0/0 | 995,296; [995,296, 995,296]; N=30; eligible |
| enzuzo desktop (remote, start of `<head>`) | 976,537 / 976,537; 30/30/0/0 | 1,575,046 / 1,575,046; 30/30/0/0 | 598,509; [598,509, 598,509]; N=30; ineligible |
| iubenda desktop (remote, end of `<head>`) | 976,537 / 976,537; 30/30/0/0 | 1,431,836 / 1,431,836; 30/30/0/0 | 455,299; [455,299, 455,299]; N=30; eligible |
| ketch desktop (remote, client effect) | 977,238 / 977,238; 30/30/0/0 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| onetrust desktop (remote, start of `<head>`) | 976,530 / 976,530; 30/30/0/0 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| osano desktop (remote, client effect) | 977,238 / 977,238; 30/30/0/0 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| c15t Next.js mobile (local backend, native provider) | 977,458 / 977,458; 30/30/0/0 | 1,330,475 / 1,330,475; 30/30/0/0 | 353,017; [353,017, 353,017]; N=30; eligible |
| cookie-control mobile (remote, before `</body>`) | 976,537 / 976,537; 30/30/0/0 | 1,322,213 / 1,322,213; 30/30/0/0 | 345,676; [345,676, 345,676]; N=30; eligible |
| didomi mobile (remote, start of `<head>`) | 976,537 / 976,537; 30/30/0/0 | 1,972,332 / 1,972,332; 30/30/0/0 | 995,795; [995,795, 995,795]; N=30; eligible |
| enzuzo mobile (remote, start of `<head>`) | 976,537 / 976,537; 30/30/0/0 | 1,575,449 / 1,575,449; 30/30/0/0 | 598,912; [598,912, 598,912]; N=30; ineligible |
| iubenda mobile (remote, end of `<head>`) | 976,537 / 976,537; 30/30/0/0 | 1,431,836 / 1,431,836; 30/30/0/0 | 455,299; [455,299, 455,299]; N=30; eligible |
| ketch mobile (remote, client effect) | 977,238 / 977,238; 30/30/0/0 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| onetrust mobile (remote, start of `<head>`) | 976,530 / 976,530; 30/30/0/0 | unavailable / unavailable; 1/0/1/29 | unavailable; no interval; N=0; ineligible |
| osano mobile (remote, client effect) | 977,238 / 977,238; 30/30/0/0 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |

### initial.long-task-blocking

ms. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Next.js desktop (local backend, native provider) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| cookie-control desktop (remote, before `</body>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| didomi desktop (remote, start of `<head>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| enzuzo desktop (remote, start of `<head>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; ineligible |
| iubenda desktop (remote, end of `<head>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| ketch desktop (remote, client effect) | 0 / 0; 30/30/0/0 | 32 / 35; 30/30/0/0 | 32; [27, 34]; N=30; ineligible |
| onetrust desktop (remote, start of `<head>`) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; ineligible |
| osano desktop (remote, client effect) | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; ineligible |
| c15t Next.js mobile (local backend, native provider) | 54.5 / 65.75; 30/30/0/0 | 69 / 80.5; 30/30/0/0 | 12.5; [4, 24]; N=30; eligible |
| cookie-control mobile (remote, before `</body>`) | 45.5 / 52.5; 30/30/0/0 | 161 / 197; 30/30/0/0 | 122.5; [102, 136.5]; N=30; eligible |
| didomi mobile (remote, start of `<head>`) | 22 / 28.75; 30/30/0/0 | 186.5 / 194; 30/30/0/0 | 159.5; [154, 171.5]; N=30; eligible |
| enzuzo mobile (remote, start of `<head>`) | 24 / 37; 30/30/0/0 | 136 / 170.75; 30/30/0/0 | 108.5; [100.5, 120.5]; N=30; ineligible |
| iubenda mobile (remote, end of `<head>`) | 46 / 55.5; 30/30/0/0 | 73 / 84; 30/30/0/0 | 20; [11, 34]; N=30; eligible |
| ketch mobile (remote, client effect) | 47 / 56.75; 30/30/0/0 | unavailable / unavailable; 30/0/30/0 | unavailable; no interval; N=0; ineligible |
| onetrust mobile (remote, start of `<head>`) | 38.5 / 56; 30/30/0/0 | 108.5 / 164.25; 30/26/4/0 | 70; no interval; N=26; ineligible |
| osano mobile (remote, client effect) | 44.5 / 50; 30/30/0/0 | 165 / 195; 30/29/1/0 | 120; no interval; N=29; ineligible |

### LCP attribution

Attribution uses the same eligible samples as the LCP summary. Image paint is native Element Timing for the article image, independent of whether it wins LCP. Banner visibility is a DOM/layout observation. CLS is the bounded native session-window score; long-task blocking sums excess time above 50 ms in the observation window and is not Lighthouse TBT.

| Fixture/profile | Baseline elements | Candidate elements | Eligible attribution missing B/C |
| --- | --- | --- | --- |
| c15t Next.js desktop (local backend, native provider) | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| cookie-control desktop (remote, before `</body>`) | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| didomi desktop (remote, start of `<head>`) | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| enzuzo desktop (remote, start of `<head>`) | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| iubenda desktop (remote, end of `<head>`) | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| ketch desktop (remote, client effect) | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| onetrust desktop (remote, start of `<head>`) | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| osano desktop (remote, client effect) | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| c15t Next.js mobile (local backend, native provider) | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| cookie-control mobile (remote, before `</body>`) | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| didomi mobile (remote, start of `<head>`) | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| enzuzo mobile (remote, start of `<head>`) | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| iubenda mobile (remote, end of `<head>`) | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| ketch mobile (remote, client effect) | IMG#primary-content content: 30 | unavailable | 0/0 |
| onetrust mobile (remote, start of `<head>`) | IMG#primary-content content: 30 | DIV#onetrust-policy-text banner: 26 | 0/0 |
| osano mobile (remote, client effect) | IMG#primary-content content: 30 | IMG#primary-content content: 29 | 0/0 |

## Supplementary c15t frameworks

| Fixture/profile | Backend / assets | Raw candidate P/F/I | Correctness V/F/U | Baseline / candidate visits |
| --- | --- | --- | --- | --: |
| c15t Script tag desktop | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| c15t headless desktop | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| c15t React desktop | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| c15t Vue desktop | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| c15t Nuxt desktop | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| c15t Astro desktop | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| c15t TanStack Start desktop | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| c15t Script tag mobile | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| c15t headless mobile | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| c15t React mobile | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| c15t Vue mobile | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| c15t Nuxt mobile | controlled-local / local | 0/0/30 | 0/0/30 | 30 / 30 |
| c15t Astro mobile | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |
| c15t TanStack Start mobile | controlled-local / local | 30/0/0 | 30/0/0 | 30 / 30 |

### page.lcp

ms. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Script tag desktop | 76 / 76; 30/30/0/0 | 84 / 84; 30/30/0/0 | 12; [8, 20]; N=30; eligible |
| c15t headless desktop | 76 / 76; 30/30/0/0 | 92 / 92; 30/30/0/0 | 16; [12, 16]; N=30; eligible |
| c15t React desktop | 80 / 84; 30/30/0/0 | 112 / 122; 30/30/0/0 | 32; [28, 32]; N=30; eligible |
| c15t Vue desktop | 80 / 80; 30/30/0/0 | 100 / 100; 30/30/0/0 | 20; [20, 20]; N=30; eligible |
| c15t Nuxt desktop | 88 / 88; 30/30/0/0 | 200 / 203; 30/30/0/0 | 112; [110, 114]; N=30; eligible |
| c15t Astro desktop | 80 / 84; 30/30/0/0 | 96 / 109; 30/30/0/0 | 16; [16, 20]; N=30; eligible |
| c15t TanStack Start desktop | 90 / 100; 30/30/0/0 | 112 / 130; 30/30/0/0 | 20; [16, 26]; N=30; eligible |
| c15t Script tag mobile | 2,860 / 2,860; 30/30/0/0 | 3,292 / 3,292; 30/30/0/0 | 432; [420, 432]; N=30; eligible |
| c15t headless mobile | 2,872 / 2,887; 30/30/0/0 | 3,198 / 3,204; 30/30/0/0 | 320; [314, 328]; N=30; eligible |
| c15t React mobile | 3,368 / 3,388; 30/30/0/0 | 3,886 / 3,892; 30/30/0/0 | 510; [496, 524]; N=30; eligible |
| c15t Vue mobile | 3,188 / 3,199; 30/30/0/0 | 3,610 / 3,622; 30/30/0/0 | 420; [408, 432]; N=30; eligible |
| c15t Nuxt mobile | 3,628 / 3,632; 30/30/0/0 | unavailable / unavailable; 30/0/30/0 | unavailable; no interval; N=0; ineligible |
| c15t Astro mobile | 2,848 / 2,867; 30/30/0/0 | 4,132 / 4,139; 30/30/0/0 | 1,274; [1,264, 1,282]; N=30; eligible |
| c15t TanStack Start mobile | 3,426 / 3,432; 30/30/0/0 | 3,842 / 3,856; 30/30/0/0 | 416; [412, 428]; N=30; eligible |

### page.cls

unitless score. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Script tag desktop | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t headless desktop | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t React desktop | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t Vue desktop | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t Nuxt desktop | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t Astro desktop | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t TanStack Start desktop | 0 / 0; 30/30/0/0 | 0.019575 / 0.019575; 30/30/0/0 | 0.019575; [0, 0.019575]; N=30; eligible |
| c15t Script tag mobile | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t headless mobile | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t React mobile | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t Vue mobile | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t Nuxt mobile | 0 / 0; 30/30/0/0 | unavailable / unavailable; 30/0/30/0 | unavailable; no interval; N=0; ineligible |
| c15t Astro mobile | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t TanStack Start mobile | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |

### page.primary-content-paint

ms. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Script tag desktop | 76 / 76; 30/30/0/0 | 84 / 84; 30/30/0/0 | 12; [8, 20]; N=30; eligible |
| c15t headless desktop | 76 / 76; 30/30/0/0 | 92 / 92; 30/30/0/0 | 16; [12, 16]; N=30; eligible |
| c15t React desktop | 80 / 84; 30/30/0/0 | 112 / 122; 30/30/0/0 | 32; [28, 32]; N=30; eligible |
| c15t Vue desktop | 80 / 80; 30/30/0/0 | 100 / 100; 30/30/0/0 | 20; [20, 20]; N=30; eligible |
| c15t Nuxt desktop | 88 / 88; 30/30/0/0 | 200 / 203; 30/30/0/0 | 112; [110, 114]; N=30; eligible |
| c15t Astro desktop | 80 / 84; 30/30/0/0 | 96 / 109; 30/30/0/0 | 16; [16, 20]; N=30; eligible |
| c15t TanStack Start desktop | 90 / 100; 30/30/0/0 | 112 / 130; 30/30/0/0 | 20; [16, 26]; N=30; eligible |
| c15t Script tag mobile | 2,860 / 2,860; 30/30/0/0 | 3,292 / 3,292; 30/30/0/0 | 432; [420, 432]; N=30; eligible |
| c15t headless mobile | 2,872 / 2,887; 30/30/0/0 | 3,198 / 3,204; 30/30/0/0 | 320; [314, 328]; N=30; eligible |
| c15t React mobile | 3,368 / 3,388; 30/30/0/0 | 3,886 / 3,892; 30/30/0/0 | 510; [496, 524]; N=30; eligible |
| c15t Vue mobile | 3,188 / 3,199; 30/30/0/0 | 3,610 / 3,622; 30/30/0/0 | 420; [408, 432]; N=30; eligible |
| c15t Nuxt mobile | 3,628 / 3,632; 30/30/0/0 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| c15t Astro mobile | 2,848 / 2,867; 30/30/0/0 | 4,132 / 4,139; 30/30/0/0 | 1,274; [1,264, 1,282]; N=30; eligible |
| c15t TanStack Start mobile | 3,426 / 3,432; 30/30/0/0 | 3,842 / 3,856; 30/30/0/0 | 416; [412, 428]; N=30; eligible |

### banner.visible

ms. Values are median / p75; A/I/E/M. The no-CMP baseline has no banner.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Script tag desktop | not applicable | 55.5 / 73.82; 30/30/0/0 | not applicable |
| c15t headless desktop | not applicable | 38.45 / 38.8; 30/30/0/0 | not applicable |
| c15t React desktop | not applicable | 107.1 / 122.78; 30/30/0/0 | not applicable |
| c15t Vue desktop | not applicable | 57.1 / 58.57; 30/30/0/0 | not applicable |
| c15t Nuxt desktop | not applicable | 80.45 / 82.65; 30/30/0/0 | not applicable |
| c15t Astro desktop | not applicable | 51.45 / 52.07; 30/30/0/0 | not applicable |
| c15t TanStack Start desktop | not applicable | 28.7 / 38.1; 30/30/0/0 | not applicable |
| c15t Script tag mobile | not applicable | 1,454.2 / 1,456.08; 30/30/0/0 | not applicable |
| c15t headless mobile | not applicable | 1,243.05 / 1,262.78; 30/30/0/0 | not applicable |
| c15t React mobile | not applicable | 1,465.35 / 1,480.77; 30/30/0/0 | not applicable |
| c15t Vue mobile | not applicable | 1,163.25 / 1,177.25; 30/30/0/0 | not applicable |
| c15t Nuxt mobile | not applicable | unavailable / unavailable; 30/0/30/0 | not applicable |
| c15t Astro mobile | not applicable | 1,312.6 / 1,327.25; 30/30/0/0 | not applicable |
| c15t TanStack Start mobile | not applicable | 546.05 / 555.72; 30/30/0/0 | not applicable |

### initial.transfer

bytes. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Script tag desktop | 499,161 / 499,161; 30/30/0/0 | 582,636 / 582,636; 30/30/0/0 | 83,475; [83,475, 83,475]; N=30; eligible |
| c15t headless desktop | 499,161 / 499,161; 30/30/0/0 | 561,433 / 561,433; 30/30/0/0 | 62,272; [62,272, 62,272]; N=30; eligible |
| c15t React desktop | 551,263 / 551,263; 30/30/0/0 | 633,872 / 633,872; 30/30/0/0 | 82,609; [82,609, 82,609]; N=30; eligible |
| c15t Vue desktop | 526,175 / 526,175; 30/30/0/0 | 607,980 / 607,980; 30/30/0/0 | 81,805; [81,805, 81,805]; N=30; eligible |
| c15t Nuxt desktop | 650,955 / 650,955; 30/30/0/0 | 1,324,995 / 1,325,004; 30/30/0/0 | 674,041.5; [674,036.5, 674,046.5]; N=30; eligible |
| c15t Astro desktop | 497,703 / 497,703; 30/30/0/0 | 747,652 / 747,655; 30/30/0/0 | 249,949; [249,945, 249,952]; N=30; eligible |
| c15t TanStack Start desktop | 606,215 / 606,221; 30/30/0/0 | 706,078.5 / 706,084; 30/30/0/0 | 99,863; [99,862, 99,864]; N=30; eligible |
| c15t Script tag mobile | 499,161 / 499,161; 30/30/0/0 | 582,636 / 582,636; 30/30/0/0 | 83,475; [83,475, 83,475]; N=30; eligible |
| c15t headless mobile | 499,161 / 499,161; 30/30/0/0 | 561,433 / 561,433; 30/30/0/0 | 62,272; [62,272, 62,272]; N=30; eligible |
| c15t React mobile | 551,263 / 551,263; 30/30/0/0 | 633,872 / 633,872; 30/30/0/0 | 82,609; [82,609, 82,609]; N=30; eligible |
| c15t Vue mobile | 526,175 / 526,175; 30/30/0/0 | 607,980 / 607,980; 30/30/0/0 | 81,805; [81,805, 81,805]; N=30; eligible |
| c15t Nuxt mobile | 650,954 / 650,955; 30/30/0/0 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| c15t Astro mobile | 497,703 / 497,703; 30/30/0/0 | 747,655 / 747,656.75; 30/30/0/0 | 249,952; [249,951, 249,952.5]; N=30; eligible |
| c15t TanStack Start mobile | 606,215 / 606,218.25; 30/30/0/0 | 706,082.5 / 706,091; 30/30/0/0 | 99,868; [99,865.5, 99,873]; N=30; eligible |

### initial.encoded-body

bytes. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Script tag desktop | 496,968 / 496,968; 30/30/0/0 | 579,480 / 579,480; 30/30/0/0 | 82,512; [82,512, 82,512]; N=30; eligible |
| c15t headless desktop | 496,968 / 496,968; 30/30/0/0 | 558,619 / 558,619; 30/30/0/0 | 61,651; [61,651, 61,651]; N=30; eligible |
| c15t React desktop | 548,725 / 548,725; 30/30/0/0 | 628,670 / 628,670; 30/30/0/0 | 79,945; [79,945, 79,945]; N=30; eligible |
| c15t Vue desktop | 523,980 / 523,980; 30/30/0/0 | 602,448 / 602,448; 30/30/0/0 | 78,468; [78,468, 78,468]; N=30; eligible |
| c15t Nuxt desktop | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| c15t Astro desktop | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| c15t TanStack Start desktop | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| c15t Script tag mobile | 496,968 / 496,968; 30/30/0/0 | 579,480 / 579,480; 30/30/0/0 | 82,512; [82,512, 82,512]; N=30; eligible |
| c15t headless mobile | 496,968 / 496,968; 30/30/0/0 | 558,619 / 558,619; 30/30/0/0 | 61,651; [61,651, 61,651]; N=30; eligible |
| c15t React mobile | 548,725 / 548,725; 30/30/0/0 | 628,670 / 628,670; 30/30/0/0 | 79,945; [79,945, 79,945]; N=30; eligible |
| c15t Vue mobile | 523,980 / 523,980; 30/30/0/0 | 602,448 / 602,448; 30/30/0/0 | 78,468; [78,468, 78,468]; N=30; eligible |
| c15t Nuxt mobile | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| c15t Astro mobile | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| c15t TanStack Start mobile | unavailable / unavailable; 0/0/0/30 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |

### initial.decoded-body

bytes. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Script tag desktop | 526,781 / 526,781; 30/30/0/0 | 884,620 / 884,620; 30/30/0/0 | 357,839; [357,839, 357,839]; N=30; eligible |
| c15t headless desktop | 526,781 / 526,781; 30/30/0/0 | 754,906 / 754,906; 30/30/0/0 | 228,125; [228,125, 228,125]; N=30; eligible |
| c15t React desktop | 716,831 / 716,831; 30/30/0/0 | 1,061,140 / 1,061,140; 30/30/0/0 | 344,309; [344,309, 344,309]; N=30; eligible |
| c15t Vue desktop | 603,325 / 603,325; 30/30/0/0 | 933,346 / 933,346; 30/30/0/0 | 330,021; [330,021, 330,021]; N=30; eligible |
| c15t Nuxt desktop | 662,516 / 662,516; 30/30/0/0 | 1,057,200 / 1,057,200; 30/30/0/0 | 394,684; [394,684, 394,684]; N=30; eligible |
| c15t Astro desktop | 525,065 / 525,065; 30/30/0/0 | 776,585 / 776,585; 30/30/0/0 | 251,520; [251,520, 251,520]; N=30; eligible |
| c15t TanStack Start desktop | 846,929 / 846,929; 30/30/0/0 | 1,197,516 / 1,197,516; 30/30/0/0 | 350,587; [350,587, 350,587]; N=30; eligible |
| c15t Script tag mobile | 526,781 / 526,781; 30/30/0/0 | 884,620 / 884,620; 30/30/0/0 | 357,839; [357,839, 357,839]; N=30; eligible |
| c15t headless mobile | 526,781 / 526,781; 30/30/0/0 | 754,906 / 754,906; 30/30/0/0 | 228,125; [228,125, 228,125]; N=30; eligible |
| c15t React mobile | 716,831 / 716,831; 30/30/0/0 | 1,061,140 / 1,061,140; 30/30/0/0 | 344,309; [344,309, 344,309]; N=30; eligible |
| c15t Vue mobile | 603,325 / 603,325; 30/30/0/0 | 933,346 / 933,346; 30/30/0/0 | 330,021; [330,021, 330,021]; N=30; eligible |
| c15t Nuxt mobile | 662,516 / 662,516; 30/30/0/0 | unavailable / unavailable; 0/0/0/30 | unavailable; no interval; N=0; ineligible |
| c15t Astro mobile | 525,065 / 525,065; 30/30/0/0 | 776,585 / 776,585; 30/30/0/0 | 251,520; [251,520, 251,520]; N=30; eligible |
| c15t TanStack Start mobile | 846,929 / 846,929; 30/30/0/0 | 1,197,516 / 1,197,516; 30/30/0/0 | 350,587; [350,587, 350,587]; N=30; eligible |

### initial.long-task-blocking

ms. Values are median / p75; A/I/E/M. Paired delta is candidate minus control; interval and N follow.

| Fixture/profile | Baseline | Candidate | Paired delta; 95% interval; N; eligibility |
| --- | --- | --- | --- |
| c15t Script tag desktop | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t headless desktop | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t React desktop | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t Vue desktop | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t Nuxt desktop | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t Astro desktop | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t TanStack Start desktop | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t Script tag mobile | 0 / 0; 30/30/0/0 | 0 / 0; 30/30/0/0 | 0; [0, 0]; N=30; eligible |
| c15t headless mobile | 0.5 / 9; 30/30/0/0 | 26 / 43.5; 30/30/0/0 | 20.5; [12.5, 27]; N=30; eligible |
| c15t React mobile | 8 / 12.5; 30/30/0/0 | 37 / 42; 30/30/0/0 | 27; [20, 32]; N=30; eligible |
| c15t Vue mobile | 6.5 / 12.75; 30/30/0/0 | 77.5 / 85.5; 30/30/0/0 | 65.5; [59.5, 79.54]; N=30; eligible |
| c15t Nuxt mobile | 0 / 0; 30/30/0/0 | unavailable / unavailable; 30/0/30/0 | unavailable; no interval; N=0; ineligible |
| c15t Astro mobile | 0 / 0; 30/30/0/0 | 22 / 52.5; 30/30/0/0 | 22; [2.5, 37.5]; N=30; eligible |
| c15t TanStack Start mobile | 13 / 22; 30/30/0/0 | 35 / 51.25; 30/30/0/0 | 16.5; [13, 21]; N=30; eligible |

### LCP attribution

Attribution uses the same eligible samples as the LCP summary. Image paint is native Element Timing for the article image, independent of whether it wins LCP. Banner visibility is a DOM/layout observation. CLS is the bounded native session-window score; long-task blocking sums excess time above 50 ms in the observation window and is not Lighthouse TBT.

| Fixture/profile | Baseline elements | Candidate elements | Eligible attribution missing B/C |
| --- | --- | --- | --- |
| c15t Script tag desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| c15t headless desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| c15t React desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| c15t Vue desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| c15t Nuxt desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| c15t Astro desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| c15t TanStack Start desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| c15t Script tag mobile | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| c15t headless mobile | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| c15t React mobile | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| c15t Vue mobile | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| c15t Nuxt mobile | IMG#primary-content content: 30 | unavailable | 0/0 |
| c15t Astro mobile | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |
| c15t TanStack Start mobile | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0/0 |

## Repeated action observations

Native input-to-next-paint is the attributed trusted interaction's Event Timing duration, quantized to 8 ms. Entries below 16 ms may be unreportable. It is not field INP or finalized whole-visit INP. Consent-effective, dismissal, local persistence, backend acknowledgement and script completion are separate endpoints. A backend acknowledgement does not establish durable storage. Followup probes use separate visits and their own eligibility and correctness outcomes. Combined raw statuses and aggregate correctness include propagated followup failures. Separately recorded primary outcomes show correctness before the followup was attached; the report does not reconstruct missing primary outcomes by removing failure prefixes. Primary timing summaries retain the official combined-attempt eligibility policy. The failure inventory separates recorded primary outcomes, combined attempts and nested probes. A failed deployed-fixture page response does not identify an SDK cause; handler installation timing is not recorded.

| Fixture/profile | Action | Combined P/F/I; V/F/U | Recorded primary count; P/F/I; V/F/U | Followups observed/expected; P/F/I; V/F/U |
| --- | --- | --- | --- | --- |
| c15t Script tag desktop (local backend, self-hosted body script) | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Script tag desktop (local backend, self-hosted body script) | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Script tag desktop (local backend, self-hosted body script) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t headless desktop (local backend, headless API) | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t headless desktop (local backend, headless API) | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t headless desktop (local backend, headless API) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t React desktop (local backend, native integration) | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t React desktop (local backend, native integration) | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t React desktop (local backend, native integration) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Next.js desktop (local backend, native provider) | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Next.js desktop (local backend, native provider) | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Next.js desktop (local backend, native provider) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Vue desktop (local backend, native integration) | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Vue desktop (local backend, native integration) | reject | 9/0/1; 9/0/1 | 9/10; 9/0/0; 9/0/0 | 9/10; 9/0/0; 9/0/0 |
| c15t Vue desktop (local backend, native integration) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Nuxt desktop (local backend, native integration) | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Nuxt desktop (local backend, native integration) | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Nuxt desktop (local backend, native integration) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Astro desktop (local backend, native integration) | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Astro desktop (local backend, native integration) | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Astro desktop (local backend, native integration) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t TanStack Start desktop (local backend, native integration) | accept | 1/0/9; 1/0/9 | 1/10; 1/0/0; 1/0/0 | 1/10; 1/0/0; 1/0/0 |
| c15t TanStack Start desktop (local backend, native integration) | reject | 0/0/10; 0/0/10 | 0/10; 0/0/0; 0/0/0 | 0/10; 0/0/0; 0/0/0 |
| c15t TanStack Start desktop (local backend, native integration) | save | 0/0/10; 0/0/10 | 0/10; 0/0/0; 0/0/0 | 0/10; 0/0/0; 0/0/0 |
| cookie-control desktop (remote, before `</body>`) | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| cookie-control desktop (remote, before `</body>`) | reject | 9/1/0; 9/1/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 9/1/0; 9/1/0 |
| cookie-control desktop (remote, before `</body>`) | save | 0/0/10; 0/0/10 | 10/10; 0/0/10; 0/0/10 | 10/10; 0/0/10; 0/0/10 |
| didomi desktop (remote, start of `<head>`) | accept | 8/1/1; 8/1/1 | 10/10; 9/0/1; 9/0/1 | 10/10; 9/1/0; 9/1/0 |
| didomi desktop (remote, start of `<head>`) | reject | 9/1/0; 9/1/0 | 10/10; 9/1/0; 9/1/0 | 10/10; 10/0/0; 10/0/0 |
| didomi desktop (remote, start of `<head>`) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| enzuzo desktop (remote, start of `<head>`) | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| enzuzo desktop (remote, start of `<head>`) | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| enzuzo desktop (remote, start of `<head>`) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| iubenda desktop (remote, end of `<head>`) | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| iubenda desktop (remote, end of `<head>`) | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| iubenda desktop (remote, end of `<head>`) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| ketch desktop (remote, client effect) | accept | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| ketch desktop (remote, client effect) | reject | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| ketch desktop (remote, client effect) | save | 0/0/10; 0/0/10 | 0/10; 0/0/0; 0/0/0 | 0/10; 0/0/0; 0/0/0 |
| onetrust desktop (remote, start of `<head>`) | accept | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| onetrust desktop (remote, start of `<head>`) | reject | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| onetrust desktop (remote, start of `<head>`) | save | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| osano desktop (remote, client effect) | accept | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| osano desktop (remote, client effect) | reject | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| osano desktop (remote, client effect) | save | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| c15t Script tag mobile (local backend, self-hosted body script) | accept | 0/0/10; 10/0/0 | 10/10; 3/0/7; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| c15t Script tag mobile (local backend, self-hosted body script) | reject | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 1/0/9; 10/0/0 |
| c15t Script tag mobile (local backend, self-hosted body script) | save | 7/0/3; 10/0/0 | 10/10; 8/0/2; 10/0/0 | 10/10; 8/0/2; 10/0/0 |
| c15t headless mobile (local backend, headless API) | accept | 1/0/9; 10/0/0 | 10/10; 2/0/8; 10/0/0 | 10/10; 2/0/8; 10/0/0 |
| c15t headless mobile (local backend, headless API) | reject | 1/0/9; 10/0/0 | 10/10; 1/0/9; 10/0/0 | 10/10; 2/0/8; 10/0/0 |
| c15t headless mobile (local backend, headless API) | save | 7/0/3; 10/0/0 | 10/10; 7/0/3; 10/0/0 | 10/10; 8/0/2; 10/0/0 |
| c15t React mobile (local backend, native integration) | accept | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| c15t React mobile (local backend, native integration) | reject | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| c15t React mobile (local backend, native integration) | save | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 2/0/8; 10/0/0 |
| c15t Next.js mobile (local backend, native provider) | accept | 8/0/2; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 8/0/2; 10/0/0 |
| c15t Next.js mobile (local backend, native provider) | reject | 9/0/1; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 9/0/1; 10/0/0 |
| c15t Next.js mobile (local backend, native provider) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Vue mobile (local backend, native integration) | accept | 0/0/10; 10/0/0 | 10/10; 1/0/9; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| c15t Vue mobile (local backend, native integration) | reject | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| c15t Vue mobile (local backend, native integration) | save | 2/0/8; 10/0/0 | 10/10; 3/0/7; 10/0/0 | 10/10; 3/0/7; 10/0/0 |
| c15t Astro mobile (local backend, native integration) | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Astro mobile (local backend, native integration) | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t Astro mobile (local backend, native integration) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t TanStack Start mobile (local backend, native integration) | accept | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| c15t TanStack Start mobile (local backend, native integration) | reject | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| c15t TanStack Start mobile (local backend, native integration) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| cookie-control mobile (remote, before `</body>`) | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| cookie-control mobile (remote, before `</body>`) | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| cookie-control mobile (remote, before `</body>`) | save | 0/0/10; 0/0/10 | 10/10; 0/0/10; 0/0/10 | 10/10; 0/0/10; 0/0/10 |
| didomi mobile (remote, start of `<head>`) | accept | 0/0/10; 0/0/10 | 10/10; 0/0/10; 0/0/10 | 10/10; 2/0/8; 2/0/8 |
| didomi mobile (remote, start of `<head>`) | reject | 0/0/10; 0/0/10 | 10/10; 0/0/10; 0/0/10 | 10/10; 0/0/10; 0/0/10 |
| didomi mobile (remote, start of `<head>`) | save | 0/0/10; 0/0/10 | 10/10; 0/0/10; 0/0/10 | 10/10; 0/0/10; 0/0/10 |
| enzuzo mobile (remote, start of `<head>`) | accept | 0/0/10; 0/0/10 | 0/10; 0/0/0; 0/0/0 | 0/10; 0/0/0; 0/0/0 |
| enzuzo mobile (remote, start of `<head>`) | reject | 0/0/10; 0/0/10 | 0/10; 0/0/0; 0/0/0 | 0/10; 0/0/0; 0/0/0 |
| enzuzo mobile (remote, start of `<head>`) | save | 5/0/5; 5/0/5 | 10/10; 10/0/0; 10/0/0 | 10/10; 5/0/5; 5/0/5 |
| iubenda mobile (remote, end of `<head>`) | accept | 9/0/1; 10/0/0 | 10/10; 9/0/1; 10/0/0 | 10/10; 9/0/1; 10/0/0 |
| iubenda mobile (remote, end of `<head>`) | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| iubenda mobile (remote, end of `<head>`) | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| ketch mobile (remote, client effect) | accept | 0/10/0; 0/10/0 | 10/10; 0/10/0; 0/10/0 | 10/10; 0/10/0; 0/10/0 |
| ketch mobile (remote, client effect) | reject | 0/10/0; 0/10/0 | 10/10; 0/10/0; 0/10/0 | 10/10; 0/10/0; 0/10/0 |
| ketch mobile (remote, client effect) | save | 0/10/0; 0/10/0 | 10/10; 0/10/0; 0/10/0 | 10/10; 0/10/0; 0/10/0 |
| onetrust mobile (remote, start of `<head>`) | accept | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| onetrust mobile (remote, start of `<head>`) | reject | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| onetrust mobile (remote, start of `<head>`) | save | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| osano mobile (remote, client effect) | accept | 0/0/10; 0/10/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/10/0; 0/10/0 |
| osano mobile (remote, client effect) | reject | 0/0/10; 0/10/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/10/0; 0/10/0 |
| osano mobile (remote, client effect) | save | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| c15t Nuxt mobile [correction-001; correction of c15t-nuxt-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | accept | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| c15t Nuxt mobile [correction-001; correction of c15t-nuxt-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | reject | 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 | 10/10; 0/0/10; 10/0/0 |
| c15t Nuxt mobile [correction-001; correction of c15t-nuxt-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t TanStack Start desktop [correction-001; correction of c15t-tanstack-start-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t TanStack Start desktop [correction-001; correction of c15t-tanstack-start-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| c15t TanStack Start desktop [correction-001; correction of c15t-tanstack-start-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| didomi desktop [correction-001; correction of didomi-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| didomi desktop [correction-001; correction of didomi-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| didomi desktop [correction-001; correction of didomi-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| didomi mobile [correction-001; correction of didomi-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| didomi mobile [correction-001; correction of didomi-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| didomi mobile [correction-001; correction of didomi-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| enzuzo desktop [correction-001; correction of enzuzo-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | accept | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| enzuzo desktop [correction-001; correction of enzuzo-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | reject | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| enzuzo desktop [correction-001; correction of enzuzo-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |
| enzuzo mobile [correction-001; correction of enzuzo-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | accept | 0/0/10; 0/0/10 | 0/10; 0/0/0; 0/0/0 | 0/10; 0/0/0; 0/0/0 |
| enzuzo mobile [correction-001; correction of enzuzo-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | reject | 0/0/10; 0/0/10 | 0/10; 0/0/0; 0/0/0 | 0/10; 0/0/0; 0/0/0 |
| enzuzo mobile [correction-001; correction of enzuzo-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | save | 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 | 10/10; 10/0/0; 10/0/0 |

### action.input-to-next-paint

Milliseconds. Each action cell is median / p75; A/I/E/M. Followup counts concern observed probes; absent probes remain visible above.

| Fixture/profile | Accept | Reject | Save |
| --- | --- | --- | --- |
| c15t Script tag desktop (local backend, self-hosted body script) | 48 / 62; 10/10/0/0 | 52 / 56; 10/10/0/0 | 32 / 48; 10/10/0/0 |
| c15t headless desktop (local backend, headless API) | 60 / 70; 10/10/0/0 | 64 / 70; 10/10/0/0 | 24 / 24; 5/5/0/5 |
| c15t React desktop (local backend, native integration) | 56 / 62; 10/10/0/0 | 56 / 62; 10/10/0/0 | 20 / 24; 6/6/0/4 |
| c15t Next.js desktop (local backend, native provider) | 64 / 64; 10/10/0/0 | 56 / 62; 10/10/0/0 | 24 / 24; 9/9/0/1 |
| c15t Vue desktop (local backend, native integration) | 44 / 48; 10/10/0/0 | 40 / 48; 9/9/0/1 | 16 / 20; 7/7/0/3 |
| c15t Nuxt desktop (local backend, native integration) | 56 / 62; 10/10/0/0 | 60 / 72; 10/10/0/0 | 24 / 24; 9/9/0/1 |
| c15t Astro desktop (local backend, native integration) | 64 / 98; 10/10/0/0 | 60 / 70; 10/10/0/0 | 24 / 24; 7/7/0/3 |
| c15t TanStack Start desktop (local backend, native integration) | 64 / 64; 1/1/0/9 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| cookie-control desktop (remote, before `</body>`) | 108 / 130; 10/10/0/0 | 80 / 104; 10/9/1/0 | unavailable / unavailable; 0/0/0/10 |
| didomi desktop (remote, start of `<head>`) | 68 / 72; 10/8/2/0 | 56 / 72; 9/9/0/1 | 24 / 24; 10/10/0/0 |
| enzuzo desktop (remote, start of `<head>`) | 64 / 76; 10/10/0/0 | 60 / 64; 10/10/0/0 | 16 / 16; 5/5/0/5 |
| iubenda desktop (remote, end of `<head>`) | 16 / 24; 9/9/0/1 | 16 / 16; 3/3/0/7 | 16 / 16; 5/5/0/5 |
| ketch desktop (remote, client effect) | 24 / 24; 10/10/0/0 | 80 / 88; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 |
| onetrust desktop (remote, start of `<head>`) | 92 / 138; 10/10/0/0 | 120 / 150; 10/10/0/0 | 32 / 32; 9/9/0/1 |
| osano desktop (remote, client effect) | 84 / 104; 10/10/0/0 | 76 / 80; 10/10/0/0 | 24 / 30; 10/10/0/0 |
| c15t Script tag mobile (local backend, self-hosted body script) | 80 / 88; 10/10/0/0 | 72 / 86; 10/10/0/0 | 32 / 32; 10/10/0/0 |
| c15t headless mobile (local backend, headless API) | 104 / 110; 10/10/0/0 | 92 / 118; 10/10/0/0 | 32 / 32; 10/10/0/0 |
| c15t React mobile (local backend, native integration) | 92 / 102; 10/10/0/0 | 84 / 88; 10/10/0/0 | 32 / 32; 10/10/0/0 |
| c15t Next.js mobile (local backend, native provider) | 108 / 120; 10/10/0/0 | 88 / 96; 10/10/0/0 | 36 / 40; 10/10/0/0 |
| c15t Vue mobile (local backend, native integration) | 108 / 238; 10/10/0/0 | 96 / 124; 10/10/0/0 | 32 / 40; 10/10/0/0 |
| c15t Astro mobile (local backend, native integration) | 56 / 64; 10/10/0/0 | 56 / 62; 10/10/0/0 | 24 / 32; 10/10/0/0 |
| c15t TanStack Start mobile (local backend, native integration) | 60 / 70; 10/10/0/0 | 56 / 76; 10/10/0/0 | 32 / 32; 10/10/0/0 |
| cookie-control mobile (remote, before `</body>`) | 56 / 70; 10/10/0/0 | 56 / 56; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 |
| didomi mobile (remote, start of `<head>`) | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 10/0/10/0 |
| enzuzo mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | 48 / 48; 10/5/5/0 |
| iubenda mobile (remote, end of `<head>`) | 24 / 30; 6/6/0/4 | 24 / 24; 8/8/0/2 | 40 / 48; 10/10/0/0 |
| ketch mobile (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| onetrust mobile (remote, start of `<head>`) | 80 / 88; 10/10/0/0 | 64 / 86; 10/10/0/0 | 32 / 40; 10/10/0/0 |
| osano mobile (remote, client effect) | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 10/0/10/0 | 72 / 78; 10/10/0/0 |
| c15t Nuxt mobile [correction-001; correction of c15t-nuxt-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 56 / 56; 10/10/0/0 | 48 / 48; 10/10/0/0 | 16 / 16; 10/10/0/0 |
| c15t TanStack Start desktop [correction-001; correction of c15t-tanstack-start-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 32 / 40; 10/10/0/0 | 36 / 46; 10/10/0/0 | 16 / 16; 8/8/0/2 |
| didomi desktop [correction-001; correction of didomi-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 44 / 48; 10/10/0/0 | 40 / 40; 10/10/0/0 | 24 / 24; 10/10/0/0 |
| didomi mobile [correction-001; correction of didomi-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 48 / 48; 10/10/0/0 | 40 / 48; 10/10/0/0 | 72 / 72; 10/10/0/0 |
| enzuzo desktop [correction-001; correction of enzuzo-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 56 / 62; 10/10/0/0 | 60 / 64; 10/10/0/0 | 16 / 16; 8/8/0/2 |
| enzuzo mobile [correction-001; correction of enzuzo-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | 40 / 48; 10/10/0/0 |

### action.consent-effective

Milliseconds. Each action cell is median / p75; A/I/E/M. Followup counts concern observed probes; absent probes remain visible above.

| Fixture/profile | Accept | Reject | Save |
| --- | --- | --- | --- |
| c15t Script tag desktop (local backend, self-hosted body script) | 45.1 / 49.4; 10/10/0/0 | 42.85 / 50.08; 10/10/0/0 | 8.3 / 10.08; 10/10/0/0 |
| c15t headless desktop (local backend, headless API) | 54.4 / 58.92; 10/10/0/0 | 57.5 / 64.1; 10/10/0/0 | 8.1 / 13.07; 10/10/0/0 |
| c15t React desktop (local backend, native integration) | 49.9 / 53.62; 10/10/0/0 | 48.5 / 56.05; 10/10/0/0 | 6.25 / 8.63; 10/10/0/0 |
| c15t Next.js desktop (local backend, native provider) | 61.2 / 64.33; 10/10/0/0 | 54.15 / 58.98; 10/10/0/0 | 6.9 / 11.23; 10/10/0/0 |
| c15t Vue desktop (local backend, native integration) | 42.45 / 44.52; 10/10/0/0 | 42.2 / 46.9; 9/9/0/1 | 9.05 / 10.97; 10/10/0/0 |
| c15t Nuxt desktop (local backend, native integration) | 51.95 / 60.37; 10/10/0/0 | 56.8 / 66.98; 10/10/0/0 | 9.05 / 11.38; 10/10/0/0 |
| c15t Astro desktop (local backend, native integration) | 66.2 / 95; 10/10/0/0 | 60.15 / 66; 10/10/0/0 | 11.25 / 13.9; 10/10/0/0 |
| c15t TanStack Start desktop (local backend, native integration) | 65.1 / 65.1; 1/1/0/9 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| cookie-control desktop (remote, before `</body>`) | 104.95 / 129.9; 10/10/0/0 | 76.8 / 98.1; 10/9/1/0 | unavailable / unavailable; 0/0/0/10 |
| didomi desktop (remote, start of `<head>`) | 93.95 / 102.8; 10/8/2/0 | 81.3 / 96.8; 9/9/0/1 | 23.9 / 32.57; 10/10/0/0 |
| enzuzo desktop (remote, start of `<head>`) | 53.9 / 64.9; 10/10/0/0 | 47.7 / 57.83; 10/10/0/0 | 24.7 / 27.7; 10/10/0/0 |
| iubenda desktop (remote, end of `<head>`) | 66.55 / 74.97; 10/10/0/0 | 63.6 / 71.75; 10/10/0/0 | 8.3 / 10.6; 10/10/0/0 |
| ketch desktop (remote, client effect) | 363.95 / 377.2; 10/10/0/0 | 342.45 / 347.38; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 |
| onetrust desktop (remote, start of `<head>`) | 91.15 / 148.55; 10/10/0/0 | 116.65 / 145.18; 10/10/0/0 | 28.55 / 31.53; 10/10/0/0 |
| osano desktop (remote, client effect) | 68.2 / 82.42; 10/10/0/0 | 58.6 / 65.88; 10/10/0/0 | 11.15 / 12.17; 10/10/0/0 |
| c15t Script tag mobile (local backend, self-hosted body script) | 74.25 / 85.23; 10/10/0/0 | 68.1 / 82.38; 10/10/0/0 | 20.6 / 23.9; 10/10/0/0 |
| c15t headless mobile (local backend, headless API) | 99.35 / 102.52; 10/10/0/0 | 87.2 / 111.57; 10/10/0/0 | 25.55 / 26.2; 10/10/0/0 |
| c15t React mobile (local backend, native integration) | 85.95 / 99.25; 10/10/0/0 | 80.7 / 87.93; 10/10/0/0 | 26.95 / 30.4; 10/10/0/0 |
| c15t Next.js mobile (local backend, native provider) | 106.25 / 115.47; 10/10/0/0 | 89.15 / 95.08; 10/10/0/0 | 30.45 / 34.9; 10/10/0/0 |
| c15t Vue mobile (local backend, native integration) | 104.05 / 233.95; 10/10/0/0 | 94.65 / 120.53; 10/10/0/0 | 27.65 / 32.22; 10/10/0/0 |
| c15t Astro mobile (local backend, native integration) | 57.2 / 63.25; 10/10/0/0 | 53.35 / 58.05; 10/10/0/0 | 23.4 / 26.7; 10/10/0/0 |
| c15t TanStack Start mobile (local backend, native integration) | 59.45 / 66.95; 10/10/0/0 | 57.05 / 75.82; 10/10/0/0 | 20.95 / 22.65; 10/10/0/0 |
| cookie-control mobile (remote, before `</body>`) | 58.15 / 67.1; 10/10/0/0 | 54.8 / 56.1; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 |
| didomi mobile (remote, start of `<head>`) | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 10/0/10/0 |
| enzuzo mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | 45.3 / 47.8; 10/5/5/0 |
| iubenda mobile (remote, end of `<head>`) | 26.8 / 40.98; 10/10/0/0 | 27.95 / 33.9; 10/10/0/0 | 25.6 / 27.68; 10/10/0/0 |
| ketch mobile (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| onetrust mobile (remote, start of `<head>`) | 97.05 / 123.3; 10/10/0/0 | 76.3 / 107.92; 10/10/0/0 | 41.6 / 45.7; 10/10/0/0 |
| osano mobile (remote, client effect) | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 10/0/10/0 | 47.25 / 59.17; 10/10/0/0 |
| c15t Nuxt mobile [correction-001; correction of c15t-nuxt-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 51.8 / 54.27; 10/10/0/0 | 47.9 / 48.8; 10/10/0/0 | 15.65 / 16.12; 10/10/0/0 |
| c15t TanStack Start desktop [correction-001; correction of c15t-tanstack-start-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 33.85 / 41.53; 10/10/0/0 | 38 / 43.6; 10/10/0/0 | 9.75 / 10.6; 10/10/0/0 |
| didomi desktop [correction-001; correction of didomi-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 63.65 / 66.6; 10/10/0/0 | 58.95 / 61.47; 10/10/0/0 | 27.6 / 28.15; 10/10/0/0 |
| didomi mobile [correction-001; correction of didomi-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 117.9 / 120.38; 10/10/0/0 | 112.8 / 114.8; 10/10/0/0 | 80.95 / 85.48; 10/10/0/0 |
| enzuzo desktop [correction-001; correction of enzuzo-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 48.75 / 51.53; 10/10/0/0 | 48.9 / 51.23; 10/10/0/0 | 27.05 / 30.65; 10/10/0/0 |
| enzuzo mobile [correction-001; correction of enzuzo-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | 35.15 / 39.82; 10/10/0/0 |

### action.dismissed

Milliseconds. Each action cell is median / p75; A/I/E/M. Followup counts concern observed probes; absent probes remain visible above.

| Fixture/profile | Accept | Reject | Save |
| --- | --- | --- | --- |
| c15t Script tag desktop (local backend, self-hosted body script) | 64.95 / 77.63; 10/10/0/0 | 53.25 / 66.37; 10/10/0/0 | 159.05 / 160.8; 10/10/0/0 |
| c15t headless desktop (local backend, headless API) | 54.4 / 58.92; 10/10/0/0 | 57.5 / 64.1; 10/10/0/0 | 8.1 / 13.07; 10/10/0/0 |
| c15t React desktop (local backend, native integration) | 49.9 / 53.62; 10/10/0/0 | 48.5 / 56.05; 10/10/0/0 | 6.25 / 8.63; 10/10/0/0 |
| c15t Next.js desktop (local backend, native provider) | 61.2 / 64.33; 10/10/0/0 | 54.15 / 58.98; 10/10/0/0 | 6.9 / 11.23; 10/10/0/0 |
| c15t Vue desktop (local backend, native integration) | 42.45 / 44.52; 10/10/0/0 | 42.2 / 46.9; 9/9/0/1 | 9.05 / 10.97; 10/10/0/0 |
| c15t Nuxt desktop (local backend, native integration) | 128.55 / 142.52; 10/10/0/0 | 131.9 / 145.85; 10/10/0/0 | 9.05 / 11.38; 10/10/0/0 |
| c15t Astro desktop (local backend, native integration) | 66.2 / 95; 10/10/0/0 | 60.15 / 66; 10/10/0/0 | 11.25 / 13.9; 10/10/0/0 |
| c15t TanStack Start desktop (local backend, native integration) | 65.1 / 65.1; 1/1/0/9 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| cookie-control desktop (remote, before `</body>`) | 103.2 / 128.65; 10/10/0/0 | 74.9 / 97.5; 10/9/1/0 | unavailable / unavailable; 0/0/0/10 |
| didomi desktop (remote, start of `<head>`) | 85.8 / 91.2; 10/8/2/0 | 73 / 86.8; 9/9/0/1 | 25.25 / 36.23; 10/10/0/0 |
| enzuzo desktop (remote, start of `<head>`) | 52.25 / 63.42; 10/10/0/0 | 46.2 / 55.93; 10/10/0/0 | 7.95 / 11.35; 10/10/0/0 |
| iubenda desktop (remote, end of `<head>`) | 66.55 / 74.97; 10/10/0/0 | 63.6 / 71.75; 10/10/0/0 | 8.3 / 10.6; 10/10/0/0 |
| ketch desktop (remote, client effect) | 9.35 / 10.67; 10/10/0/0 | 65.9 / 81.4; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 |
| onetrust desktop (remote, start of `<head>`) | 492 / 550.87; 10/10/0/0 | 517.95 / 545.75; 10/10/0/0 | 429.3 / 432.27; 10/10/0/0 |
| osano desktop (remote, client effect) | 87.9 / 95.35; 10/10/0/0 | 87.4 / 126.05; 10/10/0/0 | 222.55 / 226.8; 10/10/0/0 |
| c15t Script tag mobile (local backend, self-hosted body script) | 107.2 / 116.25; 10/10/0/0 | 109.3 / 111.45; 10/10/0/0 | 173.55 / 179.05; 10/10/0/0 |
| c15t headless mobile (local backend, headless API) | 99.35 / 102.52; 10/10/0/0 | 87.2 / 111.57; 10/10/0/0 | 25.55 / 26.2; 10/10/0/0 |
| c15t React mobile (local backend, native integration) | 85.95 / 99.25; 10/10/0/0 | 80.7 / 87.93; 10/10/0/0 | 26.95 / 30.4; 10/10/0/0 |
| c15t Next.js mobile (local backend, native provider) | 106.25 / 115.47; 10/10/0/0 | 89.15 / 95.08; 10/10/0/0 | 30.45 / 34.9; 10/10/0/0 |
| c15t Vue mobile (local backend, native integration) | 104.05 / 233.95; 10/10/0/0 | 94.65 / 120.53; 10/10/0/0 | 27.65 / 32.22; 10/10/0/0 |
| c15t Astro mobile (local backend, native integration) | 57.2 / 63.25; 10/10/0/0 | 53.35 / 58.05; 10/10/0/0 | 23.4 / 26.7; 10/10/0/0 |
| c15t TanStack Start mobile (local backend, native integration) | 59.45 / 66.95; 10/10/0/0 | 57.05 / 75.82; 10/10/0/0 | 20.95 / 22.65; 10/10/0/0 |
| cookie-control mobile (remote, before `</body>`) | 55.1 / 63.23; 10/10/0/0 | 52.45 / 54.45; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 |
| didomi mobile (remote, start of `<head>`) | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 10/0/10/0 |
| enzuzo mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | 34.1 / 41; 10/5/5/0 |
| iubenda mobile (remote, end of `<head>`) | 26.8 / 40.98; 10/10/0/0 | 27.95 / 33.9; 10/10/0/0 | 25.6 / 27.68; 10/10/0/0 |
| ketch mobile (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| onetrust mobile (remote, start of `<head>`) | 483.6 / 501.08; 10/10/0/0 | 467.85 / 488.45; 10/10/0/0 | 429.95 / 432.85; 10/10/0/0 |
| osano mobile (remote, client effect) | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 10/0/10/0 | 272.85 / 277.45; 10/10/0/0 |
| c15t Nuxt mobile [correction-001; correction of c15t-nuxt-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 134.45 / 137.08; 10/10/0/0 | 124.7 / 130.47; 10/10/0/0 | 15.65 / 16.12; 10/10/0/0 |
| c15t TanStack Start desktop [correction-001; correction of c15t-tanstack-start-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 33.85 / 41.53; 10/10/0/0 | 38 / 43.6; 10/10/0/0 | 9.75 / 10.6; 10/10/0/0 |
| didomi desktop [correction-001; correction of didomi-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 58.6 / 61.2; 10/10/0/0 | 51.7 / 54.07; 10/10/0/0 | 27.6 / 28.15; 10/10/0/0 |
| didomi mobile [correction-001; correction of didomi-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 116.9 / 120.38; 10/10/0/0 | 112.6 / 112.97; 10/10/0/0 | 85.7 / 93.77; 10/10/0/0 |
| enzuzo desktop [correction-001; correction of enzuzo-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 47.35 / 50.15; 10/10/0/0 | 47.9 / 50.15; 10/10/0/0 | 10.55 / 14.15; 10/10/0/0 |
| enzuzo mobile [correction-001; correction of enzuzo-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | 28.1 / 33.95; 10/10/0/0 |

### action.local-persisted

Milliseconds. Each action cell is median / p75; A/I/E/M. Followup counts concern observed probes; absent probes remain visible above.

| Fixture/profile | Accept | Reject | Save |
| --- | --- | --- | --- |
| c15t Script tag desktop (local backend, self-hosted body script) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t headless desktop (local backend, headless API) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t React desktop (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Next.js desktop (local backend, native provider) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Vue desktop (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Nuxt desktop (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Astro desktop (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t TanStack Start desktop (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| cookie-control desktop (remote, before `</body>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| didomi desktop (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| enzuzo desktop (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| iubenda desktop (remote, end of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| ketch desktop (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| onetrust desktop (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| osano desktop (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Script tag mobile (local backend, self-hosted body script) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t headless mobile (local backend, headless API) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t React mobile (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Next.js mobile (local backend, native provider) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Vue mobile (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Astro mobile (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t TanStack Start mobile (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| cookie-control mobile (remote, before `</body>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| didomi mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| enzuzo mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| iubenda mobile (remote, end of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| ketch mobile (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| onetrust mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| osano mobile (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Nuxt mobile [correction-001; correction of c15t-nuxt-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t TanStack Start desktop [correction-001; correction of c15t-tanstack-start-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| didomi desktop [correction-001; correction of didomi-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| didomi mobile [correction-001; correction of didomi-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| enzuzo desktop [correction-001; correction of enzuzo-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| enzuzo mobile [correction-001; correction of enzuzo-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |

### action.remote-persisted

Milliseconds. Each action cell is median / p75; A/I/E/M. Followup counts concern observed probes; absent probes remain visible above.

| Fixture/profile | Accept | Reject | Save |
| --- | --- | --- | --- |
| c15t Script tag desktop (local backend, self-hosted body script) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t headless desktop (local backend, headless API) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t React desktop (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Next.js desktop (local backend, native provider) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Vue desktop (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Nuxt desktop (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Astro desktop (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t TanStack Start desktop (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| cookie-control desktop (remote, before `</body>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| didomi desktop (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| enzuzo desktop (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| iubenda desktop (remote, end of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| ketch desktop (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| onetrust desktop (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| osano desktop (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Script tag mobile (local backend, self-hosted body script) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t headless mobile (local backend, headless API) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t React mobile (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Next.js mobile (local backend, native provider) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Vue mobile (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Astro mobile (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t TanStack Start mobile (local backend, native integration) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| cookie-control mobile (remote, before `</body>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| didomi mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| enzuzo mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| iubenda mobile (remote, end of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| ketch mobile (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| onetrust mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| osano mobile (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t Nuxt mobile [correction-001; correction of c15t-nuxt-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| c15t TanStack Start desktop [correction-001; correction of c15t-tanstack-start-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| didomi desktop [correction-001; correction of didomi-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| didomi mobile [correction-001; correction of didomi-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| enzuzo desktop [correction-001; correction of enzuzo-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| enzuzo mobile [correction-001; correction of enzuzo-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |

### action.scripts-complete

Milliseconds. Each action cell is median / p75; A/I/E/M. Followup counts concern observed probes; absent probes remain visible above.

| Fixture/profile | Accept | Reject | Save |
| --- | --- | --- | --- |
| c15t Script tag desktop (local backend, self-hosted body script) | 48.5 / 52.88; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 12.55 / 14.15; 10/10/0/0 |
| c15t headless desktop (local backend, headless API) | 58.6 / 66.6; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 16.65 / 18.65; 10/10/0/0 |
| c15t React desktop (local backend, native integration) | 53.3 / 57.95; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 10.95 / 13.85; 10/10/0/0 |
| c15t Next.js desktop (local backend, native provider) | 66.75 / 71.93; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 13.8 / 19.3; 10/10/0/0 |
| c15t Vue desktop (local backend, native integration) | 45.8 / 47.85; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 12.6 / 14.25; 10/10/0/0 |
| c15t Nuxt desktop (local backend, native integration) | 56.55 / 65.1; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 13.05 / 14.9; 10/10/0/0 |
| c15t Astro desktop (local backend, native integration) | 69.5 / 99.1; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 15.15 / 20.5; 10/10/0/0 |
| c15t TanStack Start desktop (local backend, native integration) | 73.5 / 73.5; 1/1/0/9 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| cookie-control desktop (remote, before `</body>`) | 116.2 / 140.95; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| didomi desktop (remote, start of `<head>`) | 91.85 / 99.05; 10/8/2/0 | unavailable / unavailable; 0/0/0/10 | 23.3 / 25.35; 10/10/0/0 |
| enzuzo desktop (remote, start of `<head>`) | 57.8 / 66.7; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 13.45 / 18.33; 10/10/0/0 |
| iubenda desktop (remote, end of `<head>`) | 23.8 / 27.07; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 12.1 / 15.55; 10/10/0/0 |
| ketch desktop (remote, client effect) | 391.4 / 411.35; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| onetrust desktop (remote, start of `<head>`) | 95.15 / 184.48; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 36.85 / 46.72; 10/10/0/0 |
| osano desktop (remote, client effect) | 71.65 / 86.55; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 22.6 / 34.73; 10/10/0/0 |
| c15t Script tag mobile (local backend, self-hosted body script) | 189.95 / 194.1; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 178.55 / 182.2; 10/10/0/0 |
| c15t headless mobile (local backend, headless API) | 190.15 / 193.65; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 182.5 / 183.92; 10/10/0/0 |
| c15t React mobile (local backend, native integration) | 196.25 / 203.32; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 182.7 / 187.53; 10/10/0/0 |
| c15t Next.js mobile (local backend, native provider) | 198.35 / 200.05; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 181.2 / 184.33; 10/10/0/0 |
| c15t Vue mobile (local backend, native integration) | 193.2 / 266.52; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 182.65 / 186.6; 10/10/0/0 |
| c15t Astro mobile (local backend, native integration) | 186.7 / 188.65; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 176.2 / 181.27; 10/10/0/0 |
| c15t TanStack Start mobile (local backend, native integration) | 300.3 / 319.92; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 175.6 / 176.55; 10/10/0/0 |
| cookie-control mobile (remote, before `</body>`) | 230.8 / 239.78; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| didomi mobile (remote, start of `<head>`) | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 10/0/10/0 |
| enzuzo mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | 205.6 / 206; 10/5/5/0 |
| iubenda mobile (remote, end of `<head>`) | 193.4 / 206.9; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 178.35 / 183.73; 10/10/0/0 |
| ketch mobile (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| onetrust mobile (remote, start of `<head>`) | 257.9 / 282.15; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 207.05 / 210.5; 10/10/0/0 |
| osano mobile (remote, client effect) | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 0/0/0/10 | 190.2 / 193.67; 10/10/0/0 |
| c15t Nuxt mobile [correction-001; correction of c15t-nuxt-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 192.55 / 193.95; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 171.75 / 172.88; 10/10/0/0 |
| c15t TanStack Start desktop [correction-001; correction of c15t-tanstack-start-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 37.4 / 45.35; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 13 / 13.45; 10/10/0/0 |
| didomi desktop [correction-001; correction of didomi-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 62.05 / 64.7; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 19.05 / 19.28; 10/10/0/0 |
| didomi mobile [correction-001; correction of didomi-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 286.2 / 290.88; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 238.15 / 240.07; 10/10/0/0 |
| enzuzo desktop [correction-001; correction of enzuzo-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 50.65 / 53.42; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 | 13.05 / 18.28; 10/10/0/0 |
| enzuzo mobile [correction-001; correction of enzuzo-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | 202.9 / 204.85; 10/10/0/0 |

### action.long-task-blocking

Milliseconds. Each action cell is median / p75; A/I/E/M. Followup counts concern observed probes; absent probes remain visible above.

| Fixture/profile | Accept | Reject | Save |
| --- | --- | --- | --- |
| c15t Script tag desktop (local backend, self-hosted body script) | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t headless desktop (local backend, headless API) | 0 / 3.75; 10/10/0/0 | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t React desktop (local backend, native integration) | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t Next.js desktop (local backend, native provider) | 0.5 / 4.25; 10/10/0/0 | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t Vue desktop (local backend, native integration) | 0 / 0; 10/10/0/0 | 0 / 0; 9/9/0/1 | 0 / 0; 10/10/0/0 |
| c15t Nuxt desktop (local backend, native integration) | 0 / 0; 10/10/0/0 | 2.5 / 10.5; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t Astro desktop (local backend, native integration) | 3.5 / 18.75; 10/10/0/0 | 1.5 / 6.75; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t TanStack Start desktop (local backend, native integration) | 0 / 0; 1/1/0/9 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| cookie-control desktop (remote, before `</body>`) | 27 / 54; 10/10/0/0 | 9 / 40; 10/9/1/0 | unavailable / unavailable; 0/0/0/10 |
| didomi desktop (remote, start of `<head>`) | 4.5 / 8.25; 10/8/2/0 | 0 / 9; 9/9/0/1 | 0 / 0; 10/10/0/0 |
| enzuzo desktop (remote, start of `<head>`) | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| iubenda desktop (remote, end of `<head>`) | 0 / 3; 10/10/0/0 | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| ketch desktop (remote, client effect) | 0 / 0; 10/10/0/0 | 7 / 17.5; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 |
| onetrust desktop (remote, start of `<head>`) | 19.5 / 56; 10/10/0/0 | 47.5 / 74.5; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| osano desktop (remote, client effect) | 3.5 / 16.5; 10/10/0/0 | 0 / 5.5; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t Script tag mobile (local backend, self-hosted body script) | 8.5 / 15.75; 10/10/0/0 | 7 / 17.5; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t headless mobile (local backend, headless API) | 25.5 / 29.75; 10/10/0/0 | 26 / 45; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t React mobile (local backend, native integration) | 6 / 20; 10/10/0/0 | 10 / 15.5; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t Next.js mobile (local backend, native provider) | 28 / 39.75; 10/10/0/0 | 13.5 / 22; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t Vue mobile (local backend, native integration) | 23 / 150; 10/10/0/0 | 24.5 / 50; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t Astro mobile (local backend, native integration) | 0 / 3.75; 10/10/0/0 | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t TanStack Start mobile (local backend, native integration) | 0 / 0; 10/10/0/0 | 0 / 9; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| cookie-control mobile (remote, before `</body>`) | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 | unavailable / unavailable; 0/0/0/10 |
| didomi mobile (remote, start of `<head>`) | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 10/0/10/0 |
| enzuzo mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | 0 / 0; 10/5/5/0 |
| iubenda mobile (remote, end of `<head>`) | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| ketch mobile (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| onetrust mobile (remote, start of `<head>`) | 0 / 15.75; 10/10/0/0 | 0 / 7.25; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| osano mobile (remote, client effect) | unavailable / unavailable; 10/0/10/0 | unavailable / unavailable; 10/0/10/0 | 0 / 2.25; 10/10/0/0 |
| c15t Nuxt mobile [correction-001; correction of c15t-nuxt-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| c15t TanStack Start desktop [correction-001; correction of c15t-tanstack-start-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| didomi desktop [correction-001; correction of didomi-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| didomi mobile [correction-001; correction of didomi-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 12.5 / 13; 10/10/0/0 | 10.5 / 12.75; 10/10/0/0 | 14.5 / 16; 10/10/0/0 |
| enzuzo desktop [correction-001; correction of enzuzo-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 | 0 / 0; 10/10/0/0 |
| enzuzo mobile [correction-001; correction of enzuzo-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | 0 / 0; 10/10/0/0 |

### action.followup-input-to-next-paint

Milliseconds. Each action cell is median / p75; A/I/E/M. Followup counts concern observed probes; absent probes remain visible above.

| Fixture/profile | Accept | Reject | Save |
| --- | --- | --- | --- |
| c15t Script tag desktop (local backend, self-hosted body script) | 16 / 16; 8/8/0/2 | 16 / 16; 8/8/0/2 | 16 / 16; 7/7/0/3 |
| c15t headless desktop (local backend, headless API) | 16 / 16; 7/7/0/3 | 16 / 16; 3/3/0/7 | 16 / 16; 6/6/0/4 |
| c15t React desktop (local backend, native integration) | 16 / 16; 8/8/0/2 | 16 / 16; 7/7/0/3 | 16 / 16; 6/6/0/4 |
| c15t Next.js desktop (local backend, native provider) | 16 / 16; 3/3/0/7 | 16 / 16; 7/7/0/3 | 16 / 16; 3/3/0/7 |
| c15t Vue desktop (local backend, native integration) | 16 / 16; 9/9/0/1 | 16 / 16; 7/7/0/2 | 16 / 16; 7/7/0/3 |
| c15t Nuxt desktop (local backend, native integration) | 16 / 16; 6/6/0/4 | 16 / 16; 6/6/0/4 | 16 / 16; 7/7/0/3 |
| c15t Astro desktop (local backend, native integration) | 16 / 16; 3/3/0/7 | 16 / 16; 9/9/0/1 | 16 / 16; 8/8/0/2 |
| c15t TanStack Start desktop (local backend, native integration) | 16 / 16; 1/1/0/0 | unavailable / unavailable; 0/0/0/0 | unavailable / unavailable; 0/0/0/0 |
| cookie-control desktop (remote, before `</body>`) | 16 / 16; 4/4/0/6 | 16 / 16; 6/6/0/4 | unavailable / unavailable; 0/0/0/10 |
| didomi desktop (remote, start of `<head>`) | 16 / 16; 2/2/0/8 | 16 / 16; 7/7/0/3 | 16 / 16; 7/7/0/3 |
| enzuzo desktop (remote, start of `<head>`) | 16 / 16; 4/4/0/6 | 16 / 16; 7/7/0/3 | 16 / 16; 8/8/0/2 |
| iubenda desktop (remote, end of `<head>`) | 16 / 16; 7/7/0/3 | 16 / 16; 8/8/0/2 | 16 / 16; 4/4/0/6 |
| ketch desktop (remote, client effect) | 16 / 16; 8/8/0/2 | 16 / 16; 4/4/0/6 | unavailable / unavailable; 0/0/0/0 |
| onetrust desktop (remote, start of `<head>`) | 32 / 38; 10/10/0/0 | 32 / 40; 10/10/0/0 | 28 / 32; 10/10/0/0 |
| osano desktop (remote, client effect) | 16 / 16; 10/10/0/0 | 16 / 16; 6/6/0/4 | 16 / 16; 4/4/0/6 |
| c15t Script tag mobile (local backend, self-hosted body script) | 16 / 18; 4/4/0/6 | 16 / 16; 5/5/0/5 | 16 / 16; 6/6/0/4 |
| c15t headless mobile (local backend, headless API) | 16 / 16; 8/8/0/2 | 16 / 22; 6/6/0/4 | 16 / 20; 7/7/0/3 |
| c15t React mobile (local backend, native integration) | 16 / 16; 7/7/0/3 | 16 / 16; 3/3/0/7 | 16 / 16; 9/9/0/1 |
| c15t Next.js mobile (local backend, native provider) | 16 / 16; 9/9/0/1 | 16 / 16; 8/8/0/2 | 16 / 16; 9/9/0/1 |
| c15t Vue mobile (local backend, native integration) | 16 / 18; 8/8/0/2 | 16 / 16; 6/6/0/4 | 16 / 16; 10/10/0/0 |
| c15t Astro mobile (local backend, native integration) | 16 / 16; 4/4/0/6 | 16 / 16; 5/5/0/5 | 16 / 16; 4/4/0/6 |
| c15t TanStack Start mobile (local backend, native integration) | 16 / 16; 5/5/0/5 | 16 / 16; 5/5/0/5 | 16 / 16; 7/7/0/3 |
| cookie-control mobile (remote, before `</body>`) | 16 / 16; 7/7/0/3 | 16 / 16; 3/3/0/7 | unavailable / unavailable; 0/0/0/10 |
| didomi mobile (remote, start of `<head>`) | 16 / 16; 5/1/4/5 | unavailable / unavailable; 7/0/7/3 | unavailable / unavailable; 6/0/6/4 |
| enzuzo mobile (remote, start of `<head>`) | unavailable / unavailable; 0/0/0/0 | unavailable / unavailable; 0/0/0/0 | 20 / 24; 7/4/3/3 |
| iubenda mobile (remote, end of `<head>`) | 16 / 16; 6/6/0/4 | 16 / 18; 4/4/0/6 | 16 / 16; 6/6/0/4 |
| ketch mobile (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 |
| onetrust mobile (remote, start of `<head>`) | 40 / 40; 10/10/0/0 | 40 / 40; 10/10/0/0 | 40 / 40; 10/10/0/0 |
| osano mobile (remote, client effect) | unavailable / unavailable; 0/0/0/10 | unavailable / unavailable; 0/0/0/10 | 16 / 16; 6/6/0/4 |
| c15t Nuxt mobile [correction-001; correction of c15t-nuxt-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 16 / 16; 5/5/0/5 | 16 / 16; 8/8/0/2 | 16 / 16; 7/7/0/3 |
| c15t TanStack Start desktop [correction-001; correction of c15t-tanstack-start-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 16 / 16; 8/8/0/2 | 16 / 16; 7/7/0/3 | 16 / 16; 8/8/0/2 |
| didomi desktop [correction-001; correction of didomi-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 16 / 16; 3/3/0/7 | 16 / 16; 6/6/0/4 | 16 / 16; 8/8/0/2 |
| didomi mobile [correction-001; correction of didomi-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 16 / 16; 6/6/0/4 | 16 / 16; 4/4/0/6 | 16 / 16; 5/5/0/5 |
| enzuzo desktop [correction-001; correction of enzuzo-desktop-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | 16 / 16; 5/5/0/5 | 16 / 16; 5/5/0/5 | 16 / 16; 6/6/0/4 |
| enzuzo mobile [correction-001; correction of enzuzo-mobile-actions; cookiebench-runner-3.2.1/cookiebench-v3.2.1] | unavailable / unavailable; 0/0/0/0 | unavailable / unavailable; 0/0/0/0 | 16 / 18; 8/8/0/2 |

## Declared correctness checks

These one-attempt scenarios provide behavioral coverage, not repeated timing estimates. The JSON preserves each scenario, its raw status, correctness and endpoint eligibility.

| Fixture/profile | Attempts | Combined P/F/I; V/F/U | Recorded primary count; V/F/U | Followups observed/expected |
| --- | --: | --- | --- | --- |
| c15t Script tag desktop | 10 | 8/1/1; 9/1/0 | 6; 6/0/0 | 6/6 |
| c15t headless desktop | 7 | 6/0/1; 7/0/0 | 5; 5/0/0 | 5/5 |
| c15t React desktop | 10 | 9/0/1; 10/0/0 | 6; 6/0/0 | 6/6 |
| c15t Next.js desktop | 10 | 9/0/1; 10/0/0 | 6; 6/0/0 | 6/6 |
| c15t Vue desktop | 12 | 11/0/1; 12/0/0 | 8; 8/0/0 | 8/8 |
| c15t Nuxt desktop | 12 | 11/0/1; 12/0/0 | 8; 8/0/0 | 8/8 |
| c15t Astro desktop | 12 | 10/2/0; 10/2/0 | 8; 7/1/0 | 8/8 |
| c15t TanStack Start desktop | 10 | 9/0/1; 10/0/0 | 6; 6/0/0 | 6/6 |
| cookie-control desktop | 10 | 7/0/3; 7/0/3 | 6; 4/0/2 | 6/6 |
| didomi desktop | 10 | 10/0/0; 10/0/0 | 6; 6/0/0 | 6/6 |
| enzuzo desktop | 10 | 9/0/1; 9/0/1 | 6; 6/0/0 | 6/6 |
| iubenda desktop | 10 | 10/0/0; 10/0/0 | 6; 6/0/0 | 6/6 |
| ketch desktop | 10 | 0/0/10; 6/0/4 | 3; 3/0/0 | 3/6 |
| onetrust desktop | 10 | 0/0/10; 9/1/0 | 6; 6/0/0 | 6/6 |
| osano desktop | 10 | 0/0/10; 9/1/0 | 6; 6/0/0 | 6/6 |
| c15t Script tag mobile | 10 | 3/0/7; 8/2/0 | 6; 6/0/0 | 6/6 |
| c15t headless mobile | 7 | 1/1/5; 6/1/0 | 5; 4/1/0 | 5/5 |
| c15t React mobile | 10 | 3/0/7; 9/1/0 | 6; 6/0/0 | 6/6 |
| c15t Next.js mobile | 10 | 5/0/5; 10/0/0 | 6; 6/0/0 | 6/6 |
| c15t Vue mobile | 12 | 3/0/9; 12/0/0 | 8; 8/0/0 | 8/8 |
| c15t Nuxt mobile | 12 | 2/0/10; 9/0/3 | 8; 8/0/0 | 8/8 |
| c15t Astro mobile | 12 | 8/2/2; 9/2/1 | 8; 7/1/0 | 8/8 |
| c15t TanStack Start mobile | 10 | 5/0/5; 10/0/0 | 6; 6/0/0 | 6/6 |
| cookie-control mobile | 10 | 7/0/3; 7/0/3 | 6; 4/0/2 | 6/6 |
| didomi mobile | 10 | 4/0/6; 4/0/6 | 6; 0/0/6 | 6/6 |
| enzuzo mobile | 10 | 4/0/6; 4/0/6 | 3; 3/0/0 | 3/6 |
| iubenda mobile | 10 | 9/0/1; 10/0/0 | 6; 6/0/0 | 6/6 |
| ketch mobile | 10 | 0/7/3; 2/7/1 | 5; 0/5/0 | 5/6 |
| onetrust mobile | 10 | 0/0/10; 9/1/0 | 6; 6/0/0 | 6/6 |
| osano mobile | 10 | 0/0/10; 7/3/0 | 6; 6/0/0 | 6/6 |

## Load-only instrumentation audits

Two representative Next.js no-CMP cohorts request 30 minimal/full collector pairs plus three excluded warmup pairs, separately for desktop and mobile. Their numbers are independent of the CMP cohorts. No overhead estimate is subtracted from a product measurement. These load-only visits do not exercise trusted consent input or serialize input/unload snapshots, so they do not quantify those costs. CPU counters cover navigation through the first CDP snapshot after the observation deadline, without window normalization.

| Audit / profile | Measured attempts; raw P/F/I | Excluded retained warmups |
| --- | --- | --: |
| nextjs-desktop-overhead / desktop-article-v1 | 60; 60/0/0 | 6 |
| nextjs-mobile-overhead / mobile-article-v1 | 60; 60/0/0 | 6 |

| Audit | Metric | Minimal median / p75; A/I/E/M | Full median / p75; A/I/E/M | Full minus minimal; 95% interval; N; eligibility |
| --- | --- | --- | --- | --- |
| nextjs-desktop-overhead | custom.audit.fcp | 32 / 58; 30/30/0/0 | 32 / 45; 30/30/0/0 | 4; [0, 4]; N=30; eligible |
| nextjs-desktop-overhead | custom.audit.lcp | 88 / 108; 30/30/0/0 | 84 / 100; 30/30/0/0 | 0; [-4, 0]; N=30; eligible |
| nextjs-desktop-overhead | custom.audit.task-duration | 50.64 / 58.53; 30/30/0/0 | 109.25 / 121.46; 30/30/0/0 | 54.13; [50.26, 60.28]; N=30; eligible |
| nextjs-desktop-overhead | custom.audit.script-duration | 9.98 / 11.76; 30/30/0/0 | 35.22 / 40.35; 30/30/0/0 | 24.46; [22.09, 26.33]; N=30; eligible |
| nextjs-desktop-overhead | custom.audit.layout-duration | 3.15 / 3.4; 30/30/0/0 | 3.22 / 3.7; 30/30/0/0 | 0.01; [-0.1, 0.2]; N=30; eligible |
| nextjs-desktop-overhead | custom.audit.observed-window | 5,005.1 / 5,013.7; 30/30/0/0 | 5,006.45 / 5,034.05; 30/30/0/0 | 0.8; [-1.3, 3.6]; N=30; eligible |
| nextjs-mobile-overhead | custom.audit.fcp | 224 / 228; 30/30/0/0 | 238 / 244; 30/30/0/0 | 14; [10, 20]; N=30; eligible |
| nextjs-mobile-overhead | custom.audit.lcp | 3,500 / 3,504; 30/30/0/0 | 3,512 / 3,516; 30/30/0/0 | 14; [10, 16]; N=30; eligible |
| nextjs-mobile-overhead | custom.audit.task-duration | 237.4 / 257.05; 30/30/0/0 | 365.54 / 385.7; 30/30/0/0 | 113.29; [101.61, 136.65]; N=30; eligible |
| nextjs-mobile-overhead | custom.audit.script-duration | 45.64 / 49.8; 30/30/0/0 | 97.32 / 103.03; 30/30/0/0 | 47.84; [45.44, 50.94]; N=30; eligible |
| nextjs-mobile-overhead | custom.audit.layout-duration | 14.7 / 17.12; 30/30/0/0 | 15.11 / 16.98; 30/30/0/0 | 0.94; [0.34, 1.56]; N=30; eligible |
| nextjs-mobile-overhead | custom.audit.observed-window | 5,004.6 / 5,006.48; 30/30/0/0 | 5,004.25 / 5,005.45; 30/30/0/0 | 0.1; [-1.9, 0.7]; N=30; eligible |

## Unsupported adapter scenarios

An unsupported adapter action is a capability gap in this fixture. It does not establish a missing product capability or a failed consent transition. Its original attempt status remains visible, correctness is unknown unless a separate assertion establishes a failure, and its unobserved duration is unavailable. Measurement-status counts in JSON retain unsupported separately from unavailable.

| Entry / attempt | Scenario | Affected attempts | Unsupported records |
| --- | --- | --: | --- |
| cookie-control-desktop-actions / attempt-001 | save | 10/10 | unsupported-action: Adapter does not declare the save action; followup:unsupported-action: Adapter does not declare the save action |
| cookie-control-mobile-actions / attempt-001 | save | 10/10 | unsupported-action: Adapter does not declare the save action; followup:unsupported-action: Adapter does not declare the save action |
| cookie-control-desktop-checks / attempt-001 | save | 1/1 | unsupported-action: Adapter does not declare the save action; followup:unsupported-action: Adapter does not declare the save action |
| cookie-control-desktop-checks / attempt-001 | preferences | 1/1 | unsupported-action: Adapter does not declare the preferences action |
| cookie-control-desktop-checks / attempt-001 | save-page-probe-100ms | 1/1 | unsupported-action: Adapter does not declare the save action; followup:unsupported-action: Adapter does not declare the save action |
| cookie-control-mobile-checks / attempt-001 | save | 1/1 | unsupported-action: Adapter does not declare the save action; followup:unsupported-action: Adapter does not declare the save action |
| cookie-control-mobile-checks / attempt-001 | preferences | 1/1 | unsupported-action: Adapter does not declare the preferences action |
| cookie-control-mobile-checks / attempt-001 | save-page-probe-100ms | 1/1 | unsupported-action: Adapter does not declare the save action; followup:unsupported-action: Adapter does not declare the save action |

## Failure inventory

Every combined-attempt, separately recorded primary-outcome and nested-probe failure appears below, grouped only when entry, scenario, scope, code and message match. Propagated failures can appear in multiple scopes. Counts describe records, not distinct people or visits. Exact sample IDs remain in the machine-readable report. No failed attempt is replaced or relabeled.

| Entry / attempt | Fixture / scenario | Scope | Count | Code | Message |
| --- | --- | --- | --: | --- | --- |
| ketch-desktop-load / attempt-001 | nextjs-ketch-cmp / load | combined attempt | 30 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-load / attempt-001 | nextjs-onetrust-cmp / load | combined attempt | 30 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-load / attempt-001 | nextjs-osano-cmp / load | combined attempt | 30 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-load / attempt-001 | nuxt-c15t / load | combined attempt | 30 | state-unavailable | Adapter did not expose public consent state and controlled execution markers |
| ketch-mobile-load / attempt-001 | nextjs-ketch-cmp / load | combined attempt | 30 | banner-missing | Expected banner was not observed visible within the fixed load observation window |
| onetrust-mobile-load / attempt-001 | nextjs-onetrust-cmp / load | combined attempt | 26 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-load / attempt-001 | nextjs-onetrust-cmp / load | combined attempt | 4 | banner-missing | Expected banner was not observed visible within the fixed load observation window |
| osano-mobile-load / attempt-001 | nextjs-osano-cmp / load | combined attempt | 29 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-load / attempt-001 | nextjs-osano-cmp / load | combined attempt | 1 | banner-missing | Expected banner was not observed visible within the fixed load observation window |
| c15t-vue-desktop-actions / attempt-001 | vue-c15t / reject | combined attempt | 1 | sample-browser | page.goto: Timeout 15000ms exceeded. Call log: [2m - navigating to "http://127.0.0.1:4313/?scripts=2&token=9726e98d-f3ac-4868-a5fc-2da1f2e389df", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / accept | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=74add0cc-0178-4e56-a619-60c17061dfd1 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=74add0cc-0178-4e56-a619-60c17061dfd1", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / accept | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=1323c39a-d9da-43f3-9cef-f905dc8bb821 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=1323c39a-d9da-43f3-9cef-f905dc8bb821", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / accept | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=53bc5d80-66a8-4408-957d-284909497bd7 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=53bc5d80-66a8-4408-957d-284909497bd7", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / accept | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=2156e22e-55ab-4326-869d-4489e1fe4ed8 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=2156e22e-55ab-4326-869d-4489e1fe4ed8", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / accept | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=e4dec069-8c00-43db-a8c5-abccdeca61f5 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=e4dec069-8c00-43db-a8c5-abccdeca61f5", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / accept | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=e5060301-8810-468f-9120-f93a85479e2c Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=e5060301-8810-468f-9120-f93a85479e2c", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / accept | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=c12d6560-69e4-4610-af83-3e27d7170faf Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=c12d6560-69e4-4610-af83-3e27d7170faf", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / accept | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=955050e2-2e1c-45a1-8294-915a2dc6a368 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=955050e2-2e1c-45a1-8294-915a2dc6a368", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / accept | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=2eeb9dfd-e264-4238-b1dd-4599e2c04583 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=2eeb9dfd-e264-4238-b1dd-4599e2c04583", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / reject | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=ee686c87-43bd-41f0-a4c6-fedd52cd290e Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=ee686c87-43bd-41f0-a4c6-fedd52cd290e", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / reject | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=6bb07ac2-4fdc-4a72-953f-2b003617d691 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=6bb07ac2-4fdc-4a72-953f-2b003617d691", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / reject | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=9403c8d2-b3e0-4726-91ad-a90a4ac6aa9c Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=9403c8d2-b3e0-4726-91ad-a90a4ac6aa9c", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / reject | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=aa8e7078-08ad-4fa5-a3d5-202666c5d671 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=aa8e7078-08ad-4fa5-a3d5-202666c5d671", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / reject | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=c2f3f791-1b2c-447b-a3b4-b6af49209967 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=c2f3f791-1b2c-447b-a3b4-b6af49209967", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / reject | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=6c54925f-4d47-439f-ad23-2b68f9e0f7cf Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=6c54925f-4d47-439f-ad23-2b68f9e0f7cf", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / reject | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=0e5f655f-5f4c-4c14-9adc-ddf5eae49539 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=0e5f655f-5f4c-4c14-9adc-ddf5eae49539", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / reject | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=49b38767-de29-4c96-99f9-f2fd9419ab03 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=49b38767-de29-4c96-99f9-f2fd9419ab03", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / reject | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=a5e1d90a-bf39-4714-860d-9688cdf31ee1 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=a5e1d90a-bf39-4714-860d-9688cdf31ee1", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / reject | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=79b37009-4b73-4032-815e-a1bb55d1a304 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=79b37009-4b73-4032-815e-a1bb55d1a304", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / save | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=2ca6b7a4-3d8b-48ec-958b-775f68e02bc5 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=2ca6b7a4-3d8b-48ec-958b-775f68e02bc5", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / save | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=dc9cb69a-88fb-4b07-89a4-6b0b5d82dcf3 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=dc9cb69a-88fb-4b07-89a4-6b0b5d82dcf3", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / save | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=54695efb-a3c9-4c42-8f33-9c406a92c2c8 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=54695efb-a3c9-4c42-8f33-9c406a92c2c8", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / save | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=bb82a455-e41e-46e6-97bc-76e1ceaa1494 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=bb82a455-e41e-46e6-97bc-76e1ceaa1494", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / save | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=564857ba-ea69-4504-88ac-a6d85dc6d341 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=564857ba-ea69-4504-88ac-a6d85dc6d341", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / save | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=5686e334-a7a5-47d0-b21f-ddf10d7b2fc6 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=5686e334-a7a5-47d0-b21f-ddf10d7b2fc6", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / save | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=79a265b6-75ca-4bea-b234-a927c1b5e5a3 Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=79a265b6-75ca-4bea-b234-a927c1b5e5a3", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / save | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=3557fc00-6e03-4503-9279-aa20cd7b0b1e Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=3557fc00-6e03-4503-9279-aa20cd7b0b1e", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / save | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=fbac51d7-a95d-4d70-b9aa-51248f13da3a Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=fbac51d7-a95d-4d70-b9aa-51248f13da3a", waiting until "domcontentloaded"[22m |
| c15t-tanstack-start-desktop-actions / attempt-001 | tanstack-start-c15t / save | combined attempt | 1 | sample-browser | page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4316/?scripts=2&token=0d7a3ab7-c90e-4bbf-833d-bc9f127dd6cf Call log: [2m - navigating to "http://127.0.0.1:4316/?scripts=2&token=0d7a3ab7-c90e-4bbf-833d-bc9f127dd6cf", waiting until "domcontentloaded"[22m |
| cookie-control-desktop-actions / attempt-001 | nextjs-cookie-control-cmp / reject | combined attempt | 1 | followup:banner-missing | Expected banner was not observed visible before the deadline |
| cookie-control-desktop-actions / attempt-001 | nextjs-cookie-control-cmp / reject | nested followup | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| cookie-control-desktop-actions / attempt-001 | nextjs-cookie-control-cmp / save | combined attempt | 10 | unsupported-action | Adapter does not declare the save action |
| cookie-control-desktop-actions / attempt-001 | nextjs-cookie-control-cmp / save | combined attempt | 10 | followup:unsupported-action | Adapter does not declare the save action |
| cookie-control-desktop-actions / attempt-001 | nextjs-cookie-control-cmp / save | recorded primary outcome | 10 | unsupported-action | Adapter does not declare the save action |
| cookie-control-desktop-actions / attempt-001 | nextjs-cookie-control-cmp / save | nested followup | 10 | unsupported-action | Adapter does not declare the save action |
| didomi-desktop-actions / attempt-001 | nextjs-didomi-cmp / accept | combined attempt | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-desktop-actions / attempt-001 | nextjs-didomi-cmp / accept | combined attempt | 1 | followup:banner-missing | Expected banner was not observed visible before the deadline |
| didomi-desktop-actions / attempt-001 | nextjs-didomi-cmp / accept | recorded primary outcome | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-desktop-actions / attempt-001 | nextjs-didomi-cmp / accept | nested followup | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| didomi-desktop-actions / attempt-001 | nextjs-didomi-cmp / reject | combined attempt | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| didomi-desktop-actions / attempt-001 | nextjs-didomi-cmp / reject | recorded primary outcome | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-desktop-actions / attempt-001 | nextjs-ketch-cmp / accept | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-actions / attempt-001 | nextjs-ketch-cmp / accept | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-actions / attempt-001 | nextjs-ketch-cmp / accept | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-actions / attempt-001 | nextjs-ketch-cmp / accept | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-actions / attempt-001 | nextjs-ketch-cmp / reject | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-actions / attempt-001 | nextjs-ketch-cmp / reject | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-actions / attempt-001 | nextjs-ketch-cmp / reject | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-actions / attempt-001 | nextjs-ketch-cmp / reject | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-actions / attempt-001 | nextjs-ketch-cmp / save | combined attempt | 9 | sample-browser | locator.click: Timeout 5000ms exceeded. Call log: [2m - waiting for locator('#reopen-preferences').first()[22m [2m - locator resolved to <button type="button" id="reopen-preferences">Privacy preferences</button>[22m [2m - attempting click action[22m [2m 2 × waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - element is outside of the viewport[22m [2m - retrying click action[22m [2m - waiting 20ms[22m [2m 2 × waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - element is outside of the viewport[22m [2m - retrying click action[22m [2m - waiting 100ms[22m [2m 9 × waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - element is outside of the viewport[22m [2m - retrying click action[22m [2m - waiting 500ms[22m |
| ketch-desktop-actions / attempt-001 | nextjs-ketch-cmp / save | combined attempt | 1 | sample-browser | locator.click: Timeout 5000ms exceeded. Call log: [2m - waiting for locator('#reopen-preferences').first()[22m [2m - locator resolved to <button type="button" id="reopen-preferences">Privacy preferences</button>[22m [2m - attempting click action[22m [2m 2 × waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - element is outside of the viewport[22m [2m - retrying click action[22m [2m - waiting 20ms[22m [2m 2 × waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - element is outside of the viewport[22m [2m - retrying click action[22m [2m - waiting 100ms[22m [2m 8 × waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - element is outside of the viewport[22m [2m - retrying click action[22m [2m - waiting 500ms[22m |
| onetrust-desktop-actions / attempt-001 | nextjs-onetrust-cmp / accept | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-actions / attempt-001 | nextjs-onetrust-cmp / accept | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-actions / attempt-001 | nextjs-onetrust-cmp / accept | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-actions / attempt-001 | nextjs-onetrust-cmp / accept | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-actions / attempt-001 | nextjs-onetrust-cmp / reject | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-actions / attempt-001 | nextjs-onetrust-cmp / reject | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-actions / attempt-001 | nextjs-onetrust-cmp / reject | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-actions / attempt-001 | nextjs-onetrust-cmp / reject | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-actions / attempt-001 | nextjs-onetrust-cmp / save | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-actions / attempt-001 | nextjs-onetrust-cmp / save | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-actions / attempt-001 | nextjs-onetrust-cmp / save | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-actions / attempt-001 | nextjs-onetrust-cmp / save | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-actions / attempt-001 | nextjs-osano-cmp / accept | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-actions / attempt-001 | nextjs-osano-cmp / accept | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-actions / attempt-001 | nextjs-osano-cmp / accept | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-actions / attempt-001 | nextjs-osano-cmp / accept | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-actions / attempt-001 | nextjs-osano-cmp / reject | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-actions / attempt-001 | nextjs-osano-cmp / reject | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-actions / attempt-001 | nextjs-osano-cmp / reject | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-actions / attempt-001 | nextjs-osano-cmp / reject | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-actions / attempt-001 | nextjs-osano-cmp / save | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-actions / attempt-001 | nextjs-osano-cmp / save | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-actions / attempt-001 | nextjs-osano-cmp / save | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-actions / attempt-001 | nextjs-osano-cmp / save | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-actions / attempt-001 | script-tag-c15t / accept | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-actions / attempt-001 | script-tag-c15t / accept | combined attempt | 7 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-actions / attempt-001 | script-tag-c15t / accept | recorded primary outcome | 7 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-actions / attempt-001 | script-tag-c15t / accept | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-actions / attempt-001 | script-tag-c15t / reject | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-actions / attempt-001 | script-tag-c15t / reject | combined attempt | 9 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-actions / attempt-001 | script-tag-c15t / reject | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-actions / attempt-001 | script-tag-c15t / reject | nested followup | 9 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-actions / attempt-001 | script-tag-c15t / save | combined attempt | 2 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-actions / attempt-001 | script-tag-c15t / save | combined attempt | 2 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-actions / attempt-001 | script-tag-c15t / save | recorded primary outcome | 2 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-actions / attempt-001 | script-tag-c15t / save | nested followup | 2 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-actions / attempt-001 | script-tag-c15t-headless / accept | combined attempt | 8 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-actions / attempt-001 | script-tag-c15t-headless / accept | combined attempt | 8 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-actions / attempt-001 | script-tag-c15t-headless / accept | recorded primary outcome | 8 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-actions / attempt-001 | script-tag-c15t-headless / accept | nested followup | 8 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-actions / attempt-001 | script-tag-c15t-headless / reject | combined attempt | 9 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-actions / attempt-001 | script-tag-c15t-headless / reject | combined attempt | 8 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-actions / attempt-001 | script-tag-c15t-headless / reject | recorded primary outcome | 9 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-actions / attempt-001 | script-tag-c15t-headless / reject | nested followup | 8 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-actions / attempt-001 | script-tag-c15t-headless / save | combined attempt | 3 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-actions / attempt-001 | script-tag-c15t-headless / save | combined attempt | 2 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-actions / attempt-001 | script-tag-c15t-headless / save | recorded primary outcome | 3 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-actions / attempt-001 | script-tag-c15t-headless / save | nested followup | 2 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-actions / attempt-001 | react-c15t / accept | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-actions / attempt-001 | react-c15t / accept | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-actions / attempt-001 | react-c15t / accept | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-actions / attempt-001 | react-c15t / accept | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-actions / attempt-001 | react-c15t / reject | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-actions / attempt-001 | react-c15t / reject | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-actions / attempt-001 | react-c15t / reject | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-actions / attempt-001 | react-c15t / reject | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-actions / attempt-001 | react-c15t / save | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-actions / attempt-001 | react-c15t / save | combined attempt | 8 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-actions / attempt-001 | react-c15t / save | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-actions / attempt-001 | react-c15t / save | nested followup | 8 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-actions / attempt-001 | nextjs-c15t / accept | combined attempt | 2 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-actions / attempt-001 | nextjs-c15t / accept | nested followup | 2 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-actions / attempt-001 | nextjs-c15t / reject | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-actions / attempt-001 | nextjs-c15t / reject | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-actions / attempt-001 | vue-c15t / accept | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-actions / attempt-001 | vue-c15t / accept | combined attempt | 9 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-actions / attempt-001 | vue-c15t / accept | recorded primary outcome | 9 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-actions / attempt-001 | vue-c15t / accept | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-actions / attempt-001 | vue-c15t / reject | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-actions / attempt-001 | vue-c15t / reject | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-actions / attempt-001 | vue-c15t / reject | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-actions / attempt-001 | vue-c15t / reject | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-actions / attempt-001 | vue-c15t / save | combined attempt | 7 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-actions / attempt-001 | vue-c15t / save | combined attempt | 7 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-actions / attempt-001 | vue-c15t / save | recorded primary outcome | 7 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-actions / attempt-001 | vue-c15t / save | nested followup | 7 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-actions / attempt-001 | tanstack-start-c15t / accept | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-actions / attempt-001 | tanstack-start-c15t / accept | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-actions / attempt-001 | tanstack-start-c15t / accept | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-actions / attempt-001 | tanstack-start-c15t / accept | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-actions / attempt-001 | tanstack-start-c15t / reject | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-actions / attempt-001 | tanstack-start-c15t / reject | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-actions / attempt-001 | tanstack-start-c15t / reject | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-actions / attempt-001 | tanstack-start-c15t / reject | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| cookie-control-mobile-actions / attempt-001 | nextjs-cookie-control-cmp / save | combined attempt | 10 | unsupported-action | Adapter does not declare the save action |
| cookie-control-mobile-actions / attempt-001 | nextjs-cookie-control-cmp / save | combined attempt | 10 | followup:unsupported-action | Adapter does not declare the save action |
| cookie-control-mobile-actions / attempt-001 | nextjs-cookie-control-cmp / save | recorded primary outcome | 10 | unsupported-action | Adapter does not declare the save action |
| cookie-control-mobile-actions / attempt-001 | nextjs-cookie-control-cmp / save | nested followup | 10 | unsupported-action | Adapter does not declare the save action |
| didomi-mobile-actions / attempt-001 | nextjs-didomi-cmp / accept | combined attempt | 10 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-actions / attempt-001 | nextjs-didomi-cmp / accept | combined attempt | 8 | followup:restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-actions / attempt-001 | nextjs-didomi-cmp / accept | recorded primary outcome | 10 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-actions / attempt-001 | nextjs-didomi-cmp / accept | nested followup | 8 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-actions / attempt-001 | nextjs-didomi-cmp / reject | combined attempt | 10 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-actions / attempt-001 | nextjs-didomi-cmp / reject | combined attempt | 10 | followup:restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-actions / attempt-001 | nextjs-didomi-cmp / reject | recorded primary outcome | 10 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-actions / attempt-001 | nextjs-didomi-cmp / reject | nested followup | 10 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-actions / attempt-001 | nextjs-didomi-cmp / save | combined attempt | 10 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-actions / attempt-001 | nextjs-didomi-cmp / save | combined attempt | 10 | followup:restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-actions / attempt-001 | nextjs-didomi-cmp / save | recorded primary outcome | 10 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-actions / attempt-001 | nextjs-didomi-cmp / save | nested followup | 10 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| enzuzo-mobile-actions / attempt-001 | nextjs-enzuzo-cmp / accept | combined attempt | 10 | sample-browser | locator.click: Element is outside of the viewport Call log: [2m - waiting for locator('#ez-cookie-notification__accept').first()[22m [2m - locator resolved to <button id="ez-cookie-notification__accept" class="enzuzo-notification-button notification-button button-default button-accept">Allow All</button>[22m [2m - attempting click action[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m |
| enzuzo-mobile-actions / attempt-001 | nextjs-enzuzo-cmp / reject | combined attempt | 10 | sample-browser | locator.click: Element is outside of the viewport Call log: [2m - waiting for locator('#ez-cookie-notification__decline').first()[22m [2m - locator resolved to <button id="ez-cookie-notification__decline" class="enzuzo-notification-button notification-button button-default button-decline">Decline</button>[22m [2m - attempting click action[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m |
| enzuzo-mobile-actions / attempt-001 | nextjs-enzuzo-cmp / save | combined attempt | 5 | followup:restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| enzuzo-mobile-actions / attempt-001 | nextjs-enzuzo-cmp / save | nested followup | 5 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| iubenda-mobile-actions / attempt-001 | nextjs-iubenda-cmp / accept | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| iubenda-mobile-actions / attempt-001 | nextjs-iubenda-cmp / accept | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| iubenda-mobile-actions / attempt-001 | nextjs-iubenda-cmp / accept | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| iubenda-mobile-actions / attempt-001 | nextjs-iubenda-cmp / accept | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-mobile-actions / attempt-001 | nextjs-ketch-cmp / accept | combined attempt | 10 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-actions / attempt-001 | nextjs-ketch-cmp / accept | combined attempt | 10 | followup:banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-actions / attempt-001 | nextjs-ketch-cmp / accept | recorded primary outcome | 10 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-actions / attempt-001 | nextjs-ketch-cmp / accept | nested followup | 10 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-actions / attempt-001 | nextjs-ketch-cmp / reject | combined attempt | 10 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-actions / attempt-001 | nextjs-ketch-cmp / reject | combined attempt | 10 | followup:banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-actions / attempt-001 | nextjs-ketch-cmp / reject | recorded primary outcome | 10 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-actions / attempt-001 | nextjs-ketch-cmp / reject | nested followup | 10 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-actions / attempt-001 | nextjs-ketch-cmp / save | combined attempt | 10 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-actions / attempt-001 | nextjs-ketch-cmp / save | combined attempt | 10 | followup:banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-actions / attempt-001 | nextjs-ketch-cmp / save | recorded primary outcome | 10 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-actions / attempt-001 | nextjs-ketch-cmp / save | nested followup | 10 | banner-missing | Expected banner was not observed visible before the deadline |
| onetrust-mobile-actions / attempt-001 | nextjs-onetrust-cmp / accept | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-actions / attempt-001 | nextjs-onetrust-cmp / accept | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-actions / attempt-001 | nextjs-onetrust-cmp / accept | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-actions / attempt-001 | nextjs-onetrust-cmp / accept | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-actions / attempt-001 | nextjs-onetrust-cmp / reject | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-actions / attempt-001 | nextjs-onetrust-cmp / reject | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-actions / attempt-001 | nextjs-onetrust-cmp / reject | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-actions / attempt-001 | nextjs-onetrust-cmp / reject | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-actions / attempt-001 | nextjs-onetrust-cmp / save | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-actions / attempt-001 | nextjs-onetrust-cmp / save | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-actions / attempt-001 | nextjs-onetrust-cmp / save | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-actions / attempt-001 | nextjs-onetrust-cmp / save | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-actions / attempt-001 | nextjs-osano-cmp / accept | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-actions / attempt-001 | nextjs-osano-cmp / accept | combined attempt | 10 | followup:page-unresponsive | Page control did not respond after the consent action |
| osano-mobile-actions / attempt-001 | nextjs-osano-cmp / accept | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-actions / attempt-001 | nextjs-osano-cmp / accept | nested followup | 10 | page-unresponsive | Page control did not respond after the consent action |
| osano-mobile-actions / attempt-001 | nextjs-osano-cmp / reject | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-actions / attempt-001 | nextjs-osano-cmp / reject | combined attempt | 10 | followup:page-unresponsive | Page control did not respond after the consent action |
| osano-mobile-actions / attempt-001 | nextjs-osano-cmp / reject | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-actions / attempt-001 | nextjs-osano-cmp / reject | nested followup | 10 | page-unresponsive | Page control did not respond after the consent action |
| osano-mobile-actions / attempt-001 | nextjs-osano-cmp / save | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-actions / attempt-001 | nextjs-osano-cmp / save | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-actions / attempt-001 | nextjs-osano-cmp / save | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-actions / attempt-001 | nextjs-osano-cmp / save | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-desktop-checks / attempt-001 | script-tag-c15t / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-script-desktop-checks / attempt-001 | script-tag-c15t / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-script-desktop-checks / attempt-001 | script-tag-c15t / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-script-desktop-checks / attempt-001 | script-tag-c15t / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-script-desktop-checks / attempt-001 | script-tag-c15t / save-page-probe-100ms | combined attempt | 1 | followup:page-unresponsive | Page control did not respond after the consent action |
| c15t-script-desktop-checks / attempt-001 | script-tag-c15t / save-page-probe-100ms | nested followup | 1 | page-unresponsive | Page control did not respond after the consent action |
| c15t-headless-desktop-checks / attempt-001 | script-tag-c15t-headless / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-headless-desktop-checks / attempt-001 | script-tag-c15t-headless / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-headless-desktop-checks / attempt-001 | script-tag-c15t-headless / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-headless-desktop-checks / attempt-001 | script-tag-c15t-headless / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-react-desktop-checks / attempt-001 | react-c15t / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-react-desktop-checks / attempt-001 | react-c15t / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-react-desktop-checks / attempt-001 | react-c15t / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-react-desktop-checks / attempt-001 | react-c15t / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-nextjs-desktop-checks / attempt-001 | nextjs-c15t / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-nextjs-desktop-checks / attempt-001 | nextjs-c15t / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-nextjs-desktop-checks / attempt-001 | nextjs-c15t / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-nextjs-desktop-checks / attempt-001 | nextjs-c15t / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-vue-desktop-checks / attempt-001 | vue-c15t / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-vue-desktop-checks / attempt-001 | vue-c15t / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-vue-desktop-checks / attempt-001 | vue-c15t / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-vue-desktop-checks / attempt-001 | vue-c15t / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-nuxt-desktop-checks / attempt-001 | nuxt-c15t / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-nuxt-desktop-checks / attempt-001 | nuxt-c15t / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-nuxt-desktop-checks / attempt-001 | nuxt-c15t / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-nuxt-desktop-checks / attempt-001 | nuxt-c15t / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-astro-desktop-checks / attempt-001 | astro-c15t / withdraw | combined attempt | 1 | unexpected-banner | Banner was visible in a scenario expecting no banner |
| c15t-astro-desktop-checks / attempt-001 | astro-c15t / withdraw | combined attempt | 1 | followup:unexpected-banner | Banner was visible in a scenario expecting no banner |
| c15t-astro-desktop-checks / attempt-001 | astro-c15t / withdraw | recorded primary outcome | 1 | unexpected-banner | Banner was visible in a scenario expecting no banner |
| c15t-astro-desktop-checks / attempt-001 | astro-c15t / withdraw | nested followup | 1 | unexpected-banner | Banner was visible in a scenario expecting no banner |
| c15t-astro-desktop-checks / attempt-001 | astro-c15t / returning-accepted | combined attempt | 1 | unexpected-banner | Banner was visible in a scenario expecting no banner |
| c15t-tanstack-start-desktop-checks / attempt-001 | tanstack-start-c15t / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-tanstack-start-desktop-checks / attempt-001 | tanstack-start-c15t / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-tanstack-start-desktop-checks / attempt-001 | tanstack-start-c15t / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-tanstack-start-desktop-checks / attempt-001 | tanstack-start-c15t / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| cookie-control-desktop-checks / attempt-001 | nextjs-cookie-control-cmp / save | combined attempt | 1 | unsupported-action | Adapter does not declare the save action |
| cookie-control-desktop-checks / attempt-001 | nextjs-cookie-control-cmp / save | combined attempt | 1 | followup:unsupported-action | Adapter does not declare the save action |
| cookie-control-desktop-checks / attempt-001 | nextjs-cookie-control-cmp / save | recorded primary outcome | 1 | unsupported-action | Adapter does not declare the save action |
| cookie-control-desktop-checks / attempt-001 | nextjs-cookie-control-cmp / save | nested followup | 1 | unsupported-action | Adapter does not declare the save action |
| cookie-control-desktop-checks / attempt-001 | nextjs-cookie-control-cmp / preferences | combined attempt | 1 | unsupported-action | Adapter does not declare the preferences action |
| cookie-control-desktop-checks / attempt-001 | nextjs-cookie-control-cmp / save-page-probe-100ms | combined attempt | 1 | unsupported-action | Adapter does not declare the save action |
| cookie-control-desktop-checks / attempt-001 | nextjs-cookie-control-cmp / save-page-probe-100ms | combined attempt | 1 | followup:unsupported-action | Adapter does not declare the save action |
| cookie-control-desktop-checks / attempt-001 | nextjs-cookie-control-cmp / save-page-probe-100ms | recorded primary outcome | 1 | unsupported-action | Adapter does not declare the save action |
| cookie-control-desktop-checks / attempt-001 | nextjs-cookie-control-cmp / save-page-probe-100ms | nested followup | 1 | unsupported-action | Adapter does not declare the save action |
| enzuzo-desktop-checks / attempt-001 | nextjs-enzuzo-cmp / preferences | combined attempt | 1 | sample-browser | locator.click: Element is outside of the viewport Call log: [2m - waiting for locator('#notificationManagerLink').first()[22m [2m - locator resolved to <a href="#" role="button" class="manager-link" id="notificationManagerLink">↵ Manage Cookies↵ </a>[22m [2m - attempting click action[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / load | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / accept | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / accept | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / accept | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / accept | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / reject | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / reject | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / reject | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / reject | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / save | combined attempt | 1 | sample-browser | locator.click: Timeout 5000ms exceeded. Call log: [2m - waiting for locator('#reopen-preferences').first()[22m [2m - locator resolved to <button type="button" id="reopen-preferences">Privacy preferences</button>[22m [2m - attempting click action[22m [2m 2 × waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - element is outside of the viewport[22m [2m - retrying click action[22m [2m - waiting 20ms[22m [2m 2 × waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - element is outside of the viewport[22m [2m - retrying click action[22m [2m - waiting 100ms[22m [2m 9 × waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - element is outside of the viewport[22m [2m - retrying click action[22m [2m - waiting 500ms[22m |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / preferences | combined attempt | 1 | sample-browser | locator.click: Element is outside of the viewport Call log: [2m - waiting for locator('#reopen-preferences').first()[22m [2m - locator resolved to <button type="button" id="reopen-preferences">Privacy preferences</button>[22m [2m - attempting click action[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / withdraw | combined attempt | 1 | sample-browser | locator.click: Timeout 5000ms exceeded. Call log: [2m - waiting for locator('button[aria-label="Reject All"]').first()[22m |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / returning-accepted | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / returning-rejected | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / reject-keyboard | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / reject-keyboard | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / reject-keyboard | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / reject-keyboard | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-desktop-checks / attempt-001 | nextjs-ketch-cmp / save-page-probe-100ms | combined attempt | 1 | sample-browser | locator.click: Timeout 5000ms exceeded. Call log: [2m - waiting for locator('#reopen-preferences').first()[22m [2m - locator resolved to <button type="button" id="reopen-preferences">Privacy preferences</button>[22m [2m - attempting click action[22m [2m 2 × waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - element is outside of the viewport[22m [2m - retrying click action[22m [2m - waiting 20ms[22m [2m 2 × waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - element is outside of the viewport[22m [2m - retrying click action[22m [2m - waiting 100ms[22m [2m 9 × waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - element is outside of the viewport[22m [2m - retrying click action[22m [2m - waiting 500ms[22m |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / load | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / accept | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / accept | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / accept | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / accept | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / reject | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / reject | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / reject | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / reject | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / save | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / save | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / save | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / save | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / preferences | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / returning-accepted | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / returning-rejected | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / reject-keyboard | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / reject-keyboard | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / reject-keyboard | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / reject-keyboard | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / save-page-probe-100ms | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / save-page-probe-100ms | combined attempt | 1 | followup:page-unresponsive | Page control did not respond after the consent action |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / save-page-probe-100ms | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-desktop-checks / attempt-001 | nextjs-onetrust-cmp / save-page-probe-100ms | nested followup | 1 | page-unresponsive | Page control did not respond after the consent action |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / load | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / accept | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / accept | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / accept | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / accept | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / reject | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / reject | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / reject | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / reject | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / save | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / save | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / save | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / save | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / preferences | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / returning-accepted | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / returning-rejected | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / reject-keyboard | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / reject-keyboard | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / reject-keyboard | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / reject-keyboard | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / save-page-probe-100ms | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / save-page-probe-100ms | combined attempt | 1 | followup:page-unresponsive | Page control did not respond after the consent action |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / save-page-probe-100ms | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-desktop-checks / attempt-001 | nextjs-osano-cmp / save-page-probe-100ms | nested followup | 1 | page-unresponsive | Page control did not respond after the consent action |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / accept | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / accept | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / accept | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / accept | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / reject | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / reject | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / reject | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / reject | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / save | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / save | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / save | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / save | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / preferences | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / withdraw | combined attempt | 1 | followup:page-unresponsive | Page control did not respond after the consent action |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / withdraw | nested followup | 1 | page-unresponsive | Page control did not respond after the consent action |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / reject-keyboard | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / reject-keyboard | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / reject-keyboard | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / reject-keyboard | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / save-page-probe-100ms | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / save-page-probe-100ms | combined attempt | 1 | followup:page-unresponsive | Page control did not respond after the consent action |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / save-page-probe-100ms | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-script-mobile-checks / attempt-001 | script-tag-c15t / save-page-probe-100ms | nested followup | 1 | page-unresponsive | Page control did not respond after the consent action |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / accept | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / accept | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / accept | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / accept | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / reject | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / reject | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / reject | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / reject | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / save | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / save | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / save | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / save | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / preferences | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / withdraw | combined attempt | 1 | forbidden-script-execution | script-0 executed in forbidden category measurement at 1096.7000002861023 ms |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / withdraw | combined attempt | 1 | forbidden-script-execution | script-1 executed in forbidden category marketing at 1096.8000001907349 ms |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / withdraw | combined attempt | 1 | followup:forbidden-script-execution | script-0 executed in forbidden category measurement at 1091.9000000953674 ms |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / withdraw | combined attempt | 1 | followup:forbidden-script-execution | script-1 executed in forbidden category marketing at 1092.6999998092651 ms |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / withdraw | combined attempt | 1 | followup:page-unresponsive | Page control did not respond after the consent action |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / withdraw | recorded primary outcome | 1 | forbidden-script-execution | script-0 executed in forbidden category measurement at 1096.7000002861023 ms |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / withdraw | recorded primary outcome | 1 | forbidden-script-execution | script-1 executed in forbidden category marketing at 1096.8000001907349 ms |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / withdraw | nested followup | 1 | forbidden-script-execution | script-0 executed in forbidden category measurement at 1091.9000000953674 ms |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / withdraw | nested followup | 1 | forbidden-script-execution | script-1 executed in forbidden category marketing at 1092.6999998092651 ms |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / withdraw | nested followup | 1 | page-unresponsive | Page control did not respond after the consent action |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / save-page-probe-100ms | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / save-page-probe-100ms | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / save-page-probe-100ms | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-headless-mobile-checks / attempt-001 | script-tag-c15t-headless / save-page-probe-100ms | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / accept | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / accept | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / accept | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / accept | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / reject | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / reject | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / reject | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / reject | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / save | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / save | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / save | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / save | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / preferences | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-react-mobile-checks / attempt-001 | react-c15t / withdraw | combined attempt | 1 | followup:page-unresponsive | Page control did not respond after the consent action |
| c15t-react-mobile-checks / attempt-001 | react-c15t / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-react-mobile-checks / attempt-001 | react-c15t / withdraw | nested followup | 1 | page-unresponsive | Page control did not respond after the consent action |
| c15t-react-mobile-checks / attempt-001 | react-c15t / reject-keyboard | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / reject-keyboard | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / reject-keyboard | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / reject-keyboard | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / save-page-probe-100ms | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / save-page-probe-100ms | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / save-page-probe-100ms | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-react-mobile-checks / attempt-001 | react-c15t / save-page-probe-100ms | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / accept | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / accept | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / accept | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / accept | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / reject | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / reject | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / reject | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / reject | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / preferences | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / reject-keyboard | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / reject-keyboard | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / reject-keyboard | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nextjs-mobile-checks / attempt-001 | nextjs-c15t / reject-keyboard | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / accept | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / accept | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / accept | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / accept | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / reject | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / reject | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / reject | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / reject | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / save | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / save | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / save | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / save | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / preferences | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer, action.dismissed, action.consent-effective |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer, action.dismissed, action.consent-effective |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer, action.dismissed, action.consent-effective |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer, action.dismissed, action.consent-effective |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / accept-early | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / accept-early | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / accept-early | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / accept-early | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / reject-keyboard | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / reject-keyboard | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / reject-keyboard | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / reject-keyboard | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / accept-large | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / accept-large | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / accept-large | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / accept-large | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / save-post-dismissal | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / save-post-dismissal | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / save-post-dismissal | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-vue-mobile-checks / attempt-001 | vue-c15t / save-post-dismissal | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / load | combined attempt | 1 | state-unavailable | Adapter did not expose public consent state and controlled execution markers |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / accept | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / accept | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / accept | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / accept | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / reject | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / reject | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / reject | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / reject | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / preferences | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer, action.dismissed, action.consent-effective |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer, action.dismissed, action.consent-effective |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer, action.dismissed, action.consent-effective |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer, action.dismissed, action.consent-effective |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / accept-early | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / accept-early | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / accept-early | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / accept-early | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / reject-keyboard | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / reject-keyboard | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / reject-keyboard | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / reject-keyboard | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / returning-accepted | combined attempt | 1 | state-unavailable | Adapter did not expose public consent state and controlled execution markers |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / returning-rejected | combined attempt | 1 | state-unavailable | Adapter did not expose public consent state and controlled execution markers |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / accept-large | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / accept-large | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / accept-large | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-checks / attempt-001 | nuxt-c15t / accept-large | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-astro-mobile-checks / attempt-001 | astro-c15t / preferences | combined attempt | 1 | observation-window-exceeded | Action completion was verified only after the measurement cutoff; the late correctness snapshot does not establish a completion duration |
| c15t-astro-mobile-checks / attempt-001 | astro-c15t / withdraw | combined attempt | 1 | unexpected-banner | Banner was visible in a scenario expecting no banner |
| c15t-astro-mobile-checks / attempt-001 | astro-c15t / withdraw | combined attempt | 1 | followup:unexpected-banner | Banner was visible in a scenario expecting no banner |
| c15t-astro-mobile-checks / attempt-001 | astro-c15t / withdraw | recorded primary outcome | 1 | unexpected-banner | Banner was visible in a scenario expecting no banner |
| c15t-astro-mobile-checks / attempt-001 | astro-c15t / withdraw | nested followup | 1 | unexpected-banner | Banner was visible in a scenario expecting no banner |
| c15t-astro-mobile-checks / attempt-001 | astro-c15t / returning-accepted | combined attempt | 1 | unexpected-banner | Banner was visible in a scenario expecting no banner |
| c15t-astro-mobile-checks / attempt-001 | astro-c15t / accept-large | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-astro-mobile-checks / attempt-001 | astro-c15t / accept-large | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-astro-mobile-checks / attempt-001 | astro-c15t / accept-large | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-astro-mobile-checks / attempt-001 | astro-c15t / accept-large | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / accept | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / accept | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / accept | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / accept | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / reject | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / reject | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / reject | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / reject | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / preferences | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: action.dismissed, action.consent-effective |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / reject-keyboard | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / reject-keyboard | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / reject-keyboard | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-tanstack-start-mobile-checks / attempt-001 | tanstack-start-c15t / reject-keyboard | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| cookie-control-mobile-checks / attempt-001 | nextjs-cookie-control-cmp / save | combined attempt | 1 | unsupported-action | Adapter does not declare the save action |
| cookie-control-mobile-checks / attempt-001 | nextjs-cookie-control-cmp / save | combined attempt | 1 | followup:unsupported-action | Adapter does not declare the save action |
| cookie-control-mobile-checks / attempt-001 | nextjs-cookie-control-cmp / save | recorded primary outcome | 1 | unsupported-action | Adapter does not declare the save action |
| cookie-control-mobile-checks / attempt-001 | nextjs-cookie-control-cmp / save | nested followup | 1 | unsupported-action | Adapter does not declare the save action |
| cookie-control-mobile-checks / attempt-001 | nextjs-cookie-control-cmp / preferences | combined attempt | 1 | unsupported-action | Adapter does not declare the preferences action |
| cookie-control-mobile-checks / attempt-001 | nextjs-cookie-control-cmp / save-page-probe-100ms | combined attempt | 1 | unsupported-action | Adapter does not declare the save action |
| cookie-control-mobile-checks / attempt-001 | nextjs-cookie-control-cmp / save-page-probe-100ms | combined attempt | 1 | followup:unsupported-action | Adapter does not declare the save action |
| cookie-control-mobile-checks / attempt-001 | nextjs-cookie-control-cmp / save-page-probe-100ms | recorded primary outcome | 1 | unsupported-action | Adapter does not declare the save action |
| cookie-control-mobile-checks / attempt-001 | nextjs-cookie-control-cmp / save-page-probe-100ms | nested followup | 1 | unsupported-action | Adapter does not declare the save action |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / accept | combined attempt | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / accept | combined attempt | 1 | followup:restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / accept | recorded primary outcome | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / accept | nested followup | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / reject | combined attempt | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / reject | combined attempt | 1 | followup:restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / reject | recorded primary outcome | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / reject | nested followup | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / save | combined attempt | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / save | combined attempt | 1 | followup:restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / save | recorded primary outcome | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / save | nested followup | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / withdraw | combined attempt | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / withdraw | combined attempt | 1 | followup:restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / withdraw | recorded primary outcome | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / withdraw | nested followup | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / reject-keyboard | combined attempt | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / reject-keyboard | combined attempt | 1 | followup:restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / reject-keyboard | recorded primary outcome | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / reject-keyboard | nested followup | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / save-page-probe-100ms | combined attempt | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / save-page-probe-100ms | combined attempt | 1 | followup:restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / save-page-probe-100ms | recorded primary outcome | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| didomi-mobile-checks / attempt-001 | nextjs-didomi-cmp / save-page-probe-100ms | nested followup | 1 | restoration-not-ready | Public consent restoration failed: public-state-not-ready |
| enzuzo-mobile-checks / attempt-001 | nextjs-enzuzo-cmp / accept | combined attempt | 1 | sample-browser | locator.click: Element is outside of the viewport Call log: [2m - waiting for locator('#ez-cookie-notification__accept').first()[22m [2m - locator resolved to <button id="ez-cookie-notification__accept" class="enzuzo-notification-button notification-button button-default button-accept">Allow All</button>[22m [2m - attempting click action[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m |
| enzuzo-mobile-checks / attempt-001 | nextjs-enzuzo-cmp / reject | combined attempt | 1 | sample-browser | locator.click: Element is outside of the viewport Call log: [2m - waiting for locator('#ez-cookie-notification__decline').first()[22m [2m - locator resolved to <button id="ez-cookie-notification__decline" class="enzuzo-notification-button notification-button button-default button-decline">Decline</button>[22m [2m - attempting click action[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m |
| enzuzo-mobile-checks / attempt-001 | nextjs-enzuzo-cmp / preferences | combined attempt | 1 | sample-browser | locator.click: Element is outside of the viewport Call log: [2m - waiting for locator('#notificationManagerLink').first()[22m [2m - locator resolved to <a href="#" role="button" class="manager-link" id="notificationManagerLink">↵ Manage Cookies↵ </a>[22m [2m - attempting click action[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m |
| enzuzo-mobile-checks / attempt-001 | nextjs-enzuzo-cmp / withdraw | combined attempt | 1 | visitor-preparation | locator.click: Element is outside of the viewport Call log: [2m - waiting for locator('#ez-cookie-notification__accept').first()[22m [2m - locator resolved to <button id="ez-cookie-notification__accept" class="enzuzo-notification-button notification-button button-default button-accept">Allow All</button>[22m [2m - attempting click action[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m |
| enzuzo-mobile-checks / attempt-001 | nextjs-enzuzo-cmp / returning-accepted | combined attempt | 1 | visitor-preparation | locator.click: Element is outside of the viewport Call log: [2m - waiting for locator('#ez-cookie-notification__accept').first()[22m [2m - locator resolved to <button id="ez-cookie-notification__accept" class="enzuzo-notification-button notification-button button-default button-accept">Allow All</button>[22m [2m - attempting click action[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m |
| enzuzo-mobile-checks / attempt-001 | nextjs-enzuzo-cmp / returning-rejected | combined attempt | 1 | visitor-preparation | locator.click: Element is outside of the viewport Call log: [2m - waiting for locator('#ez-cookie-notification__decline').first()[22m [2m - locator resolved to <button id="ez-cookie-notification__decline" class="enzuzo-notification-button notification-button button-default button-decline">Decline</button>[22m [2m - attempting click action[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m |
| iubenda-mobile-checks / attempt-001 | nextjs-iubenda-cmp / preferences | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / load | combined attempt | 1 | banner-missing | Expected banner was not observed visible within the fixed load observation window |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / accept | combined attempt | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / accept | combined attempt | 1 | followup:banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / accept | recorded primary outcome | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / accept | nested followup | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / reject | combined attempt | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / reject | combined attempt | 1 | followup:banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / reject | recorded primary outcome | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / reject | nested followup | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / save | combined attempt | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / save | combined attempt | 1 | followup:banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / save | recorded primary outcome | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / save | nested followup | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / preferences | combined attempt | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / withdraw | combined attempt | 1 | sample-browser | locator.click: Timeout 5000ms exceeded. Call log: [2m - waiting for locator('button[aria-label="Reject All"]').first()22m |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / returning-accepted | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / returning-rejected | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / reject-keyboard | combined attempt | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / reject-keyboard | combined attempt | 1 | followup:banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / reject-keyboard | recorded primary outcome | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / reject-keyboard | nested followup | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / save-page-probe-100ms | combined attempt | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / save-page-probe-100ms | combined attempt | 1 | followup:banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / save-page-probe-100ms | recorded primary outcome | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| ketch-mobile-checks / attempt-001 | nextjs-ketch-cmp / save-page-probe-100ms | nested followup | 1 | banner-missing | Expected banner was not observed visible before the deadline |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / load | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / accept | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / accept | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / accept | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / accept | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / reject | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / reject | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / reject | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / reject | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / save | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / save | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / save | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / save | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / preferences | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / returning-accepted | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / returning-rejected | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / reject-keyboard | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / reject-keyboard | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / reject-keyboard | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / reject-keyboard | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / save-page-probe-100ms | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / save-page-probe-100ms | combined attempt | 1 | followup:page-unresponsive | Page control did not respond after the consent action |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / save-page-probe-100ms | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| onetrust-mobile-checks / attempt-001 | nextjs-onetrust-cmp / save-page-probe-100ms | nested followup | 1 | page-unresponsive | Page control did not respond after the consent action |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / load | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / accept | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / accept | combined attempt | 1 | followup:page-unresponsive | Page control did not respond after the consent action |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / accept | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / accept | nested followup | 1 | page-unresponsive | Page control did not respond after the consent action |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / reject | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / reject | combined attempt | 1 | followup:page-unresponsive | Page control did not respond after the consent action |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / reject | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / reject | nested followup | 1 | page-unresponsive | Page control did not respond after the consent action |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / save | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / save | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / save | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / save | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / preferences | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / withdraw | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / withdraw | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / withdraw | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / withdraw | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / returning-accepted | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / returning-rejected | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / reject-keyboard | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / reject-keyboard | combined attempt | 1 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / reject-keyboard | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / reject-keyboard | nested followup | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / save-page-probe-100ms | combined attempt | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / save-page-probe-100ms | combined attempt | 1 | followup:page-unresponsive | Page control did not respond after the consent action |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / save-page-probe-100ms | recorded primary outcome | 1 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| osano-mobile-checks / attempt-001 | nextjs-osano-cmp / save-page-probe-100ms | nested followup | 1 | page-unresponsive | Page control did not respond after the consent action |
| c15t-nuxt-mobile-actions-correction-001 / attempt-001 | nuxt-c15t / accept | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-actions-correction-001 / attempt-001 | nuxt-c15t / accept | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-actions-correction-001 / attempt-001 | nuxt-c15t / accept | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-actions-correction-001 / attempt-001 | nuxt-c15t / accept | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-actions-correction-001 / attempt-001 | nuxt-c15t / reject | combined attempt | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-actions-correction-001 / attempt-001 | nuxt-c15t / reject | combined attempt | 10 | followup:required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-actions-correction-001 / attempt-001 | nuxt-c15t / reject | recorded primary outcome | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| c15t-nuxt-mobile-actions-correction-001 / attempt-001 | nuxt-c15t / reject | nested followup | 10 | required-measurement-unavailable | Required observations unavailable: initial.transfer |
| enzuzo-mobile-actions-correction-001 / attempt-001 | nextjs-enzuzo-cmp / accept | combined attempt | 10 | sample-browser | locator.click: Element is outside of the viewport Call log: [2m - waiting for locator('#ez-cookie-notification__accept').first()[22m [2m - locator resolved to <button id="ez-cookie-notification__accept" class="enzuzo-notification-button notification-button button-default button-accept">Allow All</button>[22m [2m - attempting click action[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m |
| enzuzo-mobile-actions-correction-001 / attempt-001 | nextjs-enzuzo-cmp / reject | combined attempt | 10 | sample-browser | locator.click: Element is outside of the viewport Call log: [2m - waiting for locator('#ez-cookie-notification__decline').first()[22m [2m - locator resolved to <button id="ez-cookie-notification__decline" class="enzuzo-notification-button notification-button button-default button-decline">Decline</button>[22m [2m - attempting click action[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m |

## Paired eligibility limits

| Entry / attempt | Metric | Reason |
| --- | --- | --- |
| c15t-nextjs-desktop-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| c15t-nextjs-desktop-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| c15t-nuxt-desktop-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| c15t-nuxt-desktop-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| c15t-astro-desktop-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| c15t-astro-desktop-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| c15t-tanstack-start-desktop-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| c15t-tanstack-start-desktop-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| cookie-control-desktop-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| cookie-control-desktop-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| didomi-desktop-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| didomi-desktop-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| enzuzo-desktop-load / attempt-001 | page.lcp | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| enzuzo-desktop-load / attempt-001 | page.cls | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| enzuzo-desktop-load / attempt-001 | page.primary-content-paint | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| enzuzo-desktop-load / attempt-001 | initial.transfer | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| enzuzo-desktop-load / attempt-001 | initial.encoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| enzuzo-desktop-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| enzuzo-desktop-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| enzuzo-desktop-load / attempt-001 | initial.decoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| enzuzo-desktop-load / attempt-001 | initial.long-task-blocking | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| iubenda-desktop-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| iubenda-desktop-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| ketch-desktop-load / attempt-001 | page.lcp | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| ketch-desktop-load / attempt-001 | page.lcp | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| ketch-desktop-load / attempt-001 | page.cls | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| ketch-desktop-load / attempt-001 | page.cls | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| ketch-desktop-load / attempt-001 | page.primary-content-paint | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| ketch-desktop-load / attempt-001 | page.primary-content-paint | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| ketch-desktop-load / attempt-001 | initial.transfer | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| ketch-desktop-load / attempt-001 | initial.transfer | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| ketch-desktop-load / attempt-001 | initial.transfer | Required metric measurements are missing. |
| ketch-desktop-load / attempt-001 | initial.transfer | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| ketch-desktop-load / attempt-001 | initial.transfer | Fewer than 30 eligible paired metric observations. |
| ketch-desktop-load / attempt-001 | initial.encoded-body | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| ketch-desktop-load / attempt-001 | initial.encoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| ketch-desktop-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| ketch-desktop-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| ketch-desktop-load / attempt-001 | initial.decoded-body | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| ketch-desktop-load / attempt-001 | initial.decoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| ketch-desktop-load / attempt-001 | initial.decoded-body | Required metric measurements are missing. |
| ketch-desktop-load / attempt-001 | initial.decoded-body | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| ketch-desktop-load / attempt-001 | initial.decoded-body | Fewer than 30 eligible paired metric observations. |
| ketch-desktop-load / attempt-001 | initial.long-task-blocking | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| ketch-desktop-load / attempt-001 | initial.long-task-blocking | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| onetrust-desktop-load / attempt-001 | page.lcp | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| onetrust-desktop-load / attempt-001 | page.cls | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| onetrust-desktop-load / attempt-001 | page.primary-content-paint | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| onetrust-desktop-load / attempt-001 | initial.transfer | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| onetrust-desktop-load / attempt-001 | initial.transfer | Required metric measurements are missing. |
| onetrust-desktop-load / attempt-001 | initial.transfer | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| onetrust-desktop-load / attempt-001 | initial.transfer | Fewer than 30 eligible paired metric observations. |
| onetrust-desktop-load / attempt-001 | initial.encoded-body | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| onetrust-desktop-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| onetrust-desktop-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| onetrust-desktop-load / attempt-001 | initial.decoded-body | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| onetrust-desktop-load / attempt-001 | initial.decoded-body | Required metric measurements are missing. |
| onetrust-desktop-load / attempt-001 | initial.decoded-body | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| onetrust-desktop-load / attempt-001 | initial.decoded-body | Fewer than 30 eligible paired metric observations. |
| onetrust-desktop-load / attempt-001 | initial.long-task-blocking | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-desktop-load / attempt-001 | page.lcp | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-desktop-load / attempt-001 | page.cls | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-desktop-load / attempt-001 | page.primary-content-paint | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-desktop-load / attempt-001 | initial.transfer | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-desktop-load / attempt-001 | initial.transfer | Required metric measurements are missing. |
| osano-desktop-load / attempt-001 | initial.transfer | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| osano-desktop-load / attempt-001 | initial.transfer | Fewer than 30 eligible paired metric observations. |
| osano-desktop-load / attempt-001 | initial.encoded-body | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-desktop-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| osano-desktop-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| osano-desktop-load / attempt-001 | initial.decoded-body | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-desktop-load / attempt-001 | initial.decoded-body | Required metric measurements are missing. |
| osano-desktop-load / attempt-001 | initial.decoded-body | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| osano-desktop-load / attempt-001 | initial.decoded-body | Fewer than 30 eligible paired metric observations. |
| osano-desktop-load / attempt-001 | initial.long-task-blocking | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| c15t-nextjs-mobile-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| c15t-nextjs-mobile-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| c15t-nuxt-mobile-load / attempt-001 | page.lcp | One or more recorded metric values are ineligible. |
| c15t-nuxt-mobile-load / attempt-001 | page.lcp | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| c15t-nuxt-mobile-load / attempt-001 | page.lcp | Fewer than 30 eligible paired metric observations. |
| c15t-nuxt-mobile-load / attempt-001 | page.cls | One or more recorded metric values are ineligible. |
| c15t-nuxt-mobile-load / attempt-001 | page.cls | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| c15t-nuxt-mobile-load / attempt-001 | page.cls | Fewer than 30 eligible paired metric observations. |
| c15t-nuxt-mobile-load / attempt-001 | page.primary-content-paint | Required metric measurements are missing. |
| c15t-nuxt-mobile-load / attempt-001 | page.primary-content-paint | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| c15t-nuxt-mobile-load / attempt-001 | page.primary-content-paint | Fewer than 30 eligible paired metric observations. |
| c15t-nuxt-mobile-load / attempt-001 | initial.transfer | Required metric measurements are missing. |
| c15t-nuxt-mobile-load / attempt-001 | initial.transfer | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| c15t-nuxt-mobile-load / attempt-001 | initial.transfer | Fewer than 30 eligible paired metric observations. |
| c15t-nuxt-mobile-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| c15t-nuxt-mobile-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| c15t-nuxt-mobile-load / attempt-001 | initial.decoded-body | Required metric measurements are missing. |
| c15t-nuxt-mobile-load / attempt-001 | initial.decoded-body | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| c15t-nuxt-mobile-load / attempt-001 | initial.decoded-body | Fewer than 30 eligible paired metric observations. |
| c15t-nuxt-mobile-load / attempt-001 | initial.long-task-blocking | One or more recorded metric values are ineligible. |
| c15t-nuxt-mobile-load / attempt-001 | initial.long-task-blocking | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| c15t-nuxt-mobile-load / attempt-001 | initial.long-task-blocking | Fewer than 30 eligible paired metric observations. |
| c15t-astro-mobile-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| c15t-astro-mobile-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| c15t-tanstack-start-mobile-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| c15t-tanstack-start-mobile-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| cookie-control-mobile-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| cookie-control-mobile-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| didomi-mobile-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| didomi-mobile-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| enzuzo-mobile-load / attempt-001 | page.lcp | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| enzuzo-mobile-load / attempt-001 | page.cls | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| enzuzo-mobile-load / attempt-001 | page.primary-content-paint | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| enzuzo-mobile-load / attempt-001 | initial.transfer | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| enzuzo-mobile-load / attempt-001 | initial.encoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| enzuzo-mobile-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| enzuzo-mobile-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| enzuzo-mobile-load / attempt-001 | initial.decoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| enzuzo-mobile-load / attempt-001 | initial.long-task-blocking | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| iubenda-mobile-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| iubenda-mobile-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| ketch-mobile-load / attempt-001 | page.lcp | Measured remote script/style/config response identity is missing or incomplete in one or more attempts. |
| ketch-mobile-load / attempt-001 | page.lcp | One or more recorded metric values are ineligible. |
| ketch-mobile-load / attempt-001 | page.lcp | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| ketch-mobile-load / attempt-001 | page.lcp | Fewer than 30 eligible paired metric observations. |
| ketch-mobile-load / attempt-001 | page.cls | Measured remote script/style/config response identity is missing or incomplete in one or more attempts. |
| ketch-mobile-load / attempt-001 | page.cls | One or more recorded metric values are ineligible. |
| ketch-mobile-load / attempt-001 | page.cls | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| ketch-mobile-load / attempt-001 | page.cls | Fewer than 30 eligible paired metric observations. |
| ketch-mobile-load / attempt-001 | page.primary-content-paint | Measured remote script/style/config response identity is missing or incomplete in one or more attempts. |
| ketch-mobile-load / attempt-001 | page.primary-content-paint | One or more recorded metric values are ineligible. |
| ketch-mobile-load / attempt-001 | page.primary-content-paint | Required metric measurements are missing. |
| ketch-mobile-load / attempt-001 | page.primary-content-paint | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| ketch-mobile-load / attempt-001 | page.primary-content-paint | Fewer than 30 eligible paired metric observations. |
| ketch-mobile-load / attempt-001 | initial.transfer | Measured remote script/style/config response identity is missing or incomplete in one or more attempts. |
| ketch-mobile-load / attempt-001 | initial.transfer | Required metric measurements are missing. |
| ketch-mobile-load / attempt-001 | initial.transfer | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| ketch-mobile-load / attempt-001 | initial.transfer | Fewer than 30 eligible paired metric observations. |
| ketch-mobile-load / attempt-001 | initial.encoded-body | Measured remote script/style/config response identity is missing or incomplete in one or more attempts. |
| ketch-mobile-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| ketch-mobile-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| ketch-mobile-load / attempt-001 | initial.decoded-body | Measured remote script/style/config response identity is missing or incomplete in one or more attempts. |
| ketch-mobile-load / attempt-001 | initial.decoded-body | Required metric measurements are missing. |
| ketch-mobile-load / attempt-001 | initial.decoded-body | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| ketch-mobile-load / attempt-001 | initial.decoded-body | Fewer than 30 eligible paired metric observations. |
| ketch-mobile-load / attempt-001 | initial.long-task-blocking | Measured remote script/style/config response identity is missing or incomplete in one or more attempts. |
| ketch-mobile-load / attempt-001 | initial.long-task-blocking | One or more recorded metric values are ineligible. |
| ketch-mobile-load / attempt-001 | initial.long-task-blocking | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| ketch-mobile-load / attempt-001 | initial.long-task-blocking | Fewer than 30 eligible paired metric observations. |
| onetrust-mobile-load / attempt-001 | page.lcp | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| onetrust-mobile-load / attempt-001 | page.lcp | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| onetrust-mobile-load / attempt-001 | page.lcp | One or more recorded metric values are ineligible. |
| onetrust-mobile-load / attempt-001 | page.lcp | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| onetrust-mobile-load / attempt-001 | page.lcp | Fewer than 30 eligible paired metric observations. |
| onetrust-mobile-load / attempt-001 | page.cls | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| onetrust-mobile-load / attempt-001 | page.cls | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| onetrust-mobile-load / attempt-001 | page.cls | One or more recorded metric values are ineligible. |
| onetrust-mobile-load / attempt-001 | page.cls | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| onetrust-mobile-load / attempt-001 | page.cls | Fewer than 30 eligible paired metric observations. |
| onetrust-mobile-load / attempt-001 | page.primary-content-paint | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| onetrust-mobile-load / attempt-001 | page.primary-content-paint | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| onetrust-mobile-load / attempt-001 | page.primary-content-paint | One or more recorded metric values are ineligible. |
| onetrust-mobile-load / attempt-001 | page.primary-content-paint | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| onetrust-mobile-load / attempt-001 | page.primary-content-paint | Fewer than 30 eligible paired metric observations. |
| onetrust-mobile-load / attempt-001 | initial.transfer | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| onetrust-mobile-load / attempt-001 | initial.transfer | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| onetrust-mobile-load / attempt-001 | initial.transfer | One or more recorded metric values are ineligible. |
| onetrust-mobile-load / attempt-001 | initial.transfer | Required metric measurements are missing. |
| onetrust-mobile-load / attempt-001 | initial.transfer | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| onetrust-mobile-load / attempt-001 | initial.transfer | Fewer than 30 eligible paired metric observations. |
| onetrust-mobile-load / attempt-001 | initial.encoded-body | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| onetrust-mobile-load / attempt-001 | initial.encoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| onetrust-mobile-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| onetrust-mobile-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| onetrust-mobile-load / attempt-001 | initial.decoded-body | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| onetrust-mobile-load / attempt-001 | initial.decoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| onetrust-mobile-load / attempt-001 | initial.decoded-body | One or more recorded metric values are ineligible. |
| onetrust-mobile-load / attempt-001 | initial.decoded-body | Required metric measurements are missing. |
| onetrust-mobile-load / attempt-001 | initial.decoded-body | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| onetrust-mobile-load / attempt-001 | initial.decoded-body | Fewer than 30 eligible paired metric observations. |
| onetrust-mobile-load / attempt-001 | initial.long-task-blocking | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| onetrust-mobile-load / attempt-001 | initial.long-task-blocking | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| onetrust-mobile-load / attempt-001 | initial.long-task-blocking | One or more recorded metric values are ineligible. |
| onetrust-mobile-load / attempt-001 | initial.long-task-blocking | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| onetrust-mobile-load / attempt-001 | initial.long-task-blocking | Fewer than 30 eligible paired metric observations. |
| osano-mobile-load / attempt-001 | page.lcp | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-mobile-load / attempt-001 | page.lcp | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| osano-mobile-load / attempt-001 | page.lcp | One or more recorded metric values are ineligible. |
| osano-mobile-load / attempt-001 | page.lcp | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| osano-mobile-load / attempt-001 | page.lcp | Fewer than 30 eligible paired metric observations. |
| osano-mobile-load / attempt-001 | page.cls | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-mobile-load / attempt-001 | page.cls | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| osano-mobile-load / attempt-001 | page.cls | One or more recorded metric values are ineligible. |
| osano-mobile-load / attempt-001 | page.cls | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| osano-mobile-load / attempt-001 | page.cls | Fewer than 30 eligible paired metric observations. |
| osano-mobile-load / attempt-001 | page.primary-content-paint | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-mobile-load / attempt-001 | page.primary-content-paint | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| osano-mobile-load / attempt-001 | page.primary-content-paint | One or more recorded metric values are ineligible. |
| osano-mobile-load / attempt-001 | page.primary-content-paint | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| osano-mobile-load / attempt-001 | page.primary-content-paint | Fewer than 30 eligible paired metric observations. |
| osano-mobile-load / attempt-001 | initial.transfer | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-mobile-load / attempt-001 | initial.transfer | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| osano-mobile-load / attempt-001 | initial.transfer | Required metric measurements are missing. |
| osano-mobile-load / attempt-001 | initial.transfer | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| osano-mobile-load / attempt-001 | initial.transfer | Fewer than 30 eligible paired metric observations. |
| osano-mobile-load / attempt-001 | initial.encoded-body | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-mobile-load / attempt-001 | initial.encoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| osano-mobile-load / attempt-001 | initial.encoded-body | Required metric measurements are missing. |
| osano-mobile-load / attempt-001 | initial.encoded-body | Fewer than 30 eligible paired metric observations. |
| osano-mobile-load / attempt-001 | initial.decoded-body | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-mobile-load / attempt-001 | initial.decoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| osano-mobile-load / attempt-001 | initial.decoded-body | Required metric measurements are missing. |
| osano-mobile-load / attempt-001 | initial.decoded-body | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| osano-mobile-load / attempt-001 | initial.decoded-body | Fewer than 30 eligible paired metric observations. |
| osano-mobile-load / attempt-001 | initial.long-task-blocking | Remote artifact identity covers captured page-target response bodies only; network coverage is missing or incomplete, so unseen frame or worker assets cannot be qualified. |
| osano-mobile-load / attempt-001 | initial.long-task-blocking | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| osano-mobile-load / attempt-001 | initial.long-task-blocking | One or more recorded metric values are ineligible. |
| osano-mobile-load / attempt-001 | initial.long-task-blocking | Eligible metric observations do not have complete one-to-one pairing within the same run. |
| osano-mobile-load / attempt-001 | initial.long-task-blocking | Fewer than 30 eligible paired metric observations. |

## Withdrawal interpretation

The headless mobile withdrawal check recorded controlled scripts finishing execution after the public consent state showed denial, before the default reload. Both scripts had already been requested before the withdrawal input. This supports a finding about pre-admitted work completing after denial. It does not establish new optional requests after revocation.

| Visit | Request starts before input | Execution after observed denial | Original time origin | New time origin |
| --- | --- | --- | --- | --- |
| Primary | 153.02 and 152.96 ms | 11.80 and 11.90 ms | 1790772459368.6 | 1790772460635.1 |
| Followup | 146.34 and 145.89 ms | 28.30 and 29.10 ms | 1790772464540.5 | 1790772465793.6 |

The new documents and subsequent restoration checks showed rejected consent, empty allowed categories, and no recorded controlled script executions. These findings concern the declared workload in this fixture. They do not certify all trackers or establish a general SDK failure.

The combined raw sample remains failed, with two primary `forbidden-script-execution` failures, two followup `forbidden-script-execution` failures, and `followup:page-unresponsive`. The followup page input was captured in the new document at 337.5 ms, with the pointer handler observation at 338.30 ms. The page handler installation time was not captured, so the separate response failure remains a deployed-fixture observation.

The frozen classifier changes permitted categories at the consent input timestamp. That rule can flag work between pointerdown and actual public denial in other samples. Here, the public state history precedes all four script executions, so this specific finding also survives comparison with observed denial. Future methodology should distinguish pre-admitted work, new request admission, and execution after effective denial. No raw statuses or collector code were changed for this review.

Exact input, state, script, request, unload, navigation, and restoration times are preserved in [withdrawal-review.json (`artifacts/cmp-comparison-2026-09-30/withdrawal-review.json`). The source is the raw check envelope (`artifacts/cmp-comparison-2026-09-30/checks/c15t-headless-mobile-checks/attempt-001/envelope.json`), SHA-256 `ef12978fb3fec28a59dfb7ab78067994963183aa2e25b6c19decc4dec0e678bb`.

## Nuxt and Astro check interpretation

Nuxt mobile's fresh load, returning-accepted and returning-rejected checks retained no public bridge state at the fixed 5,000 ms cutoff. They have empty state histories and no browser errors. All three still had an unfinished 233,312-byte Nuxt module request and an unfinished article image request. These visits remain incomplete with `state-unavailable`; their raw paint observations cannot establish consent correctness.

The fixture initializes its public bridge in Vue's `onMounted` callback and updates it when the public snapshot changes. Separate mobile action visits exposed resolved bridge state around 5,050–5,079 ms. Those different visits show that the integration can become ready after five seconds under this profile. They do not establish an eventual state or exact readiness time for the three load-only visits. The evidence supports a readiness limit within this fixture's declared window, without identifying a package defect or proving that consent never resolves.

Astro's returning-accepted check failed the no-banner contract on both profiles. The desktop visit observed the banner at 53.70 ms and first recorded accepted state at 77.30 ms. The mobile visit observed the banner at 1,312.80 ms and first recorded accepted state at 2,638.90 ms. Both ended with accepted consent and the expected allowed categories. These timestamps establish banner observation before client restoration; their difference is not a measured banner-display duration. The accepted choice was retained, so the failure is presentation on a returning visit, not lost consent.

The Astro fixture uses the package's server integration, `ConsentScript`, stock banner and public client subscription. The package reads consent cookies on the server and conditionally renders its prompt from the server decision. This record does not retain the exact server consent snapshot or incoming cookie value for these visits. It therefore does not establish whether fixture/backend integration or package restoration logic caused the early banner. Keep the deployed-fixture failure without assigning a general SDK cause.

Evidence and source references:

- Extracted observations and envelope hashes (`artifacts/cmp-comparison-2026-09-30/nuxt-astro-review.json`), with immutable sample IDs, raw failures, public states and unfinished requests.
- Nuxt mobile check envelope (`artifacts/cmp-comparison-2026-09-30/checks/c15t-nuxt-mobile-checks/attempt-001/envelope.json`).
- Astro desktop check envelope (`artifacts/cmp-comparison-2026-09-30/checks/c15t-astro-desktop-checks/attempt-001/envelope.json`) and Astro mobile check envelope (`artifacts/cmp-comparison-2026-09-30/checks/c15t-astro-mobile-checks/attempt-001/envelope.json`).
- [Nuxt fixture bridge](../benchmarks/with-c15t-nuxt/app/consent.vue) and [Nuxt mode configuration](../benchmarks/with-c15t-nuxt/nuxt.config.ts).
- [Astro page and client subscription](../benchmarks/with-c15t-astro/src/pages/index.astro) and [Astro configuration](../benchmarks/with-c15t-astro/astro.config.mjs).
- Pinned installed package sources: `@c15t/astro/src/components/prompt.astro`, `@c15t/astro/src/components/consent-script.astro`, and `@c15t/astro/dist/server.js`, including `server_readInitialConsentConfig` and `server_prefetchHosted`. Package verification (`artifacts/cmp-comparison-2026-09-30/local-artifact-verification/verification.json`) records the installed artifacts' identities.

## Didomi restoration readiness

All 30 Didomi mobile repeated-action primaries are incomplete with `restoration-not-ready`. Their reload evidence nevertheless contains the expected accepted, rejected or custom public choice and matching allowed categories, with `state.ready: true`. The separately declared selector `html[data-consent-ready="true"]` did not match. The same mismatch occurs in 28 followup visits; the other two accept followups passed. All 60 visits retained the expected public choice and categories after reload.

This is an inconsistency between the fixture's public bridge and DOM readiness marker. It is not evidence that Didomi lost the saved choice. The frozen readiness contract requires both signals, so the original incomplete statuses, unknown aggregate correctness and excluded metric values remain unchanged. These visits do not supply eligible product-speed conclusions under that contract.

The Didomi adapter reads public SDK status on readiness and consent-change callbacks. Its shared `publish()` writes the normalized state, sets `ready: true` and sets the HTML readiness attribute. React hydration error #418 appears in the 30 affected primaries and 28 affected followups, while the two passing followups lack that error. The retained record does not trace DOM attribute mutations, so this association does not prove which code removed or replaced the marker. A later fixture investigation needs that evidence; it must not relabel the frozen run.

The extracted review (`artifacts/cmp-comparison-2026-09-30/didomi-restoration-review.json`) records all 60 observations, their sample IDs, original failures and the SHA-256 of the original envelope (`artifacts/cmp-comparison-2026-09-30/results/didomi-mobile-actions/attempt-001/envelope.json`). Relevant code is the Didomi callback and shared `publish()` in [competitor.ts](../packages/fixture-support/src/competitor.ts), normalization in [competitor-state.ts](../packages/fixture-support/src/competitor-state.ts), and the selector-plus-state gate in [navigation.ts](../packages/runner/src/navigation.ts). The frozen configuration (`artifacts/cmp-comparison-2026-09-30/inputs/didomi-mobile-actions.json`) declares the HTML readiness selector.

## Original execution exceptions

The original TanStack Start desktop action cohort retained one passed primary visit followed by 29 incomplete primaries with connection refusal on fixture port 4316. The retained lifecycle evidence does not capture a post-readiness server exit or its cause. Treat this as fixture unavailability with unknown cause; the failed visits do not establish product speed or consent behavior. Subsequent Cookie Control work used its own fixture server and did not share that process lifetime. The incident note (`artifacts/cmp-comparison-2026-09-30/tanstack-desktop-actions-unavailability-note.json`) lists every original sample and the execution evidence.

The original Nuxt mobile action entry exceeded its 120-second production build timeout before measurement. It produced no envelope and no samples. Its declared 30 primary visits remain an explicit collection shortfall; they are not 30 failed browser visits and are not silently added to correctness denominators. The execution-error ledger (`artifacts/cmp-comparison-2026-09-30/execution-error-accounting.json`) pins the configuration, command timestamps, logs and missing-envelope path.

Any separately frozen correction is an additional cohort. Keep its entry and run IDs distinct, name the original entry and preserve both stages. A successful correction must not erase the original outage or fill the original stage's sample count retrospectively.

## Enzuzo readiness and viewport limits

The original Enzuzo mobile repeated-action cohort retained 25 incomplete and five passed combined attempts. These outcomes include two separate limitations.

Twenty accept/reject primaries ended with `sample-browser` because the selected native button was outside the viewport at dispatch. Those visits have no completed consent transition or nested probe evidence. A readiness-marker correction does not explain or repair those input failures.

All ten save primaries produced nested probes. Five probes became incomplete during reload verification. Each retained `consent: custom`, allowed category `measurement`, and `state.ready: true`, while `selectorReady` was false for the HTML readiness marker. These five cases match the public-state/DOM-marker inconsistency seen in Didomi. Their saved public choice was present; the frozen readiness contract nevertheless remained unsatisfied. Keep their original incomplete statuses and unknown combined correctness.

The shared adapter publishes Enzuzo's public consent API into the bridge and HTML attribute. The affected probes log React hydration error #418, but the record does not trace attribute removal. A separately declared public-state readiness correction can address this verification contract without attributing its cause or reclassifying the viewport failures. Exact observations and the source envelope hash are in enzuzo-restoration-review.json (`artifacts/cmp-comparison-2026-09-30/enzuzo-restoration-review.json`), linked to the original envelope (`artifacts/cmp-comparison-2026-09-30/results/enzuzo-mobile-actions/attempt-001/envelope.json`). Source references are [the Enzuzo adapter and shared publish function](../packages/fixture-support/src/competitor.ts) and [the restoration readiness gate](../packages/runner/src/navigation.ts).

The viewport errors cannot be assigned to a duplicate adapter target from this evidence. The frozen selectors are native button IDs, and Playwright logs resolve them to `Allow All` and `Decline` buttons. However, the runner selects `.first()` and the retained failed samples contain only the infrastructure failure, without locator counts, DOM snapshots, screenshots, target bounds or measurements. Thus the record cannot rule out duplicate matching IDs, establish persistent configured offscreen placement, or distinguish movement during dispatch. No selector or layout change follows from these logs alone.

The current React mobile withdrawal check retained a failed fixed-offset followup. An earlier validation pass does not establish that this later visit passed. Its recorded primary outcome, restored state and nested page-response failure must be read separately; the report does not infer the cause from the timing result alone.

## Later validation evidence

- Readiness correction checks (`artifacts/cmp-comparison-2026-09-30/readiness-validation.json`). Separate from the original full validation record.
- Artifact loader and reconciliation helper checks (`artifacts/cmp-comparison-2026-09-30/artifact-review-validation.json`). Separate from the original full validation record.

## Validation before collection

The pre-freeze check (`artifacts/benchmark-fixes-2026-09-30/full-check-first.log`) passed lint, 24 workspace typechecks, 176 unit tests and 50 browser tests. Five opt-in competitor startup tests were skipped; this check does not establish completion of that startup suite. The build log (`artifacts/benchmark-fixes-2026-09-30/full-build-first.log`) records 24 successful workspace build tasks.

The post-build provenance check (`artifacts/benchmark-fixes-2026-09-30/provenance-002-changes.json`) found zero changed generated files and zero changed source files. The subsequent lint log (`artifacts/benchmark-fixes-2026-09-30/post-provenance-lint.log`), installed package verification (`artifacts/cmp-comparison-2026-09-30/local-artifact-verification/verification.json`) and independent input preflight (`artifacts/cmp-comparison-2026-09-30/independent-preflight.json`) retain the checks used before collection. These checks establish the recorded local validation scope; they do not convert later benchmark failures into passes.

## Evidence identity

| Entry / attempt | Envelope SHA-256 | Raw envelope |
| --- | --- | --- |
| c15t-script-desktop-load / attempt-001 | e40c36e7b7213d6d5c497f6ac7a97606ad1f8a658e14ff62e9a5bdf40275b24f | `artifacts/cmp-comparison-2026-09-30/results/c15t-script-desktop-load/attempt-001/envelope.json` |
| c15t-headless-desktop-load / attempt-001 | b26ca275a548e14b896fe6ddb05eb66d2aa64623cbf0ade53302b94282be5858 | `artifacts/cmp-comparison-2026-09-30/results/c15t-headless-desktop-load/attempt-001/envelope.json` |
| c15t-react-desktop-load / attempt-001 | ab4dee012398f389ae9f3a323d00af133d0bfc17b08f4777b481736b3d485e12 | `artifacts/cmp-comparison-2026-09-30/results/c15t-react-desktop-load/attempt-001/envelope.json` |
| c15t-nextjs-desktop-load / attempt-001 | 813b01adc1f8e2ca8bbf68f62c32af371776a2616e9d3f0ebaa9312e8d34c679 | `artifacts/cmp-comparison-2026-09-30/results/c15t-nextjs-desktop-load/attempt-001/envelope.json` |
| c15t-vue-desktop-load / attempt-001 | b8df3fce42f6866638d44474d055eec4dac63f579fe11fb0e716a4bc11e892a9 | `artifacts/cmp-comparison-2026-09-30/results/c15t-vue-desktop-load/attempt-001/envelope.json` |
| c15t-nuxt-desktop-load / attempt-001 | 98d44402a787de25ebb1ad5508868b48099afa186ddba16728d96300a7dc9c28 | `artifacts/cmp-comparison-2026-09-30/results/c15t-nuxt-desktop-load/attempt-001/envelope.json` |
| c15t-astro-desktop-load / attempt-001 | 84215b40d2ec222b5125d9abefd60ae52199e1290028dc36ab00883928c42f90 | `artifacts/cmp-comparison-2026-09-30/results/c15t-astro-desktop-load/attempt-001/envelope.json` |
| c15t-tanstack-start-desktop-load / attempt-001 | 3c819ffde109a4eb82416363e71ac6bbdc6ed5bb17a76391cd148169e5707ca7 | `artifacts/cmp-comparison-2026-09-30/results/c15t-tanstack-start-desktop-load/attempt-001/envelope.json` |
| cookie-control-desktop-load / attempt-001 | 671ece2682fc5af93def461abdf357c9cf3324c4186a440855020f009a53bcf4 | `artifacts/cmp-comparison-2026-09-30/results/cookie-control-desktop-load/attempt-001/envelope.json` |
| didomi-desktop-load / attempt-001 | 5f75ddab441201bb1aff8c1d0c14a572c99dbb9d4bd37e76e4a31be2c4974e6c | `artifacts/cmp-comparison-2026-09-30/results/didomi-desktop-load/attempt-001/envelope.json` |
| enzuzo-desktop-load / attempt-001 | 754a1e308c4d6ffda71680891ef637f26f8f690d78a64dc7ed6a5d321ace955c | `artifacts/cmp-comparison-2026-09-30/results/enzuzo-desktop-load/attempt-001/envelope.json` |
| iubenda-desktop-load / attempt-001 | bf4d4e16421fdbc13db96c0249ae4cc8ec6914aceb710e4f0cd37270d210f7c3 | `artifacts/cmp-comparison-2026-09-30/results/iubenda-desktop-load/attempt-001/envelope.json` |
| ketch-desktop-load / attempt-001 | b00db7aeb6fae5ec5dd17796154a767c3aa024b9d4b2058d337e3596abbe0ead | `artifacts/cmp-comparison-2026-09-30/results/ketch-desktop-load/attempt-001/envelope.json` |
| onetrust-desktop-load / attempt-001 | 833a465b149a4b612b8545b5c23ec98a8111207875cb298a92ca40f4ce33b97c | `artifacts/cmp-comparison-2026-09-30/results/onetrust-desktop-load/attempt-001/envelope.json` |
| osano-desktop-load / attempt-001 | 9d723e3da6255c8a3caf84c9a2471d7a3dc41e8efc0193769d840ffc4bf6eeb0 | `artifacts/cmp-comparison-2026-09-30/results/osano-desktop-load/attempt-001/envelope.json` |
| c15t-script-mobile-load / attempt-001 | 55b31d3d5abfeb8e40c1cdb439ef3e25c606296fc5f1b29fbfd1f12c70bc5459 | `artifacts/cmp-comparison-2026-09-30/results/c15t-script-mobile-load/attempt-001/envelope.json` |
| c15t-headless-mobile-load / attempt-001 | ac6cc4abd4745bafa06e4ccc736534c0f3775cfeb71addfea1ff2e83b30c3f19 | `artifacts/cmp-comparison-2026-09-30/results/c15t-headless-mobile-load/attempt-001/envelope.json` |
| c15t-react-mobile-load / attempt-001 | 7de8f2c9554bf118edde3b29d7fc6e5fd8a8f9012203cb8a50bdb1add54bbd35 | `artifacts/cmp-comparison-2026-09-30/results/c15t-react-mobile-load/attempt-001/envelope.json` |
| c15t-nextjs-mobile-load / attempt-001 | a453ddba6a045f5435e3f1856efc230072abba2a136b0bc8f6d3cd37e9b6335c | `artifacts/cmp-comparison-2026-09-30/results/c15t-nextjs-mobile-load/attempt-001/envelope.json` |
| c15t-vue-mobile-load / attempt-001 | 7cc98ae92979a059a0aa2b94320cce87c75d8923d887da95fef35c7c873bd05f | `artifacts/cmp-comparison-2026-09-30/results/c15t-vue-mobile-load/attempt-001/envelope.json` |
| c15t-nuxt-mobile-load / attempt-001 | d8eecefe75ef4e511baf1e454b2f3b28026bf4a62e197b28cf9e02cce5c6e860 | `artifacts/cmp-comparison-2026-09-30/results/c15t-nuxt-mobile-load/attempt-001/envelope.json` |
| c15t-astro-mobile-load / attempt-001 | 73e83ddb07cfc881ba12c32b448f0a72daf3db4743220c3cc228dee8c68bfe9e | `artifacts/cmp-comparison-2026-09-30/results/c15t-astro-mobile-load/attempt-001/envelope.json` |
| c15t-tanstack-start-mobile-load / attempt-001 | 65ca8633a853a41dc21af7fa968dfa59eefd577176e4e3a4070d47a26062e689 | `artifacts/cmp-comparison-2026-09-30/results/c15t-tanstack-start-mobile-load/attempt-001/envelope.json` |
| cookie-control-mobile-load / attempt-001 | 80c7880cfd42a5f0a0234250d3d4230f4c77cb7aaf04e714fc8acbaea0ccbc39 | `artifacts/cmp-comparison-2026-09-30/results/cookie-control-mobile-load/attempt-001/envelope.json` |
| didomi-mobile-load / attempt-001 | 7ede21c9f0d457e56f54c29b0dcdf44e0a4b14a7c946c1192878bf1cab9f1cb7 | `artifacts/cmp-comparison-2026-09-30/results/didomi-mobile-load/attempt-001/envelope.json` |
| enzuzo-mobile-load / attempt-001 | 6adda889cce4d69e3fa9ff4712dcb8a97b31646319aa331305f58feaf3681841 | `artifacts/cmp-comparison-2026-09-30/results/enzuzo-mobile-load/attempt-001/envelope.json` |
| iubenda-mobile-load / attempt-001 | 41cb5d8eb80a420666717c4a5e5275901832da5b64d54005847457f1c48478cb | `artifacts/cmp-comparison-2026-09-30/results/iubenda-mobile-load/attempt-001/envelope.json` |
| ketch-mobile-load / attempt-001 | 44db9b3b2be9ad45da7c1b3db9a39feaa2532f0c0e090ae055fb0192eb14bb1d | `artifacts/cmp-comparison-2026-09-30/results/ketch-mobile-load/attempt-001/envelope.json` |
| onetrust-mobile-load / attempt-001 | 11b0b31cb45eb35b6f0458d3a9313c2d327a9500211a0a22c2d5f0e598f654a3 | `artifacts/cmp-comparison-2026-09-30/results/onetrust-mobile-load/attempt-001/envelope.json` |
| osano-mobile-load / attempt-001 | ae4cc36014e3d9d8539813317d4c92eeb2dac84c5554dbba1f8aade00b3af335 | `artifacts/cmp-comparison-2026-09-30/results/osano-mobile-load/attempt-001/envelope.json` |
| c15t-script-desktop-actions / attempt-001 | 980039a343f4b053571e4981e775ca102edd647171549776cf693713a4c5494b | `artifacts/cmp-comparison-2026-09-30/results/c15t-script-desktop-actions/attempt-001/envelope.json` |
| c15t-headless-desktop-actions / attempt-001 | 01e10e7f9e6b15c7bd59557bd07fb853b37cd9c419ba341ab7c5c93433417b3b | `artifacts/cmp-comparison-2026-09-30/results/c15t-headless-desktop-actions/attempt-001/envelope.json` |
| c15t-react-desktop-actions / attempt-001 | 719139c47b904f37c2a045ed9057cb233350d6646aeb0c96d2c438fe9885b198 | `artifacts/cmp-comparison-2026-09-30/results/c15t-react-desktop-actions/attempt-001/envelope.json` |
| c15t-nextjs-desktop-actions / attempt-001 | 807a78c6fae97ffa46ada2ff2d00241a071db95caeef0a402f7ec09f8bd248cf | `artifacts/cmp-comparison-2026-09-30/results/c15t-nextjs-desktop-actions/attempt-001/envelope.json` |
| c15t-vue-desktop-actions / attempt-001 | b3c156f4c943857f5813b2e11916c4ae86230b5f41d170458c23c3ae396d7bd6 | `artifacts/cmp-comparison-2026-09-30/results/c15t-vue-desktop-actions/attempt-001/envelope.json` |
| c15t-nuxt-desktop-actions / attempt-001 | 7ce988a9cebcf1991723597aaa4e9703ed20c130662c3caada8526b99155f81f | `artifacts/cmp-comparison-2026-09-30/results/c15t-nuxt-desktop-actions/attempt-001/envelope.json` |
| c15t-astro-desktop-actions / attempt-001 | 3e8890104a8fef9c03afd2c10e3bdbd4631dfbde6b3cec1c06b0c8c6a1c0555d | `artifacts/cmp-comparison-2026-09-30/results/c15t-astro-desktop-actions/attempt-001/envelope.json` |
| c15t-tanstack-start-desktop-actions / attempt-001 | e9d96a4967c4541ac785cc52889d23026fd40342e1d02d43525c67c63c294584 | `artifacts/cmp-comparison-2026-09-30/results/c15t-tanstack-start-desktop-actions/attempt-001/envelope.json` |
| cookie-control-desktop-actions / attempt-001 | 3c536225fa5b5983bc95d08a57192cc64b18d3691793ebfc174b5e4c765a97a5 | `artifacts/cmp-comparison-2026-09-30/results/cookie-control-desktop-actions/attempt-001/envelope.json` |
| didomi-desktop-actions / attempt-001 | 3e5232c052f52f2f28a6ce1cb1789bc8f4a39fdf1b9e39e337837d90f75f9758 | `artifacts/cmp-comparison-2026-09-30/results/didomi-desktop-actions/attempt-001/envelope.json` |
| enzuzo-desktop-actions / attempt-001 | 8d0a4cb168da17b7d24440ca39ab9e49850b7ca2a558bd98c9f7d5fc22665ded | `artifacts/cmp-comparison-2026-09-30/results/enzuzo-desktop-actions/attempt-001/envelope.json` |
| iubenda-desktop-actions / attempt-001 | f321330a88f1059aaa38d76e89eb9329a5e41c183f548740eecc7eb6aadc0050 | `artifacts/cmp-comparison-2026-09-30/results/iubenda-desktop-actions/attempt-001/envelope.json` |
| ketch-desktop-actions / attempt-001 | d2ac57190ffa5c3068941fca4ef43fae3419fc1563fd9462ee7db6ac50f05be9 | `artifacts/cmp-comparison-2026-09-30/results/ketch-desktop-actions/attempt-001/envelope.json` |
| onetrust-desktop-actions / attempt-001 | e960488e03439554acd3533b1d619f472ababd716fc89442670695e1748ee519 | `artifacts/cmp-comparison-2026-09-30/results/onetrust-desktop-actions/attempt-001/envelope.json` |
| osano-desktop-actions / attempt-001 | 12c7facac0560611223ce58ed6c1c4bfdd8ac433017d4aa1153f9f9a19f4e0fa | `artifacts/cmp-comparison-2026-09-30/results/osano-desktop-actions/attempt-001/envelope.json` |
| c15t-script-mobile-actions / attempt-001 | 4652861c6d44090c1e63ad36c7810af5848e641ddbe549e17f6d73cc750afefb | `artifacts/cmp-comparison-2026-09-30/results/c15t-script-mobile-actions/attempt-001/envelope.json` |
| c15t-headless-mobile-actions / attempt-001 | 6735fb302a303d2c20fb3b952e914de2d1be8d2406604f0143ba5ad8b987bd70 | `artifacts/cmp-comparison-2026-09-30/results/c15t-headless-mobile-actions/attempt-001/envelope.json` |
| c15t-react-mobile-actions / attempt-001 | 6451050a208c5cf2f54805509a790b70c2c14577002f862500928019972f00db | `artifacts/cmp-comparison-2026-09-30/results/c15t-react-mobile-actions/attempt-001/envelope.json` |
| c15t-nextjs-mobile-actions / attempt-001 | 934d9bb46384602aee5d9d735db6e8cb2cc1d44cd99eb396bfcd66d97a3e2446 | `artifacts/cmp-comparison-2026-09-30/results/c15t-nextjs-mobile-actions/attempt-001/envelope.json` |
| c15t-vue-mobile-actions / attempt-001 | 32d8b00dda8a3f78ddfa02236e5759d63677618fb7e5ad99380181d5c9079f43 | `artifacts/cmp-comparison-2026-09-30/results/c15t-vue-mobile-actions/attempt-001/envelope.json` |
| c15t-astro-mobile-actions / attempt-001 | 360a4ac20a62571bd59e10cdde2fcdde42282214c5f2c50cff2590df6f9130ad | `artifacts/cmp-comparison-2026-09-30/results/c15t-astro-mobile-actions/attempt-001/envelope.json` |
| c15t-tanstack-start-mobile-actions / attempt-001 | 26542090d6a37084edf4347f7d95da7235cd27d6662c3e156ce99ac3fde8cf99 | `artifacts/cmp-comparison-2026-09-30/results/c15t-tanstack-start-mobile-actions/attempt-001/envelope.json` |
| cookie-control-mobile-actions / attempt-001 | b6ed31ad4782920c7517a5ec469e9da84d8cf5bd034897deb5ed3079ce9b79db | `artifacts/cmp-comparison-2026-09-30/results/cookie-control-mobile-actions/attempt-001/envelope.json` |
| didomi-mobile-actions / attempt-001 | f9d2bd980474bfad17e069e19310020290225768445a15a4b99e4b0a3a93045e | `artifacts/cmp-comparison-2026-09-30/results/didomi-mobile-actions/attempt-001/envelope.json` |
| enzuzo-mobile-actions / attempt-001 | e283bf362145b4169d2f843bd31fae8445667b9f328f221e85c9657239e4a217 | `artifacts/cmp-comparison-2026-09-30/results/enzuzo-mobile-actions/attempt-001/envelope.json` |
| iubenda-mobile-actions / attempt-001 | ae07cb21721f84fe7fea26123c7f80d27a325c3bb8d103a184212b6a19edcf1b | `artifacts/cmp-comparison-2026-09-30/results/iubenda-mobile-actions/attempt-001/envelope.json` |
| ketch-mobile-actions / attempt-001 | 7080997a3eb1e8df455507d5df382e13aa5cdee3d617f24657a605e80d245dc1 | `artifacts/cmp-comparison-2026-09-30/results/ketch-mobile-actions/attempt-001/envelope.json` |
| onetrust-mobile-actions / attempt-001 | 987923ea063e293bea07ea60cd2acd72f37ff7d7b2b70d1ac7f9928a2a0550dc | `artifacts/cmp-comparison-2026-09-30/results/onetrust-mobile-actions/attempt-001/envelope.json` |
| osano-mobile-actions / attempt-001 | 4030581085c92238e836fa773c993ebb6f10ada0ef76bf93815e229188fa2d95 | `artifacts/cmp-comparison-2026-09-30/results/osano-mobile-actions/attempt-001/envelope.json` |
| c15t-script-desktop-checks / attempt-001 | 03b924fd7542fb89ddfc07e1472e313fc69a625a19031773dbecd7dc382db81e | `artifacts/cmp-comparison-2026-09-30/checks/c15t-script-desktop-checks/attempt-001/envelope.json` |
| c15t-headless-desktop-checks / attempt-001 | 2ad60904081af684e425c3ae4e119c8ce41ec15ddd0bb560d20cb4a464b5f07c | `artifacts/cmp-comparison-2026-09-30/checks/c15t-headless-desktop-checks/attempt-001/envelope.json` |
| c15t-react-desktop-checks / attempt-001 | 2753416c7cd73e7d2283833d99e1307208736faaa142cc779d2b47a62f941d73 | `artifacts/cmp-comparison-2026-09-30/checks/c15t-react-desktop-checks/attempt-001/envelope.json` |
| c15t-nextjs-desktop-checks / attempt-001 | f440f4815cfe84effb41e98e2ffeaec16e40966eca8e22e97019158f3dcdf4d0 | `artifacts/cmp-comparison-2026-09-30/checks/c15t-nextjs-desktop-checks/attempt-001/envelope.json` |
| c15t-vue-desktop-checks / attempt-001 | 6bd59eda2d5f9f829e35ad4b7895de90b55ff157898b61f6adaab56aff85b780 | `artifacts/cmp-comparison-2026-09-30/checks/c15t-vue-desktop-checks/attempt-001/envelope.json` |
| c15t-nuxt-desktop-checks / attempt-001 | d14c2fd8aa87d60ee508496d2d769fcb79d1717e5d39903c86e6f83558a48b43 | `artifacts/cmp-comparison-2026-09-30/checks/c15t-nuxt-desktop-checks/attempt-001/envelope.json` |
| c15t-astro-desktop-checks / attempt-001 | acbf4bfa402de5d608decf5bdb547a46e00c4b9266cdc29fc01c0cadba1be99b | `artifacts/cmp-comparison-2026-09-30/checks/c15t-astro-desktop-checks/attempt-001/envelope.json` |
| c15t-tanstack-start-desktop-checks / attempt-001 | cff208d028745812a8e8f125b31111631e7a1536981587acb956b7b5d8d4cd96 | `artifacts/cmp-comparison-2026-09-30/checks/c15t-tanstack-start-desktop-checks/attempt-001/envelope.json` |
| cookie-control-desktop-checks / attempt-001 | 47652916299893ce39b764300a27e4b2d6c46f81044867830b9f94c30807e0e6 | `artifacts/cmp-comparison-2026-09-30/checks/cookie-control-desktop-checks/attempt-001/envelope.json` |
| didomi-desktop-checks / attempt-001 | e97bde75bc2714fd2f4ddb5f9ea323aff83487b421693c9c54e48d1b49e9a7c4 | `artifacts/cmp-comparison-2026-09-30/checks/didomi-desktop-checks/attempt-001/envelope.json` |
| enzuzo-desktop-checks / attempt-001 | e09081d3b6ea8cbc284d6d742912c7f0fa5d7c546084581f190ac8fa0a3ed765 | `artifacts/cmp-comparison-2026-09-30/checks/enzuzo-desktop-checks/attempt-001/envelope.json` |
| iubenda-desktop-checks / attempt-001 | 139dcc0d7bc3a939ce77e33cea1f9480f149d35e8748505e3114954a09d309b0 | `artifacts/cmp-comparison-2026-09-30/checks/iubenda-desktop-checks/attempt-001/envelope.json` |
| ketch-desktop-checks / attempt-001 | 82cb4483fa97c21b88833761a7c1b47c18b4a0b170f37e51c8fad8127c4615f1 | `artifacts/cmp-comparison-2026-09-30/checks/ketch-desktop-checks/attempt-001/envelope.json` |
| onetrust-desktop-checks / attempt-001 | 51b1ea0c0351d674ccb5006f2ae57040eb6ae717f9aeaa6ccce2d2a25f8cb8a8 | `artifacts/cmp-comparison-2026-09-30/checks/onetrust-desktop-checks/attempt-001/envelope.json` |
| osano-desktop-checks / attempt-001 | 57be6a5e20f9ab287ee2a0013a6727d21c99d1a331292b2c32d4c5afb9aa6e62 | `artifacts/cmp-comparison-2026-09-30/checks/osano-desktop-checks/attempt-001/envelope.json` |
| c15t-script-mobile-checks / attempt-001 | 93173061264ead6254693bbfa5aedb1eb80e0324e8c7a39354354fb0c20c0226 | `artifacts/cmp-comparison-2026-09-30/checks/c15t-script-mobile-checks/attempt-001/envelope.json` |
| c15t-headless-mobile-checks / attempt-001 | ef12978fb3fec28a59dfb7ab78067994963183aa2e25b6c19decc4dec0e678bb | `artifacts/cmp-comparison-2026-09-30/checks/c15t-headless-mobile-checks/attempt-001/envelope.json` |
| c15t-react-mobile-checks / attempt-001 | c2a26de684a32218762157afe0d7871f7fa1fd3961a9e3edfe55f8a5baf82dd8 | `artifacts/cmp-comparison-2026-09-30/checks/c15t-react-mobile-checks/attempt-001/envelope.json` |
| c15t-nextjs-mobile-checks / attempt-001 | 6b8aea03aae9a5ac762221c12485103fe9cee41223db8161b5330bae7f399a02 | `artifacts/cmp-comparison-2026-09-30/checks/c15t-nextjs-mobile-checks/attempt-001/envelope.json` |
| c15t-vue-mobile-checks / attempt-001 | e84c0050d72cf4c11b3579003e451c99ffd242949295f145fa6a0507f8301b57 | `artifacts/cmp-comparison-2026-09-30/checks/c15t-vue-mobile-checks/attempt-001/envelope.json` |
| c15t-nuxt-mobile-checks / attempt-001 | e29aa2defca65e51a3376fb43f13d7d76bb9a988db1af6447f7ade7ae9713a03 | `artifacts/cmp-comparison-2026-09-30/checks/c15t-nuxt-mobile-checks/attempt-001/envelope.json` |
| c15t-astro-mobile-checks / attempt-001 | 89b70eb7321c395ec41e867387332315fa660a05cef0a09ccbafd566a808e709 | `artifacts/cmp-comparison-2026-09-30/checks/c15t-astro-mobile-checks/attempt-001/envelope.json` |
| c15t-tanstack-start-mobile-checks / attempt-001 | a1b665879e5a41664a1983b840d44f1c6f1bbdff1c056807f618f4bca002d309 | `artifacts/cmp-comparison-2026-09-30/checks/c15t-tanstack-start-mobile-checks/attempt-001/envelope.json` |
| cookie-control-mobile-checks / attempt-001 | 6fd69b0551938077af0f4fcfe76ce753405fca48fbb42b6cb6e378a3c0f0bc46 | `artifacts/cmp-comparison-2026-09-30/checks/cookie-control-mobile-checks/attempt-001/envelope.json` |
| didomi-mobile-checks / attempt-001 | a8676a569f698417ddb208ac8ae0f3410a54723ad8eba2ba4fd41eeba8416aa2 | `artifacts/cmp-comparison-2026-09-30/checks/didomi-mobile-checks/attempt-001/envelope.json` |
| enzuzo-mobile-checks / attempt-001 | 715b98ed23a620e4ba1fa30f9f73233c0253c0cddf677d357c54e997221da1a7 | `artifacts/cmp-comparison-2026-09-30/checks/enzuzo-mobile-checks/attempt-001/envelope.json` |
| iubenda-mobile-checks / attempt-001 | 79874c53e6ec7dd88bee5715fc6ecc2fe44ad07bfff777e9b3667aedcd714af1 | `artifacts/cmp-comparison-2026-09-30/checks/iubenda-mobile-checks/attempt-001/envelope.json` |
| ketch-mobile-checks / attempt-001 | d97bb4fcf9e08e17261df43df22f37d11dc758714a30ede2f713e20d1bdd16df | `artifacts/cmp-comparison-2026-09-30/checks/ketch-mobile-checks/attempt-001/envelope.json` |
| onetrust-mobile-checks / attempt-001 | ce9440440cbf3d12913462385bca47af58e7c80718975abffcd690630705dac4 | `artifacts/cmp-comparison-2026-09-30/checks/onetrust-mobile-checks/attempt-001/envelope.json` |
| osano-mobile-checks / attempt-001 | 6763c9d1c49a3346d88d37c22e007d43169e9a363f106084dcbaf3d55ddae7ea | `artifacts/cmp-comparison-2026-09-30/checks/osano-mobile-checks/attempt-001/envelope.json` |
| nextjs-desktop-overhead / attempt-001 | 892db1f1732a1e3472203de401771122a0b4dbf2786e12a83049308e0054a3d7 | `artifacts/cmp-comparison-2026-09-30/audits/nextjs-desktop-overhead/attempt-001/envelope.json` |
| nextjs-mobile-overhead / attempt-001 | ade7d8d9cefa2545ea06eba90b5713a43df4e583a045f1f8cd81bb2bbac267fc | `artifacts/cmp-comparison-2026-09-30/audits/nextjs-mobile-overhead/attempt-001/envelope.json` |
| c15t-nuxt-mobile-actions-correction-001 / attempt-001 | 0cb058eb490af9cff6425b7af7cf7a63e9720832132795d6e194798fbb01f599 | `artifacts/cmp-comparison-2026-09-30/corrections-001/results/c15t-nuxt-mobile-actions-correction-001/attempt-001/envelope.json` |
| c15t-tanstack-start-desktop-actions-correction-001 / attempt-001 | c27494cbbfb1728b598b6cf1f2098a491a5258a15def013a68a9467c599a6b7f | `artifacts/cmp-comparison-2026-09-30/corrections-001/results/c15t-tanstack-start-desktop-actions-correction-001/attempt-001/envelope.json` |
| didomi-desktop-actions-correction-001 / attempt-001 | 47c7c475260fe134b254a3ef4a01398ff1eb5b26c1968566d565f49be43aa141 | `artifacts/cmp-comparison-2026-09-30/corrections-001/results/didomi-desktop-actions-correction-001/attempt-001/envelope.json` |
| didomi-mobile-actions-correction-001 / attempt-001 | d87f4d2d7a6c94656db50668bd7d13049d2021b476ba51c0fe82b29e6cf2f0ad | `artifacts/cmp-comparison-2026-09-30/corrections-001/results/didomi-mobile-actions-correction-001/attempt-001/envelope.json` |
| enzuzo-desktop-actions-correction-001 / attempt-001 | 0308ea5a1129c84c48075f0f15c1f6e9592f909104ef6980ee67e42d5fbec059 | `artifacts/cmp-comparison-2026-09-30/corrections-001/results/enzuzo-desktop-actions-correction-001/attempt-001/envelope.json` |
| enzuzo-mobile-actions-correction-001 / attempt-001 | 4abf5f01405058a5649910c9aba6fb3e0fdee3ca953a42023603b0a0f2e58f4f | `artifacts/cmp-comparison-2026-09-30/corrections-001/results/enzuzo-mobile-actions-correction-001/attempt-001/envelope.json` |
