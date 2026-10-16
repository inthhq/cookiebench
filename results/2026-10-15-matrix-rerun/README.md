# Full CMP matrix rerun, October 15 2026

This repeats `results/2026-10-15-matrix/` with the same configs, plans, seed, machine and collector, to check whether background CPU load moved the numbers. It did not change any ranking.

Every entry has collector hash `f359851e4f7b15d549e882d641cd3205f71af1a18aebd8f02f4fc5b2eb21eb1d`. The setup is the same as the first run: Apple M1 Pro (macOS 25.6.0), Chromium `153.0.8010.12`, Node `v24.21.0`, 15 pairs and 3 warmups per arm, seed `20261009`, and Bonferroni-adjusted 95% intervals over 365 comparisons per profile. See `results/2026-10-15-matrix/README.md` for the profiles and how CookieYes runs.

## Evidence

| Directory | Contents | Result |
| --- | --- | --- |
| `desktop/` | 24 load and flow entries, plus the reference audit | Completed 16:50 UTC. Every entry recorded |
| `mobile/` | Same plan on the mobile profile | Completed 22:21 UTC. Every entry recorded |
| `desktop-correctness-retry/` | Desktop Next.js and Nuxt flows, run again with the same config on October 16 | Both changed cells verified. The other 70 cells matched `desktop/` |

`summary.json` has one row per CMP, framework and profile. It uses the same format as the first run, so the two can be compared row by row:

```sh
node results/2026-10-15-matrix-rerun/summarize.mjs > results/2026-10-15-matrix-rerun/summary.json
```

## Compared with the first run

- **LCP cost:** desktop moved by at most 8 ms in any cell, and 0 ms at the median. Mobile moved by 4 ms at the median and 32 ms at the 90th percentile. The largest mobile changes were Didomi (up to 104 ms), whose remote bytes changed between runs, and OneTrust on Nuxt (76 ms). The mobile LCP order of the ten CMPs is unchanged.
- **Banner time:** cells moved by 61 ms at the median on desktop and 24 ms on mobile. The largest changes were Ketch, Didomi, Osano and Enzuzo, whose banners wait on their own backends. c15t's mobile Script banner went from 1,545 to 1,954 ms with LCP unchanged. That banner waits on the Inth backend. c15t still shows the banner first in 10 of 12 cells. CookieYes is faster on mobile Script and mobile React, as in the first run.
- **Bytes:** within 0.4 KB except Didomi, which changed by up to 21 KB in either direction.
- **c15t:** every LCP cost is within 8 ms of the first run.

### Flow changes

| Profile | CMP | Framework | Flow | First run | Rerun | Retry |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop | c15t | Next.js | reject | verified | unknown (`server-cold-encoding`) | verified |
| Desktop | iubenda | Nuxt | reject | verified | failed (`followup:banner-missing`) | verified |
| Mobile | c15t | TanStack Start | save | unknown, then verified on retry | verified | — |

The c15t unknown has the same cause as in the first run. c15t's `POST /subjects` to the Inth backend was still pending at the cutoff. c15t then loaded a lazy chunk the fixture server had not compressed in advance, which marks the sample `server-cold-encoding`. This run verified all four c15t flows on mobile TanStack Start without a retry.

The known gaps in the first run's README still apply. CookieYes and Cookie Control have no save flow. Osano fails accept and reject on mobile. Enzuzo and Ketch have no LCP interval. Didomi on mobile React now has an LCP interval, because its bytes held steady within the cell this time.

## Machine load

`ec quiet` found nothing to stop. `rerun-cpu.tsv` is not kept, but it recorded one sample a minute for 513 minutes. Executor and its workerd process used 30% of one core on average and 53% at most, out of eight cores. The one-minute load average was 1.9. That is about the same load as the first run, so this rerun shows that steady load at this level doesn't move the results. It does not show what an idle machine would give.
