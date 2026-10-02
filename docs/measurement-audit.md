# Measurement correctness audit

The audit found collector defects and fixture bias. The independently checked statistics were correct. CookieBench needs to report several distinct measurements, with their limits, rather than turn missing data or a zero paired difference into a performance claim.

The detailed reviews cover [browser vitals and actions](audit-vitals-actions.md), [network evidence and statistics](audit-evidence-statistics.md), and [fixture realism](audit-fixture-realism.md). The replacement checks follow a [declared validation plan](measurement-validation-plan.md).

The results below preserve the September 27 collection and its then-current eligibility policy. The [September 30 comparison](cmp-comparison-2026-09-30.md) uses metric-specific eligibility, independent correctness evidence, stored primary outcomes and compressed static serving. Its measurements are separate; the historical figures below have not been recomputed or relabeled.

Final reconciliation of the September 30 comparison retained 144 paint values with defective cutoff metadata across 72 original visits and followup probes. Every affected value was already excluded by the metric eligibility policy. Runner and methodology 3.2.2 now withhold paint, TTFB and CLS measurements when an action never receives trusted input, while preserving raw diagnostics. The future-run fix passed 12 focused unit tests, two real-browser regressions, runner/schema typechecks and focused lint/format checks. Replaying all 72 affected records withheld the 144 late paint values. No 3.2.2 benchmark cohort was collected, and the original 3.2.0 and correction 3.2.1 envelopes remain unchanged. See the [defect evidence](../artifacts/cmp-comparison-2026-09-30/paint-cutoff-defect-evidence.json) and [fix validation](../artifacts/cmp-comparison-2026-09-30/no-input-window-fix-001/validation.json).

The final [independent review](../artifacts/cmp-comparison-2026-09-30/independent-final-review.json) reconciled all 97 envelopes and the original no-envelope execution error. The [local database verification](../artifacts/cmp-comparison-2026-09-30/database-review-001/verification.json) added 97 runs, verified duplicate retries and preserved all 129 prior runs, leaving 226 runs in total. No run was fabricated for the missing original envelope.

## Findings

| Finding | Consequence | Correction |
| --- | --- | --- |
| DOM milestones used the animation-frame timestamp | A completed action could appear to finish before its input, then become unavailable when subtracting timestamps | Record `performance.now()` at observation; retain frame timestamps only for cadence |
| Event Timing matched only the first input event | A censored pointerdown or keydown could hide a reportable click or keyup | Correlate trusted related input events and native interaction IDs; retain unavailable values below the reporting threshold |
| Action state outlived its declared observation window | Late milestones could enter a bounded result | Freeze state at the input-relative deadline and apply explicit native-entry boundary rules |
| Vitals depended on callback delivery time | In-window native observations delivered later could disappear | Use owned native observers with queue draining and entry-time filtering for bounded FCP, LCP, CLS, and TTFB |
| Whole-visit INP was not finalized | A bounded web-vitals snapshot could be mistaken for a completed visit metric | Keep the snapshot as diagnostics and withhold the INP measurement; report the explicit consent interaction separately |
| Page-only CDP omitted worker requests | A total of observed rows could look complete while traffic was missing | Retain scope and coverage evidence; withhold totals when other browser targets make coverage incomplete |
| Prior invalid measurements could qualify again | An old envelope compared with itself could pass compatibility checks | Add collector-specific validity rules to reusable analysis, preserving the original evidence |
| Batch resume trusted stored hashes | Modified evidence could be reused without detection | Recompute envelope and log digests and verify command, configuration, and checkpoint identity |
| Inline SVG shapes could not become LCP | A small heading painted before most CMP activity and produced many zero deltas | Add a shared external image, native Element Timing, and a useful common page workload |
| Competitor SDK discovery waited for Next hydration | Measurements included a loading delay absent from documented embed placements | Apply verified document placement for five vendors, preserving each public configuration and recording unresolved integrations |

The worker gap was reproduced against server evidence. The stale timestamp and missed keyup regressions reproduced the old failures before the fixes. The original 900 selected absolute load LCP observations were all nonzero. Most selected the page heading; OneTrust selected its consent text. Its LCP difference therefore did not establish an equal delay to article content.

## Metric inventory and interpretation

