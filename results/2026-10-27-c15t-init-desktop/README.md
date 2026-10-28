# c15t script tag `/init` change, desktop, October 27 2026

This run measures an unreleased change to the script tag that `@c15t/backend` serves, against CookieYes and the published c15t script tag. The change has two parts:

- **Early `/init`:** `c15t.js` sends `/init` before its bundle runs, instead of after.
- **`c15t.init.js`:** an optional `async` tag that sends the same request before `c15t.js` has finished downloading.

It uses the desktop profile only, with cold and warm browser caches.

## Setup

AMD Ryzen 7 2700 (16 logical CPUs, Linux 7.3.0), Chromium `153.0.8010.12`, Node `v24.21.0`, collector hash `f359851e4f7b15d549e882d641cd3205f71af1a18aebd8f02f4fc5b2eb21eb1d`. Profile `desktop-article-v1`: 100 Mbps, no added latency, no CPU slowdown. 15 samples and 3 warmups per cell, seed 1.

| Fixture | Page | c15t code | Backend |
| --- | --- | --- | --- |
| `script-tag-baseline-inth-init-registered-host` | `/baseline` | — | — |
| `script-tag-cookie-yes` | `/baseline?cmp=cookie-yes` | — | CookieYes CDN and services |
| `script-tag-c15t-inth-init-registered-host` | `/` | `@c15t/browser@3.0.0`, served by the fixture server | Inth (`benchmarks-inth.inth.app`) |
| `script-tag-c15t-backend-before` | `/backend-before` | `@c15t/backend@3.2.0-canary.0` before the change | Local, port 4802 |
| `script-tag-c15t-backend-after` | `/backend-after` | The same with the change | Local, port 4812 |
| `script-tag-c15t-backend-after-init` | `/backend-after-init` | The same, plus the `c15t.init.js` tag | Local, port 4812 |

The `backend-*` pages load `c15t.js` from a local `@c15t/backend`, which `benchmarks/c15t-init/backend-server.mjs` serves:

- **Compression:** brotli at quality 11, compressed once per body, as a CDN would serve it.
- **Cache headers:** the backend's own, `public, s-maxage=300, stale-while-revalidate=86400` with an ETag on the scripts and `no-store` on `/init`.
- **Visitor:** a UK visitor (`cf-ipcountry: GB`), so the opt-in banner shows.
- **`/init` delay:** a fixed 80 ms on each `/init`.

`load` is a first visit with an empty browser cache. `load-warm` loads the page once, clears consent storage, then measures a second visit with the browser cache still full. That visitor has not chosen yet, so the banner shows again.

```sh
node benchmarks/c15t-init/backend-server.mjs <before>/packages/backend/dist 4802
node benchmarks/c15t-init/backend-server.mjs <after>/packages/backend/dist 4812
pnpm cookiebench run --config benchmarks/c15t-init/run-desktop.json --iterations 15 --warmups 3 --output result.json
pnpm cookiebench report --file result.json > report.json
```

## Results

Medians in milliseconds, from `report.json`. Transfer is the initial page's bytes on the wire.

| Fixture | Banner, cold | Banner, warm | LCP, cold | LCP, warm | Transfer, warm |
| --- | --: | --: | --: | --: | --: |
| No CMP | — | — | 100 | 64 | 2.4 KB |
| CookieYes | 351 | 180 | 112 | 68 | 11.3 KB |
| c15t 3.0.0 + Inth `/init` | 292 | 210 | 132 | 78 | 5.1 KB |
| Backend, before | 204 | 187 | 124 | 96 | 5.1 KB |
| Backend, after | 187 | 154 | 128 | 108 | 5.1 KB |
| Backend, after + `c15t.init.js` | 158 | 149 | 128 | 106 | 7.2 KB |

- **The change:** on a cold visit, early `/init` and `c15t.init.js` together show the banner 46 ms sooner than before (204 to 158 ms). Early `/init` alone gives 17 ms, which is below the noise threshold in "Known gaps", so this run doesn't confirm it. Adding the tag on top gives a further 29 ms. The order matches the emulated-mobile runs, where the gaps are larger.
- **Against CookieYes:** compare CookieYes with c15t 3.0.0 + Inth. Both reach real services over the internet. c15t shows the banner 59 ms sooner cold and 30 ms later warm. The `backend-*` rows use a server on the same machine with only the fixed 80 ms delay, so they are not a fair comparison with CookieYes.
- **Warm cache:** CookieYes sends `max-age=0, must-revalidate`, so a warm visit still checks script.js, banner.js and its config files one after another, each answered with a 304. That halves its banner time. c15t's `/init` depends on the visitor and is never cached, so every c15t visit waits for one `/init` round trip. In the c15t 3.0.0 fixture, `c15t.js` comes from the fixture server with `max-age=3600` and is not revalidated.
- **LCP:** CookieYes adds 12 ms on a cold visit and c15t adds 24 to 32 ms. Neither changes LCP much on this profile.

## Known gaps

- **Machine load:** other work on the machine kept the one-minute load average between 7 and 11 for the whole run. Five cells lost one sample each. In three, the page didn't load within 15 s. In the other two, the banner or the page's consent state didn't show up in time. The slowest samples reached 1.4 s. The medians follow the same order as the quieter emulated-mobile runs, but treat differences under about 20 ms as noise. A rerun on an idle machine should replace these numbers.
- **Load only:** the local backends use an in-memory SQLite database without migrations, so `POST /subjects` returns 500. That doesn't affect loads, but accept, reject and save flows on the `backend-*` fixtures need a migrated database first.
- **Unreleased code:** the "after" backend was built from an unreleased c15t change based on `canary` at `d5db584e7`, now in c15t/c15t#1653. The "before" backend was built from the same base. Neither is published. `result.json` still labels the three `backend-*` fixtures as `@c15t/browser@3.0.0` from npm, which is wrong; `run-desktop.json` now records them as `3.2.0-canary.0` built from that commit. Their `revision` fields tell the three builds apart.
