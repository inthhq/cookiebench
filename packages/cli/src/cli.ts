import { readFile, writeFile, mkdir } from "node:fs/promises";
import nodePath from "node:path";
import { parseArgs } from "node:util";

import {
  ANALYSIS_VERSION,
  compareResults,
  summarize,
  summarizeCorrectness,
  summarizeLcpAttribution,
  measurementValidity,
} from "@cookiebench/analysis";
import {
  ingestRun,
  importLegacy,
  migrate,
  parseLegacy,
  readRun,
  saveAnalysis,
} from "@cookiebench/db";
import type { RunConfig } from "@cookiebench/runner";
import {
  decodeAnalysis,
  decodeCpuCalibrationArtifact,
  decodeCpuCalibrationTier,
  decodeResult,
} from "@cookiebench/schema";
import type { ResultEnvelope } from "@cookiebench/schema";
import { Effect } from "effect";

export const HELP = `CookieBench v3 · reproducible consent measurements

Usage: cookiebench <command> [options]

  run                      Execute a validated fixture/scenario configuration
  cpu calibrate            Save Chrome's low/mid CPU calibration for this host/browser
  compare                  Compare compatible baseline and candidate envelopes
  report                   Summarize every attempt, including missing measurements
  capabilities verify      Execute consent checks and save their evidence
  instrumentation audit    Compare minimal and full collectors on the same baseline page
  db migrate               Apply ordered PostgreSQL migrations
  db ingest                Retry ingestion from an immutable local envelope
  import legacy            Preserve historical JSON with unknown units

Options:
  --config <file>           Runner configuration JSON for real fixtures
  --cpu-calibration <file>  Reuse a saved CPU calibration artifact
  --cpu-tier <mid|low>      Calibrated CPU target, default mid; requires artifact
  --reference <variant>     Controlled reference fixture, default correct
  --iterations <count>     Measured samples per cell, default 30
  --warmups <count>         Excluded warmups per cell, default 3
  --scenario <id>          Run only one declared scenario, e.g. load
  --seed <integer>          Recorded execution-order seed, default 1
  --output <file>           New local envelope, never overwrite an existing file
  --file <file>             Result envelope for report/db ingest/import legacy
  --baseline <file>         Baseline envelope for compare
  --candidate <file>        Candidate envelope for compare
  --metric <key>            Registered metric, default page.lcp
  --run-id <uuid>           Read report input from PostgreSQL
  --database               Persist after local output, requires DATABASE_URL
  --json                   Machine-readable JSON, also the default
  --help                   Show this help

Examples:
  pnpm cookiebench run --reference correct --iterations 2 --warmups 0 --output artifacts/smoke.json
  pnpm cookiebench run --config benchmarks/example/run.json --output artifacts/run.json
  pnpm cookiebench compare --baseline artifacts/baseline.json --candidate artifacts/cmp.json --metric page.lcp
  pnpm cookiebench report --file artifacts/run.json
  pnpm cookiebench capabilities verify --reference correct --iterations 1 --warmups 0
  pnpm cookiebench db migrate
  pnpm cookiebench db ingest --file artifacts/run.json
  pnpm cookiebench import legacy --file benchmarks/old/results.json --database

Environment:
  DATABASE_URL              Application connection, needed only with database commands
  MIGRATION_DATABASE_URL    Migration connection, required by db migrate
  Load local settings with Node --env-file=.env or export them in your shell.

Exit codes: 0 success; 1 invalid input/storage/runtime error; 2 failed or incomplete
measurement/check/comparison. Local raw output remains available after storage failure.
Reference fixtures validate the instrument; they are not vendor performance results.
`;

