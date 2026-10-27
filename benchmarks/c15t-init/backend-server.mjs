// Serves a built @c15t/backend for the backend-* script fixtures.
// Usage: node backend-server.mjs <backend-dist-dir> <port>
// backend-before.html expects port 4802; the backend-after pages expect 4812.
import { createServer } from "node:http";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { brotliCompressSync, constants } from "node:zlib";

const [distDir, port] = process.argv.slice(2);
const { c15tInstance, policyRulePresets } = await import(
  pathToFileURL(`${distDir}/index.js`).href
);
// Stands in for the network and database time of a hosted /init.
const INIT_DELAY_MS = 80;
const BACKEND = `http://localhost:${port}/api/c15t`;

const instance = c15tInstance({
  basePath: "/api/c15t",
  database: { dialect: "sqlite", filename: ":memory:" },
  manifest: { policyRules: [policyRulePresets.europeOptIn()] },
  script: { backendURL: BACKEND },
  trustedOrigins: ["https://benchmarks-with-cookie-yes.vercel.app:4610"],
});

// A CDN serves compressed bytes from cache, so compress each body once.
const compressed = new Map();
async function send(res, response, compress) {
  const headers = Object.fromEntries(response.headers);
  let body = Buffer.from(await response.arrayBuffer());
  if (compress && body.length > 0) {
    const key = body.toString("latin1");
    let cached = compressed.get(key);
    if (!cached) {
      cached = brotliCompressSync(body, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
      });
      compressed.set(key, cached);
    }
    body = cached;
    headers["content-encoding"] = "br";
  }
  headers["content-length"] = String(body.length);
  res.writeHead(response.status, headers);
  res.end(body);
}

async function respond(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") {
      headers.set(key, value);
    }
  }
  // A visitor in the UK, so the opt-in banner shows.
  headers.set("cf-ipcountry", "GB");
  if (url.pathname.endsWith("/init")) {
    await sleep(INIT_DELAY_MS);
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const response = await instance.handler(
    new Request(url, {
      body: chunks.length ? Buffer.concat(chunks) : undefined,
      headers,
      method: req.method,
    })
  );
  await send(res, response, /\.js$|\/init$/u.test(url.pathname));
}

// The runner closes pages with requests in flight; drop those, keep serving.
createServer(async (req, res) => {
  try {
    await respond(req, res);
  } catch (error) {
    console.error(
      `dropped ${req.method} ${req.url}: ${error.code ?? error.message}`
    );
    if (!res.headersSent) {
      res.writeHead(500);
    }
    res.end();
  }
}).listen(Number(port), () => console.log(`ready ${BACKEND}`));
