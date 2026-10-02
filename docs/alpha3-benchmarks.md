# c15t alpha.3 benchmark results

Report snapshot generated at 2026-09-29T14:15:50.602Z.

Completed plan entries: 32/32. Completed repeated-load cohorts: 16/16. Completed flow cohorts: 16/16. The retained envelopes contain 1292 measured top-level attempts: 1082 passed, 15 failed and 195 incomplete. All 32 planned entries have completed.

Separate nested followup probes total 90: 13 failed, 20 incomplete, 57 passed. Warmups are excluded from all these measured counts.

All eight desktop load cohorts passed every visit. Five mobile load cohorts support paired comparisons; React, Vue and Nuxt mobile each retain 30 incomplete candidate visits for the distinct reasons below. No full-flow cohort passes every required scenario because all sixteen withdrawal attempts remain incomplete.

The fixtures use published npm `3.0.0-alpha.3`, release revision `3.1.1-article-v1`, and the controlled local hosted strict-opt-in backend. These measurements compare each integration with its paired framework baseline. They do not establish a cross-release speedup, a product ranking or field Core Web Vitals.

## Method and evidence

Repeated fresh loads request 30 measured visits per fixture and three excluded warmups, with fixture ordering seeded at 42. Flows request one attempt per declared scenario with no warmups. No failed browser attempt is replaced. The full scenario definitions, package provenance, environment and collector identity remain in each envelope.

The host is Apple M1 Pro, 8 logical CPUs, 16 GiB memory, darwin 25.6.0. Browser 153.0.8010.12, Playwright 1.63.0, Node v24.21.0, web-vitals 6.2.2. Methodology cookiebench-v3.1.0; collector cookiebench-runner-3.1.0. Exact source hashes remain in the envelopes.

Desktop uses a 1365 × 768 viewport, DPR 1, CPU slowdown 1, zero added latency and 12,500,000 B/s upload/download. Mobile uses a 390 × 844 viewport, DPR 3, touch/mobile emulation, CPU slowdown 4, 150 ms added latency, 200,000 B/s download and 93,750 B/s upload. Both use `en-GB`; GB is a declared region label. Fresh-load observation ends after five seconds. Mobile is laboratory emulation, not a physical-device measurement.

The artifact-local headless configuration adds a no-CMP control copied from the script-tag fixture, with a distinct headless baseline ID and matching presentation. Its shared static page, build and server are unchanged. The checked-in headless configuration is unchanged. Declared five-second load windows and each integration's existing 100 ms or 500 ms followup offsets remain unchanged; the report does not combine action timings across those protocols.

Absolute summaries use passed attempts with observed values. Paired differences are the median of candidate-minus-baseline values within matched pairs. A 95% percentile-bootstrap interval uses 2,000 resamples and requires at least 30 successful pairs. A numerical interval does not override failed attempts, missing metrics or other eligibility failures. Missing measurements are not zero.

[Machine-readable summaries](../artifacts/c15t-alpha3-benchmarks-2026-09-29/report-summary.json) preserve metric statuses, missing reasons, all failure records, sample IDs and envelope hashes. [Batch evidence](../artifacts/c15t-alpha3-benchmarks-2026-09-29/) retains commands and immutable attempts.

## Fresh-load LCP

Times are milliseconds from navigation. LCP is the browser-selected largest content candidate, whose element is recorded below. A zero difference means similar observed LCP, not no downloaded code or no CMP work. Counts are baseline/candidate successful observations. The attribution table also covers successful samples only; excluded visits and their raw paint observations are described below.

| Fixture/profile | Baseline median | Candidate median / p75 | Paired difference; 95% interval; N | Observed B / C | Candidate failed / incomplete |
| --- | --: | --: | --- | --- | --- |
| Astro desktop | 76 | 84 / 88 | +8; [+8, +12]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Astro mobile | 2,844 | 4,108 / 4,112 | +1,268; [+1,264, +1,270]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Headless desktop | 76 | 84 / 84 | +8; [+8, +20]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Headless mobile | 2,858 | 4,008 / 4,012 | +1,156; [+1,148, +1,156]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Next.js desktop | 84 | 88 / 88 | 0; [-8, +4]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Next.js mobile | 3,508 | 3,944 / 3,944 | +436; [+432, +436]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Nuxt desktop | 84 | 136 / 136 | +52; [+52, +56]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Nuxt mobile | 3,620 | unavailable / unavailable | unavailable; no interval; N=0; ineligible | 30/30 / 0/30 | 0 / 30 |
| React desktop | 100 | 144 / 144 | +44; [+44, +44]; N=30 | 30/30 / 30/30 | 0 / 0 |
| React mobile | 4,020 | unavailable / unavailable | unavailable; no interval; N=0; ineligible | 30/30 / 0/30 | 0 / 30 |
| Script tag desktop | 64 | 100 / 104 | +36; [+28, +36]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Script tag mobile | 2,860 | 4,660 / 4,660 | +1,800; [+1,798, +1,800]; N=30 | 30/30 / 30/30 | 0 / 0 |
| TanStack Start desktop | 88 | 100 / 100 | +12; [+12, +16]; N=30 | 30/30 / 30/30 | 0 / 0 |
| TanStack Start mobile | 3,392 | 3,812 / 3,823 | +420; [+420, +428]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Vue desktop | 80 | 128 / 144 | +48; [+48, +60]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Vue mobile | 3,426 | unavailable / unavailable | unavailable; no interval; N=0; ineligible | 30/30 / 0/30 | 0 / 30 |

