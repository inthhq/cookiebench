# Derive this lane's configs from October's astro configs.
#   c15t:      sveltekit-{mobile,desktop}.json = fixture run.json fixtures
#              (sveltekit-baseline, sveltekit-c15t) + October astro-{profile}
#              scenarios, profile, iterations, warmups; plus preferences and
#              returning-accepted from run.json (c15t only, extra).
#   CookieYes: sveltekit-cookie-yes-{mobile,desktop}.json = October
#              astro-cookie-yes-* with astro -> sveltekit ids, ports
#              4315/4415/4515/4615 -> 4317/4417/4517/4617 and the SvelteKit
#              adapter-node entries.
# server.cwd made absolute; runner-side build dropped (the fixture is built
# by prepare.sh).
import json, sys, copy
OCT = '/home/kaylee/.t3/scratch/cookiebench/results/2026-10-15-matrix-rerun/configs'
L = '/home/kaylee/.t3/scratch/lcp-fleet/frameworks/sveltekit'
FIX = L + '/work/cookiebench/benchmarks/with-c15t-sveltekit'
run = json.load(open(FIX + '/run.json'))

def finish(fx):
    fx['server']['cwd'] = FIX
    fx['server'].pop('build', None)
    return fx

for prof in ['mobile', 'desktop']:
    octc = json.load(open(f'{OCT}/astro-{prof}.json'))
    cfg = {k: v for k, v in octc.items() if k not in ('fixtures',)}
    cfg['fixtures'] = [finish(copy.deepcopy(f)) for f in run['fixtures']]
    extra = [copy.deepcopy(s) for s in run['scenarios'] if s['id'] in ('preferences', 'returning-accepted')]
    deadline = octc['scenarios'][0]['actionDeadlineMs']
    for s in extra:
        s['actionDeadlineMs'] = deadline
    cfg['scenarios'] = octc['scenarios'] + extra
    json.dump(cfg, open(f'{L}/configs/sveltekit-{prof}.json', 'w'), indent=2)

    cy = json.load(open(f'{OCT}/astro-cookie-yes-{prof}.json'))
    s = json.dumps(cy)
    for a, b in [('4315', '4317'), ('4415', '4417'), ('4515', '4517'), ('4615', '4617'),
                 ('dist-baseline/server/entry.mjs', 'build-baseline/index.js'),
                 ('dist/server/entry.mjs', 'build/index.js'),
                 ('benchmarks/with-c15t-astro', FIX)]:
        s = s.replace(a, b)
    cy = json.loads(s)
    for fx in cy['fixtures']:
        fx['id'] = fx['id'].replace('astro', 'sveltekit')
        fx['framework'] = 'sveltekit'
        fx['frameworkVersion'] = '3.1.1'
        if fx['baseline']:
            fx['version'] = '3.1.1'
            fx['provenance'] = copy.deepcopy(run['fixtures'][0]['provenance'])
        finish(fx)
    assert '4315' not in json.dumps(cy) and 'astro' not in json.dumps(cy).replace('astro-', '__'), json.dumps(cy)[:200]
    json.dump(cy, open(f'{L}/configs/sveltekit-cookie-yes-{prof}.json', 'w'), indent=2)
print('ok')
