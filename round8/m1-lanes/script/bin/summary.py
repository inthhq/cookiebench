#!/usr/bin/env python3
"""summary.py <run-dir>... : one JSON object per run for the report.

Deltas and 95% intervals from the run's compare-<metric>.json (CookieBench
paired bootstrap). Candidate/control medians and max from the envelope.
Request timings (start ms after the document request, transfer B) for the
candidate's median-LCP sample.
"""
import json, os, statistics, sys

KEYS = ['page.lcp', 'page.fcp', 'banner.visible', 'consent.resolution', 'initial.transfer',
        'initial.requests', 'initial.long-task-blocking', 'action.input-to-next-paint',
        'action.dismissed', 'action.consent-effective', 'action.scripts-complete',
        'action.preferences-visible', 'action.local-persisted', 'action.remote-persisted']
CMP = ['page.lcp', 'page.fcp', 'initial.transfer', 'initial.requests', 'initial.long-task-blocking', 'banner.visible']


def stat(xs):
    xs = [x for x in xs if x is not None]
    if not xs:
        return None
    return {'n': len(xs), 'median': round(statistics.median(xs), 1), 'max': round(max(xs), 1), 'min': round(min(xs), 1)}


def cmp(run, metric):
    try:
        d = json.load(open(os.path.join(run, f'compare-{metric}.json')))
        p = d['comparisons'][0]['paired'] or {}
        ci = p.get('confidenceInterval') or {}
        return [p.get('medianDifference'), ci.get('low'), ci.get('high'), p.get('count')]
    except Exception:
        return None


for run in sys.argv[1:]:
    env = json.load(open(os.path.join(run, 'envelope.json')))
    base = {f['id'] for f in env['fixtures'] if f.get('baseline')}
    out = {'run': os.path.basename(run)}
    la = [float(l.split()[1]) for l in open(os.path.join(run, 'loadavg.txt')) if l.strip()]
    out['load'] = [round(statistics.median(la), 2), max(la)] if la else None
    t0, t1 = [int(open(os.path.join(run, f)).read()) for f in ('started', 'ended')]
    out['minutes'] = round((t1 - t0) / 60, 1)
    for role, pred in (('cand', lambda s: s['fixtureId'] not in base), ('ctrl', lambda s: s['fixtureId'] in base)):
        ss = [s for s in env['samples'] if pred(s)]
        out[role + '_id'] = ss[0]['fixtureId'] if ss else None
        out[role + '_status'] = {st: sum(1 for s in ss if s['status'] == st) for st in {s['status'] for s in ss}}
        for k in KEYS:
            v = stat([m['value'] for s in ss for m in s['measurements'] if m['key'] == k and m['status'] == 'measured'])
            if v:
                out[f'{role}:{k}'] = v
    for m in CMP:
        c = cmp(run, m)
        if c and c[0] is not None:
            out['d:' + m] = c
    cand = [s for s in env['samples'] if s['fixtureId'] not in base and s['status'] == 'passed']
    lcps = [(next((m.get('value') for m in s['measurements'] if m['key'] == 'page.lcp'), None), s) for s in cand]
    lcps = sorted([x for x in lcps if x[0] is not None], key=lambda x: x[0])
    if lcps:
        s = lcps[(len(lcps) - 1) // 2][1]
        reqs = (s.get('diagnostics') or {}).get('requests') or []
        if reqs:
            r0 = min(r['startedAt'] for r in reqs)
            out['median_sample_requests'] = [
                (r['url'].split('?')[0].replace('http://127.0.0.1:4310', '').replace('https://benchmarks-with-cookie-yes.vercel.app:4610', ''),
                 round(r['startedAt'] - r0), r.get('transferBytes'), r.get('phase'))
                for r in sorted(reqs, key=lambda r: r['startedAt'])]
    print(json.dumps(out))
