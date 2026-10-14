import { spawn } from "node:child_process";
import type * as ChildProcessModule from "node:child_process";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { cpus, platform, release, tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import {
  currentCollectorSourceHash,
  referenceRunConfig,
} from "@cookiebench/runner";
import type { ResultEnvelope, Sample } from "@cookiebench/schema";
import { expect, test, vi } from "vitest";

import { calibrationArtifact } from "../../schema/test/cpu-calibration-fixture.ts";
import {
  decodePlan,
  describePlan,
  runBatch,
  runCommand,
  summarizeEnvelope,
  verifySavedBatchEntry,
} from "../src/batch.ts";

vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal<typeof ChildProcessModule>();
  return { ...original, spawn: vi.fn(original.spawn) };
});

function result(): ResultEnvelope {
  const config = referenceRunConfig();
  const fixture = { ...config.fixtures[0], baseline: false };
  const [scenario] = config.scenarios;
  const sample: Sample = {
    attempt: 0,
    failures: [],
    fixtureId: fixture.id,
    id: "11111111-1111-4111-8111-111111111111",
    iteration: 0,
    measurements: [
      {
        key: "page.lcp",
        method: "test",
        status: "measured",
        unit: "ms",
        value: 12,
      },
    ],
    runId: "22222222-2222-4222-8222-222222222222",
    scenarioId: "load",
    status: "passed",
  };
  return {
    artifacts: [],
    capabilities: [],
    fixtures: [fixture],
    manifest: {
      collectorVersion: "test",
      createdAt: "2026-09-27T00:00:00Z",
      environment: {},
      id: sample.runId,
      methodologyVersion: "test",
      profile: config.profile,
      seed: 1,
      versions: {},
    },
    samples: [
      sample,
      {
        ...sample,
        failures: [{ code: "page-blocked", message: "Probe blocked" }],
        id: "33333333-3333-4333-8333-333333333333",
        measurements: [
          {
            key: "page.lcp",
            method: "test",
            reason: "No entry",
            status: "unavailable",
            unit: "ms",
          },
        ],
        scenarioId: "save-page-probe-100ms",
        status: "failed",
      },
    ],
    scenarios: [
      { ...scenario, id: "load" },
      {
        ...scenario,
        action: "save",
        followupOffsetMs: 100,
        id: "save-page-probe-100ms",
      },
    ],
    schemaVersion: 3,
    status: "failed",
  };
}

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/** Replace CLI child processes; `respond` returns the exit code. */
async function withMockedCli<T>(
  respond: (argv: string[]) => Promise<number>,
  body: (commands: string[][]) => Promise<T>
): Promise<T> {
  const original =
    await vi.importActual<typeof ChildProcessModule>("node:child_process");
  const commands: string[][] = [];
  vi.mocked(spawn).mockImplementation((_command, args) => {
    const argv = args as string[];
    commands.push(argv);
    // eslint-disable-next-line unicorn/prefer-event-target -- Match the Node ChildProcess event contract.
    const child = Object.assign(new EventEmitter(), { kill: () => true });
    const settle = async () => {
      await delay(0);
      child.emit("close", await respond(argv), null);
    };
    // eslint-disable-next-line promise/prefer-await-to-callbacks -- The mock returns its child before delivering process events.
    settle().catch((error) => {
      child.emit("error", error);
    });
    return child as ReturnType<typeof spawn>;
  });
  try {
    return await body(commands);
  } finally {
    vi.mocked(spawn).mockImplementation(original.spawn);
  }
}

/** A run envelope recorded under the given collector and host conditions. */
async function writeRunEnvelope(
  argv: string[],
  environment: Record<string, string>
) {
  const envelope = result();
  await writeFile(
    argv[argv.indexOf("--output") + 1],
    JSON.stringify({
      ...envelope,
      manifest: {
        ...envelope.manifest,
        environment,
        versions: { browser: "140.0", node: process.version },
      },
    })
  );
}

