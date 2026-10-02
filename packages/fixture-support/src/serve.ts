import { spawn } from "node:child_process";
import { createServer, request } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { parseArgs } from "node:util";

import { parseBackendDelay, waitForBackend } from "./backend-delay.ts";
import { initResponse } from "./backend.ts";
import { competitorBootstrap } from "./competitor-bootstrap.ts";
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
    "upstream-port": { type: "string" },
  },
});
const backendDelayMs = parseBackendDelay(values["backend-delay-ms"]);
const port = Number(values.port);
const bootstrap = competitorBootstrap(values.competitor);
if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
  throw new Error("Expected --port between 1 and 65535.");
}
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
    incoming.headers["accept-encoding"]
  );
  if (pageAsset) {
    outgoing.writeHead(pageAsset.status, pageAsset.headers);
    outgoing.end(incoming.method === "HEAD" ? undefined : pageAsset.body);
    return true;
  }
  return false;
}
function proxyHeaders(incoming: IncomingMessage, url: URL) {
  const fixtureDocument =
    Boolean(bootstrap) && ["/", "/baseline"].includes(url.pathname);
  return {
    ...incoming.headers,
    ...(fixtureDocument ? { "accept-encoding": "identity" } : {}),
    "x-forwarded-host": `127.0.0.1:${port}`,
    "x-forwarded-proto": "http",
  };
}
const server = createServer(async (incoming, outgoing) => {
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
  if (url.pathname === "/health" && values.static) {
    outgoing.end("ready");
    return;
  }
  if (url.pathname === "/health") {
    try {
      const response = await fetch(`http://127.0.0.1:${upstreamPort}/`);
      outgoing.writeHead(response.ok ? 200 : 503);
      outgoing.end(response.ok ? "ready" : "starting");
    } catch {
      outgoing.writeHead(503);
      outgoing.end("starting");
    }
    return;
  }
  if (url.pathname === "/api/consent/init") {
    await waitForBackend(backendDelayMs);
    outgoing.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    });
    outgoing.end(JSON.stringify(initResponse));
    return;
  }
  if (url.pathname === "/api/consent/subjects") {
    await waitForBackend(backendDelayMs);
    // This acknowledges a controlled backend write; browser timing observes the response separately.
    incoming.resume();
    incoming.on("end", () => {
      outgoing.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      });
      outgoing.end(
        JSON.stringify({ ok: true, subjectId: "cookiebench-subject" })
      );
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
  if (url.pathname === "/controlled/events") {
    outgoing.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    });
    outgoing.end(
      JSON.stringify(
        events.filter(
          (event) =>
            !url.searchParams.has("token") ||
            event.token === url.searchParams.get("token")
        )
      )
    );
    return;
  }
  if (serveStatic) {
    await serveStatic(url, incoming, outgoing);
    return;
  }
  const isBaseline = baselineChild && url.pathname.startsWith("/baseline");
  const proxy = request(
    {
      headers: proxyHeaders(incoming, url),
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
      });
    }
  );
  proxy.on("error", () => {
    outgoing.writeHead(503);
    outgoing.end("Production server starting");
  });
  incoming.pipe(proxy);
});
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
server.listen(port, "127.0.0.1", () =>
  process.stdout.write(`Fixture listening at http://127.0.0.1:${port}\n`)
);
