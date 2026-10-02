# Measurement fixes and comparison plan

This pass repairs reload observation, separates metric eligibility from unrelated collection gaps, enables production compression, and repeats the c15t and competitor measurements with the corrected collector. Earlier envelopes remain unchanged.

## Deployment scope

c15t uses the controlled local backend for this pass, as requested on September 30. Its hosted transport protocol does not make this fixture a measurement of the managed inth.com service. A public backend is not configured yet. Manifest deployment is excluded until backend support is available.

Every new fixture declares its backend and asset deployment. The main competitor table compares Next.js fixtures with the same article and device profile. Local-backend and live remote-service results remain labeled separately. Baseline subtraction measures the added work in each deployment; it does not remove differences in backend distance, CDN behavior, or server configuration.

CookieYes remains excluded at the user's request. Usercentrics remains configuration-blocked because the recovered public ruleset does not require consent for the test visitor. Neither becomes a failed product score.

## Validation before collection

- Reproduce delayed permission restoration and genuine lost consent, then verify the new readiness check.
- Exercise withdrawal through an actual document reload. Record correctness after navigation and leave unsupported cross-document timings unavailable.
- Verify measured paint and interaction values remain usable when only network totals are incomplete. Genuine consent failures, missing target metrics, and invalidated collector methods remain excluded.
- Check compression negotiation, decompressed content, response lengths, HEAD handling, and streamed candidate/baseline HTML.
- Run the repository checks and production fixture checks serially before freezing sources and configurations.

## Repeated protocol

The intended matrix covers eight c15t integrations and seven configured competitors on desktop and emulated mobile. Each integration has a no-CMP control using its own framework. The main cross-vendor comparison uses c15t Next.js because the competitor fixtures use Next.js; the other c15t integrations have separate tables.

Fresh load retains 30 measured baseline/candidate pairs and three excluded warmup pairs per integration and profile. With fifteen integrations and two profiles, that is 1,800 primary observations and 180 excluded warmup visits.

Accept, reject, and granular save each run ten times per candidate and profile, with no warmups. These 900 primary action attempts use the same 500 ms followup offset and retain up to 900 separate followup visits. Baselines do not execute a consent action, so this repeated action cohort contains candidates only. Action summaries are absolute durations with counts, median, p75, spread, and unavailable reasons. Ten attempts do not support the 30-pair comparison interval used for load results.

The existing one-attempt correctness checks cover other declared behavior, including returning visitors and withdrawal. Unsupported native save workflows remain identified as protocol limits. A failed or incomplete browser attempt is never replaced to obtain a pass.

Separate Next.js instrumentation audits use 30 minimal/full collector pairs on each device profile, with three excluded warmup pairs. They estimate additional startup collection cost on the baseline page. They do not measure input or unload serialization cost, and their results are never subtracted from CMP measurements.

The page workload, five-second fresh-load window, action observation windows, and checked-in device profiles remain explicit in the frozen inputs. Mobile means desktop Chromium emulation, not a physical phone. No synthetic backend delay is added to make the local service resemble an unmeasured remote service.

## Reporting and preservation

Each metric reports how many values were available, included, or excluded, alongside the original sample statuses. A valid image paint does not disappear just because a transfer total is unavailable. Missing browser observations never become zero, and a successful state check does not invent a navigation-spanning action duration.

The final report will link immutable envelopes, input hashes, command logs, paired load comparisons, action summaries, and independent reconciliation. Local database ingestion will retain all outcomes and verify idempotence and preservation of existing runs.
