#!/usr/bin/env bash
# Same-session queue for the tanstack lane: canary, instant-commit (ic) and
# CookieYes interleaved per scenario, then waterfalls, then desktop.
# A run the gate discards is rerun right away, up to 3 attempts in total
# (CookieYes `save`: 1 attempt, its action is unsupported on every
# framework October ran).
set -uo pipefail
T=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/tanstack
cd "$T"
echo $$ >"$T/runs/queue.pid"
C=configs
R() { # R <attempts> <config> <scenario> <n> <label>
	local tries="$1"; shift
	for ((i = 1; i <= tries; i++)); do
		out="$(bin/cb-run.sh "$@" | tail -1)"
		echo "$(date +%T) $4 attempt $i -> $out" >>"$T/runs/queue.log"
		v="$(python3 -I bin/check.py "$out" | python3 -I -c 'import json,sys; print(json.load(sys.stdin)["gate"])' 2>/dev/null)"
		[[ "$v" == KEEP ]] && return 0
	done
	return 0
}
WF() { # WF <arm>
	local arm="$1" o="$T/runs/s1-$arm-waterfall-$(date +%Y%m%d-%H%M%S)"
	mkdir -p "$o"
	local waited=0
	while awk '{exit !($1 > 4)}' /proc/loadavg && ((waited < 1800)); do sleep 15; waited=$((waited + 15)); done
	echo "load gate waited ${waited}s" >"$o/meta.txt"
	source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
	local cb="$T/work/$arm/cookiebench"
	node bin/waterfall-tanstack.mjs --cookiebench "$cb" --fixture "$cb/benchmarks/with-c15t-tanstack-start" \
		--port 4316 --visits 5 --out "$o" >"$o/run.log" 2>&1
	echo "exit=$?" >>"$o/meta.txt"
	echo "$(date +%T) waterfall $arm -> $o" >>"$T/runs/queue.log"
}
echo "$(date +%T) queue start" >>"$T/runs/queue.log"
R 2 $C/c15t-canary-mobile.json load 15 s1-canary-load
R 2 $C/c15t-ic-mobile.json     load 15 s1-ic-load
R 2 $C/cy-mobile.json          load 15 s1-cy-load
for scen in accept reject; do
	R 2 $C/c15t-canary-mobile.json $scen 10 s1-canary-$scen
	R 2 $C/c15t-ic-mobile.json     $scen 10 s1-ic-$scen
	R 2 $C/cy-mobile.json          $scen 10 s1-cy-$scen
done
R 2 $C/c15t-canary-mobile.json save 10 s1-canary-save
R 2 $C/c15t-ic-mobile.json     save 10 s1-ic-save
R 1 $C/cy-mobile.json          save 10 s1-cy-save
R 2 $C/c15t-canary-mobile.json preferences 10 s1-canary-preferences
R 2 $C/c15t-ic-mobile.json     preferences 10 s1-ic-preferences
R 2 $C/c15t-canary-mobile.json returning-accepted 10 s1-canary-returning-accepted
R 2 $C/c15t-ic-mobile.json     returning-accepted 10 s1-ic-returning-accepted
WF canary
WF ic
R 2 $C/c15t-canary-desktop.json load 15 s1-canary-desktop-load
R 2 $C/c15t-ic-desktop.json     load 15 s1-ic-desktop-load
R 2 $C/cy-desktop.json          load 15 s1-cy-desktop-load
echo "$(date +%T) session-done" >>"$T/runs/queue.log"
