/**
 * Writes the derived run configurations and batch plans for one full rerun:
 * desktop and emulated-mobile load cohorts, ten-attempt action cohorts and a
 * one-attempt correctness pass for every integration. A batch cannot mix CPU
 * settings, so each profile gets its own plan.
 *
 *   node benchmarks/plans/generate.ts artifacts/rerun-2026-10-02
 *   node packages/cli/src/batch.ts artifacts/rerun-2026-10-02/plan-desktop.json artifacts/rerun-2026-10-02/desktop
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { finalizeFixture } from "../../packages/fixture-support/src/provenance.ts";
import {
  referenceRunConfig,
  referenceScenario,
} from "../../packages/runner/src/reference.ts";

const [output] = process.argv.slice(2);
if (!output) {
  throw new Error(
    "Usage: node benchmarks/plans/generate.ts <output-directory>"
  );
}
const seed = 20_261_002;
const actionScenarios = new Set(["accept", "reject", "save"]);
const integrations = [
  "with-c15t-nextjs",
  "with-c15t-react",
  "with-c15t-script",
  "with-c15t-nuxt",
  "with-c15t-astro",
  "with-c15t-tanstack-start",
  "with-cookie-control",
  "with-cookie-yes",
  "with-didomi",
  "with-enzuzo",
  "with-iubenda",
  "with-ketch",
  "with-onetrust",
  "with-osano",
  "with-usercentrics",
] as const;

// oxlint-disable-next-line typescript/no-explicit-any -- Run configurations are copied as JSON; the runner decodes them.
type Json = Record<string, any>;
const read = (file: string): Json => JSON.parse(readFileSync(file, "utf-8"));
const profiles = {
  desktop: undefined,
  mobile: read("benchmarks/profiles/mobile.json"),
} as const;

function finalize(config: Json): Json {
  return {
    ...config,
    fixtures: config.fixtures.map((fixture: Json) =>
      finalizeFixture(
        fixture as never,
        config.scenarios,
        fixture.provenance.artifactIntegrity,
        fixture.provenance.sourceUrl,
        fixture.provenance.sourceCommit
          ? { sourceCommit: fixture.provenance.sourceCommit }
          : {}
      )
    ),
  };
}

function write(name: string, config: Json): string {
  const file = path.join(output, "configs", `${name}.json`);
  writeFileSync(file, `${JSON.stringify(finalize(config), null, 2)}\n`);
  return file;
}

function headless(): Json {
  // The headless page runs on the script server without added backend delay,
  // so its paired baseline must use that same server command.
  const config = read("benchmarks/with-c15t-script/run-headless.json");
  const [candidate] = config.fixtures;
  const baseline = read("benchmarks/with-c15t-script/run.json").fixtures.find(
    (fixture: Json) => fixture.baseline
  );
  return {
    ...config,
    fixtures: [
      {
        ...baseline,
        id: "script-tag-baseline-headless-server",
        server: candidate.server,
      },
      candidate,
    ],
  };
}

// Without a configuration the reference audit runs on the runner's desktop
// profile, and a batch cannot mix CPU settings. Other profiles get the same
// page and scenario as `instrumentation audit` builds, on their own profile.
function referenceAudit(profileName: string, profile: Json): string {
  const file = path.join(
    output,
    "configs",
    `reference-overhead-${profileName}.json`
  );
  const config = {
    ...referenceRunConfig({ variant: "baseline" }),
    profile,
    scenarios: [
      referenceScenario({
        action: "load",
        expectedBanner: false,
        id: "load",
        observationMs: 1000,
      }),
    ],
  };
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
  return file;
}

mkdirSync(path.join(output, "configs"), { recursive: true });
for (const [profileName, profile] of Object.entries(profiles)) {
  const entries: Json[] = [];
  const sources: [string, Json][] = [
    ...integrations.map(
      (name) => [name, read(`benchmarks/${name}/run.json`)] as [string, Json]
    ),
    ["with-c15t-headless", headless()],
    [
      "cookieyes-script-comparison",
      read("benchmarks/cookieyes-script-comparison/run.json"),
    ],
  ];
  for (const [name, source] of sources) {
    const config = profile ? { ...source, profile } : source;
    const full = write(`${name}-${profileName}`, config);
    const actions = write(`${name}-${profileName}-actions`, {
      ...config,
      fixtures: config.fixtures.filter((fixture: Json) => !fixture.baseline),
      scenarios: config.scenarios.filter((scenario: Json) =>
        actionScenarios.has(scenario.id)
      ),
    });
    entries.push(
      { config: full, id: `${name}-load`, kind: "load" },
      { config: actions, id: `${name}-actions`, iterations: 10, kind: "flows" },
      { config: full, id: `${name}-correctness`, kind: "flows" }
    );
  }
  const nextFull = path.join(
    output,
    "configs",
    `with-c15t-nextjs-${profileName}.json`
  );
  entries.push(
    profile
      ? {
          config: referenceAudit(profileName, profile),
          id: "reference-overhead",
          kind: "audit",
        }
      : { id: "reference-overhead", kind: "audit" },
    { config: nextFull, id: "next-overhead", kind: "audit" }
  );
  writeFileSync(
    path.join(output, `plan-${profileName}.json`),
    `${JSON.stringify({ entries, seed }, null, 2)}\n`
  );
}
