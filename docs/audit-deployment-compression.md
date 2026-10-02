# Deployment classification and static compression

The c15t fixtures use a local mock backend. Their `hosted` SDK mode describes the HTTP transport, not production hosting. `/api/consent/init` returns a fixed strict opt-in policy and `/api/consent/subjects` acknowledges a write with a fixed subject ID. It does not store consent records in a production database. Remote persistence timings from this setup measure that acknowledgement.

The competitor fixtures load remote vendor SDKs and contact vendor services. Their network path includes costs the local c15t backend does not have. A comparison with each fixture's no-CMP baseline can describe that setup. Sorting those deltas into a c15t-versus-vendor ranking would mix deployment conditions.

## Explicit fixture metadata

New runner configurations require a `deployment` declaration. Historical result envelopes without one still decode; they must not acquire a deployment claim through inference.

| Fixture | `deployment.backend` | `deployment.assets` |
| --- | --- | --- |
| c15t consumers | `controlled-local` | `local` |
| Competitor consumers | `remote-service` | `mixed` |
| No-CMP baselines | `none` | `local` |
| Controlled collector references with a mock save endpoint | `controlled-local` | `local` |

`backend` records the consent service exercised by the fixture. `assets` records where its page and CMP assets come from. The runner rejects a no-CMP baseline with a consent backend. Metadata is a declared deployment contract, not proof of a service's ownership or availability. Comparison output carries the baseline and candidate declarations; a no-CMP baseline having `none` is expected. Keep candidate deployment classes separate in reports.

The existing `mode` field remains the integration mode. A self-hosted service can run remotely, and a hosted transport can point at a local test double. Neither field replaces the other. These labels identify conditions; they do not assign a performance penalty to any deployment option.

## c15t deployment evidence and remaining setup

The installed v3 documentation separates backend ownership from policy fetching. Managed Inth and self-hosted c15t use the same protocol. Regular `hosted({ url })` initializes through `/init` and submits choices through `/subjects`. Offline mode omits backend submissions. The package documents manifest fetching as another option, but manifest mode is excluded from this work because the backend has not been updated for it.

The relevant bundled sources are `c15t/docs/guides/deployment-modes.md` and `c15t/docs/guides/data-fetching.md`. The checked-in consumers point at `/api/consent` or `http://127.0.0.1:<fixture-port>/api/consent`. The repository's environment example contains database settings only. No configured public c15t backend or authorized benchmark hostname was found. Documentation example URLs do not establish a usable tenant.

A remote c15t run needs the intended public backend endpoint and a benchmark hostname allowed by that project's origin configuration. Its policy and language must match the benchmark workload. Verify actual initialization, consent acknowledgement, reload and withdrawal before collecting performance samples. Record the endpoint and fetching path in a separate fixture revision with `backend: remote-service`, and retain the controlled suite separately. This batch uses the controlled local backend. A future public Inth endpoint needs a separate fixture identity and measurements. No account, remote configuration or deployment was created for this audit.

## Static response correction

The fixture static server previously sent production HTML, JavaScript and CSS uncompressed even when browsers advertised Brotli or gzip. This inflated encoded transfer sizes for static consumers relative to production framework servers with compression.

The responder now caches Brotli and gzip representations for HTML, JavaScript, CSS, JSON and SVG, and selects an acceptable representation from `Accept-Encoding`. It respects quality preferences, explicit exclusions and wildcard rules. Brotli wins equal compressed preferences. Identity is the fallback unless the client explicitly prefers it; a request excluding every available representation receives HTTP 406. PNG and WOFF2 remain uncompressed.

`Content-Length` describes the selected encoded body and `Vary: Accept-Encoding` separates representations. HEAD returns the same representation headers as GET with no body. Both the CMP route and extensionless baseline use the same responder. Static cache policy requires revalidation. The shared article assets now use the same negotiation, retain their one-hour cache policy and use a weak ETag valid across equivalent encoded representations. Already-compressed production framework responses retain their upstream policy. Competitor document requests use identity upstream for bootstrap injection; the proxy now compresses both the injected candidate and its baseline afterward. Brotli and gzip flush each input chunk so HTML reaches the browser before the complete upstream document arrives. The proxy preserves existing Vary values and removes stale length and validator headers when it transforms bytes.

Regression tests exercise a real local HTTP server and compare decompressed HTML, JavaScript and CSS with source bytes. They check encoded lengths, HEAD, baseline routes, excluded encodings, unsupported methods and malformed paths. A proxy regression proves that the first decoded HTML arrives before the upstream response ends, both with and without bootstrap injection and for both encodings. It also verifies that native compressed upstream bytes pass through unchanged. Unit tests cover shared article asset negotiation. These tests establish serving behavior; they do not replace fresh browser measurements.

The serving correction and deployment declarations change fixture identity. Refresh configuration provenance and create new result artifacts before measurement. Existing measurements and their serving policy remain historical evidence.
