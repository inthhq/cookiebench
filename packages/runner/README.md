# Browser runner

The runner builds declared production fixtures, starts their servers, waits for readiness, and executes one measured browser workload at a time. Effect v4 scopes own the process groups, browser and contexts. Interrupting `runBenchmarkPromise(config, { signal })` closes those resources. A machine-wide lock rejects overlapping runner processes.

```ts
import { runBenchmarkPromise, referenceRunConfig } from "@cookiebench/runner";

const result = await runBenchmarkPromise({
  ...referenceRunConfig({ iterations: 5 }),
  warmups: 1,
  seed: 42,
});
```

`RunConfig` and `decodeRunConfig` validate fixtures, scenarios and device profiles before execution. Results pass the shared versioned result schema. The CLI writes the immutable local envelope before optional database ingestion. Runner consumers that call the API directly must persist that returned envelope themselves.

## Fixture contract

A fixture declares a production build command, production start command, working directory, URL and HTTP readiness deadline. Commands use argument arrays, without shell interpretation. A fixture with no server declaration uses an already-running deployment. Fixtures sharing a readiness URL share a server within the run.

The adapter declares CSS selectors for the banner, readiness condition and action controls. Selectors and visibility observation traverse open shadow roots. Cross-origin frames and closed shadow roots need a separate adapter implementation; this release cannot measure their internal UI. Missing expected UI fails instead of producing a zero.

A public fixture bridge, named by `adapter.stateGlobal`, exposes observed product state:

```ts
{
  consent: 'unset' | 'accepted' | 'rejected' | 'custom',
  allowedCategories: string[],
  scripts: [{ id: string, category: string, at: number }],
  resolvedAt?: number,
  persistedAt?: number,
  remotePersistedAt?: number,
  remoteError?: string,
  pageActionAt?: number,
  storageWrites?: [{ key: string, category: string, at: number }],
  frames?: [{ id: string, category: string, at: number, url?: string }]
}
```

All bridge times use `performance.now()`. The bridge must observe public APIs and actual controlled script execution. It must not infer consent from a closed banner, predict an execution from a request, or timestamp a local write that it cannot observe. `resolvedAt` means the policy and effective permissions have resolved, not merely that the SDK is ready. Omitted observations remain unavailable. Reload restoration checks work without a local-write timestamp.

The runner appends `token=<sample UUID>` and `scripts=<workload count>` to each measured URL. Optional controlled server logs use `serverEventsUrl?token=…` and return `{ type: 'script', id, category, timestamp }` rows, where timestamp is server epoch milliseconds. Server-confirmed egress and browser script execution are separate evidence. Use controlled fixtures only; do not retain real visitor identifiers.

## Collection and limits

Network collection uses passive CDP events. Transfer bytes come from completed `loadingFinished.encodedDataLength`; decoded body bytes sum `dataReceived.dataLength`. A body no renderer read, such as a `rel=prefetch` response, reports zero `dataLength`; its decoded size is the identity Content-Length or stays unknown when compressed, and it gets no body digest. Uncached responses whose transfer is zero or smaller than their encoded body, or whose identity body sizes disagree, withhold that phase's byte totals. Encoded body bytes require completed uncached Content-Length evidence or identity encoding with known decoded bytes. These quantities remain separate. Cached transfer can be zero while representation size remains unknown. Response-body digests retain asset identity where the protocol supplies the body. The network collector installs no request interception or response rewriting. Exact parsed hostnames determine first/third-party attribution. Requests from workers, child frames or other unverified targets make page-target coverage incomplete and aggregate request/byte totals unavailable.

Owned native observers collect bounded main-document foreground FCP, CLS, and LCP under `bounded native vitals v3`. The v3 LCP is withheld as right-censored when the declared primary content is absent, still loading, or has no Element Timing paint at the cutoff. TTFB uses `bounded navigation timing v2`, the native navigation responseStart at or before cutoff, without a foreground restriction. CLS uses maximum session windows and excludes recent-input shifts. Native observers stay connected for a 250 ms presentation grace after the cutoff, then drain. Entries are admitted by occurrence time, not callback delivery time. Cross-origin frame vitals and whole-visit field Core Web Vitals are outside this contract. Pinned web-vitals still runs, but its unfinalized snapshots are raw diagnostics. `page.lab-inp` is withheld. Trusted related pointerdown/up/click or keydown/up timestamps identify native interaction IDs for primary and followup event durations. Missing, censored or unfinished boundary interactions remain unavailable.

Animation-frame polling timestamps layout visibility with `performance.now()` when inspected. It does not establish painted pixels or actionability. A separate Element Timing observation measures the declared primary image when a positive native render timestamp exists. Native LCP attribution records candidate role, identity, size and URL, so a consent banner winning LCP stays distinguishable from article content.

Load observation ends at the declared duration relative to navigation. Action observation ends at captured input plus the declared duration. DOM state freezes at the deadline, so later dismissal cannot establish timed success. If the timed check cannot verify completion, the runner records a separate public-state and DOM snapshot after the correctness wait. Completion verified only after cutoff produces an incomplete sample and no timed dismissal value. Server correctness checks use in-window events; later server rows remain raw evidence. Stop merges append-only timestamped script, storage and frame markers at or before the cutoff without importing later permissions. Network snapshots exclude requests and completion bytes beyond that deadline. Long-task tails are clipped to the interval when their native entries are available; entries not created or queued by the browser cannot be reconstructed. Returning preparation and persistence reloads remain outside the timed visit.

Each primary sample has a fresh context. Returning consent comes from an actual action and a verified reload. Preparation allows the declared observation period after the public state changes so asynchronous persistence can complete before reload. This wait is outside the measured visit and does not establish a persistence timestamp. Cold returning samples restore that storage into another context; warm samples retain the primed context's browser cache. Browser cache and consent state remain independent. Server cache stays shared for the run and is disclosed in the manifest.

The standard followup page action runs in a separate fresh probe, no earlier than the scenario's declared offset after consent input. Its raw sample is retained in `diagnostics.followupProbe`. Automation scheduling and a busy renderer can delay dispatch; the probe does not guarantee input during a blocking task. Planned and actual input times remain in the raw record. Primary dismissal timing never measures a Playwright promise's elapsed time.

This release verifies only the declared controlled workloads and public bridge observations. Uninstrumented vendor scripts, frames, storage and backend writes cannot earn verified timing or blocking claims. Browser-only requests do not establish server egress. Region is a declared profile label, not geolocation or egress-region emulation. Traces, screenshots, cross-tab synchronization, offline recovery, signal suites and memory diagnostics need separate adapters or probes.

## Verification

`pnpm --filter @cookiebench/runner test` runs serial Playwright regressions. `test:unit` covers host attribution and measurement availability. The reference fixture exposes hidden, absent, delayed, shadow-root, hydration-gap, noninteractive, leaking, duplicate-execution and backend-error variants. Browser tests also exercise real native metrics, compressed raw bytes, consent restoration, cache separation and cancellation cleanup.
