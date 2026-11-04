#!/usr/bin/env bash
# queue.sh: the lane's measured session. c15t and CookieYes alternate per
# scenario so each pair of arms comes from the same stretch of the session.
# Each job is checked with check.py (ledger line per run); a discarded run is
# retried up to 3 more times. CookieYes `save` has no save selector in
# October's adapter: a run whose only failures are unsupported-action is
# logged and not retried.
set -uo pipefail
A=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/astro
C="$A/configs"
log() { echo "$(date +%FT%T) $*" >>"$A/runs/queue.log"; }

job() { # job <config> <scenario> <iterations> <label> <fcp-limit>
	local cfg=$1 scen=$2 it=$3 label=$4 limit=$5 n out
	for n in 1 2 3 4; do
		log "start $label attempt $n"
		out=$("$A/bin/cb-run.sh" "$cfg" "$scen" "$it" 3 "$label" | tail -1)
		if python3 -I "$A/bin/check.py" "$out" "$limit" --ledger >>"$A/runs/queue.log"; then
			log "keep $label -> $out"; return 0
		fi
		if [[ "$label" == cy-mobile-save* ]] && grep -q unsupported-action "$out/run.stdout.json"; then
			log "cy save unsupported -> $out"; return 0
		fi
		mv "$out" "$(dirname "$out")/_discarded-$(basename "$out")"
		sed -i "s#DISCARD $(basename "$out")#DISCARD _discarded-$(basename "$out")#" "$A/runs/ledger.log"
		log "discard $label attempt $n"
	done
	log "gave up $label after 4 attempts"
}

job "$C/c15t-mobile.json" load 15 c15t-mobile-load 400
job "$C/cy-mobile.json" load 15 cy-mobile-load 400
job "$C/c15t-mobile.json" accept 10 c15t-mobile-accept 400
job "$C/cy-mobile.json" accept 10 cy-mobile-accept 400
job "$C/c15t-mobile.json" reject 10 c15t-mobile-reject 400
job "$C/cy-mobile.json" reject 10 cy-mobile-reject 400
job "$C/c15t-mobile.json" save 10 c15t-mobile-save 400
job "$C/cy-mobile.json" save 10 cy-mobile-save 400
job "$C/c15t-mobile.json" preferences 10 c15t-mobile-preferences 400
job "$C/c15t-mobile.json" returning-accepted 10 c15t-mobile-returning-accepted 400
job "$C/c15t-desktop.json" load 15 c15t-desktop-load none
job "$C/cy-desktop.json" load 15 cy-desktop-load none
log "queue done"
