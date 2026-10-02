import { once } from "node:events";
import { createServer } from "node:http";
import type { Server } from "node:http";

import { expect, test } from "@playwright/test";

import { attachChildTargets, emulateProfile } from "../src/targets.ts";

// Headless shell keeps cross-site frames in-process unless site isolation is on.
test.use({ launchOptions: { args: ["--site-per-process"] } });

const payload = Buffer.alloc(200_000, 97);
const busy =
  "const started = performance.now(); let x = 0; for (let i = 0; i < 2e7; i++) { x += Math.sqrt(i); } const busyMs = performance.now() - started;";
let server: Server;
let page127: string;
let frameUrl: string;

test.beforeAll(async () => {
  server = createServer((request, response) => {
    if (request.url === "/payload") {
      response.setHeader("Cache-Control", "no-store");
      response.end(payload);
      return;
    }
    response.setHeader("Content-Type", "text/html");
    if (request.url === "/frame") {
      response.end(
        `<script>${busy} const fetched = performance.now(); fetch("/payload").then((r) => r.arrayBuffer()).then(() => parent.postMessage({ busyMs, fetchMs: performance.now() - fetched }, "*"));</script>`
      );
      return;
    }
    response.end(
      `<!doctype html><script>${busy} window.pageBusyMs = busyMs; window.frameResult = new Promise((resolve) => addEventListener("message", (event) => resolve(event.data)));</script><iframe src="${frameUrl}"></iframe>`
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Missing fixture address");
  }
  // 127.0.0.1 and localhost are different sites, so the frame gets its own renderer.
  page127 = `http://127.0.0.1:${address.port}/`;
  frameUrl = `http://localhost:${address.port}/frame`;
});

test.afterAll(async () => {
  const closed = once(server, "close");
  server.closeAllConnections();
  server.close();
  await closed;
});

test("profile throttling reaches a cross-site iframe before it runs", async ({
  page,
}) => {
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  const unthrottled = await emulateProfile(
    session,
    await attachChildTargets(session),
    {
      cpuSlowdown: 4,
      network: {
        downloadBytesPerSecond: 100_000,
        latencyMs: 0,
        uploadBytesPerSecond: 100_000,
      },
    }
  );
  await page.goto(page127);
  const frame = await page.evaluate(
    () =>
      (
        window as unknown as {
          frameResult: Promise<{ busyMs: number; fetchMs: number }>;
        }
      ).frameResult
  );
  const pageBusyMs = await page.evaluate(() =>
    Reflect.get(window, "pageBusyMs")
  );
  expect(page.frames().some((child) => child.url() === frameUrl)).toBe(true);
  // 200 kB at 100 kB/s needs about two seconds; unthrottled loopback takes milliseconds.
  expect(frame.fetchMs).toBeGreaterThan(1000);
  // The same loop under the same slowdown takes comparable time in both renderers.
  expect(frame.busyMs).toBeGreaterThan(pageBusyMs / 2);
  expect(unthrottled).toEqual([]);
});