| Fixture/profile | Baseline LCP element counts | Candidate LCP element counts | Attribution missing B / C |
| --- | --- | --- | --- |
| Astro desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0 / 0 |
| Astro mobile | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0 / 0 |
| Headless desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0 / 0 |
| Headless mobile | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0 / 0 |
| Next.js desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0 / 0 |
| Next.js mobile | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0 / 0 |
| Nuxt desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0 / 0 |
| Nuxt mobile | IMG#primary-content content: 30 | unavailable | 0 / 0 |
| React desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0 / 0 |
| React mobile | IMG#primary-content content: 30 | unavailable | 0 / 0 |
| Script tag desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0 / 0 |
| Script tag mobile | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0 / 0 |
| TanStack Start desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0 / 0 |
| TanStack Start mobile | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0 / 0 |
| Vue desktop | IMG#primary-content content: 30 | IMG#primary-content content: 30 | 0 / 0 |
| Vue mobile | IMG#primary-content content: 30 | unavailable | 0 / 0 |

## Layout stability

CLS is a unitless native layout-shift score for the declared observation window. It excludes recent-input shifts and uses the largest session window. These lab observations are not field Core Web Vitals.

| Fixture/profile | Baseline median | Candidate median / p75 | Paired difference; 95% interval; N | Observed B / C |
| --- | --: | --: | --- | --- |
| Astro desktop | 0 | 0 / 0 | 0; [0, 0]; N=30 | 30/30 / 30/30 |
| Astro mobile | 0 | 0 / 0 | 0; [0, 0]; N=30 | 30/30 / 30/30 |
| Headless desktop | 0 | 0 / 0 | 0; [0, 0]; N=30 | 30/30 / 30/30 |
| Headless mobile | 0 | 0 / 0 | 0; [0, 0]; N=30 | 30/30 / 30/30 |
| Next.js desktop | 0 | 0 / 0 | 0; [0, 0]; N=30 | 30/30 / 30/30 |
| Next.js mobile | 0 | 0 / 0 | 0; [0, 0]; N=30 | 30/30 / 30/30 |
| Nuxt desktop | 0 | 0 / 0 | 0; [0, 0]; N=30 | 30/30 / 30/30 |
| Nuxt mobile | 0 | unavailable / unavailable | unavailable; no interval; N=0; ineligible | 30/30 / 0/30 |
| React desktop | 0 | 0 / 0 | 0; [0, 0]; N=30 | 30/30 / 30/30 |
| React mobile | 0 | unavailable / unavailable | unavailable; no interval; N=0; ineligible | 30/30 / 0/30 |
| Script tag desktop | 0 | 0 / 0 | 0; [0, 0]; N=30 | 30/30 / 30/30 |
| Script tag mobile | 0 | 0 / 0 | 0; [0, 0]; N=30 | 30/30 / 30/30 |
| TanStack Start desktop | 0 | 0 / 0 | 0; [0, 0]; N=30 | 30/30 / 30/30 |
| TanStack Start mobile | 0 | 0 / 0 | 0; [0, 0]; N=30 | 30/30 / 30/30 |
| Vue desktop | 0 | 0 / 0 | 0; [0, 0]; N=30 | 30/30 / 30/30 |
| Vue mobile | 0 | unavailable / unavailable | unavailable; no interval; N=0; ineligible | 30/30 / 0/30 |

## Article image and banner

Article image paint uses native Element Timing for `IMG#primary-content`, independently of LCP selection. Banner visibility is the first observed layout-visible frame, not proof of screen presentation or lack of occlusion. Counts and missing values refer to the candidate. Observed counts include only successful samples; missing counts identify unavailable measurements across all attempts. A measured paint excluded by whole-sample status is not a missing paint.

