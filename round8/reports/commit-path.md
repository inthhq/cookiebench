# Lane `commit-path`: record a banner tap without the deferred engine

## Verdict

Accept and Reject before the engine now take effect in about 300 ms from the
tap on Next.js and about 270 ms on React; base was 915 and 568. Scripts finish
within a few ms of that because they are preloaded at the tap. LCP stays within
the 30 ms bar on both frameworks, and banner.visible is unchanged.

Two bars are not fully met:

- **Cold returning visitors on Next.js: +122 ms** against the current branch
  (probe, 5 reps). Warm returning visitors are fine (780 vs 836 ms).
- **A tap made before hydration (Accept at 1.0 s): the last gated script runs
  1,041 ms after the tap.** That is 41 ms over the 1,000 ms limit. Canary is at
  1,493 ms in the same case. The delay comes from hydration, not from the
  commit.

Customize opens the dialog 644 ms after the tap, against 1,336 on base and
454 on canary. That is under the 1,000 ms limit but not under the 500 ms
target.

### Next.js, mobile, same machine

All numbers are medians in ms. Action scenarios ran 10 iterations each, `load`
ran 15 pairs.

- canary = `c35b112b7`
- base = `16b0eac46`
- candidate = `kaylee/deferred-commit-path` at `fd020fd7c` (the branch head).

Canary and base action scenarios ran from 13:31 to 13:56. The candidate's ran
from 14:54 to 15:08. The `load` rows for base and the candidate ran back to
back at 14:44–14:51.

| Measure | canary | base | **candidate** |
| --- | ---: | ---: | ---: |
| `load` LCP delta vs control (95% CI) | +400 (388–408)¹ | +48 (40–60)² | **+64 (52–72)** |
| `load` banner.visible | 274 | 246 | **250** |
| `load` control FCP | 264 | 252 | 248 |
| Bytes finished before hero, over control (waterfall) | +85,670 | +20,949 | +23,188³ |
| c15t first-load chunk, br | 67.6 KB | 7,022 | **9,019** |
| `accept` consent-effective (max) | 59 | 915 | **324 (384)** |
| `accept` scripts-complete (max) | 239 | 1,331 | **327 (392)** |
| `accept` dismissed / input-to-next-paint | 59 / 64 | 32 / 32 | 33 / 36 |
| `reject` consent-effective (max) | 42 | 916 | **300 (344)** |
| `reject-keyboard` consent-effective (max) | 36 | 875 | **308 (756)** |
| `preferences` dismissed | 39 | 888 | **38** |
| `preferences` preferences-visible (max) | 454 | 1,336 | **644 (663)** |
| `save` consent-effective / scripts-complete (max) | 33 / 182 | 39 / 188 | **57 / 221 (146 / 324)** |
| Probe: Accept at 1.0 s, consent after tap | 1,098 | 1,543 | **870** |
| Probe: Accept at 1.0 s, last gated script after tap | 1,493 | 1,942 | **1,041** |
| Probe: Accept at 1.0 s, first gated script from navigation | 2,498 | 2,952 | **2,049** |
| Probe: Accept at 2.5 s, consent / last script after tap | 102 / 296 | 953 / 1,366 | **378 / 379** |
| Probe: Accept at 2.5 s, first gated script from navigation | 2,813 | 3,870 | **2,892** |
| Probe: scroll 1.8 s, Accept 2.8 s, consent / last script | 100 / 281 | 95 / 306 | 96 / 318 |
| Probe: scroll then Accept, first gated script from navigation | 3,095 | 3,115 | 3,130 |
| Returning warm (`returning-accepted`), first gated script from navigation | 664 | 836 | **780** |
| Returning cold (probe, 5 reps), first gated script | 2,429 | 2,559 | **2,681** |
| Samples passed (`accept`, `reject`, `preferences`, `reject-keyboard`, `save`, `returning-accepted`) | all 10/10 | all 10/10 | 9, 9, 10, 10, 10, 10⁴ |

