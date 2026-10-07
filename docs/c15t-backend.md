# c15t backend and policy fetching

From revision `3.3.0` on October 7, 2026, every c15t fixture talks to a live Inth backend at `https://benchmarks-inth.inth.app` instead of the controlled local test double. Each fixture follows the setup the alpha.6 documentation recommends for its framework.

| Fixture | Policy path | Browser consent requests |
| --- | --- | --- |
| Next.js | Build-time manifest. The root layout of the consent route resolves each request on the server and streams the result. | `POST /subjects` on a save |
| TanStack Start | Build-time manifest, resolved on the server | `POST /subjects` on a save |
| Nuxt | Server manifest (`manifest: "server"`), fetched and cached at runtime, resolved on the Nuxt server. See [Nuxt](#nuxt). | `POST /subjects` on a save |
| Astro | Server output with `manifest()` and `buildManifest: true`; middleware resolves each request | `POST /subjects` on a save |
| React (Vite) | Browser `/init` | `GET /init`, then `POST /subjects` on a save |
| Script tag and headless | Browser `/init` | `GET /init`, then `POST /subjects` on a save |

The docs recommend a build-time manifest wherever a server can resolve consent; Nuxt falls back to a runtime server manifest, as below. React with Vite and the script tag have no server, so they keep `/init`. Manifest fixtures and their baselines declare `mode: "manifest"`; the `/init` fixtures keep `mode: "hosted"`. Every c15t candidate declares `deployment.backend: "remote-service"`, the same as the competitor fixtures.

## Nuxt

The docs recommend `buildManifest: true` for Nuxt too, but it doesn't work with alpha.6 and Nitro 2.13.4. The c15t module stores the snapshot in private runtime config. Nitro's `provideFallbackValues` replaces every `null` in runtime config with `""` during the build, so each policy pack's `copyRevision: null` becomes `""`. `@c15t/schema` then rejects every pack, and every visitor gets `invalid-configuration` with no banner. The fixture uses the documented runtime alternative instead: the Nuxt server fetches `/manifest` on its first request, caches it and resolves each visitor on the server. The browser still makes no `/init` request. Its revision, `3.3.0-article-v1-inth-runtime-manifest`, keeps it apart from the build-time fixtures. The first request after the server starts includes the manifest fetch. Every run loads each fixture page once to prime it before any sample, so that fetch lands outside the measurements. The cache can expire during a long run, so a later sample can include a refresh.

## What the build fetches

A manifest build fetches `GET /manifest` from the backend once and bundles it. The build fails if the fetch fails. The snapshot stays fixed until the next build, so rebuild a fixture after the Inth project's policy, translations or vendors change. A fixture build is part of every run, so each run measures the policy current at its build.

The October 7 manifest is about 3.5 kB. Its `europe_opt_in` pack covers the EEA and GB and is also the fallback for an unknown location. Its copy is c15t's default English text, with Inth branding.

## Location

The fixture servers receive no CDN location headers, so server-side resolution sees an unknown location and applies the fallback opt-in pack. Browser `/init` instead resolves the benchmark host's public IP address at Vercel's edge. In GB or the EEA both paths show the opt-in banner. On a host elsewhere, the `/init` fixtures may resolve a different policy and fail with `banner-missing`, while the manifest fixtures still show the banner. Record the host's location with a run.

## Request costs that remain

- `/init` and `/subjects` cross origins. The client sends `x-c15t-version` and `x-c15t-policy-contract`, so the browser makes a CORS preflight before each one in a fresh browser context.
- The manifest server adapters send a session report to `POST /sessions` after each resolution, from the server and after the response. The benchmark keeps this default. The report does not delay the page, but it does make the fixture server do network work during the observation window.
- Consent saves take a real round trip to Vercel. Save timings now include internet latency and are noisier than the local test double's.

## Comparability

These fixtures differ in backend, policy, copy and branding from earlier revisions. Don't pool them with results from the controlled local backend. The Next.js consent route was prerendered before; it now renders per request. Its baseline route stays prerendered, so the Next.js delta includes the cost of dynamic rendering.
