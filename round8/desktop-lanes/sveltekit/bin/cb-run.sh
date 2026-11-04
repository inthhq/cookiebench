#!/usr/bin/env bash
# cb-run.sh <config> <scenario|-> <iterations> <warmups> <label> [verify]
# Runs CookieBench from this lane's private copy. Load gate: waits until the
# 1-minute load is <= 4 (up to 30 min, then notes it and goes). Queues on
# /tmp/cookiebench-v3-measurement.lock (the runner takes it; retry every
# 20 s). Samples /proc/loadavg every 30 s while running. Then compare.
# With a 6th arg "verify", runs `capabilities verify` (all scenarios).
set -uo pipefail
L=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/sveltekit
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
CONFIG="$1"; SCEN="$2"; IT="$3"; WU="$4"; LABEL="$5"; MODE="${6:-run}"
OUT="$L/runs/$LABEL-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
cp "$CONFIG" "$OUT/config.json"
CB="$L/work/cookiebench"
echo "config=$CONFIG scenario=$SCEN iterations=$IT warmups=$WU seed=20261009 mode=$MODE c15t=$(cat $L/packs.head)" >"$OUT/meta.txt"
ARGS=(--config "$OUT/config.json" --iterations "$IT" --warmups "$WU" --seed 20261009 --output "$OUT/envelope.json")
[[ "$SCEN" != "-" ]] && ARGS+=(--scenario "$SCEN")
CMD=(run); [[ "$MODE" == verify ]] && CMD=(capabilities verify)
gate_start=$(date +%s)
while :; do
	while [[ "${NO_GATE:-}" != 1 ]] && awk '{exit !($1 > 4)}' /proc/loadavg; do
		if (( $(date +%s) - gate_start > 1800 )); then
			echo "load gate: still $(cut -d' ' -f1 /proc/loadavg) after 30 min, going" >>"$OUT/meta.txt"; break
		fi
		sleep 15
	done
	echo "gate_passed=$(date +%s) load=$(cut -d' ' -f1 /proc/loadavg)" >>"$OUT/meta.txt"
	( while :; do echo "$(date +%s) $(cut -d' ' -f1-3 /proc/loadavg)"; sleep 30; done ) >"$OUT/loadavg.txt" &
	SAMPLER=$!
	date +%s >"$OUT/started"
	(cd "$CB" && node packages/cli/src/index.ts "${CMD[@]}" "${ARGS[@]}") \
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
if [[ -f "$OUT/envelope.json" && "$MODE" == run ]]; then
	for m in page.lcp page.fcp initial.transfer initial.requests initial.long-task-blocking banner.visible action.input-to-next-paint action.consent-effective action.dismissed action.scripts-complete action.preferences-visible; do
		(cd "$CB" && node packages/cli/src/index.ts compare --baseline "$OUT/envelope.json" \
			--candidate "$OUT/envelope.json" --metric "$m") >"$OUT/compare-$m.json" 2>>"$OUT/compare.stderr.log" || true
	done
fi
echo "$OUT"
exit $STATUS