| Metrics | What they establish | Limit |
| --- | --- | --- |
| `page.lcp`, `page.fcp`, `page.cls` | Native main-document observations within a declared foreground visit window; CLS uses the largest session window and excludes recent-input shifts | Laboratory observations, not field Core Web Vitals; report absolute LCP, paired difference, selected element, and profile together |
| `page.ttfb` | Main-document navigation response start within the declared window | A network-response milestone; it does not depend on foreground paint or establish subsequent CMP cost |
| `page.primary-content-paint` | Native Element Timing render time of the declared article image | An independent content paint, not a replacement definition of LCP |
| `page.lab-inp` | No qualifying finalized value in this collector | Withheld; raw library snapshots are diagnostic only |
| `banner.visible`, `page.primary-visible` | First frame in which the collector observes the declared element's layout visibility | DOM observation, not a screen-presentation or occlusion guarantee |
| `banner.coverage` | Banner bounding-box area within the viewport at first observed visibility | Descriptive; animation and customization affect it, so it earns no score penalty |
| `consent.resolution` | First resolution timestamp supplied by the public adapter | Adapter scheduling is included; not an internal SDK milestone or control readiness |
| `action.input-to-next-paint`, `action.followup-input-to-next-paint` | Native Event Timing duration for the attributed trusted interaction | Quantized and thresholded; missing is not zero. Followup timing comes from a separate attempt and can occur later than its requested offset |
| `action.dismissed`, `action.preferences-visible`, `action.acknowledgement` | Observed UI milestones after the measured input | Dismissal checks declared blocking overlays; acknowledgement is a changed-text heuristic. Preparation does not count as a measured preferences opening |
| `action.consent-effective` | Public state matches the requested allowed categories | Does not itself establish script execution or durable storage |
| `action.local-persisted`, `action.remote-persisted` | Explicit adapter write/response acknowledgement timestamps | Missing public instrumentation remains unavailable. A response is not proof of durable backend commit; restoration is checked separately |
| `scripts.executions`, `scripts.duplicates`, `action.scripts-complete` | Timestamped controlled script markers | Covers the declared minimal workload, not all vendor JavaScript or tracker CPU cost |
| `initial.long-task-blocking`, `action.long-task-blocking` | Long-task tails above 50 ms clipped to the declared interval | This is not Lighthouse TBT and does not include shorter tasks |
| `initial.requests`, `deferred.requests`, corresponding third-party counts | Requests observed under the recorded CDP target scope | Third-party means a different hostname, not company ownership or registrable site |
| `initial.transfer`, `deferred.transfer` | CDP response transfer observations for completed requests | Includes some protocol overhead; not physical wire traffic or SDK package size |
| Corresponding encoded and decoded body totals | Separate representation/body-size observations where complete | Missing compressed-body lengths stay unavailable. Initial/deferred groups use request start time, not byte-transfer time |
| `observation.frame-interval`, `observation.callbacks` | Collector cadence and callback count | Diagnostics, not a dropped-frame score or a product performance rank |
| Audit FCP/LCP, task/script/layout duration, observed window | Incremental collector cost against a shared minimal observer on the same baseline | CPU thread time and wall-clock endpoints differ. Audit results are not a correction factor to subtract from vendor results |

Scenario outcomes also check the declared consent state, controlled execution, permitted storage/frame markers where instrumented, server-confirmed controlled egress, and restoration after reload. They do not certify all tracker behavior, recurring activity after withdrawal, multi-tab behavior, expiry, IndexedDB persistence, or every browser integration. Capability labels retain the exact scenario and evidence scope.

When completion is verified only after the cutoff, a separate correctness snapshot records its observation time and the sample stays incomplete. It does not supply a missing dismissal or consent duration. Later controlled server requests remain in the raw evidence and are kept out of the in-window violation check. An action still incomplete at the correctness deadline remains a failed attempt.

## Statistics and existing evidence

All 15 selected load envelope hashes matched. Independent recomputation matched all 85 selected load/audit medians and paired differences, and all 69 reported bootstrap intervals. The paired estimate is the median of within-pair differences, not the difference of two aggregate medians.

Thirty successful matched pairs remain necessary for a comparison interval. Failed and incomplete attempts, missing metrics, incompatible methods, unstable remote artifacts, and known collector defects prevent eligibility. Action baselines do not execute an equivalent consent workload, so action durations remain absolute.

The current successful-sample policy requires an initial transfer observation. Incomplete worker or frame coverage can therefore exclude otherwise observed paint metrics from successful summaries. Those native observations remain in the raw envelope. Such an incomplete sample is not evidence that the page failed to paint or that the product's consent flow is broken.

