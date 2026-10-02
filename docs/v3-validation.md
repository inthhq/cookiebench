# V3 published-artifact validation record

This historical record covers alpha.2. The checked-in consumers now use alpha.3; see the [current upgrade record](alpha3-upgrade.md).

These checks exercise the benchmark implementation and the pinned consumer fixtures. They do not publish a performance ranking. The c15t consumers use the published `3.0.0-alpha.2` artifacts. A one-sample flow check establishes only that recorded attempt.

This is the earlier published-artifact development pass. The [Effect review](effect-review.md) records later collector corrections. The [source-build workflow](source-build.md) and [serial measurement batches](measurement-batches.md) keep exact-source consumers and subsequent runs separate from these npm artifact checks.

That pass's root `pnpm check` passed lint, 23 typecheck tasks, 57 unit tests, and 26 browser tests. The unit run enabled the real PostgreSQL integration tests and process-level CLI cancellation. Browser verification ran serially and included 18 reference tests plus eight production-consumer tests. A passing test suite includes assertions that the known Astro vendor flows fail as recorded below. The root `pnpm build` also passed all 23 tasks with no cached tasks.

| Consumer | Production build and typecheck | Browser evidence |
| --- | --- | --- |
| Script tag, `@c15t/browser/c15t.js` | Passed | 19 of 20 paired attempts passed; the 100 ms save probe failed again |
| Standalone React 19.2.1, Vite 8.3.1 | Passed | 19 of 20 paired attempts passed initially; the withdrawal rerun passed both baseline/CMP attempts after correcting action-vital requirements |
| Next 16.0.7, native `c15t/next` client provider | Passed, including route type generation from a clean `.next` state | All 20 paired attempts passed, including withdrawal, returning accepted/rejected visitors, keyboard rejection, and the 100 ms save probe |
| Vue 3.5.43, native plugin, Vite 8.3.1 | Passed | Load, accept, reject, granular save, preferences, and withdrawal passed in paired one-sample checks |
| Nuxt 4.5.2, native module | Passed | Load, accept, reject, granular save, preferences, and withdrawal passed in paired one-sample checks |
| Astro 5.18.2, Node adapter 9.5.5, native middleware/banner and deferred Svelte dialog | Passed | Fresh load passed. Acceptance/rejection changed consent but failed dismissal checks. Returning acceptance failed with an unexpected visible banner. Paired baselines passed. |
| TanStack Start 1.168.58, native adapter | Passed | All 20 paired attempts passed, including withdrawal, returning accepted/rejected visitors, keyboard rejection, and the 100 ms save probe |
| Script headless, `@c15t/browser/headless`, custom UI | Passed, with positive and negative SDK consumer contracts | 6 of 7 attempts passed initially; withdrawal passed after correcting the runner's asynchronous persistence preparation |

The script, React, and Next configurations include an early page-interaction probe at 100 ms after saving preferences, separately from the normal 500 ms probe. The script-tag run found the page still blocked at 100 ms, and the failure repeated after the collector gained explicit dialog/overlay dismissal and rendered-visibility checks. Both envelopes are retained. The normal 500 ms save probe passed. These two observations establish a repeated failure in this local setup, not its frequency across machines or users.

The published Astro alpha.2 stylesheet lacks its hidden-state rule. After a choice, the banner root remains rendered despite its hidden attribute. It also remains visible after reloading an accepted choice and can intercept the reopen control. Earlier checks that trusted the hidden attribute reported passes; the corrected collector checks computed visibility and retains these failures. The source tree at [commit 9993ae5, Astro styles](https://github.com/c15t/c15t/blob/9993ae57867e33e96783640413a2429b649104c7/packages/astro/src/styles.css#L14) contains a later correction. This checkout measures the published artifact without a benchmark-side CSS patch. This earlier pass did not measure the corrected source. The later [source measurement record](v3-measurements.md) reports its separate evidence. The final targeted regression expects `first-input-failed` and `followup:first-input-failed` for acceptance/rejection, measured effective consent with unavailable dismissal timing, and `unexpected-banner` for the returning accepted visit. Those assertions passed.

The runner retains earlier incomplete envelopes from two measurement issues. Early action input could leave LCP unavailable, and returning-visitor preparation reloaded before an asynchronous save finished. Action scenarios now retain missing page vitals without making them required. Preparation waits for its declared observation period before testing reload persistence. A delayed-persistence reference regression failed before that correction and passed afterward. Targeted React and headless withdrawal reruns then passed. Their original incomplete envelopes remain unchanged.

The reference browser suite passed all 18 tests after the final observation-window corrections. Load observers stop at the navigation-relative deadline; late readiness does not extend that window. Network snapshots retain only revisions observed before the browser-clock deadline. Action network and blocking metrics use the declared input-relative window. Later consent or dismissal milestones remain in the raw result but make the sample incomplete. The reference regressions cover late banner appearance and action completion beyond the window.

The checked-in production-fixture suite covers load, acceptance, and rejection for all eight consumers, plus the returning-accepted Astro regression. Its expected Astro failures are assertions about the published defect, not passing vendor flows.

The matrix records the local fixture checks that were actually run during development. It is not a claim that every full flow was rerun after each collector change. Collector source hashes distinguish newly collected envelopes, and comparisons require matching environments.

Every framework uses the same shared page and local hosted strict opt-in backend. Baselines have separate entry points or builds. The Next fixture renders the page ahead of time and initializes consent on the client; it does not verify server-resolved consent. The current suite does not establish SSR request isolation, policy signal correctness, broad accessibility compliance, production backend reliability, or field Core Web Vitals.

Use a functional run before a larger measurement batch:

```sh
pnpm cookiebench run --config benchmarks/with-c15t-react/run.json --iterations 1 --warmups 0 --output artifacts/react-functional.json
pnpm cookiebench report --file artifacts/react-functional.json
```

For comparable page impact, select the load-only scenario and retain both fixtures in the same run:

```sh
pnpm cookiebench run --config benchmarks/with-c15t-react/run.json --scenario load --iterations 30 --warmups 3 --output artifacts/react-load.json
pnpm cookiebench compare --baseline artifacts/react-load.json --candidate artifacts/react-load.json --metric page.lcp
```

Raw envelopes remain immutable, including failed attempts. Database retries deduplicate by run identity and content; a changed fixture creates a new run. Historical JSON imports retain unknown units and cannot enter these comparisons.
