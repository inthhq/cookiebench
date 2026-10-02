import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { compressedRepresentations, negotiateEncoding } from "./compression.ts";

const assetTypes = {
  "courtyard.png": "image/png",
  "reading-list.js": "text/javascript; charset=utf-8",
  "reading-list.json": "application/json; charset=utf-8",
} as const;

const assets = new Map(
  Object.entries(assetTypes).map(([name, type]) => {
    const body = readFileSync(new URL(`../assets/${name}`, import.meta.url));
    return [
      name,
      {
        body,
        ...compressedRepresentations(body),
        etag: `"${createHash("sha256").update(body).digest("hex")}"`,
        type,
      },
    ] as const;
  })
);

/** The same asset bytes and HTTP policy serve every framework and its baseline. */
export function pageAssetResponse(pathname: string, acceptEncoding = "") {
  if (!pathname.startsWith("/page-assets/")) {
    return;
  }
  const asset = assets.get(pathname.slice("/page-assets/".length));
  if (!asset) {
    return;
  }
  // PNG is already compressed. Text assets use identical compression everywhere.
  const encoding = negotiateEncoding(
    acceptEncoding,
    asset.type !== "image/png"
  );
  if (!encoding) {
    return {
      body: Buffer.alloc(0),
      headers: { Vary: "Accept-Encoding" } as Record<string, string | number>,
      status: 406,
    };
  }
  const body = asset[encoding];
  const headers: Record<string, string | number> = {
    "Cache-Control": "public, max-age=3600",
    "Content-Length": body.length,
    "Content-Type": asset.type,
    ETag: `W/${asset.etag}`,
    Vary: "Accept-Encoding",
  };
  if (encoding !== "identity") {
    headers["Content-Encoding"] = encoding;
  }
  return { body, headers, status: 200 };
}
