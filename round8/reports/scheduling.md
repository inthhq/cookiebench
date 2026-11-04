# Lane: scheduling — load c15t's client JS after the hero image

## Result

Deferring c15t's client chunks until the hero image finishes cuts the mobile LCP cost from **+400 ms to +32 ms** (15 pairs, IQR 28–36). Banner visibility stays the same: the banner is still in the HTML and paints at FCP.

The cost: the banner's JS hydrates about **2.1 s later** (4,079 ms vs 1,981 ms). Taps before that are not lost. c15t's existing early-tap script hides the banner at tap time, and the choice is saved once the JS arrives. For a returning visitor with a warm cache, the first gated script starts **+34 ms** later.

Best trigger: **hero image loaded, or any input on the banner, whichever comes first** (`load` as fallback). `idle` gives no gain.

## 1. Measurements

Setup: c15t built from `c35b112b7` (3.2.0-canary.0), packed with `bun pm pack`, and overridden into copies of the CookieBench Next fixture.

- Control: `/home/kaylee/.t3/scratch/lcp-fleet/scheduling/cb-control`, ports 4350/4440.
- Candidate: `.../scheduling/cb-cand`, ports 4351/4441.
- Profile: `mobile-article-v1` copied into each `run.json` (the CLI has no `--profile` flag).