const options = {
  baseline: { type: "string" },
  candidate: { type: "string" },
  config: { type: "string" },
  "cpu-calibration": { type: "string" },
  "cpu-tier": { type: "string" },
  database: { type: "boolean" },
  file: { type: "string" },
  help: { short: "h", type: "boolean" },
  iterations: { type: "string" },
  json: { type: "boolean" },
  metric: { type: "string" },
  output: { type: "string" },
  reference: { type: "string" },
  "run-id": { type: "string" },
  scenario: { type: "string" },
  seed: { type: "string" },
  warmups: { type: "string" },
} as const;
export interface CliIo {
  signal?: AbortSignal;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  env: NodeJS.ProcessEnv;
}
const defaultIo: CliIo = {
  env: process.env,
  stderr: (text) => process.stderr.write(text),
  stdout: (text) => process.stdout.write(text),
};
const required = (value: string | undefined, label: string): string => {
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  return value;
};
const integer = (
  value: string | undefined,
  fallback: number,
  min: number,
  name: string
): number => {
  if (value === undefined) {
    return fallback;
  }
  const number = Number(value);
  if (!/^\d+$/u.test(value) || !Number.isSafeInteger(number) || number < min) {
    throw new Error(`${name} must be an integer of at least ${min}.`);
  }
  return number;
};
export function applyRunOverrides(
  config: RunConfig,
  values: {
    iterations?: string;
    warmups?: string;
    seed?: string;
    scenario?: string;
  }
): RunConfig {
  const scenarios =
    values.scenario === undefined
      ? config.scenarios
      : config.scenarios.filter((scenario) => scenario.id === values.scenario);
  if (scenarios.length === 0) {
    throw new Error(`Unknown scenario ${values.scenario}.`);
  }
  return {
    ...config,
    iterations: integer(
      values.iterations,
      config.iterations,
      1,
      "--iterations"
    ),
    scenarios,
    seed: integer(values.seed, config.seed, 0, "--seed"),
    warmups: integer(values.warmups, config.warmups ?? 3, 0, "--warmups"),
  };
}
const readJson = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(nodePath.resolve(path), "utf-8"));
const readEnvelope = async (path: string): Promise<ResultEnvelope> =>
  decodeResult(await readJson(path));
export async function writeEnvelope(path: string, envelope: ResultEnvelope) {
  decodeResult(envelope);
  await mkdir(nodePath.dirname(nodePath.resolve(path)), { recursive: true });
  await writeFile(
    nodePath.resolve(path),
    `${JSON.stringify(envelope, null, 2)}\n`,
    {
      flag: "wx",
    }
  );
}
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

type CommandValues = {
  [K in keyof typeof options]?: (typeof options)[K]["type"] extends "string"
    ? string
    : boolean;
};
// oxlint-disable-next-line complexity -- Command dispatch preserves one local-write-before-storage boundary for both measurement protocols.
async function runCommand(
  command: string,
  values: CommandValues,
  databaseUrl: () => string,
  onSaved: (path: string) => void,
  print: (value: unknown) => void,
  signal?: AbortSignal
): Promise<number> {
  if (values.config && values.reference) {
    throw new Error("Use either --config or --reference.");
  }
  const iterations = integer(
    values.iterations,
    command === "capabilities verify" ? 1 : 30,
    1,
    "--iterations"
  );
  const warmups = integer(
    values.warmups,
    command === "capabilities verify" ? 0 : 3,
    0,
    "--warmups"
  );
  const seed = integer(values.seed, 1, 0, "--seed");
  const runner = await import("@cookiebench/runner");
  const config = values.config ? await readJson(values.config) : undefined;
  const calibration = values["cpu-calibration"]
    ? decodeCpuCalibrationArtifact(await readJson(values["cpu-calibration"]))
    : undefined;
  const tier = decodeCpuCalibrationTier(values["cpu-tier"] ?? "mid");
  const withCalibration = (input: RunConfig): RunConfig =>
    calibration === undefined
      ? input
      : {
          ...input,
          profile: runner.applyCpuCalibration(input.profile, calibration, tier),
        };
  if (command === "instrumentation audit") {
    const auditConfig =
      config === undefined
        ? {
            ...runner.referenceRunConfig({ iterations, variant: "baseline" }),
            scenarios: [
              runner.referenceScenario({
                action: "load",
                expectedBanner: false,
                id: "load",
                observationMs: 1000,
              }),
            ],
            seed,
            warmups,
          }
        : runner.decodeRunConfig(config);
    const envelope = await Effect.runPromise(
      runner.runInstrumentationOverhead(
        withCalibration({
          ...applyRunOverrides(auditConfig, values),
          fixtures: auditConfig.fixtures.filter((fixture) => fixture.baseline),
          scenarios: applyRunOverrides(auditConfig, values).scenarios.map(
            (scenario) => ({ ...scenario, expectedBanner: false })
          ),
        })
      ),
      { signal }
    );
    const output = nodePath.resolve(
      values.output ?? `artifacts/${envelope.manifest.id}.json`
    );
    await writeEnvelope(output, envelope);
    onSaved(output);
    const persistence = values.database
      ? await ingestRun(databaseUrl(), envelope)
      : undefined;
    print({
      output,
      persistence,
      runId: envelope.manifest.id,
      samples: envelope.samples.length,
      status: envelope.status,
    });
    return envelope.status === "passed" ? 0 : 2;
  }
  const envelope =
    config === undefined
      ? await runner.runBenchmarkPromise(
          withCalibration(
            applyRunOverrides(
              {
                ...runner.referenceRunConfig({
                  iterations,
                  variant: values.reference ?? "correct",
                }),
                seed,
                warmups,
              },
              values
            )
          ),
          { signal }
        )
      : await runner.runBenchmarkPromise(
          withCalibration(
            applyRunOverrides(runner.decodeRunConfig(config), values)
          ),
          { signal }
        );
  decodeResult(envelope);
  const output = nodePath.resolve(
    values.output ?? `artifacts/${envelope.manifest.id}.json`
  );
  await writeEnvelope(output, envelope);
  onSaved(output);
  const persistence = values.database
    ? await ingestRun(databaseUrl(), envelope)
    : undefined;
  let status: string = envelope.status;
  if (
    status === "passed" &&
    envelope.capabilities.some((check) => check.status === "failed")
  ) {
    status = "failed";
  }
  if (
    status === "passed" &&
    command === "capabilities verify" &&
    (envelope.capabilities.length === 0 ||
      envelope.capabilities.some(
        (check) => check.status !== "verified" && check.status !== "unsupported"
      ))
  ) {
    status = "incomplete";
  }
  print({
    capabilities: envelope.capabilities,
    failures: envelope.samples.flatMap((sample) =>
      sample.failures.map((failure) => ({
        sampleId: sample.id,
        ...failure,
      }))
    ),
    output,
    persistence,
    runId: envelope.manifest.id,
    samples: envelope.samples.length,
    status,
  });
  return status === "passed" ? 0 : 2;
}