Existing envelopes are unchanged. Historical reports now identify affected timing evidence and link to this audit. The reusable analysis applies invalidation by collector and metric when old evidence is read again. Current results must not be pooled with the old minimal fixture or old collector methods.

The mobile profile records viewport, touch, user agent, DPR, CPU slowdown, latency, and bandwidth. It is laboratory emulation. c15t's local controlled hosted backend and competitors' remote services still have different latency and deployment conditions. Neither profile establishes a product-wide ranking.

## Fresh measurement results

The first [frozen matrix](../artifacts/measurement-audit-2026-09-27/index.json) completed all 23 commands. Sixteen produced envelopes containing 362 measured samples: 350 passed, three failed, and nine were incomplete. Sixty-one separately retained followup probes include 55 passed, two failed, and four incomplete attempts. Four audit warmup samples are retained separately; twelve ordinary load warmup samples ran before collection and are not retained. Seven commands exposed a fixture-launch defect before producing an envelope. Those execution errors remain recorded and are not CMP failures.

The [sample checks](../artifacts/measurement-audit-2026-09-27/check-summary.json) found no recorded action endpoint before its input or after its deadline, and no captured followup before its planned dispatch time. All 16 envelope hashes and 146 command-log hashes matched. The collector, configurations, profiles, and source consumer passed their final frozen-input verification before the launch correction. An [independent review](../artifacts/measurement-audit-2026-09-27/independent-review-001.json) matched all 34 fresh comparisons and ten bootstrap intervals, checked 3,830 network aggregates against raw requests, and verified native entries and controlled markers against their cutoffs. The 256 recorded action endpoints had no timing violation. Captured followup dispatch ran 3.9 to 35 ms later than requested, with median lateness of 16.45 ms.

| Source Next.js load profile | Successful pairs | Baseline median LCP | CMP median LCP | Median paired difference | 95% paired interval |
| --- | --- | --- | --- | --- | --- |
| Desktop | 30 | 84 ms | 84 ms | 0 ms | -4 to 0 ms |
| Mobile | 30 | 3,508 ms | 4,044 ms | +532 ms | +528 to +536 ms |

Every one of these 120 load observations selected `IMG#primary-content`. Its separate Element Timing paint matched LCP. The desktop comparison is inconclusive; the mobile comparison detects additional image-paint delay under the declared emulation. Neither establishes a product ranking or production performance. The desktop fixture also transferred a median 98,313 additional bytes despite its zero median LCP difference. Encoded-body totals remain unavailable in both profiles because exact compressed lengths are missing for some responses.

The smaller mobile script-tag cohort passed all three pairs. Its baseline/CMP image-paint medians were 2,860 and 4,708 ms, with a descriptive paired difference of +1,848 ms and no confidence interval. All three React candidate visits were incomplete: the image request was unfinished at the five-second cutoff and Element Timing had no image paint. Their bounded LCP entries selected a paragraph at 3,140, 3,140, and 3,172 ms. Those observations cannot become a claim that React delivered the article faster.

The source desktop checks passed every declared required scenario for script tag, headless, React, Next.js, Vue, Nuxt, and TanStack Start. Script tag failed its separate 100 ms followup after saving; the normal 500 ms check passed. Astro failed the no-banner contract during returning-accepted and withdrawal visits. Its banner appeared around 40 ms, before accepted state restored around 70 ms. Withdrawal itself took about 11 ms to apply and its rejected state survived reload. These are restoration-visibility failures, not evidence that withdrawal did not apply.

Ketch and Osano completed their browser visits, but all three candidate scenarios per vendor were incomplete because their frame or worker activity exceeds verified page-target network coverage. Raw paint and consent observations remain. The whole-sample eligibility policy used for that report prevented those visits from entering its successful paint summaries too.

The separate [launch correction cohort](../artifacts/measurement-audit-2026-09-27-launcher-correction/index.json) produced all seven missing envelopes after the package-script fix. Its 42 samples contain 36 passed, five incomplete, and one failed attempt. Cookie Control, Didomi, Enzuzo, and iubenda passed desktop load, accept, and reject checks. Didomi also passed its three mobile load pairs. OneTrust's three desktop candidate visits and two mobile visits remain incomplete because of unverified child-frame network coverage. Its third mobile visit did not show the expected banner within five seconds and remains failed. The SDK request was unfinished at cutoff while the article image had painted at 3,512 ms; this does not establish eventual banner behavior or the cause of the delay. No failed or incomplete browser attempt was retried.

