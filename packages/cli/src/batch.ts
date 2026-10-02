/* eslint-disable no-await-in-loop -- Browser measurements and immutable checkpoints must execute serially. */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, open, readFile, readdir, writeFile } from "node:fs/promises";
import { cpus, platform, release } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

import {
  compareResults,
  summarize,
  summarizeCorrectness,
  summarizeLcpAttribution,
  measurementValidity,
} from "@cookiebench/analysis";
import { decodeResult } from "@cookiebench/schema";
import type {
  FixtureConfig,
  ResultEnvelope,
  ScenarioConfig,
} from "@cookiebench/schema";
import { Schema } from "effect";

interface BatchEntry {
  id: string;
  config?: string;
  reference?: string;
  kind: "flows" | "load" | "audit";
  iterations?: number;
  excludedReason?: string;
  blockedReason?: string;
}
interface BatchPlan {
  seed: number;
  entries: BatchEntry[];
}

interface BatchState {
  interruptionExitCode: number;
}

function optionalText(value: unknown) {
  return (
    value === undefined ||
    (typeof value === "string" && value.trim().length > 0)
  );
}

const loadMetrics = [
  "page.lcp",
  "page.primary-content-paint",
  "page.cls",
  "initial.transfer",
  "initial.encoded-body",
  "initial.decoded-body",
];
const auditMetrics = [
  "custom.audit.task-duration",
  "custom.audit.script-duration",
  "custom.audit.layout-duration",
  "custom.audit.lcp",
  "custom.audit.observed-window",
];
const digest = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const FlowIterations = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThan(0),
  Schema.isLessThanOrEqualTo(10_000)
);
const decodeFlowIterations = Schema.decodeUnknownSync(FlowIterations);

const skippedReason = (entry: BatchEntry) =>
  entry.excludedReason ??
  (entry.kind === "load" ? entry.blockedReason : undefined);

/**
 * Every paired comparison a plan can produce forms one Bonferroni family, so a
 * batch's directional conclusions share one 95% family-wise level. Flows have
 * no paired comparisons. Unreadable configurations count one candidate; their
 * runs fail before producing comparisons.
 */
async function comparisonFamily(plan: BatchPlan, planSha256: string) {
  let comparisons = 0;
  for (const entry of plan.entries) {
    if (entry.kind === "flows" || skippedReason(entry)) {
      continue;
    }
    let candidates = 1;
    if (entry.kind === "load" && entry.config) {
      try {
        const config = JSON.parse(await readFile(entry.config, "utf-8"));
        candidates = Array.isArray(config.fixtures)
          ? config.fixtures.filter(
              (fixture: FixtureConfig) => fixture && !fixture.baseline
            ).length
          : 1;
      } catch {
        candidates = 1;
      }
    }
    comparisons +=
      candidates * (entry.kind === "load" ? loadMetrics : auditMetrics).length;
  }
  return { comparisons, id: `batch:${planSha256}` };
}

function iterationsFor(entry: BatchEntry) {
  return entry.kind === "flows" ? (entry.iterations ?? 1) : 30;
}

function passed(selected: { attempts: number; passed: number }[]) {
  return (
    selected.length > 0 &&
    selected.every((cell) => cell.attempts > 0 && cell.passed === cell.attempts)
  );
}

