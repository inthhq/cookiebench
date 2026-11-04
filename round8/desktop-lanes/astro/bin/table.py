#!/usr/bin/env python3 -I
"""table.py <run-dir>... : one JSON row per run for the astro lane report.

Candidate = the non-baseline fixture. Deltas and intervals come from
CookieBench's compare (paired percentile bootstrap; compare labels the level
0.975). Values without a delta are candidate medians. Action metrics are
median (max, n) of the candidate's measured samples. `first_script` is the
first /controlled/script server event after navigation (returning visitors).
"""
import json
import os
import statistics
import sys

ACTION = ['action.input-to-next-paint', 'action.dismissed', 'action.consent-effective',
          'action.scripts-complete', 'action.preferences-visible']


def med(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs)) if xs else None


def mx(xs):
    xs = [x for x in xs if x is not None]
    return round(max(xs)) if xs else None


def compare(run, metric):
    try:
        d = json.load(open(os.path.join(run, f'compare-{metric}.json')))
    except Exception:
        return None
    for c in d.get('comparisons', []):
        p = c.get('paired') or {}
        ci = p.get('confidenceInterval') or {}
        return {'median': p.get('medianDifference'), 'low': ci.get('low'), 'high': ci.get('high'),
                'eligible': c.get('eligible'), 'reasons': c.get('eligibilityReasons')}
    return None


def fmt(d):
    if not d or d['median'] is None:
        return None
    s = f"{d['median']:+g}"
    if d['low'] is not None:
        s += f" ({d['low']:g} to {d['high']:g})"
    return s


def own_delta(cand, ctrl, key):
    """Median of per-iteration differences when compare gives none."""
    by = lambda ss: {s['iteration']: m['value'] for s in ss for m in s['measurements']
                     if m['key'] == key and m['status'] == 'measured'}
    a, b = by(cand), by(ctrl)
    diffs = [a[i] - b[i] for i in a if i in b]
    return med(diffs), len(diffs)


def row(run):
    env = json.load(open(os.path.join(run, 'envelope.json')))
    base = {f['id'] for f in env['fixtures'] if f.get('baseline')}
    cand = [s for s in env['samples'] if s['fixtureId'] not in base]
    ctrl = [s for s in env['samples'] if s['fixtureId'] in base]
    vals = lambda ss, k: [m.get('value') for s in ss for m in s['measurements'] if m['key'] == k and m['status'] == 'measured']
    failed = [s for s in cand if s['status'] != 'passed']
    out = {
        'run': os.path.basename(run.rstrip('/')),
        'scenario': cand[0]['scenarioId'] if cand else None,
        'cand': cand[0]['fixtureId'] if cand else None,
        'passed': f"{len(cand) - len(failed)}/{len(cand)}",
        'failures': sorted({f.get('code', '?') for s in failed for f in (s.get('failures') or [])}),
        'ctrl_fcp': med(vals(ctrl, 'page.fcp')), 'ctrl_lcp': med(vals(ctrl, 'page.lcp')),
        'fcp': med(vals(cand, 'page.fcp')), 'lcp': med(vals(cand, 'page.lcp')),
        'banner': med(vals(cand, 'banner.visible')),
        'transfer': med(vals(cand, 'initial.transfer')), 'ctrl_transfer': med(vals(ctrl, 'initial.transfer')),
        'requests': med(vals(cand, 'initial.requests')), 'ctrl_requests': med(vals(ctrl, 'initial.requests')),
        'longtask': med(vals(cand, 'initial.long-task-blocking')),
        'ctrl_longtask': med(vals(ctrl, 'initial.long-task-blocking')),
    }
    for metric, key in [('page.lcp', 'lcp_delta'), ('page.fcp', 'fcp_delta'),
                        ('initial.transfer', 'transfer_delta'), ('initial.requests', 'requests_delta'),
                        ('initial.long-task-blocking', 'longtask_delta')]:
        c = compare(run, metric)
        out[key] = fmt(c)
        if out[key] is None and vals(cand, metric):
            d, n = own_delta(cand, ctrl, metric)
            if d is not None:
                out[key] = f'{d:+g} (own, {n} pairs, no compare interval)'
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
        out['first_script'] = (med(first), mx(first), len(first))
    return out


for run in sys.argv[1:]:
    try:
        print(json.dumps(row(run)))
    except FileNotFoundError:
        print(json.dumps({'run': os.path.basename(run), 'missing': 'envelope'}))
