import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { referenceRunConfig } from "@cookiebench/runner";
import type * as Runner from "@cookiebench/runner";
import type { ResultEnvelope } from "@cookiebench/schema";
import { Effect } from "effect";
import { beforeEach, expect, test, vi } from "vitest";

import { calibrationArtifact } from "../../schema/test/cpu-calibration-fixture.ts";
import { main } from "../src/cli.ts";

const calls = vi.hoisted(() => ({
  audit: vi.fn(),
  calibrate: vi.fn(),
  run: vi.fn(),
}));
vi.mock("@cookiebench/runner", async (importOriginal) => ({
  ...(await importOriginal<typeof Runner>()),
  runBenchmarkPromise: calls.run,
  runCpuCalibration: calls.calibrate,
  runInstrumentationOverhead: calls.audit,
}));

const config = referenceRunConfig();
const envelope: ResultEnvelope = {
  artifacts: [],
  capabilities: [],
  fixtures: config.fixtures,
  manifest: {
    collectorVersion: "test",
    createdAt: "2026-10-01T00:00:00Z",
    environment: {},
    id: "22222222-2222-4222-8222-222222222222",
    methodologyVersion: "test",
    profile: config.profile,
    seed: 1,
    versions: {},
  },
  samples: [],
  scenarios: config.scenarios,
  schemaVersion: 3,
  status: "incomplete",
};
beforeEach(() => {
  vi.clearAllMocks();
  calls.calibrate.mockReturnValue(Effect.succeed(calibrationArtifact));
  calls.run.mockResolvedValue(envelope);
  calls.audit.mockReturnValue(Effect.succeed(envelope));
});

async function invoke(args: string[]) {
  let stdout = "";
  let stderr = "";
  const code = await main(args, {
    env: {},
    stderr: (text) => {
      stderr += text;
    },
    stdout: (text) => {
      stdout += text;
    },
  });
  return { code, stderr, stdout };
}
async function inputs() {
  const directory = await mkdtemp(
    path.join(tmpdir(), "cookiebench-calibration-cli-")
  );
  const configFile = path.join(directory, "run.json");
  const artifactFile = path.join(directory, "calibration.json");
  const output = path.join(directory, "output.json");
  await writeFile(configFile, JSON.stringify(config));
  await writeFile(artifactFile, JSON.stringify(calibrationArtifact));
  return { artifactFile, configFile, output };
}

test("calibration saves the full artifact without overwriting an existing output", async () => {
  const { configFile, output } = await inputs();
  const args = ["cpu", "calibrate", "--config", configFile, "--output", output];
  const first = await invoke(args);
  expect(first.code).toBe(0);
  expect(JSON.parse(await readFile(output, "utf-8"))).toEqual(
    calibrationArtifact
  );
  const result = await invoke(args);
  expect(result.code).toBe(1);
  expect(JSON.parse(await readFile(output, "utf-8"))).toEqual(
    calibrationArtifact
  );
});

test("device-too-weak outcomes remain saved with an incomplete exit status", async () => {
  const artifact = {
    ...calibrationArtifact,
    results: { low: "DEVICE_TOO_WEAK" as const, mid: 2 },
    samples: calibrationArtifact.samples.filter(
      (sample) => sample.tier !== "low"
    ),
    validation: {
      ...calibrationArtifact.validation,
      low: { eligible: false, reasons: ["Device too weak"], scores: [] },
    },
  };
  calls.calibrate.mockReturnValue(Effect.succeed(artifact));
  const { configFile, output } = await inputs();
  const result = await invoke([
    "cpu",
    "calibrate",
    "--config",
    configFile,
    "--output",
    output,
  ]);
  expect(result.code).toBe(2);
  expect(JSON.parse(await readFile(output, "utf-8"))).toEqual(artifact);
});

test.each([["run"], ["capabilities", "verify"], ["instrumentation", "audit"]])(
  "%s applies one saved artifact before execution",
  async (...command) => {
    const { artifactFile, configFile, output } = await inputs();
    const result = await invoke([
      ...command,
      "--config",
      configFile,
      "--cpu-calibration",
      artifactFile,
      "--output",
      output,
    ]);
    expect(result.code).toBe(2);
    const execution =
      command[0] === "instrumentation" ? calls.audit : calls.run;
    expect(execution).toHaveBeenCalledOnce();
    expect(execution.mock.calls[0]?.[0].profile).toMatchObject({
      cpuCalibration: { artifact: calibrationArtifact, tier: "mid" },
      cpuSlowdown: 2,
    });
    expect(calls.calibrate).not.toHaveBeenCalled();
  }
);

test("explicit low tier selects its rate", async () => {
  const { artifactFile, configFile, output } = await inputs();
  await invoke([
    "run",
    "--config",
    configFile,
    "--cpu-calibration",
    artifactFile,
    "--cpu-tier",
    "low",
    "--output",
    output,
  ]);
  expect(calls.run.mock.calls[0]?.[0].profile.cpuSlowdown).toBe(8);
});

test.each([
  ["run", "--cpu-tier", "low"],
  ["run", "--cpu-calibration", "unused", "--cpu-tier", "high"],
  ["report", "--cpu-calibration", "unused"],
  ["cpu", "calibrate"],
])(
  "invalid calibration arguments fail before execution: %j",
  async (...args) => {
    const result = await invoke(args);
    expect(result.code).toBe(1);
    expect(calls.run).not.toHaveBeenCalled();
    expect(calls.audit).not.toHaveBeenCalled();
    expect(calls.calibrate).not.toHaveBeenCalled();
  }
);