| Fixture/profile | Image paint median B / C | Image paired difference; 95% interval; N | Image observed; missing | Banner median / p75 | Banner observed; missing |
| --- | --: | --- | --- | --: | --- |
| Astro desktop | 76 / 84 | +8; [+8, +12]; N=30 | 30/30; 0 | 40.6 / 40.8 | 30/30; 0 |
| Astro mobile | 2,844 / 4,108 | +1,268; [+1,264, +1,270]; N=30 | 30/30; 0 | 1,296.2 / 1,297.88 | 30/30; 0 |
| Headless desktop | 76 / 84 | +8; [+8, +20]; N=30 | 30/30; 0 | 73.3 / 73.57 | 30/30; 0 |
| Headless mobile | 2,858 / 4,008 | +1,156; [+1,148, +1,156]; N=30 | 30/30; 0 | 2,872 / 2,874.35 | 30/30; 0 |
| Next.js desktop | 84 / 88 | 0; [-8, +4]; N=30 | 30/30; 0 | 125.1 / 125.4 | 30/30; 0 |
| Next.js mobile | 3,508 / 3,944 | +436; [+432, +436]; N=30 | 30/30; 0 | 2,272.3 / 2,274.68 | 30/30; 0 |
| Nuxt desktop | 84 / 136 | +52; [+52, +56]; N=30 | 30/30; 0 | 20.35 / 20.98 | 30/30; 0 |
| Nuxt mobile | 3,620 / unavailable | unavailable; no interval; N=0; ineligible | 0/30; 30 | unavailable / unavailable | 0/30; 0 |
| React desktop | 100 / 144 | +44; [+44, +44]; N=30 | 30/30; 0 | 140.1 / 140.38 | 30/30; 0 |
| React mobile | 4,020 / unavailable | unavailable; no interval; N=0; ineligible | 0/30; 30 | unavailable / unavailable | 0/30; 0 |
| Script tag desktop | 64 / 100 | +36; [+28, +36]; N=30 | 30/30; 0 | 106.8 / 106.98 | 30/30; 0 |
| Script tag mobile | 2,860 / 4,660 | +1,800; [+1,798, +1,800]; N=30 | 30/30; 0 | 4,202.95 / 4,205.63 | 30/30; 0 |
| TanStack Start desktop | 88 / 100 | +12; [+12, +16]; N=30 | 30/30; 0 | 19.35 / 20.38 | 30/30; 0 |
| TanStack Start mobile | 3,392 / 3,812 | +420; [+420, +428]; N=30 | 30/30; 0 | 525.7 / 530.5 | 30/30; 0 |
| Vue desktop | 80 / 128 | +48; [+48, +60]; N=30 | 30/30; 0 | 76.85 / 77.67 | 30/30; 0 |
| Vue mobile | 3,426 / unavailable | unavailable; no interval; N=0; ineligible | 0/30; 0 | unavailable / unavailable | 0/30; 0 |

## Initial network transfer

All quantities are bytes. Transfer includes protocol overhead observed by CDP and depends on the fixture server, compression and framework. It is not SDK package size or physical wire traffic. Encoded-body and decoded-body measurements remain separate in the machine-readable report; missing exact compressed lengths are never filled with transfer bytes.

The [static fixture server](../packages/fixture-support/src/serve.ts) streams application files with Content-Length and no Content-Encoding. Script tag, headless, React and Vue therefore serve their application JavaScript and CSS uncompressed in this run. Shared page text assets separately negotiate Brotli or gzip through [page-assets.ts](../packages/fixture-support/src/page-assets.ts). Native framework servers have their own compression behavior. These bytes and network delays describe the recorded deployments, not optimized-CDN SDK costs or comparable framework package sizes.

| Fixture/profile | Transfer median B / C | Paired difference; 95% interval; N | Transfer observed B / C | Missing transfer B / C |
| --- | --: | --- | --- | --- |
| Astro desktop | 500,138 / 754,411 | +254,273; [+254,273, +254,273]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Astro mobile | 500,138 / 754,411 | +254,273; [+254,273, +254,273]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Headless desktop | 502,298 / 730,934 | +228,636; [+228,636, +228,636]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Headless mobile | 502,298 / 730,934 | +228,636; [+228,636, +228,636]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Next.js desktop | 631,893 / 729,969 | +98,076; [+98,076, +98,076]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Next.js mobile | 631,893 / 729,970 | +98,077; [+98,077, +98,077]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Nuxt desktop | 653,674 / 1,376,067 | +722,393; [+722,393, +722,393]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Nuxt mobile | 653,674 / unavailable | unavailable; no interval; N=0; ineligible | 30/30 / 0/30 | 0 / 30 |
| React desktop | 692,582 / 1,038,784 | +346,202; [+346,202, +346,202]; N=30 | 30/30 / 30/30 | 0 / 0 |
| React mobile | 692,582 / unavailable | unavailable; no interval; N=0; ineligible | 30/30 / 0/30 | 0 / 30 |
| Script tag desktop | 502,298 / 860,879 | +358,581; [+358,581, +358,581]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Script tag mobile | 502,298 / 860,879 | +358,581; [+358,581, +358,581]; N=30 | 30/30 / 30/30 | 0 / 0 |
| TanStack Start desktop | 609,325 / 713,651 | +104,326; [+104,323, +104,326]; N=30 | 30/30 / 30/30 | 0 / 0 |
| TanStack Start mobile | 609,325 / 713,651 | +104,326; [+104,326, +104,326]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Vue desktop | 578,843 / 911,208 | +332,365; [+332,365, +332,365]; N=30 | 30/30 / 30/30 | 0 / 0 |
| Vue mobile | 578,843 / unavailable | unavailable; no interval; N=0; ineligible | 30/30 / 0/30 | 0 / 30 |

## Flow outcomes and action durations

Input-to-next-paint is native Event Timing for the attributed trusted consent interaction, not field INP or a finalized whole-visit INP. It uses 8 ms quantization; entries below 16 ms can be unreportable, so unavailable values are not zero. Consent-effective and dismissal are separate public-state and DOM milestones.

Followup observations come from a separate repeated visit that attempts the page control after the declared offset. Each row retains that offset, the nested probe status and its own input-to-next-paint duration. A failed full probe can still contain a measured page interaction, and a passing probe may have no reportable native timing. No 100 ms and 500 ms observations are pooled. A missing nested probe after an aborted visit is not a pass.

