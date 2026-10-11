# c15t backend and policy fetching

From revision `3.3.0` on October 7, 2026, every c15t fixture talks to a live Inth backend at `https://benchmarks-inth.inth.app` instead of the controlled local test double. Each fixture follows the setup the c15t documentation recommends for its framework.

| Fixture | Policy path | Browser consent requests |
| --- | --- | --- |
| Next.js | Build-time manifest. The consent route's layout awaits `resolveConsent` inside `Suspense`, so the banner arrives in the server HTML. | `POST /subjects` on a save |
| TanStack Start | Build-time manifest, resolved on the server | `POST /subjects` on a save |
| Nuxt | Build-time manifest, resolved on the Nuxt server. alpha.7 to alpha.9 needed `buildManifest: true`; from alpha.10 it's the default. See [Nuxt](#nuxt). | `POST /subjects` on a save |
| Astro | Server output with the default `manifest()` mode and a build-time manifest; middleware resolves each request | `POST /subjects` on a save |
| React (Vite) | Browser `/init` (`hosted()` mode), prefetched by an inline `<head>` script. See [React](#react). | `GET /init`, then `POST /subjects` on a save |
| Script tag and headless | Browser `/init` | `GET /init`, then `POST /subjects` on a save |

The docs recommend a build-time manifest for every framework with a build step, unless the browser resolves a policy that depends on location. The script tag has no build step, so it keeps `/init`. Manifest fixtures and their baselines declare `mode: "manifest"`; the `/init` fixtures keep `mode: "hosted"`. Every c15t candidate declares `deployment.backend: "remote-service"`, the same as the competitor fixtures.

## React

Revision `3.4.0-article-v1-inth-build-manifest` followed the React quickstart: the `consentManifest` Vite plugin bundled the policy and `manifest()` resolved it in the browser. The Inth policy matches on country, which a browser-only app doesn't know, so every first visit still called `/init`. The bundled policy added about 3 KB of initial JS (Brotli) and saved no request. The build warns about this and suggests `hosted()`, and from revision `3.4.0-article-v1-inth-hosted` the fixture uses it.

From revision `3.4.0-article-v1-inth-hosted-prefetch` (alpha.11), the fixture follows the new React quickstart. The `consentManifest` Vite plugin is back, but only to pass the backend URL to `hosted()` and to add an inline script to the `<head>` of `index.html`. That script sends `/init` while the JavaScript downloads, and `hosted()` uses its response. A `hosted()` build doesn't download the policy. The plugin adds the script to every HTML entry, so the Vite config strips it from `baseline.html`, which must not send `/init`.

## Nuxt

alpha.6 and Nitro 2.13.4 broke `buildManifest: true`. The c15t module stored the snapshot in private runtime config. Nitro's `provideFallbackValues` replaces every `null` in runtime config with `""` during the build, so each policy pack's `copyRevision: null` became `""`. `@c15t/schema` then rejected every pack, and every visitor got `invalid-configuration` with no banner. Revision `3.3.0-article-v1-inth-runtime-manifest` used the documented runtime alternative instead: the Nuxt server fetched `/manifest` on its first request, cached it, and the cache could expire during a long run.

From alpha.7, c15t bundles the snapshot in the server instead of runtime config. From revision `3.3.1-article-v1-inth-build-manifest`, the Nuxt fixture uses `buildManifest: true` like the other server frameworks. alpha.10 removed the option and bundles the manifest by default.

## What the build fetches

A manifest build fetches `GET /manifest` from the backend once and bundles it. The build fails if the fetch fails. The snapshot stays fixed until the next build, so rebuild a fixture after the Inth project's policy, translations or vendors change. A fixture build is part of every run, so each run measures the policy current at its build.

The October 7 manifest is about 3.5 kB. Its `europe_opt_in` pack covers the EEA and GB and is also the fallback for an unknown location. Its copy is c15t's default English text, with Inth branding.

## Location

The fixture servers receive no CDN location headers, so server-side resolution sees an unknown location and applies the fallback opt-in pack. Browser `/init` instead resolves the benchmark host's public IP address at Vercel's edge. In GB or the EEA both paths show the opt-in banner. On a host elsewhere, the `/init` fixtures may resolve a different policy and fail with `banner-missing`, while the manifest fixtures still show the banner. Record the host's location with a run.

## Request costs that remain

- `/init` and `/subjects` cross origins. Up to alpha.9 the client sent `x-c15t-version` and `x-c15t-policy-contract` on both, so the browser made a CORS preflight before each one in a fresh browser context. From alpha.10, `GET /init` moves those values to the query string and sends no credentials, so it needs no preflight. On desktop, the React and script-tag banners show about 200 ms sooner. `POST /subjects` still sends custom headers and still preflights.
- The manifest server adapters send a session report to `POST /sessions` after each resolution, from the server and after the response. The benchmark keeps this default. The report does not delay the page, but it does make the fixture server do network work during the observation window.
- Consent saves take a real round trip to Vercel. Save timings now include internet latency and are noisier than the local test double's.

## Comparability

These fixtures differ in backend, policy, copy and branding from earlier revisions. Don't pool them with results from the controlled local backend. The Next.js consent route was prerendered before; it now renders per request. Its baseline route stays prerendered, so the Next.js delta includes the cost of dynamic rendering. Revision `3.3.0` streamed the consent state and rendered the banner after hydration, as the quickstart does. From `3.3.1` the layout awaits consent, following the docs' "render the banner in the server HTML" option: the page content waits for the resolution, which the bundled manifest makes a local computation.
