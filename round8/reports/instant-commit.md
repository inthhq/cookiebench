# Lane `instant-commit`: commit a banner tap in the tap's own task

## Verdict

**Not met.** The tap no longer waits for any download, and c15t is now about
10x faster than the commit-path branch. But CookieYes is still 6 ms faster on
consent-effective on Next.js and 14 ms faster on React. Scripts-complete is
4 ms behind on Next.js (a tie within run-to-run noise) and 10 ms behind on
React. LCP and banner.visible stay within the bars.

One session, mobile profile, final head `ad86f4805`. The code is the same as
the measured build `aa15552b1`; later commits are docs and test files.

- 06:17–06:31 on 2026-11-04.
- Every run passed its first attempt under the discard rules (see Discards).
- Medians, with the max in brackets.

### Next.js (Turbopack)

| Measure | CookieYes | commit path `fd020fd7c` | **this head** |
| --- | ---: | ---: | ---: |
| `load` LCP delta vs control (95% CI), 15 pairs | +180 (168–184) | +68 (56–68) | **+64 (56–64)** |
| `load` banner.visible | 2,373 | 239 | **238** |
| `load` control FCP | 248 | 248 | 248 |
| `accept` consent-effective | 19 (23) | 315 (339) | **25 (30)** |
| `accept` scripts-complete | 187 (192) | 317 (342) | **191 (198)** |
| `reject` consent-effective | 19 (22) | 305 (328) | **21 (26)** |
| `save` consent-effective / scripts-complete | not measurable¹ | 53 (61) / 214 (226) | **27 (43) / 196 (204)** |
| `preferences` preferences-visible | not in config | 613 (634) | **615 (655)** |
| `reject-keyboard` consent-effective | not in config | 310 (323) | **13 (20)** |
| `returning-accepted` first gated script from navigation | not in config | 739 | **742** |

1. The CookieYes adapter does not declare a `save` action: all 10 samples
   fail with "Adapter does not declare the save action".

An earlier valid session, 05:01–05:07, built from `56ce33dc9` (before the last
code commit), measured `accept` as follows:

| Build | consent-effective | scripts-complete |
| --- | ---: | ---: |
| this head | 25 (35) | 186 (193) |
| CookieYes | 19 (24) | 187 (193) |
| commit path | 323 (344) | 325 (346) |

### React (Vite / Rolldown)

| Measure | CookieYes | commit path `ca5fa8eeb` | **this head** |
| --- | ---: | ---: | ---: |
| `load` LCP delta vs control (95% CI), 15 pairs | +108 (104–124) | +288 (284–296) | **+300 (284–312)** |
| `load` banner.visible | 1,051 | 1,079 | **1,092** |
| `load` control FCP | 740 | 736 | 736 |
| `accept` consent-effective | 17 (27) | 265 (271) | **31 (37)** |
| `accept` scripts-complete | 185 (193) | 356 (362) | **195 (217)** |
| `returning-accepted` first gated script from navigation | not in config | 997 | **1,006** |

### Next.js probes

These are defer-fix's `probe.mjs`: 5 reps each, mobile throttling, lock taken,
same session (06:25–06:31). Times are medians in ms from the tap.

| Probe | commit path | **this head** |
| --- | ---: | ---: |
| Accept at 1.0 s: consent effective | 849 | **575** |
| Accept at 1.0 s: last gated script runs | 1,029 | **1,119** |
| Accept at 1.0 s: first gated script, from navigation | 2,045 | **1,961** |
| Accept at 2.5 s: consent effective / last script | 368 / 370 | **86 / 256** |
| Scroll 1.8 s, Accept 2.8 s: consent effective / last script | 86 / 298 | **88 / 304** |

On the Accept at 1.0 s probe, the last script runs **1,119 ms after the
tap**. That is over the round-4 1,000 ms limit, and 90 ms later than the
commit path. Consent takes effect 274 ms earlier. The first script starts
84 ms earlier, but the second ends later. I did not find the cause.

## Bytes

The fixture proxy serves Brotli q11. Each chunk group below was recorded from
a real visit with the hero image stalled (`instant-commit/bin/groups.mjs`) and
sized from disk.

- base = `9c16ae024`, the branch start
- commit path = `fd020fd7c` / `ca5fa8eeb`, the consumers named in the brief
- head = `aa15552b1`

