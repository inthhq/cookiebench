#!/usr/bin/env bash
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
cd /home/kaylee/.t3/scratch/lcp-fleet/frameworks/script/bin
for arm in c15t cookieyes; do
node waterfall-script.mjs --cookiebench /home/kaylee/.t3/scratch/lcp-fleet/frameworks/script/work/canary/cookiebench --fixture /home/kaylee/.t3/scratch/lcp-fleet/frameworks/script/work/canary/cookiebench/benchmarks/with-c15t-script --port 4310 --profile desktop --visits 1 --arm $arm --out /home/kaylee/.t3/scratch/lcp-fleet/frameworks/script/runs/_wf-smoke-$( [ $arm = c15t ] && echo c15t || echo cy) > /home/kaylee/.t3/scratch/lcp-fleet/frameworks/script/logs/wf-smoke-$arm.log 2>&1
echo "$arm exit=$?" >> /home/kaylee/.t3/scratch/lcp-fleet/frameworks/script/logs/wf-smoke-$arm.log
done