export function summarizeEnvelope(result: ResultEnvelope) {
  const cells = result.fixtures.flatMap((fixture) =>
    result.scenarios.map((scenario) => {
      const samples = result.samples.filter(
        (sample) =>
          sample.fixtureId === fixture.id && sample.scenarioId === scenario.id
      );
      return {
        attempts: samples.length,
        baseline: fixture.baseline,
        correctness: summarizeCorrectness(samples),
        diagnostic: scenario.id === "save-page-probe-100ms",
        failed: samples.filter((sample) => sample.status === "failed").length,
        failures: samples.flatMap((sample) =>
          sample.failures.map((failure) => ({
            sampleId: sample.id,
            ...failure,
          }))
        ),
        fixtureId: fixture.id,
        followupProbes: samples.filter(
          (sample) => sample.diagnostics?.followupProbe !== undefined
        ).length,
        incomplete: samples.filter((sample) => sample.status === "incomplete")
          .length,
        lcpAttribution: summarizeLcpAttribution(samples, {
          fixture,
          manifest: result.manifest,
          scenario,
        }),
        metrics: Object.fromEntries(
          [
            ...new Set(
              samples.flatMap((sample) => sample.measurements.map((m) => m.key))
            ),
          ]
            .toSorted()
            .map((key) => [
              key,
              {
                ...summarize(samples, key, {
                  fixture,
                  manifest: result.manifest,
                  scenario,
                }),
                unit:
                  samples
                    .flatMap((sample) => sample.measurements)
                    .find((measurement) => measurement.key === key)?.unit ??
                  null,
                validityWarnings: measurementValidity(
                  result.manifest,
                  fixture,
                  key,
                  scenario
                ),
              },
            ])
        ),
        passed: samples.filter((sample) => sample.status === "passed").length,
        scenarioId: scenario.id,
      };
    })
  );
  const required = cells.filter((cell) => !cell.baseline && !cell.diagnostic);
  const diagnostics = cells.filter((cell) => !cell.baseline && cell.diagnostic);
  return {
    capabilities: result.capabilities,
    cells,
    correctness: summarizeCorrectness(
      result.samples.filter((sample) =>
        result.fixtures.some(
          (fixture) => fixture.id === sample.fixtureId && !fixture.baseline
        )
      )
    ),
    diagnosticFlowsPassed: diagnostics.length ? passed(diagnostics) : null,
    fixtures: result.fixtures,
    freshLoadPassed: passed(cells.filter((cell) => cell.scenarioId === "load")),
    manifest: result.manifest,
    requiredFlowsPassed: passed(required),
    status: result.status,
  };
}

// eslint-disable-next-line complexity -- Validate every plan field before starting a browser process.
export function decodePlan(value: unknown): BatchPlan {
  if (!value || typeof value !== "object") {
    throw new Error("Expected a batch plan.");
  }
  const plan = value as BatchPlan;
  if (
    !Number.isSafeInteger(plan.seed) ||
    plan.seed < 0 ||
    !Array.isArray(plan.entries)
  ) {
    throw new Error(
      "A batch plan needs a nonnegative integer seed and entries."
    );
  }
  const ids = new Set<string>();
  for (const entry of plan.entries) {
    if (
      !entry ||
      typeof entry.id !== "string" ||
      !/^[a-z0-9][a-z0-9-]*$/u.test(entry.id) ||
      ids.has(entry.id)
    ) {
      throw new Error("Entry IDs must be unique safe directory names.");
    }
    if (
      !["flows", "load", "audit"].includes(entry.kind) ||
      ![
        entry.config,
        entry.reference,
        entry.blockedReason,
        entry.excludedReason,
      ].every(optionalText) ||
      (entry.config && entry.reference)
    ) {
      throw new Error(`Invalid entry: ${entry.id}`);
    }
    if (
      !entry.config &&
      !entry.reference &&
      entry.kind !== "audit" &&
      !entry.excludedReason
    ) {
      throw new Error(`Missing fixture input: ${entry.id}`);
    }
    if (entry.iterations !== undefined) {
      if (entry.kind !== "flows") {
        throw new Error(`Only flow entries accept iterations: ${entry.id}`);
      }
      decodeFlowIterations(entry.iterations);
    }
    ids.add(entry.id);
  }
  return plan;
}

