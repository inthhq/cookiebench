# Lane `css-critical`: banner-only inline sheet

Branch `kaylee/split-first-paint-css` in worktree
`/home/kaylee/.t3/worktrees/c15t-private/t3-9387ee4d`. Commit `c814eec03`, one
commit on top of `c35b112b7`. Not pushed. No PR.

## Result

On a first visit, a server-rendered banner now inlines `tokens` + `button` + `banner`
(52,237 B raw / 5,472 B br) instead of `first-paint` (69,195 / 7,778). The
HTML on `/` is 2,309 B smaller after brotli-11. The hero `<img>` starts
16,939 B earlier in the document. The banner paints pixel-identically with JS
off, in light and dark. The LCP change is too small for 5 CookieBench pairs to
resolve. My own waterfall shows the hero finishing about 8–16 ms earlier. The
5 ms/KB model predicts about 12 ms.

The cut is about half the 4–5 KB brotli the brief estimated. The banner rules
themselves are the bulk: prompt is 16 KB raw, button 16 KB, branding 7 KB.
The trigger, ConsentGate and dialog-only variables together were about 2.3 KB
brotli.

## Bytes (fixture HTML, `tools/measure.mjs`)

Both builds use the same harness: pack, install into a private CookieBench
copy, `next build`, serve on 4360/4450. The HTML is fetched with identity
encoding, then compressed here.

