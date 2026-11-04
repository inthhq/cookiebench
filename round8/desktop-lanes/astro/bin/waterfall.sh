#!/usr/bin/env bash
# waterfall.sh <label> [pairs]: own-script waterfall (waterfall-astro.mjs) for
# the c15t arm, mobile profile, under the same load gate (<= 4, 30 min max)
# and the machine-wide lock (the script takes it itself). The script starts
# and stops its own fixture server on 4315 and samples load every 10 s.
set -uo pipefail
A=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/astro
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
LABEL="$1"; PAIRS="${2:-5}"
OUT="$A/runs/$LABEL-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
echo "waterfall pairs=$PAIRS c15t=$(cat "$A/packs.head")" >"$OUT/meta.txt"
gate_start=$(date +%s)
while awk '{exit !($1 > 4)}' /proc/loadavg; do
	if (($(date +%s) - gate_start > 1800)); then
		echo "load gate: waited 30 min, load $(cut -d' ' -f1 /proc/loadavg), starting anyway" >>"$OUT/meta.txt"
		break
	fi
	sleep 15
done
date +%s >"$OUT/started"
node "$A/bin/waterfall-astro.mjs" --cookiebench "$A/work/cookiebench" \
	--fixture "$A/work/cookiebench/benchmarks/with-c15t-astro" --port 4315 \
	--profile mobile --visits "$PAIRS" --out "$OUT" >"$OUT/stdout.log" 2>"$OUT/stderr.log"
echo "exit=$?" >>"$OUT/meta.txt"
date +%s >"$OUT/ended"
echo "$OUT"
