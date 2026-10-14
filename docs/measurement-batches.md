# Serial measurement batches

Run batches only after fixture sources and collector code settle. Keep browser checks, builds, and other benchmarks off the measurement machine while the batch runs. Each CLI run builds its own production fixture before measuring it.

The batch helper uses the existing CLI and analysis package. It does not replace their eligibility checks. A plan lists explicit fixture configuration paths. Source-build paths must come from the verified, promoted `current.json`, described in [source builds](source-build.md).

```json
{
  "entries": [
    {
      "id": "react-flows",
      "kind": "flows",
      "config": "benchmarks/with-c15t-react/run.json"
    },
    {
      "id": "react-load",
      "kind": "load",
      "config": "benchmarks/with-c15t-react/run.json"
    },
    { "id": "reference-overhead", "kind": "audit" },
    {
      "id": "next-overhead",
      "kind": "audit",
      "config": "benchmarks/with-c15t-nextjs/run.json"
    }
  ],
  "seed": 20260927
}
```

`flows` records one measured attempt per declared fixture/scenario cell with no warmups. `load` selects fresh load, executes three excluded warmup pairs, and records 15 measured pairs. Batches before October 7, 2026 recorded 30; analysis `cookiebench-analysis-v3.4.0` lowers the eligibility floor to match. `audit` uses the same counts with minimal/full observation arms. The production audit configuration must contain one baseline fixture. Reference audit needs no configuration. Ordinary load warmup observations are not retained; their counts remain in the plan and run configuration. Audit warmups are retained separately in raw diagnostics.

Set `iterations` on a `flows` entry to repeat its declared scenarios. For example, a configuration containing accept, reject, and save with `iterations: 10` records ten attempts for each action and fixture, plus ten separate followup probes where configured. Repetitions include every failed or incomplete attempt. They do not retry until success. Flow warmups remain zero, and load and audit protocols retain their fixed counts. Changing the repetition count changes the plan identity and requires a new output directory.

```sh
node packages/cli/src/batch.ts plan.json artifacts/batch --dry-run
node packages/cli/src/batch.ts plan.json artifacts/batch
```

The dry run lists tasks, sample counts, and nominal observation time. Builds, readiness, returning-visitor preparation, action delays, and timeouts add to that estimate. The executor runs every browser command serially. A nonzero measurement exit retains its raw envelope and does not prevent later tasks from running.

Each command has separate stdout and stderr files, exact arguments, timestamps, exit status, signal, and output hashes. Each entry retains its source configuration, configuration hash, envelope hash, report, and comparison commands. Immutable `index-0001.json` checkpoints accumulate completed entries. `index.json` is the final index. Entry summaries include all cells, failures, missing values, capability evidence, and paired differences with eligibility reasons. All load and audit comparisons in one plan form one interval family: every metric of every non-skipped load CMP and audit arm. Its size and identity (`batch:` plus the plan hash) appear in the dry run and index, and each comparison's interval uses the family's Bonferroni-adjusted level. Current reports use manifest, fixture and scenario context for each metric. Raw attempt statuses remain unchanged; available, included, excluded and missing counts explain which values enter a summary. Correctness requires explicit collector completion evidence and is separate from timing availability. Stored primary outcomes identify consent checks before a separate followup is attached. Combined statuses and nested failures are also retained. The 100 ms save probe is a separate diagnostic; it does not change the required-flow gate.

Run the identical command to resume. Completed entries retain their existing bytes. An unfinished entry gets a new attempt directory, preserving its earlier logs and any envelope. A changed plan or completed entry's configuration fails instead of silently mixing inputs. Every recorded envelope must also match the batch's first envelope in collector source hash, browser and package versions, host CPU model, platform and kernel release, and CPU slowdown and calibration. In a calibrated plan, envelopes share the calibration method, validation policy and tier instead of one slowdown; see below. Before a resumed batch launches another entry, it checks the collector source, host and Node version against the recorded envelopes. A mismatch stops the batch without completing the index; start a new output directory. To rerun a terminal failed entry, create a new plan/output directory; the earlier evidence remains intact.

Set `cpuCalibration: { "tier": "mid" }` at the top level of a plan to calibrate on the host that measures each entry. Every measured entry then needs a `config`. Before its run, an entry runs `cpu calibrate` up to five times, keeping every try under `calibration/`, until the plan's tier passes validation. The passing artifact becomes the attempt's `cpu-calibration.json`, and the run uses it with `--cpu-tier`. If no try passes, the batch stops before measuring that entry. Every pair inside an entry runs at one rate, but each entry records its own rate, so compare arms within an entry, not rates across entries. See [CPU calibration](cpu-calibration.md).

Add `--entry <id>` to measure one entry and stop. It never writes `index.json`. Several hosts can each measure different entries into the same relative output path; copy their entry directories into one output directory, then run the plan without `--entry`. Every entry is already recorded, so the batch verifies each one, checks that all envelopes share the batch conditions, and writes the index without launching a browser. Hosts must report the same CPU model, platform and kernel release.

`packages/cli/src/sandbox.ts` does this on Vercel Sandboxes. It needs a clean, pushed commit and Vercel credentials, such as a `VERCEL_OIDC_TOKEN` from `vercel env pull`:

```sh
node --env-file=.env.local packages/cli/src/sandbox.ts plan-desktop.json artifacts/desktop plan-mobile.json artifacts/mobile
```

One sandbox installs the commit and becomes a snapshot. Every pending entry then gets its own sandbox from that snapshot, runs with `--entry`, and is copied back. An entry whose sandbox reports a different host from the snapshot's moves to a new sandbox. An entry that records no result goes to `<output>-failed/` with its log. When every entry is present, the helper completes each batch locally. It deletes every sandbox and the snapshot when it finishes, fails or is interrupted. Run it again to measure only the missing entries.

Set `excludedReason` to record a requested exclusion without launching a run. Set `blockedReason` only for an established fixture configuration problem. A blocked flow entry still records its declared attempts; a blocked load entry records why its 15-pair run was omitted. Ordinary vendor behavior failures do not suppress load cohorts. A missing local domain authorization or bot-exemption setting is a configuration blocker, not evidence that the product's consent behavior is broken.

Load comparisons cover LCP in milliseconds, CLS as a ratio, and separate transferred, encoded-body, and decoded-body bytes. Audits retain task/script/layout duration, LCP, and observed-window comparisons in milliseconds. Action scenarios retain their absolute metrics. The helper creates no baseline action values. Separate load-only instrumentation cohorts compare minimal and full collectors; they do not measure trusted-input or unload-snapshot serialization cost. Report their values separately and do not subtract an overhead correction from CMP timings.

These are local fixture measurements. Compare each CMP with its paired framework baseline. From revision `3.3.0` the c15t fixtures use a live Inth backend, like the competitor fixtures' remote vendor services, and declare `deployment.backend: remote-service`. Earlier c15t revisions used a controlled local test double and declare `controlled-local`; every baseline declares `none`. The server-rendered c15t fixtures and their baselines declare `mode: manifest`. See [c15t backend and policy fetching](c15t-backend.md). Their backend latency and integration topology differ. A stable within-run asset digest permits a dated comparison but does not establish an immutable vendor release. None of these results establishes a public product ranking or field Core Web Vitals.