test("resume rejects changed envelope bytes and forged result identity before reusing evidence", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cookiebench-evidence-"));
  const entryDirectory = path.join(directory, "sample");
  const attemptDirectory = path.join(entryDirectory, "attempt-001");
  await mkdir(path.join(attemptDirectory, "run"), { recursive: true });
  const entry = { id: "sample", kind: "flows" as const, reference: "correct" };
  const envelopeFile = path.join(attemptDirectory, "envelope.json");
  const envelope = result();
  const bytes = JSON.stringify(envelope);
  await writeFile(envelopeFile, bytes);
  await writeFile(path.join(attemptDirectory, "run", "stdout.json"), "output");
  await writeFile(path.join(attemptDirectory, "run", "stderr.log"), "");
  const record = {
    ...entry,
    configSha256: null,
    details: { manifest: envelope.manifest },
    envelopeFile,
    envelopeSha256: hash(bytes),
    execution: {
      command: [
        "node",
        "packages/cli/src/index.ts",
        "run",
        "--reference",
        "correct",
        "--iterations",
        "1",
        "--warmups",
        "0",
        "--seed",
        "1",
        "--output",
        envelopeFile,
      ],
      stderrSha256: hash(""),
      stdoutSha256: hash("output"),
    },
    status: "recorded",
  };
  await writeFile(
    path.join(attemptDirectory, "result.json"),
    JSON.stringify(record)
  );
  await expect(
    verifySavedBatchEntry(entry, 1, entryDirectory, record)
  ).resolves.toBeUndefined();
  await expect(
    verifySavedBatchEntry(
      { ...entry, iterations: 10 },
      1,
      entryDirectory,
      record
    )
  ).rejects.toThrow("result identity changed");
  await writeFile(envelopeFile, `${bytes}\n`);
  await expect(
    verifySavedBatchEntry(entry, 1, entryDirectory, record)
  ).rejects.toThrow("envelope hash changed");
  await writeFile(envelopeFile, bytes);
  await expect(
    verifySavedBatchEntry(entry, 1, entryDirectory, {
      ...record,
      reference: "other",
    })
  ).rejects.toThrow("result identity changed");
  await expect(
    verifySavedBatchEntry(entry, 1, entryDirectory, {
      ...record,
      envelopeSha256: hash("other"),
    })
  ).rejects.toThrow("result checkpoint changed");
  await expect(
    verifySavedBatchEntry(entry, 2, entryDirectory, record)
  ).rejects.toThrow("command identity changed");
  await writeFile(path.join(attemptDirectory, "run", "stdout.json"), "changed");
  await expect(
    verifySavedBatchEntry(entry, 1, entryDirectory, record)
  ).rejects.toThrow("execution log changed");
});

test("calibrated plans need a valid tier and a config for every measured entry", () => {
  const entries = [
    { config: "run.json", id: "measured", kind: "load" },
    { excludedReason: "User request", id: "skipped", kind: "load" },
  ];
  expect(
    decodePlan({ cpuCalibration: { tier: "mid" }, entries, seed: 1 })
      .cpuCalibration
  ).toEqual({ tier: "mid" });
  expect(() =>
    decodePlan({ cpuCalibration: { tier: "high" }, entries, seed: 1 })
  ).toThrow();
  expect(() =>
    decodePlan({
      cpuCalibration: { tier: "mid" },
      entries: [{ id: "reference", kind: "flows", reference: "correct" }],
      seed: 1,
    })
  ).toThrow("needs a config for every measured entry: reference");
});

/** A calibrated batch whose host passes the mid tier on the listed tries. */
async function calibratedBatch(entryIds: string[]) {
  const directory = await mkdtemp(path.join(tmpdir(), "cookiebench-cpu-"));
  const config = path.join(directory, "run.json");
  const plan = path.join(directory, "plan.json");
  await writeFile(config, JSON.stringify(referenceRunConfig()));
  await writeFile(
    plan,
    JSON.stringify({
      cpuCalibration: { tier: "mid" },
      entries: entryIds.map((id) => ({ config, id, kind: "flows" })),
      seed: 1,
    })
  );
  return { output: path.join(directory, "output"), plan };
}

