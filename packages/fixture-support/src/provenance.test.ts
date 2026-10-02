import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { FixtureConfig, ScenarioConfig } from "@cookiebench/schema";
import { afterEach, expect, it } from "vitest";

import { createFixture, createScenario } from "./config.ts";
import { finalizeFixture, sourceHash } from "./provenance.ts";

const finalize = (
  fixture: FixtureConfig,
  scenarios: readonly ScenarioConfig[]
) =>
  finalizeFixture(
    fixture,
    scenarios,
    "sha512-test-artifact",
    "https://registry.npmjs.org/example.tgz"
  );

const temporary: string[] = [];
afterEach(() => {
  for (const directory of temporary.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});
function fixtureDirectory() {
  const directory = mkdtempSync(path.join(tmpdir(), "cookiebench-provenance-"));
  temporary.push(directory);
  writeFileSync(
    path.join(directory, "main.ts"),
    'export const selector = "#accept";'
  );
  return directory;
}
it("changes the source hash for implementation changes", () => {
  const directory = fixtureDirectory();
  const before = sourceHash(directory);
  writeFileSync(
    path.join(directory, "main.ts"),
    'export const selector = "#reject";'
  );
  expect(sourceHash(directory)).not.toBe(before);
});
it("ignores generated payloads while retaining authored public assets", () => {
  const directory = fixtureDirectory();
  mkdirSync(path.join(directory, "public/vendor"), { recursive: true });
  const before = sourceHash(directory);
  writeFileSync(
    path.join(directory, "public/vendor/c15t.js"),
    "generated payload"
  );
  expect(sourceHash(directory)).toBe(before);
  writeFileSync(
    path.join(directory, "public/style.css"),
    "body { color: black }"
  );
  expect(sourceHash(directory)).not.toBe(before);
});
it("includes adapters and scenario protocol in the configuration hash", () => {
  const directory = fixtureDirectory();
  const fixture = createFixture("vue", "3.5.43", 4313, false, directory);
  const scenarios = [createScenario("load")];
  expect(finalize(fixture, scenarios).configurationHash).toBe(
    finalize(fixture, scenarios).configurationHash
  );
  expect(
    finalize(
      { ...fixture, adapter: { ...fixture.adapter, accept: "#other" } },
      scenarios
    ).configurationHash
  ).not.toBe(finalize(fixture, scenarios).configurationHash);
  expect(
    finalize(fixture, [{ ...createScenario("load"), observationMs: 3000 }])
      .configurationHash
  ).not.toBe(finalize(fixture, scenarios).configurationHash);
});
