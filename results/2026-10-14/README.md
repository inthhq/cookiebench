# Cookiebench sandbox matrix, October 14 2026

Ten CMPs on six frameworks, desktop and mobile, with c15t at `3.0.0`. Every entry ran on its own Vercel Sandbox of the same type: Intel Xeon @ 2.90GHz, 8 vCPUs, Linux 6.18.49. Unlike [the October 12 merge](../2026-10-12-merged/README.md), c15t and its competitors share one machine type, one collector and one run, so rows are comparable to each other through their paired baselines.

Each sandbox is a separate machine. Absolute timings still vary between sandboxes, so compare each CMP through its paired delta against the no-CMP baseline in the same entry, not through raw medians from different frameworks.

## Files

- [report.html](report.html) is a standalone interactive table. Choose desktop or mobile, a framework, and load metrics, web vitals or consent interactions. It needs no server or external assets.
- [tables.md](tables.md) has the numeric tables for all twelve framework/profile combinations and the collector overhead audit.
- [matrix-desktop.json](matrix-desktop.json) and [matrix-mobile.json](matrix-mobile.json) contain 60 CMP rows each, with source evidence and comparison eligibility.
- [matrix.csv](matrix.csv) flattens all 120 rows. Empty numeric cells mean unavailable, not zero.
- [reference-overhead-desktop.json](reference-overhead-desktop.json) and [reference-overhead-mobile.json](reference-overhead-mobile.json) compare the minimal and full collector on a page with no CMP.
- [validation.json](validation.json) records the source checks, c15t pass counts and each profile's CPU rates.
- `paired/` contains the TTFB and FCP analyses. The batch runner writes the other comparisons beside each envelope.

## Sources

| Batch | Entries | Collector source hash |
| --- | --- | --- |
| [desktop](desktop/) | 12 load and 12 correctness entries | `f359851e4f7b15d549e882d641cd3205f71af1a18aebd8f02f4fc5b2eb21eb1d` |
| [mobile](mobile/) | 12 load and 12 correctness entries | `f359851e…` (same) |
| [desktop-reference](desktop-reference/) | Collector overhead audit | `06fa46f4a5ad9d604051d5ba686f86511a4dda272a8b4be4bfa869153ef12ebc` |
| [mobile-reference](mobile-reference/) | Collector overhead audit | `06fa46f4…` (same) |

Plans are [plan-desktop.json](plan-desktop.json), [plan-mobile.json](plan-mobile.json) and their `-reference` versions. Fixture configurations are in [configs/](configs/).

The main batches also hold a `reference-overhead` entry with status `execution-error`. Its frozen config named a host path to `node` that does not exist inside a sandbox. The runner fix that writes a portable reference server changed the collector source hash, so the audit was rerun as its own `-reference` batch. No CMP row uses either reference audit, and the two hashes are never mixed in a paired comparison.

Each JSON row's `provenance.load` and `provenance.correctness` identify the index, entry, raw envelope, SHA-256 hashes, run manifest ID, collector source hash, CPU rate and observation windows. `comparisonEvidence` identifies each analysis file, its hash, eligibility reasons, sample counts and confidence family. `correctnessChecks` keeps both CMP and baseline cells, including failed or incomplete cells.

## c15t 3.0.0 checks

All six integrations use `3.0.0`: React, Nuxt/Vue, Next.js, TanStack Start, Astro and Script. Nuxt covers Vue. React and Script use hosted init. Nuxt/Vue, Next.js, TanStack Start and Astro use build-time manifests. Next.js streams its server-rendered banner.

On both profiles, c15t passed 90/90 load visits and verified 24/24 consent checks (load, accept, reject and save on six frameworks). Every displayed c15t LCP, TTFB, FCP, primary-content-paint, CLS and transfer comparison is eligible. Encoded-body comparisons are unavailable for every row. Nuxt decoded-body comparisons are unavailable because speculative prefetch bodies were not delivered to a renderer; this applies to every Nuxt row.

## Profiles and timing

Every entry used Chromium `153.0.8010.12` headless, a cold browser cache and local production page assets. The declared GB region is a label, not egress-region emulation.

| Profile | CPU | Download | Upload | Added latency | Viewport | Load window |
| --- | --- | --: | --: | --: | --- | --: |
| Desktop | No slowdown | 12,500,000 bytes/s | 12,500,000 bytes/s | 0 ms | 1365 x 768 | 5 s |
| Mobile | Calibrated mid-tier phone, 2.29x to 2.58x | 200,000 bytes/s | 93,750 bytes/s | 150 ms | 390 x 844 | 10 s |

