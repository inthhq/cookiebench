#!/usr/bin/env bash
# smoke-run.sh <config> <scenario> <label>: 1 iteration, 0 warm-ups, queued on
# the lock, no load gate. Checks the config works; never reported.
T=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/tanstack
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
O="$T/runs/_smoke-$3-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$O"; cp "$1" "$O/config.json"
while :; do
  (cd "$T/work/canary/cookiebench" && node packages/cli/src/index.ts run --config "$O/config.json" --scenario "$2" --iterations 1 --warmups 0 --seed 20261009 --output "$O/envelope.json") >"$O/run.stdout.json" 2>"$O/run.stderr.log"
  s=$?
  grep -q "Another measured workload is active" "$O/run.stdout.json" "$O/run.stderr.log" 2>/dev/null && { sleep 20; continue; }
  break
done
echo "$(date '+%Y-%m-%dT%H:%M:%S') DISCARD $(basename $O) smoke check, 1 iteration, not measured (exit $s)" >>"$T/runs/ledger.log"
echo "$O exit=$s"
