# Merged numeric tables

c15t 3.0.0-alpha.11 on Apple M1 Pro/macOS. Competitors from the previous full scan on AMD Ryzen 7 2700/Linux. Timings do not establish a same-machine ranking. Every paired delta uses the row's own baseline. See [methodology and limits](README.md).

## Next.js, desktop

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | Source CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | M1 Pro | 15/15 | 26.5 | 8.8 | 44 | 84 | 92 | +8 | 8 to 16 | +103,933 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | Ryzen 2700 | 15/15 | 384.7 | 5.7 | 64 | 120 | 128 | +8 | -16 to 20 | +98,534 | 1 | 0 | verified / verified / verified / unknown |
| Didomi | Ryzen 2700 | 15/15 | 465.9 | 5.8 | 68 | 120 | 120 | -4 | -16 to 12 | +252,915 | 52 | 0 | verified / verified / verified / verified |
| Enzuzo | Ryzen 2700 | 15/15 | 476.8 | 5.6 | 64 | 120 | 124 | +4 | withheld | +153,159 | 39 | 0 | verified / verified / verified / verified |
| iubenda | Ryzen 2700 | 15/15 | 431.2 | 5.7 | 64 | 120 | 120 | -4 | -16 to 12 | +121,550 | 0 | 0 | verified / verified / verified / verified |
| Ketch | Ryzen 2700 | 15/15 | 1,680.1 | 5.4 | 60 | 120 | 116 | 0 | withheld | +532,187 | 172 | 0 | verified / verified / verified / verified |
| OneTrust | Ryzen 2700 | 15/15 | 629.4 | 5.8 | 60 | 120 | 124 | +4 | -20 to 20 | +211,148 | 1 | 0 | verified / verified / verified / verified |
| Osano | Ryzen 2700 | 15/15 | 643.8 | 6.3 | 68 | 120 | 120 | 0 | -20 to 20 | +86,914 | 1 | 0 | verified / verified / verified / verified |
| Usercentrics | Ryzen 2700 | 15/15 | 671.7 | 5.3 | 64 | 120 | 120 | 0 | -16 to 16 | +164,178 | 50 | 0 | verified / verified / verified / verified |
| CookieYes | Ryzen 2700 | 15/15 | 387.2 | 8.1 | 64 | 128 | 132 | -4 | -12 to 24 | +30,966 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 40 | 40 | 16 | 16 | unavailable | unavailable |
| Cookie Control | 16 | 24 | unavailable | 16 | 16 | unavailable |
| Didomi | 16 | unavailable | 40 | 16 | 16 | 16 |
| Enzuzo | 24 | 16 | 16 | 16 | 16 | 16 |
| iubenda | 16 | 16 | 32 | 16 | 16 | 16 |
| Ketch | 40 | 16 | 16 | 16 | 16 | 16 |
| OneTrust | 24 | 24 | 32 | 16 | 16 | 32 |
| Osano | 32 | 24 | 48 | 16 | 16 | 16 |
| Usercentrics | 16 | unavailable | unavailable | 16 | 16 | 16 |
| CookieYes | 16 | 16 | unavailable | 16 | 16 | unavailable |

