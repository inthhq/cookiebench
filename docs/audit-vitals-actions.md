# Browser vitals and consent timing audit

Reviewed on 2026-09-27 against `browser-observer.ts`, `measure.ts`, `scenario.ts`, `overhead.ts`, `reference.ts`, their tests, installed `web-vitals@6.2.2`, and the selected envelopes linked by `artifacts/v3-2026-09-27-body-correction/report-final/summary.json`. This is an audit of the collector before the resulting fixes. Source review and retained evidence establish the defects below. No fresh browser run was used for this initial report.

## Findings that change the interpretation of existing results

### High: frame timestamps make completed actions appear unmeasured

`installObserver.tick` assigns the animation frame callback argument to visibility, dismissal, effective consent, acknowledgement, and state history. That argument identifies a frame, not the time the callback inspected the DOM or state. Input can arrive after the frame timestamp and before the callback executes. Subtracting the trusted input timestamp then produces a negative duration. `measured()` silently converts it to unavailable with a misleading missing-observation reason.

The retained primary attempts prove this happened:

| Selected cohort | Scenario | Trusted input | Recorded endpoint | Consequence |
| --- | --- | --: | --: | --- |
| `source-c15t-headless-flows` | reject | 72 | effective 71.4 | Passed action; effective duration unavailable |
| `source-c15t-react-flows` | reject | 122.2999997 | effective and dismissed 121.4 | Passed action; both durations unavailable |
| `source-c15t-script-flows` | reject-keyboard | 104.9000001 | effective and dismissed 104.9 | Floating negative; both durations unavailable |

The scenario success check only tests endpoint existence. It therefore passes these attempts while the measurement layer drops their durations. This explains the suspicious missing reject timings in the action table. The raw numbers cannot be repaired into exact elapsed observations after the fact.

Use `performance.now()` when sampling milestones and keep the frame argument only for frame cadence. Do not clamp negative measurements to zero. Add a regression where the callback frame timestamp precedes the captured input but the callback observes the completed state afterward.

### High: valid Event Timing entries fail action attribution

`inputListener` records only trusted `pointerdown` and Enter/Space `keydown` events. `interactionDuration()` chooses an interaction only if an observed Event Timing entry starts within 2 ms of that initial event. When the initial event is below the 16 ms reporting threshold, a later keyup or click can remain reportable without satisfying this match.

The raw primary attempts already contain two examples:

| Cohort | Scenario | Input timestamp | Reportable event | Duration | Current result |
| --- | --- | --: | --- | --: | --- |
| c15t script | reject-keyboard | 104.9000001 | keyup at 107.2000003, interaction 4675 | 16 | unavailable |
| Civic Cookie Control | reject-keyboard | 1706 | keyup at 1709.1, interaction 9047 | 16 | unavailable |

The unavailable reason says entries may be censored, but these entries exist. Record trusted related keyup, pointerup and click timestamps and target identity, match native entries to those events, then take the maximum duration for the matched interaction ID. A wider arbitrary time tolerance can misattribute a different interaction and is insufficient.

### High: action collection does not stop at its declared deadline

Action input sets `observations.deadlineAt`, but the DOM observer and native observer filters only enforce `config.fixedDeadlineMs`, which exists for load visits. Action collection keeps running until automation calls `stop()`, potentially after the longer action success wait. Only effective, dismissed, and preferences endpoints beyond the action window cause `observation-window-exceeded`. Other late state, scripts, persistence, events, and errors still enter the raw snapshot and some metric values.

The declared network cutoff and clipped long-task sum do not repair those other observations. Use one browser-relative deadline for every collector, distinguish entry start from entry completion, and preserve late correctness evidence separately. Test delayed consent, delayed persistence, delayed scripts, and a task crossing the deadline. A native event that has not completed by cutoff needs an explicit incomplete status or an explicit start-in-window contract.

### High: vitals use callback delivery time and cannot be drained by stop

`installVitals` rejects a web-vitals callback when current time exceeds the deadline or `observationEndedAt` is set. A valid in-window entry delivered late is lost. `stop()` drains the collector's own longtask/event observers but has no access to web-vitals' paint, LCP, layout-shift, or event queues. Setting `observationEndedAt` before draining also means callbacks triggered during finalization cannot update vitals.

Installed `onINP.ts` additionally defers processing to `whenIdleOrHidden`; its idle timeout can reach one second. The observer's 16 ms event threshold and web-vitals INP's default 40 ms threshold also differ. `page.lab-inp` can therefore disagree with a successfully measured primary interaction for reasons other than performance.

Finalize from bounded native entries, or retain a library-compatible finalization path that admits in-window entries after delivery while excluding later ones. Preserve CLS session-window and recent-input rules. Test last-moment LCP/CLS entries and delayed callback delivery. Do not present bounded lab CLS or INP as a whole-visit field metric.