### Next.js (Turbopack)

| Group | base | commit path | **head** | head − commit path |
| --- | ---: | ---: | ---: | ---: |
| c15t first-load chunk (`ConsentFixture` boundary) | 9,348 | 9,026 | **11,782** | +2,756 |
| All first-load JS (6 chunks, framework included) | 119,161 | 118,889 | 121,770 | +2,881 |
| Engine group (after a scroll, 4 chunks) | 76,961 | 76,583 | 76,515 | −68 |
| After an Accept tap (6 chunks) | 89,046 | 88,694 | 87,856 | −838 |
| Commit chunk | 9,471 | 9,496 | 8,726 | −770 |
| After Customize (8 chunks) | 126,818 | 125,639 | 125,437 | −202 |
| Document (my q11 of the served HTML) | 13,400 | n/a² | 13,525 | +125 vs base |

### React (Rolldown)

| Group | base | commit path | **head** | head − commit path |
| --- | ---: | ---: | ---: | ---: |
| c15t first-load chunk | 43,099 | 43,026 | **44,826** | +1,800 |
| All first-load JS (5 chunks) | 98,065 | 97,992 | 99,790 | +1,798 |
| Engine group (after a scroll) | 40,462 | 40,463 | 39,942 | −521 |
| After an Accept tap | 46,440 | 46,442 | 45,641 | −801 |
| Commit chunks | 6,632 | 6,631 | 5,876 | −755 |

2. The commit-path consumer's HTML is 104,564 B raw against 87,628 for a
   harness build of base. That consumer was built by another lane's copy of
   the fixture, so I compare the document against base only.

### Budget and duplication

The shell grew by 2,756 B on Next.js and 1,800 B on React, inside the 3 KB
budget. What moved into first load: `instant-commit.ts`, `instant.ts`, the
subject-id generator and the storage-key resolver.

- **Subject-id generator and storage-key resolver.** Before, they were in the
  engine and commit groups. Now Turbopack puts them in the first-load chunk
  and no longer in the engine group. Checked by string markers in every chunk
  of each group.
- **Engine and commit groups.** Both shrank.
- **Not done:** a source-map attribution of every module, so a duplicate
  without a unique marker string is not ruled out.

## What the shell commit does and does not do

### In the tap's own task

Instant path conditions: the visitor has no stored choice, the policy has a
choice prompt, the choice scope is not empty, no GPC signal, no vendors, no
IAB and no experiment.

1. `commitInstantly` (`packages/react/src/deferred/instant.ts`) calls
   `planInstantCommit` (`packages/core/src/surface-actions/instant-commit.ts`).
   This is a short version of the save that covers only this case. A test
   checks it against `planEarlyCommit` across these inputs and finds the same
   snapshot every time: 5 policies, 4 configs, 11 inputs and 3 surfaces.
2. It inserts the `<script>` tags for the plain scripts the choice allows,
   from `useScriptLoader` registrations and the root's `scripts`, the way the
   commit chunk did. They register in `__c15tStarted` for the loader to adopt.
3. It gives the stand-in the committed snapshot and notifies its listeners.
   - React flushes the `useSyncExternalStore` update and its passive effects
     before the task ends.
   - Tests check this in the window's click task, with the commit chunk held,
     for the streamed Next.js root and for the client-rendered provider.
   - No `flushSync` was needed.
4. The banner is already hidden by the early-tap style.

### Read before the tap

After hydration, the root reads the stored clear epoch and draws a subject id
(`readAheadOfTap`), so the tap's task does not touch storage.

### After the tap's task

The commit chunk (`commit.ts`) loads next and completes the commit:

- It plans the same save with `planEarlyCommit`, from the same snapshot and
  subject id. The stand-in keeps its snapshot when the two are equal, so the
  page hears nothing new.
- It writes localStorage and the cookie, queues the save in the outbox, and
  calls `onChoiceRecorded` and `onPermissionsChanged`.
- It checks the clear epoch again; if one was stored since, the engine
  records the save instead.

Then the engine loads, adopts the records and sends the save once.

### Other changes

- **Late-registered scripts.** A `useScriptLoader` that gets its scripts in a
  later render than the commit, like the fixture's `Probe` after a tap made
  before hydration, now starts them through a starter the commit leaves on
  the registry entry. Before, they waited for the loader chunk.
