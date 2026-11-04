#!/usr/bin/env bash
# prepare.sh <label> <packs.tsv>
#
# Private CookieBench copy with only the script fixture. The fixture's
# @c15t/browser dep and pnpm overrides for the whole closure point at
# <packs.tsv>. Ports stay 4310 (HTTP) / 4610 (TLS), assigned to this lane.
# Then `pnpm install` and the fixture's own `pnpm build`
# (prepare-assets.mjs copies @c15t/browser/c15t.js to public/vendor, then vite build).
# Output: /home/kaylee/.t3/scratch/lcp-fleet/frameworks/script/work/<label>/cookiebench
set -euo pipefail
S=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/script
SRC=/home/kaylee/.t3/scratch/cookiebench
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
LABEL="$1"; PACKS="$2"
W="$S/work/$LABEL"
CB="$W/cookiebench"
FIX="$CB/benchmarks/with-c15t-script"
mkdir -p "$CB/benchmarks"
rsync -a --delete \
	--exclude node_modules --exclude .git --exclude results --exclude artifacts \
	--exclude .source-build --exclude '.turbo' --exclude '/benchmarks/' \
	"$SRC/" "$CB/"
for d in with-c15t-script profiles; do
	[[ -d "$SRC/benchmarks/$d" ]] || continue
	rsync -a --delete --exclude node_modules --exclude dist --exclude public/vendor \
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
const fix = path.join(cb, "benchmarks/with-c15t-script");
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
	"$PACKS" | tee "$W/installed.txt" || true
rm -rf "$FIX/dist" "$FIX/public/vendor"
(cd "$FIX" && pnpm run build) >"$W/build.log" 2>&1 || { tail -60 "$W/build.log" >&2; exit 1; }
tar -xOf "$(grep -E $'^@c15t/browser\t' "$PACKS" | cut -f2)" package/dist/c15t.js | cmp - "$FIX/dist/vendor/c15t.js" \
	&& echo "dist/vendor/c15t.js matches the packed tarball" | tee -a "$W/installed.txt"
echo "built $FIX"
