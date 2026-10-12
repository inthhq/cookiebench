# Cookiebench merged matrix, October 12 2026

Ten CMPs on six frameworks, desktop and mobile. This merge replaces the twelve c15t rows in [the October 11 merge](../2026-10-11-merged/README.md) with validated `3.0.0-alpha.11` results. The other 108 rows keep their recorded load medians, baselines, paired estimates, intervals, flow outcomes and measured interaction durations. No new browser measurements were taken to build this merge.

**The source machines differ.** c15t ran on Apple M1 Pro/macOS. Competitors ran on AMD Ryzen 7 2700/Linux. Each row keeps its own run and host baseline, but neither absolute timing nor baseline-adjusted timing establishes a same-machine ranking between these sources. Do not publish cross-source speedup percentages or a claim that this merge isolates the effect of the CMP alone.

## Files

- [report.html](report.html) is a standalone interactive table. Choose desktop or mobile, a framework, and load metrics, web vitals or consent interactions. It needs no server or external assets.
- [tables.md](tables.md) has the numeric tables for all twelve framework/profile combinations, suitable for GitHub.
- [matrix-desktop.json](matrix-desktop.json) and [matrix-mobile.json](matrix-mobile.json) contain 60 CMP rows each, with source evidence and comparison eligibility.
- [matrix.csv](matrix.csv) flattens all 120 rows. Empty numeric cells mean unavailable, not zero.
- [validation.json](validation.json) records the source checks, row counts and retained limitations.
- `paired/` contains new TTFB and FCP analyses for c15t only. Competitors retain the October 11 analyses.

## Source mapping

| Source | Rows or measurements | Machine |
| --- | --- | --- |
| [October 11 full scan](../2026-10-11/) | All competitors except Next.js CookieYes | AMD Ryzen 7 2700, Linux |
| [CookieYes hydration rerun](../2026-10-11-cookie-yes-hydration/) | Next.js CookieYes, including its registered-host baseline and actions | AMD Ryzen 7 2700, Linux |
| [c15t alpha.11 desktop](../2026-10-11-alpha11-c15t/desktop/) | All c15t desktop loads and actions | Apple M1 Pro, macOS |
| [c15t alpha.11 mobile](../2026-10-11-alpha11-c15t/mobile/) | All c15t mobile load medians and paired comparisons | Apple M1 Pro, macOS |
| [c15t mobile correctness repair](../2026-10-11-alpha11-c15t/mobile-correctness-retry/) | All c15t mobile flow checks, consent interaction timings and follow-up visits | Apple M1 Pro, macOS |

Source manifest timestamps span October 10 and 11 UTC. Mobile measurements continued into October 12 BST. The correctness repair finished at 00:34 BST on October 12. This directory's date describes the merge, not a fresh full scan.

Each JSON row's `provenance.load` and `provenance.correctness` identify the index, entry, raw envelope, SHA-256 hashes, run manifest ID, collector source hash, CPU, browser, profile and observation windows. `comparisonEvidence` identifies each analysis file, its hash, eligibility reasons, sample counts and confidence family. `correctnessChecks` retains both CMP and baseline cells, including failed or incomplete cells.

The previous merged directory and every raw envelope remain unchanged. c15t alpha.10 stays available in the previous merge; it is not a second product row here.

## c15t alpha.11 checks

All six integrations use `3.0.0-alpha.11`: React, Nuxt/Vue, Next.js, TanStack Start, Astro and Script. Nuxt covers Vue; there is no standalone Vue row. React starts its hosted `/init` prefetch early. React and Script use hosted init. Nuxt/Vue, Next.js, TanStack Start and Astro use build-time manifests. Next.js streams its server-rendered banner.

Desktop has 180/180 passed paired-load attempts, 48/48 passed correctness attempts including baselines, and 18/18 passed follow-up visits. There are 15 load pairs per integration and three warmups per arm.

The original mobile run has 180/180 passed load attempts and 24/24 passed c15t correctness attempts, plus 18/18 passed follow-up visits. Its 18 baseline action attempts are incomplete. They inherited the 1.5-second action window and censored the hero image. The runner repair makes baseline action visits inherit the declared 10-second load window, while c15t post-action windows stay at 1.5 seconds.

The fresh correctness rerun passed 48/48 attempts, including baselines, and 18/18 follow-up visits. The merged mobile actions come from that rerun. Mobile load comparisons use only the original load envelopes, with collector hash `c2520e37a4b74af246fe893d06281c9b40aa24bfe76c475664f16aed8363623a`. The repaired correctness hash is `f359851e4f7b15d549e882d641cd3205f71af1a18aebd8f02f4fc5b2eb21eb1d`. Those two hashes are never mixed into a paired load comparison. The original incomplete evidence remains available.

The c15t validation found no browser errors, incomplete network coverage or cold encoding overlaps in the retained load evidence and final correctness evidence. All displayed c15t LCP, TTFB, FCP, primary-content-paint, CLS and transfer comparisons are eligible. Encoded-body comparisons are unavailable on all six integrations. Nuxt decoded-body comparisons are also unavailable because speculative prefetch bodies were not delivered to a renderer.

## Profiles and timing

