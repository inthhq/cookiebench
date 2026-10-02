import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import type { FixtureConfig } from "@cookiebench/schema";
import { expect, test } from "@playwright/test";
import type { Browser } from "@playwright/test";

import { primeFixture, readEncodingMisses } from "../src/prime.ts";
import { desktopProfile, referenceFixture } from "../src/reference.ts";

// A framework-like upstream: a page whose script is large enough that cold
// Brotli work takes hundreds of milliseconds, plus a prefetched lazy chunk.
const upstream = `
const { createServer } = require("node:http");
const script = (seed) => {
  let state = seed;
  const words = [];
  for (let i = 0; i < 40000; i += 1) { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; state >>>= 0; words.push("w" + (state % 1000000).toString(36)); }
  return Buffer.from("window.words = " + JSON.stringify(words) + ";");
};
const assets = { "/entry.js": script(2463534242), "/lazy.js": script(88675123) };
createServer((request, response) => {
  const path = new URL(request.url, "http://x").pathname;
  if (assets[path]) { response.writeHead(200, { "Content-Length": assets[path].length, "Content-Type": "text/javascript" }); response.end(assets[path]); return; }
  response.writeHead(200, { "Content-Type": "text/html" });
  response.end('<!doctype html><link rel="prefetch" href="/lazy.js"><script src="/entry.js"></script><p>fixture</p>');
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

async function startFixture() {
  const port = await freePort();
  const child = spawn(process.execPath, [
    fileURLToPath(
      new URL("../../fixture-support/src/serve.ts", import.meta.url)
    ),
    "--port",
    String(port),
    "--upstream-port",
    String(await freePort()),
    "--",
    process.execPath,
    "-e",
    upstream,
  ]);
  await once(child.stdout, "data");
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    // oxlint-disable-next-line no-await-in-loop -- Poll until the upstream listens.
    const health = await fetch(`${base}/health`);
    if (health.ok) {
      break;
    }
    // oxlint-disable-next-line no-await-in-loop -- Poll until the upstream listens.
    await delay(100);
  }
  const reference = referenceFixture();
  const fixture: FixtureConfig = {
    ...reference,
    server: {
      cwd: ".",
      readinessTimeoutMs: 5000,
      readinessUrl: `${base}/health`,
      start: { args: [], command: "true" },
    },
    url: `${base}/`,
  };
  return { child, fixture };
}

async function stop(child: ChildProcessWithoutNullStreams) {
  if (child.exitCode === null) {
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    await exited;
  }
}

async function visitMisses(browser: Browser, fixture: FixtureConfig) {
  const before = (await readEncodingMisses(fixture)) ?? [];
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(fixture.url, { waitUntil: "load" });
  await page.waitForLoadState("networkidle");
  await context.close();
  const after = (await readEncodingMisses(fixture)) ?? [];
  return after.slice(before.length);
}

test("an unprimed first visit pays cold encoding work", async ({ browser }) => {
  const { child, fixture } = await startFixture();
  try {
    const cold = await visitMisses(browser, fixture);
    // HTML streams through a flushing compressor; sized assets are cached.
    expect(cold.map((miss) => miss.source).toSorted()).toEqual([
      "/entry.js",
      "/lazy.js",
    ]);
    expect(Math.max(...cold.map((miss) => miss.durationMs))).toBeGreaterThan(
      100
    );
  } finally {
    await stop(child);
  }
});

test("priming fills encoding caches before the first measured visit", async ({
  browser,
}) => {
  const { child, fixture } = await startFixture();
  try {
    const primed = await primeFixture(browser, fixture, desktopProfile, 0);
    expect(primed.coldEncodings).toBeGreaterThanOrEqual(2);
    expect(await visitMisses(browser, fixture)).toEqual([]);
  } finally {
    await stop(child);
  }
});
