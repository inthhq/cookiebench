#!/usr/bin/env bash
# job.sh <label> <config> <scenario> <iterations> <fcp-limit|none> [max-attempts]
# Run, check, keep or discard (moved to runs/_discarded-*), retry up to N.
# Ledger: runs/ledger.log, one line per run: <time> KEEP|DISCARD <label> <reason>.
set -uo pipefail
S=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/script
LEDGER=$S/runs/ledger.log
label=$1 cfg=$2 scen=$3 it=$4 lim=$5 max=${6:-10}
# resumable: skip a label that already has a KEEP line
if grep -qE "^[0-9-]+ [0-9:]+ KEEP $label " "$LEDGER" 2>/dev/null; then exit 0; fi
for a in $(seq 1 $max); do
	dir=$($S/bin/run.sh "$cfg" "$scen" "$it" "$label" | tail -1)
	v=$(python3 -I $S/bin/check.py "$dir" "$lim"); st=$?
	if [[ $st -eq 0 ]]; then
		echo "$(date '+%F %T') KEEP $label $(basename $dir) $v" >>"$LEDGER"; exit 0
	fi
	echo "$(date '+%F %T') DISCARD $label $(basename $dir) $v" >>"$LEDGER"
	mv "$dir" "$S/runs/_discarded-$(basename $dir)"
done
echo "$(date '+%F %T') GAVE-UP $label after $max attempts" >>"$LEDGER"
exit 1
