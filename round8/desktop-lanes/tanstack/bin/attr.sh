#!/usr/bin/env bash
# attr.sh <arm>: attribute every client JS chunk of the source-mapped copy
# (attr-build.sh) to packages/modules, and map each chunk back to the
# measured build's file by name prefix + byte-identical code (sourcemap
# comment stripped). Output: static/attr-<arm>.json, static/map-<arm>.json
set -euo pipefail
T=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/tanstack
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
ARM="$1"
B="$T/work/$ARM/cookiebench/benchmarks"
A="$B/with-c15t-tanstack-start-attr/dist/client/assets"
M="$B/with-c15t-tanstack-start/dist/client/assets"
mkdir -p "$T/static"
all=$(cd "$A" && ls *.js | paste -sd,)
node --experimental-strip-types "$T/bin/attribute-run.ts" "$A" "$T/static/attr-$ARM.json" "all=$all"
node - "$A" "$M" "$T/static/map-$ARM.json" <<'EOF'
const fs = require("node:fs");
const path = require("node:path");
const [a, m, out] = process.argv.slice(2);
const strip = (s) => s.replace(/\n?\/\/# sourceMappingURL=\S+\s*$/, "");
const prefix = (f) => f.replace(/-[A-Za-z0-9_-]{8}\.js$/, "");
const attr = fs.readdirSync(a).filter((f) => f.endsWith(".js"));
const byCode = new Map();
for (const f of attr) byCode.set(strip(fs.readFileSync(path.join(a, f), "utf8")), f);
const map = {};
let miss = 0;
for (const f of fs.readdirSync(m).filter((f) => f.endsWith(".js"))) {
  const code = fs.readFileSync(path.join(m, f), "utf8");
  let hit = byCode.get(strip(code));
  if (!hit) {
    // Content can differ only in imported chunk file names (hashes).
    const cands = attr.filter((x) => prefix(x) === prefix(f) && Math.abs(strip(fs.readFileSync(path.join(a, x), "utf8")).length - code.length) <= 64);
    hit = cands.length === 1 ? cands[0] : undefined;
  }
  if (!hit) miss++;
  map[f] = hit ?? null;
}
fs.writeFileSync(out, JSON.stringify(map, null, 1));
console.log(`mapped ${Object.values(map).filter(Boolean).length}/${Object.keys(map).length}, unmapped ${miss}`);
EOF
