#!/usr/bin/env bash
# phase2.sh <pid-of-phase1-queue>: waits for phase 1, runs the c15t waterfall
# (5 pairs, up to 4 attempts), then plan2 (remaining scenarios, desktop load).
set -uo pipefail
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
L=$LCP/frameworks/sveltekit
while kill -0 "$1" 2>/dev/null; do sleep 20; done
[[ -f "$L/STOP" ]] && exit 0
for attempt in 1 2 3 4; do
	echo "$(date +%FT%T) start c15t-waterfall attempt $attempt" >>"$L/runs/queue.log"
	dir=$("$L/bin/waterfall-run.sh" c15t-waterfall 5 | tail -1)
	[[ -d "$dir" ]] && break
done
"$L/bin/queue.sh" "$L/bin/plan2.txt"
