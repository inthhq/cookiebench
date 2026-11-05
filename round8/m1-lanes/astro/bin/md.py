#!/usr/bin/env python3 -I
"""md.py: Markdown tables for the astro report from kept runs in runs/ledger.log.

Prints one load table per profile (every arm), the action table, and the
ledger table. Values come from bin/table.py rows (compare paired median
delta with its interval; candidate medians otherwise).
"""
import json
import os
import re
import subprocess
import sys

A = '/Users/kayleewilliams/.t3/scratch/lcp-fleet/frameworks/astro'
R = f'{A}/runs'
ledger = [l.rstrip('\n') for l in open(f'{R}/ledger.log') if l.strip()]
kept = {}
for l in ledger:
    p = l.split(' ', 3)
    if p[1] == 'KEEP' and not p[2].startswith('c15t-waterfall'):
        label = re.sub(r'-\d{8}-\d{6}$', '', p[2])
        kept[label] = f'{R}/{p[2]}'


def row(run):
    out = subprocess.run([sys.executable, '-I', f'{A}/bin/table.py', run], capture_output=True, text=True).stdout
    return json.loads(out)


def load_max(run):
    vals = [float(l.split()[1]) for l in open(f'{run}/loadavg.txt') if l.strip()]
    return max(vals) if vals else None


def n(x):
    return '' if x is None else f'{x:,}'


rows = {k: row(v) for k, v in kept.items()}
for prof in ['mobile', 'desktop']:
    lines = [f'### {prof} load', '',
             '| Arm | Run | Passed | Control FCP / LCP | LCP Δ (compare CI) | FCP Δ (CI) | banner.visible | transfer Δ | requests Δ | long-task cand (ctrl) | load max |',
             '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
    for arm in ['c15t', 'cy']:
        k = f'{arm}-{prof}-load'
        if k not in rows:
            continue
        r = rows[k]
        lines.append(f"| {'c15t canary' if arm == 'c15t' else 'CookieYes'} | `{r['run']}` | {r['passed']} | {n(r['ctrl_fcp'])} / {n(r['ctrl_lcp'])} | {r['lcp_delta']} | {r['fcp_delta']} | {n(r['banner'])} | {r['transfer_delta']} | {r['requests_delta']} | {r['longtask']} ({r['ctrl_longtask']}) | {load_max(kept[k])} |")
    print('\n'.join(lines) + '\n')

act = ['action.input-to-next-paint', 'action.dismissed', 'action.consent-effective',
       'action.scripts-complete', 'action.preferences-visible']
lines = ['### mobile actions (candidate median / max, n)', '',
         '| Scenario | Arm | Passed | Control FCP | input-to-next-paint | dismissed | consent-effective | scripts-complete | preferences-visible | first /controlled/script | load max |',
         '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
for scen in ['accept', 'reject', 'save', 'preferences', 'returning-accepted']:
    for arm in ['c15t', 'cy']:
        k = f'{arm}-mobile-{scen}'
        if k not in rows:
            continue
        r = rows[k]
        cell = lambda v: '—' if not v else f'{v[0]:,} / {v[1]:,} ({v[2]})'
        lines.append(f"| {scen} | {'c15t' if arm == 'c15t' else 'CookieYes'} | {r['passed']} | {n(r['ctrl_fcp'])} | " + ' | '.join(cell(r.get(a)) for a in act) + f" | {cell(r.get('first_script'))} | {load_max(kept[k])} |")
print('\n'.join(lines) + '\n')

print('### ledger\n')
print('| Time | Verdict | Run | Reason |\n| --- | --- | --- | --- |')
for l in ledger:
    p = l.split(' ', 3)
    print(f'| {p[0][11:16]} | {p[1]} | `{p[2]}` | {p[3] if len(p) > 3 else ""} |')
