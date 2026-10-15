# Full CMP matrix, October 15 2026

Ten CMPs on six frameworks, desktop and mobile, all on one machine: c15t `3.0.0`, Cookie Control, CookieYes, Didomi, Enzuzo, iubenda, Ketch, OneTrust, Osano and Usercentrics. The frameworks are Script, React, Next.js, Nuxt, Astro and TanStack Start.

Earlier matrices ran competitors on an AMD Ryzen 7 2700 under Linux and c15t on an Apple M1 Pro, so they could not rank CMPs against each other. This run puts every row on the same Apple M1 Pro (macOS 25.6.0), Chromium `153.0.8010.12` and Node `v24.21.0`. Every entry, including the retry, has collector hash `f359851e4f7b15d549e882d641cd3205f71af1a18aebd8f02f4fc5b2eb21eb1d`.

`benchmarks/plans/matrix.ts` generated `configs/` and both plans. Each load entry has 15 pairs and 3 warmups per arm with seed `20261009`. Each comparison family uses Bonferroni-adjusted 95% intervals: 365 comparisons per profile.

| Profile | CPU | Network | Load window |
| --- | --- | --- | --- |
| Desktop | 1x | Unthrottled | Default |
| Mobile | 4x slowdown | 200 KB/s down, 150 ms added latency | 10 s |

Competitors load on the baseline page through `?cmp=<vendor>`. CookieYes needs its registered host, so it runs in its own entries against `benchmarks-with-cookie-yes.vercel.app` over TLS, with its own baseline. On Next.js, CookieYes loads after hydration.

## Evidence

| Directory | Contents | Result |
| --- | --- | --- |
| `desktop/` | 24 load and flow entries, plus the reference audit | Completed 05:31 UTC. Every entry exited 0 |
| `mobile/` | Same plan on the mobile profile | Completed 11:03 UTC. Every entry exited 0 |
| `mobile-tanstack-start-correctness-retry/` | Mobile TanStack Start flows, run again with the same config | Completed 13:25 UTC. Matched the original for every competitor |

`summary.json` has one row per CMP, framework and profile. `summarize.mjs` builds it from the recorded reports and comparisons and starts no browsers:

```sh
node results/2026-10-15-matrix/summarize.mjs > results/2026-10-15-matrix/summary.json
```

## Known gaps

- **No save flow:** CookieYes and Cookie Control don't have one, so save reads `unsupported-action` on every framework and profile.
- **Osano on mobile:** accept and reject fail with `page-unresponsive` after the action on all six frameworks. Save is unknown on Nuxt (`public-state-unavailable`) and TanStack Start (`public-state-not-ready`). On desktop, only Nuxt save is unknown. The October 11 run showed the same pattern.
- **No LCP interval:** the remote script, style or config bytes changed within the cell, so these comparisons are ineligible and show only a median. This applies to Enzuzo and Ketch on every framework and profile, and to Didomi on mobile React.
- **c15t on mobile TanStack Start:** save read unknown in `mobile/` and reject read unknown in the retry. Both runs verified the other three flows, so between them all four are verified.
  - Both unknowns have the same cause. c15t's `POST /subjects` to the Inth backend was still pending at the cutoff. c15t then loaded its retry queue chunk `queue-u1uK5oeJ.js`, and the fixture server compressed that chunk on demand, which marks the sample `server-cold-encoding`.
  - Priming never requests the chunk, because the save never stalls without throttling. The desktop Nuxt retry on October 14 hit the same chunk.
  - A rerun only succeeds if the backend happens to answer in time.

## Machine load

`ec quiet` found nothing to stop. Executor's workerd process ran throughout, using 6–65% of one core out of eight.

The c15t rows match the c15t-only run in `results/2026-10-14-v3-c15t/`, which used the same code and collector. Most desktop medians are identical, and every mobile LCP cost is within 8 ms. Paired samples load the CMP page and its baseline back to back, so steady background load affects both.
