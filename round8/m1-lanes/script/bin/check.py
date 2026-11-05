#!/usr/bin/env python3
"""check.py <run-dir> <fcp-limit-ms|none>

Keep/discard verdict for one cb-run.sh run under BRIEF-M1:
- discard if any 30 s 1-minute load sample in loadavg.txt is above 10
  (cb-run.sh only samples while its runner runs),
- discard if the control FCP median exceeds the limit (mobile; 'none' on desktop),
- discard if any sample failed, except a control's required-measurement-unavailable
  on action scenarios (no banner to act on),
- discard if there is no envelope or the runner exited other than 0/2.
Prints one JSON line; exit 0 = keep, 1 = discard.
"""
import json, os, statistics, sys

run, limit = sys.argv[1], sys.argv[2]
out = {'run': os.path.basename(run), 'reasons': []}
meta = open(f'{run}/meta.txt').read()
exit_code = meta.rsplit('exit=', 1)[-1].split()[0] if 'exit=' in meta else '?'
out['exit'] = exit_code
rows = [l.split() for l in open(f'{run}/loadavg.txt') if l.strip()] if os.path.exists(f'{run}/loadavg.txt') else []
la = [float(r[1]) for r in rows if len(r) >= 2]
out['load_median'] = round(statistics.median(la), 2) if la else None
out['load_max'] = max(la) if la else None
gp = [l for l in meta.splitlines() if l.startswith('gate_passed')]
out['gate'] = gp[-1].split('load=')[-1] if gp else None
if 'still' in meta:
    out['gate_note'] = 'gate timed out after 30 min'
if la and max(la) > 10:
    out['reasons'].append(f'load {max(la)} > 10')
if not os.path.exists(f'{run}/envelope.json'):
    out['reasons'].append(f'no envelope (exit {exit_code})')
    print(json.dumps(out)); sys.exit(1)
env = json.load(open(f'{run}/envelope.json'))
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
    if s['fixtureId'] in base and scen not in ('load', 'returning-accepted') and codes and all(c == 'required-measurement-unavailable' for c in codes):
        continue
    failed.append(f"{s['fixtureId']}#{s.get('iteration')}:{s['status']}:{','.join(map(str, codes))}")
out['samples'] = counts
out['control_fcp'] = [min(fcp), statistics.median(fcp), max(fcp)] if fcp else None
if failed:
    out['reasons'].append(f'{len(failed)} failed sample(s)')
    out['failed'] = failed[:8]
if limit != 'none' and fcp and statistics.median(fcp) > float(limit):
    out['reasons'].append(f'control FCP median {statistics.median(fcp)} > {limit}')
if exit_code not in ('0', '2'):
    out['reasons'].append(f'exit {exit_code}')
print(json.dumps(out))
sys.exit(1 if out['reasons'] else 0)
