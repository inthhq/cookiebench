# c15t 3.0.0-alpha.10, October 10 2026

c15t 3.0.0-alpha.10 against each framework's no-CMP page, with the same plans, seed and Brotli quality as the alpha.9 runs in `../2026-10-09-alpha9`.

alpha.10 drops the CORS preflight on `GET /init`: the request moves its values to the query string and sends no custom headers or credentials. React also sends `/init` during the first render and defers the dialog chunks until the browser is idle. Nuxt and Astro bundle the backend's policy at build time by default.

## Runs

| Directory | What it is |
| --- | --- |
| `desktop`, `mobile` | Six frameworks, load and consent-flow checks. |
| `desktop-nextjs-rerun` | Next.js desktop again. Use it instead of `desktop/nextjs-load`, which ran while the host was busy. |
| `mobile-script-rerun` | Script tag mobile load. Its entry in `mobile` failed to start because the React server still held port 4310. |
| `mobile-react-rerun` | React mobile load again, still under host load. |
| `mobile-react-ab` | React mobile, alpha.9 and alpha.10 in alternating runs: `a9-1`, `a10-1`, `a9-2`, `a10-2`. |
| `v2-ab` | Next.js desktop with c15t 2.3.0, alpha.10 and the no-CMP page in one run. |

The alpha.9 runs in `mobile-react-ab` came from a checkout of `0ccdbf5` using `plan-mobile-react-ab-alpha9.json`.

## Host load

Other work shared the machine during these runs. Four ClickHouse servers and two other dev servers were running throughout, and an end-to-end suite pushed the load average to 22 for a few minutes at 17:47. Mobile emulates a 4× slower CPU, so contention there shows up as long tasks even on the no-CMP page.

- `desktop/nextjs-load`: the first 7–8 visits ran slow on the no-CMP page too, with 27–53 ms of long tasks. `desktop-nextjs-rerun` ran at a load average of 2–3 and matches alpha.9.
- `mobile`: long-task blocking rose on every framework's no-CMP page. The Next.js one went from 66–76 ms on alpha.9 to 84–160 ms. Read mobile blocking from `mobile-react-ab` instead.
- `mobile-react-ab`: `a9-1` ran during the spike (371 ms of blocking against 28 ms in `a9-2`). Compare `a9-2` with `a10-2`, both at a load average of about 3.5.

## alpha.9 against alpha.10

Medians over passed load visits, in ms unless marked. "LCP added" is the paired median difference from the no-CMP page in the same run.

Desktop:

| Framework | Banner | Consent resolved | LCP | LCP added | Initial script | Requests | `/init` preflights |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Next.js | 65 → 52 | 174 → 168 | 160 → 140 | 32 → 16 | 211.7 → 209.2 KB | 17 → 16 | 0 → 0 |
| Nuxt | 41 → 44 | 111 → 106 | 180 → 172 | 64 → 66 | 141.7 → 134.9 KB | 42 → 36 | 0 → 0 |
| Astro | 35 → 36 | 87 → 83 | 132 → 128 | 28 → 24 | 60.0 → 59.5 KB | 11 → 11 | 0 → 0 |
| TanStack Start | 58 → 53 | 158 → 154 | 144 → 144 | 16 → 24 | 184.8 → 186.1 KB | 17 → 17 | 0 → 0 |
| React | 495 → 294 | 462 → 271 | 160 → 172 | 24 → 36 | 150.2 → 150.5 KB | 15 → 17 | 1 → 0 |
| Script tag | 542 → 317 | 524 → 291 | 112 → 124 | 8 → 12 | 82.8 → 82.5 KB | 10 → 9 | 1 → 0 |

Mobile:

| Framework | Banner | Consent resolved | LCP | LCP added | Initial script | Requests | `/init` preflights |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Next.js | 241 → 253 | 2008 → 2044 | 3876 → 3856 | 436 → 408 | 211.7 → 186.3 KB | 17 → 13 | 0 → 0 |
| Nuxt | 245 → 249 | 1180 → 1196 | 3852 → 3664 | 696 → 504 | 141.7 → 131.1 KB | 42 → 35 | 0 → 0 |
| Astro | 248 → 261 | 1091 → 1074 | 3184 → 3192 | 328 → 324 | 60.0 → 55.5 KB | 11 → 10 | 0 → 0 |
| TanStack Start | 248 → 261 | 1806 → 1854 | 3740 → 3748 | 412 → 408 | 184.8 → 163.1 KB | 17 → 13 | 0 → 0 |
| React (`mobile-react-ab`) | 1680 → 1494 | 1642 → 1459 | 3980 → 3872 | 596 → 492 | 150.2 → 150.5 KB | 15 → 17 | 1 → 0 |
| Script tag | 1767 → 1606 | 1741 → 1550 | 3312 → 3312 | 436 → 432 | 82.8 → 82.5 KB | 10 → 9 | 1 → 0 |

