#!/usr/bin/env bash
# After the session: rerun every run whose latest attempt fails the gate
# (bin/table.py), up to 3 more attempts each. Load runs first.
N=/home/kaylee/.t3/scratch/lcp-fleet/nuxt
cd "$N"
while kill -0 "$(cat runs/queue-session.pid)" 2>/dev/null; do sleep 30; done
gate() { local d; d=$(ls -d runs/$1-2* 2>/dev/null | tail -1); [[ -n "$d" ]] && python3 bin/table.py "$d" | grep -q '"gate": "ok"'; }
JOBS=(
 "c15t-head-mobile load s1-head-load" "c15t-canary-mobile load s1-canary-load" "cy-mobile load s1-cy-load"
 "c15t-head-mobile accept s1-head-accept" "c15t-canary-mobile accept s1-canary-accept" "cy-mobile accept s1-cy-accept"
 "c15t-head-mobile reject s1-head-reject" "c15t-canary-mobile reject s1-canary-reject" "cy-mobile reject s1-cy-reject"
 "c15t-head-mobile preferences s1-head-preferences" "c15t-canary-mobile preferences s1-canary-preferences"
 "c15t-head-mobile save s1-head-save" "c15t-canary-mobile save s1-canary-save" "cy-mobile save s1-cy-save"
 "c15t-head-mobile returning-accepted s1-head-returning-accepted" "c15t-canary-mobile returning-accepted s1-canary-returning-accepted"
)
for attempt in 1 2 3; do
  for job in "${JOBS[@]}"; do
    set -- $job
    gate "$3" && continue
    it=10; [[ $2 == load ]] && it=15
    bin/cb-run.sh configs/$1.json $2 $it 3 "$3"
  done
done
echo retry-done
