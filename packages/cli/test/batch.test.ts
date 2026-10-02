import { spawn } from "node:child_process";
import type * as ChildProcessModule from "node:child_process";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { referenceRunConfig } from "@cookiebench/runner";
import type { ResultEnvelope, Sample } from "@cookiebench/schema";
import { expect, test, vi } from "vitest";

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
        process.execPath,
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
