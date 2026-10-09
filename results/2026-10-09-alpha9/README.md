# c15t 3.0.0-alpha.9, October 9 2026

c15t 3.0.0-alpha.9 against each framework's no-CMP page, run one framework at a time, with streamed HTML compressed at Brotli quality 5.

## Runs

| Directory | What it is |
| --- | --- |
| `desktop-final`, `mobile-final` | The results to use. Six frameworks, load and consent-flow checks. |
| `desktop-serial` | Next.js and Nuxt with the fixture proxy at Brotli quality 11, before the fix. |
| `desktop-q5` | The same plan rerun at quality 5. |
| `desktop-alpha8-q5` | alpha.8 at quality 5, to compare with alpha.9 under the fix. |

`desktop-serial` and `desktop-q5` share `plan-desktop-serial.json`.

## Evidence for the compression fix

Desktop medians in ms, c15t alpha.9:

| Run | Next.js TTFB / LCP / banner | Nuxt TTFB / LCP / banner |
| --- | --- | --- |
| `desktop-serial` (quality 11) | 125 / 284 / 162 | 77 / 288 / 141 |
| `desktop-q5` (quality 5) | 27 / 156 / 73 | 19 / 184 / 50 |

alpha.9 inlines its banner styles, so its HTML is about 90 KB. Compressing that at quality 11 cost about 100 ms before the first byte left the proxy. At quality 5, alpha.8 and alpha.9 land within 12 ms of each other on LCP (`desktop-alpha8-q5`).

The overnight matrix in `../2026-10-09` ran at quality 11. Its competitor pages are small, so the bug barely moves their deltas against baseline. Its c15t rows are alpha.8 and are superseded by these runs.