## Nuxt / Vue, desktop

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | Source CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | M1 Pro | 15/15 | 17 | 7 | 36 | 84 | 104 | +20 | 8 to 24 | +112,569 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | Ryzen 2700 | 15/15 | 397.2 | 5.1 | 44 | 108 | 116 | +4 | -16 to 20 | +98,519 | 28 | 0 | verified / verified / verified / unknown |
| Didomi | Ryzen 2700 | 15/15 | 471.8 | 5.5 | 56 | 108 | 112 | +4 | -8 to 20 | +252,911 | 59 | 0 | verified / verified / verified / verified |
| Enzuzo | Ryzen 2700 | 15/15 | 480.4 | 5.2 | 52 | 108 | 116 | +4 | withheld | +153,172 | 43 | 0 | verified / verified / verified / verified |
| iubenda | Ryzen 2700 | 15/15 | 430 | 5.7 | 44 | 108 | 108 | -4 | -16 to 16 | +121,543 | 0 | 0 | verified / verified / verified / verified |
| Ketch | Ryzen 2700 | 15/15 | 1,630.3 | 5.7 | 48 | 108 | 112 | 0 | withheld | +532,205 | 177 | 0 | verified / verified / verified / verified |
| OneTrust | Ryzen 2700 | 15/15 | 639.9 | 5.4 | 44 | 108 | 108 | 0 | -16 to 20 | +211,143 | 1 | 0 | verified / verified / verified / verified |
| Osano | Ryzen 2700 | 14/15 | 670.8 | 5.4 | 46 | 108 | 112 | +2 | withheld | +84,880 | 17 | 0 | verified / verified / verified / unknown |
| Usercentrics | Ryzen 2700 | 15/15 | 692.1 | 5.8 | 52 | 108 | 116 | +4 | -12 to 16 | +164,179 | 52 | 0 | verified / verified / verified / verified |
| CookieYes | Ryzen 2700 | 15/15 | 283.6 | 7.1 | 44 | 124 | 120 | -4 | -20 to 16 | +30,872 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 40 | 32 | 16 | unavailable | unavailable | 16 |
| Cookie Control | 16 | 16 | unavailable | 16 | 16 | unavailable |
| Didomi | 16 | unavailable | 32 | 16 | 16 | 16 |
| Enzuzo | 16 | 16 | 24 | 16 | 16 | 16 |
| iubenda | 24 | 24 | 24 | 16 | 16 | 16 |
| Ketch | 16 | 24 | 16 | 16 | 16 | 16 |
| OneTrust | 16 | 16 | 24 | 16 | 16 | 32 |
| Osano | 48 | 24 | 40 | 16 | 16 | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | 16 | 16 |
| CookieYes | unavailable | 16 | unavailable | 16 | 16 | unavailable |

## Astro, desktop

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | Source CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | M1 Pro | 15/15 | 14.6 | 5.1 | 36 | 76 | 84 | +8 | 4 to 16 | +70,993 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | Ryzen 2700 | 15/15 | 402 | 4.5 | 56 | 92 | 96 | 0 | -8 to 24 | +98,412 | 27 | 0 | verified / verified / verified / unknown |
| Didomi | Ryzen 2700 | 15/15 | 432.6 | 4.9 | 64 | 92 | 108 | +12 | 0 to 40 | +252,808 | 52 | 0 | verified / verified / verified / verified |
| Enzuzo | Ryzen 2700 | 15/15 | 411.8 | 5.1 | 64 | 92 | 96 | +8 | withheld | +153,071 | 44 | 0 | verified / verified / verified / verified |
| iubenda | Ryzen 2700 | 15/15 | 434 | 5.1 | 68 | 92 | 100 | +4 | -8 to 28 | +121,440 | 0 | 0 | verified / verified / verified / verified |
| Ketch | Ryzen 2700 | 15/15 | 1,663.5 | 5.2 | 68 | 92 | 100 | +8 | withheld | +532,082 | 176 | 0 | verified / verified / verified / verified |
| OneTrust | Ryzen 2700 | 15/15 | 655 | 4.5 | 64 | 92 | 96 | +4 | -8 to 16 | +211,041 | 1 | 0 | verified / verified / verified / verified |
| Osano | Ryzen 2700 | 15/15 | 648.5 | 4.7 | 60 | 92 | 108 | +12 | -4 to 32 | +86,814 | 20 | 0 | verified / verified / verified / verified |
| Usercentrics | Ryzen 2700 | 15/15 | 689.6 | 5 | 68 | 92 | 96 | +8 | -12 to 16 | +164,078 | 47 | 0 | verified / verified / verified / verified |
| CookieYes | Ryzen 2700 | 15/15 | 281.5 | 7.2 | 68 | 104 | 96 | 0 | -24 to 12 | +30,757 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 40 | 40 | 16 | unavailable | unavailable | 16 |
| Cookie Control | 16 | 16 | unavailable | 16 | 16 | unavailable |
| Didomi | 16 | unavailable | 40 | 16 | 24 | 16 |
| Enzuzo | 16 | unavailable | 24 | 16 | 16 | 16 |
| iubenda | 32 | 32 | 32 | 16 | 16 | 16 |
| Ketch | 32 | 16 | 16 | 16 | 16 | 16 |
| OneTrust | 24 | unavailable | 24 | 16 | 16 | 32 |
| Osano | 40 | 32 | 56 | 16 | 16 | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | 16 | 16 |
| CookieYes | unavailable | unavailable | unavailable | 16 | 16 | unavailable |

