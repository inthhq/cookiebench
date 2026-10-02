import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import { pipeline } from "node:stream";
import type { Transform } from "node:stream";
import { constants, createBrotliCompress, createGzip } from "node:zlib";

import {
  cachedRepresentations,
  compressibleType,
  negotiateEncoding,
  representationTag,
} from "./compression.ts";
import type { ContentEncoding } from "./compression.ts";
import { HtmlInjection } from "./html-injection.ts";

function varyOnEncoding(headers: IncomingHttpHeaders) {
  const vary = headers.vary?.split(",").map((value) => value.trim()) ?? [];
  if (
    !vary.some((value) =>
      ["accept-encoding", "*"].includes(value.toLowerCase())
    )
  ) {
    vary.push("Accept-Encoding");
  }
  return vary.join(", ");
}

// Flushing each input chunk lets streamed HTML reach the browser before upstream ends.
function streamingCompressor(encoding: ContentEncoding) {
  if (encoding === "br") {
    return createBrotliCompress({ flush: constants.BROTLI_OPERATION_FLUSH });
  }
  return encoding === "gzip"
    ? createGzip({ flush: constants.Z_SYNC_FLUSH })
    : undefined;
}

/** Sized identity assets are compressed once, like static files, and cached by content. */
async function sendRepresentation(
  response: IncomingMessage,
  outgoing: ServerResponse,
  encoding: ContentEncoding
) {
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of response) {
      chunks.push(Buffer.from(chunk));
    }
  } catch {
    outgoing.destroy();
    return;
  }
  const body = cachedRepresentations(Buffer.concat(chunks))[encoding];
  const headers: IncomingHttpHeaders = {
    ...response.headers,
    "content-length": String(body.length),
    etag: representationTag(response.headers.etag, encoding),
    vary: varyOnEncoding(response.headers),
  };
  if (encoding === "identity") {
    delete headers["content-encoding"];
  } else {
    headers["content-encoding"] = encoding;
  }
  if (headers.etag === undefined) {
    delete headers.etag;
  }
  outgoing.writeHead(response.statusCode ?? 502, headers);
  outgoing.end(body);
}

/**
 * Every fixture asks its upstream for identity bytes, so this proxy applies one
 * compression policy: compressible types use Brotli or gzip from
 * Accept-Encoding, other types and already encoded bytes pass through.
 */
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
  const compressible =
    html || compressibleType(response.headers["content-type"]);
  const encoded =
    response.headers["content-encoding"] &&
    response.headers["content-encoding"] !== "identity";
  const hasBody = ![204, 304].includes(status);
  if (!compressible || !hasBody || (encoded && !options.injection)) {
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
  if (
    !html &&
    options.method !== "HEAD" &&
    response.headers["content-length"] !== undefined
  ) {
    void sendRepresentation(response, outgoing, encoding);
    return;
  }
  const headers = {
    ...response.headers,
    vary: varyOnEncoding(response.headers),
  };
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
  const compressor = streamingCompressor(encoding);
  if (compressor) {
    transforms.push(compressor);
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
