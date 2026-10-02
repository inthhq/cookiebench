import { readFile, stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

import {
  compressedRepresentations,
  compressibleType,
  negotiateEncoding,
} from "./compression.ts";

const mime: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

/** Cache production representations so compression work is not repeated per visit. */
export function createStaticResponder(directory: string) {
  const root = path.resolve(directory);
  const cache = new Map<
    string,
    {
      stamp: string;
      bodies: Promise<ReturnType<typeof compressedRepresentations>>;
    }
  >();
  return async (
    url: URL,
    incoming: IncomingMessage,
    outgoing: ServerResponse
  ) => {
    if (incoming.method !== "GET" && incoming.method !== "HEAD") {
      outgoing.writeHead(405, { Allow: "GET, HEAD" });
      outgoing.end();
      return;
    }
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      outgoing.writeHead(400);
      outgoing.end();
      return;
    }
    let file = path.resolve(
      root,
      `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`
    );
    if (!file.startsWith(`${root}${path.sep}`)) {
      outgoing.writeHead(403);
      outgoing.end();
      return;
    }
    try {
      const requestedFile = await stat(file);
      if (!requestedFile.isFile()) {
        throw new Error("Not a file");
      }
    } catch {
      if (!path.extname(pathname)) {
        file = path.resolve(root, `${pathname.slice(1)}.html`);
      }
    }
    try {
      const metadata = await stat(file);
      if (!metadata.isFile()) {
        throw new Error("Not a file");
      }
      const extension = path.extname(file);
      const compressible = compressibleType(mime[extension]);
      const encoding = negotiateEncoding(
        incoming.headers["accept-encoding"],
        compressible
      );
      if (!encoding) {
        outgoing.writeHead(406, { Vary: "Accept-Encoding" });
        outgoing.end();
        return;
      }
      const stamp = `${metadata.mtimeMs}:${metadata.size}`;
      let cached = cache.get(file);
      if (cached?.stamp !== stamp) {
        cached = {
          bodies: (async () => {
            const body = await readFile(file);
            return compressible
              ? compressedRepresentations(body)
              : { br: body, gzip: body, identity: body };
          })(),
          stamp,
        };
        cache.set(file, cached);
      }
      const bodies = await cached.bodies;
      const body = bodies[encoding];
      outgoing.writeHead(200, {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Content-Length": body.length,
        "Content-Type": mime[extension] ?? "application/octet-stream",
        Vary: "Accept-Encoding",
        ...(encoding === "identity" ? {} : { "Content-Encoding": encoding }),
      });
      outgoing.end(incoming.method === "HEAD" ? undefined : body);
    } catch {
      cache.delete(file);
      outgoing.writeHead(404);
      outgoing.end(incoming.method === "HEAD" ? undefined : "Not found");
    }
  };
}
