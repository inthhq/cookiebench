# CookieBench

CookieBench measures consent UI and page impact, with consent checks reported separately from performance. It is maintained by the c15t team. There is no overall grade in methodology v3.

The v3 runner keeps every measured attempt, including failed and incomplete attempts. A missing expected banner or failed consent transition cannot become a successful zero. Historical JSON remains importable, but its old scores and ambiguous size units cannot enter v3 comparisons.

The [measurement correctness audit](docs/measurement-audit.md) documents collector fixes, the article workload, mobile emulation, and limits of every reported metric. Earlier v3 timing results remain available as historical evidence, with affected comparisons withheld by current analysis.

Read the [60-second report](docs/cmp-comparison-2026-09-30.md) for key c15t results, or the [full comparison](docs/cmp-comparison-2026-09-30-details.md) for every framework, competitor and failure. The [earlier alpha.3 report](docs/alpha3-benchmarks.md) remains separate historical evidence.

Raw run artifacts are not stored in this repository. `artifacts/` is gitignored, and no run envelopes, logs or summaries are committed. Reports cite those files by their `artifacts/` path, so the cited evidence cannot be checked from this checkout. To check a result, rerun its configuration.

## Local setup

Use Node 24 and the pnpm version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm cookiebench --help
```

A browser run does not require a database. The default protocol requests 15 measured samples per cell and three excluded warmups. Runs before October 7, 2026 used 30. A two-sample run is a smoke check, not a ranking. Ordinary load warmup observations are excluded and not retained; their counts stay in the configuration. Instrumentation audits retain their warmups separately.

```sh
pnpm cookiebench run --reference correct --iterations 2 --warmups 0 --output artifacts/reference.json
pnpm cookiebench report --file artifacts/reference.json
pnpm cookiebench capabilities verify --reference correct --iterations 1 --warmups 0
```

Reference variants include `correct`, `missing`, `hidden`, `delayed`, `shadow`, `hydration-delay`, `noninteractive`, `leak`, `duplicate`, `backend-error`, and `baseline`. Deliberately broken variants must fail the applicable checks. Their role is to test the collector, not to represent a vendor.

Commands emit JSON. Exit code 0 means success, 1 means an input, runtime, or storage error, and 2 means failed or incomplete measurement, verification, or comparison. Output files are created exclusively. Choose a new path for each run.

## PostgreSQL

The local service binds only to localhost. It uses port 54329 by default, so it does not replace another PostgreSQL server.

```sh
docker compose up -d --wait
cp .env.example .env
node --env-file=.env packages/cli/src/index.ts db migrate
node --env-file=.env packages/cli/src/index.ts run --reference correct --iterations 2 --warmups 0 --database
```

`MIGRATION_DATABASE_URL` is required for migration access. `DATABASE_URL` is the application connection. Production workers should receive SELECT and INSERT access to the benchmark tables, with DDL reserved for migrations. The local example intentionally uses one development role for both.

Storage uses the pinned Effect v4 PostgreSQL client with a bounded pool and ordered SQL migrations. A transaction writes the full envelope, normalized samples, measurements, provenance, capability evidence, and artifact references. Run IDs and sample-attempt keys prevent duplicate ingestion. Reusing a run ID with changed content fails. Database triggers reject changes to raw records; reanalysis inserts a new analysis.

The CLI writes the validated local envelope before database ingestion. If persistence fails, retry the saved file.

```sh
node --env-file=.env packages/cli/src/index.ts db ingest --file artifacts/reference.json
node --env-file=.env packages/cli/src/index.ts report --run-id RUN_UUID
```

Large traces and screenshots belong in artifact storage, with a SHA-256, byte size, media type, and path in the envelope. PostgreSQL stores references, not trace blobs.

## Real fixture configuration

`run --config path/to/run.json` accepts a schema-validated configuration containing `fixtures`, `scenarios`, `profile`, `iterations`, and `seed`. Each fixture declares its exact product and framework version, deployment mode, revision, URL, selectors, and public consent-state bridge. New runs also require `deployment.backend` and `deployment.assets`; no-CMP baselines declare backend `none`. Historical results may omit these fields. Local fixtures also declare build, production start, readiness URL, and cleanup scope. See [the result and fixture schemas](packages/schema/src/index.ts) and [runner configuration](packages/runner/src/index.ts).

[CPU calibration](docs/cpu-calibration.md) records Chrome DevTools' low-tier and mid-tier slowdown rates for the current host and browser. Save one calibration with `cpu calibrate`, then reuse it with `--cpu-calibration` across every compared fixture. Calibration runs separately from fixture visits; the presets do not represent an actual phone, and network settings remain unchanged.

Use the same content, framework version, browser revision, profile, policy, script workload, cache state, and scenario for a CMP and its baseline. The SDK deployment mode does not establish where its backend runs. Keep controlled local backends and remote services in separate comparison groups, using the explicit deployment metadata. Fresh visitors use isolated browser contexts. Returning visitors obtain consent by performing the actual action before the measured visit.

The checked-in c15t consumers pin `3.0.0-alpha.9` from npm. The [source-build workflow](docs/source-build.md) creates separate consumers from an exact c15t commit and verifies their dependency graph before publishing configuration paths. Published artifacts and source builds retain separate provenance. These are local fixture checks, not a public performance ranking.

| Configuration | Integration and baseline |
| --- | --- |
| `benchmarks/with-c15t-script/run.json` | Self-hosted `@c15t/browser/c15t.js` with browser `/init`, plain HTML baseline |
| `benchmarks/with-c15t-react/run.json` | Standalone React 19.2.1 with Vite 8.3.1 and browser `/init`, separate React baseline entry |
| `benchmarks/with-c15t-nextjs/run.json` | Next 16.0.7 App Router, `ConsentRoot` with consent awaited on the server from a build-time manifest so the banner is in the HTML, separate prerendered baseline route |
| `benchmarks/with-c15t-script/run-headless.json` | Public `@c15t/browser/headless` API and a complete custom banner/preferences form |
| `benchmarks/with-c15t-nuxt/run.json` | Nuxt 4.5.2 native module with a server manifest cached at runtime, separate baseline build |
| `benchmarks/with-c15t-astro/run.json` | Astro 5.18.2 server output, native middleware/banner with a build-time manifest and deferred Svelte dialog, separate baseline build |
| `benchmarks/with-c15t-tanstack-start/run.json` | TanStack Start 1.168.60 native adapter with a build-time manifest, separate baseline route |

```sh
pnpm cookiebench run --config benchmarks/with-c15t-react/run.json --output artifacts/react-smoke.json
pnpm cookiebench run --config benchmarks/with-c15t-script/run-headless.json --output artifacts/headless-smoke.json
pnpm --filter with-c15t-react typecheck
pnpm --filter with-c15t-script typecheck
pnpm --filter with-c15t-nextjs typecheck
```

Checked-in configurations request different sample counts:

| Configurations | Samples | Warmups |
| --- | --: | --: |
| c15t script, headless, React, Next.js and TanStack Start; every competitor; the CookieYes script comparison | 1 | 0 |
| c15t Nuxt and Astro | 15 | 3 |

One sample with no warmups is a functional check. Override with `--iterations 15 --warmups 3` for the measurement protocol. Explicit command flags override configuration values; omitted flags preserve them.

The c15t fixtures use a live Inth backend, `https://benchmarks-inth.inth.app`. Next.js, TanStack Start and Astro bundle its policy manifest at build time and resolve consent on the server, and Nuxt does the same from a manifest it fetches at runtime; React and the script tag call `/init` from the browser. [c15t backend and policy fetching](docs/c15t-backend.md) lists each fixture's path, the location caveat and the request costs. Revisions before `3.3.0` used a controlled local test double instead; see the [deployment and compression audit](docs/audit-deployment-compression.md). Native script loaders release two controlled scripts by default, in measurement and marketing categories, and the server records actual requests. The headless implementation uses the same public API and backend with its own UI. It has a distinct presentation identity and cannot be mixed with default UI results.