### Medium: preferences timing can describe an already open panel

`arm()` clears `preferencesVisibleAt` for every action. The next frame records it whenever the preferences panel is visible, including panels opened in save/withdraw preparation before the timed input. Subtracting the commit timestamp yields a preparation interval or a negative value. Record this metric only for a preferences-opening action, or label it as a preparation observation with its own origin.

### Medium: visibility is a DOM observation, not paint or usability

The visibility predicate checks connectedness, ancestor CSS, opacity, bounding rectangle and viewport intersection. It does not prove the pixels were painted, account for clipping or occlusion, or establish actionability. `page.primary-visible` can be recorded behind a modal. `banner.coverage` is the first visible bounding rectangle intersected with the viewport, not the percentage of page pixels obscured by the entire consent interface. Open shadow roots work; closed shadow roots and iframe contents are not traversed.

Keep these useful observations but name and describe them as first DOM-visible checks and bounding-box coverage. Record timestamps at inspection time. Add explicit primary-content paint attribution or Element Timing for a controlled content element before making content-paint claims.

### Medium: followup offsets are earliest dispatch times

The nested followup waits in `page.waitForFunction` until `performance.now() >= input + offset`, then sends another automation command. The actual event may occur later because of frame polling, a busy renderer, and transport. The current report calls it a page input at the declared offset without exposing actual dispatch lateness. During a long task this can miss the period the probe was meant to test.

Retain the planned timestamp, actual trusted timestamp, scheduling lateness, handler delay, and native event duration separately. A probe with no captured trusted input should distinguish dispatch interception from a captured input whose handler failed. A pointer probe is forced but still obeys browser hit testing, so the overlay tests remain useful. Keyboard probes programmatically focus the target and do not measure natural tab access.

### Medium: readiness and preparation are not time-to-interactive

Ready actions wait for an adapter selector to attach. That usually describes public consent resolution, not browser actionability. Save, withdraw, and declared draft selection paths additionally run a Playwright trial click before arming. This is an explicit preparation condition and can wait for animation or enabled state. Simple accept/reject use a forced click after adapter readiness without that trial. Their timing origins are final trusted inputs, so the action metrics are valid only for these declared protocols and omit the wait to readiness.

The report should expose adapter-ready time, actionability preparation duration, final input time, and readiness-to-input delay. Do not compare a full preferences journey to a final save click. Existing choice-preparation diagnostics help but do not include every open/toggle step as a single journey contract.

## Metric contracts

| Metric | Current source and useful meaning | Audit result |
| --- | --- | --- |
| `banner.visible` | First DOM-visible banner observation since navigation | Timestamp defect; not painted or actionable |
| `banner.coverage` | First visible banner bounding box clipped to viewport | Valid geometry, incomplete obstruction model |
| `page.primary-visible` | First DOM-visible primary selector | Timestamp defect; not content paint and can be occluded |
| `page.lcp` | Latest reported native largest contentful paint through web-vitals | Real browser value; cutoff delivery defect; candidate can be CMP text |
| `page.fcp` | First contentful paint through web-vitals | Real browser value; cutoff delivery defect |
| `page.ttfb` | Navigation response timing through web-vitals | Measures document response, usually insensitive to late CMP work |
| `page.cls` | Web-vitals maximum layout-shift session score observed by cutoff | Correct library formula; bounded window and callback cutoff limitations; recent input shifts excluded |
| `page.lab-inp` | Web-vitals visit interaction estimate | Includes preparatory interactions; idle/report threshold and cutoff differ from action event collector |
| `initial.long-task-blocking` | Sum of long-task portions after each task's first 50 ms, clipped to navigation/input or fixed load interval | Interval formula is correct; not Lighthouse TBT; pending boundary task may not yet have been delivered |
| `action.long-task-blocking` | Same sum clipped to input plus configured duration | Formula is correct; resolve partial-task delivery contract |
| `consent.resolution` | Bridge's first reported resolution timestamp | Public adapter milestone, not control readiness or paint |
| `action.input-to-next-paint` | Maximum native duration of matched interaction | Attribution defect; quantized; unavailable must stay unavailable |
| `action.followup-input-to-next-paint` | Same measurement for page-control input in separate attempt | Same attribution defect; actual offset needs reporting |
| `action.acknowledgement` | First visible changed acknowledgement text after arm/input | Timestamp defect; text-only heuristic; unrelated text changes can qualify |
| `action.dismissed` | Banner absent and declared blocking overlay absent, plus panel absent for save/withdraw | Timestamp defect; DOM-based endpoint; useful overlay handling |
| `action.consent-effective` | First sampled explicit consent and exact allowed-category set | Timestamp defect; not an execution or persistence timestamp |
| `action.local-persisted` | Adapter's successful storage completion minus input | Only valid where adapter reports it; current action cutoff allows late value; reload separately verifies restoration |
| `action.remote-persisted` | Adapter's acknowledged backend success minus input | Backend acknowledgement, not guaranteed durable server commit; current action cutoff allows late value |
| `action.preferences-visible` | First visible panel after arm minus input | Only meaningful for opening action; currently includes preparation |
| `scripts.executions` | Count of controlled execution markers | Useful fixture workload evidence; not all vendor script execution |
| `scripts.duplicates` | Count minus unique controlled IDs | Correct count of duplicate IDs; no CPU cost inference |
| `action.scripts-complete` | Latest expected allowed controlled marker minus input | Accept/save only; correct only with complete expected workload, identity checks and bounded state snapshot |
| `observation.frame-interval` | Maximum gap between observer animation-frame timestamps | Collector cadence diagnostic, not general dropped-frame rate |
| `observation.callbacks` | Number of DOM observer frames | Collector diagnostic, not user performance metric |
| Audit FCP/LCP | Identical minimal native observers in both audit arms | Better explicit queue drain; still bounded lab paint |
| Audit task/script/layout duration | CDP cumulative counter delta with `threadTicks`, converted to milliseconds | CPU-time counters, not wall-clock delay; endpoints are not identical to paint deadline |
| Audit observed window | Browser timestamp obtained after ending CDP CPU snapshot | Honest raw timestamp but slightly later than CPU counter endpoint |

