# October 14 numeric tables

c15t 3.0.0 and nine other CMPs, all measured on the same Vercel Sandbox type (Intel Xeon @ 2.90GHz, Linux), one sandbox per batch entry. Every paired delta uses the row's own no-CMP baseline. Mobile CPU is calibrated to Chrome's mid-tier phone on each sandbox; the CPU column shows the rate each load entry used. See [methodology and limits](README.md).

## Next.js, desktop

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | 1× CPU | 15/15 | 41.8 | 13.3 | 60 | 88 | 108 | +20 | 12 to 28 | +104,034 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | 1× CPU | 15/15 | 223.1 | 4.3 | 40 | 88 | 96 | +8 | 0 to 16 | +98,533 | 11 | 0 | verified / verified / verified / unknown |
| Didomi | 1× CPU | 15/15 | 238.5 | 4.1 | 40 | 88 | 96 | +8 | 0 to 12 | +275,218 | 23 | 0 | verified / verified / verified / verified |
| Enzuzo | 1× CPU | 15/15 | 248.8 | 4.3 | 40 | 88 | 92 | +4 | withheld | +153,060 | 14 | 0 | verified / verified / verified / verified |
| iubenda | 1× CPU | 15/15 | 194.9 | 4.3 | 40 | 88 | 96 | +12 | -4 to 16 | +121,496 | 0 | 0 | verified / verified / verified / verified |
| Ketch | 1× CPU | 15/15 | 1,236.7 | 4.4 | 44 | 88 | 104 | +20 | withheld | +533,059 | 156 | 0 | verified / verified / verified / verified |
| OneTrust | 1× CPU | 15/15 | 406.4 | 4.7 | 44 | 88 | 92 | +4 | 0 to 20 | +211,123 | 0 | 0 | verified / verified / verified / verified |
| Osano | 1× CPU | 15/15 | 334.5 | 4.4 | 40 | 88 | 92 | +4 | 0 to 8 | +84,849 | 0 | 0 | verified / verified / verified / verified |
| Usercentrics | 1× CPU | 15/15 | 265.4 | 4.3 | 40 | 88 | 92 | +4 | -4 to 12 | +164,534 | 0 | 0 | verified / verified / verified / verified |
| CookieYes | 1× CPU | 15/15 | 224.7 | 7 | 48 | 100 | 100 | +4 | -16 to 12 | +30,993 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 16 | 16 | 16 | 16 | 16 | 16 |
| Cookie Control | unavailable | unavailable | unavailable | 16 | 16 | unavailable |
| Didomi | unavailable | 16 | 32 | 16 | 16 | 16 |
| Enzuzo | 16 | 16 | 16 | 16 | 16 | 16 |
| iubenda | 32 | 24 | 16 | 16 | 16 | 16 |
| Ketch | unavailable | 16 | unavailable | 16 | 16 | 16 |
| OneTrust | unavailable | 16 | 16 | 16 | 16 | 16 |
| Osano | 40 | 24 | 32 | 16 | 16 | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | 16 | 16 |
| CookieYes | 16 | 16 | unavailable | 16 | 16 | unavailable |

## Nuxt / Vue, desktop

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | 1× CPU | 15/15 | 32.5 | 11.3 | 52 | 84 | 120 | +36 | 28 to 44 | +112,686 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | 1× CPU | 15/15 | 202.4 | 3.9 | 40 | 84 | 112 | +28 | 4 to 60 | +98,519 | 7 | 0 | verified / verified / verified / unknown |
| Didomi | 1× CPU | 15/15 | 205.8 | 3.9 | 40 | 84 | 180 | +92 | 16 to 112 | +275,216 | 26 | 0 | verified / verified / verified / verified |
| Enzuzo | 1× CPU | 15/15 | 250.5 | 3.7 | 40 | 84 | 88 | 0 | withheld | +153,048 | 18 | 0 | verified / verified / verified / verified |
| iubenda | 1× CPU | 15/15 | 163.3 | 3.9 | 40 | 84 | 108 | +24 | 12 to 32 | +121,490 | 0 | 0 | verified / verified / verified / verified |
| Ketch | 1× CPU | 15/15 | 1,224.4 | 3.8 | 40 | 84 | 92 | +8 | withheld | +533,107 | 149 | 0 | verified / verified / verified / verified |
| OneTrust | 1× CPU | 15/15 | 344.1 | 3.9 | 40 | 84 | 88 | +4 | -4 to 12 | +211,113 | 0 | 0 | verified / verified / verified / verified |
| Osano | 1× CPU | 15/15 | 307.5 | 3.7 | 40 | 84 | 120 | +36 | 20 to 52 | +84,841 | 0 | 0 | verified / verified / verified / unknown |
| Usercentrics | 1× CPU | 15/15 | 224.8 | 3.9 | 40 | 84 | 96 | +12 | 0 to 16 | +164,520 | 0 | 0 | verified / verified / verified / verified |
| CookieYes | 1× CPU | 15/15 | 159 | 5.6 | 40 | 88 | 92 | +4 | -8 to 12 | +30,868 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 16 | 16 | unavailable | 16 | 16 | 16 |
| Cookie Control | 16 | 16 | unavailable | 16 | 16 | unavailable |
| Didomi | unavailable | unavailable | 32 | 16 | 16 | 16 |
| Enzuzo | 16 | 16 | 16 | 16 | 16 | 16 |
| iubenda | unavailable | 24 | 16 | 16 | 16 | 16 |
| Ketch | 16 | unavailable | unavailable | 16 | 16 | 16 |
| OneTrust | 16 | unavailable | 16 | 16 | 16 | 16 |
| Osano | 32 | 24 | 32 | 16 | 16 | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | 16 | 16 |
| CookieYes | 16 | unavailable | unavailable | 16 | 16 | unavailable |