## TanStack Start, desktop

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | Source CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | M1 Pro | 15/15 | 25.1 | 7.1 | 40 | 84 | 92 | +20 | 8 to 20 | +109,933 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | Ryzen 2700 | 15/15 | 379.6 | 8.6 | 68 | 112 | 116 | +8 | -16 to 16 | +98,516 | 10 | 0 | verified / verified / verified / unknown |
| Didomi | Ryzen 2700 | 15/15 | 447.1 | 7.7 | 64 | 112 | 108 | -4 | -20 to 20 | +252,866 | 51 | 0 | verified / verified / verified / verified |
| Enzuzo | Ryzen 2700 | 15/15 | 462.5 | 7.6 | 64 | 112 | 116 | +4 | withheld | +153,134 | 42 | 0 | verified / verified / verified / verified |
| iubenda | Ryzen 2700 | 15/15 | 398.1 | 9.7 | 68 | 112 | 116 | +4 | -20 to 20 | +121,515 | 0 | 0 | verified / verified / verified / verified |
| Ketch | Ryzen 2700 | 15/15 | 1,643.6 | 9 | 64 | 112 | 112 | 0 | withheld | +532,150 | 176 | 0 | verified / verified / verified / verified |
| OneTrust | Ryzen 2700 | 15/15 | 622.7 | 8.2 | 68 | 112 | 116 | 0 | -16 to 16 | +211,099 | 1 | 0 | verified / verified / verified / verified |
| Osano | Ryzen 2700 | 15/15 | 637.1 | 7.2 | 64 | 112 | 116 | 0 | -12 to 20 | +86,876 | 5 | 0 | verified / unknown / unknown / unknown |
| Usercentrics | Ryzen 2700 | 15/15 | 674.9 | 9.6 | 64 | 112 | 112 | 0 | -8 to 20 | +164,132 | 52 | 0 | verified / verified / verified / verified |
| CookieYes | Ryzen 2700 | 15/15 | 279.2 | 10.5 | 68 | 124 | 124 | 0 | -12 to 16 | +30,800 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 32 | 48 | 16 | 16 | 16 | unavailable |
| Cookie Control | 24 | 16 | unavailable | 16 | 16 | unavailable |
| Didomi | 16 | unavailable | 40 | 16 | 16 | 16 |
| Enzuzo | 24 | 16 | 24 | 16 | 16 | 16 |
| iubenda | 32 | 32 | 32 | 24 | 16 | 16 |
| Ketch | 32 | 16 | 16 | 16 | 16 | 16 |
| OneTrust | 16 | 24 | 16 | 16 | 16 | 32 |
| Osano | 40 | 32 | 48 | 16 | 16 | 16 |
| Usercentrics | unavailable | 16 | unavailable | 16 | 16 | 16 |
| CookieYes | unavailable | 16 | unavailable | 16 | 24 | unavailable |

## React, desktop

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | Source CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | M1 Pro | 15/15 | 223.4 | 1.4 | 56 | 80 | 100 | +16 | 16 to 20 | +97,407 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | Ryzen 2700 | 15/15 | 375.8 | 1.8 | 76 | 136 | 136 | 0 | -20 to 16 | +98,411 | 12 | 0 | verified / verified / verified / unknown |
| Didomi | Ryzen 2700 | 15/15 | 457.5 | 1.9 | 76 | 136 | 140 | +4 | -12 to 20 | +252,782 | 51 | 0 | verified / verified / verified / verified |
| Enzuzo | Ryzen 2700 | 15/15 | 442.9 | 2 | 76 | 136 | 132 | -4 | withheld | +153,072 | 43 | 0 | verified / verified / verified / verified |
| iubenda | Ryzen 2700 | 15/15 | 419 | 1.8 | 76 | 136 | 136 | -4 | -24 to 20 | +121,429 | 0 | 0 | verified / verified / verified / verified |
| Ketch | Ryzen 2700 | 15/15 | 1,619.5 | 1.9 | 72 | 136 | 136 | -8 | withheld | +532,087 | 174 | 0 | verified / verified / verified / verified |
| OneTrust | Ryzen 2700 | 15/15 | 633.6 | 1.9 | 80 | 136 | 140 | +4 | -8 to 24 | +211,068 | 2 | 0 | verified / verified / verified / verified |
| Osano | Ryzen 2700 | 15/15 | 646.5 | 2 | 76 | 136 | 140 | +4 | -20 to 16 | +84,779 | 9 | 0 | verified / verified / verified / verified |
| Usercentrics | Ryzen 2700 | 15/15 | 692.8 | 2 | 76 | 136 | 136 | +4 | -20 to 16 | +164,062 | 51 | 0 | verified / verified / verified / verified |
| CookieYes | Ryzen 2700 | 15/15 | 287.4 | 4.3 | 92 | 148 | 140 | -8 | -24 to 20 | +30,755 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 32 | 40 | 16 | 16 | unavailable | unavailable |
| Cookie Control | 24 | 16 | unavailable | 16 | 16 | unavailable |
| Didomi | unavailable | 16 | 32 | 16 | 16 | 16 |
| Enzuzo | 16 | 16 | 32 | 16 | 16 | 16 |
| iubenda | 32 | 16 | 32 | 24 | 16 | 16 |
| Ketch | 24 | 24 | 16 | 16 | 16 | 16 |
| OneTrust | unavailable | unavailable | 24 | 16 | 32 | 16 |
| Osano | 40 | 32 | 48 | 16 | 16 | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | 16 | 16 |
| CookieYes | 16 | 16 | unavailable | 16 | 16 | unavailable |

