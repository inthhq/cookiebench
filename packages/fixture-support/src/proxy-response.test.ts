/* oxlint-disable no-await-in-loop -- Each streaming assertion must complete before the next response starts. */
import { once } from "node:events";
import { createServer, request } from "node:http";
import type {
  IncomingMessage,
  RequestListener,
  ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { createBrotliDecompress, createGunzip, gzipSync } from "node:zlib";

import { afterEach, describe, expect, it } from "vitest";

import { forwardResponse } from "./proxy-response.ts";

const servers: ReturnType<typeof createServer>[] = [];
const html = "<html><head></head><body>First chunk";
const tail = " last chunk</body></html>";
const injection = {
  html: "<script>bootstrap()</script>",
  marker: "<head>",
  side: "after" as const,
};
async function listen(handler: RequestListener) {
  const server = createServer(handler);
  servers.push(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return (server.address() as AddressInfo).port;
}
async function open(port: number, encoding: string, method = "GET") {
  const req = request({
    headers: { "Accept-Encoding": encoding },
    hostname: "127.0.0.1",
    method,
    port,
  });
  req.end();
  const [response] = await once(req, "response");
  return response as IncomingMessage;
}
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(async (server) => {
      server.closeAllConnections();
      server.close();
      await once(server, "close");
    })
  );
});
describe("production proxy HTML compression", () => {
  it.each(["br", "gzip"] as const)(
    "streams %s before upstream finishes, with and without bootstrap",
    async (encoding) => {
      for (const inject of [true, false]) {
        let upstreamResponse: ServerResponse | undefined;
        const upstreamPort = await listen((_incoming, outgoing) => {
          upstreamResponse = outgoing;
          outgoing.writeHead(200, {
            "Content-Type": "text/html",
            ETag: '"original"',
            Vary: "RSC",
          });
          outgoing.write(html);
        });
        const proxyPort = await listen((incoming, outgoing) => {
          const req = request(
            { hostname: "127.0.0.1", port: upstreamPort },
            (response) => {
              forwardResponse(response, outgoing, {
                acceptEncoding: incoming.headers["accept-encoding"],
                injection: inject ? injection : undefined,
                method: incoming.method,
              });
            }
          );
          req.end();
        });
        const response = await open(proxyPort, encoding);
        const decoded = response.pipe(
          encoding === "br" ? createBrotliDecompress() : createGunzip()
        );
        const chunks: Buffer[] = [];
        decoded.on("data", (chunk: Buffer) => chunks.push(chunk));
        await once(decoded, "data", { signal: AbortSignal.timeout(2000) });
        expect(Buffer.concat(chunks).toString()).toContain("First chunk");
        expect(upstreamResponse?.writableEnded).toBe(false);
        expect(response.headers["content-encoding"]).toBe(encoding);
        expect(response.headers["content-length"]).toBeUndefined();
        expect(response.headers.etag).toBeUndefined();
        expect(response.headers.vary).toBe("RSC, Accept-Encoding");
        upstreamResponse?.end(tail);
        await once(decoded, "end");
        const expected = inject
          ? html.replace("<head>", `<head>${injection.html}`)
          : html;
        expect(Buffer.concat(chunks).toString()).toBe(expected + tail);
      }
    }
  );
  it("preserves already encoded upstream bytes and headers", async () => {
    const body = gzipSync(html + tail);
    const upstreamPort = await listen((_incoming, outgoing) => {
      outgoing.writeHead(200, {
        "Content-Encoding": "gzip",
        "Content-Length": body.length,
        "Content-Type": "text/html",
        ETag: '"gzip-original"',
      });
      outgoing.end(body);
    });
    const proxyPort = await listen((incoming, outgoing) => {
      const req = request(
        { hostname: "127.0.0.1", port: upstreamPort },
        (response) =>
          forwardResponse(response, outgoing, {
            acceptEncoding: incoming.headers["accept-encoding"],
          })
      );
      req.end();
    });
    const response = await open(proxyPort, "gzip");
    const chunks: Buffer[] = [];
    for await (const chunk of response) {
      chunks.push(Buffer.from(chunk));
    }
    expect(Buffer.concat(chunks)).toEqual(body);
    expect(response.headers.etag).toBe('"gzip-original"');
    expect(Number(response.headers["content-length"])).toBe(body.length);
  });
  it.each([
    ["br;q=0, gzip;q=0", "GET", 200, undefined],
    ["*;q=0", "GET", 406, undefined],
    ["gzip", "HEAD", 200, "gzip"],
  ] as const)(
    "honors %s for %s",
    async (encoding, method, status, contentEncoding) => {
      const upstreamPort = await listen((_incoming, outgoing) => {
        outgoing.writeHead(200, { "Content-Type": "text/html" });
        outgoing.end(html + tail);
      });
      const proxyPort = await listen((incoming, outgoing) => {
        const req = request(
          { hostname: "127.0.0.1", method, port: upstreamPort },
          (response) =>
            forwardResponse(response, outgoing, {
              acceptEncoding: incoming.headers["accept-encoding"],
              method,
            })
        );
        req.end();
      });
      const response = await open(proxyPort, encoding, method);
      const chunks: Buffer[] = [];
      for await (const chunk of response) {
        chunks.push(Buffer.from(chunk));
      }
      expect(response.statusCode).toBe(status);
      expect(response.headers["content-encoding"]).toBe(contentEncoding);
      expect(Buffer.concat(chunks).toString()).toBe(
        method === "HEAD" || status === 406 ? "" : html + tail
      );
    }
  );
});