async function reportCommand(
  values: CommandValues,
  databaseUrl: () => string,
  print: (value: unknown) => void
): Promise<number> {
  if (values.file && values["run-id"]) {
    throw new Error("Use either --file or --run-id.");
  }
  const result = values["run-id"]
    ? await readRun(databaseUrl(), values["run-id"])
    : await readEnvelope(required(values.file, "--file"));
  const groups = result.fixtures.flatMap((fixture) =>
    result.scenarios.map((scenario) => {
      const samples = result.samples.filter(
        (sample) =>
          sample.fixtureId === fixture.id && sample.scenarioId === scenario.id
      );
      return {
        baseline: fixture.baseline,
        correctness: summarizeCorrectness(samples),
        deployment: fixture.deployment ?? null,
        failures: samples.flatMap((sample) =>
          sample.failures.map((failure) => ({
            sampleId: sample.id,
            ...failure,
          }))
        ),
        fixtureId: fixture.id,
        lcpAttribution: summarizeLcpAttribution(samples, {
          fixture,
          manifest: result.manifest,
          scenario,
        }),
        metrics: Object.fromEntries(
          [
            ...new Set(
              samples.flatMap((sample) =>
                sample.measurements.map((metric) => metric.key)
              )
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
                validityWarnings: measurementValidity(
                  result.manifest,
                  fixture,
                  key,
                  scenario
                ),
              },
            ])
        ),
        scenarioId: scenario.id,
      };
    })
  );
  print({
    analysisVersion: ANALYSIS_VERSION,
    artifacts: result.artifacts,
    capabilities: result.capabilities,
    groups,
    manifest: result.manifest,
    status: result.status,
  });
  return result.status === "passed" ? 0 : 2;
}

function validateCalibrationOptions(command: string, values: CommandValues) {
  if (values["cpu-tier"] !== undefined && !values["cpu-calibration"]) {
    throw new Error("--cpu-tier requires --cpu-calibration.");
  }
  if (
    values["cpu-tier"] !== undefined &&
    !["mid", "low"].includes(values["cpu-tier"])
  ) {
    throw new Error("--cpu-tier must be mid or low.");
  }
  if (
    values["cpu-calibration"] !== undefined &&
    !["run", "capabilities verify", "instrumentation audit"].includes(command)
  ) {
    throw new Error(
      "--cpu-calibration applies to run, capabilities verify or instrumentation audit."
    );
  }
}