## Script, desktop

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | Source CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | M1 Pro | 15/15 | 240.2 | 1.5 | 28 | 76 | 80 | +4 | 4 to 8 | +83,957 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | Ryzen 2700 | 15/15 | 394.8 | 2.1 | 40 | 100 | 104 | 0 | -16 to 8 | +98,413 | 27 | 0 | verified / verified / verified / unknown |
| Didomi | Ryzen 2700 | 15/15 | 456.8 | 2.2 | 44 | 100 | 104 | 0 | -8 to 24 | +252,805 | 51 | 0 | verified / verified / verified / verified |
| Enzuzo | Ryzen 2700 | 15/15 | 423.6 | 1.8 | 40 | 100 | 100 | 0 | withheld | +152,736 | 43 | 0 | verified / verified / verified / verified |
| iubenda | Ryzen 2700 | 15/15 | 441.9 | 1.9 | 48 | 100 | 100 | 0 | -16 to 12 | +121,452 | 0 | 0 | verified / verified / verified / verified |
| Ketch | Ryzen 2700 | 15/15 | 1,651.5 | 2.1 | 56 | 100 | 104 | 0 | withheld | +532,105 | 169 | 0 | verified / verified / verified / verified |
| OneTrust | Ryzen 2700 | 15/15 | 664.9 | 1.9 | 48 | 100 | 104 | 0 | -16 to 24 | +211,068 | 1 | 0 | verified / verified / verified / verified |
| Osano | Ryzen 2700 | 15/15 | 558.2 | 1.9 | 44 | 100 | 104 | +4 | -8 to 16 | +86,823 | 21 | 0 | verified / verified / verified / verified |
| Usercentrics | Ryzen 2700 | 15/15 | 691.6 | 1.8 | 44 | 100 | 112 | +12 | -4 to 20 | +164,082 | 51 | 0 | verified / verified / verified / verified |
| CookieYes | Ryzen 2700 | 15/15 | 284.4 | 4.8 | 52 | 104 | 108 | +4 | -4 to 24 | +30,758 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 48 | 48 | 32 | 16 | unavailable | unavailable |
| Cookie Control | 16 | 16 | unavailable | 16 | 16 | unavailable |
| Didomi | unavailable | unavailable | 40 | 16 | 16 | 16 |
| Enzuzo | unavailable | 16 | 32 | 16 | 16 | 16 |
| iubenda | 40 | 32 | 32 | 16 | 16 | 16 |
| Ketch | 24 | 16 | 24 | 16 | 16 | 16 |
| OneTrust | unavailable | unavailable | 24 | 16 | 16 | 32 |
| Osano | 40 | 32 | 48 | 16 | 16 | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | 16 | 16 |
| CookieYes | unavailable | 16 | unavailable | 16 | 16 | unavailable |

