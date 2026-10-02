# Measurement audit validation plan

This plan was set before collecting the replacement article-workload results. Its purpose is to check the corrected measurement contracts, fixture integrations, and reporting. It does not attempt a new product ranking.

## Order and controls

1. Reproduce each confirmed collection defect with a focused regression. Exercise trusted input, native entry delivery around the deadline, CLS session boundaries, and requests from workers and frames.
2. Finish fixture, collector, schema, and analysis changes. Run lint, all workspace typechecks, unit tests, serial browser tests, production builds, and source-consumer verification. Use the local PostgreSQL integration tests.
3. Freeze a new consumer of c15t source commit `9993ae57867e33e96783640413a2429b649104c7`. Reuse its verified upstream archives. Record the new consumer and collector hashes before measurement.
4. Run the integration checks below serially. No builds or other browser checks may overlap a timed visit. Preserve failed attempts and logs in a new artifact directory. Corrections require a new run directory and an explanation, never replacement of failed evidence.
5. Inspect the retained native entries, input events, request coverage, image paint, attribution, and eligibility output. Ingest the new immutable envelopes only after the timed work finishes.

The new article's load window is 5,000 ms for both desktop and mobile. This allows the fixed 493,556-byte image to load under the declared mobile bandwidth. This is a bounded observation period, not a claim that all CMP work has finished. Action windows retain the configured 1,500 ms after trusted input. Preparation and persistence reloads are separate correctness work.

## Measurement matrix

| Check | Fixtures | Repetitions | Interpretation |
| --- | --- | --- | --- |
| Source integration smoke | Script tag, headless, React, Next.js, Vue, Nuxt, Astro, TanStack Start | One attempt per declared scenario, no warmups, desktop | Checks production integration and observations; no confidence interval or speed ranking |
| Competitor smoke | Cookie Control, Didomi, Enzuzo, iubenda, Ketch, OneTrust, Osano | One fresh load, accept, and reject attempt where the declared adapter supports them, no warmups, desktop | Checks loading changes and retained limitations; an adapter gap is not a missing product capability |
| Paired article load | Source Next.js and its matching baseline | 30 pairs plus three excluded warmup pairs for each of desktop and mobile | Exercises the corrected absolute metrics, paired analysis, image paint, and LCP attribution across profiles |
| Additional mobile smoke | Source script tag, React, Didomi, OneTrust and matching baselines | Three load pairs, no warmups | Checks that the new profile and article work across different loading paths; descriptive only |
| Instrumentation audit | Source Next.js baseline, minimal and full collectors | Ten pairs plus one warmup pair for each of desktop and mobile | Checks observer cost on the new workload; fewer than 30 pairs, so comparison remains ineligible and no confidence interval is reported |

CookieYes remains skipped at the user's request. Usercentrics remains configuration-blocked because the recovered v1 ruleset does not require this visitor to consent. Neither is silently counted as a failed product.

Use seed `20260927`. Profile definitions are `benchmarks/profiles/desktop.json` and `benchmarks/profiles/mobile.json`. The mobile profile is laboratory emulation, with recorded user agent and touch behavior, not a physical phone. c15t still uses the controlled local hosted backend; competitors still use their remote services. These topology differences remain explicit.

## Required evidence

Load reports must show absolute baseline and CMP LCP, the median of within-pair differences, and selected element identity. Primary image Element Timing is separate from page LCP. A consent banner becoming LCP does not by itself establish an equal delay to article content.

For actions, inspect trusted input and observation timestamps together. Record actual followup dispatch time as well as the requested offset. Missing reportable Event Timing remains unavailable. Do not convert it to zero or call one synthetic action field INP.

For network totals, require complete observations under the stated target scope. Retain raw requests and reasons for missing coverage. Initial and deferred totals group requests by start time; they do not split transferred bytes at consent time.

Historical envelopes remain unchanged. Current analysis must reject metrics affected by known collector defects even when an old envelope is compared with itself. A passing statistical recomputation establishes arithmetic, not collector validity.

## Launch correction after the frozen matrix

The completed matrix exposed duplicate `--competitor` options in five package start scripts. The proxy accepts that option; its child `next start` rejects it. This prevented five desktop entries and the Didomi/OneTrust mobile entries from reaching measurement. Their original command logs remain in the first matrix, with no invented sample envelopes.

Correct only the child-command arguments, update those five fixture revisions and provenance, and verify each configuration's actual start command. Then run the seven affected entries in a separate correction directory using the same scenarios, profiles, observation windows, seed, and repetitions. Freeze the correction inputs before collection and link each entry to its original execution error. Collector and c15t consumer identities must remain unchanged. Existing failed consent checks and incomplete observations are retained without retries.
