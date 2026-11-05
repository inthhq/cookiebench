#!/usr/bin/env bash
# drive.sh: plan1b (rest of phase 1) -> c15t waterfall (5 pairs, up to 4
# attempts) -> plan2. One process, so nothing races.
set -uo pipefail
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
L=$LCP/frameworks/sveltekit
"$L/bin/queue.sh" "$L/bin/plan1b.txt"
[[ -f "$L/STOP" ]] && exit 0
for attempt in 1 2 3 4; do
	echo "$(date +%FT%T) start c15t-waterfall attempt $attempt" >>"$L/runs/queue.log"
	dir=$("$L/bin/waterfall-run.sh" c15t-waterfall 5 | tail -1)
	[[ -d "$dir" ]] && break
done
"$L/bin/queue.sh" "$L/bin/plan2.txt"
echo "$(date +%FT%T) drive finished" >>"$L/runs/queue.log"
