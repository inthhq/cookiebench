#!/usr/bin/env python3
"""wf-attr.py <waterfall-dir> <arm>  (python3 -I)

From waterfall.json (waterfall-tanstack.mjs), per pair: bytes and requests
finished before the hero ended (hero excluded), candidate minus control.
Then, for the median pair, the candidate's before-hero requests by kind
and, for JS chunks, by package and module (static/attr-<arm>.json via
static/map-<arm>.json; wire bytes split by each chunk's raw share).
Writes <dir>/attr.md and prints it.
"""
import collections
import json
import os
import statistics
import sys
from urllib.parse import urlparse

T = '/Users/kayleewilliams/.t3/scratch/lcp-fleet/frameworks/tanstack'
wdir, arm = sys.argv[1], sys.argv[2]
visits = json.load(open(os.path.join(wdir, 'waterfall.json')))
attr = {c['file']: c for c in json.load(open(f'{T}/static/attr-{arm}.json'))['all']}
cmap = json.load(open(f'{T}/static/map-{arm}.json'))


def before(v):
    return [r for r in v['requests'] if 'courtyard.png' not in r['url'] and r['end'] is not None
            and v['heroEnd'] is not None and r['end'] <= v['heroEnd']]


def path(u):
    p = urlparse(u)
    return (p.path if p.hostname == '127.0.0.1' else f'{p.hostname}{p.path}')


ctrl = [v for v in visits if v['arm'] == 'control']
cand = [v for v in visits if v['arm'] == 'candidate']
pairs = list(zip(ctrl, cand))
lines = [f'# Bytes before the hero, {arm} ({len(pairs)} pairs)', '',
         '| Pair | Control LCP | Cand LCP | Control hero end | Cand hero end | Control B / req | Cand B / req | Δ bytes | Δ req | Cand banner | Cand FCP |',
         '| ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: |']
deltas = []
for i, (c, k) in enumerate(pairs, 1):
    bc, bk = before(c), before(k)
    sc, sk = sum(r['bytes'] or 0 for r in bc), sum(r['bytes'] or 0 for r in bk)
    deltas.append((sk - sc, len(bk) - len(bc), i))
    lines.append(f"| {i} | {round(c['lcp'])} | {round(k['lcp'])} | {c['heroEnd']} | {k['heroEnd']} | {sc:,} / {len(bc)} | {sk:,} / {len(bk)} | {sk - sc:+,} | {len(bk) - len(bc):+d} | {round(k['banner']) if k['banner'] else '–'} | {round(k['fcp'])} |")
md = statistics.median([d[0] for d in deltas])
mr = statistics.median([d[1] for d in deltas])
lines += ['', f'Median Δ bytes before hero: **{md:+,.0f} B**, Δ requests {mr:+}.', '']
rep = sorted(deltas)[(len(deltas) - 1) // 2][2]
c, k = pairs[rep - 1]
ctrl_paths = {path(r['url']) for v in ctrl for r in v['requests']}
lines += [f'## Median pair ({rep}): candidate requests finished before the hero', '',
          '| Request | Kind | In control | Wire B | Start | End |', '| --- | --- | --- | ---: | ---: | ---: |']
kinds = collections.Counter()
pk = collections.Counter()
mods = collections.Counter()
chunks = []
for r in before(k):
    p = path(r['url'])
    f = os.path.basename(p)
    kind = r['type']
    if p.startswith('/assets/') and f.endswith('.js'):
        kind = 'JS chunk'
        a = attr.get(cmap.get(f) or '')
        if a:
            share = (r['bytes'] or 0) / max(a['raw'], 1)
            for name, b in a['packages'].items():
                pk[name] += b * share
            for name, b in a['modules'].items():
                mods[name] += b * share
            top = sorted(a['packages'].items(), key=lambda x: -x[1])[:3]
            chunks.append((f, r['bytes'] or 0, a['raw'], p in ctrl_paths, ', '.join(f'{n} {round(100 * b / a["raw"])}%' for n, b in top)))
    elif r['type'] == 'Document':
        kind = 'Document'
    kinds[(kind, p in ctrl_paths)] += r['bytes'] or 0
    lines.append(f"| `{p}` | {kind} | {'yes' if p in ctrl_paths else 'no'} | {r['bytes'] or 0:,} | {r['start']} | {r['end']} |")
lines += ['', '### By kind (median pair)', '', '| Kind | Also in control | Wire B |', '| --- | --- | ---: |']
for (kind, inc), b in sorted(kinds.items(), key=lambda x: -x[1]):
    lines.append(f'| {kind} | {"yes" if inc else "no"} | {b:,} |')
lines += ['', '### JS chunks before the hero (median pair)', '', '| Chunk | Wire B | Raw B | In control | Top packages (raw share) |', '| --- | ---: | ---: | --- | --- |']
for f, b, raw, inc, top in sorted(chunks, key=lambda x: -x[1]):
    lines.append(f'| `{f}` | {b:,} | {raw:,} | {"yes" if inc else "no"} | {top} |')
lines += ['', '### JS wire bytes by package (median pair, all chunks before the hero)', '', '| Package | Wire B (split by raw share) |', '| --- | ---: |']
for name, b in pk.most_common(30):
    lines.append(f'| {name} | {b:,.0f} |')
lines += ['', '### Largest c15t modules (wire B, median pair)', '', '| Module | Wire B |', '| --- | ---: |']
for name, b in [x for x in mods.most_common(200) if 'c15t' in x[0]][:30]:
    lines.append(f'| `{name[-90:]}` | {b:,.0f} |')
open(os.path.join(wdir, 'attr.md'), 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
