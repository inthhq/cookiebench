#!/usr/bin/env python3
"""Port October's script-tag configs (2026-10-15 matrix rerun) to this lane.

Changes only: server.cwd made absolute (the lane's private copy), runner-side
build dropped (the fixture is built once by prepare.sh), the c15t config
reduced to script-tag-baseline-inth-init + script-tag-c15t-inth-init, and the
c15t fixture's version/revision tagged with the arm. Ports stay 4310 / 4610
(assigned to this lane). October's script scenarios are load/accept/reject/
save; preferences and returning-accepted are appended verbatim from the
fixture's run.json for the c15t arm only (October did not run them).

Headless: run-headless.json's c15t fixture plus the same baseline, with
October's mobile/desktop profile and scenarios.
"""
import copy, json, re

S = '/home/kaylee/.t3/scratch/lcp-fleet/frameworks/script'
SRC = '/home/kaylee/.t3/scratch/cookiebench/results/2026-10-15-matrix-rerun/configs'
FIXSRC = '/home/kaylee/.t3/scratch/cookiebench/benchmarks/with-c15t-script'
ARM = 'canary'
FIX = f'{S}/work/{ARM}/cookiebench/benchmarks/with-c15t-script'
run = json.load(open(f'{FIXSRC}/run.json'))
extra = [s for s in run['scenarios'] if s['id'] in ('preferences', 'returning-accepted')]
headless_fx = json.load(open(f'{FIXSRC}/run-headless.json'))['fixtures'][0]


def fix_server(f):
    f['server']['cwd'] = FIX
    f['server'].pop('build', None)


def check(cfg):
    assert not re.search(r'\b(4322|4412)\b', json.dumps(cfg))


for profile in ('mobile', 'desktop'):
    src = json.load(open(f'{SRC}/script-{profile}.json'))
    cfg = copy.deepcopy(src)
    cfg['fixtures'] = [f for f in cfg['fixtures'] if f['id'] in ('script-tag-baseline-inth-init', 'script-tag-c15t-inth-init')]
    assert len(cfg['fixtures']) == 2
    for f in cfg['fixtures']:
        fix_server(f)
        if f['id'] == 'script-tag-c15t-inth-init':
            f['version'] = ARM
            f['revision'] += f'-{ARM}'
    ids = {s['id'] for s in cfg['scenarios']}
    cfg['scenarios'] += [s for s in extra if s['id'] not in ids]
    check(cfg)
    out = f'{S}/configs/c15t-{ARM}-{profile}.json'
    json.dump(cfg, open(out, 'w'), indent=1)
    print(out, [f['id'] for f in cfg['fixtures']], [s['id'] for s in cfg['scenarios']])

    # headless: same baseline, the run-headless.json c15t fixture
    h = copy.deepcopy(src)
    base = [f for f in h['fixtures'] if f['id'] == 'script-tag-baseline-inth-init'][0]
    hf = copy.deepcopy(headless_fx)
    hf['version'] = ARM
    hf['revision'] += f'-{ARM}'
    h['fixtures'] = [base, hf]
    for f in h['fixtures']:
        fix_server(f)
    check(h)
    out = f'{S}/configs/headless-{ARM}-{profile}.json'
    json.dump(h, open(out, 'w'), indent=1)
    print(out, [f['id'] for f in h['fixtures']], [s['id'] for s in h['scenarios']])

    cy = json.load(open(f'{SRC}/script-cookie-yes-{profile}.json'))
    for f in cy['fixtures']:
        fix_server(f)
    check(cy)
    out = f'{S}/configs/cy-{profile}.json'
    json.dump(cy, open(out, 'w'), indent=1)
    print(out, [f['id'] for f in cy['fixtures']], [s['id'] for s in cy['scenarios']])