## Astro, desktop

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | 1× CPU | 15/15 | 30.1 | 8.8 | 56 | 80 | 100 | +28 | 12 to 36 | +71,067 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | 1× CPU | 15/15 | 202.1 | 4.4 | 40 | 80 | 84 | +8 | -4 to 56 | +98,412 | 6 | 0 | verified / verified / verified / unknown |
| Didomi | 1× CPU | 15/15 | 212.4 | 4 | 40 | 80 | 92 | +16 | 0 to 104 | +275,117 | 32 | 0 | verified / verified / verified / verified |
| Enzuzo | 1× CPU | 15/15 | 258.3 | 4.4 | 44 | 80 | 84 | +4 | withheld | +152,817 | 22 | 0 | verified / verified / verified / verified |
| iubenda | 1× CPU | 15/15 | 161.2 | 3.9 | 44 | 80 | 88 | +8 | -8 to 28 | +121,387 | 0 | 0 | verified / verified / verified / verified |
| Ketch | 1× CPU | 14/15 | 1,256.7 | 4.3 | 44 | 80 | 80 | 0 | withheld | +532,955 | 170 | 0 | verified / verified / verified / verified |
| OneTrust | 1× CPU | 15/15 | 345 | 4.1 | 40 | 80 | 76 | +4 | -12 to 8 | +211,036 | 0 | 0 | verified / verified / verified / verified |
| Osano | 1× CPU | 15/15 | 285.8 | 4.2 | 44 | 80 | 124 | +44 | 28 to 52 | +84,741 | 1 | 0 | verified / verified / verified / verified |
| Usercentrics | 1× CPU | 15/15 | 231.4 | 3.7 | 40 | 80 | 84 | +4 | -8 to 16 | +164,418 | 0 | 0 | verified / verified / verified / verified |
| CookieYes | 1× CPU | 15/15 | 156 | 5.2 | 40 | 84 | 84 | +4 | -12 to 12 | +30,757 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 16 | unavailable | 32 | 16 | 16 | 16 |
| Cookie Control | 16 | 16 | unavailable | 16 | 16 | unavailable |
| Didomi | 16 | 16 | 48 | 16 | 16 | 16 |
| Enzuzo | 16 | 16 | 16 | 16 | 16 | 16 |
| iubenda | 24 | 16 | 16 | 16 | 16 | 16 |
| Ketch | unavailable | unavailable | 16 | 16 | 16 | 16 |
| OneTrust | 16 | 16 | 16 | 16 | 16 | 16 |
| Osano | 40 | 24 | 32 | 16 | 16 | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | 16 | 16 |
| CookieYes | unavailable | unavailable | unavailable | 16 | 16 | unavailable |

