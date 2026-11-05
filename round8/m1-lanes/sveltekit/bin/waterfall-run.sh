#!/usr/bin/env bash
# waterfall-run.sh <label> <visits> [--cmp cookie-yes]
# Load gate (1-min <= 6, up to 30 min), then waterfall.mjs (takes the shared
# lock itself, starts and stops the fixture server). Ledger line per attempt.
set -uo pipefail
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
L=$LCP/frameworks/sveltekit
LABEL="$1"; VISITS="$2"; shift 2
OUT="$L/runs/$LABEL-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$OUT"
load1() { sysctl -n vm.loadavg | awk '{print $2}'; }
gate_start=$(date +%s)
while awk -v l="$(load1)" 'BEGIN{exit !(l > 6)}'; do
	if (( $(date +%s) - gate_start > 1800 )); then echo "load gate: still $(load1) after 30 min, going" >>"$OUT/meta.txt"; break; fi
	sleep 15
done
echo "gate_passed=$(date +%s) load=$(load1) args=$*" >>"$OUT/meta.txt"
date +%s >"$OUT/started"
node "$L/bin/waterfall.mjs" --cookiebench "$CB" --fixture "$CB/benchmarks/with-c15t-sveltekit" \
	--port 4317 --profile mobile --visits "$VISITS" --out "$OUT" "$@" >"$OUT/waterfall.log" 2>&1
st=$?
echo "exit=$st" >>"$OUT/meta.txt"; date +%s >"$OUT/ended"
mx=$(python3 -I -c "import json,sys;print(max(v for _,v in json.load(open(sys.argv[1]))))" "$OUT/loadavg.json" 2>/dev/null || echo NA)
verdict=KEEP; reason=""
if [[ $st -ne 0 ]]; then verdict=DISCARD; reason="exit=$st"; fi
if [[ "$mx" != NA ]] && awk -v m="$mx" 'BEGIN{exit !(m > 10)}'; then verdict=DISCARD; reason="$reason load $mx"; fi
echo "$(date +%FT%T) $verdict $(basename "$OUT") WATERFALL load_max=$mx $(grep -c '^pair' "$OUT/waterfall.log") pairs $reason" >>"$L/runs/ledger.log"
[[ $verdict == DISCARD ]] && mv "$OUT" "$L/runs/_discarded/"
echo "$OUT"
