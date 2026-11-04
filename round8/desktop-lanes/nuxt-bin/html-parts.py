import re, sys, subprocess
def br(b): return len(subprocess.run(['brotli','-c','-q','11'], input=b, capture_output=True).stdout)
for label in sys.argv[1:]:
    html = open(f'static/{label}/page.html','rb').read()
    s = html.decode()
    parts = {}
    styles = re.findall(r'<style\b[^>]*>[\s\S]*?</style>', s)
    parts['<style> blocks'] = ''.join(styles)
    payload = re.findall(r'<script[^>]*id="__NUXT_DATA__"[^>]*>[\s\S]*?</script>', s)
    parts['Nuxt payload (__NUXT_DATA__)'] = ''.join(payload)
    other_inline = [m for m in re.findall(r'<script\b(?![^>]*\bsrc=)(?![^>]*__NUXT_DATA__)[^>]*>[\s\S]*?</script>', s)]
    parts['other inline <script>'] = ''.join(other_inline)
    links = re.findall(r'<link\b[^>]*>', s)
    parts['<link> tags'] = ''.join(links)
    m = re.search(r'<div[^>]*data-testid="consent-banner-root"', s)
    rest = s
    for v in parts.values(): rest = rest.replace(v, '')
    parts['markup and rest'] = rest
    print(f'== {label}: total raw {len(html):,} br {br(html):,}')
    for k, v in parts.items():
        b = v.encode()
        print(f'  {k:32s} raw {len(b):7,}  br-alone {br(b):6,}')
    # c15t-specific styles
    c15 = [x for x in styles if 'c15t' in x]
    print(f'  {"<style> with c15t":32s} raw {sum(len(x) for x in c15):7,}  count {len(c15)}')
    # payload: c15t keys sizes
    if payload:
        p = payload[0]
        print('  payload has c15t:boot', 'c15t:boot' in p, '; c15t:consent', 'c15t:consent' in p)
    bm = re.search(r'<div[^>]*data-testid="consent-banner-root"[\s\S]*?</div>\s*</div>\s*</div>', s)