Each action has one candidate attempt per profile. These timings are descriptive observations with no confidence interval or baseline subtraction. Failed and incomplete rows retain their raw observed endpoints, explicitly marked by status; they are excluded from successful summaries. `Unavailable` does not mean immediate completion. The 100 ms save probe is diagnostic and separate from required flows.

| Fixture/profile | Candidate required passed / attempted | Candidate required failed / incomplete | Candidate 100 ms diagnostic status | Baseline passed / failed / incomplete |
| --- | --- | --- | --- | --- |
| Astro desktop | 10 / 12 | 1 / 1 | not declared | 12 / 0 / 0 |
| Astro mobile | 8 / 12 | 1 / 3 | not declared | 3 / 0 / 9 |
| Headless desktop | 5 / 6 | 0 / 1 | passed: 1 | 7 / 0 / 0 |
| Headless mobile | 3 / 6 | 2 / 1 | failed: 1 | 2 / 0 / 5 |
| Next.js desktop | 8 / 9 | 0 / 1 | passed: 1 | 10 / 0 / 0 |
| Next.js mobile | 3 / 9 | 2 / 4 | failed: 1 | 4 / 0 / 6 |
| Nuxt desktop | 11 / 12 | 0 / 1 | not declared | 12 / 0 / 0 |
| Nuxt mobile | 2 / 12 | 0 / 10 | not declared | 3 / 0 / 9 |
| React desktop | 8 / 9 | 0 / 1 | passed: 1 | 10 / 0 / 0 |
| React mobile | 2 / 9 | 2 / 5 | failed: 1 | 4 / 0 / 6 |
| Script tag desktop | 8 / 9 | 0 / 1 | failed: 1 | 10 / 0 / 0 |
| Script tag mobile | 6 / 9 | 2 / 1 | failed: 1 | 4 / 0 / 6 |
| TanStack Start desktop | 8 / 9 | 0 / 1 | passed: 1 | 10 / 0 / 0 |
| TanStack Start mobile | 4 / 9 | 0 / 5 | passed: 1 | 4 / 0 / 6 |
| Vue desktop | 11 / 12 | 0 / 1 | not declared | 12 / 0 / 0 |
| Vue mobile | 0 / 12 | 0 / 12 | not declared | 3 / 0 / 9 |

### Desktop action observations

