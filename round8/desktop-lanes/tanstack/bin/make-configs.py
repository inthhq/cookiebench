#!/usr/bin/env python3
"""Port October's TanStack Start configs (2026-10-15 matrix rerun) to this lane.

Changes only: server.cwd made absolute (the arm's private CookieBench copy),
runner-side build dropped (the fixture is built once by prepare.sh), the c15t
fixture's version/revision tagged with the arm. Ports stay October's
4316 / 4416 / TLS 4616 (assigned to this lane). The c15t configs keep only
tanstack-start-baseline + tanstack-start-c15t. October's scenarios are
load/accept/reject/save; preferences and returning-accepted are added
verbatim from the fixture's run.json for the c15t arms (October did not run
them on TanStack Start, and its CookieYes config has neither).

Arms: canary (d4803ef60), ic (kaylee/instant-commit ad86f4805). CookieYes
runs from the canary copy's server (it only visits /baseline?cmp=cookie-yes).
"""
import json
import re

T = '/home/kaylee/.t3/scratch/lcp-fleet/frameworks/tanstack'
SRC = '/home/kaylee/.t3/scratch/cookiebench/results/2026-10-15-matrix-rerun/configs'
RUN = '/home/kaylee/.t3/scratch/cookiebench/benchmarks/with-c15t-tanstack-start/run.json'
ARMS = ('canary', 'ic')
extra = [s for s in json.load(open(RUN))['scenarios'] if s['id'] in ('preferences', 'returning-accepted')]


def fixdir(arm):
    return f'{T}/work/{arm}/cookiebench/benchmarks/with-c15t-tanstack-start'


def check_ports(text):
    assert not re.search(r'\b(4322|4412)\b', text)


for arm in ARMS:
    for profile in ('mobile', 'desktop'):
        raw = open(f'{SRC}/tanstack-start-{profile}.json').read()
        check_ports(raw)
        cfg = json.loads(raw)
        cfg['fixtures'] = [f for f in cfg['fixtures'] if f['id'] in ('tanstack-start-baseline', 'tanstack-start-c15t')]
        for f in cfg['fixtures']:
            f['server']['cwd'] = fixdir(arm)
            f['server'].pop('build', None)
            if f['id'] == 'tanstack-start-c15t':
                f['version'] = arm
                f['revision'] += f'-{arm}'
        ids = {s['id'] for s in cfg['scenarios']}
        if profile == 'mobile':
            cfg['scenarios'] += [s for s in extra if s['id'] not in ids]
        out = f'{T}/configs/c15t-{arm}-{profile}.json'
        json.dump(cfg, open(out, 'w'), indent=1)
        print(out, [f['id'] for f in cfg['fixtures']], [s['id'] for s in cfg['scenarios']])

for profile in ('mobile', 'desktop'):
    raw = open(f'{SRC}/tanstack-start-cookie-yes-{profile}.json').read()
    check_ports(raw)
    cfg = json.loads(raw)
    for f in cfg['fixtures']:
        f['server']['cwd'] = fixdir('canary')
        f['server'].pop('build', None)
    out = f'{T}/configs/cy-{profile}.json'
    json.dump(cfg, open(out, 'w'), indent=1)
    print(out, [f['id'] for f in cfg['fixtures']], [s['id'] for s in cfg['scenarios']])
