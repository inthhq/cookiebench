# Harness lane report

Lane: harness. Ports 4330 (proxy) / 4420 (Next). Checkout: `/home/kaylee/.t3/worktrees/c15t-private/t3-2b07ced9`, canary HEAD `c35b112b7`, clean, no c15t source changes.

## The harness

```sh
/home/kaylee/.t3/scratch/lcp-fleet/harness/bench.sh <c15t-checkout> <port-base> [iterations]
# Next port = port-base + 90 (override with NEXT_PORT). Output: harness/work/<port-base>/out/<label>-<ts>/summary.md
```

Full instructions: `/home/kaylee/.t3/scratch/lcp-fleet/harness/README.md`.

What it does:
1. Builds the checkout (`bun install --frozen-lockfile` if needed, then `bun run turbo run build --filter='c15t...'`).
2. Packs `c15t` and the 12 workspace packages it reaches with `bun pm pack --ignore-scripts`. This is the same dependency walk as CookieBench `packages/source-build`, minus the docs-regenerating `prepack`.
3. Rsyncs CookieBench into a private workspace, points `c15t` plus pnpm `overrides` at the tarballs, and rewrites the ports in `package.json` and `run.json`. Runs `pnpm install` and verifies every installed c15t package against its tarball.
4. Runs `next build`.
5. Runs `cookiebench run` with the mobile profile, the `load` scenario only, N pairs and 1 warm-up, then `cookiebench compare` for LCP, FCP, transfer and requests.
6. Runs its own Playwright waterfall and HTML inspection, then prints `summary.md`.

Shared-machine behaviour:
- It queues on CookieBench's machine-wide lock (`/tmp/cookiebench-v3-measurement.lock`), retrying every 20 s. The waterfall script takes the same lock, so it never measures during another lane's run.
- Each port base gets its own work dir with a `flock`.
- It kills only the server it started.

Toolchain:
- Node 26 breaks the c15t build: `@c15t/ui`'s `tcm` step loads yargs as ESM and fails. The script uses Node 24.21.0 from `~/.cache/nub`.
- System Bun 1.4.3 rejects c15t's frozen lockfile. Bun 1.3.11 and pnpm 11.25.0 are installed in `harness/tools/`.
- There is no `npm` on the machine.
- Compression: the fixture proxy fetches identity bytes from Next and Brotli-compresses every JS and HTML response itself (quality 11, cached by content hash). The c15t chunks and the document arrive `br`; the PNG is identity. Next's own compression never reaches the browser.

## 1. Baseline: canary HEAD `c35b112b7`, 15 pairs

Config: `harness/work/4330/out/baseline-c35b112b7-20261102-193548/run.json`, same directory for `envelope.json` and `summary.md`. Medians per arm come from the CookieBench envelope.

| Metric | Control | c15t canary | Delta |
| --- | ---: | ---: | ---: |
| initial.transfer (B) | 613,137 | 717,849 | +104,712 |
| initial.requests | 10 | 15 | +5 |
| FCP (ms) | 256 | 284 | +28 (compare: 12 to 44) |
| LCP (ms) | 3,460 | 3,854 | **+396** |
| banner.visible (ms) | n/a | 260 (238–412) | |

LCP paired median delta: **396 ms, 95% interval 392 to 398, over 14 complete pairs.**
- The interval comes from the harness bootstrap, not CookieBench.
- `cookiebench compare` printed the same 396 ms median but no interval ("inconclusive"). It requires all 15 pairs to be eligible.
- In candidate pair 13 the hero image was still loading at the 5 s cutoff, so LCP was right-censored. The other 14 candidate LCPs were 3,836–3,952 ms.

For comparison, CookieBench's 2026-10-15 run of c15t 3.0.0 measured +104,030 B and +400 ms. **Canary HEAD is effectively unchanged from 3.0.0 on this metric.**

Second run (`baseline2-c35b112b7-20261102-195058`), same code, taken while the machine was loaded (load average 20–28 on 16 threads):

| | Control FCP | Incomplete samples | LCP delta | Harness interval |
| --- | ---: | ---: | ---: | --- |
| Run 2 | 716 ms (run 1: 256) | 7 of 30 | +392 ms | 244 to 500 |

The median held, but the interval is about 60x wider. Treat any run with control FCP over 400 ms as noisy; `summary.md` now prints a warning for that.

## 2. Waterfall: one c15t visit (run 1, pair 1, LCP 3,848 ms)

