#!/usr/bin/env bash
# wf-job.sh <arm c15t|headless|cookieyes> <profile mobile|desktop> <visits> <label>
# Gate as run.sh (load < 4, after 30 min <= 8), then waterfall-script.mjs,
# which takes /tmp/cookiebench-v3-measurement.lock itself. Load sampled every
# 30 s with the lock owner. Ledger line: KEEP if every sample taken while the
# lock was ours is <= 8, else KEEP-DIRECTIONAL (bytes only) with the max.
set -uo pipefail
S=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/script
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
ARM=$1 PROF=$2 N=$3 LABEL=$4
if grep -qE "^[0-9-]+ [0-9:]+ KEEP(-DIRECTIONAL)? $LABEL " $S/runs/ledger.log; then exit 0; fi
OUT=$S/runs/$LABEL-$(date +%Y%m%d-%H%M%S); mkdir -p $OUT
LOCK=/tmp/cookiebench-v3-measurement.lock
DEADLINE=$(( $(date +%s) + 1800 ))
while ! awk '{exit !($1 < 4)}' /proc/loadavg; do
	(( $(date +%s) >= DEADLINE )) && awk '{exit !($1 <= 8)}' /proc/loadavg && break
	sleep 15
done
echo "$(date +%T) start load=$(cut -d' ' -f1 /proc/loadavg)" >$OUT/gate.log
( while :; do echo "$(date +%s) $(cut -d' ' -f1-3 /proc/loadavg) $(cat $LOCK 2>/dev/null || echo -)"; sleep 30; done ) >$OUT/loadavg.txt &
SAMPLER=$!
node $S/bin/waterfall-script.mjs --cookiebench $S/work/canary/cookiebench \
	--fixture $S/work/canary/cookiebench/benchmarks/with-c15t-script --port 4310 \
	--profile $PROF --visits $N --arm $ARM --out $OUT >$OUT/stdout.log 2>&1 &
WF=$!; echo $WF >$OUT/runner.pids; wait $WF; ST=$?
kill $SAMPLER 2>/dev/null; wait $SAMPLER 2>/dev/null
echo "exit=$ST arm=$ARM profile=$PROF visits=$N c15t=$(cat $S/packs/canary.head)" >$OUT/meta.txt
MAX=$(awk -v p=$WF '$5==p{if($2>m)m=$2} END{print m+0}' $OUT/loadavg.txt)
# waterfall's own 10 s samples while it held the lock
MAX2=$(python3 -I -c "import json;d=json.load(open('$OUT/loadavg.json'));print(max([x[1] for x in d] or [0]))" 2>/dev/null || echo 0)
V="exit=$ST load_max_30s=$MAX load_max_10s=$MAX2"
if [[ $ST -ne 0 ]]; then echo "$(date '+%F %T') DISCARD $LABEL $(basename $OUT) $V" >>$S/runs/ledger.log; exit 1; fi
if awk -v a=$MAX -v b=$MAX2 'BEGIN{exit !(a<=8 && b<=8)}'; then
	echo "$(date '+%F %T') KEEP $LABEL $(basename $OUT) $V" >>$S/runs/ledger.log
else
	echo "$(date '+%F %T') KEEP-DIRECTIONAL $LABEL $(basename $OUT) $V (bytes only; load over 8)" >>$S/runs/ledger.log
fi
