# V3 one-attempt action evidence

Historical evidence: [the browser measurement audit](audit-vitals-actions.md) confirmed that stale animation-frame timestamps can understate these action durations or make them unavailable. Event attribution can also miss a reportable keyup or click. Preserve these rows for diagnosis; use fresh runs of the corrected collector for performance claims. Original pass labels below describe the old scenario checks.

Each row retains one candidate attempt, with a separate nested browser attempt for the page followup. Values are milliseconds, without baseline subtraction or percentile claims. Effective consent and dismissal are primary-attempt durations from the actual input timestamp. The followup Event Timing value and page-handler delay belong to the nested attempt, not the primary one. The handler delay is the recorded page callback timestamp minus its captured page-input timestamp; it is not a paint metric.

`unavailable` stays missing. Event Timing values below 16 ms may be censored; missing values must not become zero. All measured zeroes are retained. Failed rows may still contain observed durations, which do not make the overall scenario successful. Raw sample IDs, reasons, measurement methods, and failures are in the [selected machine-readable summary](../artifacts/v3-2026-09-27-body-correction/report-final/summary.json).

| Fixture | Scenario | Probe offset | Status | Primary next paint | Effective | Dismissed | Followup next paint | Page handler delay |
| --- | --- | --: | --- | --: | --: | --: | --: | --: |
| c15t headless | accept | 500 | passed / probe passed | 40 | 10.5 | 60.6 | unavailable | 1.5 |
| c15t headless | reject | 500 | passed / probe passed | 32 | unavailable | 32.7 | 16 | 1.2 |
| c15t headless | save | 500 | passed / probe passed | 16 | 9.7 | 26.4 | 16 | 0.6 |
| c15t headless | preferences | 500 | passed | 32 | unavailable | unavailable | unavailable | unavailable |
| c15t headless | withdraw | 500 | passed / probe passed | 16 | 13.3 | 29.9 | unavailable | 0.5 |
| c15t headless | reject-keyboard | 500 | passed / probe passed | 24 | 15.7 | 32.4 | unavailable | 0.2 |
| c15t headless | save-page-probe-100ms | 100 | passed / probe passed | 16 | 10.3 | 27 | 16 | 0.7 |
| c15t script | accept | 500 | passed / probe passed | 40 | 10.8 | 10.8 | unavailable | 0.4 |
| c15t script | reject | 500 | passed / probe passed | 48 | 15.5 | 15.5 | 16 | 0.4 |
| c15t script | save | 500 | passed / probe passed | 48 | 7.5 | 174.2 | 16 | 0.7 |
| c15t script | preferences | 500 | passed | 56 | unavailable | unavailable | unavailable | unavailable |
| c15t script | withdraw | 500 | passed / probe passed | 56 | 9.7 | 176.4 | unavailable | 1 |
| c15t script | reject-keyboard | 500 | passed / probe passed | unavailable | unavailable | unavailable | 16 | 0.5 |
| c15t script | save-page-probe-100ms | 100 | failed / probe failed | 40 | 5.5 | 172.2 | unavailable | unavailable |
| c15t React | accept | 500 | passed / probe passed | 40 | 10.3 | 10.3 | unavailable | 0.9 |
| c15t React | reject | 500 | passed / probe passed | 24 | unavailable | unavailable | 16 | 0.9 |
| c15t React | save | 500 | passed / probe passed | 16 | 9.9 | 26.5 | 16 | 1.1 |
| c15t React | preferences | 500 | passed | 32 | unavailable | unavailable | unavailable | unavailable |
| c15t React | withdraw | 500 | passed / probe passed | 16 | 7.7 | 24.3 | 16 | 0.6 |
| c15t React | reject-keyboard | 500 | passed / probe passed | 16 | 12.4 | 12.4 | unavailable | 0.4 |
| c15t React | save-page-probe-100ms | 100 | passed / probe passed | unavailable | 8.9 | 25.5 | 16 | 0.6 |
| c15t Next | accept | 500 | passed / probe passed | 48 | 9.7 | 9.7 | unavailable | 1 |
| c15t Next | reject | 500 | passed / probe passed | 40 | 0.4 | 0.4 | unavailable | 0.8 |
| c15t Next | save | 500 | passed / probe passed | 16 | 8.2 | 24.9 | unavailable | 1.1 |
| c15t Next | preferences | 500 | passed | 32 | unavailable | 1.2 | unavailable | unavailable |
| c15t Next | withdraw | 500 | passed / probe passed | 16 | 9.3 | 25.9 | unavailable | 1 |
| c15t Next | reject-keyboard | 500 | passed / probe passed | 24 | 15.6 | 15.6 | 16 | 0.4 |
| c15t Next | save-page-probe-100ms | 100 | passed / probe passed | unavailable | 9 | 25.7 | 16 | 1 |
| c15t Vue | accept | 500 | passed / probe passed | 32 | 4.1 | 4.1 | 16 | 0.4 |
| c15t Vue | reject | 500 | passed / probe passed | 40 | 7.4 | 7.4 | 16 | 0.9 |
| c15t Vue | save | 500 | passed / probe passed | 16 | 6.9 | 23.5 | 16 | 0.9 |
| c15t Vue | preferences | 500 | passed | 40 | unavailable | 10.1 | unavailable | unavailable |
| c15t Vue | withdraw | 500 | passed / probe passed | 16 | 8 | 24.6 | 16 | 1.2 |
| c15t Vue | reject-keyboard | 500 | passed / probe passed | unavailable | 7.4 | 7.4 | unavailable | 0.3 |
| c15t Vue | save-page-probe-100ms | 100 | passed / probe passed | 16 | 9 | 25.7 | 16 | 0.5 |
| c15t Vue | accept-early | 500 | passed / probe passed | 40 | 9.6 | 9.6 | 16 | 1.1 |
| c15t Vue | accept-large | 500 | passed / probe passed | 40 | 9 | 9 | 16 | 0.9 |
| c15t Vue | save-post-dismissal | 500 | passed / probe passed | 16 | 9.7 | 26.4 | 16 | 1 |
| c15t Nuxt | accept | 500 | passed / probe passed | 32 | 2.9 | 102.8 | 16 | 0.7 |
| c15t Nuxt | reject | 500 | passed / probe passed | 40 | 11.9 | 111.9 | unavailable | 0.7 |
| c15t Nuxt | save | 500 | passed / probe passed | 16 | 8.8 | 25.4 | 16 | 0.4 |
| c15t Nuxt | preferences | 500 | passed | 40 | unavailable | unavailable | unavailable | unavailable |
| c15t Nuxt | withdraw | 500 | passed / probe passed | 16 | 6.8 | 23.5 | 16 | 0.4 |
| c15t Nuxt | reject-keyboard | 500 | passed / probe passed | 16 | 11 | 94.3 | 16 | 0.2 |
| c15t Nuxt | save-page-probe-100ms | 100 | passed / probe passed | 16 | 10 | 26.8 | 16 | 0.5 |
| c15t Nuxt | accept-early | 500 | passed / probe passed | 48 | 14.5 | 114.5 | 16 | 0.7 |
| c15t Nuxt | accept-large | 500 | passed / probe passed | 40 | 11.7 | 111.6 | 16 | 0.7 |
| c15t Nuxt | save-post-dismissal | 500 | passed / probe passed | 16 | 9.3 | 26.1 | unavailable | 0.8 |
| c15t Astro | accept | 500 | passed / probe passed | 32 | 3.9 | 3.9 | unavailable | 0.8 |
| c15t Astro | reject | 500 | passed / probe passed | 24 | 3.2 | 3.2 | unavailable | 0.6 |
| c15t Astro | save | 500 | passed / probe passed | 16 | 8.6 | 25.2 | unavailable | 1.1 |
| c15t Astro | preferences | 500 | passed | 32 | unavailable | unavailable | unavailable | unavailable |
| c15t Astro | withdraw | 500 | failed / probe failed | 24 | 9.9 | 26.6 | unavailable | 0.7 |
| c15t Astro | reject-keyboard | 500 | passed / probe passed | 16 | 9.6 | 9.6 | 16 | 0.3 |
| c15t Astro | save-page-probe-100ms | 100 | passed / probe passed | 16 | 9.2 | 25.9 | 16 | 0.5 |
| c15t Astro | accept-early | 500 | passed / probe passed | 40 | 8.8 | 8.8 | unavailable | 1 |
| c15t Astro | accept-large | 500 | passed / probe passed | 32 | 7.7 | 7.7 | 16 | 0.4 |
| c15t Astro | save-post-dismissal | 500 | passed / probe passed | 16 | 9.3 | 26 | 16 | 0.9 |
| c15t TanStack Start | accept | 500 | passed / probe passed | 48 | 14.4 | 14.4 | unavailable | 1 |
| c15t TanStack Start | reject | 500 | passed / probe passed | 48 | 15.1 | 15.1 | unavailable | 0.9 |
| c15t TanStack Start | save | 500 | passed / probe passed | unavailable | 7.8 | 24.4 | 16 | 0.6 |
| c15t TanStack Start | preferences | 500 | passed | 32 | unavailable | 5 | unavailable | unavailable |
| c15t TanStack Start | withdraw | 500 | passed / probe passed | 16 | 7.4 | 24.1 | unavailable | 0.8 |
| c15t TanStack Start | reject-keyboard | 500 | passed / probe passed | unavailable | 2.3 | 2.3 | 16 | 0.3 |
| c15t TanStack Start | save-page-probe-100ms | 100 | passed / probe passed | 16 | 9.5 | 26.1 | 16 | 0.6 |
| Civic Cookie Control | accept | 500 | passed / probe passed | 48 | 29.6 | 13 | 16 | 0.6 |
| Civic Cookie Control | reject | 500 | passed / probe passed | 32 | 23.2 | 6.5 | 16 | 0.5 |
| Civic Cookie Control | save | 500 | incomplete / probe incomplete | unavailable | unavailable | unavailable | unavailable | unavailable |
| Civic Cookie Control | preferences | 500 | incomplete | unavailable | unavailable | unavailable | unavailable | unavailable |
| Civic Cookie Control | withdraw | 500 | passed / probe passed | 16 | 23.6 | 7 | 16 | 1.1 |
| Civic Cookie Control | reject-keyboard | 500 | passed / probe passed | unavailable | 16.9 | 0.2 | 16 | 0.2 |
| Civic Cookie Control | save-page-probe-100ms | 100 | incomplete / probe incomplete | unavailable | unavailable | unavailable | unavailable | unavailable |
| Didomi | accept | 500 | passed / probe passed | 32 | 56.8 | 40.2 | unavailable | 0.8 |
| Didomi | reject | 500 | passed / probe passed | 32 | 52.3 | 35.6 | unavailable | 0.5 |
| Didomi | save | 500 | passed / probe passed | 24 | 24 | 24 | 16 | 0.9 |
| Didomi | preferences | 500 | passed | 32 | unavailable | unavailable | unavailable | unavailable |
| Didomi | withdraw | 500 | passed / probe passed | 16 | 17.6 | 17.6 | unavailable | 1.7 |
| Didomi | reject-keyboard | 500 | passed / probe passed | unavailable | 20 | 20 | 16 | 0.3 |
| Didomi | save-page-probe-100ms | 100 | passed / probe passed | 16 | 25.2 | 25.2 | 16 | 0.7 |
| Enzuzo | accept | 500 | passed / probe passed | 40 | 32.2 | 15.6 | 16 | 1.4 |
| Enzuzo | reject | 500 | passed / probe passed | 40 | 20.1 | 3.5 | unavailable | 1.2 |
| Enzuzo | save | 500 | passed / probe passed | 16 | 25.5 | 8.8 | unavailable | 1.1 |
| Enzuzo | preferences | 500 | incomplete | unavailable | unavailable | unavailable | unavailable | unavailable |
| Enzuzo | withdraw | 500 | passed / probe passed | unavailable | 17 | 0.3 | unavailable | 1.2 |
| Enzuzo | reject-keyboard | 500 | passed / probe passed | unavailable | 22 | 5.4 | unavailable | 0.3 |
| Enzuzo | save-page-probe-100ms | 100 | passed / probe passed | 16 | 24.3 | 7.7 | 16 | 0.5 |
| iubenda | accept | 500 | passed / probe passed | 16 | 27.3 | 27.3 | 16 | 1.4 |
| iubenda | reject | 500 | passed / probe passed | unavailable | 16.9 | 16.9 | unavailable | 1.3 |
| iubenda | save | 500 | passed / probe passed | 16 | 8.7 | 8.7 | unavailable | 1 |
| iubenda | preferences | 500 | passed | unavailable | unavailable | unavailable | unavailable | unavailable |
| iubenda | withdraw | 500 | passed / probe passed | 16 | 9.5 | 9.5 | unavailable | 1.5 |
| iubenda | reject-keyboard | 500 | passed / probe passed | 16 | 32.6 | 32.6 | 16 | 0.2 |
| iubenda | save-page-probe-100ms | 100 | passed / probe passed | 16 | 9.3 | 9.3 | 16 | 0.7 |
| Ketch | accept | 500 | passed / probe passed | 48 | 381.1 | 14.4 | unavailable | 1.2 |
| Ketch | reject | 500 | passed / probe passed | 40 | 474.3 | 7.6 | 16 | 1 |
| Ketch | save | 500 | incomplete | unavailable | unavailable | unavailable | unavailable | unavailable |
| Ketch | preferences | 500 | incomplete | unavailable | unavailable | unavailable | unavailable | unavailable |
| Ketch | withdraw | 500 | incomplete | unavailable | unavailable | unavailable | unavailable | unavailable |
| Ketch | reject-keyboard | 500 | passed / probe passed | 40 | 408.1 | 8.1 | 16 | 0.2 |
| Ketch | save-page-probe-100ms | 100 | incomplete | unavailable | unavailable | unavailable | unavailable | unavailable |
| OneTrust test | accept | 500 | passed / probe passed | 48 | 39.8 | 439.8 | 32 | 0.6 |
| OneTrust test | reject | 500 | passed / probe passed | 48 | 44.2 | 444.2 | 32 | 1 |
| OneTrust test | save | 500 | passed / probe passed | 32 | 24.1 | 424.1 | 40 | 1.7 |
| OneTrust test | preferences | 500 | passed | 32 | unavailable | unavailable | unavailable | unavailable |
| OneTrust test | withdraw | 500 | passed / probe passed | 48 | 28.4 | 395.1 | 24 | 0.6 |
| OneTrust test | reject-keyboard | 500 | passed / probe passed | 16 | 22.1 | 422 | 16 | 0.2 |
| OneTrust test | save-page-probe-100ms | 100 | failed / probe failed | 32 | 24.3 | 424.3 | unavailable | unavailable |
| Osano | accept | 500 | passed / probe passed | 64 | 11.1 | 27.8 | unavailable | 1.1 |
| Osano | reject | 500 | passed / probe passed | 48 | 15.7 | 15.7 | unavailable | 1 |
| Osano | save | 500 | passed / probe passed | 16 | 7.5 | 224.1 | 16 | 1.1 |
| Osano | preferences | 500 | passed | 72 | unavailable | 16 | unavailable | unavailable |
| Osano | withdraw | 500 | passed / probe passed | 16 | 7.1 | 207.2 | unavailable | 0.6 |
| Osano | reject-keyboard | 500 | passed / probe passed | 16 | 9.5 | 26.2 | unavailable | 0.3 |
| Osano | save-page-probe-100ms | 100 | failed / probe failed | 16 | 8.3 | 224.9 | unavailable | unavailable |
| Usercentrics | accept | 500 | failed / probe failed | unavailable | unavailable | unavailable | unavailable | unavailable |
| Usercentrics | reject | 500 | failed / probe failed | unavailable | unavailable | unavailable | unavailable | unavailable |
| Usercentrics | save | 500 | failed / probe failed | unavailable | unavailable | unavailable | unavailable | unavailable |
| Usercentrics | preferences | 500 | failed | unavailable | unavailable | unavailable | unavailable | unavailable |
| Usercentrics | withdraw | 500 | incomplete | unavailable | unavailable | unavailable | unavailable | unavailable |
| Usercentrics | reject-keyboard | 500 | failed / probe failed | unavailable | unavailable | unavailable | unavailable | unavailable |
| Usercentrics | save-page-probe-100ms | 100 | failed / probe failed | unavailable | unavailable | unavailable | unavailable | unavailable |
