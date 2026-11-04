// Finalize provenance + configurationHash for one run.json, using the
// fixture-support finalizeFixture from the given CookieBench root.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const [root, file, ...integrities] = process.argv.slice(2);
const { finalizeFixture } = await import(path.join(root, "packages/fixture-support/src/provenance.ts"));
const config = JSON.parse(readFileSync(file, "utf8"));
config.fixtures = config.fixtures.map((fixture, i) =>
  finalizeFixture(fixture, config.scenarios, integrities[i], fixture.provenance.sourceUrl, { workspaceRoot: root }));
writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
console.log(config.fixtures.map((f) => `${f.id} ${f.configurationHash}`).join("\n"));
