#!/usr/bin/env bash
# cb-run.sh <config> <scenario> <iterations> <warmups> <label>
# Runs CookieBench (runner from the canary copy) queued on the machine-wide
# measurement lock (retry every 20 s). Samples the 1-minute load average every
# 10 s while the run holds the lock. Then runs compare for the report metrics.
# Seed comes from the config (October's Nuxt configs: 42).
set -uo pipefail
N=/home/kaylee/.t3/scratch/lcp-fleet/nuxt
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
CONFIG="$1"; SCEN="$2"; IT="$3"; WU="$4"; LABEL="$5"
OUT="$N/runs/$LABEL-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
cp "$CONFIG" "$OUT/config.json"
CB="$N/work/canary/cookiebench"
echo "config=$CONFIG scenario=$SCEN iterations=$IT warmups=$WU" >"$OUT/meta.txt"
while :; do
	# Start only on a quiet machine: the run is discarded if the 1-minute
	# load goes over 8 while it holds the lock.
	while awk '{exit !($1 >= 6)}' /proc/loadavg || [[ -e "$N/.busy" ]]; do sleep 15; done
	( while :; do echo "$(date +%s) $(cut -d' ' -f1-3 /proc/loadavg)"; sleep 10; done ) >"$OUT/loadavg.txt" &
	SAMPLER=$!
	date +%s >"$OUT/started"
	(cd "$CB" && node packages/cli/src/index.ts run --config "$OUT/config.json" --scenario "$SCEN" \
		--iterations "$IT" --warmups "$WU" --output "$OUT/envelope.json") \
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
	for m in page.lcp page.fcp initial.transfer initial.requests banner.visible action.input-to-next-paint action.consent-effective action.dismissed action.scripts-complete; do
		(cd "$CB" && node packages/cli/src/index.ts compare --baseline "$OUT/envelope.json" \
			--candidate "$OUT/envelope.json" --metric "$m") >"$OUT/compare-$m.json" 2>>"$OUT/compare.stderr.log" || true
	done
fi
echo "$OUT"
exit $STATUS
