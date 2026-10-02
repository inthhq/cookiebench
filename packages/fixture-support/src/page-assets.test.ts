import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { brotliDecompressSync, gunzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { pageAssetResponse } from "./page-assets.ts";
import { pageHTML } from "./page.ts";

describe("shared article workload", () => {
  it("uses an LCP-eligible image with reserved layout space and recorded bytes", () => {
    expect(pageHTML).toContain('<img id="primary-content"');
    expect(pageHTML).toContain('width="1200" height="640"');
    expect(pageHTML).toContain('elementtiming="primary-content"');
    const response = pageAssetResponse(
      "/page-assets/courtyard.png",
      "br, gzip"
    );
    expect(response).toBeDefined();
    if (!response) {
      throw new Error("Missing hero asset");
    }
    expect(response.body.subarray(0, 8).toString("hex")).toBe(
      "89504e470d0a1a0a"
    );
    expect(response.body.readUInt32BE(16)).toBe(1200);
    expect(response.body.readUInt32BE(20)).toBe(640);
    expect(response.headers["Content-Encoding"]).toBeUndefined();
    const manifest = JSON.parse(
      readFileSync(new URL("../assets/manifest.json", import.meta.url), "utf-8")
    );
    expect(createHash("sha256").update(response.body).digest("hex")).toBe(
      manifest.assets["courtyard.png"].sha256
    );
  });

  it("preserves identical decoded data across compression choices", () => {
    const plain = pageAssetResponse("/page-assets/reading-list.json");
    const brotli = pageAssetResponse("/page-assets/reading-list.json", "br");
    const gzip = pageAssetResponse("/page-assets/reading-list.json", "gzip");
    if (!plain || !brotli || !gzip) {
      throw new Error("Missing reading list");
    }
    expect(brotliDecompressSync(brotli.body)).toEqual(plain.body);
    expect(gunzipSync(gzip.body)).toEqual(plain.body);
    expect(brotli.headers.ETag).toBe(plain.headers.ETag);
    expect(gzip.headers.ETag).toBe(plain.headers.ETag);
    expect(JSON.parse(plain.body.toString())).toHaveLength(120);
    expect(plain.headers["Cache-Control"]).toBe("public, max-age=3600");
  });

  it("honors excluded encodings and uses a weak validator across representations", () => {
    const gzip = pageAssetResponse(
      "/page-assets/reading-list.json",
      "br;q=0, gzip"
    );
    const rejected = pageAssetResponse(
      "/page-assets/reading-list.json",
      "*;q=0"
    );
    const imageRejected = pageAssetResponse(
      "/page-assets/courtyard.png",
      "identity;q=0, br"
    );
    expect(gzip?.headers["Content-Encoding"]).toBe("gzip");
    expect(gzip?.headers.ETag).toMatch(/^W\//u);
    expect(rejected?.status).toBe(406);
    expect(imageRejected?.status).toBe(406);
  });

  it("does not expose arbitrary files through the asset route", () => {
    expect(pageAssetResponse("/page-assets/../src/backend.ts")).toBeUndefined();
    expect(pageAssetResponse("/page-assets/manifest.json")).toBeUndefined();
  });
});

describe("shared asset revalidation", () => {
  it("answers its weak validator with 304 for any encoding", () => {
    const first = pageAssetResponse("/page-assets/reading-list.js", "br");
    const etag = String(first?.headers.ETag);
    expect(etag).toMatch(/^W\/"[a-f0-9]{64}"$/u);
    const again = pageAssetResponse(
      "/page-assets/reading-list.js",
      "gzip",
      etag
    );
    expect(again?.status).toBe(304);
    expect(again?.body).toHaveLength(0);
    expect(again?.headers["Content-Length"]).toBeUndefined();
  });
});