The default script-tag configuration copies the pinned npm bundle unchanged to `/vendor/c15t.js` and loads it through a classic script tag. Revisions `3.2.2` and `3.2.3` added 150 ms to each response from the local test backend to stand in for a remote one; the remote backend replaces that delay.

Consumer typechecks exercise valid SDK calls and require invalid category names or payloads to fail compilation. Stylesheet declarations cover CSS only. No ambient declarations replace the vendor's API types.

Normal action scenarios probe the shared page control at a declared 500 ms after input. A separate `save-page-probe-100ms` scenario retains the early probe. The default script-tag dialog blocked that 100 ms probe in two local checks, including a rerun with rendered-visibility and overlay checks. The failure remains visible rather than subtracting its animation duration. Dismissal timing includes the configured animation and dialog/overlay disappearance. `banner.visible` and `action.dismissed` share one predicate: the banner is visible while any part has non-zero opacity inside the viewport. A fade-in therefore adds about one frame to appearance, while a fade-out adds its full duration to dismissal. `action.dismissal-started` records the first post-input inspection where the banner, or the open preferences panel for save and withdraw, loses more than 1% of its rendered footprint (effective opacity times viewport area), stops accepting pointer events, or is no longer visible. It separates response latency from the exit animation.

A scenario ID means the same conditions in every checked-in configuration, and every desktop configuration uses `benchmarks/profiles/desktop.json`, except Usercentrics. Its ruleset enables bot detection, which matches the `HeadlessChrome` token in Chromium's default headless user agent and then grants implicit consent without a banner. From revision `3.2.4-article-v1-next-client-effect-browser-ua-ab-variant`, its desktop profile `desktop-article-v1-browser-ua` sends the same Chrome version without that token. The emulated mobile profile already sets its own user agent. Nuxt and Astro also declare `accept-early` (input before readiness) and `accept-large` (20 controlled scripts). Earlier revisions differed. Vue, Nuxt and Astro before `3.2.1-article-v1` probed at 100 ms, ran returning-visitor and withdrawal scenarios with a cold cache, and declared a `save-post-dismissal` scenario instead of `save-page-probe-100ms`. CookieYes and Usercentrics before `3.2.1-article-v1-next-client-effect` used a `desktop-local` profile and a 1,500 ms load window. Read results from those revisions against the scenario definitions recorded in their envelopes.