Network byte/request metrics have a separate audit. Their definitions in `measure.ts` require complete response bytes and preserve missing values; this report does not certify the network collector.

## LCP interpretation and fixture limitations

The selected 900 load LCP observations contain no zero or missing absolute values. Zero paired differences are plausible because the small local heading often wins LCP before the CMP finishes loading. OneTrust's 30 candidate observations select `DIV#onetrust-policy-text`, while most fixture candidates select `H1`. LCP therefore compares different kinds of content for those visits.

Report absolute baseline and candidate LCP alongside the paired difference, plus candidate identity and whether it belongs to content or consent UI. Preserve candidate size and resource URL. A CMP that becomes LCP has changed the largest visible element; that alone does not establish an equal delay to the article.

The existing reference desktop profile has no added latency, CPU slowdown 1, and 12.5 MB/s throughput. It is useful for a controlled low-load case. Add a declared mobile profile and a shared realistic content workload with deterministic local image, font, stylesheet, and application work. Baseline and candidate must have identical page workload and profile. Loading placement remains part of each integration's declared configuration and must be compared with current vendor guidance.

## Returning visits, withdrawal and persistence

Returning preparation applies real consent, waits its observation period, reloads and checks restoration. A cold returning sample copies cookies/local storage into a new context; a warm sample reuses its context. Storage copying does not preserve all browser storage systems by default, so adapters requiring IndexedDB or session storage need an explicit supported contract. Warm fresh preparation clears origin storage and cookie state after its warmup visit; only the intended HTTP cache warming should be claimed.

Withdrawal retains pre-input controlled executions and changes permission expectations after the actual input. This is the correct distinction: earlier allowed execution is not retroactively a leak. However controlled release-once scripts do not prove withdrawal can stop recurring trackers, cancel in-flight requests, or prevent all future vendor activity. Recheck permission enforcement with a fresh post-withdraw controlled action before making that broader claim.

Persistence verification occurs outside the timed window and compares public restored consent and categories. That is a useful correctness check. It does not create a missing storage-write timing measurement.

## Instrumentation overhead

The two-arm audit randomizes paired order, retains warmups separately, uses the same URL, and shares minimal native paint observation. It measures added collector cost over that minimum. Full mode includes DOM polling, web-vitals and network collection. The retained audit reports approximately 18 ms extra task time for reference and 34 ms for the source Next baseline, enough that small differences deserve caution.

Those figures are not a correction factor. DOM queries can walk every element while looking through open shadow roots, and the per-frame state copies grow with controlled markers. Load-only baseline overhead does not establish cost during CMP animation, a large DOM, or large action workloads. Repeat the audit on the new content workload and profile. Keep CPU counter endpoints and wall-clock observation endpoints distinct.

## Regression and verification plan

