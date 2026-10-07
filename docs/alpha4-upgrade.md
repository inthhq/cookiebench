# c15t alpha.4 upgrade

The checked-in published-package fixtures now pin `3.0.0-alpha.4`, published to npm on October 2, 2026. This covers the script tag, headless script tag, React, Next.js, Vue, Nuxt, Astro, TanStack Start and the CookieYes script-tag comparison, which serves the script-tag fixture's bundle.

alpha.4 depends on `@c15t/schema@3.0.0-alpha.3` and `@c15t/translations@3.0.0-alpha.4`. The controlled local backend in `packages/fixture-support` now uses the same schema release. `@c15t/tanstack-start@3.0.0-alpha.4` requires `@tanstack/react-start` 1.168.60 or later and `@tanstack/react-router` 1.170.41 or later, so the TanStack fixture moves to those releases. Its baseline route moves with it, so both arms still share one framework version. Other framework versions are unchanged.

Every alpha.4 package was older than pnpm's minimum release age at install time, so the workspace no longer lists release-age exceptions for c15t.

Each run configuration names the alpha.4 tarball and its npm integrity value. `pnpm fixtures:provenance` recomputed every configuration hash. The lockfile changed, so competitor configuration hashes changed as well; their releases, adapters and scenarios did not.

## Astro returning visitors

alpha.3 rendered the banner for an accepted returning Astro visitor because the server built its consent snapshot without the configured `consentCategories` (see the [alpha.3 record](alpha3-upgrade.md)). alpha.4 passes them through (`@c15t/astro` `dist/server.js`, `server_snapshotFromConfig`). The fixture browser test no longer expects the `unexpected-banner` failure: the Astro returning-accepted sample must pass like every other sample.

## Validation

- All framework typechecks and production builds passed.
- Unit tests: 273 passed, 7 skipped.
- The c15t browser tests passed: all 8 production fixture tests, the script-tag and React withdrawal navigation tests and the priming tests, 14 in total.

## Comparability

alpha.4 also changes banner, dialog and stylesheet code. Measurements on alpha.4 are a new cohort. Don't pool them with alpha.3 results, including the October 2 rerun, or read the difference between the two as a release speedup without a matched comparison.

## alpha.5

On October 6, 2026 the fixtures moved to `3.0.0-alpha.5`, published that day. It depends on `@c15t/schema@3.0.0-alpha.4`, so the controlled backend moves to that schema release too. The TanStack peer ranges are unchanged.

alpha.5 was less than a day old at install, so `pnpm-workspace.yaml` lists release-age exceptions for its packages again. Remove them once the release is a day old.

All framework typechecks and production builds passed. Unit tests passed. In the c15t browser tests, the script tag, headless, React, Next.js, Vue, Astro and TanStack Start fixture tests passed, as did the withdrawal navigation and priming tests. The Nuxt fixture test did not run to completion: a heavily loaded host first timed it out, which left its server holding the port, and a retry then exceeded the 120-second build limit. alpha.5 measurements are a new cohort, like alpha.4's: don't pool them with earlier releases.

## alpha.6

On October 7, 2026 the fixtures moved to `3.0.0-alpha.6`, published that day. It depends on `@c15t/schema@3.0.0-alpha.5` and `@c15t/translations@3.0.0-alpha.6`, so the controlled backend moves to that schema release. `pnpm-workspace.yaml` lists release-age exceptions for the alpha.6 packages and replaces the alpha.5 ones, which are now more than a day old. Remove them once alpha.6 is a day old.

alpha.6 puts the preference dialog rules back into `styles.css`, which grows the render-blocking stylesheet by about 4.5 kB gzip. It also adds build-time manifest snapshots for Next.js, TanStack Start, Nuxt, Astro and Vite.

All framework typechecks and production builds passed, and unit tests passed. alpha.6 measurements are a new cohort: don't pool them with earlier releases.