## TanStack Start, desktop

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | 1× CPU | 15/15 | 39.4 | 10.9 | 60 | 88 | 104 | +16 | 4 to 20 | +110,114 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | 1× CPU | 15/15 | 216.4 | 5 | 40 | 88 | 96 | 0 | -4 to 16 | +98,516 | 11 | 0 | verified / verified / verified / unknown |
| Didomi | 1× CPU | 15/15 | 244.9 | 5.2 | 44 | 88 | 96 | +4 | -4 to 12 | +275,179 | 27 | 0 | verified / verified / verified / verified |
| Enzuzo | 1× CPU | 15/15 | 243.2 | 5.5 | 44 | 88 | 92 | +4 | withheld | +152,952 | 17 | 0 | verified / verified / verified / verified |
| iubenda | 1× CPU | 15/15 | 175 | 5.3 | 44 | 88 | 92 | 0 | -12 to 16 | +121,462 | 0 | 0 | verified / verified / verified / verified |
| Ketch | 1× CPU | 15/15 | 1,241.2 | 5.4 | 44 | 88 | 108 | +12 | withheld | +533,026 | 154 | 0 | verified / verified / verified / verified |
| OneTrust | 1× CPU | 15/15 | 360.3 | 5.8 | 44 | 88 | 92 | +4 | -8 to 8 | +211,083 | 0 | 0 | verified / verified / verified / verified |
| Osano | 1× CPU | 15/15 | 437.6 | 5.5 | 44 | 88 | 96 | 0 | -8 to 16 | +84,806 | 0 | 0 | verified / unknown / unknown / unknown |
| Usercentrics | 1× CPU | 15/15 | 265 | 5.3 | 40 | 88 | 88 | 0 | -12 to 20 | +164,489 | 0 | 0 | verified / verified / verified / verified |
| CookieYes | 1× CPU | 15/15 | 182.1 | 7.7 | 48 | 96 | 96 | 0 | -4 to 4 | +30,807 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 16 | unavailable | 16 | 16 | 16 | 16 |
| Cookie Control | unavailable | 16 | unavailable | 16 | 16 | unavailable |
| Didomi | unavailable | 16 | 40 | 16 | 16 | 16 |
| Enzuzo | 16 | 16 | 16 | 16 | 16 | 16 |
| iubenda | 24 | 24 | 16 | 16 | 16 | 16 |
| Ketch | 16 | 16 | 16 | 16 | 16 | 16 |
| OneTrust | 24 | unavailable | 16 | 16 | 16 | 16 |
| Osano | 40 | 24 | 40 | 16 | 16 | 16 |
| Usercentrics | unavailable | 16 | unavailable | 16 | 16 | 16 |
| CookieYes | unavailable | 16 | unavailable | 16 | 16 | unavailable |

## React, desktop

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | 1× CPU | 15/15 | 135.5 | 1.6 | 76 | 112 | 136 | +28 | 20 to 36 | +97,462 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | 1× CPU | 15/15 | 204.4 | 1.7 | 60 | 112 | 156 | +44 | 36 to 56 | +98,404 | 10 | 0 | verified / verified / verified / unknown |
| Didomi | 1× CPU | 15/15 | 219.3 | 1.8 | 64 | 112 | 192 | +84 | 72 to 104 | +275,091 | 32 | 0 | verified / verified / verified / verified |
| Enzuzo | 1× CPU | 15/15 | 236.8 | 1.7 | 64 | 112 | 108 | 0 | withheld | +152,813 | 19 | 0 | verified / verified / verified / verified |
| iubenda | 1× CPU | 15/15 | 163.1 | 1.7 | 60 | 112 | 112 | +4 | -4 to 12 | +121,372 | 0 | 0 | verified / verified / verified / verified |
| Ketch | 1× CPU | 15/15 | 1,251.2 | 1.6 | 60 | 112 | 132 | +24 | withheld | +532,946 | 161 | 0 | verified / verified / verified / verified |
| OneTrust | 1× CPU | 15/15 | 351.3 | 1.5 | 60 | 112 | 112 | +4 | -12 to 8 | +211,018 | 0 | 0 | verified / verified / verified / verified |
| Osano | 1× CPU | 15/15 | 271.9 | 1.8 | 60 | 112 | 124 | +12 | 4 to 24 | +84,731 | 1 | 0 | verified / verified / verified / verified |
| Usercentrics | 1× CPU | 15/15 | 240.5 | 1.7 | 68 | 112 | 116 | +8 | -4 to 12 | +164,380 | 0 | 0 | verified / verified / verified / verified |
| CookieYes | 1× CPU | 15/15 | 156.3 | 3.1 | 60 | 112 | 112 | 0 | -4 to 8 | +30,753 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | unavailable | unavailable | 16 | 16 | 16 | 16 |
| Cookie Control | unavailable | 16 | unavailable | 16 | 16 | unavailable |
| Didomi | unavailable | 16 | 48 | 16 | 16 | 16 |
| Enzuzo | 16 | 16 | 16 | 16 | 16 | 16 |
| iubenda | 32 | unavailable | 16 | 16 | 16 | 16 |
| Ketch | unavailable | 16 | 16 | 16 | 16 | 16 |
| OneTrust | 16 | unavailable | 16 | 16 | 16 | 16 |
| Osano | 32 | 24 | 32 | 16 | 16 | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | 16 | 16 |
| CookieYes | 16 | unavailable | unavailable | 16 | 16 | unavailable |

