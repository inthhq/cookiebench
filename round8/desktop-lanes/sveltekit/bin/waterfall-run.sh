#!/usr/bin/env bash
# waterfall-run.sh <label> <visits> [--cmp cookie-yes]
# Load gate (<= 4, up to 30 min), then waterfall.mjs (takes the lock itself).
set -uo pipefail
L=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/sveltekit
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
LABEL="$1"; VISITS="$2"; shift 2
OUT="$L/runs/$LABEL-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$OUT"
gate_start=$(date +%s)
while awk '{exit !($1 > 4)}' /proc/loadavg; do
	if (( $(date +%s) - gate_start > 1800 )); then echo "load gate: still $(cut -d' ' -f1 /proc/loadavg) after 30 min, going" >>"$OUT/meta.txt"; break; fi
	sleep 15
done
echo "gate_passed=$(date +%s) load=$(cut -d' ' -f1 /proc/loadavg) args=$*" >>"$OUT/meta.txt"
date +%s >"$OUT/started"
node "$L/bin/waterfall.mjs" --cookiebench "$L/work/cookiebench" --fixture "$L/work/cookiebench/benchmarks/with-c15t-sveltekit" \
	--port 4317 --profile mobile --visits "$VISITS" --out "$OUT" "$@" >"$OUT/waterfall.log" 2>&1
echo "exit=$?" >>"$OUT/meta.txt"; date +%s >"$OUT/ended"
mx=$(python3 -I -c "import json;print(max(v for _,v in json.load(open('$OUT/loadavg.json'))))" 2>/dev/null || echo NA)
echo "$(date -Is) WATERFALL $(basename "$OUT") load_max=$mx $(grep -c '^pair' "$OUT/waterfall.log") pairs" >>"$L/runs/ledger.log"
echo "$OUT"
