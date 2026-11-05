#!/usr/bin/env bash
# Script-lane queue on the M1, in the order the task gives. Resumable: job.sh and
# wf-job.sh skip labels that already have a KEEP line.
set -uo pipefail
source /Users/kayleewilliams/.t3/scratch/lcp-fleet/env.sh
S=$LCP/frameworks/script; C=$S/configs; J=$S/bin/job.sh
echo "$(date '+%F %T') QUEUE start pid $$" >>$S/runs/ledger.log
$J m-c15t-load        $C/c15t-canary-mobile.json  load   15 3 400
$J m-cy-load          $C/cy-mobile.json           load   15 3 400
$J m-c15t-accept      $C/c15t-canary-mobile.json  accept 10 3 400
$J m-cy-accept        $C/cy-mobile.json           accept 10 3 400
$S/bin/wf-job.sh c15t      mobile 5 wf-m-c15t
$S/bin/wf-job.sh cookieyes mobile 5 wf-m-cy
$J m-c15t-reject      $C/c15t-canary-mobile.json  reject 10 3 400
$J m-c15t-save        $C/c15t-canary-mobile.json  save   10 3 400
$J m-c15t-preferences $C/c15t-canary-mobile.json  preferences 10 3 400
$J m-c15t-returning   $C/c15t-canary-mobile.json  returning-accepted 10 3 400
$J m-cy-reject        $C/cy-mobile.json           reject 10 3 400
$J m-cy-save          $C/cy-mobile.json           save   10 3 400
$J d-c15t-load        $C/c15t-canary-desktop.json load   15 3 none
$J d-cy-load          $C/cy-desktop.json          load   15 3 none
$J m-hl-load          $C/headless-canary-mobile.json load 15 3 400
echo "$(date '+%F %T') QUEUE done" >>$S/runs/ledger.log
