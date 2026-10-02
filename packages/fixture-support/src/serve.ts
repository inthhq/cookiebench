import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer, request } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer as createTlsServer } from "node:https";
import { parseArgs } from "node:util";

import { parseBackendDelay, waitForBackend } from "./backend-delay.ts";
import { initResponse } from "./backend.ts";
import { competitorBootstrap } from "./competitor-bootstrap.ts";
import {
  cachedRepresentations,
  encodingMisses,
  negotiateEncoding,
  upstreamValidators,
} from "./compression.ts";
import { pageAssetResponse } from "./page-assets.ts";
import { forwardResponse } from "./proxy-response.ts";
import { createStaticResponder } from "./static-response.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "backend-delay-ms": { type: "string" },
    "baseline-entry": { type: "string" },
    "baseline-upstream-port": { type: "string" },
    competitor: { type: "string" },
    port: { type: "string" },
    static: { type: "string" },
    "tls-port": { type: "string" },
    "upstream-port": { type: "string" },
  },
});
const backendDelayMs = parseBackendDelay(values["backend-delay-ms"]);
const port = Number(values.port);
const bootstrap = competitorBootstrap(values.competitor);
if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
  throw new Error("Expected --port between 1 and 65535.");
}
const tlsPort =
  values["tls-port"] === undefined ? undefined : Number(values["tls-port"]);
if (
  tlsPort !== undefined &&
  (!Number.isSafeInteger(tlsPort) || tlsPort < 1 || tlsPort > 65_535)
) {
  throw new Error("Expected --tls-port between 1 and 65535.");
}
// The runner creates a run-scoped certificate for hosts it maps to this server.
const tlsCertificate =
  tlsPort === undefined
    ? undefined
    : (() => {
        const cert = process.env.COOKIEBENCH_TLS_CERT;
        const key = process.env.COOKIEBENCH_TLS_KEY;
        if (!cert || !key) {
          throw new Error(
            "--tls-port requires COOKIEBENCH_TLS_CERT and COOKIEBENCH_TLS_KEY from the runner."
          );
        }
        return { cert: readFileSync(cert), key: readFileSync(key) };
      })();
const upstreamPort = Number(values["upstream-port"]);
const [command, ...args] = positionals;
const child = command
  ? spawn(command, args, {
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        NITRO_HOST: "127.0.0.1",
        NITRO_PORT: String(upstreamPort),
        PORT: String(upstreamPort),
      },
      stdio: "inherit",
    })
  : undefined;
if (!command && !values.static) {
  throw new Error("Expected --static directory or -- production command.");
}
const baselinePort = Number(values["baseline-upstream-port"]);
const baselineChild = values["baseline-entry"]
  ? spawn(process.execPath, [values["baseline-entry"]], {
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        NITRO_HOST: "127.0.0.1",
        NITRO_PORT: String(baselinePort),
        PORT: String(baselinePort),
      },
      stdio: "inherit",
    })
  : undefined;
const events: {
  token: string;
  category: string;
  id: string;
  timestamp: number;
  type: string;
  url: string;
}[] = [];
const subjectResponse = { ok: true, subjectId: "cookiebench-subject" };
const serveStatic = values.static
  ? createStaticResponder(values.static)
  : undefined;