## Script, desktop

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | 1× CPU | 15/15 | 143.7 | 1.4 | 36 | 88 | 88 | +4 | -4 to 16 | +83,896 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | 1× CPU | 15/15 | 191.7 | 1.5 | 40 | 88 | 140 | +52 | -8 to 64 | +98,415 | 5 | 0 | verified / verified / verified / unknown |
| Didomi | 1× CPU | 15/15 | 202.7 | 1.4 | 36 | 88 | 92 | +4 | -4 to 20 | +275,111 | 29 | 0 | verified / verified / verified / verified |
| Enzuzo | 1× CPU | 15/15 | 211.6 | 1.6 | 40 | 88 | 84 | 0 | withheld | +152,858 | 17 | 0 | verified / verified / verified / verified |
| iubenda | 1× CPU | 15/15 | 147.3 | 1.5 | 40 | 88 | 96 | +12 | -4 to 24 | +121,398 | 0 | 0 | verified / verified / verified / verified |
| Ketch | 1× CPU | 15/15 | 1,212.6 | 1.5 | 36 | 88 | 84 | +4 | withheld | +532,975 | 156 | 0 | verified / verified / verified / verified |
| OneTrust | 1× CPU | 15/15 | 325.7 | 1.4 | 40 | 88 | 84 | 0 | -12 to 8 | +211,034 | 0 | 0 | verified / verified / verified / verified |
| Osano | 1× CPU | 15/15 | 420.5 | 1.4 | 36 | 88 | 116 | +32 | 24 to 52 | +84,759 | 0 | 0 | verified / verified / verified / verified |
| Usercentrics | 1× CPU | 15/15 | 227.6 | 1.6 | 36 | 88 | 92 | +4 | -4 to 16 | +164,397 | 0 | 0 | verified / verified / verified / verified |
| CookieYes | 1× CPU | 15/15 | 135.8 | 2.8 | 36 | 84 | 84 | 0 | -4 to 4 | +30,758 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 16 | 16 | 16 | 16 | 16 | 16 |
| Cookie Control | 16 | 16 | unavailable | 16 | 16 | unavailable |
| Didomi | unavailable | unavailable | 32 | 16 | 16 | 16 |
| Enzuzo | 16 | unavailable | 16 | 16 | 16 | 16 |
| iubenda | 24 | 24 | 16 | 16 | 16 | 16 |
| Ketch | 16 | 16 | unavailable | 16 | 16 | 16 |
| OneTrust | unavailable | unavailable | 16 | 16 | 16 | 16 |
| Osano | 32 | 24 | 32 | 16 | 16 | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | 16 | 16 |
| CookieYes | unavailable | unavailable | unavailable | 16 | 16 | unavailable |