/** Mock calibrations that fail mid validation until `passOn`, then runs at the saved rate. */
function calibratedHost(passOn: number, rate = 2.4) {
  let tries = 0;
  return async (argv: string[]) => {
    if (argv[2] === "calibrate") {
      tries += 1;
      const eligible = tries >= passOn;
      // Scores 40% off the mid target fail validation.
      const scores = eligible ? [1000, 1001, 999] : [1400, 1401, 1399];
      await writeFile(
        argv[argv.indexOf("--output") + 1],
        JSON.stringify({
          ...calibrationArtifact,
          id: `11111111-1111-4111-8111-${String(tries).padStart(12, "0")}`,
          results: { ...calibrationArtifact.results, mid: rate },
          samples: [
            ...calibrationArtifact.samples.filter(
              (sample) => sample.tier !== "mid"
            ),
            ...scores.map((score) => ({
              phase: "tier-validation",
              rate,
              score,
              tier: "mid",
            })),
          ],
          validation: {
            ...calibrationArtifact.validation,
            mid: { eligible, reasons: eligible ? [] : ["off target"], scores },
          },
        })
      );
      return eligible ? 0 : 2;
    }
    if (argv[1] === "run") {
      const artifact = JSON.parse(
        await readFile(argv[argv.indexOf("--cpu-calibration") + 1], "utf-8")
      );
      const envelope = result();
      const tier = argv[argv.indexOf("--cpu-tier") + 1];
      await writeFile(
        argv[argv.indexOf("--output") + 1],
        JSON.stringify({
          ...envelope,
          manifest: {
            ...envelope.manifest,
            profile: {
              ...envelope.manifest.profile,
              cpuCalibration: { artifact, tier },
              cpuSlowdown: artifact.results[tier],
            },
          },
        })
      );
    }
    return 0;
  };
}

test("a calibrated entry retries calibration on its host and runs at the passing tier", async () => {
  const batch = await calibratedBatch(["phone"]);
  const attempt = path.join(batch.output, "phone", "attempt-001");
  await withMockedCli(calibratedHost(2), async (commands) => {
    expect(await runBatch(batch.plan, batch.output)).toMatchObject({
      complete: true,
      measurementConditions: {
        cpuCalibration: { method: "chrome-devtools", tier: "mid" },
        cpuSlowdown: null,
      },
    });
    expect(commands.map((args) => args.slice(1, 3))).toEqual([
      ["cpu", "calibrate"],
      ["cpu", "calibrate"],
      ["run", "--config"],
      ["report", "--file"],
    ]);
    const run = commands.find((args) => args[1] === "run") ?? [];
    expect(run.slice(run.indexOf("--cpu-calibration"), -2)).toEqual([
      "--cpu-calibration",
      path.relative(process.cwd(), path.join(attempt, "cpu-calibration.json")),
      "--cpu-tier",
      "mid",
    ]);
  });
  expect(await readFile(path.join(attempt, "cpu-calibration.json"))).toEqual(
    await readFile(path.join(attempt, "calibration", "try-02.json"))
  );
  // Resume rebuilds the calibrated command and launches nothing.
  await withMockedCli(calibratedHost(1), async (commands) => {
    await expect(runBatch(batch.plan, batch.output)).resolves.toMatchObject({
      complete: true,
    });
    expect(commands).toEqual([]);
  });
});

test("an entry whose host never passes calibration stops before measuring", async () => {
  const batch = await calibratedBatch(["phone"]);
  await withMockedCli(calibratedHost(99), async (commands) => {
    await expect(runBatch(batch.plan, batch.output)).rejects.toThrow(
      /did not pass the mid tier after 5 tries/u
    );
    expect(commands.filter((args) => args[1] === "run")).toEqual([]);
  });
  expect(await readdir(path.join(batch.output, "phone"))).toEqual([
    "attempt-001",
  ]);
});

test("single-entry runs on separate hosts merge into one calibrated batch", async () => {
  const batch = await calibratedBatch(["first", "second"]);
  // Each host calibrates to its own rate.
  await withMockedCli(calibratedHost(1, 2.2), async () => {
    expect(
      await runBatch(batch.plan, batch.output, { entry: "second" })
    ).toMatchObject({ complete: false, results: [{ id: "second" }] });
  });
  expect(await readdir(batch.output)).not.toContain("index.json");
  await withMockedCli(calibratedHost(1, 2.6), async (commands) => {
    await runBatch(batch.plan, batch.output, { entry: "first" });
    expect(commands.map((args) => args[1])).toEqual(["cpu", "run", "report"]);
  });
  await withMockedCli(calibratedHost(1), async (commands) => {
    const index = await runBatch(batch.plan, batch.output);
    expect(commands).toEqual([]);
    expect(index).toMatchObject({ complete: true });
    expect(index.results.map((entry) => entry.id)).toEqual(["first", "second"]);
  });
  await expect(
    runBatch(batch.plan, batch.output, { entry: "missing" })
  ).rejects.toThrow("no entry missing");
});

test("early diagnostic failure stays separate from required flows and keeps missing metrics", () => {
  const summary = summarizeEnvelope(result());
  expect(summary.requiredFlowsPassed).toBe(true);
  expect(summary.diagnosticFlowsPassed).toBe(false);
  expect(summary.freshLoadPassed).toBe(true);
  expect(summary.cells[1].metrics["page.lcp"]).toMatchObject({
    failed: 1,
    median: null,
    missing: 1,
  });
});

