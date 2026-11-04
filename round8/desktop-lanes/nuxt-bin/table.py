#!/usr/bin/env python3
"""table.py <run-dir>... : one row per run for the Nuxt lane report.

Candidate = the non-baseline fixture. LCP/FCP deltas and intervals come from
CookieBench's compare (95% paired percentile bootstrap). Gate: control FCP
median <= 400 ms (mobile), every load-average sample <= 8, no failed
candidate sample.
"""
import json, os, statistics, sys

ACTION = ['action.input-to-next-paint', 'action.dismissed', 'action.consent-effective',
          'action.scripts-complete', 'action.preferences-visible']


def med(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs)) if xs else None


def mx(xs):
    xs = [x for x in xs if x is not None]
    return round(max(xs)) if xs else None


def compare(run, metric):
    f = os.path.join(run, f'compare-{metric}.json')
    try:
        d = json.load(open(f))
    except Exception:
        return None
    for c in d.get('comparisons', []):
        p = c.get('paired') or {}
        ci = p.get('confidenceInterval') or {}
        return {'median': p.get('medianDifference'),
                'low': ci.get('low'), 'high': ci.get('high'), 'eligible': c.get('eligible'),
                'raw': p}
    return None


def row(run):
    env = json.load(open(os.path.join(run, 'envelope.json')))
    base = {f['id'] for f in env['fixtures'] if f.get('baseline')}
    samples = env['samples']
    cand = [s for s in samples if s['fixtureId'] not in base]
    ctrl = [s for s in samples if s['fixtureId'] in base]
    vals = lambda ss, k: [m.get('value') for s in ss for m in s['measurements'] if m['key'] == k and m['status'] == 'measured']
    la = []
    if os.path.exists(os.path.join(run, 'loadavg.txt')):
        la = [float(l.split()[1]) for l in open(os.path.join(run, 'loadavg.txt')) if l.strip()]
    failed = [s for s in cand if s['status'] != 'passed']
    out = {
        'run': os.path.basename(run),
        'cand': cand[0]['fixtureId'] if cand else None,
        'passed': f"{len(cand) - len(failed)}/{len(cand)}",
        'failures': sorted({f.get('code', f.get('reason', '?')) if isinstance(f, dict) else str(f) for s in failed for f in (s.get('failures') or [])}),
        'ctrl_fcp': med(vals(ctrl, 'page.fcp')),
        'load_max': max(la) if la else None,
        'fcp': med(vals(cand, 'page.fcp')),
        'lcp': med(vals(cand, 'page.lcp')),
        'ctrl_lcp': med(vals(ctrl, 'page.lcp')),
        'banner': med(vals(cand, 'banner.visible')),
        'transfer': med(vals(cand, 'initial.transfer')),
        'ctrl_transfer': med(vals(ctrl, 'initial.transfer')),
        'requests': med(vals(cand, 'initial.requests')),
        'ctrl_requests': med(vals(ctrl, 'initial.requests')),
        'longtask': med(vals(cand, 'initial.long-task-blocking')),
    }
    lcp = compare(run, 'page.lcp')
    if lcp:
        out['lcp_delta'] = lcp
    fcp = compare(run, 'page.fcp')
    if fcp:
        out['fcp_delta'] = fcp
    for k in ACTION:
        v = vals(cand, k)
        if v:
            out[k] = (med(v), mx(v), len(v))
    first = []
    for s in cand:
        d = s.get('diagnostics') or {}
        ev = [e for e in (d.get('serverEvents') or []) if e.get('type') == 'script']
        if ev and d.get('timeOrigin') is not None:
            first.append(min(e['timestamp'] for e in ev) - d['timeOrigin'])
    if first:
        out['first_script'] = (med(first), mx(first))
    out['gate'] = 'ok'
    reasons = []
    if out['ctrl_fcp'] is not None and out['ctrl_fcp'] > 400 and 'desktop' not in run:
        reasons.append(f"control FCP {out['ctrl_fcp']}")
    if out['load_max'] is not None and out['load_max'] > 8:
        reasons.append(f"load {out['load_max']}")
    if failed:
        reasons.append(f"{len(failed)} failed sample(s)")
    if reasons:
        out['gate'] = 'DISCARD: ' + ', '.join(reasons)
    return out


for run in sys.argv[1:]:
    try:
        r = row(run)
    except FileNotFoundError:
        print(json.dumps({'run': os.path.basename(run), 'missing': 'envelope'}))
        continue
    if 'lcp_delta' in r:
        d = r['lcp_delta']
        r['lcp_delta'] = f"{d['median']} ({d['low']}..{d['high']})" if d['median'] is not None else d['raw']
    if 'fcp_delta' in r:
        d = r['fcp_delta']
        r['fcp_delta'] = f"{d['median']} ({d['low']}..{d['high']})" if d['median'] is not None else None
    print(json.dumps(r))