## Next.js, mobile

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | 2.54× CPU | 15/15 | 223.8 | 14.2 | 228 | 3,424 | 3,816 | +392 | 380 to 400 | +104,031 | 37 | 0 | verified / verified / verified / verified |
| Cookie Control | 2.54× CPU | 15/15 | 2,295.1 | 4.4 | 208 | 3,424 | 3,916 | +496 | 476 to 504 | +98,532 | 143 | 0 | verified / verified / verified / unknown |
| Didomi | 2.54× CPU | 15/15 | 4,266.9 | 4.3 | 208 | 3,424 | 4,808 | +1,384 | 1,376 to 1,404 | +275,219 | 186 | 0 | verified / verified / verified / verified |
| Enzuzo | 2.54× CPU | 15/15 | 2,641.4 | 4.5 | 212 | 3,424 | 4,192 | +768 | withheld | +152,938 | 153 | 0 | verified / verified / verified / verified |
| iubenda | 2.54× CPU | 15/15 | 2,483.2 | 4.2 | 212 | 3,424 | 4,036 | +612 | 596 to 624 | +121,494 | 39 | 0 | verified / verified / verified / verified |
| Ketch | 2.54× CPU | 15/15 | 7,372.8 | 4.4 | 212 | 3,424 | 5,184 | +1,764 | withheld | +533,058 | 678 | 0 | verified / verified / verified / verified |
| OneTrust | 2.54× CPU | 15/15 | 3,706.6 | 4.5 | 212 | 3,424 | 3,716 | +292 | 268 to 336 | +211,240 | 90 | 0 | verified / verified / verified / verified |
| Osano | 2.54× CPU | 15/15 | 2,015.7 | 4.5 | 216 | 3,424 | 3,856 | +428 | 420 to 440 | +84,848 | 112 | 0 | verified / failed / failed / verified |
| Usercentrics | 2.54× CPU | 15/15 | 3,934.3 | 4.5 | 212 | 3,424 | 4,308 | +884 | 872 to 904 | +164,531 | 39 | 0 | verified / verified / verified / verified |
| CookieYes | 2.54× CPU | 15/15 | 2,183.3 | 6.3 | 212 | 3,432 | 3,604 | +176 | 172 to 192 | +31,018 | 35 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 32 | 24 | 24 | 16 | 16 | unavailable |
| Cookie Control | 16 | 16 | unavailable | 16 | unavailable | unavailable |
| Didomi | unavailable | 16 | 72 | 16 | unavailable | 16 |
| Enzuzo | 40 | 40 | 32 | 16 | 16 | unavailable |
| iubenda | 24 | 24 | 40 | 16 | 16 | 16 |
| Ketch | 24 | 24 | 24 | 16 | 16 | 16 |
| OneTrust | unavailable | 24 | 40 | unavailable | unavailable | 24 |
| Osano | 72 | 56 | 56 | unavailable | unavailable | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | unavailable | unavailable |
| CookieYes | 16 | 16 | unavailable | 16 | 16 | unavailable |

## Nuxt / Vue, mobile

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | 2.51× CPU | 15/15 | 215.3 | 11.3 | 236 | 3,124 | 3,656 | +532 | 516 to 544 | +112,686 | 29 | 0 | verified / verified / verified / verified |
| Cookie Control | 2.51× CPU | 15/15 | 1,994.1 | 3.7 | 208 | 3,124 | 3,620 | +496 | 480 to 512 | +98,521 | 95 | 0 | verified / verified / verified / unknown |
| Didomi | 2.51× CPU | 15/15 | 3,991.2 | 3.8 | 212 | 3,124 | 4,516 | +1,392 | 1,380 to 1,408 | +275,214 | 151 | 0 | verified / verified / verified / verified |
| Enzuzo | 2.51× CPU | 15/15 | 2,345 | 3.8 | 212 | 3,124 | 3,896 | +768 | withheld | +153,059 | 122 | 0 | verified / verified / verified / verified |
| iubenda | 2.51× CPU | 15/15 | 2,193.8 | 3.8 | 208 | 3,124 | 3,744 | +616 | 596 to 628 | +121,491 | 8 | 0 | verified / verified / verified / verified |
| Ketch | 2.51× CPU | 15/15 | 7,061.8 | 3.8 | 204 | 3,124 | 4,888 | +1,764 | withheld | +533,103 | 628 | 0 | verified / verified / verified / verified |
| OneTrust | 2.51× CPU | 15/15 | 3,557.6 | 3.8 | 208 | 3,124 | 3,564 | +440 | 416 to 464 | +211,241 | 54 | 0 | verified / verified / verified / verified |
| Osano | 2.51× CPU | 15/15 | 1,847.5 | 3.8 | 212 | 3,124 | 3,556 | +428 | 416 to 436 | +84,841 | 74 | 0 | verified / failed / failed / unknown |
| Usercentrics | 2.51× CPU | 15/15 | 3,684.5 | 3.7 | 208 | 3,124 | 4,012 | +888 | 872 to 904 | +164,529 | 0 | 0 | verified / verified / verified / verified |
| CookieYes | 2.35× CPU | 15/15 | 1,132.1 | 6.2 | 220 | 3,140 | 3,312 | +172 | 164 to 176 | +30,891 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 24 | 24 | 16 | unavailable | 16 | 16 |
| Cookie Control | 16 | 16 | unavailable | 16 | 16 | unavailable |
| Didomi | 16 | 16 | 64 | unavailable | 16 | 16 |
| Enzuzo | 48 | 48 | 32 | unavailable | 16 | unavailable |
| iubenda | 32 | 24 | 24 | 16 | unavailable | 16 |
| Ketch | 24 | 24 | 24 | unavailable | 16 | 16 |
| OneTrust | 16 | unavailable | 16 | unavailable | 16 | 24 |
| Osano | 88 | 48 | 56 | unavailable | unavailable | 16 |
| Usercentrics | 16 | unavailable | unavailable | unavailable | 16 | 16 |
| CookieYes | 16 | 16 | unavailable | 16 | 16 | unavailable |

