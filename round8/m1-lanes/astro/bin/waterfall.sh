#!/usr/bin/env bash
# waterfall.sh <label> [pairs]: own-script waterfall (waterfall-astro.mjs) for
# the c15t arm, mobile profile, M1 port. Load gate <= 6 (30 min max); the
# script takes the machine lock (/tmp/cookiebench-v3-measurement.lock) itself,
# starts and stops the fixture server on 4315, samples load every 10 s.
set -uo pipefail
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
A=$LCP/frameworks/astro
LABEL="$1"; PAIRS="${2:-5}"
OUT="$A/runs/$LABEL-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
echo "waterfall pairs=$PAIRS c15t=$(cat "$LCP/packs/canary/packs.head")" >"$OUT/meta.txt"
load1() { sysctl -n vm.loadavg | awk '{print $2}'; }
gate_start=$(date +%s)
while awk -v l="$(load1)" 'BEGIN{exit !(l > 6)}'; do
	if (($(date +%s) - gate_start > 1800)); then
		echo "load gate: waited 30 min, load $(load1), starting anyway" >>"$OUT/meta.txt"
		break
	fi
	sleep 15
done
echo "gate_passed=$(date +%s) load=$(load1)" >>"$OUT/meta.txt"
date +%s >"$OUT/started"
node "$A/bin/waterfall-astro.mjs" --cookiebench "$CB" \
	--fixture "$CB/benchmarks/with-c15t-astro" --port 4315 \
	--profile mobile --visits "$PAIRS" --out "$OUT" >"$OUT/stdout.log" 2>"$OUT/stderr.log"
echo "exit=$?" >>"$OUT/meta.txt"
date +%s >"$OUT/ended"
echo "$OUT"
