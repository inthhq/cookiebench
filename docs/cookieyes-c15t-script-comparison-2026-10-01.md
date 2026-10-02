# CookieYes and c15t script comparison, October 1, 2026

## Known defects (2026-10-02)

CPU throttling applied to the main frame only, not to cross-site iframes. c15t's page loads no iframes. The evidence available here does not show whether CookieYes ran work in a cross-site iframe. If it did, its emulated-mobile timings understate that work. Treat the CookieYes emulated-mobile timings as unverified until a rerun with corrected code. The recorded numbers below are unchanged.

## Conditions

This comparison is separate from the main September 27 and September 30 batches, which exclude CookieYes. The two arms ran under different conditions, so the results are not a product ranking. Differences mix product cost with script hosting, script placement and backend latency.

| Condition | c15t | CookieYes |
| --- | --- | --- |
| Page | `benchmarks/with-c15t-script/index.html` | `benchmarks/with-c15t-script/cookieyes.html` |
| Script source | Self-hosted copy of `@c15t/browser@3.0.0-alpha.3` at `/vendor/c15t.js` | Vendor CDN, `cdn-cookieyes.com` |
| Script placement | Classic script in `<body>`, after the article | Classic script in `<head>`, parser-blocking (the vendor's standard install) |
| Backend | Controlled local test double on the fixture server, fixed 150 ms delay per policy or save response | CookieYes remote services |
| Site ID | Not applicable | `f66d6dffd4f9c8178517db8d4aeddcaa` |

Both arms share the static article page and the plain HTML baseline. c15t releases the two controlled workload scripts through its native script loader. The CookieYes page releases them from the `cookieyes_consent_update` callback, not CookieYes's automatic blocking.

The CookieYes Next.js fixture (`benchmarks/with-cookie-yes`) uses a different site ID, `830009093fab466a1ff5d9a1`, which rejects the local hostname. This page uses another CookieYes site. The repository does not record who registered `f66d6dff…`, its registered URL or its banner settings.

The run configuration used for this comparison was not committed. `benchmarks/cookieyes-script-comparison/run.json` (desktop) and `run-mobile.json` (emulated mobile) reconstruct it from the page sources: the unchanged baseline and c15t fixtures from `run.json`, a CookieYes fixture at `/cookieyes`, and the load, accept and reject scenarios. A one-sample load check of the reconstructed desktop configuration on October 2, 2026 failed with `banner-missing`. The CookieYes script reported that the site's registered URL had changed. The results below cannot currently be reproduced from this repository.

```sh
pnpm cookiebench run --config benchmarks/cookieyes-script-comparison/run.json --scenario load --iterations 30 --warmups 3 --output artifacts/cookieyes-desktop-load.json
pnpm cookiebench run --config benchmarks/cookieyes-script-comparison/run.json --scenario accept --iterations 10 --warmups 0 --output artifacts/cookieyes-desktop-accept.json
pnpm cookiebench run --config benchmarks/cookieyes-script-comparison/run.json --scenario reject --iterations 10 --warmups 0 --output artifacts/cookieyes-desktop-reject.json
```

Use `benchmarks/cookieyes-script-comparison/run-mobile.json` for the emulated-mobile cells.

Raw run artifacts are not stored in this repository. The `artifacts/` paths below name files from the original runs and cannot be checked from this checkout.

## Results

Results were mixed. c15t had lower desktop LCP and earlier banners. CookieYes had lower emulated-mobile LCP.

Compared self-hosted `@c15t/browser@3.0.0-alpha.3` with a 150 ms backend delay against CookieYes's public CDN, ID `f66d6dffd4f9c8178517db8d4aeddcaa`.

Medians in milliseconds. Each cell lists **c15t / CookieYes**.

| Measurement                      |   Desktop | Emulated mobile |
| -------------------------------- | --------: | --------------: |
| Article LCP                      |  88 / 150 |     3288 / 3056 |
| Paired added LCP versus baseline |  +2 / +68 |     +428 / +196 |
| Banner DOM visibility            | 227 / 389 |     1475 / 1570 |
| Accept input-to-next-paint       |   44 / 44 |         56 / 48 |
| Reject input-to-next-paint       |   40 / 48 |         56 / 48 |
| Accept dismissal                 |   32 / 41 |         72 / 43 |
| Reject dismissal                 |   31 / 42 |         75 / 47 |

Each fixture/profile has 30 loads; baseline LCP was 84/2860 ms desktop/mobile. All four comparisons are eligible; c15t's desktop added-LCP interval includes zero. Primary action timings have 10/10 eligible observations. All 80 repeated consent checks verified; 20 c15t mobile attempts lacked byte readings.

The article ran locally. CookieYes used a blocking head script and callback gating; c15t used a body script. Mobile emulation and host CPU contention limit timing conclusions. CookieYes granular save and withdrawal remain unverified.

Structured evidence (`artifacts/comparison-cookieyes-c15t-2026-10-01/reports/independent-summary.json`) retains identities, failures, censored timing denominators and eligibility. CookieYes encoded JavaScript size was unavailable.