## Astro, mobile

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | 2.58× CPU | 15/15 | 236.2 | 7 | 236 | 2,832 | 3,164 | +336 | 324 to 340 | +71,067 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | 2.58× CPU | 15/15 | 1,710.8 | 3.4 | 204 | 2,832 | 3,332 | +504 | 492 to 508 | +98,411 | 94 | 0 | verified / verified / verified / unknown |
| Didomi | 2.58× CPU | 15/15 | 3,707.2 | 3.7 | 208 | 2,832 | 4,224 | +1,396 | 1,376 to 1,416 | +275,115 | 157 | 0 | verified / verified / verified / verified |
| Enzuzo | 2.58× CPU | 15/15 | 2,075.1 | 3.6 | 208 | 2,832 | 3,604 | +772 | withheld | +152,941 | 123 | 0 | verified / verified / verified / verified |
| iubenda | 2.58× CPU | 15/15 | 2,016.1 | 3.4 | 204 | 2,832 | 3,448 | +620 | 604 to 628 | +121,387 | 13 | 0 | verified / verified / verified / verified |
| Ketch | 2.58× CPU | 15/15 | 6,882.2 | 3.6 | 204 | 2,832 | 4,592 | +1,760 | withheld | +532,950 | 631 | 0 | verified / verified / verified / verified |
| OneTrust | 2.58× CPU | 15/15 | 3,371.8 | 3.6 | 208 | 2,832 | 3,380 | +548 | 536 to 592 | +211,138 | 61 | 0 | verified / verified / verified / verified |
| Osano | 2.58× CPU | 15/15 | 1,565.9 | 3.6 | 208 | 2,832 | 3,268 | +436 | 424 to 448 | +84,741 | 72 | 0 | verified / failed / failed / verified |
| Usercentrics | 2.58× CPU | 15/15 | 3,439.9 | 3.5 | 208 | 2,832 | 3,716 | +884 | 868 to 896 | +164,426 | 1 | 0 | verified / verified / verified / verified |
| CookieYes | 2.47× CPU | 15/15 | 943.5 | 5.6 | 212 | 2,840 | 3,024 | +180 | 168 to 188 | +30,802 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 24 | 16 | 32 | unavailable | unavailable | 16 |
| Cookie Control | 16 | 24 | unavailable | unavailable | unavailable | unavailable |
| Didomi | unavailable | 16 | 72 | 16 | 16 | unavailable |
| Enzuzo | 32 | 32 | 24 | 16 | unavailable | unavailable |
| iubenda | 16 | 32 | 32 | unavailable | unavailable | 16 |
| Ketch | 24 | 24 | 24 | unavailable | 16 | unavailable |
| OneTrust | unavailable | unavailable | 16 | unavailable | unavailable | 16 |
| Osano | 88 | 56 | 64 | unavailable | unavailable | 16 |
| Usercentrics | unavailable | unavailable | unavailable | unavailable | 16 | 16 |
| CookieYes | 16 | 16 | unavailable | 16 | 16 | unavailable |