test("a missing required cell cannot pass and failed observations cannot become successful zeroes", () => {
  const original = result();
  const envelope: ResultEnvelope = {
    ...original,
    scenarios: [
      ...original.scenarios,
      { ...original.scenarios[0], action: "reject", id: "reject" },
    ],
  };
  expect(summarizeEnvelope(envelope).requiredFlowsPassed).toBe(false);
  const failed = {
    ...envelope.samples[0],
    failures: [{ code: "missing-banner", message: "Absent" }],
    status: "failed" as const,
  };
  const summary = summarizeEnvelope({ ...envelope, samples: [failed] });
  expect(summary.freshLoadPassed).toBe(false);
  expect(summary.cells[0].metrics["page.lcp"]).toMatchObject({
    failed: 1,
    measured: 0,
    median: null,
  });
});

test("plans reject unsafe and duplicate output names", () => {
  expect(() =>
    decodePlan({ entries: [{ id: "../escape", kind: "audit" }], seed: 1 })
  ).toThrow();
  expect(() =>
    decodePlan({
      entries: [
        { id: "same", kind: "audit" },
        { id: "same", kind: "audit" },
      ],
      seed: 1,
    })
  ).toThrow();
  expect(
    decodePlan({
      entries: [
        { excludedReason: "User request", id: "cookie-yes", kind: "flows" },
      ],
      seed: 1,
    }).entries
  ).toHaveLength(1);
});

test("plans reject coercible IDs, empty inputs, and nontext skip reasons", () => {
  for (const entry of [
    { id: 123, kind: "audit" },
    { config: " ", id: "empty", kind: "audit" },
    { blockedReason: true, id: "blocked", kind: "audit" },
    { excludedReason: 1, id: "excluded", kind: "audit" },
  ]) {
    expect(() => decodePlan({ entries: [entry], seed: 1 })).toThrow();
  }
});

test("flow repetition counts reject invalid values and fixed load protocol overrides", () => {
  for (const iterations of [0, -1, 1.5, "10", 10_001]) {
    expect(() =>
      decodePlan({
        entries: [
          { id: "repeated", iterations, kind: "flows", reference: "correct" },
        ],
        seed: 1,
      })
    ).toThrow();
  }
  expect(() =>
    decodePlan({
      entries: [
        { id: "load", iterations: 10, kind: "load", reference: "correct" },
      ],
      seed: 1,
    })
  ).toThrow("Only flow entries accept iterations");
});

test("dry run includes every repeated action and separately repeated followup", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cookiebench-plan-"));
  const configFile = path.join(directory, "actions.json");
  const planFile = path.join(directory, "plan.json");
  const config = referenceRunConfig();
  await writeFile(
    configFile,
    JSON.stringify({
      ...config,
      fixtures: [
        { ...config.fixtures[0], baseline: true, id: "baseline" },
        { ...config.fixtures[0], baseline: false, id: "candidate" },
      ],
      scenarios: ["accept", "reject", "save"].map((action) => ({
        ...config.scenarios[0],
        action,
        id: action,
        observationMs: 1500,
      })),
    })
  );
  await writeFile(
    planFile,
    JSON.stringify({
      entries: [
        { config: configFile, id: "repeated", iterations: 10, kind: "flows" },
      ],
      seed: 1,
    })
  );
  const described = await describePlan(planFile);
  expect(described.entries[0]).toMatchObject({
    additionalFollowupProbes: 30,
    measuredAttempts: 60,
    nominalObservationSeconds: 135,
    warmupAttempts: 0,
  });
});

test("a batch declares every load and audit comparison in its plan as one interval family", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cookiebench-family-"));
  const configFile = path.join(directory, "load.json");
  const planFile = path.join(directory, "plan.json");
  const config = referenceRunConfig();
  await writeFile(
    configFile,
    JSON.stringify({
      ...config,
      fixtures: ["baseline", "first", "second"].map((id) => ({
        ...config.fixtures[0],
        baseline: id === "baseline",
        id,
      })),
    })
  );
  const plan = JSON.stringify({
    entries: [
      { config: configFile, id: "two-cmps", kind: "load" },
      { id: "overhead", kind: "audit" },
      { id: "flows", kind: "flows", reference: "correct" },
      { excludedReason: "Not requested", id: "skipped", kind: "load" },
    ],
    seed: 1,
  });
  await writeFile(planFile, plan);
  // Two CMPs x six load metrics, plus one audit arm x five audit metrics.
  const described = await describePlan(planFile);
  expect(described.comparisonFamily).toEqual({
    comparisons: 17,
    id: `batch:${hash(plan)}`,
  });
});

