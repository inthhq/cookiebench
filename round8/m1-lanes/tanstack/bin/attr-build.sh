#!/usr/bin/env bash
# attr-build.sh <canary|ic>: source-mapped copy of the arm's tanstack fixture
# build (vite build.sourcemap = true; nothing else changes), at
# <cookiebench>/round8/tanstack-attr-<arm> (same depth as benchmarks/*, so the
# relative pnpm symlinks resolve; outside the pnpm workspace glob). Measured
# runs never use this copy. Delete it after attr.sh.
set -euo pipefail
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
T=$LCP/frameworks/tanstack
case "$1" in canary) CBX=$CB ;; ic) CBX=$LCP/cookiebench-ic ;; esac
mkdir -p "$CBX/round8"
A="$CBX/round8/tanstack-attr-$1"
rm -rf "$A" && cp -a "$CBX/benchmarks/with-c15t-tanstack-start" "$A"
cd "$A" && rm -rf dist
python3 -I - <<'PY'
p = 'vite.config.ts'
s = open(p).read()
s = s.replace('export default defineConfig({', 'export default defineConfig({\n  build: { sourcemap: true },', 1)
assert 'sourcemap' in s
open(p, 'w').write(s)
PY
mkdir -p "$T/logs"
pnpm run build >"$T/logs/attr-build-$1.log" 2>&1
echo "built $A"