Mobile CPU uses Chrome DevTools' calibration for its mid-tier phone preset. Each sandbox calibrates itself before measuring and records the rate in its envelope, at `manifest.profile.cpuSlowdown`. A CPU column in the tables and `load_cpu_slowdown` in the CSV show each row's rate. The rate differs between entries because each sandbox is a different machine. The calibration aims every entry at the same device speed, so rows with different rates are still comparable. Mobile remains browser emulation, not a measured phone.

Desktop has no added network latency, so TTFB and FCP measure local serving, not a home connection.

Banner visibility is a DOM observation from navigation start, not a paint timestamp. The paired delta is the median of differences within each pair, so it can differ from subtracting the two displayed medians. Transfer bytes include headers and fixture assets, so they are not package size.

CookieYes rows keep their registered-host baseline. Next.js CookieYes loads after hydration. Other competitors load in the document head. c15t is bundled with the app. `vendorTiming` records this distinction.

## Collector overhead

The reference audit loads a page with no CMP 15 times with the minimal collector and 15 times with the full one. On desktop the full collector adds a median 15.5 ms of task duration and 5.5 ms of script duration, with no detectable LCP change. The mobile numbers are in [tables.md](tables.md#collector-overhead). Report the audit beside CMP rows; do not subtract it from them.

## Confidence intervals

| Analyses, per profile | Comparisons | Intervals | Family target |
| --- | --: | --: | --: |
| Batch metrics (LCP, primary-content-paint, CLS, transfer, decoded and encoded body) | 365 | 730 | 95% |
| TTFB and FCP, `sandbox-2026-10-14:<profile>:ttfb-fcp` | 120 | 240 | 95% |

Each family uses a Bonferroni adjustment across comparisons and two estimators. These are intervals on each CMP's difference from its own baseline, not on differences between CMPs.

Missing or ineligible comparisons keep a null interval and their recorded reasons. An inconclusive conclusion does not prove equivalence.

## Consent interaction timing and INP

`interactions` contains input-to-next-paint from the recorded accept, reject and save attempts, plus a page-control interaction from a separate follow-up visit. There is one attempt per flow and integration. Measured Event Timing durations have 8 ms quantization, so small differences do not support a ranking.

These are individual interaction timings. The runner deliberately withholds finalized `page.lab-inp`, so this dataset has no whole-visit INP or field percentile score. See [the measurement audit](../../docs/measurement-audit.md). A missing value is unavailable. It is neither zero nor proof that the duration was below 16 ms.

## Competitor gaps

- Enzuzo and Ketch changed remote script or configuration identity during the run on every framework and profile. Their median differences remain descriptive; their confidence intervals are withheld.
- Astro Ketch on desktop passed 14 of 15 load visits. One visit is incomplete, with `initial.transfer` unavailable. This is why the desktop `astro-load` entry exited with code 2.
- Osano accept and reject checks fail on mobile on every framework (unknown for TanStack Start accept). The follow-up page control did not respond after consent, with `followup:page-unresponsive`. TanStack Start Osano never made its public consent state ready, with `restoration-not-ready`, so its desktop actions read unknown. October 11 recorded the same pattern on a different machine.
- Cookie Control and CookieYes do not declare a granular save action in these configurations, so their save checks read unknown on every framework. Nuxt Osano save also reads unknown. CookieYes has no cookies assigned in its site configuration, which can reduce measured bytes.
- The correctness entries exit with code 2 when any competitor flow stays unverified. Every c15t flow verified.
- Each CMP has one tested configuration. Passing a recorded flow is scoped to that action, workload and profile, not a general compliance claim.

## Rebuild and verify

The measurements came from `packages/cli/src/sandbox.ts` with the plans in this directory. See [measurement batches](../../docs/measurement-batches.md). Every sandbox and snapshot was deleted after the run.

To rebuild the summaries, run from the repository root with Node 24 and workspace dependencies installed:

```sh
node results/2026-10-14/paired.mjs
node results/2026-10-14/build.mjs
node results/2026-10-14/report.mjs
```

`paired.mjs` analyzes the existing envelopes and starts no browsers. `build.mjs` refuses a changed raw envelope or collector hash, checks that c15t is `3.0.0` on every framework, checks 60 rows per profile, and writes `validation.json`. `report.mjs` writes `report.html` and `tables.md`.
