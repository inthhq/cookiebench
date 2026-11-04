#!/usr/bin/env bash
# Session restart after the queue verdict fix (correctness pass already done).
L=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/sveltekit
exec >>"$L/runs/session.log" 2>&1
echo "session2 start $(date -Is) pid $$"
"$L/bin/queue.sh" "$L/plan-mobile-load.txt"
"$L/bin/waterfall-run.sh" wf-c15t 5
"$L/bin/waterfall-run.sh" wf-cy 5 --cmp cookie-yes
"$L/bin/queue.sh" "$L/plan-rest.txt"
d=$("$L/bin/cb-run.sh" "$L/configs/sveltekit-runjson-verify.json" - 1 0 verify2-runjson verify | tail -1)
echo "verify2 done $(date -Is) $d $(grep '^exit=' "$d/meta.txt")"
echo "session end $(date -Is)"