| Page | Raw before | Raw after | br-11 before | br-11 after | Δ br | gzip-9 before | gzip-9 after | Δ gzip |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` (fresh visit) | 91,270 | 74,332 | 13,250 | 10,941 | **−2,309** | 15,502 | 12,742 | **−2,760** |
| `/baseline` | 12,355 | 12,355 | 2,918 | 2,918 | 0 | 3,616 | 3,620 | +4 |
| `/` (returning, consent cookie) | 18,434 | 18,435 | 4,393 | 4,404 | +11 | 5,455 | 5,455 | 0 |

| Offsets in `/` | Before | After |
| --- | ---: | ---: |
| `<img id="primary-content"` byte offset | 71,899 | 54,960 |
| br-11 bytes of the HTML before that `<img>` | 8,703 | 6,412 |
| first `<script src=` byte offset | 69,492 | 52,553 |

| Inline c15t `<style>` on `/` | ids | Raw | br-11 | gzip-9 |
| --- | --- | ---: | ---: | ---: |
| before | `c15t-first-paint` | 69,195 | 7,778 | 8,848 |
| after | `c15t-tokens c15t-button c15t-banner` (React merges them into one element) | 52,237 | 5,472 | 6,163 |

The returning visitor gets no c15t `<style>` before or after. This fixture
renders no `ConsentDialogTrigger`, and the trigger renders in the browser only
(`useIsHydrated`). So the brief's "returning visitors stop paying 7.7 KB" does
not apply to this fixture.

Eager JS is unchanged: 212,811 B br before, 212,738 after, across the HTML's
`<script src>` chunks. No sheet text is in an eager chunk, before or after.
The lazy dialog chunk grew from 58,432 to 61,972 B raw, because the dialog
sheet now carries its own variables.

## LCP (`harness/bench.sh`, 5 pairs, mobile-article-v1, `load`)

```
LABEL=after-c814eec03  WORK_DIR=…/css-critical/bench-after  bench.sh <worktree> 4360 5
LABEL=before-c35b112b7 WORK_DIR=…/css-critical/bench-before bench.sh <clean HEAD worktree> 4360 5
```

Outputs are in `css-critical/bench-{after,before}/out/*/summary.md`.

| Metric (CookieBench) | Before (c35b112b7) | After (c814eec03) |
| --- | ---: | ---: |
| initial.transfer, c15t arm | 717,721 | 715,764 |
| initial.transfer Δ over control | 104,682 | 102,628 |
| initial.requests Δ | 5 | 5 |
| FCP Δ (median of pairs) | 72 | 40 |
| **LCP Δ (median of pairs)** | **388** (95% bootstrap −576 to 408) | **392** (192 to 416) |
| banner.visible (median) | 306 | 272 |

| Own waterfall (3 pairs) | Before | After |
| --- | ---: | ---: |
| Document transfer (br) | 15,612 | 12,955 |
| Hero request start | 215 ms | 208 ms (control 177–178) |
| Hero end, c15t arm | 3,820–3,829 | 3,807–3,843 |
| Median LCP, c15t arm | 3,844 | 3,832 |

Five pairs cannot resolve a ~12 ms change. The before interval is wide, and
the two medians differ by 4 ms in the wrong direction. The byte numbers are
the evidence. I made no LCP claim and did not run 15 pairs. Interactivity is
unchanged: the change affects CSS delivery only. I did not measure Accept
input-to-next-paint.

## Screenshots

`css-critical/measure-before/` and `css-critical/measure-after/`, compared
pixel for pixel in Chromium (`tools/compare.mjs`):

| File | What | Differing pixels |
| --- | --- | ---: |
| `banner-nojs-light.png` | JS off, 390x844 DPR 3 | 0 |
| `banner-nojs-dark.png` | JS off, `c15t-dark` on `<html>` (c15t dark mode is class-driven, not `prefers-color-scheme`) | 0 |
| `banner-js-light.png`, `banner-js-dark.png` | JS on, after hydration | 0 |
| `dialog-js-light.png`, `dialog-js-dark.png` | Customize → dialog | 0 |
| `returning-js.png` | returning visitor | 0 |
| `returning-dialog-js.png` | returning visitor opens the dialog (banner sheets load on demand, +2 requests) | 0 |

## What changed

- `packages/ui/scripts/stylesheet-parts.ts`: `SURFACE_SHEETS` partitions the
  first-paint components: `banner` (branding, consent-actions, legal-links,
  prompt), `button`, `consent-gate`, `trigger` (panel-trigger). The build
  fails if a first-paint component is missing or listed twice.
- `generate-css-entrypoints.ts`:
  - Writes `styles/sheets/tokens.js` (default theme tokens, full set).
  - Writes one sheet per surface: its rules plus the transitive closure of the
    component variables and `@keyframes` those rules read, pruned with postcss
    from `rootCss`, with selectors and values unchanged.
  - Writes a `-deferred` twin for each, plus the existing `first-paint`.
  - The `dialog` sheet now carries the variables it reads.
  - `first-paint`, `iab-*`, `primitives` and `styles.css` are byte-identical
    to before (checked with `cmp` against the baseline tarball).
- React: `BANNER_SHEETS` = tokens, button, banner. `TRIGGER_SHEETS` = tokens,
  trigger. `CONSENT_GATE_SHEETS` = tokens, button, consent-gate.
  `DIALOG_SHEETS` = banner sheets + dialog. The IAB banner keeps the full
  `first-paint` sheet, because the IAB rules read variables the split sheets
  drop. The trigger loads its sheet only once it is visible, so a first visit
  fetches nothing for a trigger hidden behind the banner.
- `packages/nextjs/src/build.ts`: aliases each server-rendered sheet
  (`first-paint`, `tokens`, `button`, `banner`, `trigger`, `consent-gate`) to
  its `-deferred` twin in browser bundles, for Turbopack and webpack. A sheet
  the installed `@c15t/ui` lacks is skipped.
- Docs: `docs/customization/stylesheets.mdx` and
  `docs/frameworks/react/troubleshooting.mdx` (new sheet ids).
- Release note: `.tegami/2026-11-02-banner-only-inline-styles.md`
  (ui, react, nextjs patch).

Design choices:

- **Disjoint sheets, no duplicated rules.** React inserts sheets in render
  order, so a rule repeated in a later sheet would re-apply after the rules
  that override it.
- **Button has its own sheet.** The banner, the ConsentGate and the dialog all
  render it.
- **Repeated variable declarations are safe.** They sit on `:where(:root)`
  with identical values, so a later copy changes nothing and never beats a
  host override.

## Guards (`packages/ui/src/styles/__tests__/surface-sheets.test.ts`)

- Each split sheet is an exact subset of `first-paint`:
  - component rules in the same relative order
  - every variable declaration identical, with the same selector and context
  - `@keyframes` identical
- The surface sheets together hold every `first-paint` component rule exactly
  once.
- `tokens` equals `first-paint`'s theme-token declarations.
- Every variable a surface sheet or the dialog reads, and `styles.css`
  declares, is declared in that sheet or in `tokens`.
- Every `@keyframes` a sheet names ships with it.
- The banner sheets hold no ConsentGate, switch/accordion/tabs/collapsible or
  trigger variable.
- Byte ceilings: tokens + button + banner ≤ 5,700 B br-11 and ≤ 6,450 B
  gzip-9 (now 5,472 / 6,175).
- Each `-deferred` twin has the same id, empty css, and `load()` resolves to
  the sheet's text.

I checked that the guards fail. Removing one variable declaration from the
built banner sheet fails the var test. Moving one trigger rule into it fails 4
tests: subset, partition, variables and byte ceiling.

## Tests run

| Suite | Result |
| --- | --- |
| `bun run --cwd packages/ui test` | 34 files, 692 tests pass |
| `bun turbo run check-types` (ui, react, nextjs and deps) | 13/13 pass |
| `packages/nextjs test` | 240/240 tests pass. 2 files fail to import (`conformance`, `policy-driver-evidence`) on clean HEAD too |
| `packages/react test src/components` | 52 files, 379 tests pass |
| `packages/react test` (everything else, minus `conformance` and `policy-driver-*`) | 80 files, 521 tests pass |
| `CI_INTEGRATION=parity CI_TARGETS=react,svelte bun scripts/ci-browser.ts` | Framework parity passed (37 passed, 1 skipped), react and svelte interactions passed |
| oxlint, oxfmt on changed files, remark lint on the 2 doc files | clean |

The partial React runs exit 1 only on the global coverage threshold.

Pre-existing failures, reproduced on a clean `c35b112b7` worktree with the
same commands:

- `conformance.test.tsx` and `policy-driver-*` fail to resolve `#inline-start`
  from `packages/integrations/src/engine/runtime.ts`.
- In React, that import failure closes the browser connection and aborts the
  whole run.

Three nextjs browser tests failed once each in single runs, a different one
each time: `root-user-config-options`, `root-modules` and `end-to-end`
routePrefix, which is a GPC timing assertion. All four of those files passed
twice in a row on a rerun. I treat them as flaky on this shared machine.

## Trade-offs and risks

- **New sheet ids.** The React ids are now `c15t-tokens`, `c15t-button`,
  `c15t-banner`, `c15t-trigger` and `c15t-consent-gate`. Code or tests that
  look for `c15t-first-paint` in React output will miss them. CSP hashes of
  the old inline text no longer match; nonces are unaffected.
- **Trigger appears one chunk later on a first visit.** It now loads `trigger`
  (1.8 KB br) when it first shows, so after Accept it appears one chunk fetch
  later. Before, it reused the inline `first-paint`.
- **Returning visitors.** A returning visitor's trigger used to load the whole
  `first-paint` chunk (7.8 KB br) and now loads tokens + trigger
  (about 2.4 KB br).
- **Dialog for a visitor who saw no banner.** It now fetches 3 small sheet
  chunks (tokens, button, banner) next to the dialog chunk, instead of 1
  `first-paint` chunk. They load in parallel.
- **Smaller variable set.** A page with only the banner no longer declares
  ConsentGate, trigger or dialog-only component variables, such as
  `--switch-*`. Host CSS that reads one of those without a fallback, while
  only the banner is shown, gets nothing. All `--c15t-*` theme tokens are
  still declared.
- **Vite SPA without the Next alias.** It bundles the five split sheets
  eagerly (64.6 KB raw) instead of `first-paint` (69.2 KB). The dialog chunk
  carries `dialog` plus its variables.

## Not done, next candidates

- **Variant-level pruning.** Dropping `[data-variant=bar|widget|wall]`,
  dialog/manager branding contexts and `data-size=x*small` from the banner
  sheets saves another 671 B br (5,472 → 4,801). The fix would put those
  rules in sheets chosen by the banner's `variant`. It moves rules within the
  cascade, so it needs per-rule review. Not implemented.
- **Svelte and Astro** still inline the full `first-paint`. The same split
  would apply to them.

## Not verified

- No LCP claim: the bench ran 5 pairs, the medians are within noise, and the
  before interval is −576 to 408.
- Accept input-to-next-paint and gated-script start for returning visitors
  were not measured. The change touches CSS delivery only.
- The CSS compatibility browser group (`CI_INTEGRATION=styles`) and the Next
  compat group were not run.
- Trigger behaviour after Accept was covered by the unit and parity tests,
  not checked in the CookieBench fixture, which renders no trigger.

Scratch: `/home/kaylee/.t3/scratch/lcp-fleet/css-critical/` (tools, logs,
screenshots, both fixture builds).
