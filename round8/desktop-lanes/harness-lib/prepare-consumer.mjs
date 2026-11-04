// Point the private CookieBench workspace at the packed c15t tarballs and
// move the Next fixture to this bench's ports.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [cb, packsTsv, proxyPort, nextPort] = process.argv.slice(2);
const packs = readFileSync(packsTsv, "utf8").trim().split("\n").map((line) => {
  const [name, file] = line.split("\t");
  return { name, spec: `file:${file}` };
});
const fix = path.join(cb, "benchmarks/with-c15t-nextjs");
const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const writeJson = (f, v) => writeFileSync(f, `${JSON.stringify(v, null, 2)}\n`);

const pkgFile = path.join(fix, "package.json");
const pkg = readJson(pkgFile);
for (const { name, spec } of packs) {
  if (name in pkg.dependencies) pkg.dependencies[name] = spec;
}
pkg.scripts.start = pkg.scripts.start
  .replace("--port 4322", `--port ${proxyPort}`)
  .replace("--upstream-port 4412", `--upstream-port ${nextPort}`)
  .replace("next start --port 4412", `next start --port ${nextPort}`);
if (pkg.scripts.start.includes("4322") || pkg.scripts.start.includes("4412")) {
  throw new Error(`Port rewrite missed: ${pkg.scripts.start}`);
}
writeJson(pkgFile, pkg);

const runFile = path.join(fix, "run.json");
const run = readFileSync(runFile, "utf8")
  .replaceAll("127.0.0.1:4322", `127.0.0.1:${proxyPort}`)
  .replaceAll("127.0.0.1:4412", `127.0.0.1:${nextPort}`);
if (/\b4322\b|\b4412\b/.test(run)) throw new Error("run.json still names 4322/4412");
writeFileSync(runFile, run);

const ws = path.join(cb, "pnpm-workspace.yaml");
let yaml = readFileSync(ws, "utf8");
if (/^overrides:/m.test(yaml)) throw new Error("pnpm-workspace.yaml already has overrides");
yaml += `\nautoInstallPeers: false\noverrides:\n${packs
  .map(({ name, spec }) => `  ${JSON.stringify(name)}: ${JSON.stringify(spec)}`)
  .join("\n")}\n`;
writeFileSync(ws, yaml);
