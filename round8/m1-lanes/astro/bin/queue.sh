#!/usr/bin/env bash
# queue.sh: astro lane, round 8 on the M1. Run under caffeinate -dims.
# Order (task message): c15t mobile load (15), CookieYes mobile load (15),
# c15t mobile accept (10), CookieYes accept (10), c15t waterfall (5 pairs),
# c15t reject, save, preferences, returning-accepted; CookieYes reject, save;
# desktop load c15t and CookieYes (15). 3 warm-ups, seed 20261009 (cb-run.sh).
# Each job: up to 4 attempts; check.py applies BRIEF-M1 discard rules
# (load sample > 10, failed sample, mobile control FCP median > 400) and
# writes one ledger line per attempt. Discarded run dirs get a _discarded- prefix.
set -uo pipefail
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
A=$LCP/frameworks/astro
C="$A/configs"
log() { echo "$(date +%FT%T) $*" >>"$A/runs/queue.log"; }
kept() { grep -qE " KEEP $1-[0-9]{8}-" "$A/runs/ledger.log" 2>/dev/null; }

job() { # job <config> <scenario> <iterations> <label> <fcp-limit>
	local cfg=$1 scen=$2 it=$3 label=$4 limit=$5 n=0 out base
	kept "$label" && return 0
	while ((n < 4)); do
		n=$((n + 1))
		log "start $label attempt $n"
		out=$("$A/bin/cb-run.sh" astro "$cfg" "$scen" "$it" 3 "$label" | tail -1)
		base=$(basename "$out")
		if python3 -I "$A/bin/check.py" "$out" "$limit" >>"$A/runs/queue.log"; then
			LEDGER_NAME="$base" python3 -I "$A/bin/check.py" "$out" "$limit" --ledger >/dev/null
			log "keep $label -> $out"; return 0
		fi
		if [[ "$scen" == save && "$label" == cy-* ]] && grep -q unsupported "$out/run.stdout.json" "$out/run.stderr.log" 2>/dev/null; then
			echo "$(date +%FT%T) DISCARD $base CookieYes adapter has no save selector (unsupported-action); not retried" >>"$A/runs/ledger.log"
			log "cy save unsupported -> $out"; return 0
		fi
		mv "$out" "$A/runs/_discarded-$base"
		LEDGER_NAME="_discarded-$base" python3 -I "$A/bin/check.py" "$A/runs/_discarded-$base" "$limit" --ledger >/dev/null
		log "discard $label attempt $n"
	done
	log "gave up $label after $n attempts"
}

waterfall() {
	grep -qE " KEEP c15t-waterfall-" "$A/runs/ledger.log" 2>/dev/null && return 0
	local n=0 out max base
	while ((n < 4)); do
		n=$((n + 1))
		log "start waterfall attempt $n"
		out=$("$A/bin/waterfall.sh" c15t-waterfall 5 | tail -1)
		base=$(basename "$out")
		max=$(python3 -I -c "import json,sys; s=json.load(open(sys.argv[1])); print(max(v for _,v in s) if s else 0)" "$out/loadavg.json" 2>/dev/null || echo 999)
		if grep -q 'exit=0' "$out/meta.txt" && awk -v m="$max" 'BEGIN{exit !(m <= 10)}'; then
			echo "$(date +%FT%T) KEEP $base waterfall 5 pairs (load max $max)" >>"$A/runs/ledger.log"
			log "keep waterfall -> $out"; return 0
		fi
		mv "$out" "$A/runs/_discarded-$base"
		echo "$(date +%FT%T) DISCARD _discarded-$base waterfall (load max $max, $(grep exit= "$A/runs/_discarded-$base/meta.txt"))" >>"$A/runs/ledger.log"
		log "discard waterfall attempt $n"
	done
	log "gave up waterfall after $n attempts"
}

log "queue start"
job "$C/c15t-canary-mobile.json" load 15 c15t-mobile-load 400
job "$C/cy-mobile.json" load 15 cy-mobile-load 400
job "$C/c15t-canary-mobile.json" accept 10 c15t-mobile-accept 400
job "$C/cy-mobile.json" accept 10 cy-mobile-accept 400
waterfall
job "$C/c15t-canary-mobile.json" reject 10 c15t-mobile-reject 400
job "$C/c15t-canary-mobile.json" save 10 c15t-mobile-save 400
job "$C/c15t-canary-mobile.json" preferences 10 c15t-mobile-preferences 400
job "$C/c15t-canary-mobile.json" returning-accepted 10 c15t-mobile-returning-accepted 400
job "$C/cy-mobile.json" reject 10 cy-mobile-reject 400
job "$C/cy-mobile.json" save 10 cy-mobile-save 400
job "$C/c15t-canary-desktop.json" load 15 c15t-desktop-load none
job "$C/cy-desktop.json" load 15 cy-desktop-load none
log "queue done"
