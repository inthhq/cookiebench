#!/usr/bin/env python3
"""html-parts.py <c15t.html> <baseline.html>: split a page's HTML into parts
and give raw and brotli-11 bytes for each (python3 -I; brotli via node).

Parts: <style> blocks, inline <script> blocks, modulepreload links, banner
and dialog markup (consent-* subtrees, approximated by the span from the
first consent-banner/dialog marker to the end of that element), everything
else. Brotli of each part is computed alone, so parts do not add up to the
whole document's brotli size; the share column splits the whole document's
brotli size by raw share.
"""
import json
import re
import subprocess
import sys


def br(data: bytes) -> int:
    out = subprocess.run(
        ['node', '-e', 'const z=require("node:zlib");let b=[];process.stdin.on("data",c=>b.push(c)).on("end",()=>{const d=Buffer.concat(b);process.stdout.write(String(z.brotliCompressSync(d,{params:{[z.constants.BROTLI_PARAM_QUALITY]:11}}).length))})'],
        input=data, capture_output=True, check=True)
    return int(out.stdout)


def parts(html: str):
    res = []
    rest = html
    for m in re.finditer(r'<style\b[^>]*>(.*?)</style>', html, re.S):
        res.append(('style: ' + ('c15t' if 'c15t' in m.group(1) else 'page'), m.group(0)))
    for m in re.finditer(r'<script\b(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S):
        body = m.group(1)
        kind = 'router dehydration ($_TSR / $R)' if ('$R' in body or '$_TSR' in body) else ('c15t inline' if 'c15t' in body or '__c15t' in body else 'other inline')
        res.append(('script: ' + kind, m.group(0)))
    for m in re.finditer(r'<link\b[^>]*rel="modulepreload"[^>]*>', html):
        res.append(('modulepreload links', m.group(0)))
    for name in ('consent-banner-root', 'consent-dialog-root'):
        i = html.find(name)
        if i >= 0:
            start = html.rfind('<', 0, i)
            # end: the banner/dialog sits before </body>-level scripts; cut at
            # the next <script or <style after it
            ends = [x for x in (html.find('<script', i), html.find('<style', i), html.find('</body>', i)) if x > 0]
            end = min(ends) if ends else len(html)
            res.append((f'markup: {name} subtree (approx.)', html[start:end]))
    for _, s in res:
        rest = rest.replace(s, '', 1)
    res.append(('everything else (page markup, head)', rest))
    return res


def main():
    c15t, base = sys.argv[1], sys.argv[2]
    out = {}
    for label, f in (('c15t', c15t), ('baseline', base)):
        html = open(f, encoding='utf8').read()
        total_raw = len(html.encode())
        total_br = br(html.encode())
        agg = {}
        for k, s in parts(html):
            agg.setdefault(k, b'')
            agg[k] += s.encode()
        rows = []
        for k, b in agg.items():
            rows.append({'part': k, 'raw': len(b), 'br_alone': br(b) if b else 0,
                         'br_share': round(total_br * len(b) / total_raw)})
        out[label] = {'raw': total_raw, 'br': total_br, 'parts': rows}
    print(json.dumps(out, indent=1))


main()
