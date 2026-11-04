#!/usr/bin/env bash
# prepare.sh <label> <packs.tsv>
#
# Private CookieBench copy with only the TanStack Start fixture. Its c15t
# deps and pnpm overrides point at <packs.tsv>; then `pnpm install` and the
# fixture's own `pnpm build` (vite build). Ports stay the lane's assigned
# 4316 / 4416 (TLS 4616), the fixture's own.
# Output: /home/kaylee/.t3/scratch/lcp-fleet/frameworks/tanstack/work/<label>/cookiebench
set -euo pipefail
T=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/tanstack
SRC=/home/kaylee/.t3/scratch/cookiebench
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
LABEL="$1"; PACKS="$2"
W="$T/work/$LABEL"
CB="$W/cookiebench"
FIX="$CB/benchmarks/with-c15t-tanstack-start"
mkdir -p "$CB/benchmarks"
rsync -a --delete \
	--exclude node_modules --exclude .git --exclude results --exclude artifacts \
	--exclude .source-build --exclude '.turbo' --exclude '/benchmarks/' \
	"$SRC/" "$CB/"
for d in with-c15t-tanstack-start profiles; do
	rsync -a --delete --exclude node_modules --exclude dist --exclude .tanstack \
		"$SRC/benchmarks/$d/" "$CB/benchmarks/$d/"
done
cp "$PACKS" "$W/packs.tsv"
node - "$CB" "$PACKS" <<'EOF'
const fs = require("node:fs");
const path = require("node:path");
const [cb, packsTsv] = process.argv.slice(2);
const packs = fs.readFileSync(packsTsv, "utf8").trim().split("\n").map((l) => {
  const [name, file] = l.split("\t");
  return { name, spec: `file:${file}` };
});
const fix = path.join(cb, "benchmarks/with-c15t-tanstack-start");
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
(cd "$CB" && pnpm install --no-frozen-lockfile --reporter=append-only) >"$W/pnpm-install.log" 2>&1 || {
	tail -40 "$W/pnpm-install.log" >&2; exit 1; }
node /home/kaylee/.t3/scratch/lcp-fleet/harness/lib/verify-install.mjs "$FIX" \
	<(grep -E $'^@c15t/' "$PACKS" | while IFS=$'\t' read -r n f s; do
		[[ -n "$(ls -d "$CB/node_modules/.pnpm/${n/\//+}@"* 2>/dev/null)" ]] && printf '%s\t%s\t%s\n' "$n" "$f" "$s"; done) | tee "$W/installed.txt"
rm -rf "$FIX/dist"
(cd "$FIX" && pnpm run build) >"$W/build.log" 2>&1 || { tail -60 "$W/build.log" >&2; exit 1; }
echo "built $FIX"
