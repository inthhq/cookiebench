import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { gzipSync } from "node:zlib";

const port = Number(process.argv[2] || 4173);
const events = new Map();
const record = (token, event) => {
  const rows = events.get(token) || [];
  rows.push({ ...event, timestamp: Date.now() });
  events.set(token, rows);
};
const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  response.setHeader("Access-Control-Allow-Origin", "*");
  if (url.pathname === "/health") {
    response.end("ready");
    return;
  }
  if (url.pathname === "/events") {
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify(events.get(url.searchParams.get("token")) || [])
    );
    return;
  }
  if (url.pathname === "/consent") {
    record(url.searchParams.get("token"), {
      method: request.method,
      type: "consent",
    });
    if (url.searchParams.get("variant") === "backend-error") {
      response.statusCode = 503;
    }
    response.end("{}");
    return;
  }
  if (url.pathname === "/controlled.js") {
    const id = url.searchParams.get("id");
    const category = url.searchParams.get("category");
    record(url.searchParams.get("token"), { category, id, type: "script" });
    response.setHeader("Content-Type", "application/javascript");
    response.setHeader("Cache-Control", "no-store");
    response.end(
      `window.__cookiebench.scripts.push({id:${JSON.stringify(id)},category:${JSON.stringify(category)},at:performance.now()});`
    );
    return;
  }
  if (url.pathname === "/payload.js") {
    const body = `window.__payloadLoaded=true;/*${"reference bytes ".repeat(1024)}*/`;
    response.setHeader("Content-Type", "application/javascript");
    response.setHeader("Cache-Control", "public, max-age=3600");
    response.setHeader("Content-Encoding", "gzip");
    response.end(gzipSync(body));
    return;
  }
  const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  if (!["index.html", "app.js", "style.css"].includes(name)) {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }
  try {
    let contentType = "text/html";
    if (name.endsWith(".js")) {
      contentType = "application/javascript";
    }
    if (name.endsWith(".css")) {
      contentType = "text/css";
    }
    response.setHeader("Content-Type", contentType);
    response.setHeader(
      "Cache-Control",
      name.endsWith(".html") ? "no-store" : "public,max-age=3600"
    );
    let body = await readFile(
      new URL(`dist/${name}`, import.meta.url),
      "utf-8"
    );
    if (name === "index.html") {
      const variant = url.searchParams.get("variant");
      if (["hidden", "missing", "baseline"].includes(variant)) {
        body = body.replace(
          "</head>",
          "<style>#banner{visibility:hidden}</style></head>"
        );
      }
      if (variant === "css-hidden-override") {
        body = body
          .replace('id="banner"', 'id="banner" hidden')
          .replace(
            "</head>",
            "<style>#banner[hidden]{display:block!important}</style></head>"
          );
      }
      if (variant === "delayed") {
        body = body.replace('id="banner"', 'id="banner" hidden');
      }
      body = body.replace(
        "</head>",
        `<script>try{if(localStorage.getItem('reference-consent'))document.documentElement.dataset.storedConsent='true'}catch{}</script><style>html[data-stored-consent] #banner{display:none}</style></head>`
      );
    }
    response.end(body);
  } catch {
    response.statusCode = 500;
    response.end("Build the reference fixture before starting.");
  }
});
server.listen(port, "::", () =>
  process.stdout.write(`Reference fixture http://127.0.0.1:${port}\n`)
);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
