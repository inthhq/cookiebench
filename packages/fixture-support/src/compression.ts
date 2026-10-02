import { brotliCompressSync, gzipSync } from "node:zlib";

export type ContentEncoding = "br" | "gzip" | "identity";

/** Prefer Brotli on ties; identity is the fallback unless explicitly preferred. */
export function negotiateEncoding(
  header: string | undefined,
  compressible = true
): ContentEncoding | undefined {
  if (!header?.trim()) {
    return "identity";
  }
  const qualities = new Map<string, number>();
  for (const item of header.split(",")) {
    const [token, ...parameters] = item.trim().toLowerCase().split(";");
    if (!token) {
      continue;
    }
    const quality = parameters.find((parameter) =>
      parameter.trim().startsWith("q=")
    );
    const value = quality?.trim().slice(2);
    let q = 1;
    if (value !== undefined) {
      q = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/u.test(value)
        ? Number(value)
        : 0;
    }
    qualities.set(token.trim(), q);
  }
  const wildcard = qualities.get("*");
  const candidates: ContentEncoding[] = compressible ? ["br", "gzip"] : [];
  if (qualities.has("identity")) {
    candidates.push("identity");
  }
  const [preferred] = candidates
    .map((encoding) => ({
      encoding,
      q: qualities.get(encoding) ?? wildcard ?? 0,
    }))
    .filter(({ q }) => q > 0)
    .toSorted((a, b) => b.q - a.q);
  if (preferred) {
    return preferred.encoding;
  }
  return (qualities.get("identity") ?? (wildcard === 0 ? 0 : 1)) > 0
    ? "identity"
    : undefined;
}

export function compressedRepresentations(body: Buffer) {
  return { br: brotliCompressSync(body), gzip: gzipSync(body), identity: body };
}