## Next.js, mobile

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | Source CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | M1 Pro | 15/15 | 239.7 | 8.4 | 236 | 3,424 | 3,824 | +400 | 396 to 400 | +103,934 | 17 | 0 | verified / verified / verified / verified |
| Cookie Control | Ryzen 2700 | 15/15 | 2,468.2 | 6.7 | 248 | 3,448 | 3,944 | +492 | 484 to 504 | +98,532 | 255 | 0 | verified / verified / verified / unknown |
| Didomi | Ryzen 2700 | 15/15 | 4,410.5 | 5.2 | 248 | 3,448 | 4,724 | +1,280 | 1,264 to 1,288 | +252,917 | 357 | 0 | verified / verified / verified / verified |
| Enzuzo | Ryzen 2700 | 15/15 | 2,751.7 | 5.7 | 248 | 3,448 | 4,220 | +768 | withheld | +153,174 | 264 | 0 | verified / verified / verified / verified |
| iubenda | Ryzen 2700 | 15/15 | 2,662.8 | 5.9 | 252 | 3,448 | 4,060 | +612 | 600 to 624 | +121,551 | 115 | 0 | verified / verified / verified / verified |
| Ketch | Ryzen 2700 | 15/15 | 7,946.3 | 6.4 | 252 | 3,448 | 5,192 | +1,744 | withheld | +532,186 | 1,049 | 0 | verified / verified / verified / verified |
| OneTrust | Ryzen 2700 | 15/15 | 3,915.1 | 5.7 | 248 | 3,448 | 3,928 | +476 | 444 to 508 | +211,253 | 183 | 0 | verified / verified / verified / verified |
| Osano | Ryzen 2700 | 15/15 | 2,150.7 | 5.4 | 248 | 3,448 | 3,872 | +424 | 420 to 428 | +84,875 | 223 | 0 | verified / failed / failed / verified |
| Usercentrics | Ryzen 2700 | 15/15 | 4,155.8 | 6.5 | 252 | 3,448 | 4,296 | +844 | 836 to 864 | +164,180 | 154 | 0 | verified / verified / verified / verified |
| CookieYes | Ryzen 2700 | 15/15 | 2,417.1 | 8.3 | 264 | 3,452 | 3,644 | +176 | 148 to 212 | +30,991 | 83 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 64 | 48 | 32 | unavailable | 16 | unavailable |
| Cookie Control | 24 | 24 | unavailable | unavailable | unavailable | unavailable |
| Didomi | 16 | 24 | 104 | unavailable | unavailable | unavailable |
| Enzuzo | 56 | 56 | 48 | 16 | 16 | unavailable |
| iubenda | 32 | 24 | 40 | 16 | 16 | unavailable |
| Ketch | 40 | 32 | 32 | unavailable | 16 | unavailable |
| OneTrust | 16 | 16 | 40 | 24 | 16 | 24 |
| Osano | 128 | 88 | 80 | unavailable | unavailable | unavailable |
| Usercentrics | unavailable | 16 | unavailable | unavailable | unavailable | 16 |
| CookieYes | 24 | 24 | unavailable | 16 | 16 | unavailable |

## Nuxt / Vue, mobile

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | Source CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | M1 Pro | 15/15 | 240.8 | 7.5 | 244 | 3,140 | 3,660 | +520 | 504 to 524 | +112,595 | 20 | 0 | verified / verified / verified / verified |
| Cookie Control | Ryzen 2700 | 15/15 | 2,174.3 | 5.6 | 236 | 3,156 | 3,648 | +492 | 480 to 508 | +98,520 | 167 | 0 | verified / verified / verified / unknown |
| Didomi | Ryzen 2700 | 15/15 | 3,973.1 | 5.2 | 236 | 3,156 | 4,440 | +1,284 | 1,268 to 1,376 | +252,909 | 297 | 0 | verified / verified / verified / verified |
| Enzuzo | Ryzen 2700 | 15/15 | 2,486.3 | 4.3 | 244 | 3,156 | 3,924 | +772 | withheld | +153,170 | 204 | 0 | verified / verified / verified / verified |
| iubenda | Ryzen 2700 | 15/15 | 2,391.3 | 4.5 | 236 | 3,156 | 3,768 | +616 | 604 to 624 | +121,536 | 48 | 0 | verified / verified / verified / verified |
| Ketch | Ryzen 2700 | 15/15 | 7,684.9 | 5.2 | 248 | 3,156 | 4,904 | +1,752 | withheld | +532,207 | 996 | 0 | verified / verified / verified / verified |
| OneTrust | Ryzen 2700 | 15/15 | 3,851.8 | 5.5 | 244 | 3,156 | 3,864 | +716 | 688 to 744 | +211,247 | 117 | 0 | verified / verified / verified / verified |
| Osano | Ryzen 2700 | 15/15 | 1,967.2 | 5.2 | 248 | 3,156 | 3,580 | +424 | 416 to 440 | +84,867 | 150 | 0 | verified / failed / failed / unknown |
| Usercentrics | Ryzen 2700 | 15/15 | 3,946.4 | 5.4 | 248 | 3,156 | 4,000 | +848 | 836 to 860 | +164,174 | 85 | 0 | verified / verified / verified / verified |
| CookieYes | Ryzen 2700 | 15/15 | 1,241.8 | 8.2 | 244 | 3,160 | 3,336 | +176 | 160 to 184 | +30,893 | 3 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 48 | 48 | 16 | unavailable | unavailable | unavailable |
| Cookie Control | 24 | 16 | unavailable | unavailable | unavailable | unavailable |
| Didomi | 16 | 16 | 112 | unavailable | unavailable | unavailable |
| Enzuzo | 56 | 56 | 40 | unavailable | 16 | unavailable |
| iubenda | 24 | 40 | 40 | unavailable | 16 | 16 |
| Ketch | 32 | 32 | 32 | 16 | unavailable | 16 |
| OneTrust | 24 | 16 | 48 | 48 | 24 | 40 |
| Osano | 112 | 88 | 88 | unavailable | unavailable | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | unavailable | unavailable |
| CookieYes | 16 | 24 | unavailable | unavailable | unavailable | unavailable |

