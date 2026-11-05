#!/usr/bin/env bash
# wf-job.sh <arm c15t|headless|cookieyes> <profile mobile|desktop> <visits> <label> [max-attempts=4]
# Gate like cb-run.sh (1-min load <= 6, wait up to 30 min, then go), then
# waterfall-script.mjs, which takes /tmp/cookiebench-v3-measurement.lock itself
# and samples load every 10 s while it holds it (loadavg.json); this also samples
# every 30 s (loadavg.txt). KEEP if every sample <= 10, else DISCARD and retry.
set -uo pipefail
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
S=$LCP/frameworks/script; LEDGER=$S/runs/ledger.log
ARM=$1 PROF=$2 N=$3 LABEL=$4 MAXA=${5:-4}
if grep -qE "^[0-9-]+ [0-9:]+ KEEP $LABEL " $LEDGER 2>/dev/null; then exit 0; fi
load1() { sysctl -n vm.loadavg | awk '{print $2}'; }
for a in $(seq 1 $MAXA); do
	OUT=$S/runs/$LABEL-$(date +%Y%m%d-%H%M%S); mkdir -p $OUT
	G0=$(date +%s); NOTE=""
	while awk -v l="$(load1)" 'BEGIN{exit !(l > 6)}'; do
		if (( $(date +%s) - G0 > 1800 )); then NOTE="gate timed out"; break; fi
		sleep 15
	done
	echo "$(date +%T) start load=$(load1) $NOTE" >$OUT/gate.log
	( while :; do echo "$(date +%s) $(sysctl -n vm.loadavg | awk '{print $2, $3, $4}')"; sleep 30; done ) >$OUT/loadavg.txt &
	SAMPLER=$!
	caffeinate -dims node $S/bin/waterfall-script.mjs --cookiebench $CB \
		--fixture $CB/benchmarks/with-c15t-script --port 4310 \
		--profile $PROF --visits $N --arm $ARM --out $OUT >$OUT/stdout.log 2>&1
	ST=$?
	kill $SAMPLER 2>/dev/null; wait $SAMPLER 2>/dev/null
	echo "exit=$ST arm=$ARM profile=$PROF visits=$N canary=$(cat $LCP/packs/canary/packs.head)" >$OUT/meta.txt
	MAX=$(awk '{if($2>m)m=$2} END{print m+0}' $OUT/loadavg.txt)
	MAX2=$(python3 -I -c "import json;d=json.load(open('$OUT/loadavg.json'));print(max([x[1] for x in d] or [0]))" 2>/dev/null || echo 0)
	V="exit=$ST load_max_30s=$MAX load_max_10s=$MAX2 gate=$(cat $OUT/gate.log)"
	if [[ $ST -eq 0 ]] && awk -v a=$MAX -v b=$MAX2 'BEGIN{exit !(a<=10 && b<=10)}'; then
		echo "$(date '+%F %T') KEEP $LABEL $(basename $OUT) attempt=$a $V" >>$LEDGER; exit 0
	fi
	echo "$(date '+%F %T') DISCARD $LABEL $(basename $OUT) attempt=$a $V" >>$LEDGER
	mv $OUT $S/runs/_discarded-$(basename $OUT)
done
echo "$(date '+%F %T') GAVE-UP $LABEL after $MAXA attempts" >>$LEDGER
exit 1
