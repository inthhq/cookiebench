#!/usr/bin/env bash
# Session queue for the script lane. c15t canary and CookieYes alternate per
# scenario so each pair of rows comes from the same stretch of the session.
set -uo pipefail
S=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/script
C=$S/configs
J=$S/bin/job.sh
echo "$(date '+%F %T') QUEUE start pid $$" >>$S/runs/ledger.log
$J m-c15t-load        $C/c15t-canary-mobile.json  load   15 400
$J m-cy-load          $C/cy-mobile.json           load   15 400
$J m-c15t-accept      $C/c15t-canary-mobile.json  accept 10 400
$J m-cy-accept        $C/cy-mobile.json           accept 10 400
$S/bin/wf-job.sh c15t mobile 5 wf-m-c15t
$S/bin/wf-job.sh cookieyes mobile 5 wf-m-cy
$J m-c15t-reject      $C/c15t-canary-mobile.json  reject 10 400
$J m-cy-reject        $C/cy-mobile.json           reject 10 400
$J m-c15t-save        $C/c15t-canary-mobile.json  save   10 400
$J m-cy-save          $C/cy-mobile.json           save   10 400 1
$J d-c15t-load        $C/c15t-canary-desktop.json load   15 none
$J d-cy-load          $C/cy-desktop.json          load   15 none
$J m-c15t-preferences $C/c15t-canary-mobile.json  preferences 10 400
$J m-c15t-returning   $C/c15t-canary-mobile.json  returning-accepted 10 400
$S/bin/wf-job.sh headless mobile 5 wf-m-hl
$J m-hl-load          $C/headless-canary-mobile.json load   15 400
$J m-hl-accept        $C/headless-canary-mobile.json accept 10 400
$J m-hl-reject        $C/headless-canary-mobile.json reject 10 400
$J m-hl-save          $C/headless-canary-mobile.json save   10 400
$J d-hl-load          $C/headless-canary-desktop.json load  15 none
echo "$(date '+%F %T') QUEUE done" >>$S/runs/ledger.log