- **Press hold in the early-tap script.** While a deferred root's banner
  cannot hydrate, the script stops `pointerdown`, `pointerup`, `mousedown`,
  `mouseup`, `touchstart` and `touchend` on the banner's buttons. Without
  this, React tried to hydrate the dehydrated banner boundary at every press,
  inside the tap's task.
  - The root sets a flag, `b` on the queue, and clears it when the engine
    renders or the script stops.
  - An earlier, unconditional version made Scroll then Accept 616 ms instead
    of 154. That is fixed: 88 vs 86 in the final probes.
- **Press-time preloads skipped.** A press no longer preloads scripts when the
  click will commit instantly.

### Not done in the shell (differs from the brief)

- **Storage write.** localStorage and the cookie are written by the commit
  chunk, a few hundred ms after the tap on the throttled profile, not in the
  tap's task.
  - Why: in a profile of the tap, `writeStoredConsentEnvelope` alone took
    3.4–4.1 ms at 4x CPU.
  - Moving the writer and encoder into the shell would also add about
    2.5 KB br (measured with esbuild) on top of the 2.8 KB already used.
- **Google Consent Mode `update`.** There is no consent-mode code in the
  React shell. In c15t it lives in `@c15t/integrations` scripts with
  callbacks, which wait for the loader.
- **Scripts with callbacks, vendor or IAB fields, inline code,
  `alwaysLoad` or `serverStart`** wait for the loader, as on the commit path.
- **These visitors still go through the commit chunk:** a stored choice, an
  active GPC signal, a notice prompt, an empty choice scope, a pending
  setter, or a stored clear epoch. Vendors, IAB, experiments and a pending
  policy still go to the engine.

## Commits

Branch `kaylee/instant-commit`, from `kaylee/react-deferred-commit-path`
(`9c16ae024`). Not pushed. 22 files, +1,630 / −220.

| Commit | Subject |
| --- | --- |
| `eae015cdb` | feat(core): plan a banner or dialog save in the tap's own task |
| `ba8414dca` | perf(react): commit a banner tap on the stand-in in the tap's task |
| `6aeb9ac29` | perf(react): keep storage reads and chunk loads out of the tap's task |
| `7a3e104ec` | perf(core): keep presses on an unhydrated banner's buttons from the page |
| `56ce33dc9` | fix(react): hold banner presses only while a deferred banner cannot hydrate |
| `aa15552b1` | perf(react): start late-registered scripts from an instant commit |
| `bb1f8eae8` | docs(next): say a banner tap before the engine takes effect in its own task |
| `ad86f4805` | test(react): drop failure screenshots committed with the commit-path tests |

Files:

- **core:**
  - `surface-actions/instant-commit.ts` (new; also exports `kernelOnly`,
    `isShortCase`, `hasStoredClearEpoch`, `generateSubjectId`)
  - `surface-actions/early-commit.ts` (shares `kernelOnly` and the clear-epoch
    check; takes a `subjectId`)
  - `surface-actions/early-tap-script.ts` (press hold, key `b`)
  - `package.json` (export `./surface-actions/instant-commit`)
- **react:**
  - `deferred/instant.ts` (new)
  - `deferred/commit.ts`, `deferred/shell.tsx`, `deferred/deferred-kernel.ts`,
    `deferred/registry.ts`, `deferred/trigger.ts`
  - `module-hooks/script-loader.ts`
- **vitest aliases:** react and nextjs.
- **docs:**
  - `docs/frameworks/next/optimization.mdx` (when a tap takes effect)
  - `docs/frameworks/next/rendering.mdx` (press hold)
  - both `.tegami/2026-11-02-*.md` notes amended
- **Next.js server side:** unchanged; the boot snapshot needed no new data.
- **Vite `consentManifest` and `index.html` injection:** not touched.

## Tests

All on the final code (`aa15552b1`; later commits are docs and test-file
deletions only).

