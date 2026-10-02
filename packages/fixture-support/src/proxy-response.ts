import type { IncomingMessage, ServerResponse } from "node:http";
import { pipeline } from "node:stream";
import type { Transform } from "node:stream";
import { constants, createBrotliCompress, createGzip } from "node:zlib";

import { negotiateEncoding } from "./compression.ts";
import { HtmlInjection } from "./html-injection.ts";

export function forwardResponse(
  response: IncomingMessage,
  outgoing: ServerResponse,
  options: {
    acceptEncoding?: string;
    method?: string;
    injection?: ConstructorParameters<typeof HtmlInjection>[0];
  }
) {
  const status = response.statusCode ?? 502;
  const html = response.headers["content-type"]?.includes("text/html");
  const encoded =
    response.headers["content-encoding"] &&
    response.headers["content-encoding"] !== "identity";
  const hasBody = ![204, 304].includes(status);
  if (!html || !hasBody || (encoded && !options.injection)) {
    outgoing.writeHead(status, response.headers);
    pipeline(response, outgoing, () => {
      // Pipeline destroys its streams on errors.
    });
    return;
  }
  if (encoded) {
    response.resume();
    outgoing.writeHead(502);
    outgoing.end("Unexpected compressed fixture HTML");
    return;
  }
  const encoding = negotiateEncoding(options.acceptEncoding);
  if (!encoding) {
    response.resume();
    outgoing.writeHead(406, { Vary: "Accept-Encoding" });
    outgoing.end();
    return;
  }
  const headers = { ...response.headers };
  const vary = headers.vary?.split(",").map((value) => value.trim()) ?? [];
  if (
    !vary.some((value) =>
      ["accept-encoding", "*"].includes(value.toLowerCase())
    )
  ) {
    vary.push("Accept-Encoding");
  }
  headers.vary = vary.join(", ");
  if (options.injection || encoding !== "identity") {
    delete headers["content-length"];
    delete headers.etag;
  }
  if (encoding !== "identity") {
    headers["content-encoding"] = encoding;
  }
  const transforms: Transform[] = [];
  if (options.injection) {
    transforms.push(new HtmlInjection(options.injection));
  }
  if (encoding === "br") {
    transforms.push(
      createBrotliCompress({ flush: constants.BROTLI_OPERATION_FLUSH })
    );
  }
  if (encoding === "gzip") {
    transforms.push(createGzip({ flush: constants.Z_SYNC_FLUSH }));
  }
  outgoing.writeHead(status, headers);
  if (options.method === "HEAD") {
    response.resume();
    outgoing.end();
    return;
  }
  pipeline([response, ...transforms, outgoing], () => {
    // Pipeline destroys its streams on errors.
  });
}