Both source machines used Chromium `153.0.8010.12`, a cold browser cache and local production page assets. The declared GB region is a label, not egress-region emulation. Protected services and ordinary system activity remained on the c15t machine.

| Profile | CPU preset | Download | Upload | Added latency | Viewport | Load window |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| Desktop | 1x | 12,500,000 bytes/s | 12,500,000 bytes/s | 0 ms | 1365 x 768 | 5 s |
| Mobile | 4x, uncalibrated | 200,000 bytes/s | 93,750 bytes/s | 150 ms | 390 x 844 | 10 s |

Mobile is browser emulation, not a measured phone. The same CPU multiplier on different CPUs does not produce the same device performance.

Banner visibility is a DOM observation from navigation start, not a paint timestamp. LCP is the primary content image in both c15t arms. The paired delta is the median of differences within each pair; it can differ from subtracting the two displayed medians. Transfer bytes include headers and fixture assets, so they are not package size.

CookieYes rows retain their registered-host baseline. Next.js CookieYes loads after hydration; other competitors load in the document head. c15t is bundled with the app. `vendorTiming` records this distinction.

## Confidence intervals

This merge retains the source intervals. It does not recalibrate them into one combined confidence family, and they are not intervals on differences between CMPs.

| Source analyses, per profile | Comparisons | Intervals | Family target |
| --- | ---: | ---: | ---: |
| Original full scan batch metrics | 365 | 730 | 95% |
| Next.js CookieYes rerun batch metrics | 6 | 12 | 95% |
| c15t alpha.11 batch metrics | 36 | 72 | 95% |
| Previous merge competitor TTFB/FCP | 120 | 240 | 95% |
| New c15t TTFB/FCP | 12 | 24 | 95% |

Each uses Bonferroni adjustment across comparisons and two estimators. The new c15t TTFB/FCP family is `merged-2026-10-12:c15t:<profile>:ttfb-fcp`. The previous TTFB/FCP family includes the removed alpha.10 rows, so competitor intervals keep that conservative original adjustment. The same applies to the original full scan family.

Missing or ineligible comparisons retain a null interval and their recorded reasons. An inconclusive conclusion does not prove equivalence.

## Consent interaction timing and INP

`interactions` contains input-to-next-paint from the recorded accept, reject and save attempts, plus a page-control interaction from a separate follow-up visit. There is one attempt per flow and integration. Measured Event Timing durations have 8 ms quantization. Small differences do not support a statistical ranking.

These are individual interaction timings. The runner deliberately withholds finalized `page.lab-inp`; this dataset does not contain a publishable whole-visit INP or field percentile score. See [the measurement audit](../../docs/measurement-audit.md).

The new CSV uses `accept_input_to_next_paint_ms`, `reject_input_to_next_paint_ms` and `save_input_to_next_paint_ms` instead of the previous merge's misleading `*_inp_ms` names. Matching status columns distinguish measured from unavailable. Follow-up columns include their visit status.

The previous merge inferred `below-16ms` whenever a click took effect without a matching Event Timing entry. This merge reads the raw measurement status and reason instead. A missing value is unavailable; it is neither zero nor proof that the duration was below 16 ms. This changes labels, not recorded competitor durations or outcomes.

## Retained competitor gaps

- Mobile competitor correctness envelopes retain 36 incomplete baseline action samples from the same short-window issue. Their CMP action outcomes and durations remain the recorded results. This merge does not claim those older baseline checks were repaired or remeasured.
- Osano mobile accept/reject checks fail or read unknown. Several follow-up page controls did not respond after consent, with `followup:page-unresponsive`. TanStack Start desktop Osano public consent state did not become ready, so its actions read unknown.
- Nuxt desktop Osano has 14/15 passed load visits and withheld intervals. The recorded navigation failure and incomplete identity evidence remain visible.
- Enzuzo and Ketch changed remote script or configuration identity during the scan. Their median differences remain descriptive; their confidence intervals are withheld.
- Nuxt desktop decoded-body comparisons in the competitor scan are incomplete. Transfer comparisons remain separate.
- Cookie Control and CookieYes do not declare granular save actions in these configurations, so those checks read unknown. CookieYes has no cookies assigned in its site configuration, which can reduce measured bytes.
- Each CMP has one tested configuration. Passing a recorded flow is scoped to that action, workload and profile, not a general compliance claim.

## Rebuild and verify

Run from the repository root with Node 24 and workspace dependencies installed:

```sh
node results/2026-10-12-merged/paired.mjs
node results/2026-10-12-merged/build.mjs
node results/2026-10-12-merged/report.mjs
node results/2026-10-12-merged/verify.mjs
```

`paired.mjs` analyzes existing alpha.11 envelopes only. It starts no browsers. `build.mjs` refuses changed raw-envelope hashes and checks that retained competitor medians, baselines, intervals and flow statuses equal the previous merge. `verify.mjs` checks every row against raw evidence, verifies alpha.11 counts and pairing, and confirms the mobile source split and original incomplete baselines. It writes `validation.json`.

The JSON retains the previous `medians`, `baseline`, `paired`, `flows` and numeric interaction fields, and adds provenance, integration details, comparison eligibility, raw correctness cells and explicit missing-timing reasons. The CSV adds source paths, CPU names, collector hashes, eligibility and confidence-family fields.
