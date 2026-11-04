#!/usr/bin/env python3 -I
"""check.py <run-dir> <fcp-limit-ms|none> [--ledger]

Keep/discard verdict for one run under the round-8 rules:
- discard if any 1-minute load sample taken while the run held the lock
  exceeds 8 (loadavg.txt only holds samples from the attempt that ran),
- discard on any failed sample, except a no-CMP control's expected
  `required-measurement-unavailable` on action scenarios,
- discard if the control FCP median exceeds the limit (mobile: 400).
Prints one JSON line. With --ledger, appends a line to runs/ledger.log.
Exit 0 = keep, 1 = discard.
"""
import datetime
import json
import os
import statistics
import sys

run, limit = sys.argv[1], sys.argv[2]
ledger = '--ledger' in sys.argv
out = {'run': os.path.basename(run.rstrip('/')), 'reasons': []}
meta = open(f'{run}/meta.txt').read()
exit_code = meta.rsplit('exit=', 1)[-1].strip() if 'exit=' in meta else '?'
out['exit'] = exit_code
rows = [l.split() for l in open(f'{run}/loadavg.txt') if l.strip()] if os.path.exists(f'{run}/loadavg.txt') else []
load = [float(r[1]) for r in rows]
out['load_samples'] = len(load)
out['load_median'] = round(statistics.median(load), 2) if load else None
out['load_max'] = max(load) if load else None
if load and max(load) > 8:
    out['reasons'].append(f'load {max(load)} > 8')
if 'load gate' in meta:
    out['gate_note'] = [l for l in meta.splitlines() if 'load gate' in l]
env = None
if os.path.exists(f'{run}/envelope.json'):
    env = json.load(open(f'{run}/envelope.json'))
else:
    out['reasons'].append(f'no envelope (exit {exit_code})')
if env:
    base = {f['id'] for f in env['fixtures'] if f.get('baseline')}
    scen = env['samples'][0]['scenarioId'] if env['samples'] else '?'
    out['scenario'] = scen
    fcp, failed, counts = [], [], {}
    for s in env['samples']:
        counts[s['fixtureId']] = counts.get(s['fixtureId'], 0) + 1
        if s['fixtureId'] in base:
            fcp += [m['value'] for m in s['measurements'] if m['key'] == 'page.fcp' and m['status'] == 'measured']
        if s['status'] == 'passed':
            continue
        codes = [f.get('code') for f in (s.get('failures') or [])]
        if s['fixtureId'] in base and scen != 'load' and codes and all(c == 'required-measurement-unavailable' for c in codes):
            continue
        failed.append(f"{s['fixtureId']}#{s['iteration']}:{s['status']}:{','.join(map(str, codes))}")
    out['samples'] = counts
    out['control_fcp'] = [min(fcp), statistics.median(fcp), max(fcp)] if fcp else None
    if failed:
        out['reasons'].append(f'{len(failed)} failed sample(s)')
        out['failed'] = failed[:12]
    if limit != 'none' and fcp and statistics.median(fcp) > float(limit):
        out['reasons'].append(f'control FCP median {statistics.median(fcp)} > {limit}')
    if exit_code not in ('0', '2'):
        out['reasons'].append(f'exit {exit_code}')
print(json.dumps(out))
if ledger:
    when = datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    verdict = 'DISCARD' if out['reasons'] else 'KEEP'
    cf = out.get('control_fcp')
    why = '; '.join(out['reasons']) or 'gates passed'
    with open(os.path.join(os.path.dirname(run.rstrip('/')), 'ledger.log'), 'a') as f:
        f.write(f"{when} {verdict} {out['run']} {why} (control FCP median {cf[1] if cf else 'n/a'}, load max {out['load_max']}, exit {exit_code})\n")
sys.exit(1 if out['reasons'] else 0)
