#!/usr/bin/env bash
# tanstack lane queue (v2: skips labels already kept; uses bin/cb-run.sh), round 8 on the M1. Order from the lane brief.
# Each run: cb-run.sh (gate <= 6, shared lock), then check.py --ledger writes
# one ledger line. A discarded run is rerun, up to 4 attempts in total, except
# when every candidate sample failed with the same codes at a quiet load
# (a deterministic failure, e.g. an unsupported action): then stop.
set -uo pipefail
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
T=$LCP/frameworks/tanstack
C=$T/configs
cd "$T"
echo $$ >"$T/runs/queue.pid"
log() { echo "$(date '+%F %T') $*" >>"$T/runs/queue.log"; }
R() { # R <config> <scenario> <iterations> <label>
	local cfg="$1" scen="$2" n="$3" label="$4" out v det
	if grep -qE " KEEP $label-[0-9]{8}-[0-9]{6} " "$T/runs/ledger.log"; then log "skip $label (already kept)"; return 0; fi
	for ((i = 1; i <= 4; i++)); do
		log "start $label attempt $i"
		out="$($T/bin/cb-run.sh tanstack "$C/$cfg" "$scen" "$n" 3 "$label" | tail -1)"
		v="$(python3 -I bin/check.py "$out" --ledger | python3 -I -c 'import json,sys; r=json.load(sys.stdin); print(r.get("gate","DISCARD")); print("DET" if r.get("passed","").startswith("0/") and (r.get("load_max") or 99) <= 10 else "")')"
		log "end $label attempt $i -> $out :: $(echo "$v" | head -1)"
		[[ "$(echo "$v" | head -1)" == KEEP ]] && return 0
		if [[ "$(echo "$v" | sed -n 2p)" == DET ]]; then log "stop $label: every candidate sample failed at quiet load"; return 0; fi
	done
	log "give up $label after 4 attempts"
}
WF() { # waterfall, up to 4 attempts
	if grep -qE " KEEP wf-canary-" "$T/runs/ledger.log"; then log "skip waterfall (already kept)"; return 0; fi
	for ((i = 1; i <= 4; i++)); do
		log "start waterfall attempt $i"
		if bash "$T/bin/wf-run.sh" canary 5; then log "end waterfall attempt $i ok"; return 0; fi
		log "end waterfall attempt $i failed"
	done
}
log "queue2 start (restart: lane-local cb-run.sh retries on the lock-recovery race)"
R c15t-canary-mobile.json load 15 m-canary-load
R cy-mobile.json load 15 m-cy-load
R c15t-ic-mobile.json load 15 m-ic-load
R c15t-canary-mobile.json accept 10 m-canary-accept
R cy-mobile.json accept 10 m-cy-accept
R c15t-ic-mobile.json accept 10 m-ic-accept
WF
R c15t-canary-mobile.json reject 10 m-canary-reject
R c15t-canary-mobile.json save 10 m-canary-save
R c15t-canary-mobile.json preferences 10 m-canary-preferences
R c15t-canary-mobile.json returning-accepted 10 m-canary-returning-accepted
R cy-mobile.json reject 10 m-cy-reject
R cy-mobile.json save 10 m-cy-save
R c15t-canary-desktop.json load 15 d-canary-load
R cy-desktop.json load 15 d-cy-load
log "queue done"
