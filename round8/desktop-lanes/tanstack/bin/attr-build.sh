#!/usr/bin/env bash
# attr-build.sh <arm>: source-mapped copy of work/<arm>'s fixture build
# (vite build.sourcemap = true; nothing else changes). Measured runs never
# use this copy.
set -euo pipefail
T=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/tanstack
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
B="$T/work/$1/cookiebench/benchmarks"
rm -rf "$B/with-c15t-tanstack-start-attr" && cp -a "$B/with-c15t-tanstack-start" "$B/with-c15t-tanstack-start-attr"
cd "$B/with-c15t-tanstack-start-attr" && rm -rf dist
python3 -I - <<'PY'
p = 'vite.config.ts'
s = open(p).read()
s = s.replace('export default defineConfig({', 'export default defineConfig({\n  build: { sourcemap: true },', 1)
assert 'sourcemap' in s
open(p, 'w').write(s)
PY
pnpm run build >"$T/logs/attr-build-$1.log" 2>&1
echo "built $B/with-c15t-tanstack-start-attr"
