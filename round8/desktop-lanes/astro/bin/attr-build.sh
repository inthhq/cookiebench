#!/usr/bin/env bash
# attr-build.sh: source-mapped copy of the measured astro fixture build
# (same installed tarballs; only vite.build.sourcemap added). Only the c15t
# build, not the baseline. Output: work/cookiebench/benchmarks/with-c15t-astro-attr/dist
set -euo pipefail
A=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/astro
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
B="$A/work/cookiebench/benchmarks"
rm -rf "$B/with-c15t-astro-attr"
mkdir "$B/with-c15t-astro-attr"
(cd "$B/with-c15t-astro" && tar --exclude=./dist --exclude=./dist-baseline --exclude=./.astro -cf - .) | (cd "$B/with-c15t-astro-attr" && tar -xf -)
cd "$B/with-c15t-astro-attr"
python3 -I - <<'PY'
p = 'astro.config.mjs'
s = open(p).read()
old = '  output: "server",'
assert old in s
s = s.replace(old, old + '\n  vite: { build: { sourcemap: true } },')
open(p, 'w').write(s)
PY
npx astro build >"$A/logs/attr-build.log" 2>&1
ls dist/client/_astro/*.map | wc -l
# Leaving the copy inside benchmarks/* adds a workspace project; pnpm 11 then
# reinstalls on the next `pnpm start` (this broke the first measured run).
rm -rf "$A/work/attr/client" && mkdir -p "$A/work/attr" && mv dist/client "$A/work/attr/client"
cp astro.config.mjs "$A/work/attr/astro.config.mjs"
cd "$A" && rm -rf "$B/with-c15t-astro-attr"
(cd "$A/work/cookiebench" && pnpm install --no-frozen-lockfile --reporter=append-only) >"$A/logs/pnpm-reinstall.log" 2>&1
