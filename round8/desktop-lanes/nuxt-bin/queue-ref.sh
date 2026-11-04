#!/usr/bin/env bash
N=/home/kaylee/.t3/scratch/lcp-fleet/nuxt
cd "$N"
bin/cb-run.sh configs/c15t-canary-mobile.json load 15 3 ref-canary-load
bin/cb-run.sh configs/cy-mobile.json load 15 3 ref-cy-load
bin/cb-run.sh configs/c15t-canary-mobile.json accept 10 3 ref-canary-accept
bin/cb-run.sh configs/cy-mobile.json accept 10 3 ref-cy-accept
echo done
