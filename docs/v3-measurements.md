# V3 source and competitor measurements

Raw run artifacts are not stored in this repository. The `artifacts/` paths below name files from the original runs and cannot be checked from this checkout.

Historical evidence: the subsequent [browser measurement audit](audit-vitals-actions.md) found timestamp, interaction-attribution, and observation-window defects in this collector. [Current analysis validity rules](../packages/analysis/src/validity.ts) withhold affected comparisons. The tables below preserve the original results and eligibility decisions; they are not a current certification of those measurements. Absolute LCP was nonzero in all 900 selected load observations. Zeroes in the load table are paired differences, and most final LCP candidates were the page heading.

The September 27, 2026 local batch measures eight c15t source integrations and eight configured competitor integrations. It preserves failed and incomplete attempts, the original script/headless fixture confound, and remote identity limitations. CookieYes was excluded at the user's request. These results describe the recorded fixtures and do not establish a public product ranking or field Core Web Vitals.

The c15t source is pinned to [`9993ae57867e33e96783640413a2429b649104c7`](https://github.com/c15t/c15t/tree/9993ae57867e33e96783640413a2429b649104c7). All 14 packages were built from that commit with the pinned Bun version. Separate consumer workspaces verify the exact package bytes and dependency graph. See [source builds](source-build.md) for reproduction and [the earlier published-artifact record](v3-validation.md) for the separate npm alpha.2 checks.

## Conditions and interpretation

Each fresh-load cohort requests 30 baseline/CMP pairs and three excluded warmup pairs. The runner interleaves the two fixtures using seed `20260927`. Full flows use one attempt per declared fixture/scenario cell and no warmups. Separate nested browser attempts measure the page probe after an action. Ordinary probes use 500 ms; `save-page-probe-100ms` is diagnostic. No failure was retried to turn it into a pass.

The machine was an Apple M1 Pro with eight logical CPUs and 16 GiB memory, macOS release `25.6.0`. The profile used Chromium `153.0.8010.12`, Playwright `1.63.0`, Node `24.21.0`, web-vitals `6.2.2`, a 1365 by 768 viewport, device scale factor 1, CPU slowdown 1, locale `en-GB`, zero added network latency, and 12,500,000 bytes/s download and upload limits. The GB region is a declared label; it does not emulate geolocation or guarantee an egress region. Production servers remain shared within each run, while fresh visits use isolated cold browser contexts.

c15t uses a controlled local hosted strict-opt-in backend. Competitors load live remote services from Next client `useEffect` integrations and public consent callbacks. Those integrations are not vendor-default or best-case document-head integrations. OneTrust uses the public `-test` publication, which loaded SDK `202602.1.0`; it does not measure production publication `202604.2.0`. Within-run remote hashes identify observed response bytes, not immutable vendor releases.

Paired deltas compare each candidate with its own framework baseline. Backend topology, server compression, framework initialization, and loading strategy remain part of that fixture. Source HTML and Vite transfer sizes must not be presented as universal SDK package size. Action baselines do not implement a matched ungated script workload, so the action table reports candidate durations without subtraction.

## Evidence and validity review

The original batch index (`artifacts/v3-2026-09-27-pass2/index.json`) contains 35 plan entries and 33 immutable run envelopes. Its commands ran serially from `17:56:22` through `18:45:37 UTC`, with no orchestration errors. This count includes failed and incomplete measurements. Usercentrics' repeated-load entry was blocked by its established configuration problem; CookieYes has an explicit excluded entry.

The original script and headless fixtures inserted their common article and CSS only after CMP-dependent JavaScript initialized. Their baselines started with empty content, while candidates also exposed privacy controls before styling. Both original cohorts reported a paired CLS difference of about `0.92143`. Matching shift geometry and timing, source inspection, and the before/after fixture regression support shared page initialization as the confound. The original raw layout-shift records did not serialize the affected DOM node. These original page-impact comparisons are contaminated and cannot support SDK-impact claims, even though their automated compatibility checks returned `eligible: true`. The corrected fixture renders shared content and styles before CMP initialization and uses revision `3.0.4-source.9993ae57867e`. Original envelopes and computed analyses remain unchanged. The original script flow passed all nine required scenarios and failed its 100 ms save probe with `followup:page-unresponsive`; the original headless flow passed all nine required scenarios and its diagnostic. Corrected full-flow runs have separate identities and do not erase those attempts.

The original network collector also joined CDP and Playwright requests by URL and overwrote encoded-body counts with Playwright size metadata. Same-URL requests could receive another response's digest, and encoded-body totals needed fresh collection even in cohorts without repeated URLs. The first correction reads completed response bodies by exact CDP request ID after the observation window and preserves independently recorded transfer and decoded-byte evidence. It has no Playwright URL or size fallback. Fresh runs under the corrected collectors supply the selected load, banner, and audit tables; the selection history below identifies each stage. Original CDP transfer/decoded-byte observations and non-network timing/consent records remain independently sourced audit evidence.

The replacement batch index (`artifacts/v3-2026-09-27-final/index.json`) records 21 plan entries and 19 envelopes, collected serially from `19:11:09.967` through `19:43:48.748 UTC`. Its protocol executed 1,060 measured top-level attempts, 102 excluded warmup attempts, and 14 separate followup probes. It reran all 15 load cohorts, both audits, and the corrected script/headless full flows. Other original full-flow timing and consent outcomes remain selected because those observations and scenario semantics were unchanged. Their old network-byte and response-identity fields are not promoted.

The original collector hash is `2f50f05bdbdd9eeedd7b341f4e613d0409307e2f9823a80bcfc0a8a9ecb0011e`; the response-identity correction uses `7594c4d8eaad24aa17351adec7b62ac64f7a2ce902904b34d3e0c2cde010fb84`. The exact-body correction uses `23c20f43c1361da063d0bb1806c16022bebc4ef82f083e331eaa8954b79fb2d3`. The final accepted source consumer input hash is `27d9072a1a2dc6bc1310b7c94173f736c3545a1d865af0ed5a36a95f6ff27554`, with consumer lock hash `de640c3fa0d9877f22facc48260be5d304f26833ba298211d27ac92963c390cb`. The frozen input identities (`artifacts/v3-2026-09-27-final/input-identities-final.json`) retain the accepted manifest and 16 configuration hashes.

The append-only initial validity review (`artifacts/v3-2026-09-27-pass2/validity-review-001.json`) records the fixture confound. The second validity review (`artifacts/v3-2026-09-27-pass2/validity-review-002.json`) links all 19 replacements to original run IDs, envelope hashes, and unchanged computed analyses. The selected machine-readable summary (`artifacts/v3-2026-09-27-body-correction/report-final/summary.json`) contains final metric eligibility, counts, and 121 one-attempt action rows with sample IDs. No remote query strings or body hashes were normalized to make a comparison qualify.

The second collector's raw CDP encoded-data sums still could include HTTP framing or be partial. Its four numerical encoded-body comparisons included 12 bytes of consent-init chunk framing and are withheld as strict body-byte results. Its exact response identities and independently recorded timing, transfer, and decoded-byte observations remain valid within their existing eligibility limits. No bytes were subtracted from an old sample.

The exact-body correction batch (`artifacts/v3-2026-09-27-body-correction/index.json`) collected six fresh envelopes from `19:59:29.296` through `20:09:41.824 UTC`: headless, script, React, and Vue load cohorts, plus both audits. It executed 360 measured attempts and 36 excluded warmup attempts. The latest tables select these four loads and two audits, the other 11 load cohorts from the response-identity correction batch, and the existing selected full flows. The append-only third validity review (`artifacts/v3-2026-09-27-body-correction/validity-review-003.json`) records all six replacements and the field-level validity limits of earlier evidence.

The correction is verified against a new benchmark request, not only a synthetic test. Retained consent-init evidence (`artifacts/v3-2026-09-27-body-correction/exact-body-proof.json`) from run `ae540c12-c2bc-4182-b834-266d03f9a680`, sample `227802bf-8a45-46c1-9dfd-b921f2c8e8a8`, records `encodedDataBytes:1684` separately from `encodedBodyBytes:1672` and `decodedBodyBytes:1672`. The new collector preserves the raw transport observation while measuring the body without framing.

## Findings that need context

The source Astro withdrawal failure was an unexpected banner observed in the nested followup attempt at 40.1 ms after navigation. The first accepted-state observation was 73.4 ms, withdrawal input 232.9 ms, effective rejection 240.0 ms, and dismissal 256.7 ms. The banner observation preceded withdrawal. It does not establish a banner persisting after withdrawal, and the stored first-visible timestamp cannot determine the flash duration. The primary withdrawal attempt had no banner observation; consent, dismissal, and persistence checks completed. Other required source Astro scenarios and its 100 ms diagnostic passed. This is separate from the published alpha.2 persistent hidden-style defect.

Enzuzo's preferences attempt stopped at `locator.click: Element is outside of the viewport` for the native `#notificationManagerLink` control. The runner did not issue the preferences input, so that row does not establish a failed native state transition. No selector tuning or retry replaced it.

Civic Cookie Control's configured adapter cannot execute the requested preferences/save protocol. A separate immediate-granular probe in the [adapter inventory](competitor-adapters.md) passed. The unsupported protocol rows do not mean the product lacks granular consent. Ketch qualified only 9 of 30 candidates within the declared 1.5-second load window. The other 21 deadline failures remain in the cohort; its provisional identity and insufficient pairs make the comparisons ineligible, with no confidence interval. Those deadline failures are separate from its unqualified save/preferences/withdraw action adapters. Acceptance, rejection, and returning-visitor flow checks passed. Usercentrics uses the original `NFEcTLx7a` ruleset recovered from `origin/main`, which routed the observed local visit to settings `fDU1kq9HV`. Those settings initialized with `isConsentRequired:false`, no banner, and grants with empty consent history. Bot/geo flags were observed, but the evidence does not isolate a bot-only cause. Its configuration does not qualify this strict-opt-in fixture.

In both the original and final cohorts, Enzuzo's main cookiebar URL returned 30 distinct decoded-body SHA-256 hashes across 30 load samples. Its analytics requests used 30 distinct exact URLs with one response digest. The evidence contains hashes rather than the response texts, so it cannot explain each script change or establish 30 releases. Ketch's SDK script URLs and bytes were stable; its final consent/get responses had 30 distinct body hashes, and 15 completed consent/update responses had 15 distinct hashes. Exact query strings and digests remain unchanged in the diagnostic review (`artifacts/v3-2026-09-27-pass2/diagnostic-review.json`).

Osano's SDK scripts were stable. In the original cohort, all 30 `en-gb.json` XHR records finished with HTTP 200 and JSON byte metadata, but lacked decoded-body hashes. The raw rows stored no specific body-access error. Companion `Other` records do not qualify the XHR records and must not be substituted retrospectively. The later controlled regression confirmed a collector association defect: URL-only matching could attach a Playwright response to the wrong CDP request when both used the same URL. The original Osano identity gap must be read in that context. It is not evidence of failed vendor network delivery or a changed SDK release. The final cohort records a stable exact XHR body hash in all 30 samples, so its LCP, CLS, and transfer comparisons pass the identity gate. Its decoded-body total is still unavailable because the separate OPTIONS rows lack decoded byte counts; those unknown counts are not replaced with zero. The final remote identity review (`artifacts/v3-2026-09-27-final/remote-identity-review.json`) retains exact request methods, URLs, and hashes. Its raw encoded-byte fields remain subject to the third validity review and are not promoted as body sizes.

## Absolute banner visibility

Times are milliseconds from navigation start. These are candidate observations, with no baseline subtraction. Medians and p75 use passed attempts with observed values. Counts distinguish observed values included in the summary, missing values, and failed/incomplete samples.

| Fixture | Median | p75 | Observed / attempts | Missing | Failed | Incomplete |
| --- | --: | --: | --: | --: | --: | --: |
| c15t headless | 54.75 | 54.8 | 30 / 30 | 0 | 0 | 0 |
| c15t script | 88.2 | 88.3 | 30 / 30 | 0 | 0 | 0 |
| c15t React | 137.95 | 138.1 | 30 / 30 | 0 | 0 | 0 |
| c15t Next | 122.75 | 122.9 | 30 / 30 | 0 | 0 | 0 |
| c15t Vue | 71.4 | 71.5 | 30 / 30 | 0 | 0 | 0 |
| c15t Nuxt | 41.1 | 41.7 | 30 / 30 | 0 | 0 | 0 |
| c15t Astro | 40.1 | 40.38 | 30 / 30 | 0 | 0 | 0 |
| c15t TanStack Start | 11.95 | 12.6 | 30 / 30 | 0 | 0 | 0 |
| Civic Cookie Control | 383.35 | 430.68 | 30 / 30 | 0 | 0 | 0 |
| Didomi | 356.2 | 435.4 | 30 / 30 | 0 | 0 | 0 |
| Enzuzo | 272.85 | 289.48 | 30 / 30 | 0 | 0 | 0 |
| iubenda | 339.35 | 389.52 | 30 / 30 | 0 | 0 | 0 |
| Ketch | 1438.8 | 1456.7 | 9 / 30 | 21 | 21 | 0 |
| OneTrust test | 639.35 | 668.7 | 30 / 30 | 0 | 0 | 0 |
| Osano | 564.15 | 622.52 | 30 / 30 | 0 | 0 | 0 |
| Usercentrics | unavailable | unavailable | 0 / 0 | unavailable | unavailable | unavailable |

## Paired page impact

Each cell gives the median candidate-minus-baseline difference, paired 95% bootstrap interval, and valid pair count. LCP uses milliseconds; CLS is unitless. These are local fresh-load observations within a 1500 ms window.

| Fixture | LCP, ms | CLS | Eligibility |
| --- | --- | --- | --- |
| c15t headless | 0 [0, 0]; N=30 | 0 [0, 0]; N=30 | Eligible for this setup |
| c15t script | 0 [0, 0]; N=30 | 0 [0, 0]; N=30 | Eligible for this setup |
| c15t React | 40 [36, 40]; N=30 | 0 [0, 0]; N=30 | Eligible for this setup |
| c15t Next | 8 [8, 12]; N=30 | 0 [0, 0]; N=30 | Eligible for this setup |
| c15t Vue | 32 [32, 36]; N=30 | 0 [0, 0]; N=30 | Eligible for this setup |
| c15t Nuxt | 24 [14, 24]; N=30 | 0 [0, 0]; N=30 | Eligible for this setup |
| c15t Astro | 48 [48, 48]; N=30 | 0 [0, 0]; N=30 | Eligible for this setup |
| c15t TanStack Start | 16 [16, 16]; N=30 | 0 [0, 0]; N=30 | Eligible for this setup |
| Civic Cookie Control | 0 [0, 0]; N=30 | 0 [0, 0]; N=30 | Eligible for this setup |
| Didomi | 0 [0, 0]; N=30 | 0 [0, 0]; N=30 | Eligible for this setup |
| Enzuzo | 0 [0, 0]; N=30 | 0 [0, 0]; N=30 | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| iubenda | 0 [0, 0]; N=30 | 0 [0, 0]; N=30 | Eligible for this setup |
| Ketch | 0 [no CI]; N=9 | 0 [no CI]; N=9 | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional.; The comparison includes failed or incomplete attempts.; Successful samples do not have complete one-to-one pairing within the same run.; Fewer than 30 successful paired samples. |
| OneTrust test | 634 [592, 656]; N=30 | 0 [0, 0]; N=30 | Eligible for this setup |
| Osano | 0 [0, 0]; N=30 | 0 [0, 0]; N=30 | Eligible for this setup |
| Usercentrics | unavailable | unavailable | Original Usercentrics settings initialize with no consent UI, isConsentRequired:false, and empty-history granted services. Bot/geo flags are observed; this configuration does not qualify the strict-opt-in fixture. |

## Paired network impact

Encoded-body totals remain unavailable when exact body-byte evidence is missing. This affects the retained Next, Nuxt, Astro, TanStack Start, and competitor cohorts. HTTP transfer totals still exist but cannot establish body bytes. The missing-count table shows whether each gap affects the baseline, candidate, or both. No fallback fills those gaps. The four numerical encoded-body comparisons below come only from the fresh exact-body collector.

All quantities are bytes. Transfer includes transfer overhead; encoded and decoded body sizes are separate measurements. Each cell gives the paired median difference, 95% interval, and valid N. Eligibility is retained separately for every metric in the machine-readable summary. Local static/Vite transfer sizes reflect the fixture server and compression choices, not universal SDK package sizes.

| Fixture | Transferred | Encoded body | Decoded body |
| --- | --- | --- | --- |
| c15t headless | 207157 [207157, 207157]; N=30 | 206646 [206646, 206646]; N=30 | 206646 [206646, 206646]; N=30 |
| c15t script | 368324 [368324, 368324]; N=30 | 367582 [367582, 367582]; N=30 | 367582 [367582, 367582]; N=30 |
| c15t React | 355519 [355519, 355519]; N=30 | 354316 [354316, 354316]; N=30 | 354316 [354316, 354316]; N=30 |
| c15t Next | 98344 [98344, 98344]; N=30 | unavailable [no CI]; N=0 | 396348 [396348, 396348]; N=30 |
| c15t Vue | 318636 [318636, 318636]; N=30 | 316292 [316292, 316292]; N=30 | 316292 [316292, 316292]; N=30 |
| c15t Nuxt | 668946 [668946, 668946]; N=30 | unavailable [no CI]; N=0 | 564822 [564822, 564822]; N=30 |
| c15t Astro | 340033 [340033, 340033]; N=30 | unavailable [no CI]; N=0 | 337278 [337278, 337278]; N=30 |
| c15t TanStack Start | 111219 [111213, 111219]; N=30 | unavailable [no CI]; N=0 | 410360 [410360, 410360]; N=30 |
| Civic Cookie Control | 98121 [98121, 98128.5]; N=30 | unavailable [no CI]; N=0 | 344599 [344599, 344599]; N=30 |
| Didomi | 251408.5 [251406, 251411.5]; N=30 | unavailable [no CI]; N=0 | 993698 [993698, 993698]; N=30 |
| Enzuzo | 153901 [153876, 154190]; N=30 | unavailable [no CI]; N=0 | 600599 [600599, 600599]; N=30 |
| iubenda | 120629 [120627, 120634]; N=30 | unavailable [no CI]; N=0 | 454236 [454236, 454236]; N=30 |
| Ketch | 525333 [no CI]; N=9 | unavailable [no CI]; N=0 | unavailable [no CI]; N=0 |
| OneTrust test | 205594 [205591, 205634]; N=30 | unavailable [no CI]; N=0 | 820953 [820953, 820953]; N=30 |
| Osano | 84456.5 [84448, 84464]; N=30 | unavailable [no CI]; N=0 | unavailable [no CI]; N=0 |
| Usercentrics | unavailable | unavailable | unavailable |

### Comparison eligibility

The following metric comparisons are ineligible. Every other selected load metric passed the recorded automatic checks for its own setup. Numeric estimates and intervals on ineligible rows are retained as provisional evidence.

| Fixture | Metrics | Reasons |
| --- | --- | --- |
| c15t Next | initial.encoded-body | Required metric measurements are missing.; Fewer than 30 successful paired samples. |
| c15t Nuxt | initial.encoded-body | Required metric measurements are missing.; Successful samples do not have complete one-to-one pairing within the same run.; Fewer than 30 successful paired samples. |
| c15t Astro | initial.encoded-body | Required metric measurements are missing.; Fewer than 30 successful paired samples. |
| c15t TanStack Start | initial.encoded-body | Required metric measurements are missing.; Fewer than 30 successful paired samples. |
| Civic Cookie Control | initial.encoded-body | Required metric measurements are missing.; Fewer than 30 successful paired samples. |
| Didomi | initial.encoded-body | Required metric measurements are missing.; Fewer than 30 successful paired samples. |
| Enzuzo | page.lcp, page.cls, initial.transfer, initial.decoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional. |
| Enzuzo | initial.encoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional.; Required metric measurements are missing.; Fewer than 30 successful paired samples. |
| iubenda | initial.encoded-body | Required metric measurements are missing.; Fewer than 30 successful paired samples. |
| Ketch | page.lcp, page.cls | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional.; The comparison includes failed or incomplete attempts.; Successful samples do not have complete one-to-one pairing within the same run.; Fewer than 30 successful paired samples. |
| Ketch | initial.transfer, initial.decoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional.; The comparison includes failed or incomplete attempts.; Required metric measurements are missing.; Successful samples do not have complete one-to-one pairing within the same run.; Fewer than 30 successful paired samples. |
| Ketch | initial.encoded-body | Observed remote script/style/config URL or decoded-body digest changed within this comparison cell; artifact identity remains provisional.; The comparison includes failed or incomplete attempts.; Required metric measurements are missing.; Fewer than 30 successful paired samples. |
| OneTrust test | initial.encoded-body | Required metric measurements are missing.; Fewer than 30 successful paired samples. |
| Osano | initial.encoded-body | Required metric measurements are missing.; Fewer than 30 successful paired samples. |
| Osano | initial.decoded-body | Required metric measurements are missing.; Successful samples do not have complete one-to-one pairing within the same run.; Fewer than 30 successful paired samples. |

## Failed and missing load observations

Each count is baseline/candidate. Missing counts retain the report definition; failed or incomplete values are excluded from successful-value summaries.

| Fixture | Attempts | Failed | Incomplete | Missing LCP | Missing CLS | Missing transfer | Missing encoded | Missing decoded |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| c15t headless | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| c15t script | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| c15t React | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| c15t Next | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 30/30 | 0/0 |
| c15t Vue | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| c15t Nuxt | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/30 | 0/0 |
| c15t Astro | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 30/30 | 0/0 |
| c15t TanStack Start | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 30/30 | 0/0 |
| Civic Cookie Control | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 30/30 | 0/0 |
| Didomi | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 30/30 | 0/0 |
| Enzuzo | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 30/30 | 0/0 |
| iubenda | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 30/30 | 0/0 |
| Ketch | 30/30 | 0/21 | 0/0 | 0/0 | 0/0 | 0/15 | 30/30 | 0/30 |
| OneTrust test | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 30/30 | 0/0 |
| Osano | 30/30 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 30/30 | 0/30 |
| Usercentrics | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable |

## Full-flow checks

These counts describe one attempt per declared candidate scenario. Required action checks use a 500 ms page probe; the 100 ms save probe is a separate diagnostic. Source Vue, Nuxt, and Astro also declare early acceptance, a larger script workload, and post-dismissal saving.

| Fixture | Required passed / attempted | 100 ms passed / attempted | Recorded failures |
| --- | --- | --- | --- |
| c15t headless | 9/9 | 1/1 | None |
| c15t script | 9/9 | 0/1 | save-page-probe-100ms: followup:page-unresponsive |
| c15t React | 9/9 | 1/1 | None |
| c15t Next | 9/9 | 1/1 | None |
| c15t Vue | 12/12 | 1/1 | None |
| c15t Nuxt | 12/12 | 1/1 | None |
| c15t Astro | 11/12 | 1/1 | withdraw: followup:unexpected-banner |
| c15t TanStack Start | 9/9 | 1/1 | None |
| Civic Cookie Control | 7/9 | 0/1 | save: unsupported-action, followup:unsupported-action; preferences: unsupported-action; save-page-probe-100ms: unsupported-action, followup:unsupported-action |
| Didomi | 9/9 | 1/1 | None |
| Enzuzo | 8/9 | 1/1 | preferences: sample-browser |
| iubenda | 9/9 | 1/1 | None |
| Ketch | 5/9 | 0/1 | load: banner-missing; save: sample-browser; preferences: sample-browser; withdraw: sample-browser; save-page-probe-100ms: sample-browser |
| OneTrust test | 9/9 | 0/1 | save-page-probe-100ms: followup:page-unresponsive |
| Osano | 9/9 | 0/1 | save-page-probe-100ms: followup:page-unresponsive |
| Usercentrics | 0/9 | 0/1 | load: banner-missing; accept: banner-missing, forbidden-script-execution, forbidden-server-egress, followup:banner-missing, followup:forbidden-script-execution, followup:forbidden-server-egress; reject: banner-missing, forbidden-script-execution, forbidden-server-egress, followup:banner-missing, followup:forbidden-script-execution, followup:forbidden-server-egress; save: banner-missing, forbidden-script-execution, forbidden-server-egress, followup:banner-missing, followup:forbidden-script-execution, followup:forbidden-server-egress; preferences: banner-missing, forbidden-script-execution, forbidden-server-egress; withdraw: visitor-preparation; returning-accepted: visitor-preparation; returning-rejected: visitor-preparation; reject-keyboard: banner-missing, forbidden-script-execution, forbidden-server-egress, followup:banner-missing, followup:forbidden-script-execution, followup:forbidden-server-egress; save-page-probe-100ms: banner-missing, forbidden-script-execution, forbidden-server-egress, followup:banner-missing, followup:forbidden-script-execution, followup:forbidden-server-egress |
| cookie-yes-excluded | 0/0 | 0/0 | Excluded at user request. Existing site ID rejects localhost. |

## Instrumentation audit

Full collector minus minimal observation, in milliseconds. Each audit used 30 measured pairs and three excluded warmup pairs. The reference target window was 1000 ms; the source Next baseline target was 1500 ms.

| Baseline | Task duration | Script duration | Layout duration | LCP | Observed window |
| --- | --- | --- | --- | --- | --- |
| reference-overhead | 18.393 [17.76, 19.169]; N=30 | 7.583 [7.392, 7.831]; N=30 | 0.019 [-0.079, 0.116]; N=30 | 4 [0, 4]; N=30 | -1.05 [-1.9, 0.9]; N=30 |
| source-next-overhead | 33.649 [32.738, 35.397]; N=30 | 15.128 [14.707, 15.733]; N=30 | 0.086 [-0.069, 0.203]; N=30 | 4 [0, 4]; N=30 | 0.15 [-0.65, 1.2]; N=30 |

The minimal arm also observes the browser. These deltas estimate additional collector cost over that shared minimum. They do not justify a correction factor or establish cost on CMP action workflows. All audit comparisons passed their recorded eligibility checks.

Absolute primary input-to-next-paint, action-to-effective-consent, dismissal, and followup values appear in [one-attempt action evidence](v3-action-evidence.md). Those values support only their recorded attempts. Missing Event Timing observations may include durations below the reporting threshold and remain missing, never zero.

## Reproduction and storage

Use the [serial batch helper](measurement-batches.md) with the retained plans and accepted source manifests. Every browser command records arguments, timestamps, exit status, stdout/stderr hashes, and an envelope hash. The helper retains failed attempts and writes new attempt directories when resuming interrupted entries. Audit warmup attempts remain in raw diagnostics. Ordinary load warmups execute before collection and never enter measured summaries, but the runner does not retain their individual observations; only their configured counts are recorded.

All 58 original and replacement envelopes passed SHA-256 verification before ingestion into the local disposable `cookiebench_v3_review` database. The first ingestion inserted each run; every retry returned `inserted:false` with the same run ID. The first 52-run ingestion record (`artifacts/v3-2026-09-27-final/ingestion-all-001/index.json`), six-run correction ingestion (`artifacts/v3-2026-09-27-body-correction/ingestion-new-001/index.json`), and 58-run reconciliation (`artifacts/v3-2026-09-27-body-correction/ingestion-reconciliation.json`) preserve the command results and hashes. The database count verification (`artifacts/v3-2026-09-27-body-correction/database-counts.json`) records 2,778 measured top-level samples and 84,100 measurements. Those samples include 49 failed and 11 incomplete attempts. The raw envelopes retain 113 nested followup probes and 36 excluded audit warmup attempts. The 204 ordinary load warmup observations were not retained. This was local review-database ingestion, not a production migration or cutover.

Before the exact-body correction batch, `pnpm check` passed lint, 24 typecheck tasks, 96 unit/integration tests with real PostgreSQL and process cancellation, and all 37 serial browser tests. The production build passed all 24 tasks, and source verification passed. Logs are full checks (`artifacts/validation-2026-09-27/check-exact-body.log`), production build (`artifacts/validation-2026-09-27/build-exact-body.log`), and source verification (`artifacts/validation-2026-09-27/source-verify-exact-body.log`). The before/after collector and fixture regressions preserve the failure demonstrations that prompted the fresh batch.