Source: my Playwright script (`lib/waterfall.mjs`) with the same profile: 390x844, DPR 3, CPU 4x, 200,000 / 93,750 B/s, 150 ms latency. Start and end times come from CDP events, in ms from the document request.

CookieBench's envelope records request start times and bytes but no end times, which is why the harness has its own waterfall script. Its LCP matched CookieBench closely: medians 3,428 vs 3,848 ms (+420 ms) over 5 pairs.

| # | URL | Transfer B | Start | End | Before hero end | Not in control |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | `/?scripts=2` (document) | 15,612 | 0 | 229 | yes | +11,808 B vs control doc |
| 2 | `5662308818c74fc2.js` | 5,694 | 207 | 506 | yes | |
| 3 | `dcae1cfec8000b44.js` | 76,661 | 208 | 1,684 | yes | |
| 4 | `0b97eafe788355d6.js` | 19,421 | 208 | 807 | yes | |
| 5 | `turbopack-c49c4b85baddf540.js` | 3,921 | 209 | 477 | yes | |
| 6 | `6b5c4e80b7e40455.js` | 6,531 | 209 | 558 | yes | |
| 7 | `c55b0489aa50e4a4.js` (c15t) | 6,718 | 209 | 814 | yes | yes |
| 8 | `46e6820293f10806.js` (c15t) | 43,316 | 209 | 1,466 | yes | yes |
| 9 | `2c860620840cd878.js` (c15t) | 18,907 | 210 | 1,144 | yes | yes |
| 10 | `courtyard.png` (hero) | 493,920 | 213 | 3,829 | (hero) | |
| 11 | `reading-list.js` | 916 | 2,001 | 2,166 | yes | |
| 12 | `40ffc8440dfc298f.js` (c15t, lazy) | 6,032 | 2,006 | 2,238 | yes | yes |
| 13 | `reading-list.json` | 1,142 | 2,172 | 2,337 | yes | |
| 14 | `46a8e7e299c85965.js` (dialog) | 7,997 | 3,846 | 4,076 | no | yes |
| 15 | `bfcfaddd8008cae9.js` (dialog) | 10,977 | 3,847 | 4,098 | no | yes |

In the paired control visit, the hero starts at 181 ms and ends at 3,409 ms. That visit also loads `3974dfcfe9ef1bd5.js` (1,127 B), which the c15t page doesn't.

Bytes that finished before the hero image:

| | Requests | Bytes |
| --- | ---: | ---: |
| Control | 9 | 119,217 |
| c15t | 12 | 204,871 |
| Difference | +3 | **+85,654** |

The +85,654 B breaks down exactly:

| Source | Bytes |
| --- | ---: |
| Document | +11,808 |
| 3 eager c15t chunks | +68,941 |
| Lazy chunk `40ffc8` | +6,032 |
| Control-only chunk | −1,127 |

At 200 KB/s, 85.6 KB takes about 428 ms. The hero ended 420 ms later than in the control, and CookieBench's LCP delta is 396 ms. **All of the LCP cost is bytes that finish before the hero image.** The two dialog chunks (19 KB) start on the `load` event, after the hero, and cost no LCP.

Protocol notes:
- The fixture is HTTP/1.1 (`nextHopProtocol`), with six connections per host. The three c15t chunks wait for a free connection: their responseStart is 479–561 ms against 227 ms for the earlier chunks. The hero gets a connection at once.
- Chrome adds the emulated 150 ms latency when the response body completes, not to the headers. `page.ttfb` and `responseStart` read 5–20 ms, but each request's end still includes the 150 ms. Example: the control document is 3.6 KB and ends at 171 ms.

## 3. What the HTML carries for c15t

Source: plain HTTP fetches against the running fixture.

| | Control `/baseline` | c15t `/` |
| --- | ---: | ---: |
| Document, br / decoded | 3,285 / 12,355 | 15,068 / 91,320 |
| Module `<script src>` (+ noModule) | 6 (+1) | 8 (+1) |
| Module script bytes, br / raw | 110,653 / 443,987 | 177,562 / 675,642 |
| Inline `<script>` (RSC payload) | 7 / 8,140 B | 9 / 14,475 B |
| `<style>` | 1 / 1,261 B | 2 / 70,456 B |
| `<link>` | preload + icon | preload + icon (no stylesheet link) |
| Byte offset of hero `<img>` | 2,576 | 71,956 |
| Byte offset of banner root | n/a | 73,650 |