| Fixture | Scenario | Status | Input to next paint, ms | Consent effective, ms | Dismissed, ms | Followup offset: status; next paint | Failure codes |
| --- | --- | --- | --: | --: | --: | --- | --- |
| Astro | accept | passed | 40 | 42.2 | 42.2 | 100 ms: passed; 16 ms | none |
| Astro | reject | passed | 32 | 30.5 | 30.5 | 100 ms: passed; 16 ms | none |
| Astro | save | passed | 16 | 11.7 | 11.7 | 100 ms: passed; 16 ms | none |
| Astro | preferences | passed | 40 | unavailable | 60.5 | not scheduled | none |
| Astro | withdraw | incomplete | unavailable | unavailable | unavailable | 100 ms: not retained | sample-browser |
| Astro | accept-early | passed | 40 | 32.8 | 32.8 | 100 ms: passed; 16 ms | none |
| Astro | reject-keyboard | passed | unavailable | 5.6 | 5.6 | 100 ms: passed; 16 ms | none |
| Astro | accept-large | passed | 32 | 32.1 | 32.1 | 100 ms: passed; 16 ms | none |
| Astro | save-post-dismissal | passed | 16 | 10.8 | 10.8 | 500 ms: passed; 16 ms | none |
| Headless | accept | passed | 48 | 46.1 | 46.1 | 500 ms: passed; 16 ms | none |
| Headless | reject | passed | 32 | 27.4 | 27.4 | 500 ms: passed; unavailable | none |
| Headless | save | passed | 16 | 11.2 | 11.2 | 500 ms: passed; unavailable | none |
| Headless | preferences | passed | 32 | unavailable | unavailable | not scheduled | none |
| Headless | withdraw | incomplete | unavailable | unavailable | unavailable | 500 ms: not retained | sample-browser |
| Headless | save-page-probe-100ms | passed | 16 | 13.7 | 13.7 | 100 ms: passed; 16 ms | none |
| Next.js | accept | passed | 48 | 40.2 | 40.2 | 500 ms: passed; unavailable | none |
| Next.js | reject | passed | 32 | 31.7 | 31.7 | 500 ms: passed; 16 ms | none |
| Next.js | save | passed | 16 | 10.9 | 10.9 | 500 ms: passed; unavailable | none |
| Next.js | preferences | passed | 56 | unavailable | unavailable | not scheduled | none |
| Next.js | withdraw | incomplete | unavailable | unavailable | unavailable | 500 ms: not retained | sample-browser |
| Next.js | reject-keyboard | passed | 16 | 17.6 | 17.6 | 500 ms: passed; 16 ms | none |
| Next.js | save-page-probe-100ms | passed | 16 | 10.3 | 10.3 | 100 ms: passed; 16 ms | none |
| Nuxt | accept | passed | 40 | 32.8 | 104.5 | 100 ms: passed; 32 ms | none |
| Nuxt | reject | passed | 48 | 44.2 | 115.2 | 100 ms: passed; 32 ms | none |
| Nuxt | save | passed | 16 | 10.3 | 10.3 | 100 ms: passed; 16 ms | none |
| Nuxt | preferences | passed | 40 | unavailable | unavailable | not scheduled | none |
| Nuxt | withdraw | incomplete | unavailable | unavailable | unavailable | 100 ms: not retained | sample-browser |
| Nuxt | accept-early | passed | 48 | 46.6 | 132.2 | 100 ms: passed; 32 ms | none |
| Nuxt | reject-keyboard | passed | 24 | 5.4 | 106 | 100 ms: passed; 16 ms | none |
| Nuxt | accept-large | passed | 40 | 36.9 | 111.8 | 100 ms: passed; 32 ms | none |
| Nuxt | save-post-dismissal | passed | 16 | 12.3 | 12.3 | 500 ms: passed; unavailable | none |
| React | accept | passed | 48 | 39.3 | 39.3 | 500 ms: passed; unavailable | none |
| React | reject | passed | 32 | 29.7 | 29.7 | 500 ms: passed; unavailable | none |
| React | save | passed | 16 | 11.5 | 11.5 | 500 ms: passed; 16 ms | none |
| React | preferences | passed | 56 | unavailable | unavailable | not scheduled | none |
| React | withdraw | incomplete | unavailable | unavailable | unavailable | 500 ms: not retained | sample-browser |
| React | reject-keyboard | passed | 16 | 15.4 | 15.4 | 500 ms: passed; 16 ms | none |
| React | save-page-probe-100ms | passed | 16 | 10.6 | 10.6 | 100 ms: passed; 16 ms | none |
| Script tag | accept | passed | 48 | 38.5 | 62.2 | 500 ms: passed; unavailable | none |
| Script tag | reject | passed | 48 | 42.9 | 66.6 | 500 ms: passed; unavailable | none |
| Script tag | save | passed | 48 | 9.4 | 159.4 | 500 ms: passed; 16 ms | none |
| Script tag | preferences | passed | 72 | unavailable | unavailable | not scheduled | none |
| Script tag | withdraw | incomplete | unavailable | unavailable | unavailable | 500 ms: not retained | sample-browser |
| Script tag | reject-keyboard | passed | 16 | 2.4 | 66.9 | 500 ms: passed; unavailable | none |
| Script tag | save-page-probe-100ms | failed | 48 | 10 | 160 | 100 ms: failed; unavailable | followup:page-unresponsive |
| TanStack Start | accept | passed | 32 | 33.7 | 33.7 | 500 ms: passed; 16 ms | none |
| TanStack Start | reject | passed | 32 | 28.7 | 28.7 | 500 ms: passed; 16 ms | none |
| TanStack Start | save | passed | 16 | 9.4 | 9.4 | 500 ms: passed; 16 ms | none |
| TanStack Start | preferences | passed | 40 | unavailable | 38.9 | not scheduled | none |
| TanStack Start | withdraw | incomplete | unavailable | unavailable | unavailable | 500 ms: not retained | sample-browser |
| TanStack Start | reject-keyboard | passed | 24 | 9.1 | 9.1 | 500 ms: passed; unavailable | none |
| TanStack Start | save-page-probe-100ms | passed | 16 | 8.7 | 8.7 | 100 ms: passed; 16 ms | none |
| Vue | accept | passed | 40 | 31.3 | 31.3 | 100 ms: passed; 16 ms | none |
| Vue | reject | passed | 48 | 47.2 | 47.2 | 100 ms: passed; 16 ms | none |
| Vue | save | passed | 16 | 11.4 | 11.4 | 100 ms: passed; 16 ms | none |
| Vue | preferences | passed | 32 | unavailable | 35 | not scheduled | none |
| Vue | withdraw | incomplete | unavailable | unavailable | unavailable | 100 ms: not retained | sample-browser |
| Vue | accept-early | passed | 40 | 39.2 | 39.2 | 100 ms: passed; 16 ms | none |
| Vue | reject-keyboard | passed | 24 | 10.1 | 10.1 | 100 ms: passed; 16 ms | none |
| Vue | accept-large | passed | 40 | 36.7 | 36.7 | 100 ms: passed; 16 ms | none |
| Vue | save-post-dismissal | passed | 16 | 10.2 | 10.2 | 500 ms: passed; unavailable | none |

### Mobile action observations

