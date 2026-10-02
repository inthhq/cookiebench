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

A browser run does not require a database. The default protocol requests 30 measured samples per cell and three excluded warmups. A two-sample run is a smoke check, not a ranking. Ordinary load warmup observations are excluded and not retained; their counts stay in the configuration. Instrumentation audits retain their warmups separately.

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

The checked-in c15t consumers pin `3.0.0-alpha.3` from npm. The [source-build workflow](docs/source-build.md) creates separate consumers from an exact c15t commit and verifies their dependency graph before publishing configuration paths. Published artifacts and source builds retain separate provenance. These are local fixture checks, not a public performance ranking.

| Configuration | Integration and baseline |
| --- | --- |
| `benchmarks/with-c15t-script/run.json` | Self-hosted `@c15t/browser/c15t.js`, 150 ms added backend delay, plain HTML baseline |
| `benchmarks/with-c15t-react/run.json` | Standalone React 19.2.1 with Vite 8.3.1, separate React baseline entry |
| `benchmarks/with-c15t-nextjs/run.json` | Next 16.0.7, native `c15t/next` client provider over a prerendered page, separate baseline route |
| `benchmarks/with-c15t-script/run-headless.json` | Public `@c15t/browser/headless` API and a complete custom banner/preferences form |
| `benchmarks/with-c15t-vue/run.json` | Vue 3.5.43 native plugin with Vite, separate baseline entry |
| `benchmarks/with-c15t-nuxt/run.json` | Nuxt 4.5.2 native module, separate baseline build |
| `benchmarks/with-c15t-astro/run.json` | Astro 5.18.2 native middleware/banner and deferred Svelte dialog, separate baseline build |
| `benchmarks/with-c15t-tanstack-start/run.json` | TanStack Start 1.168.58 native adapter, separate baseline route |

```sh
pnpm cookiebench run --config benchmarks/with-c15t-react/run.json --output artifacts/react-smoke.json
pnpm cookiebench run --config benchmarks/with-c15t-script/run-headless.json --output artifacts/headless-smoke.json
pnpm --filter with-c15t-react typecheck
pnpm --filter with-c15t-script typecheck
pnpm --filter with-c15t-nextjs typecheck
```

The script, React, Next, and headless configurations request one sample and zero warmups for functional checks. Check each configuration before running; other framework configurations may request the full protocol. Override with `--iterations 30 --warmups 3` for the proposed measurement protocol. Explicit command flags override configuration values; omitted flags preserve them.

The c15t fixture backend is a controlled local test double with a strict opt-in policy. It returns fixed initialization data and acknowledges writes without a production consent database. A future managed Inth endpoint needs its own fixture identity and measurements. Manifest mode is excluded. See the [deployment and compression audit](docs/audit-deployment-compression.md). Native script loaders release two controlled scripts by default, in measurement and marketing categories, and the server records actual requests. The headless implementation uses the same public API and backend with its own UI. It has a distinct presentation identity and cannot be mixed with default UI results.

The default script-tag configuration copies the pinned npm bundle unchanged to `/vendor/c15t.js` and loads it through a classic script tag. Its server arguments add 150 ms before each policy or consent-save response. Static files, controlled scripts and health checks have no added server delay. This is simulated backend latency, in addition to the selected network profile. The mobile profile already adds 150 ms of network latency. The delayed fixture has separate IDs and a new revision; September 30 results and the headless configuration retain their original conditions. This delay does not reproduce a production backend's database, DNS, TLS or variable latency.

Consumer typechecks exercise valid SDK calls and require invalid category names or payloads to fail compilation. Stylesheet declarations cover CSS only. No ambient declarations replace the vendor's API types. The Next fixture does not yet establish server-resolved consent or request-isolation behavior.

Normal action scenarios probe the shared page control at a declared 500 ms after input. A separate `save-page-probe-100ms` scenario retains the early probe. The default script-tag dialog blocked that 100 ms probe in two local checks, including a rerun with rendered-visibility and overlay checks. The failure remains visible rather than subtracting its animation duration. Dismissal timing includes the configured animation and dialog/overlay disappearance.

Current baselines isolate initial page load. They do not yet provide an ungated action-script workload for attributing post-accept script cost. Action timings remain reported for the CMP itself; unavailable baseline action values are not manufactured.

Historical competitor `config.json` files do not provide v3 action adapters or consent evidence. The new competitor `run.json` files declare those integrations explicitly; see the [adapter inventory](docs/competitor-adapters.md) for native UI support, public SDK integration, and configuration limits. A selector or adapter fix creates a new revision and requires a complete rerun. CookieYes is excluded from the main measurement batches. Its Next.js fixture's site ID (`830009093fab466a1ff5d9a1`) rejects the local hostname, so that fixture shows no banner. Two separate c15t and CookieYes script-tag comparisons use a different site ID and asymmetric hosting; see [Reports and comparisons](#reports-and-comparisons).

Adapters can set `readinessSource: "public-state"` to require `ready === true` on their configured `stateGlobal` bridge. This gates ready-mode input and returning-visitor preparation, supplies the observer's readiness timestamp, and checks restoration without a DOM marker. Restoration still requires the exact expected consent and effective categories. Omitting `readinessSource` preserves the existing `ready` selector behavior. Readiness diagnostics identify the selected source; public-state evidence does not claim a selector check.

