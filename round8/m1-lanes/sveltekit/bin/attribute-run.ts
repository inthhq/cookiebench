// Attribute chunk bytes to packages/modules with the c15t repo's attribute.ts.
// Usage: node attribute-run.ts <chunksDir> <out.json> <phase>=<hash,hash,...> ...
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

import {
	attributeChunk,
	moduleOf,
	packageOf,
	sourceMappingURLOf,
	stripSourceMappingComment,
} from '/Users/kayleewilliams/.t3/scratch/lcp-fleet/c15t-canary/benchmarks/bundle-test-app/client-payload/attribute.ts';

const [dir, out, ...phaseArgs] = process.argv.slice(2);
const result: Record<string, unknown> = {};
for (const arg of phaseArgs) {
	const [phase, list] = arg.split('=');
	const chunks = [];
	for (const hash of list.split(',').filter(Boolean)) {
		const file = hash.endsWith('.js') ? hash : `${hash}.js`;
		const full = readFileSync(join(dir, file), 'utf8');
		const mapName = sourceMappingURLOf(full);
		const code = stripSourceMappingComment(full);
		const raw = Buffer.byteLength(code);
		const gzip = gzipSync(code).length;
		const br = brotliCompressSync(code).length;
		const modules: Record<string, number> = {};
		const packages: Record<string, number> = {};
		let unmapped = raw;
		if (mapName) {
			const map = JSON.parse(readFileSync(join(dirname(join(dir, file)), mapName), 'utf8'));
			const a = attributeChunk(code, map);
			unmapped = a.unmappedBytes;
			for (const [source, bytes] of a.bySource) {
				const m = moduleOf(source);
				modules[m] = (modules[m] ?? 0) + bytes;
				const p = packageOf(source);
				packages[p] = (packages[p] ?? 0) + bytes;
			}
		}
		chunks.push({ file, raw, gzip, br, unmapped, packages, modules });
	}
	result[phase] = chunks;
}
writeFileSync(out, JSON.stringify(result, null, 1));
