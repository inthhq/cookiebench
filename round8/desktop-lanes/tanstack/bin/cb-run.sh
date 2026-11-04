#!/usr/bin/env bash
# cb-run.sh <config> <scenario> <iterations> <label>
# One CookieBench run for the tanstack lane, 3 warm-ups, seed 20261009.
# - Load gate: waits while the 1-minute load is above 4, up to 30 min, then
#   notes it in meta.txt and goes.
# - Queues on /tmp/cookiebench-v3-measurement.lock through the runner, retry
#   every 20 s on "Another measured workload is active".
# - Samples /proc/loadavg every 30 s while the attempt runs (the file is
#   truncated on each attempt, so only lock-holding time is kept).
# - Runs compare for the report metrics, then check.py appends the verdict
#   to runs/ledger.log.
set -uo pipefail
T=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/tanstack
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
CONFIG="$1"; SCEN="$2"; IT="$3"; LABEL="$4"; WU=3
OUT="$T/runs/$LABEL-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
cp "$CONFIG" "$OUT/config.json"
CB="$T/work/canary/cookiebench"
echo "config=$CONFIG scenario=$SCEN iterations=$IT warmups=$WU seed=20261009 runner=$CB" >"$OUT/meta.txt"
gated=0
while :; do
	# Load gate (brief): wait for load <= 4, at most 30 min in total per
	# run, then note it and go. check.py discards a run whose load went > 8.
	while (( gated < 1800 )) && awk '{exit !($1 > 4)}' /proc/loadavg; do sleep 15; gated=$((gated + 15)); done
	if (( gated >= 1800 )) && awk '{exit !($1 > 4)}' /proc/loadavg; then
		echo "$(date +%T) load gate: $(cut -d' ' -f1 /proc/loadavg) > 4 after 30 min, going" >>"$OUT/meta.txt"
	fi
	( while :; do echo "$(date +%s) $(cut -d' ' -f1-3 /proc/loadavg)"; sleep 30; done ) >"$OUT/loadavg.txt" &
	SAMPLER=$!
	date +%s >"$OUT/started"
	(cd "$CB" && node packages/cli/src/index.ts run --config "$OUT/config.json" --scenario "$SCEN" \
		--iterations "$IT" --warmups "$WU" --seed 20261009 --output "$OUT/envelope.json") \
		>"$OUT/run.stdout.json" 2>"$OUT/run.stderr.log"
	STATUS=$?
	kill $SAMPLER 2>/dev/null; wait $SAMPLER 2>/dev/null
	date +%s >"$OUT/ended"
	if [[ $STATUS -ne 0 ]] && grep -q "Another measured workload is active" "$OUT/run.stdout.json" "$OUT/run.stderr.log" 2>/dev/null; then
		echo "$(date +%T) lock held, waiting" >>"$OUT/lock-wait.log"
		sleep 20
		continue
	fi
	break
done
echo "exit=$STATUS" >>"$OUT/meta.txt"
if [[ -f "$OUT/envelope.json" ]]; then
	for m in page.lcp page.fcp initial.transfer initial.requests initial.long-task-blocking banner.visible \
		action.input-to-next-paint action.consent-effective action.dismissed action.scripts-complete action.preferences-visible; do
		(cd "$CB" && node packages/cli/src/index.ts compare --baseline "$OUT/envelope.json" \
			--candidate "$OUT/envelope.json" --metric "$m") >"$OUT/compare-$m.json" 2>>"$OUT/compare.stderr.log" || true
	done
fi
python3 -I "$T/bin/check.py" "$OUT" --ledger
echo "$OUT"
exit $STATUS
