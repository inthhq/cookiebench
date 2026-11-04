#!/usr/bin/env python3
"""check.py <run-dir> <fcp-limit-ms|none>

Keep/discard verdict for one CookieBench run under the remeasure rules:
- discard if the control FCP median exceeds the limit (mobile only; pass
  'none' for desktop),
- discard if any 1-min load-average sample taken while this run held the
  measurement lock exceeds 8,
- discard if any sample failed. On action scenarios the no-CMP control has
  no banner to act on, so control samples that fail only with
  `required-measurement-unavailable` are expected and not counted.
Prints one JSON line; exit 0 = keep, 1 = discard.
"""
import json, os, statistics, sys

run, limit = sys.argv[1], sys.argv[2]
out = {'run': os.path.basename(run), 'reasons': []}
meta = open(f'{run}/meta.txt').read()
exit_code = meta.rsplit('exit=', 1)[-1].strip() if 'exit=' in meta else '?'
out['exit'] = exit_code
pids = set(open(f'{run}/runner.pids').read().split()) if os.path.exists(f'{run}/runner.pids') else set()
rows = [l.split() for l in open(f'{run}/loadavg.txt') if l.strip()] if os.path.exists(f'{run}/loadavg.txt') else []
held = [float(r[1]) for r in rows if len(r) >= 5 and r[4] in pids]
out['load_samples'] = len(held)
out['load_median'] = round(statistics.median(held), 2) if held else None
out['load_max'] = max(held) if held else None
if held and max(held) > 8:
    out['reasons'].append(f'load {max(held)} > 8')
if not os.path.exists(f'{run}/envelope.json'):
    out['reasons'].append(f'no envelope (exit {exit_code})')
    print(json.dumps(out)); sys.exit(1)
env = json.load(open(f'{run}/envelope.json'))
base = {f['id'] for f in env['fixtures'] if f.get('baseline')}
scen = env['samples'][0]['scenarioId'] if env['samples'] else '?'
out['scenario'] = scen
fcp = []
failed = []
counts = {}
for s in env['samples']:
    counts[s['fixtureId']] = counts.get(s['fixtureId'], 0) + 1
    if s['fixtureId'] in base:
        v = [m['value'] for m in s['measurements'] if m['key'] == 'page.fcp' and m['status'] == 'measured']
        fcp += v
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
    out['failed'] = failed
if limit != 'none' and fcp and statistics.median(fcp) > float(limit):
    out['reasons'].append(f'control FCP median {statistics.median(fcp)} > {limit}')
if exit_code not in ('0', '2'):
    out['reasons'].append(f'exit {exit_code}')
print(json.dumps(out))
sys.exit(1 if out['reasons'] else 0)