| Fixture | Scenario | Status | Input to next paint, ms | Consent effective, ms | Dismissed, ms | Followup offset: status; next paint | Failure codes |
| --- | --- | --- | --: | --: | --: | --- | --- |
| Astro | accept | passed | 48 | 47.3 | 47.3 | 100 ms: passed; unavailable | none |
| Astro | reject | passed | 40 | 38.4 | 38.4 | 100 ms: passed; 16 ms | none |
| Astro | save | passed | 16 | 16.1 | 16.1 | 100 ms: passed; 16 ms | none |
| Astro | preferences | incomplete | 40 | unavailable | 830.4 | not scheduled | observation-window-exceeded |
| Astro | withdraw | incomplete | unavailable | unavailable | unavailable | 100 ms: not retained | sample-browser |
| Astro | accept-early | passed | 48 | 45.9 | 45.9 | 100 ms: passed; 16 ms | none |
| Astro | reject-keyboard | passed | unavailable | 8 | 8 | 100 ms: passed; unavailable | none |
| Astro | accept-large | incomplete | 56 | 58 | 58 | 100 ms: incomplete; unavailable | required-measurement-unavailable; followup:required-measurement-unavailable |
| Astro | save-post-dismissal | passed | 24 | 18.4 | 18.4 | 500 ms: passed; 16 ms | none |
| Headless | accept | failed | 48 | 45 | 45 | 500 ms: failed; unavailable | choice-lost-on-reload; followup:choice-lost-on-reload |
| Headless | reject | passed | 48 | 46.5 | 46.5 | 500 ms: passed; unavailable | none |
| Headless | save | failed | 16 | 11.4 | 11.4 | 500 ms: failed; 16 ms | choice-lost-on-reload; followup:choice-lost-on-reload |
| Headless | preferences | passed | 48 | unavailable | unavailable | not scheduled | none |
| Headless | withdraw | incomplete | unavailable | unavailable | unavailable | 500 ms: not retained | sample-browser |
| Headless | save-page-probe-100ms | failed | 16 | 9.5 | 9.5 | 100 ms: failed; 16 ms | choice-lost-on-reload; followup:choice-lost-on-reload |
| Next.js | accept | failed | 56 | 57.4 | 57.4 | 500 ms: failed; 16 ms | choice-lost-on-reload; followup:choice-lost-on-reload |
| Next.js | reject | incomplete | 56 | 47.2 | 47.2 | 500 ms: incomplete; unavailable | required-measurement-unavailable; followup:required-measurement-unavailable |
| Next.js | save | failed | 24 | 14.7 | 14.7 | 500 ms: failed; unavailable | choice-lost-on-reload; followup:choice-lost-on-reload |
| Next.js | preferences | incomplete | 64 | unavailable | 50.2 | not scheduled | required-measurement-unavailable |
| Next.js | withdraw | incomplete | unavailable | unavailable | unavailable | 500 ms: not retained | sample-browser |
| Next.js | reject-keyboard | incomplete | 16 | 11.8 | 11.8 | 500 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| Next.js | save-page-probe-100ms | failed | 24 | 18.2 | 18.2 | 100 ms: failed; 16 ms | choice-lost-on-reload; followup:choice-lost-on-reload |
| Nuxt | accept | incomplete | 48 | 45.8 | 126 | 100 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| Nuxt | reject | incomplete | 48 | 48.5 | 134.2 | 100 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| Nuxt | save | passed | 16 | 13.6 | 13.6 | 100 ms: passed; 16 ms | none |
| Nuxt | preferences | incomplete | 48 | unavailable | 128.7 | not scheduled | required-measurement-unavailable |
| Nuxt | withdraw | incomplete | unavailable | unavailable | unavailable | 100 ms: not retained | sample-browser |
| Nuxt | accept-early | incomplete | 48 | 48.8 | 122.5 | 100 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| Nuxt | reject-keyboard | incomplete | 16 | 13.6 | 97.4 | 100 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| Nuxt | accept-large | incomplete | 56 | 57.4 | 140.1 | 100 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| Nuxt | save-post-dismissal | passed | 16 | 13.3 | 13.3 | 500 ms: passed; unavailable | none |
| React | accept | failed | 56 | 44.4 | 44.4 | 500 ms: failed; 16 ms | choice-lost-on-reload; followup:choice-lost-on-reload |
| React | reject | incomplete | 48 | 45.9 | 45.9 | 500 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| React | save | failed | 16 | 14 | 14 | 500 ms: failed; 16 ms | choice-lost-on-reload; followup:choice-lost-on-reload |
| React | preferences | incomplete | 56 | unavailable | 40.3 | not scheduled | required-measurement-unavailable |
| React | withdraw | incomplete | unavailable | unavailable | unavailable | 500 ms: not retained | sample-browser |
| React | reject-keyboard | incomplete | unavailable | 10 | 10 | 500 ms: incomplete; unavailable | required-measurement-unavailable; followup:required-measurement-unavailable |
| React | save-page-probe-100ms | failed | 16 | 15.5 | 15.5 | 100 ms: failed; 16 ms | choice-lost-on-reload; followup:choice-lost-on-reload |
| Script tag | accept | failed | 56 | 46 | 74.8 | 500 ms: failed; unavailable | choice-lost-on-reload; followup:choice-lost-on-reload |
| Script tag | reject | passed | 56 | 43.6 | 74 | 500 ms: passed; 16 ms | none |
| Script tag | save | failed | 32 | 13.5 | 162.4 | 500 ms: failed; 16 ms | choice-lost-on-reload; followup:choice-lost-on-reload |
| Script tag | preferences | passed | 64 | unavailable | unavailable | not scheduled | none |
| Script tag | withdraw | incomplete | unavailable | unavailable | unavailable | 500 ms: not retained | sample-browser |
| Script tag | reject-keyboard | passed | 16 | 8.8 | 92.6 | 500 ms: passed; 16 ms | none |
| Script tag | save-page-probe-100ms | failed | 16 | 12.6 | 167.1 | 100 ms: failed; unavailable | choice-lost-on-reload; followup:page-unresponsive; followup:choice-lost-on-reload |
| TanStack Start | accept | incomplete | 48 | 48.8 | 48.8 | 500 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| TanStack Start | reject | incomplete | 48 | 50.1 | 50.1 | 500 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| TanStack Start | save | passed | 32 | 15.6 | 15.6 | 500 ms: passed; 16 ms | none |
| TanStack Start | preferences | incomplete | 48 | unavailable | 50.3 | not scheduled | required-measurement-unavailable |
| TanStack Start | withdraw | incomplete | unavailable | unavailable | unavailable | 500 ms: not retained | sample-browser |
| TanStack Start | reject-keyboard | incomplete | 16 | 13.1 | 13.1 | 500 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| TanStack Start | save-page-probe-100ms | passed | 16 | 14.2 | 14.2 | 100 ms: passed; 16 ms | none |
| Vue | accept | incomplete | 48 | 43.9 | 43.9 | 100 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| Vue | reject | incomplete | 48 | 46.8 | 46.8 | 100 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| Vue | save | incomplete | 16 | 12 | 12 | 100 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| Vue | preferences | incomplete | 48 | unavailable | 45.2 | not scheduled | required-measurement-unavailable |
| Vue | withdraw | incomplete | unavailable | unavailable | unavailable | 100 ms: not retained | sample-browser |
| Vue | accept-early | incomplete | 48 | 44.8 | 44.8 | 100 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| Vue | reject-keyboard | incomplete | 16 | 16 | 16 | 100 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| Vue | accept-large | incomplete | 56 | 52.1 | 52.1 | 100 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |
| Vue | save-post-dismissal | incomplete | 16 | 11.8 | 11.8 | 500 ms: incomplete; 16 ms | required-measurement-unavailable; followup:required-measurement-unavailable |

