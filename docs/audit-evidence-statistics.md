# Evidence and statistics audit

Raw run artifacts are not stored in this repository. The `artifacts/` paths below name files from the original runs and cannot be checked from this checkout.

Audit date: 2026-09-27. This pass inspected the runner's network collection, analysis, schema, local output, batch checkpoints, and PostgreSQL ingestion. It independently recomputed selected report values from the retained JSON envelopes. The initial source audit was read-only. Controlled browser regressions, corrected benchmark runs, and local review database ingestion followed, as recorded below.

## Checks against retained evidence

The selected report is `artifacts/v3-2026-09-27-body-correction/report-final/summary.json`.

- Every selected envelope's SHA-256 matches the report's recorded hash.
- All 85 selected load and instrumentation comparisons have the correct baseline median, candidate median, and median of paired differences.
- All 69 reported confidence intervals match an independent Python implementation of the recorded 2,000-resample paired percentile bootstrap and seeded LCG.
- All 900 selected load samples retain their individual request records. The 15 load cohorts include their failed attempts.

These checks establish arithmetic and file consistency. They do not establish that the browser collected every relevant event or that this workload represents a production page.

## Findings from the initial audit

| Priority | Finding | Evidence and effect | Smallest useful check |
| --- | --- | --- | --- |
| High | Network completeness is limited to the attached page target. | `collectNetwork` creates one page CDP session, subscribes only there, and never attaches worker or out-of-process iframe targets. `measurements` declares totals complete when every observed row has bytes. Missing target traffic can therefore look like a complete total. A controlled worker fetch reached the server but was absent from the page CDP records. The size of this gap in retained vendor cohorts is unknown. | A controlled worker fetch and cross-site iframe fetch must be observed by the server, then compared with collector rows. Either collect related targets or withhold complete-page totals when unsupported targets occur. |
| High | The analysis has no policy for measurements invalidated by a known collector bug. | `compareResults` checks compatibility between inputs, not whether their collector is valid for the selected metric. Comparing an affected old envelope with itself can pass the same-source check. The selected report manually excludes old encoded-body evidence, but the general analysis API does not encode that restriction. | Analyze a retained pre-correction envelope with a known wrong encoded-body result. Require explicit invalidation for that metric while leaving unaffected evidence readable. |
| Medium | The byte method description names a removed data source. | `measure.ts` describes bytes as `passive CDP and Playwright request.sizes`. `network.ts` now uses CDP completion totals, Content-Length, or complete identity-body data. The unchanged string also fails to distinguish successive incompatible implementations. | Assert method identity separately for transfer, encoded body, and decoded body. Give corrected collection a new method revision. |
| Medium | Resume does not verify retained evidence hashes. | `batch.ts` reads an existing `result.json`, checks its configuration hash, then reuses it. It does not recompute the envelope, stdout, or stderr hashes it returns to the report. The current selected files passed independent verification, so this is a recovery-path weakness, not evidence that they changed. | Modify a copied envelope after checkpointing, then resume. The batch should reject the mismatch before reusing its summary. |
| Medium | Request phase is not byte-transfer phase. | `partitionNetwork` assigns the entire request to `initial` or `deferred` from its start timestamp. A request begun before consent that completes afterward contributes all its bytes to `initial`. | A request spanning the input timestamp should retain its start-cohort label. Documentation and methods must say this; a temporal transfer metric would need separate chunk accounting. |
| Medium | Response digest wording may promise stronger byte identity than CDP provides for text. | The collector UTF-8 encodes `getResponseBody.body` when `base64Encoded` is false. CDP returns a string in that case. A non-UTF-8 text response may have a stable decoded-text digest without matching the original decompressed byte sequence. Retained fixtures are not shown to trigger this case. | Serve an explicit non-UTF-8 JavaScript body and compare its server bytes with the recorded digest. Describe text normalization or preserve exact bytes where available. |

## Network rules that are defensible

The latest collector separates `loadingFinished.encodedDataLength`, raw `dataReceived.encodedDataLength`, encoded body length, and decoded body length. Transfer counts can include protocol overhead. They are not a measure of SDK package size or physical network usage such as TLS and TCP overhead.

An uncached completed response can establish encoded body length from Content-Length. An identity-encoded response can use its complete decoded byte count. A compressed response without an exact length stays unavailable. This is preferable to presenting chunk framing as body content.

