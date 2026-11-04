#!/usr/bin/env bash
# attr-build.sh <label>: source-mapped copy of work/<label>'s fixture build.
set -euo pipefail
N=/home/kaylee/.t3/scratch/lcp-fleet/nuxt
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
B="$N/work/$1/cookiebench/benchmarks"
rm -rf "$B/with-c15t-nuxt-attr" && cp -a "$B/with-c15t-nuxt" "$B/with-c15t-nuxt-attr"
cd "$B/with-c15t-nuxt-attr" && rm -rf .nuxt .output .nuxt-baseline .output-baseline
python3 - <<'PY'
p='nuxt.config.ts'; s=open(p).read()
s=s.replace('compatibilityDate: "2026-09-27",','compatibilityDate: "2026-09-27",\n  sourcemap: { client: true, server: false },')
open(p,'w').write(s)
PY
npx nuxt build >"$N/attr-build-$1.log" 2>&1