Command (retries while another agent holds CookieBench's machine-wide measurement lock):

```
/home/kaylee/.t3/scratch/lcp-fleet/scheduling/bin/bench-cand.sh <ws> benchmarks/with-c15t-nextjs/run[-image|-load|-idle].json <label> <N> <scenario>
# wraps: node packages/cli/src/index.ts run --config <cfg> --scenario <s> --iterations N --warmups 2 --output <file>
```

Summaries come from `bin/summarize.py`. Raw envelopes are in `scheduling/results/`. All deltas are medians of per-pair (c15t − baseline route) differences. The "clean" rows ran at load average about 5; other rows ran while other agents were benchmarking (load average 13–54) and are noisier.

### Load scenario (fresh visitor, cold cache)

| Arm | Pairs | initial.transfer Δ | initial.requests Δ | FCP Δ | **LCP Δ** (IQR) | banner.visible | banner clickable (`consent.resolution`) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Control (canary), clean | 10 | +104,788 B | +5 | +22 | **+400** (395–404) | 241 | 1,981 |
| Control (canary), noisy | 15 (12 valid) | +104,782 B | +5 | +28 | +400 (375–419) | 257 | 2,007 |
| Defer, `image` trigger, clean | 15 | +106,202 B | +6 | +16 | **+32** (28–36) | 253 | 4,079 |
| Defer, `image`, noisy | 15 (11 valid) | +81,244 B | +3 | +144 | +60 (−208–244) | 816 | 4,081 |
| Defer, `load` trigger | 10 | +106,198 B | +6 | +60 | **+26** (4–57) | 331 | 4,324 |
| Defer, `idle` trigger | 10 | +106,195 B | +6 | +40 | +406 (382–423) | 303 | 2,902 |

Why `initial.transfer` barely moves: in the `load` scenario there is no input, so CookieBench counts every byte in the 5 s window as "initial" (`partitionNetwork` in `runner/src/network.ts`). Deferral changes when those bytes arrive, not how many arrive. The waterfall below gives the bytes that compete with the hero.

### Interactivity

| Measure | Control | Defer (`image`) | Cost |
| --- | ---: | ---: | ---: |
| Banner JS hydrated / clickable (`consent.resolution`, load scenario) | 1,981 ms | 4,079 ms | +2,098 ms |
| `accept`: `action.input-to-next-paint` (click right after readiness) | 56 ms | 44 ms | none |
| `accept`: `action.consent-effective` (after input) | 50 ms | 41 ms | none |
| `accept`: readiness, the earliest time the runner clicks | 2,020 ms | 4,082 ms | +2,062 ms |
| Tap at 1.0 s → first gated script runs (my probe, 5 reps, median) | 2,466 ms | 2,804 ms | +338 ms |
| Tap at 2.5 s → first gated script runs (my probe, 5 reps, median) | 2,728 ms | 3,809 ms | +1,081 ms |
| Banner hides on that tap | at tap | at tap | none |

The `accept` rows come from runs of 15 (control) and 10 (defer, clean) pairs. Baseline samples "fail" in `accept` because the baseline page has no banner to click; that is expected.

### Returning visitor (`returning-accepted`, warm cache)

| Arm | Pairs | LCP Δ | `consent.resolution` | First gated script runs |
| --- | ---: | ---: | ---: | ---: |
| Control, clean | 10 | 0 | 652 | 833 ms |
| Defer `image`, clean | 10 | 0 | 686 | 867 ms (+34) |
| Control, noisy | 15 | 0 | 638 | 842 ms |
| Defer `image`, noisy | 15 | −4 | 1,363 | 1,568 ms |

With a warm cache the hero is already `complete`, so the trigger fires at once. The +34 ms is the extra lazy-import step.

The fixture registers its scripts with `useScriptLoader`, which runs client-side. Scripts in `ConsentRoot`'s `scripts` config are started by an inline server script, and that is unaffected (see section 4).

## 2. Waterfall, one visit each (my probe, same CDP throttling as the profile)

`bin/probe.mjs`, files `results/wf-control.txt` and `results/wf-cand.txt`. Times in ms from navigation start; transfer bytes.

**Control** (hero ends 3,927):

| Start | End | Bytes | Before hero | Request |
| ---: | ---: | ---: | --- | --- |
| 0 | 237 | 15,597 | yes | HTML |
| 274 | 500 | 5,734 | yes | 142a… (Next) |
| 278 | 1,744 | 76,647 | yes | 8abc… (React/Next framework) |
| 289 | 950 | 19,348 | yes | 086f… (Next) |
| 289 | 623 | 3,924 | yes | turbopack runtime |
| 289 | 679 | 6,551 | yes | 7ac1… (Next) |
| 289 | 814 | 6,719 | yes | **515a… (c15t)** |
| 289 | 1,572 | 43,382 | yes | **14c7… (c15t)** |
| 289 | 1,241 | 18,923 | yes | **0445… (c15t)** |
| 290 | 3,927 | 493,920 | — | courtyard.png (LCP) |
| 3,912 | 4,087 | 916 | no | reading-list.js |
| 3,941 | 4,136 | 6,029 | no | c15t script-loader chunk |
| 4,177 | 4,343 | 1,142 | no | reading-list.json |
| 4,694 / 4,699 / 7,244 | … | 7,992 / 10,980 / 4,657 | no | c15t dialog chunks (warmed) |

**Defer `image`** (hero ends 3,862):

| Start | End | Bytes | Before hero | Request |
| ---: | ---: | ---: | --- | --- |
| 0 | 236 | 15,874 | yes | HTML |
| 315–320 | 515–1,541 | 5,728 / 76,620 / 19,345 / 3,928 / 6,531 | yes | Next/React chunks (same as baseline) |
| 320 | 940 | 1,814 | yes | **defer helper (only c15t bytes before hero)** |
| 320 | 3,862 | 493,920 | — | courtyard.png (LCP) |
| 2,550 | 3,029 | 916 | yes | reading-list.js (page hydrates earlier: it is outside the island) |
| 3,184 | 3,366 | 1,142 | yes | reading-list.json |
| 3,889 | 4,418 | 6,227 | no | c15t chunk |
| 3,898 | 4,591 | 43,301 | no | c15t chunk |
| 3,898 | 4,460 | 18,900 | no | c15t chunk |
| 6,626+ | … | 6,028 / 7,961 / 10,983 / 4,660 | no | script loader + warmed dialog chunks |

Bytes that finished before the hero (hero excluded):

| Arm | All requests | c15t's share |
| --- | ---: | ---: |
| Control | 196,825 B | 69,024 B |
| Defer | 131,898 B | 1,814 B |

The deferred arm's LCP entries are a `P` at about 700 ms, then the hero `IMG` (size 62,586). Hydrating the banner adds no later LCP entry (checked in 3 runs).

## 3. Theories, ranked by ms saved per unit of risk

1. **Load c15t's client chunks after the hero image (this lane). Saves about 368 ms.**
   - Evidence: LCP Δ went from +400 to +32/+26 under both the `image` and `load` triggers. c15t bytes before the hero went from 69 KB to 1.8 KB.
   - Risk: the banner hydrates about 2 s later. CookieBench readiness at about 4.1 s leaves only 0.9 s of margin in its 5 s observation window: 1 of 15 noisy-run samples failed with "Adapter did not expose public consent state". The app must also restructure (see section 4).
   - Would falsify it: an LCP delta that stays near +400 with chunks starting after the hero. That did not happen.

2. **The residual +32 ms is the HTML.** The c15t page's HTML is 15.6 KB gzip vs 3.6 KB for baseline. That comes from the 69 KB raw / 8.9 KB gzip inline `<style data-href="c15t-first-paint">` (the full banner + dialog sheet, ahead of the hero `<img>`) plus the RSC flight copy of that CSS (the CSS text appears twice in the document).
   - About 12 KB at 200 KB/s predicts 60 ms; observed is 32 ms.
   - A critical-CSS-only inline sheet, CookieYes-style, would take most of the rest. That is the payload lane's area; I did not test it.
   - Would falsify it: trimming the inline CSS and seeing no LCP change.

3. **`idle` trigger: rejected.** +406 ms, the same as control. `requestIdleCallback` fires while the main thread waits on the network, about 1 s in, which is still during the hero download.

4. **Interaction-only trigger: rejected as the sole trigger.** It gives the same LCP as `image`, but a returning visitor's client-registered scripts would never start without a tap. It is useful as an extra wake-up, and the helper always listens for input on the island.

## 4. Implementation

**Branch `t3/8778ea0f`, commit `d4234da66`** (not pushed): `feat(nextjs): add opt-in deferConsent island that loads consent JS after the hero image`.

- `packages/nextjs/src/defer.tsx`: new `deferConsent(load, { until, timeout, nonce })`, exported as `@c15t/nextjs/defer` and `c15t/next/defer` (umbrella shim regenerated). 1,131 B gzip. It imports nothing from the consent runtime.
  - Server: `React.lazy` imports the app's consent module at once, so the banner HTML, inline CSS and the server script start render as today.
  - Browser: the lazy loader waits for the trigger: `image` = first `img[fetchpriority="high"]` load/error, falling back to `load`; also `load`, `idle`, input on the island, or a 10 s timeout. The server HTML stays inside a dehydrated `Suspense` boundary until then.
  - Inline script (ES5, at parse time): starts the load on `pointerdown`/`keydown`/`focusin`/`click` inside the island. It queues clicks on non-banner controls (sets `aria-busy`) and replays them after hydration. Stock banner `[data-action]` buttons are left to c15t's existing `__c15tEarlyTaps` script, which hides the banner and replays the choice. React 19.2 itself drops a click on a boundary that is still waiting for a lazy chunk (`dispatchEvent` stops propagation and doesn't replay discrete events), so this capture is needed.
