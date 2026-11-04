#!/usr/bin/env bash
# queue.sh <plan-file>
# Each plan line: <label> <config> <scenario> <iterations> <warmups>
# Runs each item through cb-run.sh, judges it with table.py (brief's discard
# rules), logs KEEP/DISCARD to runs/ledger.log, moves discarded runs to
# runs/_discarded/ and retries (max 30 attempts per item).
set -uo pipefail
L=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/sveltekit
mkdir -p "$L/runs/_discarded"
while read -r label config scen it wu; do
	[[ -z "$label" || "$label" == \#* ]] && continue
	[[ -f "$L/STOP" ]] && { echo "STOP file" >>"$L/runs/queue.log"; break; }
	for attempt in $(seq 1 30); do
		dir=$("$L/bin/cb-run.sh" "$L/configs/$config" "$scen" "$it" "$wu" "$label" | tail -1)
		verdict=$(python3 -I "$L/bin/judge.py" "$dir")
		gate=$(sed -n 1p <<<"$verdict"); info=$(sed -n 2p <<<"$verdict")
		if [[ "$gate" == ok ]]; then
			echo "$(date -Is) KEEP $(basename "$dir") $info" >>"$L/runs/ledger.log"
			break
		fi
		echo "$(date -Is) DISCARD $(basename "$dir") ${gate#DISCARD: }; $info" >>"$L/runs/ledger.log"
		mv "$dir" "$L/runs/_discarded/"
	done
done <"$1"
echo "queue $1 finished $(date -Is)" >>"$L/runs/queue.log"
