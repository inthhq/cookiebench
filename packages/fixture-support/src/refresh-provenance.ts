import { spawnSync } from "node:child_process";
import { globSync, readFileSync, writeFileSync } from "node:fs";

import { FixtureConfig, ScenarioConfig } from "@cookiebench/schema";
import { Schema } from "effect";

import { finalizeFixture } from "./provenance.ts";

const object = Schema.decodeUnknownSync(
  Schema.Record(Schema.String, Schema.Unknown)
);
const fixturesSchema = Schema.decodeUnknownSync(Schema.Array(FixtureConfig));
const scenariosSchema = Schema.decodeUnknownSync(Schema.Array(ScenarioConfig));
const files = globSync("benchmarks/*/run*.json").toSorted();
for (const file of files) {
  const config = object(JSON.parse(readFileSync(file, "utf-8")));
  const scenarios = scenariosSchema(config.scenarios);
  const fixtures = fixturesSchema(config.fixtures).map((fixture) => {
    const { provenance } = fixture;
    if (!provenance?.artifactIntegrity || !provenance.sourceUrl) {
      throw new Error(`Fixture ${fixture.id} lacks artifact provenance.`);
    }
    return finalizeFixture(
      fixture,
      scenarios,
      provenance.artifactIntegrity,
      provenance.sourceUrl,
      provenance.sourceCommit ? { sourceCommit: provenance.sourceCommit } : {}
    );
  });
  writeFileSync(file, `${JSON.stringify({ ...config, fixtures }, null, 2)}\n`);
  process.stdout.write(`Updated ${file}\n`);
}
const formatted = spawnSync("pnpm", ["exec", "oxfmt", "--write", ...files], {
  stdio: "inherit",
});
if (formatted.error || formatted.status !== 0) {
  throw new Error("Could not format refreshed fixture configurations.", {
    cause: formatted.error,
  });
}