| Suite | Result |
| --- | --- |
| core, `bun run test` with the coverage gate | 150 files, 3,123 pass |
| react, `src/__tests__` | 63 files, 554 pass |
| react, `src/components` | 52 files, 379 pass |
| react, `src/deferred` | 7 files, 59 pass |
| react, `component-hooks`, `hooks`, `server`, `utils` | 19 files, 121 pass |
| nextjs (`@c15t/integrations` built first), parallel run | 37 files, 396 pass |
| `check-types` for core, react, nextjs, c15t | 18/18 tasks pass |
| `test:scripts` | 877 pass, **2 fail** in `generate-umbrella-exports.test.ts` |
| oxlint on changed files | clean, except errors that already exist at base in `deferred-kernel.ts`, `shell.tsx` and `client-provider.test.tsx`, which I did not touch |
| oxfmt | clean (pre-commit hook) |
| `lint:docs`, `fmt:docs` | no changes outside my two pages |

Notes on the table:

- **React batches.** Each batch exits 1 only because the package-wide
  coverage threshold applies to a partial run. No test failed.
- **`test:scripts` failures.** The `c15t` umbrella export map is missing
  generated entries. At base it was already missing 5:
  - `react/deferred`
  - `react/deferred/engine`
  - `runtime/deferred-snapshot`
  - `surface-actions/early-commit`
  - `transports/hosted-factory`

  I checked by running the test in a base worktree. My new
  `surface-actions/instant-commit` makes it 6. `packages/c15t` is outside
  this lane's scope; `bun run generate:umbrella` regenerates them.

### New tests

- **Core, `instant-commit.test.ts`.**
  - The instant plan equals `planEarlyCommit` in snapshot and in which
    derived fields keep their reference. Both decline the same inputs.
  - It covers the opt-in, opt-in with every category, strict scope, opt-out
    and one-day-choice policies; fresh, known-subject, no-categories and
    signed-in configs; 11 inputs; and the three surfaces.
  - It declines a stored choice, a notice, GPC, declared vendors and a
    future tap.
  - Mutating the evaluator's refusal rule or the default permission fails
    16 and 6 cases.
- **Core, `early-taps.test.ts`.** Presses on the banner reach the page with
  no hold, stop while the hold is set, and reach it again once it is cleared.
  Presses outside the banner always reach the page.
- **React, `commit-path.test.tsx`.** All with the commit chunk and engine held
  unless noted.
  - An accept inserts the page and root plain scripts during the click and
    runs the page's `useSnapshot()` effect with the choice before the next
    task. Nothing is stored or announced yet, and the press hold is on.
  - After the commit chunk is released: stored, callback once, the page hears
    nothing new.
  - After the engine is released: one transport save, no second callback, no
    second script element, and the press hold is off.
  - A reject, a save from the early dialog, and an accept tapped before
    hydration take effect the same way.
  - Scripts a page registers in a later render, after a tap made before
    hydration, start through the starter. Checked with `__c15tStarted`; the
    test fails with the starter call removed.
- **React, `client-provider.test.tsx`.** The client-rendered provider's
  accept runs the page effect with the choice before the next task.
- **React, `deferred-kernel.test.ts`.** The copied hold key equals core's.
- **Checked by disabling the instant commit:** the 4 tap-task tests fail.

## Discards

Every row in the tables above passed:

- load samples at or under 8 during the run;
- all samples passed;
- control FCP under 400 ms (Next.js) or 800 ms (React).

`instant-commit/bin/guarded.sh` enforces these rules and retries a run that
breaks one.

Discarded:

- **Earlier sessions on older builds** (`m1-*`, `m2-*`, `m3-*`, `smoke*`).
  Superseded. Several also had load peaks of 7.5–41.
- **f1, `56ce33dc9`, 23:16–01:02.**
  - CookieYes `load`: peak 28.5.
  - `accept` for all three builds: peaks 9.1–34.8.
  - head `reject`: peak 29.3, one incomplete sample.
  - commit-path `reject`: stopped by me.
- **f2, `56ce33dc9`, 01:03–05:07.** Logged in `runs/discards.log`:
  - head `accept`, 4 attempts:
    - peak 44.9, plus one follow-up visit that saw 0 script executions;
    - peak 37.8, `ERR_NETWORK_CHANGED`;
    - peak 8.42, a follow-up visit's readiness timeout;
    - peak 17.4.
  - CookieYes `accept`: 3 attempts, peaks 11–37.
  - CookieYes `reject`: peak 8.9.
  - head `returning-accepted`: peak 13.2.
  - React head `load`: one failed sample.
  - The follow-up-visit failures were under load; I did not reproduce them on
    a quiet machine.