- **CSS reaches the page as one inline `<style data-precedence="c15t" data-href="c15t-first-paint">` of 69,195 B raw.** It is the whole `@c15t/ui/styles/sheets/first-paint` sheet (69,284 B raw, 7,807 B with Brotli on its own). React 19 hoists it into `<head>` via `packages/react/src/components/shared/surface-styles.tsx`, so it sits in front of the hero `<img>`.
  - No CSS file is requested.
  - The browser bundle gets the 142 B deferred stub (`packages/nextjs/src/build.ts`), so the CSS is not duplicated in JS.
  - About 7.8 KB of the document's +11.8 KB is this CSS. The rest is banner markup and RSC data.
- c15t-only chunks:

  | Chunk | br B | raw B | Strings found |
  | --- | ---: | ---: | --- |
  | `46e68…` | 42,864 | 154,679 | banner, dialog, `ConsentDialog`, `subjects`, iframe, gvl, translations |
  | `2c860…` | 18,456 | 59,425 | banner, dialog |
  | `c55b0…` | 6,268 | 19,263 | gvl, translations, `fetch(` |
  | Lazy `40ffc…` | 5,583 | 17,676 | `__c15t` |
  | Post-load `46a8e…` | 7,547 | 23,253 | dialog |
  | Post-load `bfcfa…` | 10,525 | 58,436 | dialog, widget |

## 4. Theories ranked (expected ms saved per unit of risk)

All estimates use about 5 ms per KB of bytes moved out of the pre-hero window. The waterfall arithmetic above supports that rate.

1. **Move the eager c15t chunks (68.9 KB br) out of the pre-hero window.** Expected: up to ~345 ms.
   - Options: load them after `load`, or keep only a small chunk that makes the server-rendered banner's buttons work.
   - Evidence: they are 80% of the extra pre-hero bytes, and all finish before the hero.
   - Risk: banner clicks before hydration, and later starts for gated scripts on return visits.
   - Falsified if a build with these chunks deferred does not cut the LCP delta by roughly 5 ms per KB moved.
2. **Trim `46e68…` (43 KB br).** It ships dialog, iframe-blocker, gvl and `subjects` code in the eager path, and the fixture uses no IAB.
   - Expected: 5 ms per KB removed.
   - Risk: low if the code moves to the dialog chunk that already lazy-loads.
   - Falsified if the strings are only type guards and the module graph is all needed for the first render.
3. **Inline only the banner's critical CSS instead of the 69 KB first-paint sheet.** This is the CookieYes approach.
   - Expected: ~25–30 ms (about 6 KB br saved), plus the hero `<img>` reaches the parser earlier (hero start 213 ms vs 181 ms in the control).
   - Risk: an unstyled flash of the dialog or other surfaces until the full sheet loads.
4. **Defer the lazy `40ffc…` chunk (6 KB, starts at 2,006 ms after hydration) until after `load`.**
   - Expected: ~30 ms.
   - Risk: low, unless it is needed for the first interaction.
5. **Fewer requests.**
   - Each extra request adds 150 ms to its own completion, and on HTTP/1.1 it holds one of six connections. The three c15t chunks already queue for a connection, but the hero does not.
   - Merging chunks saves nothing on bandwidth. It mainly helps if it frees a connection for the hero, and that does not happen here.
   - Expected: small (tens of ms at most). Lower priority than cutting bytes.

## 5. Not verified, or caveats

- **Pair 13 cause unknown.** I didn't establish why the hero hadn't finished by 5 s; most likely a CPU stall from other lanes' builds, which the lock doesn't cover. The 14-pair interval comes from the harness bootstrap, not `cookiebench compare`.
- **`initial.transfer` is bimodal for c15t.** It reads 717.8 KB when the two post-load dialog chunks make CookieBench's cutoff and 698.9 KB when they don't (loaded machine). Use "bytes finished before hero end" for LCP-relevant bytes.
- **Workspace root path in one chunk.** Next infers `/home/kaylee` as the Turbopack root because `/home/kaylee/package-lock.json` exists, and embeds a work-dir path in one shared chunk. Both arms carry the same path. Absolute byte counts can differ by a few bytes between agents' work dirs. I left the fixture config unchanged.
- **Chunk attribution is by string search only.** The payload lane should do the module-level breakdown.
- **Not measured:** time until the Accept button responds, and when the first gated script starts for a returning visitor. This lane measured only the `load` scenario.
- **Waterfall LCP is not CookieBench's.** The waterfall script does not reproduce CookieBench's readiness gating, observers or CPU calibration. Its LCP tracked CookieBench within about 25 ms here, but use CookieBench for the delta.
