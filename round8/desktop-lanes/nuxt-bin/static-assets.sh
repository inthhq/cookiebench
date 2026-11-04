#!/usr/bin/env bash
# static-assets.sh <fixture-dir> <port> <label>: serve the built Nuxt app (and
# baseline) on a private port, save the HTML, list each preloaded/linked asset
# with raw and brotli-11 size.
set -euo pipefail
FIX="$1"; PORT="$2"; BPORT=$(( $2 + 1 )); LABEL="$3"
N=/home/kaylee/.t3/scratch/lcp-fleet/nuxt
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
mkdir -p "$N/static/$LABEL"
cd "$FIX"
PORT=$PORT NITRO_PORT=$PORT node .output/server/index.mjs >"$N/static/$LABEL/server.log" 2>&1 & P1=$!
PORT=$BPORT NITRO_PORT=$BPORT node .output-baseline/server/index.mjs >"$N/static/$LABEL/server-base.log" 2>&1 & P2=$!
trap 'kill $P1 $P2 2>/dev/null' EXIT
for i in $(seq 50); do curl -sf -o /dev/null "http://127.0.0.1:$PORT/" && curl -sf -o /dev/null "http://127.0.0.1:$BPORT/baseline/" && break; sleep 0.2; done
curl -s "http://127.0.0.1:$PORT/" >"$N/static/$LABEL/page.html"
curl -s "http://127.0.0.1:$BPORT/baseline/" >"$N/static/$LABEL/baseline.html"
for kind in page baseline; do
  html="$N/static/$LABEL/$kind.html"
  root=".output/public"; [[ $kind == baseline ]] && root=".output-baseline/public"
  printf '%s\tHTML\t%s\t%s\n' "$kind" "$(wc -c <"$html")" "$(brotli -c -q 11 "$html" | wc -c)"
  grep -oE '(src|href)="/[^"]+\.(js|css)"' "$html" | sed -E 's/.*="([^"]+)"/\1/' | sort -u | while read -r u; do
    f="$root$u"; [[ -f "$f" ]] || f="$root/${u#/baseline}"
    rel=$(grep -oE "<[^>]*\"$u\"[^>]*>" "$html" | head -1 | grep -oE 'rel="[^"]+"|type="module"' | head -1)
    printf '%s\t%s\t%s\t%s\t%s\n' "$kind" "$u" "$(wc -c <"$f")" "$(brotli -c -q 11 "$f" | wc -c)" "$rel"
  done
done
