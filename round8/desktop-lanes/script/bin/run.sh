#!/usr/bin/env bash
# run.sh <config> <scenario> <iterations> <label>
# One CookieBench run from the lane's private copy: seed 20261009, 3 warm-ups.
# Before every runner start (including lock retries) waits for 1-min load < 4,
# up to 30 min in total, then notes it and goes. The runner takes
# /tmp/cookiebench-v3-measurement.lock itself; on "Another measured workload"
# this retries every 20 s. Load is sampled every 30 s with the lock owner PID,
# so check.py can keep only samples taken while this run held the lock.
# (Adapted from remeasure/bin/run.sh.) Prints the run dir.
set -uo pipefail
S=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/script
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
CONFIG="$1"; SCEN="$2"; IT="$3"; LABEL="$4"
CB="$S/work/canary/cookiebench"
OUT="$S/runs/$LABEL-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
cp "$CONFIG" "$OUT/config.json"
echo "config=$CONFIG scenario=$SCEN iterations=$IT warmups=3 seed=20261009 cookiebench=$CB c15t=$(cat $S/packs/canary.head)" >"$OUT/meta.txt"
LOCK=/tmp/cookiebench-v3-measurement.lock
( while :; do echo "$(date +%s) $(cut -d' ' -f1-3 /proc/loadavg) $(cat $LOCK 2>/dev/null || echo -)"; sleep 30; done ) >"$OUT/loadavg.txt" &
SAMPLER=$!
GATE_DEADLINE=$(( $(date +%s) + 1800 ))
while :; do
	# Gate: start under load 4. After 30 min of waiting, start under load 8
	# (a run with any sample above 8 is discarded anyway, and a doomed run
	# would hold the shared lock during other lanes' quiet windows).
	NOTED=0
	while ! awk '{exit !($1 < 4)}' /proc/loadavg; do
		if (( $(date +%s) >= GATE_DEADLINE )); then
			if awk '{exit !($1 <= 8)}' /proc/loadavg; then
				echo "$(date +%T) load $(cut -d' ' -f1 /proc/loadavg) >= 4 after 30 min of gate waiting, <= 8, starting" >>"$OUT/gate.log"
				break
			fi
			if (( NOTED == 0 )); then
				echo "$(date +%T) load $(cut -d' ' -f1 /proc/loadavg) > 8 after 30 min of gate waiting, waiting for <= 8" >>"$OUT/gate.log"; NOTED=1
			fi
		fi
		sleep 15
	done
	echo "$(date +%T) start load=$(cut -d' ' -f1 /proc/loadavg)" >>"$OUT/gate.log"
	(cd "$CB" && exec node packages/cli/src/index.ts run --config "$OUT/config.json" --scenario "$SCEN" \
		--iterations "$IT" --warmups 3 --seed 20261009 --output "$OUT/envelope.json") \
		>"$OUT/run.stdout.json" 2>"$OUT/run.stderr.log" &
	RUNNER=$!
	echo "$RUNNER" >>"$OUT/runner.pids"
	date +%s >>"$OUT/started"
	wait $RUNNER
	STATUS=$?
	date +%s >>"$OUT/ended"
	if [[ $STATUS -ne 0 ]] && grep -q "Another measured workload is active" "$OUT/run.stdout.json" "$OUT/run.stderr.log" 2>/dev/null; then
		echo "$(date +%T) lock held, waiting 20 s" >>"$OUT/lock-wait.log"
		sleep 20
		continue
	fi
	break
done
kill $SAMPLER 2>/dev/null; wait $SAMPLER 2>/dev/null
echo "exit=$STATUS" >>"$OUT/meta.txt"
if [[ -f "$OUT/envelope.json" ]]; then
	for m in page.lcp page.fcp initial.transfer initial.requests initial.long-task-blocking banner.visible \
		action.input-to-next-paint action.dismissed action.consent-effective action.scripts-complete action.preferences-visible; do
		(cd "$CB" && node packages/cli/src/index.ts compare --baseline "$OUT/envelope.json" \
			--candidate "$OUT/envelope.json" --metric "$m") >"$OUT/compare-$m.json" 2>>"$OUT/compare.stderr.log" || true
	done
fi
echo "$OUT"
