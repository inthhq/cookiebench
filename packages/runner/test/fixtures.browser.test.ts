import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { decodeRunConfig, runBenchmarkPromise } from "../src/index.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const cells = [
  ["script-tag", "with-c15t-script", "run.json"],
  ["headless script-tag", "with-c15t-script", "run-headless.json"],
  ["react", "with-c15t-react", "run.json"],
  ["nextjs", "with-c15t-nextjs", "run.json"],
  ["vue", "with-c15t-vue", "run.json"],
  ["nuxt", "with-c15t-nuxt", "run.json"],
  ["astro", "with-c15t-astro", "run.json"],
  ["tanstack-start", "with-c15t-tanstack-start", "run.json"],
] as const;

const builtDirectories = new Set<string>();

for (const [framework, directory, file] of cells) {
  test(`${framework} production fixture enforces the declared consent flow`, async () => {
    test.setTimeout(180_000);
    const config = decodeRunConfig(
      JSON.parse(
        await readFile(path.join(root, "benchmarks", directory, file), "utf-8")
      )
    );
    const scenarios = config.scenarios.filter((scenario) =>
      ["load", "accept", "reject"].includes(scenario.id)
    );
    expect(scenarios.map((scenario) => scenario.id).toSorted()).toEqual([
      "accept",
      "load",
      "reject",
    ]);
    if (framework === "astro") {
      const returning = config.scenarios.find(
        (scenario) => scenario.id === "returning-accepted"
      );
      if (!returning) {
        throw new Error(
          "Astro must declare its returning-visitor regression scenario."
        );
      }
      scenarios.push(returning);
    }
    const result = await runBenchmarkPromise({
      ...config,
      fixtures: config.fixtures.map((fixture) => {
        if (!fixture.server) {
          return fixture;
        }
        const { build, ...server } = fixture.server;
        const production = { ...server, cwd: path.resolve(root, server.cwd) };
        return {
          ...fixture,
          server:
            builtDirectories.has(directory) || !build
              ? production
              : { ...production, build },
        };
      }),
      iterations: 1,
      scenarios,
      warmups: 0,
    });
    const output = test.info().outputPath("result.json");
    await writeFile(output, JSON.stringify(result, null, 2));
    await test.info().attach(`${framework}-result`, {
      contentType: "application/json",
      path: output,
    });
    builtDirectories.add(directory);
    expect(result.samples).toHaveLength(
      config.fixtures.length * scenarios.length
    );
    for (const sample of result.samples) {
      const fixture = config.fixtures.find(
        (entry) => entry.id === sample.fixtureId
      );
      expect(fixture).toBeDefined();
      if (
        framework === "astro" &&
        !fixture?.baseline &&
        sample.scenarioId === "returning-accepted"
      ) {
        // Published alpha.3 still shows the banner for a returning accepted visitor.
        expect(sample.status).toBe("failed");
        expect(sample.failures.map((failure) => failure.code)).toContain(
          "unexpected-banner"
        );
      } else {
        expect(
          sample.failures,
          `${sample.fixtureId}/${sample.scenarioId}`
        ).toEqual([]);
        expect(sample.status).toBe("passed");
        if (
          framework === "astro" &&
          !fixture?.baseline &&
          ["accept", "reject"].includes(sample.scenarioId)
        ) {
          for (const key of ["action.consent-effective", "action.dismissed"]) {
            expect(
              sample.measurements.find((measurement) => measurement.key === key)
                ?.status,
              `${sample.fixtureId}/${sample.scenarioId}/${key}`
            ).toBe("measured");
          }
        }
      }
      expect(sample.diagnostics?.browserErrors).toEqual([]);
    }
  });
}
