#!/usr/bin/env bash
# wf-now.sh <arm>...: waterfalls (5 pairs) outside the main queue, same gate
# as queue.sh's WF (<= 30 min for load <= 4), lock taken by the script.
set -uo pipefail
T=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/tanstack
cd "$T"; source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
for arm in "$@"; do
	o="$T/runs/w1-$arm-waterfall-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$o"
	waited=0
	while awk '{exit !($1 > 4)}' /proc/loadavg && ((waited < 1800)); do sleep 15; waited=$((waited + 15)); done
	echo "load gate waited ${waited}s, load at start $(cut -d' ' -f1 /proc/loadavg)" >"$o/meta.txt"
	cb="$T/work/$arm/cookiebench"
	node bin/waterfall-tanstack.mjs --cookiebench "$cb" --fixture "$cb/benchmarks/with-c15t-tanstack-start" \
		--port 4316 --visits 5 --out "$o" >"$o/run.log" 2>&1
	echo "exit=$?" >>"$o/meta.txt"
	echo "$(date +%T) waterfall $arm -> $o" >>"$T/runs/queue.log"
done
