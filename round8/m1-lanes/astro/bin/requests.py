#!/usr/bin/env python3 -I
"""requests.py <run-dir>: per-URL transfer bytes and start time (median over
samples) for each fixture's `initial`-phase requests in a CookieBench
envelope. CookieBench records no end times, so this lists what loads in the
initial window, not what finishes before the hero."""
import json, re, statistics, sys, collections
env = json.load(open(sys.argv[1] + '/envelope.json'))
by = collections.defaultdict(lambda: collections.defaultdict(list))
n = collections.Counter()
for s in env['samples']:
    reqs = (s.get('diagnostics') or {}).get('requests') or []
    if not reqs: continue
    n[s['fixtureId']] += 1
    t0 = min(r['startedAt'] for r in reqs)
    for r in reqs:
        if r.get('phase') != 'initial': continue
        u = re.sub(r'token=[^&]+', 'token=…', r['url'].split('://', 1)[1].split('/', 1)[1])
        by[s['fixtureId']][u].append((r.get('transferBytes'), r['startedAt'] - t0, r['resourceType']))
for fx, urls in by.items():
    print(f'== {fx} ({n[fx]} samples)')
    tot = 0
    for u, v in sorted(urls.items(), key=lambda kv: statistics.median(x[1] for x in kv[1])):
        b = [x[0] for x in v if x[0] is not None]
        mb = statistics.median(b) if b else None
        tot += mb or 0
        print(f'  {v[0][2]:10} start {statistics.median(x[1] for x in v):7.0f}  {mb if mb is not None else "-":>8}  seen {len(v):2}  /{u[:90]}')
    print('  sum of median transfer', tot)
