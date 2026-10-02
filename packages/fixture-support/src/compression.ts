import { createHash } from "node:crypto";
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

/** One compressible-type policy for static files, shared assets and proxied responses. */
export function compressibleType(contentType: string | undefined): boolean {
  const type = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  return (
    type.startsWith("text/") ||
    /^application\/(?:javascript|json|xml|[\w.-]+\+(?:json|xml))$/u.test(
      type
    ) ||
    type === "image/svg+xml"
  );
}

const representationCache = new Map<
  string,
  ReturnType<typeof compressedRepresentations>
>();

/** Content-addressed, so changed upstream bytes never reuse stale encodings. */
export function cachedRepresentations(body: Buffer) {
  const key = createHash("sha256").update(body).digest("hex");
  let cached = representationCache.get(key);
  if (!cached) {
    cached = compressedRepresentations(body);
    if (representationCache.size >= 512) {
      const oldest = representationCache.keys().next();
      if (!oldest.done) {
        representationCache.delete(oldest.value);
      }
    }
    representationCache.set(key, cached);
  }
  return cached;
}

/**
 * A strong validator names exact bytes, so each encoded representation gets
 * its own entity tag. `upstreamValidators` reverses the suffix before a
 * conditional request reaches the identity-only upstream.
 */
export function representationTag(
  etag: string | undefined,
  encoding: ContentEncoding
): string | undefined {
  if (!etag || encoding === "identity") {
    return etag;
  }
  const match = /^(?<weak>W\/)?"(?<tag>[^"]*)"$/u.exec(etag.trim());
  return match?.groups
    ? `${match.groups.weak ?? ""}"${match.groups.tag}~${encoding}"`
    : undefined;
}

export function upstreamValidators(header: string | undefined) {
  return header?.replaceAll(/~(?:br|gzip)"/gu, '"');
}

const opaque = (tag: string) => tag.trim().replace(/^W\//u, "");

/** If-None-Match uses weak comparison, so W/ prefixes are ignored on both sides. */
export function matchesIfNoneMatch(
  header: string | undefined,
  etag: string
): boolean {
  if (!header) {
    return false;
  }
  return header
    .split(",")
    .some((tag) => tag.trim() === "*" || opaque(tag) === opaque(etag));
}
