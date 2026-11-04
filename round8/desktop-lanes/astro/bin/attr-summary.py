#!/usr/bin/env python3 -I
"""attr-summary.py <attr.json> <phase>: bytes per package and per area for a
phase's chunks. Brotli per area = chunk brotli split by raw share within the
chunk (as the nuxt lane did). Unmapped bytes stay with the chunk as '(unmapped)'."""
import json, re, sys, collections
d = json.load(open(sys.argv[1]))[sys.argv[2]]
def area(m):
    m2 = re.sub(r'^\.\./', '', m)
    g = re.match(r'(@c15t/[a-z-]+)/dist/(modules/[a-z-]+|[a-z-]+)', m2)
    if g: return f'{g.group(1)}/{g.group(2).replace(".js","")}'
    g = re.match(r'(@[a-z0-9-]+/[a-z0-9-]+|[a-z0-9-]+)/', m2)
    return g.group(1) if g else m2
pk, ar = collections.Counter(), collections.Counter()
pkr, arr = collections.Counter(), collections.Counter()
tot_raw = tot_br = 0
for c in d:
    tot_raw += c['raw']; tot_br += c['br']
    scale = c['br'] / c['raw'] if c['raw'] else 0
    for p, b in c['packages'].items(): pk[p] += b * scale; pkr[p] += b
    for m, b in c['modules'].items(): ar[area(m)] += b * scale; arr[area(m)] += b
    pk['(unmapped)'] += c['unmapped'] * scale; pkr['(unmapped)'] += c['unmapped']
print(f'phase {sys.argv[2]}: {len(d)} chunks, raw {tot_raw}, br {tot_br}')
print('| Package | Raw B | Brotli B (est.) |\n| --- | ---: | ---: |')
for p, b in pk.most_common(): print(f'| {p} | {pkr[p]:,} | {round(b):,} |')
print('\n| Area | Raw B | Brotli B (est.) |\n| --- | ---: | ---: |')
for a, b in ar.most_common(25): print(f'| `{a}` | {arr[a]:,} | {round(b):,} |')
