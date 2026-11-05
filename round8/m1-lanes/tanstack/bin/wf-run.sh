#!/usr/bin/env bash
# wf-run.sh <arm: canary|ic> <pairs>: Playwright waterfall (waterfall-tanstack.mjs)
# behind the same gate as cb-run.sh (1-min load <= 6, up to 30 min) and the
# shared lock (taken by the script). Writes runs/wf-<arm>-<stamp>/ and one
# ledger line. Exit 0 only if every pair completed and max load <= 10.
set -uo pipefail
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
T=$LCP/frameworks/tanstack
ARM="$1"; PAIRS="${2:-5}"
case "$ARM" in canary) CBX=$CB ;; ic) CBX=$LCP/cookiebench-ic ;; *) exit 2 ;; esac
O="$T/runs/wf-$ARM-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$O"
load1() { sysctl -n vm.loadavg | awk '{print $2}'; }
w=0
while awk -v l="$(load1)" 'BEGIN{exit !(l > 6)}' && ((w < 1800)); do sleep 15; w=$((w + 15)); done
echo "gate waited ${w}s, load at start $(load1)" >"$O/meta.txt"
node "$T/bin/waterfall-tanstack.mjs" --cookiebench "$CBX" --fixture "$CBX/benchmarks/with-c15t-tanstack-start" \
	--port 4316 --visits "$PAIRS" --out "$O" >"$O/run.log" 2>&1
st=$?
mx=$(python3 -I -c "import json,sys; s=json.load(open(sys.argv[1])); print(max(x[1] for x in s) if s else 0)" "$O/loadavg.json" 2>/dev/null || echo 0)
done_pairs=$(grep -c '^pair .*control LCP' "$O/run.log")
echo "exit=$st max_load=$mx pairs=$done_pairs/$PAIRS" >>"$O/meta.txt"
v=KEEP; r="gate ok"
if [[ $st -ne 0 ]]; then v=DISCARD; r="exit $st"
elif awk -v m="$mx" 'BEGIN{exit !(m > 10)}'; then v=DISCARD; r="load $mx"
elif [[ "$done_pairs" -lt 3 ]]; then v=DISCARD; r="only $done_pairs pairs"; fi
echo "$(date '+%Y-%m-%dT%H:%M:%S') $v $(basename "$O") $r; load max $mx, pairs $done_pairs/$PAIRS" >>"$T/runs/ledger.log"
echo "$O"
[[ $v == KEEP ]]