Every consent-flow check passed on every framework and both profiles. On alpha.9, desktop Next.js accept read `unknown`. Click-to-paint times are 16–40 ms on desktop and 24–48 ms on mobile.

## The preflight

The React and script-tag banners wait on `/init` from the browser. On alpha.9 that cost two round trips, the OPTIONS preflight and then the GET. On alpha.10 it costs one.

Median time from the `/init` request starting to the banner showing:

| Fixture | alpha.9 | alpha.10 |
| --- | --- | --- |
| React, desktop | 395 | 214 |
| Script tag, desktop | 477 | 233 |
| React, mobile (`mobile-react-ab`) | 493 | 357 |
| Script tag, mobile | 530 | 339 |

The saving is one round trip to the backend, 135–245 ms. The single GET takes about as long in both runs, so the network didn't change between them.

The live backend still answers `/init` with the request's origin and `Access-Control-Allow-Credentials: true` rather than `*`. A simple GET skips the preflight either way. `POST /subjects` still preflights.

Next.js, Nuxt, Astro and TanStack Start resolve consent on the server and send no browser `/init`, so they don't change here.

## React on mobile: a second long task

alpha.9 React runs one long task per mobile visit, about 77 ms at about 1000 ms. alpha.10 runs two: about 85 ms at about 1010 ms, then 54–106 ms at about 1100 ms, with a third around 1400 ms on some visits. Long-task blocking goes from 28 to 51 ms in `mobile-react-ab`. The no-CMP page has none in either run.

`/init` still starts at about 1150 ms on mobile in both versions, after this script work. Sending it during the first render didn't make it start sooner on a slow CPU.

Desktop shows no long tasks in either version.

The React build also splits differently. The main `cmp` chunk shrank from 69.2 to 65.6 KB, but three new small eager chunks add about 3.8 KB, so the initial script total is flat. The dialog and writer chunks moved from about 430 ms to about 3 s on desktop.

## Deferred chunks against the observation window

On mobile, alpha.10 React loads the deferred `panel` and `preferences` chunks at about 4.1 s and `writer` at about 4.95 s. The observation window ends 5 s after navigation, so on 1–2 visits per run `writer` is still in flight, the harness can't total the bytes, and it marks the visit `incomplete`. These visits aren't failures. They're excluded from the medians above.

## Mobile script totals

Next.js, TanStack Start and Astro load 4–25 KB less script in the mobile initial window, with fewer requests. Desktop barely moves on the same builds. The likely cause is alpha.10 deferring chunks that the throttled mobile connection now pushes past the initial window, rather than smaller bundles.

## c15t 2.3.0 against alpha.10

`v2-ab` puts the `@c15t/nextjs` 2.3.0 app (`benchmarks/with-c15t-nextjs-v2`, not tracked in this repository) in the same run as alpha.10 and the no-CMP page, so their visits interleave under the same host load. Desktop only. The plan lists mobile too, but that entry was stopped before it measured anything.

| Next.js desktop | 2.3.0 | alpha.10 |
| --- | --- | --- |
| Banner visible | 336 | 55 |
| Consent resolved | 303 | 174 |
| LCP | 152 | 148 |
| LCP added | 24 | 20 |
| Bytes added | 52 KB | 109 KB |
| Initial script | 150 KB | 209 KB |
| Long-task blocking | 0 | 0 |

The banner is sooner on alpha.10 in all 15 visit pairs. LCP is even: alpha.10 is faster in 8 of 15 pairs. alpha.10 sends about 57 KB more, almost all of it script.

The harness's paired analysis expects one no-CMP page per app and refused this run, so "LCP added" and "Bytes added" are medians of the per-visit differences, worked out from the envelope.

An earlier 2.3.0 run on October 9 (desktop, its own no-CMP page) agrees: banner 351 ms, LCP added 28 ms, bytes added 52 KB.
