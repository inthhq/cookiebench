// Attribute dist/c15t.js bytes to packages and modules from its source map.
// Usage: node attr.ts <c15t.js with map comment> <out.json>
// Brotli/gzip shares are split by raw share within the file (one file, one
// compression context), as the nuxt lane did per chunk.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

import {
	attributeChunk,
	sourceMappingURLOf,
	stripSourceMappingComment,
} from '/home/kaylee/.t3/worktrees/c15t-private/t3-092255b6/benchmarks/bundle-test-app/client-payload/attribute.ts';

const [file, out] = process.argv.slice(2);
const full = readFileSync(file, 'utf8');
const code = stripSourceMappingComment(full);
const map = JSON.parse(readFileSync(join(dirname(file), sourceMappingURLOf(full)!), 'utf8'));
const raw = Buffer.byteLength(code);
const br = brotliCompressSync(code, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
const gz = gzipSync(code, { level: 9 }).length;
const a = attributeChunk(code, map);
// Per-group text: rerun the line walk, collecting text per group so each
// group's standalone Brotli size can be measured and scaled to the file.
const groupText: Record<string, string[]> = {};
const pkgOf = (s: string) => {
	let m = s.match(/node_modules\/(@[^/]+\/[^/]+|[^@./][^/]*)\//);
	if (m && !s.includes('/packages/')) return m[1];
	m = s.match(/\/packages\/([^/]+)\//);
	if (m) return `@c15t/${m[1]}`;
	if (s.startsWith('webpack')) return '(rspack runtime)';
	return '(other)';
};
const modOf = (s: string) => {
	const m = s.match(/\/packages\/([^/]+)\/(.*)$/);
	if (m) return `@c15t/${m[1]}/${m[2].replace(/^dist\//, '')}`;
	const n = s.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\/(.*)$/);
	if (n) return `${n[1]}/${n[2]}`;
	return s;
};
const packages: Record<string, number> = {};
const modules: Record<string, number> = {};
for (const [source, bytes] of a.bySource) {
	packages[pkgOf(source)] = (packages[pkgOf(source)] ?? 0) + bytes;
	modules[modOf(source)] = (modules[modOf(source)] ?? 0) + bytes;
}
const sort = (o: Record<string, number>) =>
	Object.fromEntries(Object.entries(o).sort((x, y) => y[1] - x[1]));
// standalone brotli per coarse group, scaled so groups sum to the file's br
{
	const segsByLine: { column: number; source: string | null }[][] = [];
	// decode mappings with the module's own helper via attributeChunk on a per-line basis is private;
	// approximate with VLQ decode here.
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	const vlq = (str: string) => { const r: number[] = []; let v = 0, sh = 0; for (const c of str) { let d = chars.indexOf(c); const cont = d & 32; d &= 31; v += d << sh; if (cont) sh += 5; else { r.push(v & 1 ? -(v >>> 1) : v >>> 1); v = 0; sh = 0; } } return r; };
	let src = 0;
	for (const line of map.mappings.split(';')) {
		let col = 0; const segs: { column: number; source: string | null }[] = [];
		for (const seg of line.split(',')) { if (!seg) continue; const f = vlq(seg); col += f[0]; if (f.length > 1) { src += f[1]; segs.push({ column: col, source: map.sources[src] }); } else segs.push({ column: col, source: null }); }
		segsByLine.push(segs);
	}
	const group = (s: string | null) => {
		if (s === null) return '(unmapped)';
		const m = modOf(s);
		if (m.includes('generated/styles')) return '@c15t/browser styles (CSS string)';
		if (m.startsWith('@c15t/browser/src/ui/')) return '@c15t/browser ui (banner, dialog, widget)';
		return pkgOf(s);
	};
	const lines = code.split('\n');
	lines.forEach((line, i) => {
		const segs = segsByLine[i] ?? [];
		(groupText['(unmapped)'] ??= []).push(line.slice(0, segs[0]?.column ?? line.length));
		segs.forEach((sg, j) => { const g = group(sg.source); (groupText[g] ??= []).push(line.slice(sg.column, segs[j + 1]?.column ?? line.length)); });
	});
}
const groups: Record<string, { raw: number; brAlone: number; brScaled?: number }> = {};
let brSum = 0;
for (const [g, parts] of Object.entries(groupText)) {
	const t = parts.join('');
	const b = brotliCompressSync(t, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
	groups[g] = { raw: Buffer.byteLength(t), brAlone: b };
	brSum += b;
}
for (const g of Object.values(groups)) g.brScaled = Math.round((g.brAlone / brSum) * br);
console.log(JSON.stringify(groups, null, 1));
writeFileSync(
	out,
	JSON.stringify({ file, raw, br, gz, unmapped: a.unmappedBytes, groups, packages: sort(packages), modules: sort(modules) }, null, 1),
);
console.log(JSON.stringify({ raw, br, gz, unmapped: a.unmappedBytes, packages: sort(packages) }, null, 1));
