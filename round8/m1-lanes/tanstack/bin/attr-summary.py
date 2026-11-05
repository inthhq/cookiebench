import json, collections, sys
d=json.load(open(sys.argv[1]))
nmods=int(sys.argv[2]) if len(sys.argv)>2 else 45
for phase, chunks in d.items():
    pk=collections.Counter(); tot_raw=0; tot_br=0
    mods=collections.Counter()
    for c in chunks:
        tot_raw+=c['raw']; tot_br+=c['br']
        for p,b in c['packages'].items(): pk[p]+=b*c['br']/max(c['raw'],1)
        for m,b in c['modules'].items(): mods[m]+=b*c['br']/max(c['raw'],1)
    print(phase, len(chunks), 'raw', tot_raw, 'br', tot_br, '(br split by raw share)')
    for p,b in pk.most_common(25): print('  %-40s %7.0f' % (p,b))
    if phase=='first':
        for m,b in mods.most_common(nmods): print('    %-75s %6.0f' % (m[-75:],b))