Response bodies use the exact CDP request ID. Redirect hops cannot inherit the final response's digest. Requests unfinished at the cutoff remain incomplete even if their body becomes available later. HEAD, 204, 205, and 304 responses have zero body bytes. Missing byte fields make the corresponding total unavailable; they do not turn into zero. Redirect transfer breakdowns remain unavailable.

The current `third-party` field means a different URL hostname. Different subdomains count as third-party; another port on the same hostname does not. This is documented by the metric method, but it must not be interpreted as registrable-site or company ownership attribution. `fromCache` also includes service-worker responses and does not distinguish cache mechanisms.

## Statistical interpretation

The paired estimate is the median of candidate-minus-baseline differences within the same run, scenario, pair ID, and attempt. It is not the difference of independent cell medians. The implementation rejects duplicate pair identities, incompatible units and methods, and incomplete pairing. Baseline controls must match framework, framework version, and deployment mode.

Only passed samples with no failures and measured values enter numerical summaries. Missing counts describe absent or non-measured metrics across all attempts, including failures. Consequently `attempts - measured` need not equal `missing`; failed samples can retain a valid observed metric while being excluded from the successful-value estimate. That is a documented selection policy, not lost evidence.

At least 30 successful pairs are required for a reported interval and comparison eligibility. Failed, incomplete, unpaired, missing-metric, or unstable remote-artifact evidence keeps the comparison ineligible. Action and returning-visitor deltas are withheld because their baseline visits do not execute an equivalent workload. Numerical estimates on ineligible rows remain provisional and must retain their eligibility reasons.

The confidence intervals quantify repeat variation in this batch. They do not capture omitted browser targets, workload bias, changing hardware load, or a production population. Quantized paint timings and identical static byte counts can produce a zero-width interval. A zero LCP difference does not establish no load cost. The intervals are per comparison and have no adjustment for multiple metrics or vendors.

## Provenance, cache, and storage

The collector source tree and lockfile are hashed. The recorded profile includes CPU throttling, viewport, scale, locale, and network settings. The region is explicitly a label, with no egress or geolocation emulation. New browser contexts isolate ordinary samples, while the process and production server remain shared. Cold browser cache therefore does not mean cold DNS, TCP/TLS, CDN, operating-system, or server caches. Warmups execute before measured samples but ordinary warmup observations are not retained.

A runner-source hash is not a recursive hash of installed dependency files, built assets, or all fixture source. Fixture provenance and remote response identities supply separate evidence. Artifact eligibility checks only observed third-party script, style, and JSON-like responses. It excludes images, fonts, documents, and resources missing from the attached target. Therefore it establishes stability of that observed subset, not an immutable vendor release.

Local envelopes and checkpoints use exclusive creation. PostgreSQL ingestion hashes canonical decoded content, takes a run-ID advisory transaction lock, inserts a whole envelope and normalized rows in one transaction, rejects changed content under an existing run ID, and returns an idempotent result for identical retries. Database triggers reject row updates and deletes. The final verification exercised normal ingestion and identical retries against the local review database.

## Instrumentation overhead

The overhead experiment compares the full collector with a minimal paint/LCP observer and shared CDP emulation. CPU values are thread-clock task, script, and layout duration differences in milliseconds. Network body extraction occurs after the measured interval. Reported deltas therefore estimate additional observation cost on these baseline pages, not the overhead of every browser, server, and Node operation involved in a complete benchmark run.

The actual observed endpoint can exceed the target deadline. Both the raw Performance metrics and endpoint are retained, and the report shows window differences. No constant subtraction from vendor timings is justified. These baseline results do not establish collector cost during consent actions or on large changing documents.

## What can remain in use

Retain original envelopes unchanged. Arithmetic, pairing identities, raw failure records, and verified hashes remain useful. The latest exact-body observations remain usable within their attached-target scope. Older transfer, decoded-body, and timing fields require their own collector-specific validity decisions; an encoded-body bug alone does not invalidate every field. Known-invalid encoded-body estimates must stay excluded wherever analysis is produced, including direct CLI comparisons, not only in the selected report.

## Changes made after the audit

Analysis version 3.1 adds a per-metric invalidation policy keyed by retained collector source hashes and the legacy `cookiebench-runner-3.0.0` timing contract. Reanalysis keeps original values but cannot qualify known-invalid encoded-body, remote-identity, browser-timing, or action observations. Reports show validity warnings on those metrics. The historical files and previously saved analyses remain unchanged.