export async function describePlan(planFile: string) {
  const bytes = await readFile(planFile);
  const plan = decodePlan(JSON.parse(bytes.toString("utf-8")));
  const entries = [];
  for (const entry of plan.entries) {
    const excluded = Boolean(
      entry.excludedReason || (entry.kind === "load" && entry.blockedReason)
    );
    let cells = 2;
    let observationMs = 1500;
    let additionalFollowupProbes = 0;
    if (entry.config && !excluded) {
      const config = JSON.parse(await readFile(entry.config, "utf-8"));
      if (entry.kind === "flows") {
        cells = config.fixtures.length * config.scenarios.length;
        additionalFollowupProbes =
          config.fixtures.filter(
            (fixture: FixtureConfig) =>
              !fixture.baseline && fixture.adapter.pageAction
          ).length *
          config.scenarios.filter((scenario: ScenarioConfig) =>
            ["accept", "reject", "save", "withdraw"].includes(scenario.action)
          ).length *
          iterationsFor(entry);
      }
      observationMs = Math.max(
        ...config.scenarios.map(
          (scenario: { observationMs: number }) => scenario.observationMs
        )
      );
    }
    const measuredAttempts = excluded ? 0 : cells * iterationsFor(entry);
    const warmupAttempts = excluded || entry.kind === "flows" ? 0 : 6;
    entries.push({
      ...entry,
      additionalFollowupProbes,
      measuredAttempts,
      nominalObservationSeconds:
        ((measuredAttempts + warmupAttempts + additionalFollowupProbes) *
          observationMs) /
        1000,
      warmupAttempts,
    });
  }
  return {
    additionalFollowupProbes: entries.reduce(
      (sum, entry) => sum + entry.additionalFollowupProbes,
      0
    ),
    comparisonFamily: await comparisonFamily(plan, digest(bytes)),
    entries,
    measuredAttempts: entries.reduce(
      (sum, entry) => sum + entry.measuredAttempts,
      0
    ),
    nominalObservationSeconds: entries.reduce(
      (sum, entry) => sum + entry.nominalObservationSeconds,
      0
    ),
    seed: plan.seed,
    warmupAttempts: entries.reduce(
      (sum, entry) => sum + entry.warmupAttempts,
      0
    ),
  };
}

/** Host fields in the form the runner records them. */
const hostConditions = () => ({
  cpu: cpus()[0]?.model ?? "unavailable",
  platform: platform(),
  release: release(),
});

/**
 * Conditions every envelope in one batch must share, so paired results from
 * different entries stay comparable. Fixture-specific fields such as the
 * device profile and lockfile are covered by each entry's configuration hash.
 */
function measurementConditions(envelope: ResultEnvelope) {
  const { environment, profile, versions } = envelope.manifest;
  return {
    collectorSourceHash: environment.collectorSourceHash ?? null,
    cpuCalibration: profile.cpuCalibration
      ? {
          id: profile.cpuCalibration.artifact.id,
          tier: profile.cpuCalibration.tier,
        }
      : null,
    cpuSlowdown: profile.cpuSlowdown,
    host: {
      cpu: environment.cpu ?? null,
      platform: environment.platform ?? null,
      release: environment.release ?? null,
    },
    versions,
  };
}
interface BatchConditions {
  entryId: string;
  conditions: ReturnType<typeof measurementConditions>;
}

function conditionDifferences(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>
) {
  return Object.keys(expected)
    .filter((key) => !isDeepStrictEqual(expected[key], actual[key]))
    .map(
      (key) =>
        `${key} (${JSON.stringify(expected[key])} != ${JSON.stringify(actual[key])})`
    );
}

/** The first recorded envelope sets the batch conditions; every later one must match. */
function requireBatchConditions(
  reference: BatchConditions | undefined,
  entryId: string,
  envelope: ResultEnvelope
): BatchConditions {
  const conditions = measurementConditions(envelope);
  if (!reference) {
    return { conditions, entryId };
  }
  const differences = conditionDifferences(reference.conditions, conditions);
  if (differences.length > 0) {
    throw new Error(
      `Cannot mix measurement conditions in one batch: ${entryId} differs from ${reference.entryId} in ${differences.join("; ")}. Start a new output directory.`
    );
  }
  return reference;
}

