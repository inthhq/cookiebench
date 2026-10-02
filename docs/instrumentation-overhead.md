# Instrumentation overhead experiment

`instrumentation audit` compares minimal observation with the full production collector on exactly the same baseline URL. Both arms use fresh isolated contexts, identical CPU/network emulation, the same Chromium process, and serial execution. A recorded seed drives the order within each pair. The output is a standard schema-v3 envelope with methodology `cookiebench-instrumentation-overhead-v1`.

```sh
pnpm cookiebench instrumentation audit --iterations 30 --warmups 3 --seed 20260927 --output artifacts/overhead-reference.json
pnpm cookiebench compare --baseline artifacts/overhead-reference.json --candidate artifacts/overhead-reference.json --metric custom.audit.task-duration
pnpm cookiebench compare --baseline artifacts/overhead-reference.json --candidate artifacts/overhead-reference.json --metric custom.audit.lcp
```

For a production framework baseline, pass its normal paired configuration. The CLI selects its unique baseline fixture. Select a single fresh, cold load scenario; the audit does not exercise consent actions.

```sh
pnpm cookiebench instrumentation audit --config benchmarks/with-c15t-nextjs/run.json --scenario load --iterations 30 --warmups 3 --seed 20260927 --output artifacts/overhead-next.json
```

The runner API requires one baseline fixture and one cold, fresh load scenario with no expected banner. The CLI derives that baseline scenario without changing the page URL or source configuration.

## What the arms collect

The minimal arm installs native paint/LCP observers and one navigation-relative deadline timer. Both arms enable CDP Performance measurements and identical emulation. The full arm additionally installs the actual bounded DOM/animation-frame observer, web-vitals bundle, and passive network collector used by the benchmark. No request interception, replacement SDK, synthetic calibration workload, or artificial CPU delay is added.

Shared metrics are native FCP and LCP, CDP task/script/layout duration deltas, and the actual browser snapshot endpoint. CDP durations use `threadTicks` and convert seconds to milliseconds. CPU collection begins before navigation and ends at the first CDP snapshot after the requested observation deadline. The snapshot transport can arrive late, so raw Performance metrics and browser endpoints remain available. Durations are not normalized to conceal that difference.

Each measured attempt retains arm identity, raw native paint entries, raw CDP before/after values, browser errors, and the full collector's observations and frozen network records where applicable. The first measured sample's diagnostics also contain all excluded warmup attempts. Warmups never enter paired summary cells. Failed measured attempts remain in the output with explicit missing metrics.

The manifest records execution order, seed, collector source hash, lockfile hash, fixture configuration/revision or declared artifact integrity, installed tool versions, CPU, and operating system. It does not recursively hash dependency directories or framework build caches.

## Reading the result

Use paired differences and their uncertainty alongside the observed-window metric. Differences are full collector minus minimal observation. The minimal arm still has measurement overhead, so this experiment estimates the additional cost of the full collector over that shared minimum. It does not measure an unobserved browser.

There is no universal acceptable percentage or subtraction factor. Raw benchmark metrics remain unchanged regardless of this result. Repeat on representative framework baselines and hardware before extending the finding. A reference-page observation cannot establish collector cost on every DOM size or action workflow.

The functional regression ran two measured pairs and one excluded warmup pair. It verified shared URLs, raw warmup retention, available native/CDP metrics, and full-arm observer callbacks absent from the minimal arm. That small concurrent-development check is not an overhead estimate. Run the 30-pair commands only after sources settle and other browser/build workloads stop.

The [serial batch helper](measurement-batches.md) records both audits alongside fixture runs, preserves failed attempts, and writes the paired analyses without changing raw metrics.

The [September 2026 measurement record](v3-measurements.md) reports the serial 30-pair reference and source Next audits, with uncertainty and observed-window differences. The retained original audit envelopes remain available when a later collector correction requires a fresh audit.