## Astro, mobile

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | Source CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | M1 Pro | 15/15 | 260.3 | 5.4 | 260 | 2,840 | 3,176 | +336 | 324 to 340 | +70,993 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | Ryzen 2700 | 15/15 | 1,942.3 | 5.4 | 240 | 2,852 | 3,348 | +496 | 488 to 504 | +98,412 | 164 | 0 | verified / verified / verified / unknown |
| Didomi | Ryzen 2700 | 15/15 | 3,744 | 5.3 | 236 | 2,852 | 4,132 | +1,284 | 1,272 to 1,288 | +252,809 | 290 | 0 | verified / verified / verified / verified |
| Enzuzo | Ryzen 2700 | 15/15 | 2,312.4 | 5 | 244 | 2,852 | 3,624 | +772 | withheld | +152,754 | 205 | 0 | verified / verified / verified / verified |
| iubenda | Ryzen 2700 | 15/15 | 2,310.8 | 5.4 | 244 | 2,852 | 3,468 | +616 | 608 to 620 | +121,433 | 54 | 0 | verified / verified / verified / verified |
| Ketch | Ryzen 2700 | 15/15 | 7,665.8 | 5 | 244 | 2,852 | 4,804 | +1,952 | withheld | +532,087 | 989 | 0 | verified / verified / verified / verified |
| OneTrust | Ryzen 2700 | 15/15 | 3,702.5 | 4.5 | 248 | 2,852 | 3,716 | +860 | 812 to 904 | +211,152 | 115 | 0 | verified / verified / verified / verified |
| Osano | Ryzen 2700 | 15/15 | 1,785.3 | 4.7 | 240 | 2,852 | 3,280 | +428 | 420 to 432 | +84,768 | 145 | 0 | verified / failed / failed / verified |
| Usercentrics | Ryzen 2700 | 15/15 | 3,752.9 | 5.3 | 244 | 2,852 | 3,776 | +928 | 892 to 948 | +164,084 | 87 | 0 | verified / verified / verified / verified |
| CookieYes | Ryzen 2700 | 15/15 | 1,069.5 | 8.7 | 244 | 2,856 | 3,036 | +180 | 168 to 192 | +30,786 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 48 | 48 | 16 | unavailable | 16 | unavailable |
| Cookie Control | 24 | 24 | unavailable | 16 | 16 | unavailable |
| Didomi | unavailable | unavailable | 112 | unavailable | unavailable | unavailable |
| Enzuzo | 64 | 48 | 40 | unavailable | 16 | unavailable |
| iubenda | 24 | 32 | 32 | unavailable | 16 | 16 |
| Ketch | 40 | 32 | 32 | unavailable | unavailable | 16 |
| OneTrust | 16 | 16 | 32 | 24 | 24 | 24 |
| Osano | 120 | 80 | 80 | unavailable | unavailable | 16 |
| Usercentrics | unavailable | 16 | unavailable | 16 | unavailable | 16 |
| CookieYes | 16 | 24 | unavailable | 16 | 16 | unavailable |