/** Before a resumed batch launches a browser, check what the host can report without one. */
async function requireCurrentConditions(reference: BatchConditions) {
  const runner = await import("@cookiebench/runner");
  const { conditions } = reference;
  const differences = conditionDifferences(
    {
      collectorSourceHash: conditions.collectorSourceHash,
      host: conditions.host,
      node: conditions.versions.node ?? null,
    },
    {
      collectorSourceHash: await runner.currentCollectorSourceHash(),
      host: hostConditions(),
      node: process.version,
    }
  );
  if (differences.length > 0) {
    throw new Error(
      `Cannot resume a batch recorded under different measurement conditions: ${reference.entryId} recorded ${differences.join("; ")} (recorded != current). Start a new output directory.`
    );
  }
}

async function readEnvelope(file: string) {
  return decodeResult(JSON.parse(await readFile(file, "utf-8")));
}

async function save(file: string, value: unknown) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

async function fileHash(file: string) {
  try {
    return digest(await readFile(file));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function batchArguments(entry: BatchEntry, seed: number, envelopeFile: string) {
  let input: string[] = [];
  if (entry.config) {
    input = ["--config", path.resolve(entry.config)];
  } else if (entry.reference) {
    input = ["--reference", entry.reference];
  }
  return [
    ...(entry.kind === "audit" ? ["instrumentation", "audit"] : ["run"]),
    ...input,
    ...(entry.kind === "flows" ? [] : ["--scenario", "load"]),
    "--iterations",
    String(iterationsFor(entry)),
    "--warmups",
    entry.kind === "flows" ? "0" : "3",
    "--seed",
    String(seed),
    "--output",
    envelopeFile,
  ];
}

const decodeSavedEntry = Schema.decodeUnknownSync(
  Schema.Struct({
    blockedReason: Schema.optionalKey(Schema.String),
    config: Schema.optionalKey(Schema.String),
    configSha256: Schema.optionalKey(Schema.NullOr(Schema.String)),
    details: Schema.optionalKey(
      Schema.Struct({
        manifest: Schema.Struct({ id: Schema.String }),
      })
    ),
    envelopeFile: Schema.optionalKey(Schema.String),
    envelopeSha256: Schema.optionalKey(Schema.NullOr(Schema.String)),
    excludedReason: Schema.optionalKey(Schema.String),
    execution: Schema.optionalKey(
      Schema.Struct({
        command: Schema.Array(Schema.String),
        stderrSha256: Schema.NullOr(Schema.String),
        stdoutSha256: Schema.NullOr(Schema.String),
      })
    ),
    id: Schema.String,
    iterations: Schema.optionalKey(FlowIterations),
    kind: Schema.Literals(["flows", "load", "audit"]),
    reason: Schema.optionalKey(Schema.String),
    reference: Schema.optionalKey(Schema.String),
    status: Schema.String,
  })
);

async function verifySavedEvidence(
  entry: BatchEntry,
  seed: number,
  entryDirectory: string,
  input: unknown,
  saved: ReturnType<typeof decodeSavedEntry>
) {
  if (
    saved.configSha256 !== (entry.config ? await fileHash(entry.config) : null)
  ) {
    throw new Error(`Cannot resume after config changed: ${entry.id}`);
  }
  if (!saved.envelopeFile || !saved.execution) {
    throw new Error(`Cannot resume without recorded execution: ${entry.id}`);
  }
  const attemptDirectory = path.dirname(saved.envelopeFile);
  if (
    path.dirname(attemptDirectory) !== entryDirectory ||
    !/^attempt-\d+$/u.test(path.basename(attemptDirectory)) ||
    path.basename(saved.envelopeFile) !== "envelope.json"
  ) {
    throw new Error(
      `Cannot resume with evidence outside the entry attempt: ${entry.id}`
    );
  }
  const attemptRecord = JSON.parse(
    await readFile(path.join(attemptDirectory, "result.json"), "utf-8")
  );
  if (!isDeepStrictEqual(input, attemptRecord)) {
    throw new Error(
      `Cannot resume after result checkpoint changed: ${entry.id}`
    );
  }
  const expectedCommand = [
    process.execPath,
    "packages/cli/src/index.ts",
    ...batchArguments(entry, seed, saved.envelopeFile),
  ];
  if (!isDeepStrictEqual(saved.execution.command, expectedCommand)) {
    throw new Error(
      `Cannot resume after command identity changed: ${entry.id}`
    );
  }
  if (
    entry.config &&
    (await fileHash(path.join(attemptDirectory, "config.json"))) !==
      saved.configSha256
  ) {
    throw new Error(`Cannot resume after saved config changed: ${entry.id}`);
  }
  if ((await fileHash(saved.envelopeFile)) !== saved.envelopeSha256) {
    throw new Error(`Cannot resume after envelope hash changed: ${entry.id}`);
  }
  for (const [name, hash] of [
    ["stdout.json", saved.execution.stdoutSha256],
    ["stderr.log", saved.execution.stderrSha256],
  ] as const) {
    if ((await fileHash(path.join(attemptDirectory, "run", name))) !== hash) {
      throw new Error(
        `Cannot resume after execution log changed: ${entry.id} (${name})`
      );
    }
  }
  if (saved.envelopeSha256) {
    const envelope = decodeResult(
      JSON.parse(await readFile(saved.envelopeFile, "utf-8"))
    );
    if (
      saved.details?.manifest.id !== envelope.manifest.id ||
      envelope.manifest.seed !== seed
    ) {
      throw new Error(
        `Cannot resume after envelope identity changed: ${entry.id}`
      );
    }
  }
}

/** Reuse only a record whose plan identity, duplicate checkpoint, and evidence still agree. */
export async function verifySavedBatchEntry(
  entry: BatchEntry,
  seed: number,
  entryDirectory: string,
  input: unknown
) {
  const saved = decodeSavedEntry(input);
  for (const key of [
    "id",
    "kind",
    "iterations",
    "config",
    "reference",
    "blockedReason",
    "excludedReason",
  ] as const) {
    if (saved[key] !== entry[key]) {
      throw new Error(
        `Cannot resume after result identity changed: ${entry.id} (${key})`
      );
    }
  }
  const skipped = skippedReason(entry);
  if (skipped) {
    const status = entry.excludedReason ? "excluded" : "configuration-blocked";
    if (
      saved.reason !== skipped ||
      saved.status !== status ||
      saved.execution ||
      saved.envelopeFile
    ) {
      throw new Error(
        `Cannot resume after excluded result changed: ${entry.id}`
      );
    }
    return;
  }
  await verifySavedEvidence(entry, seed, entryDirectory, input, saved);
}

export async function runCommand(directory: string, args: string[]) {
  const command = [process.execPath, "packages/cli/src/index.ts", ...args];
  await mkdir(directory);
  const startedAt = new Date().toISOString();
  await save(path.join(directory, "started.json"), {
    command,
    cwd: process.cwd(),
    startedAt,
  });
  const stdout = await open(path.join(directory, "stdout.json"), "wx");
  let outcome: {
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    error?: string;
  };
  try {
    const stderr = await open(path.join(directory, "stderr.log"), "wx");
    try {
      // eslint-disable-next-line promise/avoid-new -- Bridge the child process close event and preserve its signal.
      outcome = await new Promise((resolve) => {
        const child = spawn(command[0], command.slice(1), {
          stdio: ["ignore", stdout.fd, stderr.fd],
        });
        let spawnError: string | undefined;
        const interrupt = () => child.kill("SIGINT");
        const terminate = () => child.kill("SIGTERM");
        process.once("SIGINT", interrupt);
        process.once("SIGTERM", terminate);
        child.once("error", (error) => {
          spawnError = error.message;
        });
        child.once("close", (exitCode, signal) => {
          process.removeListener("SIGINT", interrupt);
          process.removeListener("SIGTERM", terminate);
          resolve({
            exitCode,
            signal,
            ...(spawnError ? { error: spawnError } : {}),
          });
        });
      });
    } finally {
      await stderr.close();
    }
  } finally {
    await stdout.close();
  }
  const record = {
    command,
    cwd: process.cwd(),
    endedAt: new Date().toISOString(),
    startedAt,
    ...outcome,
    stderrSha256: await fileHash(path.join(directory, "stderr.log")),
    stdoutSha256: await fileHash(path.join(directory, "stdout.json")),
  };
  await save(path.join(directory, "completed.json"), record);
  return record;
}

async function trackedCommand(
  state: BatchState,
  directory: string,
  args: string[]
) {
  const record = await runCommand(directory, args);
  if (record.signal || record.exitCode === 130 || record.exitCode === 143) {
    state.interruptionExitCode =
      record.exitCode === 143 || record.signal === "SIGTERM" ? 143 : 130;
  }
  return record;
}

// eslint-disable-next-line complexity -- Each recorded terminal state and interruption must keep its own recovery path.
async function executeBatch(
  planFile: string,
  outputDirectory: string,
  state: BatchState
) {
  const bytes = await readFile(planFile);
  const plan = decodePlan(JSON.parse(bytes.toString("utf-8")));
  const output = path.resolve(outputDirectory);
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output, { recursive: true });
  const savedPlan = await fileHash(path.join(output, "plan.json"));
  if (savedPlan && savedPlan !== digest(bytes)) {
    throw new Error("Cannot resume with a changed plan.");
  }
  if (!savedPlan) {
    await writeFile(path.join(output, "plan.json"), bytes, { flag: "wx" });
  }
  const family = await comparisonFamily(plan, digest(bytes));
  const results: Record<string, unknown>[] = [];
  const outputFiles = await readdir(output);
  let checkpoint = outputFiles.filter((name) =>
    name.startsWith("index-")
  ).length;
  const checkpointResults = async () => {
    checkpoint += 1;
    await save(
      path.join(output, `index-${String(checkpoint).padStart(4, "0")}.json`),
      {
        comparisonFamily: family,
        planSha256: digest(bytes),
        results,
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
      }
    );
  };
  let conditions: BatchConditions | undefined;
  let launched = false;
  for (const entry of plan.entries) {
    if (state.interruptionExitCode) {
      break;
    }
    const entryDirectory = path.join(output, entry.id);
    const resultFile = path.join(entryDirectory, "result.json");
    if (await fileHash(resultFile)) {
      const previous = JSON.parse(await readFile(resultFile, "utf-8"));
      await verifySavedBatchEntry(entry, plan.seed, entryDirectory, previous);
      if (previous.envelopeSha256) {
        conditions = requireBatchConditions(
          conditions,
          entry.id,
          await readEnvelope(previous.envelopeFile)
        );
      }
      results.push(previous);
      continue;
    }
    await mkdir(entryDirectory, { recursive: true });
    const skipped = skippedReason(entry);
    if (skipped) {
      const record = {
        ...entry,
        reason: skipped,
        status: entry.excludedReason ? "excluded" : "configuration-blocked",
      };
      await save(resultFile, record);
      results.push(record);
      await checkpointResults();
      continue;
    }
    const entryFiles = await readdir(entryDirectory);
    const attempts = entryFiles.filter((name) =>
      name.startsWith("attempt-")
    ).length;
    const directory = path.join(
      entryDirectory,
      `attempt-${String(attempts + 1).padStart(3, "0")}`
    );
    await mkdir(directory);
    const configSha256 = entry.config ? await fileHash(entry.config) : null;
    if (entry.config && configSha256) {
      await writeFile(
        path.join(directory, "config.json"),
        await readFile(entry.config),
        { flag: "wx" }
      );
    }
    if (conditions && !launched) {
      await requireCurrentConditions(conditions);
    }
    launched = true;
    const envelopeFile = path.join(directory, "envelope.json");
    const args = batchArguments(entry, plan.seed, envelopeFile);
    process.stdout.write(`${new Date().toISOString()} ${entry.id}\n`);
    const execution = await trackedCommand(
      state,
      path.join(directory, "run"),
      args
    );
    const envelopeSha256 = await fileHash(envelopeFile);
    let details: unknown;
    let decodeError: string | undefined;
    const analyses = [];
    let envelope: ResultEnvelope | undefined;
    try {
      envelope = envelopeSha256 ? await readEnvelope(envelopeFile) : undefined;
    } catch (error) {
      decodeError = error instanceof Error ? error.message : String(error);
    }
    if (envelope) {
      // A mismatch stops the batch before this entry's result is recorded.
      conditions = requireBatchConditions(conditions, entry.id, envelope);
    }
    try {
      if (envelope) {
        const summary = summarizeEnvelope(envelope);
        details = summary;
        if (!state.interruptionExitCode) {
          await trackedCommand(state, path.join(directory, "report"), [
            "report",
            "--file",
            envelopeFile,
          ]);
        }
        const metrics = { audit: auditMetrics, flows: [], load: loadMetrics }[
          entry.kind
        ];
        for (const metric of metrics) {
          if (state.interruptionExitCode) {
            break;
          }
          const comparison = await trackedCommand(
            state,
            path.join(directory, `compare-${metric}`),
            [
              "compare",
              "--baseline",
              envelopeFile,
              "--candidate",
              envelopeFile,
              "--metric",
              metric,
              "--family",
              family.id,
              "--family-size",
              String(family.comparisons),
            ]
          );
          analyses.push({
            ...compareResults(envelope, envelope, metric, { family }),
            execution: comparison,
          });
        }
      }
    } catch (error) {
      decodeError = error instanceof Error ? error.message : String(error);
    }
    let status = "recorded";
    if (!envelopeSha256 || decodeError) {
      status = "execution-error";
    }
    if (entry.blockedReason) {
      status = "configuration-blocked";
    }
    const record = {
      ...entry,
      analyses,
      configSha256,
      details,
      envelopeFile,
      envelopeSha256,
      execution,
      ...(decodeError ? { error: decodeError } : {}),
      status,
    };
    await save(path.join(directory, "result.json"), record);
    const interrupted = state.interruptionExitCode !== 0;
    if (!interrupted) {
      await save(resultFile, record);
    }
    results.push(record);
    await checkpointResults();
    if (interrupted) {
      break;
    }
  }
  const index = {
    comparisonFamily: family,
    complete:
      results.length === plan.entries.length && !state.interruptionExitCode,
    completedAt: new Date().toISOString(),
    interruptionExitCode: state.interruptionExitCode,
    measurementConditions: conditions?.conditions ?? null,
    planSha256: digest(bytes),
    results,
    schemaVersion: 1,
  };
  if (index.complete && !(await fileHash(path.join(output, "index.json")))) {
    await save(path.join(output, "index.json"), index);
  }
  return index;
}

export async function runBatch(planFile: string, outputDirectory: string) {
  const state: BatchState = { interruptionExitCode: 0 };
  const interrupt = () => {
    state.interruptionExitCode = 130;
  };
  const terminate = () => {
    state.interruptionExitCode = 143;
  };
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  try {
    return await executeBatch(planFile, outputDirectory, state);
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", terminate);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const [planFile, output, mode] = process.argv.slice(2);
  if (!planFile || !output) {
    process.stderr.write(
      "Usage: node packages/cli/src/batch.ts PLAN.json OUTPUT_DIRECTORY [--dry-run]\n"
    );
    process.exitCode = 1;
  } else {
    try {
      if (mode === "--dry-run") {
        process.stdout.write(
          `${JSON.stringify(await describePlan(planFile), null, 2)}\n`
        );
      } else {
        const result = await runBatch(planFile, output);
        process.exitCode = result.interruptionExitCode;
      }
    } catch (error) {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`
      );
      process.exitCode = 1;
    }
  }
}
