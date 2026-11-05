#!/usr/bin/env bash
# tanstack-lane copy of tools/bin/cb-run.sh: also retries when CookieBench loses the lock-recovery race (EEXIST on .lock.recovery).
# cb-run.sh <lane> <config> <scenario|-> <iterations> <warmups> <label> [verify]
#
# One CookieBench run from the shared worktree, into
# frameworks/<lane>/runs/<label>-<YYYYmmdd-HHMMSS>/ (config.json, envelope.json,
# run.stdout.json, run.stderr.log, loadavg.txt, started, ended, meta.txt,
# compare-<metric>.json). Prints the run directory on the last line.
#
# Load gate: waits until the 1-minute load is <= GATE (default 6), up to
# 30 min, then notes it in meta.txt and goes. NO_GATE=1 skips it (smokes).
# Lock: the runner takes $TMPDIR/cookiebench-v3-measurement.lock (env.sh sets
# TMPDIR=/tmp); on "Another measured workload is active" this retries every 20 s.
# Load is sampled every 30 s while the runner holds the lock (loadavg.txt:
# epoch 1m 5m 15m). Discard rule (BRIEF-M1): any sample above 10.
# 7th arg "verify" runs `capabilities verify` (correctness) instead of `run`.
# Seed is always 20261009. Wrap long queues in `caffeinate -dims`.
set -uo pipefail
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
LANE="$1"; CONFIG="$2"; SCEN="$3"; IT="$4"; WU="$5"; LABEL="$6"; MODE="${7:-run}"
GATE="${GATE:-6}"
L="$LCP/frameworks/$LANE"
OUT="$L/runs/$LABEL-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
cp "$CONFIG" "$OUT/config.json"
load1() { sysctl -n vm.loadavg | awk '{print $2}'; }
load3() { sysctl -n vm.loadavg | awk '{print $2, $3, $4}'; }
echo "lane=$LANE config=$CONFIG scenario=$SCEN iterations=$IT warmups=$WU seed=20261009 mode=$MODE canary=$(cat $LCP/packs/canary/packs.head) node=$(node --version)" >"$OUT/meta.txt"
ARGS=(--config "$OUT/config.json" --iterations "$IT" --warmups "$WU" --seed 20261009 --output "$OUT/envelope.json")
[[ "$SCEN" != "-" ]] && ARGS+=(--scenario "$SCEN")
CMD=(run); [[ "$MODE" == verify ]] && CMD=(capabilities verify)
gate_start=$(date +%s)
while :; do
	while [[ "${NO_GATE:-}" != 1 ]] && awk -v g="$GATE" -v l="$(load1)" 'BEGIN{exit !(l > g)}'; do
		if (( $(date +%s) - gate_start > 1800 )); then
			echo "load gate: still $(load1) after 30 min, going" >>"$OUT/meta.txt"; break
		fi
		sleep 15
	done
	echo "gate_passed=$(date +%s) load=$(load1)" >>"$OUT/meta.txt"
	( while :; do echo "$(date +%s) $(load3)"; sleep 30; done ) >"$OUT/loadavg.txt" &
	SAMPLER=$!
	date +%s >"$OUT/started"
	rm -f "$OUT/envelope.json"
	(cd "$CB" && node packages/cli/src/index.ts "${CMD[@]}" "${ARGS[@]}") \
		>"$OUT/run.stdout.json" 2>"$OUT/run.stderr.log"
	STATUS=$?
	kill $SAMPLER 2>/dev/null; wait $SAMPLER 2>/dev/null
	date +%s >"$OUT/ended"
	if [[ $STATUS -ne 0 ]] && grep -qE "Another measured workload is active|cookiebench-v3-measurement.lock.recovery" "$OUT/run.stdout.json" "$OUT/run.stderr.log" 2>/dev/null; then
		echo "$(date +%T) lock held, waiting" >>"$OUT/lock-wait.log"
		sleep 20
		continue
	fi
	break
done
echo "exit=$STATUS max_load=$(awk 'BEGIN{m=0}{if($2>m)m=$2}END{print m}' "$OUT/loadavg.txt")" >>"$OUT/meta.txt"
if [[ -f "$OUT/envelope.json" && "$MODE" == run ]]; then
	for m in page.lcp page.fcp initial.transfer initial.requests initial.long-task-blocking banner.visible action.input-to-next-paint action.consent-effective action.dismissed action.scripts-complete action.preferences-visible; do
		(cd "$CB" && node packages/cli/src/index.ts compare --baseline "$OUT/envelope.json" \
			--candidate "$OUT/envelope.json" --metric "$m") >"$OUT/compare-$m.json" 2>>"$OUT/compare.stderr.log" || true
	done
fi
echo "$OUT"
exit $STATUS