The affected hashes are `2f50f05bdbdd9eeedd7b341f4e613d0409307e2f9823a80bcfc0a8a9ecb0011e`, `7594c4d8eaad24aa17351adec7b62ac64f7a2ce902904b34d3e0c2cde010fb84`, and `23c20f43c1361da063d0bb1806c16022bebc4ef82f083e331eaa8954b79fb2d3`. The final hash fixed encoded-body collection but predates the timing corrections. A full retained-artifact scan found 52 runner 3.0 runs across those three hashes. Version-based timing restrictions also cover any earlier or separately supplied runner 3.0 envelope, without invalidating the overhead experiment's separate native metric methods. The exact restrictions and reasons live in `packages/analysis/src/validity.ts`; unaffected byte metrics are not automatically discarded because timing changed.

The byte methods now identify their CDP source and revision. Request counts and byte totals stay unavailable when related worker, shared-worker, service-worker, or additional-page activity makes coverage incomplete. Child frames no longer do: the collector also reads auto-attached out-of-process frame targets, which wait for it before running. Shared workers use passive CDP target discovery, filtered to the sample browser context where context identity is available. A failed discovery setup also prevents a claim of complete coverage. Coverage is captured before persistence verification reloads. Target notifications do not carry a navigation-relative timestamp here, so a target observed between the deadline and snapshot can conservatively make the sample unavailable. Absence of a known gap is a scoped collector statement, not proof that every browser networking mechanism is counted.

The controlled browser confirmed a dedicated-worker omission. The cross-site iframe request was included by this Chromium, but child-frame completeness remains conservatively unverified. This distinction prevents claiming an iframe omission that the experiment did not reproduce. Raw observations are retained in network coverage evidence (`artifacts/validation-measurement-audit-2026-09-27/network-coverage.json`). The first six browser checks and 64 focused unit checks passed; two profile compatibility checks passed in a later 27-test run. Shared-worker and non-UTF-8 body regressions were added afterward for the final coordinated suite.

Response identity records `bodyDigestEncoding`. `utf8-text` means SHA-256 of CDP's decoded response string encoded as UTF-8. `base64-bytes` means SHA-256 of the bytes returned through CDP base64, and `empty-body` records a response known to have no body. Neither text normalization nor response identity changes the separately measured byte counts.

Batch resume now checks the saved entry against the plan, the duplicate attempt record, the expected command, the saved configuration bytes, the envelope hash and run identity, and stdout/stderr hashes. A changed file stops resume. Tests cover changed envelope bytes, entry identity, checkpoint identity, seed/command identity, and logs.

Reusable load comparisons and reports now retain absolute LCP medians, signed paired differences, and element groups with role, ID, tag, URL, size, and sample count. Historical entries without a recorded role remain `unavailable`; the report does not infer a banner from a vendor-specific ID. `page.primary-content-paint` is a separate comparison metric for the fixture's designated content. It does not replace native LCP.

Device profiles accept explicit `hasTouch` and `userAgent`. Historical envelopes still decode without those fields, while new mobile runs require both. Methodology version 3.1 separates the corrected measurement protocol from old runs.

## Final independent verification

The original matrix review (`artifacts/measurement-audit-2026-09-27/independent-review-001.json`) verified 16 envelopes, 362 samples, 11,510 measurements, 34 comparisons, and all 10 bootstrap intervals. It checked 146 retained command logs, input and envelope hashes, timestamp boundaries, network aggregation, and serial execution. Seven startup errors produced no envelopes and remain preserved in the original index.

The launcher correction review (`artifacts/measurement-audit-2026-09-27-launcher-correction/independent-review-001.json`) verified another seven envelopes, 42 samples, 1,470 measurements, 12 comparisons, and 52 command logs. Both independent reviews completed without issues. The correction changed launcher configuration and fixture provenance while preserving the collector and source consumer identities.

The database verification (`artifacts/measurement-audit-2026-09-27/database-review-001/verification.json`) inserted all 23 envelopes into the existing local review database and verified all 23 identical retries without duplicate insertion. It reconciled canonical envelope hashes, 404 normalized samples, and 12,980 measurements against the source evidence. Sample statuses remain 386 passed, four failed, and 14 incomplete. The seven original startup errors remain execution records rather than fabricated samples.

All 74 preexisting runs and their original evidence rows stayed unchanged. Before-and-after row fingerprints matched across all 12 evidence tables. No migration, deletion, or update was performed. The executable verification script, command outputs, snapshots, and reconciliation details remain alongside the final result.
