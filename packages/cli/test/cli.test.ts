import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";

import { referenceRunConfig } from "@cookiebench/runner";
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
