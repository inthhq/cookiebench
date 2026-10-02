# Calibrated CookieYes and c15t script comparison, October 2, 2026

## Known defects (2026-10-02)

CPU throttling applied to the main frame only, not to cross-site iframes. c15t's page loads no iframes. The evidence available here does not show whether CookieYes ran work in a cross-site iframe. If it did, its emulated-mobile timings understate that work. Treat the CookieYes emulated-mobile timings as unverified until a rerun with corrected code. The recorded numbers below are unchanged.

## Conditions

This emulated-mobile comparison repeats the [October 1 comparison](cookieyes-c15t-script-comparison-2026-10-01.md) with a calibrated CPU slowdown. It is separate from the main September 27 and September 30 batches, which exclude CookieYes. The two arms ran under different conditions, so the results are not a product ranking. Differences mix product cost with script hosting, script placement and backend latency.

| Condition | c15t | CookieYes |
| --- | --- | --- |
| Page | `benchmarks/with-c15t-script/index.html` | `benchmarks/with-c15t-script/cookieyes.html` |
| Script source | Self-hosted copy of `@c15t/browser@3.0.0-alpha.3` at `/vendor/c15t.js` | Vendor CDN, `cdn-cookieyes.com` |
| Script placement | Classic script in `<body>`, after the article | Classic script in `<head>`, parser-blocking (the vendor's standard install) |
| Backend | Controlled local test double on the fixture server, fixed 150 ms delay per policy or save response | CookieYes remote services |
| Site ID | Not applicable | `f66d6dffd4f9c8178517db8d4aeddcaa` (results below); checked-in configurations use `830009093fab466a1ff5d9a1` |

The run configuration used for this comparison was not committed. `benchmarks/cookieyes-script-comparison/run-mobile.json` reconstructs it from the page sources and `benchmarks/profiles/mobile.json`.

CookieYes renders only on the domain registered for a site. On any other hostname, including `127.0.0.1`, its script throws "Looks like your website URL has changed" and shows no banner. Site `f66d6dff…`, used for the results below, is registered to `consentbench-with-cookie-yes.vercel.app`, so the original runs must have served the page under that hostname. The setup that did so was not committed, and that site is no longer used.

The checked-in configurations, `benchmarks/cookieyes-script-comparison/run.json` (desktop) and `run-mobile.json` (emulated mobile), use site `830009093fab466a1ff5d9a1`, registered to `benchmarks-with-cookie-yes.vercel.app`. This is the same site as the Next.js fixture. They serve the baseline, c15t and CookieYes pages under that hostname over local HTTPS (`resolveHost`), so all three arms share the hostname and TLS conditions. The CookieYes adapter waits for `cookieyes_banner_load` before input, because the consent API exists before the banner's buttons respond. A one-iteration check on October 2, 2026 passed every desktop load, accept and reject sample and verified every emulated-mobile consent flow. The site, hostname, TLS and readiness differ from the original runs, so results from these configurations are not comparable with the numbers below. A rerun is needed to replace them.

```sh
pnpm cookiebench cpu calibrate --config benchmarks/cookieyes-script-comparison/run-mobile.json --output artifacts/cpu-calibration.json
pnpm cookiebench run --config benchmarks/cookieyes-script-comparison/run-mobile.json --cpu-calibration artifacts/cpu-calibration.json --cpu-tier mid --scenario load --iterations 30 --warmups 3 --output artifacts/cookieyes-calibrated-load.json
```

Run the `accept` and `reject` scenarios the same way with `--iterations 10 --warmups 0`.

Raw run artifacts are not stored in this repository. The `artifacts/` paths below name files from the original runs and cannot be checked from this checkout.

## Results

CookieYes added less LCP delay. c15t's banner appeared 105 ms earlier.

Chrome mid-tier calibration selected **2.83×** slowdown. Validation passed before and after measurement. Mobile network settings remained 1.6 Mbps and 150 ms latency.

| Median, milliseconds           | c15t alpha.3 |  CookieYes |
| ------------------------------ | -----------: | ---------: |
| Page LCP                       |        3,280 |      3,048 |
| Paired added LCP over baseline |          426 |        196 |
| Added-LCP 95% interval         |   424 to 432 | 188 to 200 |
| Banner visible                 |        1,435 |      1,540 |
| Accept input to next paint     |           60 |         48 |
| Reject input to next paint     |           64 |         48 |
| Accept dismissal               |         54.6 |       48.5 |
| Reject dismissal               |         80.9 |       46.1 |

Baseline LCP was 2,852 ms. All 30 loads per fixture passed, with 30 eligible pairs per CMP and identical image attribution. Three warmups per fixture were excluded.

Each CMP had 10 Accept and 10 Reject attempts plus followups. All 80 visits verified correctness. Primary timings were available; followup timing had 8 Accept and 9 Reject observations per CMP, with 16 ms medians. Six values remain unavailable. Action differences are descriptive given sample size and 8 ms quantization.

Missing initial transfer bytes left 20 c15t attempts and one CookieYes Reject incomplete; their action timings remain eligible.

`@c15t/browser@3.0.0-alpha.3` used a self-hosted body script and local backend delayed 150 ms. CookieYes used its public CDN head script, remote services and consent-API workload gating. Both shared the static page. Browser emulation and competing host processes limit generalization.

Historically, fixed-4× added LCP was 428/196 ms and banner visibility 1,475/1,570 ms for c15t/CookieYes. Results are similar; changed calibration and collector identities prevent cross-run ranking or CPU-only attribution.

Structured results (`artifacts/calibrated-cookieyes-c15t-2026-10-02/reports/independent-summary.json`), final audit (`artifacts/calibrated-cookieyes-c15t-2026-10-02/reports/final-review.json`), raw evidence (`artifacts/calibrated-cookieyes-c15t-2026-10-02/`). Frozen source, build, configuration and browser checks passed.