Notes:

1. From the 13:24 run (15/15 passed). The 14:51 canary rerun had 3 failed
   samples from 10 s timeouts on a loaded machine and read +394 over 12 pairs.
2. Base has one incomplete sample in both of its `load` runs. Only
   `initial.transfer` was missing, because a response was in flight at the 5 s
   cutoff. LCP was measured in all 15 pairs. The earlier base run read +52
   (16–68).
3. From the v6 build (`cbfe1c32f`). The final build's first-load chunk differs
   from v6 by the warm-up code (+) and `chunk-warming` (−). I did not rerun the
   waterfall for it.
4. In the candidate's `accept` and `reject`, sample 0 failed. In `accept` it
   was the fixture proxy compressing a fresh chunk during the sample. In
   `reject` the readiness flag never set. Both are the first sample after the
   fixture server starts on a new build. The v6 build's runs (14:02–14:16) had
   10/10 in both, with `accept` 319 / 322 and `reject` 312.

Every candidate sample, in every scenario, is under 1,000 ms from the tap.
Nothing over 500 ms except Customize (604–663) and one `reject-keyboard`
sample (756).

The probes are defer-fix's `probe.mjs` (5 reps, mobile throttling, lock taken).

### React (Vite, client-rendered), mobile, same session (14:25–14:43)

- base = `267563fa4`
- candidate = `kaylee/react-deferred-commit-path` at `ca5fa8eeb`. The final
  head `9c16ae024` adds three things on top:
  - the pre-hydration warm-up (a no-op without an early-tap queue);
  - dropping `chunk-warming` from the shell (the stock banner already loads
    it on this page);
  - docs.
  Not re-measured.

| Measure | base | **candidate** |
| --- | ---: | ---: |
| `load` LCP delta (95% CI, 15 pairs) | +276 (264–288) | **+288 (272–292)** |
| `load` banner.visible | 1,091 | **1,099** |
| `load` control FCP | 748 | 740 |
| Bytes finished before hero, over control (waterfall) | +46,230 | +48,145 |
| c15t first-load chunk, br | 41,114 | 43,026 |
| `accept` consent-effective (max) | 568 (607) | **266 (281)** |
| `accept` scripts-complete (max) | 994 (1,031) | **357 (362)** |
| `accept` dismissed | 29 | 30 |
| `returning-accepted` first gated script from navigation | 1,005 | **1,004** |
| `returning-accepted` LCP delta | +72 | +68 |
| Samples passed (`load` / `accept` / `returning-accepted`) | 15 / 10 / 9⁵ | 15 / 10 / 10 |

5. One incomplete sample in base `returning-accepted`.

I did not run React `reject`, `preferences`, `save` or `reject-keyboard` (the
brief asked only for `load`, `accept` and `returning-accepted`).

## How it works

### Accept or Reject before the engine

When a banner tap arrives before the engine has loaded, the root loads a small
commit chunk instead of the engine. The tap can come from the inline early-tap
script, or from a stand-in `commands.save('all' | 'none' | selection)`, such as
a client-rendered banner's button or page code.

`@c15t/core/surface-actions/early-commit` plans exactly what
`commands.save` would commit. It uses the kernel's own code:

- `kernel/save-plan.ts` and `buildNextSnapshot`;
- `recordCategoryPatch`;
- the payload builder that `choice.ts` now also uses.

The commit chunk then does the following, in order:

1. The stand-in kernel takes the committed snapshot, and its listeners hear it.
2. Plain page and root scripts (a `src` with no callbacks, vendor or IAB
   fields) are inserted the way the server start inserts them
   (`__c15tStarted`), so the script loader adopts them when it arrives.
3. It calls `onPermissionsChanged` and `onChoiceRecorded`.
4. It writes the envelope with the persistence store's encoder: localStorage
   and cookie.
5. It queues the payload in the save outbox, as `send()` does first.

Then the engine loads. Its provider is given the committed records in its
prefetch, so its kernel starts from the choice. It calls a new internal
`replaySaves()` to send the queued save once.

