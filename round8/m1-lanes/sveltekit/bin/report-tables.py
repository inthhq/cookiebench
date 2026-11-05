#!/usr/bin/env python3
"""report-tables.py: markdown tables from kept runs (latest kept run per label)
and the ledger with control FCP and load per attempt."""
import glob, json, os, re, subprocess
L = '/Users/kayleewilliams/.t3/scratch/lcp-fleet/frameworks/sveltekit'
rows = {}
for d in sorted(glob.glob(L + '/runs/*-2026*')):
    if not os.path.exists(d + '/envelope.json'):
        continue
    label = re.sub(r'-\d{8}-\d{6}$', '', os.path.basename(d))
    if label.startswith(('smoke', 'verify', 'c15t-waterfall')):
        continue
    r = json.loads(subprocess.run(['python3', '-I', L + '/bin/table.py', d], capture_output=True, text=True).stdout)
    rows[label] = r
def g(label, key, i=None):
    r = rows.get(label)
    if not r or key not in r or r[key] is None:
        return '—'
    v = r[key]
    if i is not None:
        return f'{v[0]} ({v[1]})'
    return v
print(json.dumps({k: {kk: vv for kk, vv in v.items()} for k, v in rows.items()}, indent=1))
