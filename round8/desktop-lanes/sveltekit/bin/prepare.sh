#!/usr/bin/env bash
# prepare.sh <packs.tsv>
# Measurement workspace: a copy of the CookieBench clone without its
# benchmarks, plus profiles and this lane's with-c15t-sveltekit fixture (from
# cookiebench-git), with pnpm overrides pointing c15t at <packs.tsv>.
# Then pnpm install, verify, and the fixture's own `pnpm build`.
set -euo pipefail
L=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/sveltekit
SRC=/home/kaylee/.t3/scratch/cookiebench
GIT=$L/cookiebench-git
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
PACKS="$1"
W=$L/work
CB=$W/cookiebench
FIX=$CB/benchmarks/with-c15t-sveltekit
mkdir -p "$CB/benchmarks"
rsync -a --delete \
	--exclude node_modules --exclude .git --exclude results --exclude artifacts \
	--exclude .source-build --exclude '.turbo' --exclude '/benchmarks/' \
	"$SRC/" "$CB/"
rsync -a --delete --exclude node_modules "$SRC/benchmarks/profiles/" "$CB/benchmarks/profiles/"
rsync -a --delete --exclude node_modules --exclude .svelte-kit --exclude .svelte-kit-baseline \
	--exclude build --exclude build-baseline \
	"$GIT/benchmarks/with-c15t-sveltekit/" "$FIX/"
# CookieBench package changes from the fixture patch (schema framework list etc.).
for f in $(git -C "$GIT" diff --name-only eee967e -- packages); do cp "$GIT/$f" "$CB/$f"; done
cp "$PACKS" "$W/packs.tsv"
node - "$CB" "$PACKS" <<'JS'
const fs = require("node:fs");
const path = require("node:path");
const [cb, packsTsv] = process.argv.slice(2);
const packs = fs.readFileSync(packsTsv, "utf8").trim().split("\n").map((l) => {
  const [name, file] = l.split("\t");
  return { name, spec: `file:${file}` };
});
const fix = path.join(cb, "benchmarks/with-c15t-sveltekit");
const pkgFile = path.join(fix, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
for (const { name, spec } of packs) if (name in pkg.dependencies) pkg.dependencies[name] = spec;
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
const ws = path.join(cb, "pnpm-workspace.yaml");
let yaml = fs.readFileSync(ws, "utf8");
if (/^overrides:/m.test(yaml)) throw new Error("overrides already present");
yaml += `\nautoInstallPeers: false\noverrides:\n${packs.map(({ name, spec }) => `  ${JSON.stringify(name)}: ${JSON.stringify(spec)}`).join("\n")}\n`;
fs.writeFileSync(ws, yaml);
console.log("deps:", JSON.stringify(pkg.dependencies));
JS
(cd "$CB" && pnpm install --no-frozen-lockfile --reporter=append-only) >"$W/pnpm-install.log" 2>&1 || {
	tail -40 "$W/pnpm-install.log" >&2; exit 1; }
node /home/kaylee/.t3/scratch/lcp-fleet/harness/lib/verify-install.mjs "$FIX" "$PACKS" | tee "$W/installed.txt"
rm -rf "$FIX/.svelte-kit" "$FIX/.svelte-kit-baseline" "$FIX/build" "$FIX/build-baseline"
(cd "$FIX" && pnpm run build) >"$W/build.log" 2>&1 || { tail -60 "$W/build.log" >&2; exit 1; }
echo "built $FIX"