It does not record the choice again. A test compares the commit with a real
kernel's save on the same snapshot: snapshot, records, payload and events are
equal. Engine `onPermissionsChanged` events reach the page only when they
differ from what the page last heard. Without that rule, a streamed state made
the engine report "granted" a second time.

### Fetching ahead of the tap

- A press on Accept or Reject fetches the commit chunk.
- For Accept, it also adds `<link rel=preload as=script>` for the plain
  scripts an Accept would allow. They download alongside the commit chunk and
  execute only when the commit inserts them.
- Input inside the stock banner no longer wakes the engine. Taps are routed by
  the root. Page-wide input and scroll still wake it.

### When the commit path declines

The commit path declines, and the engine replays the tap as before, when:

- vendors are declared or denied;
- the policy is IAB, has an experiment, a notice prompt, or is still pending;
- a clear epoch is stored;
- persistence is off or a consent source is set;
- a setter other than an already-known category registration is queued;
- the engine has already started rendering.

### Customize before the engine

- The banner hides at the tap.
- The stand-in shows `activeUI: 'dialog'` locally, without loading the engine.
- `deferred/dialog.ts` (wrapper, panel and preferences in one chunk group)
  renders the stock dialog against the stand-in.
- Once the dialog is on screen, the engine and the commit chunk load. The
  stand-in hands the surface to the engine at attach.
- A save from that dialog (bulk, or a selection without vendor grants) goes
  through the commit path. `useSetActiveUI()` with `'dialog'` before the engine
  does the same.

### Triggers kept

The full engine still loads:

- after priority images;
- on page-wide pointer, key or scroll input;
- on the 10 s timeout;
- right after a commit;
- right after an early dialog shows.

## Commit chunk contents and what moved out