## TanStack Start, mobile

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | Source CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | M1 Pro | 15/15 | 261 | 6.8 | 252 | 3,308 | 3,740 | +432 | 428 to 447.7 | +109,933 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | Ryzen 2700 | 15/15 | 2,376.3 | 8 | 252 | 3,328 | 3,824 | +496 | 488 to 524 | +98,517 | 214 | 0 | verified / verified / verified / unknown |
| Didomi | Ryzen 2700 | 15/15 | 4,106.8 | 8.7 | 252 | 3,328 | 4,608 | +1,284 | 1,268 to 1,368 | +252,868 | 316 | 0 | verified / verified / verified / verified |
| Enzuzo | Ryzen 2700 | 15/15 | 2,674.5 | 8.9 | 248 | 3,328 | 4,096 | +768 | withheld | +153,138 | 224 | 0 | verified / verified / verified / verified |
| iubenda | Ryzen 2700 | 15/15 | 2,610.2 | 9.1 | 248 | 3,328 | 3,940 | +616 | 604 to 624 | +121,516 | 75 | 0 | verified / verified / verified / verified |
| Ketch | Ryzen 2700 | 15/15 | 7,846.9 | 9.2 | 244 | 3,328 | 5,080 | +1,752 | withheld | +532,152 | 1,005 | 0 | verified / verified / verified / verified |
| OneTrust | Ryzen 2700 | 15/15 | 3,785.8 | 9.1 | 248 | 3,328 | 3,796 | +472 | 452 to 492 | +211,206 | 140 | 0 | verified / verified / verified / verified |
| Osano | Ryzen 2700 | 15/15 | 1,997.4 | 9.7 | 244 | 3,328 | 3,752 | +428 | 416 to 436 | +84,830 | 172 | 0 | verified / unknown / failed / unknown |
| Usercentrics | Ryzen 2700 | 15/15 | 4,068.6 | 7.2 | 248 | 3,328 | 4,176 | +848 | 832 to 864 | +164,141 | 112 | 0 | verified / verified / verified / verified |
| CookieYes | Ryzen 2700 | 15/15 | 1,190 | 13.1 | 248 | 3,332 | 3,508 | +176 | 168 to 184 | +30,829 | 24 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 56 | 48 | 24 | 16 | 16 | 16 |
| Cookie Control | 24 | 24 | unavailable | 16 | 16 | unavailable |
| Didomi | 16 | 16 | 104 | 16 | 16 | unavailable |
| Enzuzo | 72 | 56 | 48 | 16 | unavailable | unavailable |
| iubenda | 24 | 24 | 40 | 16 | 16 | unavailable |
| Ketch | 32 | 32 | 32 | 16 | unavailable | unavailable |
| OneTrust | 24 | 24 | 40 | 56 | 40 | 32 |
| Osano | 128 | 104 | 80 | unavailable | unavailable | unavailable |
| Usercentrics | unavailable | unavailable | 16 | 16 | unavailable | unavailable |
| CookieYes | 24 | 24 | unavailable | unavailable | 16 | unavailable |

## React, mobile

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | Source CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | M1 Pro | 15/15 | 1,131.3 | 1.4 | 1,100 | 3,324 | 3,856 | +532 | 520 to 552 | +97,407 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | Ryzen 2700 | 15/15 | 1,751.7 | 1.7 | 928 | 3,360 | 3,652 | +292 | 268 to 300 | +98,411 | 192 | 0 | verified / verified / verified / unknown |
| Didomi | Ryzen 2700 | 15/15 | 3,566.2 | 2.1 | 920 | 3,360 | 4,464 | +1,104 | 1,072 to 1,128 | +252,786 | 301 | 0 | verified / verified / verified / verified |
| Enzuzo | Ryzen 2700 | 15/15 | 2,056.5 | 2 | 888 | 3,360 | 3,924 | +568 | withheld | +153,064 | 202 | 0 | verified / verified / verified / verified |
| iubenda | Ryzen 2700 | 15/15 | 2,044.5 | 1.7 | 764 | 3,360 | 3,768 | +404 | 388 to 424 | +121,426 | 50 | 0 | verified / verified / verified / verified |
| Ketch | Ryzen 2700 | 15/15 | 7,535.5 | 1.9 | 756 | 3,360 | 4,980 | +1,624 | withheld | +532,086 | 976 | 0 | verified / verified / verified / verified |
| OneTrust | Ryzen 2700 | 15/15 | 3,657.2 | 2 | 800 | 3,360 | 3,668 | +300 | 264 to 348 | +211,147 | 116 | 0 | verified / verified / verified / verified |
| Osano | Ryzen 2700 | 15/15 | 1,750.6 | 1.7 | 908 | 3,360 | 3,744 | +384 | 348 to 420 | +86,802 | 145 | 0 | verified / failed / failed / verified |
| Usercentrics | Ryzen 2700 | 15/15 | 3,565 | 1.9 | 832 | 3,360 | 4,096 | +736 | 700 to 756 | +164,057 | 83 | 0 | verified / verified / verified / verified |
| CookieYes | Ryzen 2700 | 15/15 | 1,042.1 | 4.3 | 776 | 3,364 | 3,472 | +108 | 92 to 124 | +30,800 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 56 | 48 | 24 | unavailable | unavailable | 16 |
| Cookie Control | 24 | 24 | unavailable | unavailable | unavailable | unavailable |
| Didomi | unavailable | 16 | 104 | unavailable | 16 | unavailable |
| Enzuzo | 48 | 48 | 40 | 16 | unavailable | 16 |
| iubenda | 16 | 24 | 40 | 16 | unavailable | unavailable |
| Ketch | 32 | 32 | 32 | unavailable | unavailable | 16 |
| OneTrust | 16 | 16 | 48 | 24 | 24 | 24 |
| Osano | 120 | 88 | 88 | unavailable | unavailable | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | 16 | 16 |
| CookieYes | 16 | 16 | unavailable | 16 | 16 | unavailable |