## TanStack Start, mobile

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | 2.29× CPU | 15/15 | 236.5 | 10.9 | 236 | 3,300 | 3,736 | +436 | 428 to 448 | +110,114 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | 2.29× CPU | 15/15 | 2,156.9 | 5.5 | 208 | 3,300 | 3,796 | +500 | 488 to 508 | +98,516 | 93 | 0 | verified / verified / verified / unknown |
| Didomi | 2.29× CPU | 15/15 | 4,057.2 | 5.3 | 204 | 3,300 | 4,688 | +1,392 | 1,376 to 1,404 | +275,178 | 127 | 0 | verified / verified / verified / verified |
| Enzuzo | 2.29× CPU | 15/15 | 2,496.2 | 5.6 | 204 | 3,300 | 4,064 | +768 | withheld | +153,020 | 105 | 0 | verified / verified / verified / verified |
| iubenda | 2.29× CPU | 15/15 | 2,396.4 | 5.3 | 204 | 3,300 | 3,912 | +616 | 604 to 624 | +121,470 | 5 | 0 | verified / verified / verified / verified |
| Ketch | 2.29× CPU | 15/15 | 7,201.8 | 5.6 | 204 | 3,300 | 5,060 | +1,764 | withheld | +533,019 | 578 | 0 | verified / verified / verified / verified |
| OneTrust | 2.29× CPU | 15/15 | 3,570.6 | 5.4 | 204 | 3,300 | 3,580 | +284 | 264 to 296 | +211,202 | 37 | 0 | verified / verified / verified / verified |
| Osano | 2.29× CPU | 15/15 | 1,862.5 | 5.5 | 204 | 3,300 | 3,724 | +428 | 424 to 436 | +84,806 | 60 | 0 | verified / unknown / failed / unknown |
| Usercentrics | 2.29× CPU | 15/15 | 3,824.5 | 5.4 | 204 | 3,300 | 4,184 | +884 | 872 to 896 | +164,490 | 0 | 0 | verified / verified / verified / verified |
| CookieYes | 2.5× CPU | 15/15 | 1,071.5 | 7.5 | 220 | 3,308 | 3,492 | +180 | 164 to 196 | +30,835 | 1 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 32 | 24 | 24 | 16 | 16 | 16 |
| Cookie Control | 16 | 16 | unavailable | 16 | unavailable | unavailable |
| Didomi | unavailable | unavailable | 64 | unavailable | unavailable | 16 |
| Enzuzo | 48 | 48 | 24 | unavailable | 16 | 16 |
| iubenda | 24 | 32 | 24 | 16 | 16 | 16 |
| Ketch | 24 | 24 | 24 | 16 | 16 | 16 |
| OneTrust | unavailable | 24 | 24 | unavailable | 24 | 40 |
| Osano | 80 | 56 | 56 | unavailable | unavailable | 16 |
| Usercentrics | 16 | unavailable | unavailable | unavailable | 16 | 16 |
| CookieYes | 16 | 16 | unavailable | 16 | unavailable | unavailable |

## React, mobile

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | 2.54× CPU | 15/15 | 1,138.2 | 1.4 | 1,088 | 3,320 | 3,868 | +540 | 528 to 556 | +97,462 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | 2.54× CPU | 15/15 | 1,549.3 | 1.5 | 940 | 3,320 | 3,628 | +300 | 288 to 320 | +98,404 | 115 | 0 | verified / verified / verified / unknown |
| Didomi | 2.54× CPU | 15/15 | 3,613.1 | 1.5 | 944 | 3,320 | 4,592 | +1,264 | 1,252 to 1,300 | +275,096 | 162 | 0 | verified / verified / verified / verified |
| Enzuzo | 2.54× CPU | 15/15 | 1,897.8 | 1.5 | 932 | 3,320 | 3,900 | +576 | withheld | +152,967 | 125 | 0 | verified / verified / verified / verified |
| iubenda | 2.54× CPU | 15/15 | 1,849.5 | 1.5 | 788 | 3,320 | 3,748 | +424 | 412 to 444 | +121,372 | 9 | 0 | verified / verified / verified / verified |
| Ketch | 2.54× CPU | 15/15 | 7,038.3 | 1.5 | 784 | 3,320 | 5,196 | +1,868 | withheld | +532,951 | 672 | 0 | verified / verified / verified / verified |
| OneTrust | 2.54× CPU | 15/15 | 3,408.2 | 1.5 | 776 | 3,320 | 3,416 | +92 | 72 to 140 | +211,138 | 57 | 0 | verified / verified / verified / verified |
| Osano | 2.54× CPU | 15/15 | 1,541.2 | 1.5 | 1,044 | 3,320 | 3,816 | +492 | 476 to 508 | +84,732 | 87 | 0 | verified / failed / failed / verified |
| Usercentrics | 2.54× CPU | 15/15 | 3,288.2 | 1.4 | 788 | 3,320 | 4,020 | +700 | 684 to 708 | +164,411 | 3 | 0 | verified / verified / verified / verified |
| CookieYes | 2.42× CPU | 15/15 | 988.4 | 2.9 | 796 | 3,324 | 3,492 | +172 | 152 to 180 | +30,776 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 24 | 24 | 24 | unavailable | 16 | unavailable |
| Cookie Control | 24 | 24 | unavailable | unavailable | unavailable | unavailable |
| Didomi | unavailable | unavailable | 64 | unavailable | unavailable | 16 |
| Enzuzo | 32 | 32 | 32 | 16 | 16 | 16 |
| iubenda | 16 | 24 | 32 | 16 | 16 | unavailable |
| Ketch | 24 | 24 | 24 | unavailable | 16 | unavailable |
| OneTrust | 16 | unavailable | 16 | unavailable | 16 | 24 |
| Osano | 72 | 72 | 56 | unavailable | unavailable | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | 16 | 16 |
| CookieYes | 16 | 16 | unavailable | 16 | 16 | unavailable |