async function calibrateCommand(
  values: CommandValues,
  print: (value: unknown) => void,
  signal?: AbortSignal
): Promise<number> {
  if (values.database || values.reference) {
    throw new Error(
      "cpu calibrate requires --config and writes a local artifact; --database and --reference are unsupported."
    );
  }
  const configFile = required(values.config, "--config");
  const output = nodePath.resolve(required(values.output, "--output"));
  const runner = await import("@cookiebench/runner");
  const config = runner.decodeRunConfig(await readJson(configFile));
  const artifact = decodeCpuCalibrationArtifact(
    await Effect.runPromise(
      runner.runCpuCalibration({ executablePath: config.executablePath }),
      { signal }
    )
  );
  await mkdir(nodePath.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, {
    flag: "wx",
  });
  const passed =
    artifact.validation.low.eligible && artifact.validation.mid.eligible;
  print({
    calibrationId: artifact.id,
    output,
    results: artifact.results,
    status: passed ? "passed" : "incomplete",
    validation: artifact.validation,
  });
  return passed ? 0 : 2;
}

// oxlint-disable-next-line complexity -- Each CLI command has its own dispatch branch and exit status.
export async function main(
  args: readonly string[],
  io: CliIo = defaultIo
): Promise<number> {
  let localOutput: string | undefined;
  const print = (value: unknown) =>
    io.stdout(`${JSON.stringify(value, null, 2)}\n`);
  try {
    const { values, positionals } = parseArgs({
      allowPositionals: true,
      args: [...args],
      options,
      strict: true,
    });
    if (values.help || positionals.length === 0) {
      io.stdout(HELP);
      return 0;
    }
    const command = positionals.join(" ");
    validateCalibrationOptions(command, values);
    const databaseUrl = () => required(io.env.DATABASE_URL, "DATABASE_URL");
    switch (command) {
      case "cpu calibrate": {
        return await calibrateCommand(values, print, io.signal);
      }
      case "db migrate": {
        const applied = await migrate(
          required(io.env.MIGRATION_DATABASE_URL, "MIGRATION_DATABASE_URL")
        );
        print({ migrations: applied, status: "passed" });
        return 0;
      }
      case "db ingest": {
        const result = await ingestRun(
          databaseUrl(),
          await readEnvelope(required(values.file, "--file"))
        );
        print({ status: "passed", ...result });
        return 0;
      }
      case "import legacy": {
        const path = required(values.file, "--file");
        const bytes = await readFile(nodePath.resolve(path));
        const legacy = parseLegacy(bytes, nodePath.resolve(path));
        const persistence = values.database
          ? await importLegacy(databaseUrl(), bytes, nodePath.resolve(path))
          : undefined;
        print({ status: "passed", ...legacy, persistence });
        return 0;
      }
      case "report": {
        return await reportCommand(values, databaseUrl, print);
      }
      case "compare": {
        const baseline = await readEnvelope(
          required(values.baseline, "--baseline")
        );
        const candidate = await readEnvelope(
          required(values.candidate, "--candidate")
        );
        const analysis = compareResults(
          baseline,
          candidate,
          values.metric ?? "page.lcp"
        );
        // Stored analyses must satisfy the current verdict invariants.
        decodeAnalysis(analysis);
        const persistence = values.database
          ? await saveAnalysis(
              databaseUrl(),
              [baseline.manifest.id, candidate.manifest.id],
              ANALYSIS_VERSION,
              analysis
            )
          : undefined;
        const eligible =
          analysis.comparisons.length > 0 &&
          analysis.comparisons.every((comparison) => comparison.eligible);
        print({
          status: eligible ? "passed" : "incomplete",
          ...analysis,
          persistence,
        });
        return eligible ? 0 : 2;
      }
      case "run":
      case "instrumentation audit":
      case "capabilities verify": {
        return await runCommand(
          command,
          values,
          databaseUrl,
          (output) => {
            localOutput = output;
          },
          print,
          io.signal
        );
      }
      default: {
        throw new Error(
          `Unknown command ${JSON.stringify(command)}. Run cookiebench --help.`
        );
      }
    }
  } catch (error) {
    io.stderr(
      `${JSON.stringify({ message: errorMessage(error), status: "error", ...(localOutput ? { output: localOutput, retry: `cookiebench db ingest --file ${JSON.stringify(localOutput)}` } : {}) })}\n`
    );
    return 1;
  }
}