function servePageAsset(
  url: URL,
  incoming: IncomingMessage,
  outgoing: ServerResponse
) {
  const pageAsset = pageAssetResponse(
    url.pathname,
    incoming.headers["accept-encoding"],
    incoming.headers["if-none-match"]
  );
  if (pageAsset) {
    outgoing.writeHead(pageAsset.status, pageAsset.headers);
    outgoing.end(incoming.method === "HEAD" ? undefined : pageAsset.body);
    return true;
  }
  return false;
}
// The controlled consent backend follows the same compression policy as assets.
async function sendConsentJson(
  incoming: IncomingMessage,
  outgoing: ServerResponse,
  value: unknown
) {
  const encoding = negotiateEncoding(incoming.headers["accept-encoding"]);
  if (!encoding) {
    outgoing.writeHead(406, { Vary: "Accept-Encoding" });
    outgoing.end();
    return;
  }
  const representations = await cachedRepresentations(
    Buffer.from(JSON.stringify(value)),
    "consent response"
  );
  const body = representations[encoding];
  outgoing.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Length": body.length,
    "Content-Type": "application/json",
    Vary: "Accept-Encoding",
    ...(encoding === "identity" ? {} : { "Content-Encoding": encoding }),
  });
  outgoing.end(incoming.method === "HEAD" ? undefined : body);
}
async function sendHealth(outgoing: ServerResponse) {
  if (values.static) {
    outgoing.end("ready");
    return;
  }
  try {
    const response = await fetch(`http://127.0.0.1:${upstreamPort}/`);
    outgoing.writeHead(response.ok ? 200 : 503);
    outgoing.end(response.ok ? "ready" : "starting");
  } catch {
    outgoing.writeHead(503);
    outgoing.end("starting");
  }
}
function sendControlledLog(url: URL, outgoing: ServerResponse) {
  let rows: unknown;
  if (url.pathname === "/controlled/events") {
    rows = events.filter(
      (event) =>
        !url.searchParams.has("token") ||
        event.token === url.searchParams.get("token")
    );
  } else if (url.pathname === "/controlled/encoding-misses") {
    // Representations built on demand since startup; the runner checks that
    // none happen while a measured visit is open.
    rows = encodingMisses();
  } else {
    return false;
  }
  outgoing.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  });
  outgoing.end(JSON.stringify(rows));
  return true;
}
function proxyHeaders(incoming: IncomingMessage) {
  // Upstreams send identity bytes so forwardResponse applies one compression
  // policy to every framework, as the static responder does for files.
  const ifNoneMatch = upstreamValidators(incoming.headers["if-none-match"]);
  return {
    ...incoming.headers,
    "accept-encoding": "identity",
    ...(ifNoneMatch === undefined ? {} : { "if-none-match": ifNoneMatch }),
    "x-forwarded-host": incoming.headers.host ?? `127.0.0.1:${port}`,
    "x-forwarded-proto": "encrypted" in incoming.socket ? "https" : "http",
  };
}
async function handle(incoming: IncomingMessage, outgoing: ServerResponse) {
  const url = new URL(incoming.url ?? "/", `http://127.0.0.1:${port}`);
  outgoing.setHeader("Access-Control-Allow-Origin", "*");
  outgoing.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (incoming.method === "OPTIONS") {
    outgoing.writeHead(204);
    outgoing.end();
    return;
  }
  if (servePageAsset(url, incoming, outgoing)) {
    return;
  }
  if (url.pathname === "/health") {
    await sendHealth(outgoing);
    return;
  }
  if (url.pathname === "/api/consent/init") {
    await waitForBackend(backendDelayMs);
    await sendConsentJson(incoming, outgoing, initResponse);
    return;
  }
  if (url.pathname === "/api/consent/subjects") {
    await waitForBackend(backendDelayMs);
    // This acknowledges a controlled backend write; browser timing observes the response separately.
    incoming.resume();
    incoming.on("end", () => {
      void sendConsentJson(incoming, outgoing, subjectResponse);
    });
    return;
  }
  if (url.pathname === "/controlled/script") {
    const event = {
      category: url.searchParams.get("category") ?? "measurement",
      id: url.searchParams.get("id") ?? "script",
      timestamp: Date.now(),
      token: url.searchParams.get("token") ?? "fixture",
      type: "script",
      url: url.href,
    };
    events.push(event);
    outgoing.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "text/javascript",
    });
    outgoing.end(
      `window.__cookiebench ??= {consent:'unset',allowedCategories:[],scripts:[]};window.__cookiebench.scripts.push({id:${JSON.stringify(event.id)},category:${JSON.stringify(event.category)},at:performance.now()});`
    );
    return;
  }
  if (
    url.pathname.startsWith("/controlled/") &&
    sendControlledLog(url, outgoing)
  ) {
    return;
  }
  if (serveStatic) {
    await serveStatic(url, incoming, outgoing);
    return;
  }
  const isBaseline = baselineChild && url.pathname.startsWith("/baseline");
  const proxy = request(
    {
      headers: proxyHeaders(incoming),
      hostname: "127.0.0.1",
      method: incoming.method,
      path: incoming.url,
      port: isBaseline ? baselinePort : upstreamPort,
    },
    (response) => {
      forwardResponse(response, outgoing, {
        acceptEncoding: incoming.headers["accept-encoding"],
        injection: url.pathname === "/" ? bootstrap : undefined,
        method: incoming.method,
        path: url.pathname,
      });
    }
  );
  proxy.on("error", () => {
    outgoing.writeHead(503);
    outgoing.end("Production server starting");
  });
  incoming.pipe(proxy);
}
const server = createServer(handle);
// The HTTPS listener shares every route with the plain one, which keeps
// serving readiness and controlled logs to the runner.
const tlsServer = tlsCertificate
  ? createTlsServer(tlsCertificate, handle)
  : undefined;
let stopping = false;
const stop = () => {
  if (stopping) {
    return;
  }
  stopping = true;
  child?.kill("SIGTERM");
  baselineChild?.kill("SIGTERM");
  server.close();
  server.closeAllConnections();
  tlsServer?.close();
  tlsServer?.closeAllConnections();
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child?.on("error", (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
  stop();
});
child?.on("exit", (code) => {
  if (!stopping) {
    process.exitCode = code ?? 1;
    stop();
  }
});
// Fixed responses and static files are encoded before the server accepts
// requests; the runner primes proxied framework assets after readiness.
await Promise.all([
  cachedRepresentations(
    Buffer.from(JSON.stringify(initResponse)),
    "consent init"
  ),
  cachedRepresentations(
    Buffer.from(JSON.stringify(subjectResponse)),
    "consent subjects"
  ),
  serveStatic?.prime(),
]);
// Readiness polls the plain listener, so it opens only after HTTPS is bound.
if (tlsServer) {
  tlsServer.listen(tlsPort, "127.0.0.1");
  await once(tlsServer, "listening");
  process.stdout.write(`Fixture listening at https://127.0.0.1:${tlsPort}\n`);
}
server.listen(port, "127.0.0.1", () =>
  process.stdout.write(`Fixture listening at http://127.0.0.1:${port}\n`)
);
