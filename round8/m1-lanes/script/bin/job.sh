#!/usr/bin/env bash
# job.sh <label> <config> <scenario> <iterations> <warmups> <fcp-limit|none> [max-attempts=4]
# cb-run.sh under caffeinate, check.py, KEEP or DISCARD (dir renamed _discarded-*),
# retry up to max attempts. Ledger: runs/ledger.log, one line per attempt:
# <time> KEEP|DISCARD|LOCKRACE|GAVE-UP <label> <run-dir> <check json>
# A runner exit on "EEXIST ... measurement.lock.recovery" means two contenders
# raced for the lock's recovery guard; the runner never measured. That is logged
# as LOCKRACE, does not count as an attempt, and is retried after 20 s.
set -uo pipefail
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
S=$LCP/frameworks/script; LEDGER=$S/runs/ledger.log
label=$1 cfg=$2 scen=$3 it=$4 wu=$5 lim=$6 max=${7:-4}
if grep -qE "^[0-9-]+ [0-9:]+ KEEP $label " "$LEDGER" 2>/dev/null; then exit 0; fi
a=0; races=0
while (( a < max )); do
	dir=$(caffeinate -dims $LCP/tools/bin/cb-run.sh script "$cfg" "$scen" "$it" "$wu" "$label" | tail -1)
	if [[ ! -f "$dir/envelope.json" ]] && grep -q "measurement.lock.recovery" "$dir/run.stdout.json" "$dir/run.stderr.log" 2>/dev/null && (( races < 60 )); then
		races=$((races+1))
		echo "$(date '+%F %T') LOCKRACE $label $(basename $dir) runner lost the lock.recovery race, never measured; retrying" >>"$LEDGER"
		rm -rf "$dir"; sleep 20; continue
	fi
	a=$((a+1))
	v=$(python3 -I $S/bin/check.py "$dir" "$lim"); st=$?
	if [[ $st -eq 0 ]]; then
		echo "$(date '+%F %T') KEEP $label $(basename $dir) attempt=$a $v" >>"$LEDGER"; exit 0
	fi
	echo "$(date '+%F %T') DISCARD $label $(basename $dir) attempt=$a $v" >>"$LEDGER"
	mv "$dir" "$S/runs/_discarded-$(basename $dir)"
done
echo "$(date '+%F %T') GAVE-UP $label after $max attempts" >>"$LEDGER"
exit 1
