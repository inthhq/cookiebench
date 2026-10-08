# Framework matrix

The matrix answers "which CMP should I use on my framework?" It runs every CMP on each of six frameworks: the script tag, React (Vite), Next.js, Nuxt, Astro and TanStack Start.

## Layout

Each framework runs eleven CMP and baseline arms from one build:

| Arm | URL | Page |
| --- | --- | --- |
| Baseline | `/baseline` | The article with no CMP |
| c15t | `/` | The framework's c15t fixture, set up as the c15t docs recommend |
| Each competitor | `/baseline?cmp=<vendor>` | The baseline page with that vendor's snippet |

The fixture server (`packages/fixture-support/src/serve.ts`) answers `?cmp=<vendor>` on the baseline document by inserting the vendor's bootstrap. It refuses an unknown vendor, or `?cmp` on any other page, so a typo can't measure the baseline as a CMP. Static frameworks get every vendor's document encoded before the server listens, so no visit pays for compression.

Every arm on a framework is measured against that framework's baseline page, from the same build and server code. CookieYes uses a second copy of the baseline; see [Host and profile](#host-and-profile).

## Vendor placement

Competitors load from their generic snippet, the one each vendor tells you to paste into your page:

| Vendor | Placement |
| --- | --- |
| Cookie Control | End of `<body>` |
| iubenda | End of `<head>` |
| CookieYes, Didomi, Enzuzo, Ketch, OneTrust, Osano, Usercentrics | Start of `<head>` |

The standalone Next.js competitor fixtures load CookieYes, Ketch, Osano and Usercentrics from a client effect. The matrix uses the head snippet on every framework, Next.js included, so each vendor loads the same way everywhere. Some vendors also ship framework packages, such as Didomi's React and Vue SDKs. The matrix doesn't use them.

## Host and profile

CookieYes renders only on its registered host, `benchmarks-with-cookie-yes.vercel.app`. That host breaks two other vendors. `vercel.app` is on the Public Suffix List, so the browser rejects iubenda's consent cookie and the choice is lost on reload. Cookie Control shows no banner there, which looks like its API key is locked to other domains.

So each framework runs two configs:

- **Main:** the baseline, c15t and eight competitors on the plain local origin (`http://127.0.0.1:<port>`), as the standalone fixtures use.
- **CookieYes:** CookieYes and a second baseline over HTTPS on the registered host, which the runner resolves to the same local server with a run-scoped certificate.

CookieYes is measured against its own baseline under the same hostname and TLS. Its cost is a paired difference like every other arm's, but compare its absolute timings with the others knowing it pays for TLS that they don't.

The desktop profile uses a browser user agent instead of HeadlessChrome, because Usercentrics treats HeadlessChrome as a bot and shows no banner. The mobile profile already sends a mobile browser user agent.

## Cohorts

`node benchmarks/plans/matrix.ts <output>` writes one plan per profile. Each framework gets:

- a load cohort: 15 measured visits per arm, paired with the baseline, after 3 warmups;
- a correctness pass: one attempt each at load, accept, reject and save for every arm.

The plan also runs the reference instrumentation audit. Action timings aren't repeated, so the matrix publishes no action-duration comparison.

## Known gaps

- **Osano byte totals.** Osano starts a Web Worker. The collector can't prove it saw every worker request, so it withholds request and byte totals for Osano visits. Earlier Osano runs show the same gap. Osano's paint and banner timings are still measured.
- **CookieYes save.** The CookieYes adapter has no granular save flow, so its save scenario reports `unsupported-action`, as in its standalone fixture.

## What the matrix doesn't say

The fixtures are local. Competitor scripts and backends are remote, while each c15t fixture talks to the live Inth backend. Results compare products as deployed from this machine and network, under emulated profiles. They're not production field data.
