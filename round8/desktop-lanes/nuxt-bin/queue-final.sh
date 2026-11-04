#!/usr/bin/env bash
cd /home/kaylee/.t3/scratch/lcp-fleet/nuxt
gate() { local d; d=$(ls -d runs/$1-2* 2>/dev/null | tail -1); [[ -n "$d" ]] && python3 bin/table.py "$d" | grep -q '"gate": "ok"'; }
for attempt in 1 2; do
  gate s1-canary-load || bin/cb-run.sh configs/c15t-canary-mobile.json load 15 3 s1-canary-load
  gate s1-head-desktop-load || bin/cb-run.sh configs/c15t-head-desktop.json load 15 3 s1-head-desktop-load
  gate s1-canary-desktop-load || bin/cb-run.sh configs/c15t-canary-desktop.json load 15 3 s1-canary-desktop-load
done
echo final-done