Attribution came from a source-mapped copy of the fixture build
(`commit-path/bin/attribute-run.ts`, react-arm's tool).

### Base

An Accept before the engine downloads the following after the tap. Total
chunk bytes after the tap (probe, Accept at 2.5 s): 85,004 B transfer.

| Chunk | br |
| --- | ---: |
| engine (3 chunks): kernel, persistence read/write, transports, schema wire reader, provider, banner/dialog wrapper, translations, experiment, vendors, blockers, journey | 65,622 |
| script loader (with its own copies of `vendors`, `evaluate`, `has`) | 9,903 |
| persistence writer | 4,205 |
| outbox queue | 2,615 |

### Candidate commit chunk (Next.js, one Turbopack chunk)

**9,766 B br** (33,119 raw; 9,934 B on the wire).

| Module | raw |
| --- | ---: |
| `kernel/next-snapshot` | 5,028 |
| `consent-record/evaluate` | 3,850 |
| `libs/cookie/*` | 3,467 |
| `surface-actions/early-commit` | 2,563 |
| `kernel/save-plan` | 2,549 |
| `consent-record/validation` | 2,539 |
| `persistence/writer/encode` | 2,211 |
| `persistence/writer/store` | 1,938 |
| `react/deferred/commit` | 1,828 |
| `persistence/writer/write` | 1,317 |
| `consent-record/record` | 1,042 |
| `save-outbox/store` | 962 |
| subject id, storage keys, `policy-choice`, external permissions | 2,522 |

On React (Rolldown) the same code is four chunks: commit 1,688, store 2,763,
write 1,732 and subject id ~800 B br. That is 8.3 KB on the wire.

### Cuts that got it there

- `buildNextSnapshot` moved to `kernel/next-snapshot.ts` with the policy
  resolution passed in. `kernel/patch.ts` keeps the kernel's interface. This
  keeps the schema policy-resolution wire reader and rule invariants out
  (9.7 KB raw).
- The selection helpers moved to `policy-choice.ts`, so `policy.ts` and the
  evaluation-policy builder stay out.
- The envelope is written without the record codec's validator. A test reads
  it back with the real reader.
- The script loader is not in the chunk. Plain scripts start from the commit.
  The loader is fetched with the commit only when a script needs it.

13.1 KB br before these cuts, 9.8 KB after.

### What moved out of the tap path

These now arrive with the engine after the commit:

- kernel lifecycle and init;
- persistence hydration and reconcile, and the writer;
- transports;
- the schema wire reader;
- the React provider and banner;
- translations, experiment, vendors, IAB, blockers, journey, devtools;
- the outbox queue worker;
- the script loader, for plain scripts.

### Duplication (Turbopack)

| Path | base | candidate |
| --- | ---: | ---: |
| Accept, chunk bytes after tap | 85.0 KB | 91.4 KB |
| No tap: engine group | 66.9 KB | 68.0 KB |
| No tap: first-load c15t chunk | 7.0 KB | 9.0 KB |
| Customize: dialog group, then engine | engine + 19.0 KB dialog | 40.7 KB + 68.0 KB |

- **Accept, +6.4 KB.** The commit chunk's modules are also in the engine
  group, but the engine no longer fetches the writer.
- **No tap, +1.1 KB engine group and +2.0 KB first load.** The first-load
  growth is mostly `deferred/shell.js`: 2,850 → 5,281 B raw.
- **Customize, ~22 KB downloaded twice.** Shared UI modules are in both the
  dialog group and the engine group.

## Commits

### Next.js: `kaylee/deferred-commit-path`

Worktree `t3-6d4b6b88`, base `16b0eac46`, not pushed.

| Commit | Subject |
| --- | --- |
| `0355b9c64` | refactor(core): share a save's pure parts outside the kernel |
| `f7f981eea` | feat(core): record a banner accept or reject before the kernel loads |
| `971c3c88b` | perf(react): record a banner tap before the deferred engine loads |
| `0d8f29b89` | perf(react): commit stand-in accepts and rejects before the engine |
| `61c162c7c` | perf(react): open the dialog before the deferred engine loads |
| `cbfe1c32f` | perf(react): start the early dialog's chunk with its wrapper |
| `80e9bbc28` | perf(react): load the early dialog in one round trip |
| `01ac45b2e` | perf(react): fetch the commit chunk once an early dialog is on screen |
| `64d519240` | docs(next): describe banner taps before ConsentRoot's engine loads (+ `.tegami` note amended, `@c15t/core` added) |
| `de8de11db` | perf(react): fetch the commit chunk for a tap made before hydration |
| `fd020fd7c` | perf(react): keep dialog warming out of the deferred shell |

Key files:

- core: `surface-actions/early-commit.ts`, `kernel/save-plan.ts`,
  `kernel/next-snapshot.ts`, `kernel/patch.ts`, `policy-choice.ts`,
  `kernel/{internals,index,init-lifecycle}.ts` (`replaySaves`),
  `surface-actions/early-tap-script.ts` (notify hook `n`), `package.json`
  (new export).
- react: `deferred/{commit,committed,dialog}.ts`,
  `deferred/{shell,engine-host}.tsx`,
  `deferred/{deferred-kernel,registry,runnable,trigger}.ts`,
  `module-hooks/script-loader.ts`.
- nextjs: `root.tsx`, `root-engine.tsx`.
- vitest aliases in react and nextjs.
- docs: `docs/frameworks/next/optimization.mdx`.

### React: `kaylee/react-deferred-commit-path`

Worktree `/home/kaylee/.t3/scratch/lcp-fleet/commit-path/react-src`, base
`267563fa4`, head `9c16ae024`, not pushed.

- I merged `kaylee/deferred-commit-path` into it rather than cherry-picking
  (`f59bf77c5`, then `8a5af384f`, `ca5fa8eeb`, `6511dfcb9`, `9c16ae024`). The
  defer-fix commits are needed by the commit path and conflicted with the same
  page-wide-wake change react-arm made.
- Conflicts were resolved in `deferred-kernel.ts`, `shell.tsx`, `trigger.ts`
  and the kernel test. The `whenPriorityImagesLoad` export was kept for idle
  warming.
- `e9ba7fdc0` wires the commit path into the client-rendered
  `ConsentProvider`.
- `422f4f2b2` updates its release note.
- This branch therefore also carries defer-fix's five commits.

## Tests

| Suite | Result |
| --- | --- |
| core `early-commit.test.ts` (new) | 10 pass |
| react `src/deferred` (new: `commit-path.test.tsx`; extended: `deferred-kernel.test.ts`) | 48 pass on the Next.js head, 3 consecutive runs; one earlier run failed on a 1 s wait for the dialog, now 5 s |
| react `client-provider.test.tsx` on the React head (new test) | 4 pass; the new test fails with the commit path switched off (checked) |
| **Next.js head `fd020fd7c`**: core (`bun run test`, coverage gate) | 148 files, 2,889 pass |
| react, in batches (`src/__tests__`, `src/components`, `src/deferred`, then `component-hooks hooks server utils`) | 63 / 52 / 6 / 19 files; 553 / 379 / 48 / 121 tests, all pass |
| nextjs (`@c15t/integrations` built first) | serial (`--no-file-parallelism`): 37 files, 396 pass. Parallel (`bun run test`), twice: `defer.test.tsx` 2 tests fail (the opt-in `deferConsent` island; 15/15 pass when run alone). `ssr-policy` failed once in the first parallel run. Base `16b0eac46` in parallel: only `ssr-policy` failed (known flake per defer-fix). Cause of the `defer.test` failure not found. |
| check-types core, react, nextjs, c15t | 18/18 tasks pass |
| **React head `9c16ae024`**: core | 149 files, 2,896 pass |
| react, same batches | 63 / 52 / 7 / 19 files; 554 / 379 / 54 / 121 tests, all pass |
| nextjs, serial | 37 files, 396 pass |
| check-types | pass |
| oxlint, oxfmt on changed files | clean |

In the react `src/__tests__` batch, `astro-iab-loader`, `dialog-stylesheet` and
`experiment` (and `pending-save` on the React head) left failure screenshots:
they passed on vitest's retry. defer-fix reported the same three. I did not
investigate them.

What the new tests cover:

- **Core.** The commit equals `commands.save` for `'all'`, `'none'` and a
  selection: snapshot, records, payload and events. It declines notice,
  vendors, a pending policy and a future time. The stored record reads back
  with the real reader. A second kernel started from the records sends the
  queued save once with `replay: true` and emits no events. The early-tap
  script calls the notify hook.
- **React stand-in.** It takes the committed snapshot and delivers events to
  stand-in listeners, refuses a commit after attach, and lists pending
  setters.
- **React scheduler.** Banner input routes instead of waking the engine; page
  input still wakes it; a queued tap is routed at schedule time.
- **End to end (`commit-path.test.tsx`).**
  - Accept with the engine held: committed, stored, queued, callbacks once.
    After release: one transport save, no second callback, banner markup
    gone, no recoverable errors.
  - Plain page and root scripts run once and are adopted with no second
    element.
  - A reject tapped before hydration is replayed through the commit.
  - A page `save('all')` resolves from the commit.
  - Customize opens the dialog with the engine held, and Reject from it
    commits.

The tests also caught two bugs, fixed before measuring:

- The engine's banner replayed a tap the commit had already recorded,
  because the claim replaced the window property rather than emptying the
  queue object. In the test the script ran in an iframe; in a page the same
  path would have removed the hiding style while the hydrated banner could
  show for a frame.
- Engine `permissions:changed` was echoed during attach.

## Remaining risks

- **nextjs `defer.test.tsx` fails in parallel runs on this branch** but not
  on base. It passes alone and in a serial full run. Unexplained.
- **Cold returning visitors, +122 ms on Next.js.** Hydration is about 80 ms
  later, because the first-load chunk is 2.0 KB larger and the engine group
  1.1 KB larger. Fix direction: move tap routing and the early dialog out of
  `shell.tsx` into the chunks the tap loads anyway, and keep only the preload
  and queue hook in first load.
- **Taps before hydration** wait for hydration: 870 ms consent and 1,041 ms
  last script for a tap at 1.0 s. CookieBench's own scenarios tap after
  readiness. A fix needs the commit chunk URL in the HTML, which Turbopack
  does not hand to the server (defer-fix found the same for the engine).
- **The banner impression is not recorded.** A visitor who taps before the
  engine gets no `surface:shown` or `onSurfaceShown` for that banner. Base
  recorded it late, when the engine started.
- **The save is a replay.** It carries no consent journey (`replay: true`),
  and `timeToDecisionMs` is absent, as it was on base for early taps.
- **React engine sends a second `/init` after a commit.** The prefetched one
  says no choice is stored, so the provider sends its own. That is one extra
  request of 1.6 KB.
- **No codec validator on the written envelope.** It is written from records
  the kernel's code built; a test checks the read-back.
- **Seeded clock.** The engine's prefetch is seeded with the client clock
  (`now`) so the newer records validate.
- **Callback `previous` is adjusted.** After a commit, engine
  `onPermissionsChanged` is filtered against what the page last heard, and
  `previous` is set to that.
- **Script requests leave at the tap.** For Accept, the plain scripts an
  Accept allows are preloaded (`<link rel=preload>`) at the tap, before the
  choice is stored. They execute only when the commit inserts them, right
  after the stand-in's snapshot changes. A vendor sees the request about
  300 ms before the record exists. If the commit then declines (a case only
  the engine records), the preload was wasted but nothing ran.
- **Customize downloads ~22 KB twice** (dialog group and engine group). A
  dialog closed without a choice before the engine shows the server-HTML
  banner again, but that banner is not interactive until the engine hydrates
  it; the early-tap script no longer captures taps on it at that point.
- **WeakMap keys.** A `useScriptLoader` loader created from a commit stays on
  the stand-in kernel. Its diagnostics and vendor owners are keyed by the
  stand-in, not the engine's kernel.

## Not verified

- Desktop profile: no runs.
- React `reject`, `preferences`, `save` and `reject-keyboard` in CookieBench.
- The Next.js final build's waterfall: bytes before hero are from the v6
  build.
- Webpack builds, React 18, Pages Router, multiple roots.
- Persistence `storageConfig` variants and a stored clear epoch in a browser;
  unit-tested only.
- `withdraw` (fails on canary too, per defer-fix).
- The candidate and reference action scenarios were taken about an hour apart.
  The `load` comparison and the React runs were back to back.

## Artifacts

All under `/home/kaylee/.t3/scratch/lcp-fleet/commit-path/`.

- `runs/`: every CookieBench envelope.
  - `ref-{canary,base}-*` are the reference scenarios.
  - `cand-cand-*` is the v6 build.
  - `final-*` is the `load` session for base, candidate and canary.
  - `final2-cand2-*` is the final candidate's scenarios.
  - `waterfall-{base,cand,canary}/` are the Next.js waterfalls.
  - `queue-*.log`, `after.log`.
- `probes/`: `p1-{canary,base,cand}-*` (v6 build), `p2-cand2-*` (final build,
  copied to `p1-cand2-*`), `cold-*` (cold returning).
- `react-bench/work/{rbase,rcand}/out/`: React runs and waterfalls.
- `attr-*.json`: chunk attribution.
- `tests-next/`, `tests-react/`: test logs.
- `bin/`: scripts.
  - `queue.sh`, `cb-run.sh`, `probes.sh`, `probe.mjs` (defer-fix's),
    `probe-table.mjs`, `scenario-table.mjs`, `compare-load.sh`,
    `attr-build.sh`, `attribute-run.ts`, `rebuild.sh`.
- Fixture builds: `work-{canary,base,cand,cand2}`.
  - `work-cand` is v6 `cbfe1c32f`.
  - `work-cand2` is the final `fd020fd7c`.
