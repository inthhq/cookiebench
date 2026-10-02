# Build and measure c15t source

The source workflow pins `https://github.com/c15t/c15t.git` at `9993ae57867e33e96783640413a2429b649104c7`. Fetching `origin/v3` on 2026-09-27 returned that commit. It remains the pinned source experiment from that date. The current published alpha.3 fixtures and historical alpha.2 results retain separate identities.

Run from the CookieBench repository root with Node 24 and pnpm 11.25.0 installed:

```sh
pnpm source:prepare
```

The command downloads Bun 1.3.11 through npm, clones the pinned source, installs its frozen Bun lockfile, and builds the public package dependency graph used by the fixtures. It runs each upstream `prepack` hook through `bun pm pack`. Bun selects the upstream package file lists and converts workspace dependency ranges into release dependency ranges. The workflow applies no source or CSS patches.

The archives and their SHA-512 integrity values are recorded in `.source-build/9993ae57867e33e96783640413a2429b649104c7/artifacts.json`. The record also includes the source commit, source lockfile hash, build tools, and original and packed package manifest hashes. Upstream prepack hooks regenerate documentation; the manifest records those changed files and rejects changes outside package documentation. Per-step logs sit beside that file.

To use an existing clean checkout at the exact commit:

```sh
pnpm source:prepare --checkout /path/to/c15t
```

To build a different revision, supply its full 40-character commit SHA with `--commit`. Each commit gets a separate output directory. `--output /absolute/path` changes that directory without changing the declared source revision.

## Isolated consumers

After packing, the workflow copies the seven framework fixtures and their shared CookieBench dependencies into an isolated pnpm workspace. It overrides every c15t dependency with a recorded archive, installs and verifies a frozen consumer lockfile, then builds and typechecks each framework. The script-tag fixture also provides the eighth, headless configuration.

Every source configuration contains a matching no-CMP baseline. Source candidates have distinct fixture IDs and versions, the actual source commit, the relevant archive integrity, the isolated consumer lockfile hash, and a hash of the fixture source, shared support, and declared scenario protocol. The common source protocol includes load, accept, reject, granular save, preferences, withdrawal, returning accepted and rejected visitors, and keyboard rejection. Ordinary actions allow a 500 ms follow-up interval. `save-page-probe-100ms` remains a separate diagnostic.

The consumer directory is keyed by the current authored fixture, support, schema, TypeScript config, tooling, lockfile, and run-config inputs. Rebuild the consumers after those files change:

The published alpha.3 upgrade changes these inputs and intentionally leaves the historical source snapshots untouched. `source:verify` rejects an old snapshot against the changed workspace until a new consumer is built. The old snapshots remain evidence of their recorded source commit; they are not alpha.3 measurements.

```sh
pnpm source:consumer
pnpm source:verify
```

This reuses the immutable upstream archives and creates a new consumer snapshot when inputs change. Verification rejects stale snapshots, changed consumer lockfiles or fixture hashes, damaged archives, and installed c15t packages whose file lists or bytes differ from the archives. It does not rerun browser measurements.

`.source-build/<commit>/current.json` lists all eight absolute config paths and their consumer directory. Each config has an absolute server working directory and works with the current root CLI:

```sh
pnpm cookiebench run --config /absolute/path/from/current.json --iterations 1 --warmups 0 --output artifacts/source-flows.json
pnpm cookiebench run --config /absolute/path/from/current.json --scenario load --iterations 30 --warmups 3 --output artifacts/source-load.json
```

The configs default to 30 iterations and three warmups. Select the load scenario for paired load measurements, and run the full declared protocol separately for functional validation. Archive the result envelopes together with `current.json`, `artifacts.json`, and the isolated consumer lockfile. A successful build or verification is not evidence that a consent flow passed.

If an interrupted consumer build leaves an incomplete directory, the next command reports its exact path. Preserve the logs and remove only that generated consumer directory before retrying. A completed snapshot is never overwritten in place.