- **f4, the final session:** no discards; every run passed its first attempt.

## Risks

- **Scripts run before a consent record exists.** On the throttled link
  storage is written a few hundred ms after the tap.
  - A visitor who leaves in that window has had the scripts run and has no
    stored choice; the next page shows the banner again.
  - The commit path had the same order for preloads; here the scripts also
    execute.
- **Callbacks come after the scripts.** `onChoiceRecorded` and
  `onPermissionsChanged` fire after the page, and the plain scripts, already
  acted on the choice.
- **Fallback when the commit chunk cannot complete** (load failure, or a
  clear stored after hydration). The stand-in already shows the choice and
  the scripts are in; the root then calls `commands.save` on the engine. This
  path has no test.
- **A second copy of the save rule.** `planInstantCommit` reimplements the
  evaluator for one case. The equivalence test guards it. If they ever
  differ, the commit chunk replaces the snapshot, but scripts were already
  inserted from the instant one.
- **Press hold.** While a deferred root's banner waits for the engine, page
  listeners do not see pointer, mouse or touch down and up on the banner's
  buttons, for example an analytics library counting presses. The click was
  already held before this branch.
- **Accept at 1.0 s.** The last script runs 1,119 ms after the tap, over the
  1,000 ms limit, and 90 ms later than the commit path. Cause not found.
- **React LCP is +12 ms against the commit path** (+300 vs +288). The CIs
  overlap and it is within the 30 ms bar.
- **The umbrella export test fails** (pre-existing, plus one entry).

## Where the remaining gap to CookieYes comes from (measured, not fixed)

Next.js tap traces (`bin/tap-trace.mjs`, mobile throttling) and CookieBench's
`inputEvents`:

| Handler starts after the tap | c15t | CookieYes |
| --- | ---: | ---: |
| `pointerdown` | about 10–12 ms | about 7 ms |
| `click` | about 14–16 ms | about 9 ms |

- In c15t the click handler runs `routeTap`, about 5 ms at 4x CPU, of which
  `commitInstantly` is about 3.7 ms. React's re-render then runs in a
  microtask in the same task.
- CookieBench reads the state on its next animation frame, so c15t usually
  lands one frame later than CookieYes.
- I did not profile the React fixture's tap. There the banner is a React
  component and the click goes through React's event system and
  `saveConsentSurface`.

## Not verified

- Desktop profile; webpack builds; React 18; the Pages Router.
- React `reject`, `preferences`, `save` and `reject-keyboard`, which the brief
  did not ask for.
- The fallback when the commit chunk fails to load, in a browser.
- The cause of the Accept at 1.0 s last-script regression.
- The follow-up-visit failures in the loaded f2 head `accept` attempts, on a
  quiet machine.
- That no module is duplicated across chunk groups beyond the marker check.
- CSP nonce on scripts inserted by the late-registration starter: it uses the
  root's `nonce` the same way the commit chunk does. No CSP browser test.

## Artifacts

All under `/home/kaylee/.t3/scratch/lcp-fleet/instant-commit/`:

- `runs/f4-*`: the final session, with `config.json`, `envelope.json` and
  `loadavg.txt` per run.
- `runs/f2-*`, `runs/f3-*`: the earlier valid session.
- `*-discarded-*`: rejected runs. `runs/discards.log`: reasons.
- `probes/f4-*`: the final probes.
- `probes/prof-*`, `probes/tap-*`: tap traces and profiles.
- `groups-*.json` and `.txt`: chunk groups.
- `tests/final-*.log`: test logs.
- `bin/`: scripts.
  - `guarded.sh`, `run.sh`, `final.sh`, `mkcfg.py`, `table.mjs`
  - `groups.mjs`, `groups.sh`, `tap-trace.mjs`, `attrib.mjs`, `incl.mjs`
  - `probes.sh`, `probe-table.mjs`, `clone.sh`
- Builds:
  - `work-next/` (head, ports 5000/5001)
  - `ref-next/` (5002/5003)
  - `cy-next/` (5004–5006)
  - `react-bench/work/head1/` (5010)
  - `ref-react/` (5011)
  - `cy-react/` (5012/5013)
  - `base-next/`, `react-bench/work/base/` (base `9c16ae024`)
- `test-artifacts/`: failure screenshots moved out of the repo.
