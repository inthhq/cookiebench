import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";

import { referenceRunConfig } from "@cookiebench/runner";
import type { ResultEnvelope } from "@cookiebench/schema";
import { expect, test } from "vitest";

import { applyRunOverrides, main } from "../src/cli.ts";

async function invoke(args: string[], env: NodeJS.ProcessEnv = {}) {
  let stdout = "";
  let stderr = "";
  const code = await main(args, {
    env,
    stderr: (text) => {
      stderr += text;
    },
    stdout: (text) => {
      stdout += text;
    },
  });
  return { code, stderr, stdout };
}
test("help works without database credentials or browser installation", async () => {
  const result = await invoke(["--help"]);
  expect(result.code).toBe(0);
  expect(result.stdout).toContain("capabilities verify");
  expect(result.stdout).toContain("MIGRATION_DATABASE_URL");
});
test("invalid commands and flags return machine-readable failure", async () => {
  await Promise.all(
    [["results"], ["run", "--unexpected"], ["run", "--iterations", "0"]].map(
      async (args) => {
        const result = await invoke(args);
        expect(result.code).toBe(1);
        expect(JSON.parse(result.stderr).status).toBe("error");
      }
    )
  );
});
test("migration requires explicit migration credentials", async () => {
  const result = await invoke(["db", "migrate"], {
    DATABASE_URL: "postgres://should-not-be-used",
  });
  expect(result.code).toBe(1);
  expect(result.stderr).toContain("MIGRATION_DATABASE_URL");
});
test("legacy preview reconciles historical samples without changing source", async () => {
  const directory = await mkdtemp(nodePath.join(tmpdir(), "cookiebench-cli-"));
  const path = nodePath.join(directory, "legacy.json");
  const source = '{"app":"old","results":[{},{}],"scores":{"total":100}}';
  await writeFile(path, source);
  const result = await invoke(["import", "legacy", "--file", path]);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({
    comparisonEligible: false,
    methodologyVersion: "legacy",
    sampleCount: 2,
    units: "unknown-ambiguous",
  });
  expect(await readFile(path, "utf-8")).toBe(source);
});
test("report rejects old shapes instead of inventing v3 measurements", async () => {
  const directory = await mkdtemp(nodePath.join(tmpdir(), "cookiebench-cli-"));
  const path = nodePath.join(directory, "legacy.json");
  await writeFile(path, '{"results":[]}');
  const result = await invoke(["report", "--file", path]);
  expect(result.code).toBe(1);
});

test("config settings survive unless the corresponding flag is present", () => {
  const config = {
    ...referenceRunConfig(),
    iterations: 7,
    seed: 42,
    warmups: 2,
  };
  expect(applyRunOverrides(config, {})).toEqual(config);
  expect(applyRunOverrides(config, { iterations: "9" })).toEqual({
    ...config,
    iterations: 9,
  });
  expect(applyRunOverrides(config, { seed: "0", warmups: "0" })).toEqual({
    ...config,
    seed: 0,
    warmups: 0,
  });
});

test("scenario selection rejects unknown IDs and preserves the fixture pair", () => {
  const config = referenceRunConfig();
  const id = config.scenarios[0]?.id;
  expect(applyRunOverrides(config, { scenario: id }).fixtures).toEqual(
    config.fixtures
  );
  expect(() => applyRunOverrides(config, { scenario: "unknown" })).toThrow(
    "Unknown scenario"
  );
});

test("compare records a declared comparison family and requires both family flags", async () => {
  const config = referenceRunConfig();
  const [fixture] = config.fixtures;
  const runId = "22222222-2222-4222-8222-222222222222";
  const envelope: ResultEnvelope = {
    artifacts: [],
    capabilities: [],
    fixtures: [
      { ...fixture, baseline: true, id: "baseline" },
      { ...fixture, baseline: false, id: "candidate" },
    ],
    manifest: {
      collectorVersion: "test",
      createdAt: "2026-09-27T00:00:00Z",
      environment: {},
      id: runId,
      methodologyVersion: "test",
      profile: config.profile,
      seed: 1,
      versions: {},
    },
    samples: ["baseline", "candidate"].map((fixtureId, index) => ({
      attempt: 0,
      failures: [],
      fixtureId,
      id: `11111111-1111-4111-8111-00000000000${index}`,
      iteration: 0,
      measurements: [
        {
          key: "page.lcp",
          method: "test",
          status: "measured",
          unit: "ms",
          value: 12 + index,
        },
      ],
      pairId: "pair-0",
      runId,
      scenarioId: "load",
      status: "passed",
    })),
    scenarios: [{ ...config.scenarios[0], action: "load", id: "load" }],
    schemaVersion: 3,
    status: "passed",
  };
  const directory = await mkdtemp(nodePath.join(tmpdir(), "cookiebench-cli-"));
  const path = nodePath.join(directory, "paired.json");
  await writeFile(path, JSON.stringify(envelope));
  const compare = ["compare", "--baseline", path, "--candidate", path];
  const unlabeled = await invoke([...compare, "--family-size", "6"]);
  expect(unlabeled.code).toBe(1);
  expect(unlabeled.stderr).toContain("--family and --family-size");
  const result = await invoke([
    ...compare,
    "--family",
    "batch:test",
    "--family-size",
    "6",
  ]);
  expect(result.code).toBe(2);
  expect(JSON.parse(result.stdout).multiplicity).toEqual({
    comparisons: 6,
    family: "batch:test",
    familyLevel: 0.95,
    intervalLevel: 1 - 0.05 / 6,
    method: "bonferroni",
  });
});
