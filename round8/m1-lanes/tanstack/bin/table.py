#!/usr/bin/env python3
"""table.py: markdown tables from the latest KEEP run per label in runs/ledger.log
(python3 -I). Prints load tables (per profile) and action tables, plus a
ledger table with control FCP and load per attempt."""
import json
import os
import re
import statistics
import subprocess
import sys

T = '/Users/kayleewilliams/.t3/scratch/lcp-fleet/frameworks/tanstack'
R = f'{T}/runs'
sys.path.insert(0, f'{T}/bin')


def check(run):
    out = subprocess.run(['python3', '-I', f'{T}/bin/check.py', f'{R}/{run}'], capture_output=True, text=True).stdout
    return json.loads(out)


ledger = [l.rstrip('\n') for l in open(f'{R}/ledger.log') if l.strip()]
kept = {}
for l in ledger:
    t, v, run = l.split(' ', 3)[:3]
    if v == 'KEEP':
        label = re.sub(r'-\d{8}-\d{6}$', '', run)
        kept[label] = run


def ci(c):
    if not c:
        return '–'
    m, lo, hi = c.get('median'), c.get('low'), c.get('high')
    if m is None:
        return '–'
    s = f'{m:+,.0f}'
    if lo is not None and hi is not None:
        s += f' ({lo:+,.0f} to {hi:+,.0f})'
    else:
        s += ' (no CI)'
    return s


def fmt(x):
    return '–' if x is None else f'{x:,}'


def samples(run):
    e = json.load(open(f'{R}/{run}/envelope.json'))
    base = {f['id'] for f in e['fixtures'] if f.get('baseline')}
    cand = [s for s in e['samples'] if s['fixtureId'] not in base]
    ctrl = [s for s in e['samples'] if s['fixtureId'] in base]
    return cand, ctrl


def vals(ss, k):
    return [m['value'] for s in ss for m in s['measurements'] if m['key'] == k and m['status'] == 'measured']


def mm(v):
    return f'{round(statistics.median(v)):,} / {round(max(v)):,}' if v else '–'


load_rows = [('m', 'mobile-article-v1'), ('d', 'desktop-article-v1-browser-ua')]
arms = [('canary', 'c15t canary `d4803ef60`'), ('ic', 'instant-commit `ad86f4805`'), ('cy', 'CookieYes')]
for pre, prof in load_rows:
    cols = [(a, n, kept.get(f'{pre}-{a}-load')) for a, n in arms]
    cols = [c for c in cols if c[2]]
    if not cols:
        continue
    rs = {a: check(run) for a, _, run in cols}
    print(f'\n### {prof}, `load`\n')
    print('| Measure | ' + ' | '.join(n for _, n, _ in cols) + ' |')
    print('| --- |' + ' ---: |' * len(cols))
    def row(label, f):
        print(f'| {label} | ' + ' | '.join(f(rs[a], run) for a, _, run in cols) + ' |')
    row('Run', lambda r, run: f'`{run}`')
    row('page.lcp Δ, compare (95% CI)', lambda r, run: ci(r.get('cmp:page.lcp')))
    row('page.lcp median, cand / ctrl', lambda r, run: f"{fmt(r['lcp'])} / {fmt(r['ctrl_lcp'])}")
    row('page.fcp Δ (95% CI)', lambda r, run: ci(r.get('cmp:page.fcp')))
    row('page.fcp median, cand / ctrl', lambda r, run: f"{fmt(r['fcp'])} / {fmt(r['ctrl_fcp'])}")
    row('banner.visible median / max', lambda r, run: mm(vals(samples(run)[0], 'banner.visible')))
    row('initial.transfer Δ (B)', lambda r, run: ci(r.get('cmp:initial.transfer')))
    row('initial.transfer cand / ctrl', lambda r, run: f"{fmt(r['transfer'])} / {fmt(r['ctrl_transfer'])}")
    row('initial.requests cand / ctrl', lambda r, run: f"{fmt(r['requests'])} / {fmt(r['ctrl_requests'])}")
    row('initial.long-task-blocking cand / ctrl', lambda r, run: f"{fmt(r['longtask'])} / {fmt(r['ctrl_longtask'])}")
    row('samples passed', lambda r, run: r['passed'])
    row('load max during run', lambda r, run: str(r['load_max']))

AK = [('action.input-to-next-paint', 'INP'), ('action.dismissed', 'dismissed'),
      ('action.consent-effective', 'consent-effective'), ('action.scripts-complete', 'scripts-complete'),
      ('action.preferences-visible', 'preferences-visible')]
for scen in ['accept', 'reject', 'save', 'preferences', 'returning-accepted']:
    cols = [(a, n, kept.get(f'm-{a}-{scen}')) for a, n in arms]
    cols = [c for c in cols if c[2]]
    if not cols:
        continue
    print(f'\n### mobile `{scen}` (median / max, ms)\n')
    print('| Measure | ' + ' | '.join(n for _, n, _ in cols) + ' |')
    print('| --- |' + ' ---: |' * len(cols))
    data = {a: samples(run) for a, _, run in cols}
    rs = {a: check(run) for a, _, run in cols}
    print('| Run | ' + ' | '.join(f'`{run}`' for _, _, run in cols) + ' |')
    for k, n in AK + [('banner.visible', 'banner.visible')]:
        cells = [mm(vals(data[a][0], k)) for a, _, _ in cols]
        if all(c == '–' for c in cells):
            continue
        print(f'| {n} | ' + ' | '.join(cells) + ' |')
    if scen == 'returning-accepted':
        for k in ('page.lcp', 'page.fcp', 'consent.resolution', 'initial.transfer', 'initial.requests', 'scripts.executions'):
            print(f'| {k}, cand / ctrl (median) | ' + ' | '.join(
                f"{fmt(round(statistics.median(vals(data[a][0], k)))) if vals(data[a][0], k) else '–'} / {fmt(round(statistics.median(vals(data[a][1], k)))) if vals(data[a][1], k) else '–'}" for a, _, _ in cols) + ' |')
        print('| banner shown (samples) | ' + ' | '.join(str(len(vals(data[a][0], 'banner.visible'))) for a, _, _ in cols) + ' |')
    print('| samples passed | ' + ' | '.join(rs[a]['passed'] for a, _, _ in cols) + ' |')
    print('| control page.fcp median | ' + ' | '.join(fmt(rs[a]['ctrl_fcp']) for a, _, _ in cols) + ' |')
    print('| load max during run | ' + ' | '.join(str(rs[a]['load_max']) for a, _, _ in cols) + ' |')

print('\n### Ledger\n')
print('| Time | Verdict | Run | Control FCP | Load max | Passed | Reason |')
print('| --- | --- | --- | ---: | ---: | --- | --- |')
for l in ledger:
    t, v, run, reason = (l.split(' ', 3) + [''])[:4]
    if run.startswith('wf-'):
        lm = re.search(r"load max ([0-9.]+)", reason)
        pr = re.search(r"pairs (\S+)", reason)
        print(f"| {t[11:16]} | {v} | `{run}` | – | {lm.group(1) if lm else '–'} | {pr.group(1) if pr else '–'} | {reason.split(';')[0]} |")
        continue
    try:
        r = check(run)
        print(f"| {t[11:16]} | {v} | `{run}` | {fmt(r['ctrl_fcp'])} | {r['load_max']} | {r['passed']} | {reason.split('; ctrl FCP')[0]} |")
    except Exception:
        print(f"| {t[11:16]} | {v} | `{run}` | – | – | – | {'no envelope: lost the lock-recovery race before measuring' if reason.startswith('no envelope') else reason} |")
