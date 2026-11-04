#!/usr/bin/env bash
# attr.sh <attr-fixture-dir> <port> <out.json>: serve the source-mapped build,
# take the scripts the page HTML loads at first (modulepreload/module), and
# attribute their bytes per package/module.
set -euo pipefail
FIX="$(cd "$1" && pwd)"; PORT="$2"; OUT="$3"
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
cd "$FIX"
PORT=$PORT node .output/server/index.mjs >/dev/null 2>&1 & P=$!
trap 'kill $P 2>/dev/null' EXIT
for i in $(seq 50); do curl -sf -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 0.2; done
curl -s "http://127.0.0.1:$PORT/" > "$OUT.html"
first=$(grep -oE '<link rel="modulepreload"[^>]*href="/_nuxt/[^"]+"|<script type="module" src="/_nuxt/[^"]+"' "$OUT.html" | grep -oE '/_nuxt/[^"]+' | sed 's#/_nuxt/##' | sort -u | paste -sd,)
pre=$(grep -oE '<link rel="prefetch"[^>]*href="/_nuxt/[^"]+"' "$OUT.html" | grep -oE '/_nuxt/[^"]+' | sed 's#/_nuxt/##' | sort -u | paste -sd,)
cd /home/kaylee/.t3/scratch/lcp-fleet/react-arm
node --experimental-strip-types lib/attribute-run.ts "$FIX/.output/public/_nuxt" "$OUT" "first=$first" ${pre:+"prefetch=$pre"}
