#!/usr/bin/env python3
"""check.py <run-dir>... [--ledger]

One JSON row per run (python3 -I). Candidate = the non-baseline fixture.
LCP/FCP deltas and intervals come from CookieBench compare (95% paired
percentile bootstrap). Gate (round 8 brief):
  - every 1-minute load sample taken while the run held the lock <= 8
  - no failed sample, except a control's required-measurement-unavailable on
    an action scenario
  - mobile: control FCP median <= 400 ms (server-rendered fixture)
With --ledger, appends `<time> KEEP|DISCARD <label> <reason>` to
runs/ledger.log (once per run dir).
"""
import json
import os
import statistics
import sys
import time

ACTION = ['action.input-to-next-paint', 'action.dismissed', 'action.consent-effective',
          'action.scripts-complete', 'action.preferences-visible']
LEDGER = '/home/kaylee/.t3/scratch/lcp-fleet/frameworks/tanstack/runs/ledger.log'


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


def row(run):
    env = json.load(open(os.path.join(run, 'envelope.json')))
    cfg = json.load(open(os.path.join(run, 'config.json')))
    mobile = cfg['profile']['id'].startswith('mobile')
    scen = [s for s in env.get('scenarios', [])]
    action = any(s.get('action') not in (None, 'load') for s in scen)
    base = {f['id'] for f in env['fixtures'] if f.get('baseline')}
    samples = env['samples']
    cand = [s for s in samples if s['fixtureId'] not in base]
    ctrl = [s for s in samples if s['fixtureId'] in base]

    def vals(ss, k):
        return [m.get('value') for s in ss for m in s['measurements'] if m['key'] == k and m['status'] == 'measured']

    la = []
    lf = os.path.join(run, 'loadavg.txt')
    if os.path.exists(lf):
        la = [float(l.split()[1]) for l in open(lf) if l.strip()]
    cfail = [s for s in cand if s['status'] != 'passed']

    def expected(s):
        return action and all(f.get('code') == 'required-measurement-unavailable' for f in (s.get('failures') or []))

    kfail = [s for s in ctrl if s['status'] != 'passed' and not expected(s)]
    out = {
        'run': os.path.basename(run),
        'scenario': scen[0]['id'] if scen else None,
        'profile': cfg['profile']['id'],
        'cand': cand[0]['fixtureId'] if cand else None,
        'passed': f"{len(cand) - len(cfail)}/{len(cand)}",
        'failures': sorted({f.get('code', '?') for s in cfail + kfail for f in (s.get('failures') or [])}),
        'ctrl_fcp': med(vals(ctrl, 'page.fcp')),
        'ctrl_lcp': med(vals(ctrl, 'page.lcp')),
        'load_max': max(la) if la else None,
        'load_med': statistics.median(la) if la else None,
        'minutes': None,
        'fcp': med(vals(cand, 'page.fcp')),
        'lcp': med(vals(cand, 'page.lcp')),
        'banner': med(vals(cand, 'banner.visible')),
        'transfer': med(vals(cand, 'initial.transfer')),
        'ctrl_transfer': med(vals(ctrl, 'initial.transfer')),
        'requests': med(vals(cand, 'initial.requests')),
        'ctrl_requests': med(vals(ctrl, 'initial.requests')),
        'longtask': med(vals(cand, 'initial.long-task-blocking')),
        'ctrl_longtask': med(vals(ctrl, 'initial.long-task-blocking')),
    }
    try:
        out['minutes'] = round((int(open(os.path.join(run, 'ended')).read()) - int(open(os.path.join(run, 'started')).read())) / 60, 1)
    except Exception:
        pass
    for m in ('page.lcp', 'page.fcp', 'initial.transfer', 'initial.requests', 'banner.visible'):
        c = compare(run, m)
        if c:
            out[f'cmp:{m}'] = c
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
    reasons = []
    if mobile and out['ctrl_fcp'] is not None and out['ctrl_fcp'] > 400:
        reasons.append(f"control FCP {out['ctrl_fcp']}")
    if out['load_max'] is not None and out['load_max'] > 8:
        reasons.append(f"load {out['load_max']}")
    if not la:
        reasons.append('no load samples')
    if cfail:
        reasons.append(f"{len(cfail)} failed candidate sample(s) {out['failures']}")
    if kfail:
        reasons.append(f"{len(kfail)} failed control sample(s)")
    if not cand:
        reasons.append('no candidate samples')
    out['gate'] = 'DISCARD: ' + '; '.join(reasons) if reasons else 'KEEP'
    return out


def label(run):
    b = os.path.basename(run.rstrip('/'))
    return b


def main():
    ledger = '--ledger' in sys.argv
    for run in [a for a in sys.argv[1:] if not a.startswith('--')]:
        try:
            r = row(run)
            verdict = 'KEEP' if r['gate'] == 'KEEP' else 'DISCARD'
            lcp = r.get('cmp:page.lcp') or {}
            reason = (r['gate'][9:] if verdict == 'DISCARD' else 'gate ok') + \
                f"; ctrl FCP {r['ctrl_fcp']}, load max {r['load_max']}, passed {r['passed']}, LCP d {lcp.get('median')} ({lcp.get('low')}..{lcp.get('high')})"
        except FileNotFoundError as e:
            r = {'run': os.path.basename(run), 'missing': str(e)}
            verdict, reason = 'DISCARD', f'no envelope ({e.filename})'
        print(json.dumps(r))
        if ledger:
            seen = open(LEDGER).read() if os.path.exists(LEDGER) else ''
            if f' {label(run)} ' not in seen:
                with open(LEDGER, 'a') as f:
                    f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%S')} {verdict} {label(run)} {reason}\n")


main()
