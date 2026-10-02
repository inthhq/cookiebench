# Calibrated CookieYes and c15t script comparison, October 2, 2026

This emulated-mobile comparison repeats the [October 1 comparison](cookieyes-c15t-script-comparison-2026-10-01.md) with a calibrated CPU slowdown. It is separate from the main September 27 and September 30 batches, which exclude CookieYes. The two arms ran under different conditions, so the results are not a product ranking. Differences mix product cost with script hosting, script placement and backend latency.

| Condition | c15t | CookieYes |
| --- | --- | --- |
| Page | `benchmarks/with-c15t-script/index.html` | `benchmarks/with-c15t-script/cookieyes.html` |
| Script source | Self-hosted copy of `@c15t/browser@3.0.0-alpha.3` at `/vendor/c15t.js` | Vendor CDN, `cdn-cookieyes.com` |
| Script placement | Classic script in `<body>`, after the article | Classic script in `<head>`, parser-blocking (the vendor's standard install) |
| Backend | Controlled local test double on the fixture server, fixed 150 ms delay per policy or save response | CookieYes remote services |
| Site ID | Not applicable | `f66d6dffd4f9c8178517db8d4aeddcaa` |

The CookieYes Next.js fixture (`benchmarks/with-cookie-yes`) uses a different site ID, `830009093fab466a1ff5d9a1`, which rejects the local hostname. The repository does not record who registered `f66d6dff…`, its registered URL or its banner settings.

The run configuration used for this comparison was not committed. `benchmarks/cookieyes-script-comparison/run-mobile.json` reconstructs it from the page sources and `benchmarks/profiles/mobile.json`. A one-sample load check of the reconstructed desktop configuration on October 2, 2026 failed with `banner-missing`, because the CookieYes script reported that the site's registered URL had changed. The results below cannot currently be reproduced from this repository.

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
