#!/usr/bin/env bash
# queue2.sh: reordered session (user decision 17:35, rules unchanged).
# Phase 1, each retried until kept: c15t mobile load, CookieYes mobile load,
#   c15t mobile accept, CookieYes mobile accept; then the c15t waterfall.
# Phase 2 (only after phase 1): reject, save, preferences, returning-accepted,
#   desktop load; up to 4 attempts each.
# Every run: load gate <= 4 (30 min max), machine lock, check.py discard
# rules (load > 8, failed samples, control FCP > 400 on mobile), ledger line.
set -uo pipefail
A=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/astro
C="$A/configs"
log() { echo "$(date +%FT%T) $*" >>"$A/runs/queue.log"; }
kept() { grep -qE "KEEP $1-[0-9]{8}-" "$A/runs/ledger.log" 2>/dev/null; }

job() { # job <config> <scenario> <iterations> <label> <fcp-limit> <max-attempts>
	local cfg=$1 scen=$2 it=$3 label=$4 limit=$5 max=$6 n=0 out
	kept "$label" && return 0
	while ((max == 0 || n < max)); do
		n=$((n + 1))
		log "start $label attempt $n (queue2)"
		out=$("$A/bin/cb-run.sh" "$cfg" "$scen" "$it" 3 "$label" | tail -1)
		if python3 -I "$A/bin/check.py" "$out" "$limit" --ledger >>"$A/runs/queue.log"; then
			log "keep $label -> $out"; return 0
		fi
		if [[ "$label" == cy-mobile-save ]] && grep -q unsupported-action "$out/run.stdout.json"; then
			log "cy save unsupported -> $out"; return 0
		fi
		mv "$out" "$(dirname "$out")/_discarded-$(basename "$out")"
		sed -i "s#DISCARD $(basename "$out")#DISCARD _discarded-$(basename "$out")#" "$A/runs/ledger.log"
		log "discard $label attempt $n (queue2)"
	done
	log "gave up $label after $n attempts (queue2)"
}

waterfall() {
	grep -qE "KEEP c15t-waterfall-" "$A/runs/ledger.log" 2>/dev/null && return 0
	local n=0 out max
	while :; do
		n=$((n + 1))
		log "start waterfall attempt $n"
		out=$("$A/bin/waterfall.sh" c15t-waterfall 5 | tail -1)
		max=$(python3 -I -c "import json,sys; s=json.load(open(sys.argv[1])); print(max(v for _,v in s) if s else 0)" "$out/loadavg.json" 2>/dev/null || echo 999)
		if grep -q 'exit=0' "$out/meta.txt" && awk -v m="$max" 'BEGIN{exit !(m <= 8)}'; then
			echo "$(date +%FT%T) KEEP $(basename "$out") waterfall 5 pairs (load max $max)" >>"$A/runs/ledger.log"
			log "keep waterfall -> $out"; return 0
		fi
		echo "$(date +%FT%T) DISCARD _discarded-$(basename "$out") waterfall (load max $max, $(grep exit= "$out/meta.txt"))" >>"$A/runs/ledger.log"
		mv "$out" "$(dirname "$out")/_discarded-$(basename "$out")"
		log "discard waterfall attempt $n"
	done
}

log "queue2 start"
job "$C/c15t-mobile.json" load 15 c15t-mobile-load 400 0
job "$C/cy-mobile.json" load 15 cy-mobile-load 400 0
job "$C/c15t-mobile.json" accept 10 c15t-mobile-accept 400 0
job "$C/cy-mobile.json" accept 10 cy-mobile-accept 400 0
waterfall
log "queue2 phase 1 done"
job "$C/c15t-mobile.json" reject 10 c15t-mobile-reject 400 4
job "$C/cy-mobile.json" reject 10 cy-mobile-reject 400 4
job "$C/c15t-mobile.json" save 10 c15t-mobile-save 400 4
job "$C/cy-mobile.json" save 10 cy-mobile-save 400 2
job "$C/c15t-mobile.json" preferences 10 c15t-mobile-preferences 400 4
job "$C/c15t-mobile.json" returning-accepted 10 c15t-mobile-returning-accepted 400 4
job "$C/c15t-desktop.json" load 15 c15t-desktop-load none 4
job "$C/cy-desktop.json" load 15 cy-desktop-load none 4
log "queue2 done"