1. Reproduce the stale frame timestamp with an observer scheduler test and one trusted-input browser fixture. Assert every post-input milestone is timestamped at observation time and successful required timings cannot silently disappear.
2. Capture a short keydown followed by reportable keyup and a short pointerdown followed by slower click. Assert correct interaction attribution and rejection of nearby unrelated input.
3. Place consent, persistence, a script marker, LCP, CLS, and Event Timing at either side of the cutoff. Delay observer delivery. Assert bounded metrics and separate late evidence.
4. Cover long tasks crossing the start and end boundaries. Specify whether incomplete boundary tasks remain unavailable or are finalized after cutoff with interval clipping.
5. Open preferences before arming save. Assert no preferences-opening duration is produced for that commit.
6. Add a busy-renderer followup fixture. Report planned versus actual input timing rather than calling a delayed probe an exact offset.
7. Re-run the existing hidden, delayed, hydration, shadow-root, transparent-overlay, animated-dialog, persistence, returning, withdrawal and draft-selection browser regressions serially.
8. Re-run affected benchmark cohorts under a new collector source hash. Retain old envelopes with this audit linked; do not rewrite old measured evidence.

## Definition sources

Retrieved on 2026-09-27: [requestAnimationFrame timestamp semantics](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [PerformanceEventTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming), [LCP](https://web.dev/articles/lcp), and [CLS](https://web.dev/articles/cls). Installed `web-vitals@6.2.2/src/onINP.ts`, `onLCP.ts`, `onCLS.ts`, `lib/LayoutShiftManager.ts`, and `lib/whenIdleOrHidden.ts` establish the actual library behavior used by this repository.

## Implemented collector revision

The following changes now address the confirmed collector defects. Existing envelopes remain historical evidence of the earlier methods.

- DOM milestones use `performance.now()` at inspection. Frame timestamps only measure frame cadence. Required successful action endpoints must also produce valid duration measurements.
- Trusted pointerup, click, and keyup timestamps join the initial pointerdown or keydown for native interaction attribution. A missing initial Event Timing entry no longer hides a reportable later event from the same captured control. Durations extending beyond cutoff remain unavailable.
- Action input schedules the same bounded stop used by load visits. State, milestones and native entry admission share the cutoff. A late action does not turn into a passing timed attempt. A separate post-window correctness snapshot can verify public state and DOM dismissal after the timed check expires. This produces incomplete/observation-window-exceeded, records the inspection timestamp, and leaves the missing timed endpoint unavailable. Server correctness checks use only in-window server rows while retaining later rows as raw evidence.
- Owned native observers supply `bounded native vitals v3` FCP, LCP, and CLS. Their observers stay connected for a 250 ms presentation grace after the cutoff, because Chrome queues paint entries after frame presentation; admission still uses entry occurrence time. The v3 LCP is unavailable as right-censored when the declared primary content is absent, still loading, or has no Element Timing paint at the cutoff. Queue draining uses entry occurrence time. CLS retains maximum session windows, strict one-second/five-second boundaries, and recent-input exclusion. These paint and layout observations end at first page hiding. TTFB uses `bounded navigation timing v2`, the native navigation responseStart at or before cutoff, without a foreground restriction. This protocol does not cover cross-origin frame vitals or a full user visit.
- The web-vitals library still runs for raw diagnostic snapshots. Those snapshots are not finalized metrics. `page.lab-inp` remains unavailable; the corrected primary and followup interaction measurements carry the useful event durations.
- Native LCP attribution records content/banner/other/unavailable, candidate tag, ID, URL and size. Element Timing supplies a separate primary-image render metric when a positive native render time is available.
- Preferences visibility measures an opening action only. Readiness and followup planned/actual timestamps remain explicit diagnostics.
- Network totals become unavailable when the network collector detects target activity outside its verified page-target coverage. Encoded, decoded and transfer byte methods identify their actual sources with a v2 revision.
- Audit paint collectors drain at the snapshot after the same 250 ms presentation grace, even if the timer task has not fired. CPU counter sampling still precedes the browser raw endpoint and must not be treated as the same wall-clock boundary.

Long-task blocking still uses the same interval formula. The collector can include a task crossing the cutoff when the browser exposes its complete entry before stop, then clips its blocking tail to the window. It cannot reconstruct entries that the browser has not created or queued. Event durations similarly depend on native entry availability and quantization. The method documents bounded native observations, not exact reconstruction of all work at the boundary.

Controlled script completion now states its actual count-based contract. It does not establish expected script identity because fixture configuration currently declares counts and categories, not a required list of IDs. Duplicate IDs and forbidden categories remain correctness failures. Successful storage and backend timings still require adapter timestamps after the timed input; restoration is checked independently.

Focused validation passed six unit regressions and three new browser regressions, plus five existing serial browser tests covering paint, fixed load cutoff, hydration, actions, returning visitors and withdrawal. The stale-frame and censored-keydown unit tests both failed against the prior implementation before their fixes. The native long-task boundary browser regression confirms a task crossing the cutoff is drained and its blocking tail clipped. A stop-time merge captures timestamped script, storage and frame markers between the last frame and cutoff while preserving the last pre-cutoff permissions snapshot. Runner typechecking passed. Broader verification and benchmark reruns are recorded by the coordinating task after all collector and fixture edits settle.