## Script, mobile

Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.

| CMP | Source CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| c15t | M1 Pro | 15/15 | 1,504.8 | 1.5 | 224 | 2,856 | 3,292 | +436 | 428 to 448 | +83,877 | 0 | 0 | verified / verified / verified / verified |
| Cookie Control | Ryzen 2700 | 15/15 | 1,941.9 | 2 | 240 | 2,880 | 3,372 | +492 | 488 to 508 | +98,413 | 163 | 0 | verified / verified / verified / unknown |
| Didomi | Ryzen 2700 | 15/15 | 3,743.9 | 2 | 236 | 2,880 | 4,156 | +1,280 | 1,272 to 1,288 | +252,801 | 290 | 0 | verified / verified / verified / verified |
| Enzuzo | Ryzen 2700 | 15/15 | 2,321.3 | 1.8 | 244 | 2,880 | 3,648 | +772 | withheld | +153,096 | 200 | 0 | verified / verified / verified / verified |
| iubenda | Ryzen 2700 | 15/15 | 2,242 | 1.8 | 236 | 2,880 | 3,488 | +612 | 600 to 620 | +121,444 | 51 | 0 | verified / verified / verified / verified |
| Ketch | Ryzen 2700 | 15/15 | 7,521.9 | 2 | 244 | 2,880 | 4,772 | +1,900 | withheld | +532,102 | 976 | 0 | verified / verified / verified / verified |
| OneTrust | Ryzen 2700 | 15/15 | 3,678.6 | 2 | 236 | 2,880 | 3,688 | +812 | 760 to 836 | +211,174 | 114 | 0 | verified / verified / verified / verified |
| Osano | Ryzen 2700 | 15/15 | 1,759.7 | 2.1 | 244 | 2,880 | 3,304 | +432 | 416 to 436 | +84,799 | 147 | 0 | verified / failed / failed / verified |
| Usercentrics | Ryzen 2700 | 15/15 | 3,711.2 | 1.8 | 244 | 2,880 | 3,736 | +856 | 844 to 892 | +164,094 | 83 | 0 | verified / verified / verified / verified |
| CookieYes | Ryzen 2700 | 15/15 | 1,078.3 | 5.3 | 244 | 2,880 | 3,060 | +184 | 160 to 200 | +30,801 | 0 | 0 | verified / verified / verified / unknown |

Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.

| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c15t | 64 | 40 | 16 | 16 | unavailable | 16 |
| Cookie Control | 24 | 16 | unavailable | 16 | unavailable | unavailable |
| Didomi | 16 | unavailable | 104 | unavailable | unavailable | 16 |
| Enzuzo | 48 | 48 | 40 | 16 | 16 | unavailable |
| iubenda | 32 | 40 | 48 | 16 | unavailable | 16 |
| Ketch | 32 | 32 | 32 | 16 | 16 | 16 |
| OneTrust | 16 | 24 | 24 | 24 | 24 | 40 |
| Osano | 120 | 80 | 88 | unavailable | unavailable | 16 |
| Usercentrics | unavailable | unavailable | unavailable | 16 | unavailable | 16 |
| CookieYes | 24 | 16 | unavailable | 16 | 16 | unavailable |

