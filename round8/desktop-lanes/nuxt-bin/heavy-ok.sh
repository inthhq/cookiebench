#!/usr/bin/env bash
# Exit 0 when no run of this lane holds the CookieBench lock (heavy local
# work is fine), 1 when one does. Prints the holder.
pid=$(cat /tmp/cookiebench-v3-measurement.lock 2>/dev/null)
[[ -z "$pid" ]] && { echo "lock free"; exit 0; }
args=$(ps -o args= -p "$pid" 2>/dev/null)
echo "holder $pid: ${args:0:140}"
[[ "$args" == *lcp-fleet/nuxt/* ]] && exit 1
exit 0
