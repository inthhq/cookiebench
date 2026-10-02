import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { request } from "node:http";
import type { IncomingMessage } from "node:http";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

// A framework-like upstream that, like Nitro and the Astro node adapter, sends
// identity bytes and records the Accept-Encoding it was asked for.
const upstream = `
const { createServer } = require("node:http");
const script = Buffer.from("export const value = " + JSON.stringify("x".repeat(4000)) + ";");
const png = Buffer.alloc(2000, 7);
let state = 2463534242;
const words = [];
for (let i = 0; i < 60000; i += 1) { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; state >>>= 0; words.push("w" + (state % 1000000).toString(36)); }
const large = Buffer.from("export const words = " + JSON.stringify(words) + ";");
const seen = [];
createServer((request, response) => {
  seen.push({ encoding: request.headers["accept-encoding"], ifNoneMatch: request.headers["if-none-match"], url: request.url });
  if (request.url === "/seen") { response.end(JSON.stringify(seen)); return; }
  if (request.url === "/large.js") { response.writeHead(200, { "Content-Length": large.length, "Content-Type": "text/javascript" }); response.end(large); return; }
  if (request.url === "/asset.png") { response.writeHead(200, { "Content-Length": png.length, "Content-Type": "image/png" }); response.end(png); return; }
  if (request.headers["if-none-match"] === '"asset-v1"') { response.writeHead(304, { ETag: '"asset-v1"' }); response.end(); return; }
  response.writeHead(200, { "Cache-Control": "public, max-age=0, must-revalidate", "Content-Length": script.length, "Content-Type": "text/javascript; charset=utf-8", ETag: '"asset-v1"' });
  response.end(script);
}).listen(Number(process.env.PORT), "127.0.0.1");
`;

async function freePort() {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const { port } = reservation.address() as AddressInfo;
  const closed = once(reservation, "close");
  reservation.close();
  await closed;
  return port;
}

async function get(
  port: number,
  path: string,
  headers: Record<string, string>
) {
  const outgoing = request({ headers, hostname: "127.0.0.1", path, port });
  outgoing.end();
  const [response] = (await once(outgoing, "response")) as [IncomingMessage];
  const chunks: Buffer[] = [];
  for await (const chunk of response) {
    chunks.push(Buffer.from(chunk));
  }
  return { body: Buffer.concat(chunks), response };
}

describe("framework proxy compression", () => {
  let child: ChildProcessWithoutNullStreams;
  let port: number;

  beforeAll(async () => {
    port = await freePort();
    child = spawn(process.execPath, [
      fileURLToPath(new URL("serve.ts", import.meta.url)),
      "--port",
      String(port),
      "--upstream-port",
      String(await freePort()),
      "--",
      process.execPath,
      "-e",
      upstream,
    ]);
    await once(child.stdout, "data", { signal: AbortSignal.timeout(5000) });
    for (let attempt = 0; attempt < 50; attempt += 1) {
      // oxlint-disable-next-line no-await-in-loop -- Poll the upstream until it listens.
      const health = await fetch(`http://127.0.0.1:${port}/health`);
      if (health.ok) {
        break;
      }
      // oxlint-disable-next-line no-await-in-loop -- Poll the upstream until it listens.
      await delay(100);
    }
  });

  afterAll(async () => {
    if (child && child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
  });

  it("compresses identity framework assets and consent JSON like static files and keeps revalidation", async () => {
    const { body, response } = await get(port, "/_nuxt/entry.js", {
      "Accept-Encoding": "gzip, deflate, br",
    });
    expect(response.headers["content-encoding"]).toBe("br");
    expect(Number(response.headers["content-length"])).toBe(body.length);
    expect(response.headers.vary).toContain("Accept-Encoding");
    // A strong validator names exact bytes, so the Brotli bytes get their own tag.
    expect(response.headers.etag).toBe('"asset-v1~br"');
    const decoded = brotliDecompressSync(body).toString();
    expect(decoded).toContain('export const value = "xxxx');
    expect(body.length).toBeLessThan(decoded.length / 10);

    const revalidated = await get(port, "/_nuxt/entry.js", {
      "Accept-Encoding": "br",
      "If-None-Match": '"asset-v1~br"',
    });
    expect(revalidated.response.statusCode).toBe(304);

    const image = await get(port, "/asset.png", { "Accept-Encoding": "br" });
    expect(image.response.headers["content-encoding"]).toBeUndefined();
    expect(image.body).toHaveLength(2000);

    const init = await get(port, "/api/consent/init", {
      "Accept-Encoding": "br",
    });
    expect(init.response.headers["content-encoding"]).toBe("br");
    expect(
      JSON.parse(brotliDecompressSync(init.body).toString())
    ).toHaveProperty("jurisdiction");

    const log = await fetch(`http://127.0.0.1:${port}/seen`);
    const seen = (await log.json()) as {
      encoding?: string;
      ifNoneMatch?: string;
      url: string;
    }[];
    const proxied = seen.filter((entry) =>
      ["/_nuxt/entry.js", "/asset.png"].includes(entry.url)
    );
    expect(proxied).toHaveLength(3);
    expect(proxied.every((entry) => entry.encoding === "identity")).toBe(true);
    expect(seen.find((entry) => entry.ifNoneMatch)?.ifNoneMatch).toBe(
      '"asset-v1"'
    );
  });

  it("compresses a cold asset off the event loop and logs it as on-demand work", async () => {
    const missesUrl = `http://127.0.0.1:${port}/controlled/encoding-misses`;
    const missLog = async () => {
      const response = await fetch(missesUrl);
      return (await response.json()) as {
        source: string;
        durationMs: number;
      }[];
    };
    const before = await missLog();
    const started = performance.now();
    const cold = get(port, "/large.js", { "Accept-Encoding": "br" }).then(
      (result) => ({ ...result, ms: performance.now() - started })
    );
    await delay(20);
    const sideStarted = performance.now();
    const side = await fetch(`http://127.0.0.1:${port}/controlled/events`);
    await side.arrayBuffer();
    const sideMs = performance.now() - sideStarted;
    const { body, ms } = await cold;
    expect(brotliDecompressSync(body).toString()).toContain(
      "export const words"
    );
    // Brotli quality 11 on this ~480 kB script takes hundreds of milliseconds; an
    // unrelated response must not queue behind it.
    expect(ms).toBeGreaterThan(150);
    expect(sideMs).toBeLessThan(ms / 3);
    const after = await missLog();
    expect(after.slice(before.length).map((miss) => miss.source)).toEqual([
      "/large.js",
    ]);
    const warmStarted = performance.now();
    await get(port, "/large.js", { "Accept-Encoding": "br" });
    expect(performance.now() - warmStarted).toBeLessThan(ms / 3);
    expect(await missLog()).toHaveLength(after.length);
  });
});
