# SvelteKit fixture

This production fixture pins SvelteKit 3.1.1, Svelte 5.57.1, Vite 8.3.1, `@sveltejs/adapter-node` 6.0.1 and the published `@c15t/svelte@3.2.2`.

`vite build` runs twice, as the Astro fixture's build does. The first build (`COOKIEBENCH_BASELINE=1`) takes its routes from `baseline/`, has no server hooks and no c15t Vite plugin, and serves under `/baseline`. No c15t module reaches its server or client graph. The second build is the c15t app.

The c15t app follows the SvelteKit quickstart. `consentManifest()` downloads the Inth backend's policy manifest during `vite build`. `c15tHandle()` in `src/hooks.server.ts` reads each request's consent cookie and headers, and `loadConsent` in the root `+layout.server.ts` resolves the visitor from the bundled policy, so the banner is in the server HTML. The root layout renders `ConsentRoot` with that state, the `measurement` and `marketing` categories and the controlled script workload, then `ConsentBanner` and `ConsentDialog`. Saves go to `https://benchmarks-inth.inth.app`. Default banner and dialog animations stay enabled.

The controlled workload is built from the request URL (`src/lib/workload.ts`), because SvelteKit renders the provider on the server as well as in the browser. It matches `controlledWorkload()` from `@cookiebench/fixture-support`. `src/lib/bridge.svelte` subscribes to the consent kernel and calls `updateBridge`, which sets `html[data-consent-ready]`, and wires `#reopen-preferences` and `#withdraw-consent`.

Both builds render `pageHTML` and `pageCSS` from `@cookiebench/fixture-support/page` and call `installPageInteraction()` after hydration.

Run `pnpm build` and `pnpm start` in this directory. The fixture server listens on port 4317 and proxies the c15t app on 4417 and the baseline app on 4517. Configurations that load a vendor on the registered host add `--tls-port 4617`. `run.json` declares the fixture pair and the same scenarios as the Astro fixture.