## Reports and comparisons

```sh
pnpm cookiebench compare --baseline artifacts/paired-run.json --candidate artifacts/paired-run.json --metric page.lcp
```

For a page-impact comparison, select only the load scenario and collect the paired baseline/CMP samples in one run:

```sh
pnpm cookiebench run --config benchmarks/with-c15t-react/run.json --scenario load --iterations 30 --warmups 3 --output artifacts/paired-run.json
pnpm cookiebench compare --baseline artifacts/paired-run.json --candidate artifacts/paired-run.json --metric page.lcp
```

The full flow configuration provides absolute action timings. Its action scenarios cannot supply matched baseline page-impact comparisons while the baseline remains load-only.

Use one configuration containing the baseline and CMP fixtures so the runner interleaves their paired samples. Pass that resulting envelope as both inputs. Independently collected runs do not establish paired observations.

The [serial batch helper](docs/measurement-batches.md) records full-flow checks, 30-pair load comparisons, and [instrumentation overhead](docs/instrumentation-overhead.md) with immutable checkpoints and resumable execution. It reports the normal 500 ms flow checks separately from the 100 ms diagnostic. The [September 2026 source and competitor record](docs/v3-measurements.md) reports the measured fixtures, failed attempts, and validity limits.

c15t source fixtures use a controlled local hosted backend. Competitor fixtures use remote vendor services through client-loaded SDKs and public consent callbacks. Their integration and backend conditions differ. Baseline deltas describe each fixture's setup; they do not establish a product ranking.

Two c15t and CookieYes script-tag comparisons sit outside the main batches: [October 1](docs/cookieyes-c15t-script-comparison-2026-10-01.md) (desktop and emulated mobile) and [October 2](docs/calibrated-cookieyes-c15t-comparison-2026-10-02.md) (emulated mobile with calibrated CPU). Their arms differ in script hosting, script placement and backend, and use a different CookieYes site ID from the Next.js fixture. Each doc lists those conditions and the reconstructed run configurations, `benchmarks/cookieyes-script-comparison/run.json` and `run-mobile.json`.

Reports retain measured zeroes and explicit `unavailable`, `unsupported`, and `failed` states. Each metric records attempted, available, included, excluded and missing counts, alongside median, p75 and spread. A raw incomplete attempt may contribute a valid observation when only an unrelated required metric is unavailable. Behavioral failures and invalid collector methods still exclude values. Correctness is reported independently as verified, failed or unknown and requires explicit completion evidence. An unsupported adapter action remains a fixture capability gap, not proof that the product lacks the feature. Stored primary outcomes and nested followup outcomes remain separate from their combined attempt status. Comparisons use paired baseline differences with uncertainty where enough compatible pairs exist. Signed differences remain visible. An ineligible or incomplete comparison exits nonzero; a smaller value alone does not establish a winner.

The measured quantities include observed DOM visibility, action-to-dismissal, public permission state, controlled script execution, bounded LCP and CLS, native interaction timing, long-task blocking, and initial/deferred network bytes. Encoded body bytes, decoded body bytes, and transferred bytes are separate quantities. Native paint and layout entries use the versioned bounded collector, with CLS session windows and recent-input exclusions. These are main-frame foreground observations through a declared cutoff, not field Core Web Vitals for a whole visit or every frame. The raw web-vitals snapshots remain unfinalized diagnostics; `page.lab-inp` is withheld. Primary and followup interaction durations use trusted related-event timestamps and native interaction IDs. Missing browser timing never becomes zero. See the [measurement audit](docs/audit-vitals-actions.md).

DOM visibility timestamps record when the observer inspected layout. They do not establish painted pixels. `page.primary-content-paint` separately uses a positive native Element Timing render timestamp for the declared primary image. LCP attribution identifies content, consent UI, other content, or unavailable element identity, alongside the native candidate size and URL. A consent banner becoming LCP does not establish an equal delay to the article.

Load scenarios require page paint and layout observations. Action scenarios retain unavailable page vitals without failing solely for those values, because early input can stop LCP observation; their consent, dismissal, script, and page-response checks still apply.

Load observation runs from navigation through the configured `observationMs`, even if readiness takes longer. Action observation ends at captured input plus `observationMs`. DOM state freezes at that cutoff; consent applied later cannot establish timed success. If the timed check cannot verify completion, a separate correctness snapshot records public state and visibility with its own observation time. Completion verified only after cutoff makes the sample incomplete, without inventing a late duration. Native queues drain at stop and entries are filtered by occurrence time, so late callback delivery does not itself discard an in-window observation. Interaction durations crossing the cutoff remain unavailable. Long-task blocking clips each observed task tail to the declared interval; an unfinished task not yet exposed by the browser cannot be reconstructed. Network snapshots use browser event timestamps and withhold totals if target coverage is incomplete. Returning preparation and reload-persistence checks run outside the timed window. Followup diagnostics retain planned input time, actual trusted input time, and dispatch lateness.

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

See the [alpha.3 upgrade record](docs/alpha3-upgrade.md) for the current fixture versions and validation. The [earlier framework validation record](docs/v3-validation.md) preserves the published Astro alpha.2 failure.

The [integration-maintenance task template](docs/integration-maintenance.md) defines the evidence and rerun gates for agent-proposed fixture updates.
