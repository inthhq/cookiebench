#!/usr/bin/env bash
# Same-session runs: head, canary and CookieYes interleaved per scenario.
N=/home/kaylee/.t3/scratch/lcp-fleet/nuxt
cd "$N"
while kill -0 "$(cat runs/queue-ref.pid)" 2>/dev/null; do sleep 20; done
R() { bin/cb-run.sh "$@"; }
R configs/c15t-head-mobile.json   load 15 3 s1-head-load
R configs/c15t-canary-mobile.json load 15 3 s1-canary-load
R configs/cy-mobile.json          load 15 3 s1-cy-load
for scen in accept reject; do
  R configs/c15t-head-mobile.json   $scen 10 3 s1-head-$scen
  R configs/c15t-canary-mobile.json $scen 10 3 s1-canary-$scen
  R configs/cy-mobile.json          $scen 10 3 s1-cy-$scen
done
R configs/c15t-head-mobile.json   preferences 10 3 s1-head-preferences
R configs/c15t-canary-mobile.json preferences 10 3 s1-canary-preferences
R configs/c15t-head-mobile.json   save 10 3 s1-head-save
R configs/c15t-canary-mobile.json save 10 3 s1-canary-save
R configs/cy-mobile.json          save 10 3 s1-cy-save
R configs/c15t-head-mobile.json   returning-accepted 10 3 s1-head-returning-accepted
R configs/c15t-canary-mobile.json returning-accepted 10 3 s1-canary-returning-accepted
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
for arm in head canary; do
  CB=$N/work/$arm/cookiebench
  mkdir -p runs/s1-$arm-waterfall
  while awk '{exit !($1 >= 6)}' /proc/loadavg || [[ -e "$N/.busy" ]]; do sleep 15; done
  port=$([[ $arm == head ]] && echo 5110 || echo 5100)
  node bin/waterfall-nuxt.mjs --cookiebench "$CB" --fixture "$CB/benchmarks/with-c15t-nuxt" --port $port --visits 5 --out runs/s1-$arm-waterfall > runs/s1-$arm-waterfall/run.log 2>&1
done
R configs/c15t-head-desktop.json   load 15 3 s1-head-desktop-load
R configs/c15t-canary-desktop.json load 15 3 s1-canary-desktop-load
R configs/cy-desktop.json          load 15 3 s1-cy-desktop-load
echo session-done
