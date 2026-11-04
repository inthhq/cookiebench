// static-sizes.mjs <clientDir> <html-file> : brotli-11 size of every
// modulepreload / module script the HTML references, plus the HTML itself.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { brotliCompressSync, constants } from "node:zlib";
const [dir, htmlFile, prefix = ""] = process.argv.slice(2);
const html = readFileSync(htmlFile, "utf8");
const br = (b) => brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
const refs = [...new Set([...html.matchAll(/(?:href|src)="(?:\.\/|\/)?(?:baseline\/)?(_app\/immutable\/[^"]+\.js)"/g)].map((m) => m[1]))];
let raw = 0, sum = 0;
const rows = refs.map((r) => {
  const f = path.join(dir, prefix, r);
  const b = existsSync(f) ? readFileSync(f) : Buffer.alloc(0);
  raw += b.length; const s = br(b); sum += s;
  return { r, raw: b.length, br: s, low: html.includes(`/${r}" fetchpriority="low"`) };
});
console.log(JSON.stringify({ html: { raw: Buffer.byteLength(html), br: br(Buffer.from(html)) }, scripts: rows.length, raw, br: sum, rows }, null, 1));