## Flow failures and collection limits

Withdrawal timed out with sample-browser in 16 of 16 recorded candidate withdrawal attempts. Alpha.3 reloads the document after revoking consent, while this collector keeps its action observer in the old document. These attempts retain no valid withdrawal endpoint and do not establish that revocation failed. The earlier [functional navigation checks](alpha3-upgrade.md) verified rejected consent and blocked optional execution after reload for script tag and React only; they do not replace these failures or certify every integration.

Astro recorded an initial unexpected banner in 2 returning-accepted visits. The [alpha.3 investigation](alpha3-upgrade.md) reproduced an SSR category mismatch: the server kernel omits the configured consent categories while the client receives them. The initial banner assertion remains failed. The observed visibility does not establish a persistent banner or its exact flash duration.

The restoration check failed with choice-lost-on-reload in 12 candidate attempts: Headless mobile accept, Headless mobile save, Headless mobile save-page-probe-100ms, Next.js mobile accept, Next.js mobile save, Next.js mobile save-page-probe-100ms, React mobile accept, React mobile save, React mobile save-page-probe-100ms, Script tag mobile accept, Script tag mobile save, Script tag mobile save-page-probe-100ms. This code means the post-reload public state did not match the expected consent and allowed categories within the check. The envelope records persistenceVerified=false but does not retain that restored state, storage records or second-navigation readiness. The check waits only for the consent label and then immediately compares allowed categories. The bridge derives that label from explicit choice, permissions from effective state, and readiness from matched policy resolution. A label can therefore appear before permissions have finished resolving. That is a possible collector readiness race, not an established cause in these visits. The retained evidence cannot distinguish persistent consent loss from unfinished restoration. The failures remain unchanged; correct state before reload does not count as successful restoration.

The flow cohorts also contain 56 unsuccessful baseline attempts. Baseline action rows are coerced to load-only visits with the scenario's observation duration, not matched consent actions. Missing required transfer in these short mobile windows is a baseline measurement limitation, not a candidate consent failure. Per-cell statuses and failure messages remain in the machine-readable report.

Missing required transfer prevents 29 candidate flow attempts from qualifying: Astro mobile 1; Next.js mobile 3; Nuxt mobile 6; React mobile 4; TanStack Start mobile 4; Vue mobile 11. Native click, paint or consent endpoints may still be present in those raw visits. These are whole-sample measurement exclusions, not proof that the consent action failed.

Nuxt mobile additionally has 3 state-unavailable flow visits: load, returning-accepted, returning-rejected. Those visits did not expose the required public state within their windows. Vue mobile has no qualifying full-flow candidate visits: eleven lack required transfer, and withdrawal times out. Neither result establishes that every consent transition is broken.

Astro mobile preferences is incomplete with observation-window-exceeded. Its native input-to-next-paint observation was 40 ms, but preferences visibility was not recorded within the 1,500 ms action window. A later correctness snapshot found the dialog open at 7,697.3 ms, after the 4,182.9 ms measurement deadline. That snapshot establishes eventual observed completion, not the time the dialog opened; it cannot fill the missing preferences-visible duration.

The script-tag 100 ms save probe could not activate the page control on desktop and mobile. Its separate 500 ms save probe recorded a page interaction. On mobile that longer probe still failed the independent restoration check. A measured or attempted page interaction does not turn the entire probe into a pass.

## Incomplete mobile loads

The runner excludes every incomplete sample from successful summaries, even when some paint metrics were recorded. The following observations come from the raw incomplete visits and are not substitute successful medians or paired comparisons.