## Script, mobile

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | 2.54× CPU | 15/15 | 1,437.6 | 1.3 | 200 | 2,852 | 3,292 | +444 | 424 to 456 | +83,896 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | 2.54× CPU | 15/15 | 1,709.6 | 1.5 | 208 | 2,852 | 3,344 | +496 | 480 to 504 | +98,413 | 94 | 0 | verified / verified / verified / unknown |
| Didomi | 2.54× CPU | 15/15 | 3,714.4 | 1.4 | 204 | 2,852 | 4,240 | +1,388 | 1,376 to 1,404 | +275,111 | 152 | 0 | verified / verified / verified / verified |
| Enzuzo | 2.54× CPU | 15/15 | 2,108.7 | 1.4 | 208 | 2,852 | 3,616 | +768 | withheld | +152,869 | 127 | 0 | verified / verified / verified / verified |
| iubenda | 2.54× CPU | 15/15 | 2,051.6 | 1.5 | 212 | 2,852 | 3,468 | +616 | 604 to 624 | +121,398 | 15 | 0 | verified / verified / verified / verified |
| Ketch | 2.54× CPU | 15/15 | 6,941.8 | 1.5 | 220 | 2,852 | 4,612 | +1,764 | withheld | +532,973 | 629 | 0 | verified / verified / verified / verified |
| OneTrust | 2.54× CPU | 15/15 | 3,385.2 | 1.5 | 212 | 2,852 | 3,392 | +544 | 520 to 584 | +211,159 | 54 | 0 | verified / verified / verified / verified |
| Osano | 2.54× CPU | 15/15 | 1,572 | 1.4 | 208 | 2,852 | 3,280 | +428 | 416 to 440 | +84,759 | 72 | 0 | verified / failed / failed / verified |
| Usercentrics | 2.54× CPU | 15/15 | 3,455.3 | 1.5 | 212 | 2,852 | 3,740 | +892 | 860 to 900 | +164,417 | 3 | 0 | verified / verified / verified / verified |
| CookieYes | 2.46× CPU | 15/15 | 944.1 | 3 | 216 | 2,860 | 3,036 | +176 | 168 to 184 | +30,781 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 24 | 16 | 24 | 16 | 16 | 16 |
| Cookie Control | 24 | 16 | unavailable | unavailable | 16 | unavailable |
| Didomi | unavailable | 16 | 72 | unavailable | 16 | 16 |
| Enzuzo | 32 | 24 | 24 | unavailable | 16 | unavailable |
| iubenda | 32 | 16 | 32 | 16 | 16 | 16 |
| Ketch | 24 | 24 | 24 | 16 | 16 | 16 |
| OneTrust | unavailable | unavailable | 16 | unavailable | unavailable | 24 |
| Osano | 72 | 56 | 72 | unavailable | unavailable | unavailable |
| Usercentrics | unavailable | unavailable | 16 | unavailable | unavailable | 16 |
| CookieYes | 16 | 16 | unavailable | 16 | 16 | unavailable |

## Collector overhead

Minimal versus full collector on the reference page with no CMP, 15 pairs per profile. Report it beside the CMP rows; do not subtract it from them.

### desktop, 1× CPU

| Metric, ms | Minimal | Full | Paired delta | Adjusted CI |
| --- | ---: | ---: | ---: | --- |
| Task duration | 14 | 29.4 | +15.5 | 12.8 to 18.8 |
| Script duration | 1.2 | 6.7 | +5.5 | 4.8 to 6.1 |
| Layout duration | 1.8 | 1.6 | -0.2 | -0.8 to 0 |
| LCP | 32 | 28 | -4 | -8 to 4 |
| Observed window | 1,002.7 | 1,002.7 | +0.3 | -0.6 to 1 |

### mobile, 2.26× CPU

| Metric, ms | Minimal | Full | Paired delta | Adjusted CI |
| --- | ---: | ---: | ---: | --- |
| Task duration | 37.1 | 63.4 | +26.2 | 21.5 to 36 |
| Script duration | 2.9 | 14 | +11.1 | 9.7 to 12.5 |
| Layout duration | 5.8 | 5.6 | -0.5 | -1.7 to 0.9 |
| LCP | 356 | 364 | +8 | 0 to 16 |
| Observed window | 1,003.2 | 1,003.1 | -0.2 | -0.6 to 0.8 |