- Tests added:
  - `src/__tests__/defer.test.tsx` (browser): no load before the trigger, server HTML kept, hydrates without recoverable errors, a pre-hydration click replays exactly once, stock banner actions are not intercepted.
  - `src/__tests__/defer-server.test.tsx` (node): the server renders the module and the capture script.
  - A case in `root-server-start.test.tsx`: a deferred island still emits `ConsentRoot`'s server script start after the page, so config `scripts` for returning visitors start at parse time.
- Ran: `bun run --cwd packages/nextjs test src/__tests__/root-server-start src/__tests__/defer --coverage.enabled=false` (13 passed), `bun run check-types` (pass), `bun oxlint` on the changed files (clean), `bun run build` (pass).
- Not done: no docs page and no `.tegami` note. It is an experiment, not a merge candidate yet.

**Fixture change used for the numbers:** `scheduling/fixture-defer.patch`.
- `app/defer.tsx`: a copy of the helper, the same logic apart from a pressed-state opacity and the trigger chosen by `?defer=`.
- `app/deferred-consent.tsx`: the island.
- `app/(consent)/layout.tsx`: renders `{children}<Interaction/><DeferredConsentFixture state={resolveConsent()}/>`, so the page is outside the island.
- `app/consent.tsx`: drops `Interaction`.

This uses only the public API, so the fixture-side version needs no library change.

What it breaks or trades off:

- **App structure.** The page has to render outside the deferred island, or it would wait for c15t to hydrate. Components that call c15t hooks must live inside the deferred module. Today's quickstart, where `ConsentRoot` wraps `{children}`, does not get this benefit unchanged.
- **Customize** tapped before hydration opens the dialog only after the chunks arrive, about 0.6–1.3 s later. This is inferred from the chunk timing, not measured.
- **Client-registered scripts** (`useScriptLoader`) for a cold-cache returning visitor start after the hero, about 2 s later. Config `scripts` with the server start are unaffected. Warm cache: +34 ms.
- **CookieBench readiness margin** shrinks to about 0.9 s within the 5 s window.
- **One extra request** for the 1.8 KB helper chunk. CookieBench's `initial.transfer` rises by about 1.4 KB.

### Which trigger

`image` (with input as an extra wake-up and `load` as the fallback). It ties `load` on LCP (+32 vs +26, within noise) and makes the banner clickable about 245 ms sooner (4,079 vs 4,324 ms). The gap grows on pages with late third-party subresources, which push `load` back.

`idle` saves nothing. Interaction-only leaves client-registered scripts waiting forever.

Wake-on-input bounds the worst case for people who tap early:

| Tap time | Extra delay before consent takes effect |
| ---: | ---: |
| 1.0 s | +338 ms |
| 2.5 s | +1,081 ms |

The banner hides at the tap in both cases.

## 5. Not verified

- The **library** `c15t/next/defer` build was not run end to end in CookieBench. The benchmarks used the fixture copy of the same helper. The library version is covered by browser and node unit tests only.
- **Cold-cache returning visitor** timing: CookieBench has no such scenario, and I did not measure it.
- Server-start timing with deferral is shown by a render test, not a browser timing.
- Customize-before-hydration latency.
- One probe sample showed LCP 9.8 s while machine load average was 54. Four repeats showed the hero as the final LCP entry at about 3.47 s. I treat it as CPU starvation but did not prove it.
- My probe's consent-change timestamp hook never fired. I used the first gated script execution as the "consent effective" point instead.
- The harness lane's `harness/bench.sh` appeared mid-run. I did not use it.
