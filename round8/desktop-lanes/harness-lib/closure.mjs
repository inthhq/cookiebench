// Print "name=dir" for a workspace package and every public workspace package
// it reaches through dependencies, optionalDependencies or peerDependencies.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const [checkout, root = "c15t"] = process.argv.slice(2);
const packages = new Map();
for (const dir of readdirSync(path.join(checkout, "packages"))) {
  const file = path.join(checkout, "packages", dir, "package.json");
  if (!existsSync(file)) continue;
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  if (pkg.private === true) continue;
  packages.set(pkg.name, { dir: path.dirname(file), pkg });
}
const selected = new Map();
const visit = (name) => {
  if (selected.has(name)) return;
  const entry = packages.get(name);
  if (!entry) throw new Error(`Missing workspace package ${name}`);
  selected.set(name, entry.dir);
  const { dependencies, optionalDependencies, peerDependencies } = entry.pkg;
  for (const dep of Object.keys({ ...dependencies, ...optionalDependencies, ...peerDependencies })) {
    if (packages.has(dep)) visit(dep);
  }
};
visit(root);
process.stdout.write(
  [...selected].sort(([a], [b]) => a.localeCompare(b)).map(([n, d]) => `${n}=${d}`).join("\n") + "\n"
);
