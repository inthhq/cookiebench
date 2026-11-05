#!/usr/bin/env python3 -I
"""html-parts.py <c15t.html> <baseline.html>: split the c15t page's HTML into
parts and estimate each part's brotli share (brotli of the whole document
minus brotli of the document with that part removed, quality 11)."""
import re, subprocess, sys
def br(b):
    return len(subprocess.run(['brotli', '-c', '-q', '11', '-'], input=b, capture_output=True, check=True).stdout)
h = open(sys.argv[1], 'rb').read(); base = open(sys.argv[2], 'rb').read()
full = br(h)
print(f'document raw {len(h)} br {full}; baseline raw {len(base)} br {br(base)}')
parts = {
  'first-paint <style data-c15t-styles>': rb'<style data-c15t-styles[^>]*>.*?</style>',
  'config <script data-c15t-config>': rb'<script type="application/json" data-c15t-config>.*?</script>',
  'inline early script <script data-c15t-inline>': rb'<script data-c15t-inline>.*?</script>',
  'banner markup (consent-banner-root subtree, approx: from root to </body> scripts)': rb'<div[^>]*data-testid="consent-banner-root".*?(?=<script type="module")',
  'module <script src> tags': rb'(?:<script type="module" src="[^"]+"></script>)+',
}
for name, pat in parts.items():
    m = re.search(pat, h, re.S)
    if not m: print('missing', name); continue
    seg = m.group(0)
    rest = h[:m.start()] + h[m.end():]
    print(f'{name}: raw {len(seg)}, alone br {br(seg)}, marginal br {full - br(rest)}')
