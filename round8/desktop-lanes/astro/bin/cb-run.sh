#!/usr/bin/env bash
# cb-run.sh <config> <scenario> <iterations> <warmups> <label>
# One CookieBench run from the lane's private copy.
# - Load gate: waits for a 1-minute load average <= 4 before each attempt,
#   up to 30 min; after that it notes the wait in meta.txt and goes.
# - Queues on /tmp/cookiebench-v3-measurement.lock through the runner
#   (retry every 20 s on "Another measured workload is active").
# - Samples /proc/loadavg every 30 s while the runner process is alive;
#   samples are kept only for the attempt that got the lock.
# - Then runs compare for the report metrics.
# Seed 20261009 on the command line (round-8 brief).
set -uo pipefail
A=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/astro
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
CONFIG="$1"; SCEN="$2"; IT="$3"; WU="$4"; LABEL="$5"
OUT="$A/runs/$LABEL-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
cp "$CONFIG" "$OUT/config.json"
CB="$A/work/cookiebench"
echo "config=$CONFIG scenario=$SCEN iterations=$IT warmups=$WU seed=20261009 c15t=$(cat "$A/packs.head")" >"$OUT/meta.txt"
gate_start=$(date +%s)
while :; do
	while awk '{exit !($1 > 4)}' /proc/loadavg; do
		if (($(date +%s) - gate_start > 1800)); then
			echo "load gate: waited 30 min, load $(cut -d' ' -f1 /proc/loadavg), starting anyway" >>"$OUT/meta.txt"
			break
		fi
		sleep 15
	done
	echo "attempt $(date +%T) load $(cut -d' ' -f1 /proc/loadavg)" >>"$OUT/attempts.log"
	date +%s >"$OUT/started"
	(cd "$CB" && exec node packages/cli/src/index.ts run --config "$OUT/config.json" --scenario "$SCEN" \
		--iterations "$IT" --warmups "$WU" --seed 20261009 --output "$OUT/envelope.json") \
		>"$OUT/run.stdout.json" 2>"$OUT/run.stderr.log" &
	RUNNER=$!
	: >"$OUT/loadavg.txt"
	while kill -0 $RUNNER 2>/dev/null; do
		echo "$(date +%s) $(cut -d' ' -f1-3 /proc/loadavg)" >>"$OUT/loadavg.txt"
		for _ in $(seq 30); do kill -0 $RUNNER 2>/dev/null || break; sleep 1; done
	done
	wait $RUNNER; STATUS=$?
	date +%s >"$OUT/ended"
	if [[ $STATUS -ne 0 ]] && grep -q "Another measured workload is active" "$OUT/run.stdout.json" "$OUT/run.stderr.log" 2>/dev/null; then
		echo "$(date +%T) lock held, waiting" >>"$OUT/lock-wait.log"
		sleep 20
		gate_start=$(date +%s)
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
echo "$OUT"
exit $STATUS
