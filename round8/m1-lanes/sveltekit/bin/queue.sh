#!/usr/bin/env bash
# queue.sh <plan-file>
# Plan line: <label> <config> <scenario> <iterations> <warmups>
# Runs each item through $LCP/tools/bin/cb-run.sh, judges it (BRIEF-M1 rules:
# load sample > 10, mobile control FCP median > 400, failed sample), writes one
# ledger line per attempt, moves discarded runs to runs/_discarded/, and tries
# each item up to 4 times. A run that never started because two runners raced
# on the lock's .recovery guard (EEXIST) is logged as DISCARD lock-race and not
# counted (max 20 of those per item).
set -uo pipefail
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
L=$LCP/frameworks/sveltekit
mkdir -p "$L/runs/_discarded"
while read -r label config scen it wu; do
	[[ -z "$label" || "$label" == \#* ]] && continue
	[[ -f "$L/STOP" ]] && { echo "$(date +%FT%T) STOP file" >>"$L/runs/queue.log"; break; }
	attempt=1; races=0
	while (( attempt <= 4 && races <= 20 )); do
		echo "$(date +%FT%T) start $label attempt $attempt" >>"$L/runs/queue.log"
		dir=$("$LCP/tools/bin/cb-run.sh" sveltekit "$L/configs/$config" "$scen" "$it" "$wu" "$label" | tail -1)
		gateinfo=$(grep -h '^gate_passed\|load gate' "$dir/meta.txt" | tail -1)
		if [[ ! -f "$dir/envelope.json" ]] && grep -q 'cookiebench-v3-measurement.lock.recovery' "$dir/run.stdout.json" "$dir/run.stderr.log" 2>/dev/null; then
			echo "$(date +%FT%T) DISCARD $(basename "$dir") lock-race (EEXIST on .recovery, no samples; not counted); $gateinfo" >>"$L/runs/ledger.log"
			mv "$dir" "$L/runs/_discarded/"; races=$((races + 1)); sleep 7
			continue
		fi
		verdict=$(python3 -I "$L/bin/judge.py" "$dir")
		gate=$(sed -n 1p <<<"$verdict"); info=$(sed -n 2p <<<"$verdict")
		if [[ "$gate" == ok ]]; then
			echo "$(date +%FT%T) KEEP $(basename "$dir") attempt=$attempt $info; $gateinfo" >>"$L/runs/ledger.log"
			break
		fi
		echo "$(date +%FT%T) DISCARD $(basename "$dir") attempt=$attempt ${gate#DISCARD: }; $info; $gateinfo" >>"$L/runs/ledger.log"
		mv "$dir" "$L/runs/_discarded/"
		# Deterministic failure (every candidate sample unsupported-action, as
		# CookieYes save did on Nuxt): one confirming attempt, then stop.
		if (( attempt >= 2 )) && grep -q 'passed=0/' <<<"$info" && grep -q 'unsupported-action' <<<"$info"; then
			echo "$(date +%FT%T) GIVEUP $label: every candidate sample unsupported-action twice" >>"$L/runs/ledger.log"
			break
		fi
		attempt=$((attempt + 1))
	done
done <"$1"
echo "$(date +%FT%T) queue $1 finished" >>"$L/runs/queue.log"
