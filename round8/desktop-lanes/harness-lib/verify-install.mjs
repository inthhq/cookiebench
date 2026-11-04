// Confirm every installed copy of each c15t package in the private pnpm store
// is byte-identical (package.json) to the tarball we packed, and that no
// registry copy is left.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const [fix, packsTsv] = process.argv.slice(2);
const store = path.join(fix, "../../node_modules/.pnpm");
const entries = readdirSync(store);
const sha = (b) => createHash("sha256").update(b).digest("hex");
let bad = 0;
for (const line of readFileSync(packsTsv, "utf8").trim().split("\n")) {
  const [name, file] = line.split("\t");
  const prefix = `${name.replace("/", "+")}@`;
  const dirs = entries.filter((e) => e.startsWith(prefix));
  const want = sha(execFileSync("tar", ["-xOf", file, "package/package.json"]));
  const results = dirs.map((d) => {
    const f = path.join(store, d, "node_modules", name, "package.json");
    return existsSync(f) && sha(readFileSync(f)) === want && d.includes("file+");
  });
  const ok = results.length > 0 && results.every(Boolean);
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "BAD"} ${name} (${dirs.length} store dir${dirs.length === 1 ? "" : "s"})`);
}
if (bad) {
  console.error(`${bad} package(s) do not match their tarball`);
  process.exit(1);
}