test("batch compare commands carry the declared family", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cookiebench-family-"));
  const plan = path.join(directory, "plan.json");
  const bytes = JSON.stringify({
    entries: [{ id: "load", kind: "load", reference: "correct" }],
    seed: 1,
  });
  await writeFile(plan, bytes);
  await withMockedCli(
    async (argv) => {
      if (argv.includes("run")) {
        await writeRunEnvelope(argv, {});
      }
      return 0;
    },
    async (commands) => {
      const index = await runBatch(plan, path.join(directory, "output"));
      const family = { comparisons: 6, id: `batch:${hash(bytes)}` };
      expect(index.comparisonFamily).toEqual(family);
      const compare = commands.find((args) => args.includes("compare"));
      expect(compare?.slice(-4)).toEqual([
        "--family",
        family.id,
        "--family-size",
        "6",
      ]);
    }
  );
});

test("a batch stops when an entry was measured under different collector conditions", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cookiebench-mixed-"));
  const plan = path.join(directory, "plan.json");
  const output = path.join(directory, "output");
  await writeFile(
    plan,
    JSON.stringify({
      entries: [
        { id: "before", kind: "flows", reference: "correct" },
        { id: "after", kind: "flows", reference: "correct" },
      ],
      seed: 1,
    })
  );
  let runs = 0;
  await withMockedCli(
    async (argv) => {
      if (argv.includes("run")) {
        runs += 1;
        // The collector source changes between the two entries.
        await writeRunEnvelope(argv, {
          collectorSourceHash: (runs === 1 ? "a" : "b").repeat(64),
        });
      }
      return 0;
    },
    async () => {
      await expect(runBatch(plan, output)).rejects.toThrow(
        /after differs from before in collectorSourceHash/u
      );
    }
  );
  expect(await readdir(output)).not.toContain("index.json");
  expect(await readdir(path.join(output, "after"))).toEqual(["attempt-001"]);
});

test("resume checks the current collector and host before launching another entry", async () => {
  const current = {
    collectorSourceHash: await currentCollectorSourceHash(),
    cpu: cpus()[0]?.model ?? "unavailable",
    platform: platform(),
    release: release(),
  };
  const interruptedBatch = async (environment: Record<string, string>) => {
    const directory = await mkdtemp(path.join(tmpdir(), "cookiebench-env-"));
    const plan = path.join(directory, "plan.json");
    await writeFile(
      plan,
      JSON.stringify({
        entries: [
          { id: "first", kind: "flows", reference: "correct" },
          { id: "second", kind: "flows", reference: "correct" },
        ],
        seed: 1,
      })
    );
    let runs = 0;
    const output = path.join(directory, "output");
    await withMockedCli(
      async (argv) => {
        if (!argv.includes("run")) {
          return 0;
        }
        runs += 1;
        if (runs === 1) {
          await writeRunEnvelope(argv, environment);
          return 0;
        }
        process.emit("SIGTERM");
        return 143;
      },
      async () => {
        expect(await runBatch(plan, output)).toMatchObject({
          complete: false,
        });
      }
    );
    return { output, plan };
  };
  const resume = (batch: { output: string; plan: string }) =>
    withMockedCli(
      async (argv) => {
        if (argv.includes("run")) {
          await writeRunEnvelope(argv, current);
        }
        return 0;
      },
      async (commands) => {
        const index = await runBatch(batch.plan, batch.output).catch(
          (error: unknown) => error
        );
        return { commands, index };
      }
    );
  const changed = await resume(
    await interruptedBatch({ ...current, collectorSourceHash: "c".repeat(64) })
  );
  expect(String(changed.index)).toMatch(
    /different measurement conditions: first recorded collectorSourceHash/u
  );
  expect(changed.commands).toEqual([]);
  const unchanged = await resume(await interruptedBatch(current));
  expect(unchanged.index).toMatchObject({
    complete: true,
    measurementConditions: { collectorSourceHash: current.collectorSourceHash },
  });
  expect(unchanged.commands.map((args) => args[1])).toEqual(["run", "report"]);
});

