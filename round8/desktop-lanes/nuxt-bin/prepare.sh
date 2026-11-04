#!/usr/bin/env bash
# prepare.sh <label> <packs.tsv> <proxy-port> <nuxt-port> <baseline-port> <tls-port>
#
# Private CookieBench copy with only the Nuxt fixture, its c15t deps and pnpm
# overrides pointed at <packs.tsv>, ports moved, then `pnpm install` and the
# fixture's own `pnpm build` (nuxt build + baseline build).
# Output: /home/kaylee/.t3/scratch/lcp-fleet/nuxt/work/<label>/cookiebench
set -euo pipefail
N=/home/kaylee/.t3/scratch/lcp-fleet/nuxt
SRC=/home/kaylee/.t3/scratch/cookiebench
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
LABEL="$1"; PACKS="$2"; PROXY="$3"; NUXT="$4"; BASE="$5"; TLS="$6"
for p in 4314 4414 4514 4614 4322 4412; do
	for q in "$PROXY" "$NUXT" "$BASE" "$TLS"; do [[ "$p" == "$q" ]] && { echo "refusing port $q" >&2; exit 64; }; done
done
W="$N/work/$LABEL"
CB="$W/cookiebench"
FIX="$CB/benchmarks/with-c15t-nuxt"
mkdir -p "$CB/benchmarks"
rsync -a --delete \
	--exclude node_modules --exclude .git --exclude results --exclude artifacts \
	--exclude .source-build --exclude '.turbo' --exclude '/benchmarks/' \
	"$SRC/" "$CB/"
for d in with-c15t-nuxt profiles; do
	rsync -a --delete --exclude node_modules --exclude .nuxt --exclude .nuxt-baseline \
		--exclude .output --exclude .output-baseline \
		"$SRC/benchmarks/$d/" "$CB/benchmarks/$d/"
done
cp "$PACKS" "$W/packs.tsv"
node - "$CB" "$PACKS" "$PROXY" "$NUXT" "$BASE" "$TLS" <<'EOF'
const fs = require("node:fs");
const path = require("node:path");
const [cb, packsTsv, proxy, nuxt, base, tls] = process.argv.slice(2);
const packs = fs.readFileSync(packsTsv, "utf8").trim().split("\n").map((l) => {
  const [name, file] = l.split("\t");
  return { name, spec: `file:${file}` };
});
const fix = path.join(cb, "benchmarks/with-c15t-nuxt");
const pkgFile = path.join(fix, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
for (const { name, spec } of packs) if (name in pkg.dependencies) pkg.dependencies[name] = spec;
const swap = (s) => s
  .replace(/\b4314\b/g, proxy).replace(/\b4414\b/g, nuxt)
  .replace(/\b4514\b/g, base).replace(/\b4614\b/g, tls);
pkg.scripts.start = swap(pkg.scripts.start);
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
const runFile = path.join(fix, "run.json");
fs.writeFileSync(runFile, swap(fs.readFileSync(runFile, "utf8")));
const ws = path.join(cb, "pnpm-workspace.yaml");
let yaml = fs.readFileSync(ws, "utf8");
if (/^overrides:/m.test(yaml)) throw new Error("overrides already present");
yaml += `\nautoInstallPeers: false\noverrides:\n${packs.map(({ name, spec }) => `  ${JSON.stringify(name)}: ${JSON.stringify(spec)}`).join("\n")}\n`;
fs.writeFileSync(ws, yaml);
console.log("start:", pkg.scripts.start);
console.log("deps:", JSON.stringify(pkg.dependencies));
EOF
(cd "$CB" && pnpm install --no-frozen-lockfile --reporter=append-only) >"$W/pnpm-install.log" 2>&1 || {
	tail -40 "$W/pnpm-install.log" >&2; exit 1; }
# Only check the packages the Nuxt workspace installed.
node /home/kaylee/.t3/scratch/lcp-fleet/harness/lib/verify-install.mjs "$FIX" \
	<(grep -E $'^(@c15t/(core|vue|ui|schema|translations|iab|dev-tools))\t' "$PACKS") | tee "$W/installed.txt"
rm -rf "$FIX/.nuxt" "$FIX/.nuxt-baseline" "$FIX/.output" "$FIX/.output-baseline"
(cd "$FIX" && pnpm run build) >"$W/nuxt-build.log" 2>&1 || { tail -60 "$W/nuxt-build.log" >&2; exit 1; }
echo "built $FIX"