React mobile has 30 incomplete candidate visits, all with required-measurement-unavailable. In every visit, courtyard.png was unfinished at the five-second cutoff, native article-image Element Timing was unavailable, and initial transfer was unavailable because response collection was incomplete. Native bounded LCP was still measured in all 30 visits and selected a paragraph. That earlier paragraph paint is not article-image delivery and is not evidence of a faster candidate. Banner visibility was observed in all 30 visits.

Vue mobile also has 30 incomplete candidate visits with required-measurement-unavailable, but its article image painted in every visit and all 30 LCP observations selected IMG#primary-content. The missing required metric was initial transfer. Four dialog assets remained unfinished in every visit: manager-Cqa_aIVO.js, switch-Bu3UzxAr.js, switch-HDgm_oaQ.css and manager-VgfX-4gJ.css. Whole-sample eligibility excludes these otherwise observed paints because response collection was incomplete; this does not establish a missing image or failed consent transition.

Nuxt mobile has 30 incomplete candidate visits with state-unavailable. The banner and bounded LCP were observed in every visit, but public consent state and controlled markers were not available within the cutoff. The client files _nuxt/D7SvPq_y.js and _nuxt/mWF5Ao4V.js, plus courtyard.png, were unfinished in all 30 visits. Article-image Element Timing was unavailable; LCP selected a paragraph. A visible server-rendered banner does not establish client readiness. This differs from Vue, where the image painted and secondary assets prevented a complete transfer total.

## Comparison limits and failures

- Next.js desktop, initial.encoded-body: Required metric measurements are missing. Fewer than 30 successful paired samples.
- Next.js mobile, initial.encoded-body: Required metric measurements are missing. Fewer than 30 successful paired samples.
- Nuxt desktop, initial.encoded-body: Required metric measurements are missing. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- Nuxt mobile, page.lcp: The comparison includes failed or incomplete attempts. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- Nuxt mobile, page.cls: The comparison includes failed or incomplete attempts. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- Nuxt mobile, page.primary-content-paint: The comparison includes failed or incomplete attempts. Required metric measurements are missing. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- Nuxt mobile, initial.transfer: The comparison includes failed or incomplete attempts. Required metric measurements are missing. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- Nuxt mobile, initial.encoded-body: The comparison includes failed or incomplete attempts. Required metric measurements are missing. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- Nuxt mobile, initial.decoded-body: The comparison includes failed or incomplete attempts. Required metric measurements are missing. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- React mobile, page.lcp: The comparison includes failed or incomplete attempts. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- React mobile, page.cls: The comparison includes failed or incomplete attempts. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- React mobile, page.primary-content-paint: The comparison includes failed or incomplete attempts. Required metric measurements are missing. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- React mobile, initial.transfer: The comparison includes failed or incomplete attempts. Required metric measurements are missing. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- React mobile, initial.encoded-body: The comparison includes failed or incomplete attempts. Required metric measurements are missing. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- React mobile, initial.decoded-body: The comparison includes failed or incomplete attempts. Required metric measurements are missing. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- TanStack Start desktop, initial.encoded-body: Required metric measurements are missing. Fewer than 30 successful paired samples.
- TanStack Start mobile, initial.encoded-body: Required metric measurements are missing. Fewer than 30 successful paired samples.
- Vue mobile, page.lcp: The comparison includes failed or incomplete attempts. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- Vue mobile, page.cls: The comparison includes failed or incomplete attempts. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- Vue mobile, page.primary-content-paint: The comparison includes failed or incomplete attempts. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- Vue mobile, initial.transfer: The comparison includes failed or incomplete attempts. Required metric measurements are missing. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- Vue mobile, initial.encoded-body: The comparison includes failed or incomplete attempts. Required metric measurements are missing. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.
- Vue mobile, initial.decoded-body: The comparison includes failed or incomplete attempts. Required metric measurements are missing. Successful samples do not have complete one-to-one pairing within the same run. Fewer than 30 successful paired samples.

The September 27 corrected cohorts used a pinned alpha.2 source build. The earlier published alpha.2 checks used the old collector and simpler page workload; current analysis invalidates affected timing metrics. Neither is a matched npm alpha.2 control for this run. Historical values are therefore not subtracted, pooled or presented as a release improvement. See the [measurement audit](measurement-audit.md) and [upgrade record](alpha3-upgrade.md).

## Evidence review and storage

The [independent reconciliation](../artifacts/c15t-alpha3-benchmarks-2026-09-29/independent-final-review.json) passed with no mismatches across 32 envelopes, 1,292 samples, 44,660 measurements, 320 command logs, 96 paired comparisons and 73 bootstrap intervals. It also checked 10,928 network aggregates, 3,924 bounded paint observations, 384 action endpoints and 90 retained nested followup probes.

The [postflight check](../artifacts/c15t-alpha3-benchmarks-2026-09-29/postflight-2026-09-29T12-08-41.345Z.json) confirmed the frozen inputs and collector remained unchanged.

The [database verification](../artifacts/c15t-alpha3-benchmarks-2026-09-29/database-review-001/verification.json) confirms append-only ingestion of 32 new runs, 1,292 samples, 44,660 measurements and 182 capability checks. All 32 identical ingestion retries added nothing. The 97 preexisting runs and all prior rows across 12 checked tables remained unchanged. Stored sample statuses remain 1,082 passed, 15 failed and 195 incomplete.
