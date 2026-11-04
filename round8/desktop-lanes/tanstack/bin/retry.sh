#!/usr/bin/env bash
# retry.sh [rounds]: after the main queue unit ends, rerun every queue label
# that has no KEEP in runs/ledger.log (2 attempts each per round, same
# configs and gate). CookieYes `save` is skipped (unsupported action).
set -uo pipefail
T=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/tanstack
cd "$T"
ROUNDS="${1:-2}"
while systemctl --user is-active --quiet lcp-tanstack-queue; do sleep 30; done
C=configs
JOBS=(
	"c15t-canary-mobile.json load 15 s1-canary-load"
	"c15t-ic-mobile.json load 15 s1-ic-load"
	"cy-mobile.json load 15 s1-cy-load"
	"c15t-canary-mobile.json accept 10 s1-canary-accept"
	"c15t-ic-mobile.json accept 10 s1-ic-accept"
	"cy-mobile.json accept 10 s1-cy-accept"
	"c15t-canary-mobile.json reject 10 s1-canary-reject"
	"c15t-ic-mobile.json reject 10 s1-ic-reject"
	"cy-mobile.json reject 10 s1-cy-reject"
	"c15t-canary-mobile.json save 10 s1-canary-save"
	"c15t-ic-mobile.json save 10 s1-ic-save"
	"c15t-canary-mobile.json preferences 10 s1-canary-preferences"
	"c15t-ic-mobile.json preferences 10 s1-ic-preferences"
	"c15t-canary-mobile.json returning-accepted 10 s1-canary-returning-accepted"
	"c15t-ic-mobile.json returning-accepted 10 s1-ic-returning-accepted"
	"c15t-canary-desktop.json load 15 s1-canary-desktop-load"
	"c15t-ic-desktop.json load 15 s1-ic-desktop-load"
	"cy-desktop.json load 15 s1-cy-desktop-load"
)
kept() { grep -qE " KEEP $1-[0-9]{8}-[0-9]{6} " runs/ledger.log; }
echo "$(date +%T) retry start" >>runs/queue.log
for ((r = 1; r <= ROUNDS; r++)); do
	for job in "${JOBS[@]}"; do
		read -r cfg scen n label <<<"$job"
		kept "$label" && continue
		for i in 1 2; do
			out="$(bin/cb-run.sh "$C/$cfg" "$scen" "$n" "$label" | tail -1)"
			echo "$(date +%T) retry r$r $label attempt $i -> $out" >>runs/queue.log
			kept "$label" && break
		done
	done
done
echo "$(date +%T) retry-done" >>runs/queue.log
