#!/usr/bin/env python3 -I
"""Port October's astro configs (2026-10-15 matrix rerun) to this lane.

Changes only:
- c15t configs keep astro-baseline + astro-c15t; astro-c15t's version and
  revision name the canary commit the tarballs came from.
- server.cwd made absolute (the lane's private CookieBench copy); the
  runner-side build is dropped (the fixture is built once by prepare.sh).
- c15t mobile config adds `preferences` and `returning-accepted` verbatim from
  the fixture's run.json (October's astro config runs load/accept/reject/save
  only). CookieYes configs are unchanged apart from cwd/build.
Ports stay the fixture's own: 4315 proxy, 4415 upstream, 4515 baseline,
4615 TLS (assigned to this lane by the round-8 brief).
Seed: passed on the command line (20261009) by cb-run.sh.
"""
import json
import re

A = '/home/kaylee/.t3/scratch/lcp-fleet/frameworks/astro'
SRC = '/home/kaylee/.t3/scratch/cookiebench/results/2026-10-15-matrix-rerun/configs'
RUN = f'{A}/work/cookiebench/benchmarks/with-c15t-astro/run.json'
FIX = f'{A}/work/cookiebench/benchmarks/with-c15t-astro'
HEAD = open(f'{A}/packs.head').read().strip()
extra = [s for s in json.load(open(RUN))['scenarios']
         if s['id'] in ('preferences', 'returning-accepted')]


def fix_server(f):
    f['server']['cwd'] = FIX
    f['server'].pop('build', None)


for profile in ('mobile', 'desktop'):
    raw = open(f'{SRC}/astro-{profile}.json').read()
    assert not re.search(r'\b(4322|4412)\b', raw)
    cfg = json.loads(raw)
    cfg['fixtures'] = [f for f in cfg['fixtures'] if f['id'] in ('astro-baseline', 'astro-c15t')]
    for f in cfg['fixtures']:
        fix_server(f)
        if f['id'] == 'astro-c15t':
            f['version'] = f'canary-{HEAD[:9]}'
            f['revision'] += f'-canary-{HEAD[:9]}'
    if profile == 'mobile':
        ids = {s['id'] for s in cfg['scenarios']}
        cfg['scenarios'] += [s for s in extra if s['id'] not in ids]
    out = f'{A}/configs/c15t-{profile}.json'
    json.dump(cfg, open(out, 'w'), indent=1)
    print(out, [f['id'] for f in cfg['fixtures']], [s['id'] for s in cfg['scenarios']], cfg['seed'])

    cy = json.loads(open(f'{SRC}/astro-cookie-yes-{profile}.json').read())
    for f in cy['fixtures']:
        fix_server(f)
    out = f'{A}/configs/cy-{profile}.json'
    json.dump(cy, open(out, 'w'), indent=1)
    print(out, [f['id'] for f in cy['fixtures']], [s['id'] for s in cy['scenarios']])
