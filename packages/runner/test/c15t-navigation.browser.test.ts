import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Sample } from "@cookiebench/schema";
import { expect, test } from "@playwright/test";

import { decodeRunConfig, runBenchmarkPromise } from "../src/index.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));

for (const [directory, profile] of [
  ["with-c15t-script", "mobile"],
  ["with-c15t-react", "mobile"],
] as const) {
  // oxlint-disable-next-line complexity -- Keep primary, followup, restoration and navigation assertions beside each retained visit.
  test(`${directory} ${profile} restores choices and verifies default reload on withdrawal`, async () => {
    test.setTimeout(240_000);
    const config = decodeRunConfig(
      JSON.parse(
        await readFile(
          path.join(root, "benchmarks", directory, "run.json"),
          "utf-8"
        )
      )
    );
    const profileConfig =
      profile === "mobile"
        ? JSON.parse(
            await readFile(
              path.join(root, "benchmarks/profiles/mobile.json"),
              "utf-8"
            )
          )
        : config.profile;
    const result = await runBenchmarkPromise(
      decodeRunConfig({
        ...config,
        fixtures: config.fixtures
          .filter((fixture) => !fixture.baseline)
          .map((fixture) => ({
            ...fixture,
            server: fixture.server
              ? {
                  ...fixture.server,
                  cwd: path.resolve(root, fixture.server.cwd),
                }
              : undefined,
          })),
        iterations: 1,
        profile: profileConfig,
        scenarios: config.scenarios.filter((scenario) =>
          ["accept", "save", "withdraw"].includes(scenario.id)
        ),
        warmups: 0,
      })
    );
    const output = test.info().outputPath("result.json");
    await writeFile(output, JSON.stringify(result, null, 2));
    await test.info().attach(`${directory}-${profile}-navigation`, {
      contentType: "application/json",
      path: output,
    });
    expect(result.samples).toHaveLength(3);
    for (const sample of result.samples) {
      const followup = sample.diagnostics?.followupProbe as Sample | undefined;
      expect(
        followup,
        `${sample.scenarioId} must retain its separate followup visit`
      ).toBeDefined();
      if (!followup) {
        throw new Error("Missing followup visit");
      }
      const primaryOutcome = sample.diagnostics?.primaryOutcome as
        | Pick<Sample, "status" | "failures">
        | undefined;
      expect(primaryOutcome).toBeDefined();
      expect(primaryOutcome?.failures).toEqual(
        sample.failures.filter(
          (failure) => !failure.code.startsWith("followup:")
        )
      );
      if (sample.scenarioId === "withdraw") {
        expect(primaryOutcome?.status).toBe("incomplete");
        expect(primaryOutcome?.failures.map((failure) => failure.code)).toEqual(
          ["required-measurement-unavailable"]
        );
      }
      for (const visit of [sample, followup]) {
        expect(visit.diagnostics?.browserErrors).toEqual([]);
        expect(
          visit.diagnostics?.persistenceVerified,
          `${sample.scenarioId} restoration`
        ).toBe(true);
        expect(visit.diagnostics?.restoration).toMatchObject({
          matches: true,
          ready: true,
        });
        const permittedFailures = [
          "required-measurement-unavailable",
          "followup:required-measurement-unavailable",
        ];
        if (
          directory === "with-c15t-script" &&
          sample.scenarioId === "withdraw"
        ) {
          permittedFailures.push("followup:page-unresponsive");
          if (visit === followup) {
            permittedFailures.push("page-unresponsive");
          }
        }
        expect(
          visit.failures.filter(
            (failure) => !permittedFailures.includes(failure.code)
          ),
          JSON.stringify(visit.failures)
        ).toEqual([]);
        if (
          visit.failures.some((failure) => failure.code === "page-unresponsive")
        ) {
          // Keep the real fixed-offset input failure if the new page has not installed its handler.
          expect(
            visit.diagnostics?.postNavigationObservations
          ).not.toHaveProperty("state.pageActionAt");
          expect(visit.diagnostics?.followupTiming).toMatchObject({
            actualAt: expect.any(Number),
            crossDocument: true,
          });
          expect(visit.status).toBe("failed");
        }
        if (sample.scenarioId === "withdraw") {
          expect(visit.diagnostics?.actionNavigated).toBe(true);
          expect(visit.diagnostics?.actionCorrectness).toMatchObject({
            verified: true,
          });
          expect(visit.diagnostics?.correctnessChecksCompleted).toBe(true);
          expect(visit.diagnostics?.actionNavigation).toMatchObject({
            dismissed: true,
            matches: true,
            ready: true,
            state: { allowedCategories: [], consent: "rejected" },
          });
          for (const key of ["action.dismissed", "action.consent-effective"]) {
            const metric = visit.measurements.find(
              (measurement) => measurement.key === key
            );
            expect(metric?.status).toBe("unavailable");
            expect(metric).not.toHaveProperty("value");
          }
        }
      }
    }
  });
}
