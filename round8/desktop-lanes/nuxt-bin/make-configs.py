#!/usr/bin/env python3
"""Port October's Nuxt configs (2026-10-15 matrix rerun) to this lane.

Changes only: ports (4314/4414/4514/4614 -> the arm's four), server.cwd made
absolute, runner-side build dropped. The c15t configs keep only nuxt-baseline
+ nuxt-c15t. October's nuxt-mobile scenarios are load/accept/reject/save;
preferences and returning-accepted are added verbatim from the fixture's
run.json (October did not run them on Nuxt).

Arms: canary (5100-5103), head (5110-5113). CookieYes runs from the canary
copy's server (it only visits /baseline/?cmp=cookie-yes).
"""
import json, re
N = '/home/kaylee/.t3/scratch/lcp-fleet/nuxt'
SRC = '/home/kaylee/.t3/scratch/cookiebench/results/2026-10-15-matrix-rerun/configs'
RUN = '/home/kaylee/.t3/scratch/cookiebench/benchmarks/with-c15t-nuxt/run.json'
ARMS = {'canary': ('5100', '5101', '5102', '5103'), 'head': ('5110', '5111', '5112', '5113')}
extra = [s for s in json.load(open(RUN))['scenarios'] if s['id'] in ('preferences', 'returning-accepted')]


def port(text, ports):
    for a, b in zip(('4314', '4414', '4514', '4614'), ports):
        text = re.sub(rf'\b{a}\b', b, text)
    assert not re.search(r'\b(4314|4414|4514|4614|4322|4412)\b', text)
    return text


for arm, ports in ARMS.items():
    fix = f'{N}/work/{arm}/cookiebench/benchmarks/with-c15t-nuxt'
    for profile in ('mobile', 'desktop'):
        cfg = json.loads(port(open(f'{SRC}/nuxt-{profile}.json').read(), ports))
        cfg['fixtures'] = [f for f in cfg['fixtures'] if f['id'] in ('nuxt-baseline', 'nuxt-c15t')]
        for f in cfg['fixtures']:
            f['server']['cwd'] = fix
            f['server'].pop('build', None)
            if f['id'] == 'nuxt-c15t':
                f['version'] = arm
                f['revision'] += f'-{arm}'
        ids = {s['id'] for s in cfg['scenarios']}
        cfg['scenarios'] += [s for s in extra if s['id'] not in ids]
        out = f'{N}/configs/c15t-{arm}-{profile}.json'
        json.dump(cfg, open(out, 'w'), indent=1)
        print(out, [f['id'] for f in cfg['fixtures']], [s['id'] for s in cfg['scenarios']])
    if arm == 'canary':
        for profile in ('mobile', 'desktop'):
            cfg = json.loads(port(open(f'{SRC}/nuxt-cookie-yes-{profile}.json').read(), ports))
            for f in cfg['fixtures']:
                f['server']['cwd'] = fix
                f['server'].pop('build', None)
            out = f'{N}/configs/cy-{profile}.json'
            json.dump(cfg, open(out, 'w'), indent=1)
            print(out, [f['id'] for f in cfg['fixtures']], [s['id'] for s in cfg['scenarios']])