Current baselines isolate initial page load. They do not yet provide an ungated action-script workload for attributing post-accept script cost. Action timings remain reported for the CMP itself; unavailable baseline action values are not manufactured.

Historical competitor `config.json` files do not provide v3 action adapters or consent evidence. The new competitor `run.json` files declare those integrations explicitly; see the [adapter inventory](docs/competitor-adapters.md) for native UI support, public SDK integration, and configuration limits. A selector or adapter fix creates a new revision and requires a complete rerun. CookieYes site `830009093fab466a1ff5d9a1` renders only on its registered domain, `benchmarks-with-cookie-yes.vercel.app`, so its Next.js fixture and the script-tag comparison serve every arm under that hostname with `resolveHost`. Its readiness waits for `cookieyes_banner_load`, because the consent API exists before the banner's buttons respond. The site's preference center shows a toggle only for its Uncategorised category, so a measurement-only save cannot be expressed; the adapter declares no `save`, and save scenarios record `unsupported-action`, a fixture configuration gap rather than a missing product feature. The separate c15t and CookieYes script-tag comparisons use asymmetric hosting; see [Reports and comparisons](#reports-and-comparisons).

Adapters can set `readinessSource: "public-state"` to require `ready === true` on their configured `stateGlobal` bridge. This gates ready-mode input and returning-visitor preparation, supplies the observer's readiness timestamp, and checks restoration without a DOM marker. Restoration still requires the exact expected consent and effective categories. Omitting `readinessSource` preserves the existing `ready` selector behavior. Readiness diagnostics identify the selected source; public-state evidence does not claim a selector check.

Some vendors only render for their registered domain. A fixture can set `resolveHost: "127.0.0.1"` and use that domain in its `url`. The benchmark browser then resolves the hostname to the local fixture server with `--host-resolver-rules`; Node-side readiness and log requests keep using `127.0.0.1`. For HTTPS URLs, the runner creates a one-day self-signed certificate, passes it to fixture servers through `COOKIEBENCH_TLS_CERT` and `COOKIEBENCH_TLS_KEY`, and pins its public key with `--ignore-certificate-errors-spki-list`, so no other certificate error is ignored. `serve.ts --tls-port` opens the HTTPS listener alongside the plain one, and needs `openssl` on the host. Serve every arm of a comparison the same way, so TLS and hostname conditions match.

## Reports and comparisons

Published cross-CMP results are not like-for-like and are not a ranking:

- c15t fixtures from revision `3.3.0` call the remote Inth backend, as competitor fixtures call their vendors' remote services. Earlier c15t revisions called a controlled local test backend on the same machine, which returned almost at once on the desktop profile.
- c15t Next.js uses its native `ConsentRoot` with server-resolved consent. Ketch and Osano, like the CookieYes and Usercentrics fixtures, load from a client effect after hydration. The fixture proxy injects Didomi, Enzuzo and OneTrust at the start of `<head>`, iubenda at the end of `<head>`, and Cookie Control before `</body>`. Each competitor fixture's `revision` in `benchmarks/with-*/run.json` names its placement.

Baseline deltas describe each fixture's own setup. A difference between two CMPs mixes product cost with backend location and script placement. The [September 30 report](docs/cmp-comparison-2026-09-30-details.md) labels each row with both.

```sh
pnpm cookiebench compare --baseline artifacts/paired-run.json --candidate artifacts/paired-run.json --metric page.lcp
```

For a page-impact comparison, select only the load scenario and collect the paired baseline/CMP samples in one run:

```sh
pnpm cookiebench run --config benchmarks/with-c15t-react/run.json --scenario load --iterations 15 --warmups 3 --output artifacts/paired-run.json
pnpm cookiebench compare --baseline artifacts/paired-run.json --candidate artifacts/paired-run.json --metric page.lcp
```

The full flow configuration provides absolute action timings. Its action scenarios cannot supply matched baseline page-impact comparisons while the baseline remains load-only.

Use one configuration containing the baseline and CMP fixtures so the runner interleaves their paired samples. Pass that resulting envelope as both inputs. Independently collected runs do not establish paired observations.

The [serial batch helper](docs/measurement-batches.md) records full-flow checks, 15-pair load comparisons, and [instrumentation overhead](docs/instrumentation-overhead.md) with immutable checkpoints and resumable execution. It reports the normal 500 ms flow checks separately from the 100 ms diagnostic. The [September 2026 source and competitor record](docs/v3-measurements.md) reports the measured fixtures, failed attempts, and validity limits.

Two c15t and CookieYes script-tag comparisons sit outside the main batches: [October 1](docs/cookieyes-c15t-script-comparison-2026-10-01.md) (desktop and emulated mobile) and [October 2](docs/calibrated-cookieyes-c15t-comparison-2026-10-02.md) (emulated mobile with calibrated CPU). Their arms differ in script hosting, script placement and backend, and used an earlier CookieYes site, `f66d6dff…`. Each doc lists those conditions and the reconstructed run configurations, `benchmarks/cookieyes-script-comparison/run.json` and `run-mobile.json`, which now use site `830009093fab466a1ff5d9a1`.

Reports retain measured zeroes and explicit `unavailable`, `unsupported`, and `failed` states. Each metric records attempted, available, included, excluded and missing counts, alongside median, p75 and spread. A raw incomplete attempt may contribute a valid observation when only an unrelated required metric is unavailable. Behavioral failures and invalid collector methods still exclude values. Correctness is reported independently as verified, failed or unknown and requires explicit completion evidence. An unsupported adapter action remains a fixture capability gap, not proof that the product lacks the feature. Stored primary outcomes and nested followup outcomes remain separate from their combined attempt status. Comparisons use paired baseline differences. Only an eligible comparison reports an uncertainty interval and a directional conclusion; an ineligible comparison keeps its signed differences and stays inconclusive. Each comparison reports the median of within-pair differences, which carries the conclusion, and the change in p75: p75(candidate) minus p75(baseline) over the same pairs. `pairDifferenceP75` is the 75th percentile of within-pair differences, not a change in p75. Both estimates get paired percentile-bootstrap intervals with a Bonferroni-adjusted level over a declared comparison family, two intervals per comparison, so all intervals in the family hold jointly at 95%. By default the family is every fresh-load comparison in one `compare` invocation. `--family <id> --family-size <count>` declares a larger family shared by several invocations; the batch helper declares every load and audit comparison in its plan. Each analysis records the family, its size and the per-interval level. Each comparison draws its own bootstrap stream, derived from the run seed and the comparison's metric, scenario and fixtures. Analyses recorded before `cookiebench-analysis-v3.3.0` still decode as written, including `p75Difference`, unadjusted 95% intervals and verdicts on ineligible comparisons; those verdicts are not evidence. An ineligible or incomplete comparison exits nonzero; a smaller value alone does not establish a winner.

The measured quantities include observed DOM visibility, action-to-dismissal, public permission state, controlled script execution, bounded LCP and CLS, native interaction timing, long-task blocking, and initial/deferred network bytes. Encoded body bytes, decoded body bytes, and transferred bytes are separate quantities. Native paint and layout entries use the versioned bounded collector, with CLS session windows and recent-input exclusions. These are main-frame foreground observations through a declared cutoff, not field Core Web Vitals for a whole visit or every frame. The raw web-vitals snapshots remain unfinalized diagnostics; `page.lab-inp` is withheld. Primary and followup interaction durations use trusted related-event timestamps and native interaction IDs. Missing browser timing never becomes zero. See the [measurement audit](docs/audit-vitals-actions.md).

DOM visibility timestamps record when the observer inspected layout. They do not establish painted pixels. `page.primary-content-paint` separately uses a positive native Element Timing render timestamp for the declared primary image. LCP attribution identifies content, consent UI, other content, or unavailable element identity, alongside the native candidate size and URL. A consent banner becoming LCP does not establish an equal delay to the article. When the declared primary content is absent, its image is still loading, or its Element Timing paint has not occurred by the cutoff, `page.lcp` is unavailable as right-censored, because a later and larger candidate cannot be excluded. The raw candidate remains in diagnostics.

Load scenarios require page paint and layout observations. Action scenarios retain unavailable page vitals without failing solely for those values, because early input can stop LCP observation; their consent, dismissal, script, and page-response checks still apply. Every scenario requires the initial byte total, with one exception for actions: initial requests start before the input, so a response still arriving at an action's cutoff was arriving when the input landed. A banner that is ready early can take the click while the hero image downloads. That total stays unavailable with its reason, and the sample does not fail for it. A failed, unmeasured or inconsistent response still fails the sample. From methodology 3.2.4, a request the page cancels after its response began, such as the Usercentrics consent POST abandoned once its 201 arrives, counts the response header and body bytes received before the cancel. Chromium reports no final total for it, so that row is a lower bound and carries `cancelledAfterResponse` in the raw requests.

Load observation runs from navigation through the configured `observationMs`, even if readiness takes longer. Action observation ends at captured input plus `observationMs`. DOM state freezes at that cutoff; consent applied later cannot establish timed success. If the timed check cannot verify completion, a separate correctness snapshot records public state and visibility with its own observation time. Completion verified only after cutoff makes the sample incomplete, without inventing a late duration. Reports treat that dismissal, consent-effective or preferences-visible endpoint as right-censored: it counts toward percentiles as a value beyond `observationMs`, and `censoring` records the censored count and window. A median or p75 that falls among censored visits is null and listed in `censoring.exceedsWindow` rather than computed from the visits that finished in time; mean and max are withheld whenever any visit is censored. Visits with other failures, including no verified completion, stay excluded. Chrome queues paint entries only after frame presentation, so native observers stay connected for a 250 ms grace after the cutoff before their queues drain. Entries are still admitted by occurrence time: late delivery does not discard an in-window observation, and a paint after the cutoff cannot enter. DOM milestones, state and input admission still freeze at the cutoff. A paint entry the browser has not queued within the grace is lost. Interaction durations crossing the cutoff remain unavailable. Long-task blocking clips each observed task tail to the declared interval; an unfinished task not yet exposed by the browser cannot be reconstructed. Network snapshots use browser event timestamps and withhold totals if target coverage is incomplete. Returning preparation and reload-persistence checks run outside the timed window. Followup diagnostics retain planned input time, actual trusted input time, and dispatch lateness.

Local repeats do not establish field Core Web Vitals. Capability verification covers the executed fixture, mode, policy, and flows only; it is not legal certification. Default presentation and custom presentation are separate configurations. Banner coverage is descriptive and does not reduce a score.

## Historical import

Preview an import before writing it, or add `--database` to persist it.

```sh
pnpm cookiebench import legacy --file benchmarks/old/results.json
node --env-file=.env packages/cli/src/index.ts import legacy --file benchmarks/old/results.json --database
```

Imports preserve the exact UTF-8 source text, JSON, source path, SHA-256, record identities, and observed sample counts. The methodology is `legacy`, the collector is `legacy-unknown`, units remain `unknown-ambiguous`, and comparison eligibility is false. Reruns deduplicate by source hash. Counts come from stored detail arrays, not claimed iteration totals.

The prior physical database and writer are absent from this checkout. This implementation does not claim a production database cutover or a lossless export of that missing store. Obtain its schema, writer, export, and backup before planning one.

## Validation

```sh
pnpm check
pnpm test:unit
```

Repository tests use a real, disposable PostgreSQL database when `TEST_DATABASE_URL` is set. They apply migrations, exercise concurrent retries, verify immutable records, test transaction rollback after a partial insert, and check legacy reconciliation.

```sh
docker compose exec postgres createdb -U cookiebench cookiebench_test
TEST_DATABASE_URL=postgres://cookiebench:cookiebench@127.0.0.1:54329/cookiebench_test pnpm exec vitest run packages/db/test/repository.test.ts
```

Create that disposable database first. Tests insert records and never erase existing tables. Without the variable, database integration tests are explicitly skipped. The process-level CLI cancellation regression is opt-in because it launches Chromium and a production fixture.

```sh
COOKIEBENCH_CLI_BROWSER_TESTS=1 pnpm exec vitest run packages/cli/test/interrupt.test.ts
```

It sends SIGINT to a spawned CLI, requires exit code 130, and confirms that the detached server has closed. The CLI also handles SIGTERM with exit code 143 after cleanup. Browser checks need the installed Chromium revision. Keep measurement workloads serial on each machine.

The [v3 proposal](docs/cookiebench-v3-proposal.md) records the original audit and intended methodology. Runtime schemas and executable checks determine what this implementation currently accepts.

See the [alpha.4 upgrade record](docs/alpha4-upgrade.md) for the current fixture versions and validation, including the alpha.5 update, and the [alpha.3 upgrade record](docs/alpha3-upgrade.md) for the previous release. The [earlier framework validation record](docs/v3-validation.md) preserves the published Astro alpha.2 failure.

The [integration-maintenance task template](docs/integration-maintenance.md) defines the evidence and rerun gates for agent-proposed fixture updates.