test("failed CLI execution retains exact command, exit, stderr, and immutable logs", async () => {
  const directory = path.join(
    await mkdtemp(path.join(tmpdir(), "cookiebench-batch-")),
    "failed"
  );
  const execution = await runCommand(directory, ["invalid-command"]);
  expect(execution.exitCode).toBe(1);
  expect(execution.command.at(-1)).toBe("invalid-command");
  expect(await readFile(path.join(directory, "stderr.log"), "utf-8")).toContain(
    "Unknown command"
  );
  expect(execution.stderrSha256).toMatch(/^[a-f0-9]{64}$/u);
  await expect(runCommand(directory, ["--help"])).rejects.toThrow();
});

test("batch resume retains a failed execution and rejects changed inputs", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "cookiebench-batch-resume-")
  );
  const config = path.join(directory, "invalid.json");
  const plan = path.join(directory, "plan.json");
  const output = path.join(directory, "output");
  await writeFile(config, "{}");
  await writeFile(
    plan,
    JSON.stringify({
      entries: [{ config, id: "invalid", iterations: 10, kind: "flows" }],
      seed: 1,
    })
  );
  const first = await runBatch(plan, output);
  expect(first.results[0]).toMatchObject({
    envelopeSha256: null,
    execution: { exitCode: 1 },
    status: "execution-error",
  });
  // Published evidence names neither the checkout nor the local Node binary.
  const recorded = JSON.stringify(first.results);
  expect(recorded).not.toContain(process.cwd());
  expect(recorded).not.toContain(process.execPath);
  const execution = first.results[0].execution as { command: string[] };
  const iterationsIndex = execution.command.indexOf("--iterations");
  expect(execution.command[iterationsIndex + 1]).toBe("10");
  const checkpoint = await readFile(
    path.join(output, "index-0001.json"),
    "utf-8"
  );
  const second = await runBatch(plan, output);
  expect(second.results).toEqual(first.results);
  expect(await readFile(path.join(output, "index-0001.json"), "utf-8")).toBe(
    checkpoint
  );
  expect(await readdir(path.join(output, "invalid"))).toEqual([
    "attempt-001",
    "result.json",
  ]);
  await writeFile(config, '{"changed":true}');
  await expect(runBatch(plan, output)).rejects.toThrow("config changed");
  await writeFile(plan, JSON.stringify({ entries: [], seed: 2 }));
  await expect(runBatch(plan, output)).rejects.toThrow("changed plan");
});

test("an interrupt during reporting stops later browser commands and preserves the unfinished attempt", async () => {
  const original =
    await vi.importActual<typeof ChildProcessModule>("node:child_process");
  const directory = await mkdtemp(
    path.join(tmpdir(), "cookiebench-batch-signal-")
  );
  const plan = path.join(directory, "plan.json");
  const output = path.join(directory, "output");
  await writeFile(
    plan,
    JSON.stringify({
      entries: [
        { id: "first", kind: "flows", reference: "correct" },
        { id: "second", kind: "flows", reference: "correct" },
      ],
      seed: 1,
    })
  );
  const commands: string[][] = [];
  const listenerCount = process.listenerCount("SIGTERM");
  vi.mocked(spawn).mockImplementation((_command, args) => {
    const argv = args as string[];
    commands.push(argv);
    // eslint-disable-next-line unicorn/prefer-event-target -- Match the Node ChildProcess event contract.
    const child = Object.assign(new EventEmitter(), { kill: () => true });
    const respond = async () => {
      await delay(0);
      if (argv.includes("run")) {
        await writeFile(
          argv[argv.indexOf("--output") + 1],
          JSON.stringify(result())
        );
      }
      if (argv.includes("report")) {
        process.emit("SIGTERM");
      }
      child.emit("close", argv.includes("report") ? 143 : 0, null);
    };
    // eslint-disable-next-line promise/prefer-await-to-callbacks -- The mock returns its child before delivering process events.
    respond().catch((error) => {
      child.emit("error", error);
    });
    return child as ReturnType<typeof spawn>;
  });
  try {
    const index = await runBatch(plan, output);
    expect(index).toMatchObject({ complete: false, interruptionExitCode: 143 });
    expect(commands.map((args) => args[1])).toEqual(["run", "report"]);
    expect(await readdir(path.join(output, "first"))).toEqual(["attempt-001"]);
    expect(
      await readFile(
        path.join(output, "first", "attempt-001", "envelope.json"),
        "utf-8"
      )
    ).toContain("followupOffsetMs");
    expect(process.listenerCount("SIGTERM")).toBe(listenerCount);
  } finally {
    vi.mocked(spawn).mockImplementation(original.spawn);
  }
});
