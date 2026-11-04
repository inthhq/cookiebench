#!/usr/bin/env bash
# prepare.sh: private CookieBench copy with only the astro fixture, its c15t
# deps and pnpm overrides pointed at packs.tsv, then `pnpm install` and the
# fixture's own `pnpm build` (baseline build + c15t build).
# Ports stay the fixture's own (proxy 4315, upstream 4415, baseline 4515,
# TLS 4615), which the round-8 brief assigns to this lane.
# Output: /home/kaylee/.t3/scratch/lcp-fleet/frameworks/astro/work/cookiebench
set -euo pipefail
A=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/astro
SRC=/home/kaylee/.t3/scratch/cookiebench
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
PACKS="$A/packs.tsv"
CB="$A/work/cookiebench"
FIX="$CB/benchmarks/with-c15t-astro"
mkdir -p "$CB/benchmarks"
git -C "$SRC" rev-parse HEAD >"$A/work/cookiebench-source-sha.txt"
rsync -a --delete \
	--exclude node_modules --exclude .git --exclude results --exclude artifacts \
	--exclude .source-build --exclude '.turbo' --exclude '/benchmarks/' \
	"$SRC/" "$CB/"
for d in with-c15t-astro profiles; do
	rsync -a --delete --exclude node_modules --exclude dist --exclude dist-baseline \
		--exclude .astro "$SRC/benchmarks/$d/" "$CB/benchmarks/$d/"
done
cp "$PACKS" "$A/work/packs.tsv"
node - "$CB" "$PACKS" <<'EOF'
const fs = require("node:fs");
const path = require("node:path");
const [cb, packsTsv] = process.argv.slice(2);
const packs = fs.readFileSync(packsTsv, "utf8").trim().split("\n").map((l) => {
  const [name, file] = l.split("\t");
  return { name, spec: `file:${file}` };
});
const fix = path.join(cb, "benchmarks/with-c15t-astro");
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
EOF
(cd "$CB" && pnpm install --no-frozen-lockfile --reporter=append-only) >"$A/logs/pnpm-install.log" 2>&1 || {
	tail -40 "$A/logs/pnpm-install.log" >&2; exit 1; }
node /home/kaylee/.t3/scratch/lcp-fleet/harness/lib/verify-install.mjs "$FIX" "$PACKS" | tee "$A/work/installed.txt"
rm -rf "$FIX/dist" "$FIX/dist-baseline" "$FIX/.astro"
(cd "$FIX" && pnpm run build) >"$A/logs/astro-build.log" 2>&1 || { tail -60 "$A/logs/astro-build.log" >&2; exit 1; }
echo "built $FIX"
