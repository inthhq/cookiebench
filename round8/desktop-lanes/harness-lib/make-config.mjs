// Fixture run.json -> mobile profile, load scenario only, absolute cwd, no
// runner-side build (bench.sh already ran next build).
import { readFileSync } from "node:fs";

const [runFile, profileFile, fixDir, iterations, warmups] = process.argv.slice(2);
const run = JSON.parse(readFileSync(runFile, "utf8"));
run.profile = JSON.parse(readFileSync(profileFile, "utf8"));
run.scenarios = run.scenarios.filter((s) => s.id === "load");
run.iterations = Number(iterations);
run.warmups = Number(warmups);
for (const f of run.fixtures) {
  f.server.cwd = fixDir;
  delete f.server.build;
  f.revision = `${f.revision}-lcp-harness`;
}
process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
