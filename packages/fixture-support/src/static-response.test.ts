/* oxlint-disable promise/avoid-new -- Node HTTP callbacks need promises to test raw encoded response bytes. */
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { IncomingHttpHeaders } from "node:http";
import { createServer, request } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { brotliDecompressSync, gunzipSync } from "node:zlib";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createStaticResponder } from "./static-response.ts";

const contents = {
  "app.js": "document.body.dataset.ready = 'yes';".repeat(100),
  "index.html": "<html><body>Hello production</body></html>".repeat(100),
  "style.css": "body { color: blue; background: white; }".repeat(100),
};

describe("production static HTTP responses", () => {
  let directory: string;
  let port: number;
  let server: ReturnType<typeof createServer>;
  beforeAll(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "cookiebench-static-"));
    await Promise.all(
      Object.entries(contents).map(([name, body]) =>
        writeFile(path.join(directory, name), body)
      )
    );
    await writeFile(
      path.join(directory, "baseline.html"),
      contents["index.html"]
    );
    const respond = createStaticResponder(directory);
    server = createServer((incoming, outgoing) => {
      void respond(
        new URL(incoming.url ?? "/", "http://localhost"),
        incoming,
        outgoing
      );
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    ({ port } = server.address() as AddressInfo);
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await rm(directory, { force: true, recursive: true });
  });
  const get = (pathname: string, acceptEncoding: string, method = "GET") =>
    new Promise<{
      status: number | undefined;
      headers: IncomingHttpHeaders;
      body: Buffer;
    }>((resolve, reject) => {
      const req = request(
        {
          headers: { "Accept-Encoding": acceptEncoding },
          hostname: "127.0.0.1",
          method,
          path: pathname,
          port,
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () =>
            resolve({
              body: Buffer.concat(chunks),
              headers: response.headers,
              status: response.statusCode,
            })
          );
          response.on("error", reject);
        }
      );
      req.on("error", reject);
      req.end();
    });
  it.each(Object.entries(contents))(
    "compresses %s with exact decoded bytes and encoded length",
    async (name, body) => {
      const br = await get(`/${name}`, "br, gzip");
      const gzip = await get(`/${name}`, "br;q=0, gzip");
      const identity = await get(`/${name}`, "br;q=0, gzip;q=0");
      expect(br.status).toBe(200);
      expect(br.headers["content-encoding"]).toBe("br");
      expect(gzip.headers["content-encoding"]).toBe("gzip");
      expect(identity.headers["content-encoding"]).toBeUndefined();
      expect(brotliDecompressSync(br.body).toString()).toBe(body);
      expect(gunzipSync(gzip.body).toString()).toBe(body);
      expect(identity.body.toString()).toBe(body);
      expect(br.body.length).toBeLessThan(Buffer.byteLength(body));
      for (const response of [br, gzip, identity]) {
        expect(Number(response.headers["content-length"])).toBe(
          response.body.length
        );
        expect(response.headers.vary).toBe("Accept-Encoding");
      }
    }
  );
  it("returns HEAD headers matching GET without a body", async () => {
    const head = await get("/", "br", "HEAD");
    const actual = await get("/", "br");
    expect(head.status).toBe(200);
    expect(head.headers["content-length"]).toBe(
      actual.headers["content-length"]
    );
    expect(head.headers["content-encoding"]).toBe("br");
    expect(head.body.length).toBe(0);
  });
  it("uses the same compression for the extensionless baseline", async () => {
    const response = await get("/baseline", "gzip");
    expect(response.status).toBe(200);
    expect(gunzipSync(response.body).toString()).toBe(contents["index.html"]);
  });
  it("rejects forbidden encodings and unsupported methods", async () => {
    const unacceptable = await get("/", "*;q=0");
    expect(unacceptable.status).toBe(406);
    const post = await get("/", "br", "POST");
    expect(post.status).toBe(405);
    expect(post.headers.allow).toBe("GET, HEAD");
  });
  it("handles invalid paths and missing HEAD without sending a body", async () => {
    const malformed = await get("/%ZZ", "br");
    const traversal = await get("/..%2foutside.html", "br");
    expect(malformed.status).toBe(400);
    expect(traversal.status).toBe(403);
    const missing = await get("/missing.js", "br", "HEAD");
    expect(missing.status).toBe(404);
    expect(missing.body.length).toBe(0);
  });
});