In the other two OneTrust mobile visits, native LCP selected banner text at 3,784 and 3,756 ms while the article image painted later at 4,576 and 4,568 ms. Those raw observations illustrate why element attribution and primary-content paint remain necessary even when a visit is excluded from successful summaries.

Together, the two cohorts retain 23 envelopes with 404 measured samples: 386 passed, four failed, and 14 incomplete. The 71 separate followup probes contain 63 passed, two failed, and six incomplete attempts. The original seven launch errors remain in their original index; corrected entries link to them. CookieYes remains excluded at the user's request and Usercentrics remains configuration-blocked by its public ruleset.

The [independent correction review](../artifacts/measurement-audit-2026-09-27-launcher-correction/independent-review-001.json) matched all twelve additional comparisons, 520 network aggregates, seven envelope hashes, and 52 command-log hashes. Across both cohorts, 46 comparisons and ten bootstrap intervals recomputed without a mismatch. All 296 checked action endpoints obeyed their input and deadline boundaries.

The instrumentation audits each passed ten measured pairs plus one excluded warmup pair. The descriptive median added task CPU time was 108.3 ms on desktop and 43.9 ms on mobile across the five-second observation window. Corresponding paired LCP differences were 0 and 8 ms. These cohorts are below the 30-pair threshold, so no interval or qualifying comparison is reported. Their CPU counters and paint endpoints measure different things; these values are not correction factors.

## Validation record

The complete `pnpm check` passed with the local PostgreSQL database and CLI interruption regression enabled. It covered lint, 24 workspace typechecks, 120 unit/integration tests, and 45 serial browser tests. All 24 production builds passed, followed by source verification. Logs are retained under [`artifacts/validation-measurement-audit-2026-09-27`](../artifacts/validation-measurement-audit-2026-09-27/), including the earlier failures that led to corrections.

Five changed vendor integrations passed ten production startup probes after removing duplicate client adapter imports. Baseline and candidate pages requested each shared workload resource once, and every probe selected `IMG#primary-content` as LCP. These probes used manually assembled proxy commands. They missed a duplicate `--competitor` option in the package scripts that reached `next start`, which rejects that option. The full matrix caught the launch defect. The earlier HTML, screenshots, observations, and failed matrix commands remain unchanged.

The five package scripts now pass the option only to the fixture proxy. Their revisions and configuration provenance changed accordingly. Five additional serial regressions passed through the actual declared build/start commands, checking server readiness, candidate injection, baseline HTML, and cleanup. Runner typechecking, lint, and source verification also passed. [Correction identities and logs](../artifacts/validation-measurement-audit-2026-09-27/startup-correction/correction-identities.json) retain all ten baseline/candidate configuration hashes and link the seven original failed commands. The startup tests run with `COOKIEBENCH_COMPETITOR_STARTUP_TESTS=1`; they do not depend on remote vendor SDK responses.

The accepted collector source hash is `2362a29da5729310bc3cb0aba722ceb8344f9bbf7808c1f3a3c2a5bc9aada772`. The runner and methodology identify version 3.1. The c15t source commit remains `9993ae57867e33e96783640413a2429b649104c7`, with verified consumer input hash `8db76a0fd04a1bb273e5c4f3cc65b1087b4fa3cc3eaae1fcdff0c3f96a51543b`. All 14 upstream archives remain unchanged.

The original artifacts live in [`artifacts/measurement-audit-2026-09-27`](../artifacts/measurement-audit-2026-09-27/), with the seven affected entries in [`measurement-audit-2026-09-27-launcher-correction`](../artifacts/measurement-audit-2026-09-27-launcher-correction/). Both execution recipes froze their inputs before collection. The correction preserved the original failed commands and used the same collector and source consumer. Its configuration check permits only the declared fixture revision, configuration hash, and provenance updates.

The [PostgreSQL reconciliation](../artifacts/measurement-audit-2026-09-27/database-review-001/verification.json) verified all 23 new envelopes against stored content and normalized rows. All initial inserts succeeded; all 23 identical retries added nothing. The database contains the expected 404 new samples and 12,980 measurements, with the same statuses as the local evidence. All 74 preexisting runs and preexisting rows across twelve tables remained unchanged. This verifies the local review database, not a production cutover.
