# CookieYes and c15t script comparison

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

[Structured evidence](../artifacts/comparison-cookieyes-c15t-2026-10-01/reports/independent-summary.json) retains identities, failures, censored timing denominators and eligibility. CookieYes encoded JavaScript size was unavailable.
