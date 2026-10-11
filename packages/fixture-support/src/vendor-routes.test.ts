import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { competitors } from "./competitor-bootstrap.ts";

const page = (title: string) =>
  `<!doctype html><html><head><title>${title}</title></head><body><main>${title}</main></body></html>`;

// A framework-like upstream that renders the baseline and CMP documents.
const upstream = `
const { createServer } = require("node:http");
const page = ${page.toString()};
createServer((request, response) => {
  const pathname = new URL(request.url, "http://x").pathname;
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(page(pathname.startsWith("/baseline") ? "baseline" : "cmp"));
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

async function start(args: string[]) {
  const port = await freePort();
  const child = spawn(process.execPath, [
    fileURLToPath(new URL("serve.ts", import.meta.url)),
    "--port",
    String(port),
    ...args,
  ]);
  await once(child.stdout, "data", { signal: AbortSignal.timeout(10_000) });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    // oxlint-disable-next-line no-await-in-loop -- Poll the upstream until it listens.
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    if (health.ok) {
      break;
    }
    // oxlint-disable-next-line no-await-in-loop -- Poll the upstream until it listens.
    await delay(100);
  }
  return { child, port, readyAt: Date.now() };
}

async function stop(child: ChildProcessWithoutNullStreams | undefined) {
  if (child && child.exitCode === null) {
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    await exited;
  }
}

const bootstraps = (html: string) =>
  [...html.matchAll(/data-cookiebench-bootstrap="(?<name>[^"]+)"/gu)].map(
    (match) => match.groups?.name
  );

describe.each([
  ["static files", "static"],
  ["a framework upstream", "proxy"],
] as const)("competitor routes on %s", (_label, mode) => {
  let child: ChildProcessWithoutNullStreams | undefined;
  let port: number;
  let readyAt: number;
  let directory: string | undefined;

  beforeAll(async () => {
    if (mode === "static") {
      directory = await mkdtemp(path.join(tmpdir(), "cookiebench-vendors-"));
      await writeFile(path.join(directory, "baseline.html"), page("baseline"));
      await writeFile(path.join(directory, "index.html"), page("cmp"));
      ({ child, port, readyAt } = await start(["--static", directory]));
    } else {
      ({ child, port, readyAt } = await start([
        "--upstream-port",
        String(await freePort()),
        "--",
        process.execPath,
        "-e",
        upstream,
      ]));
    }
  }, 30_000);

  afterAll(async () => {
    await stop(child);
    if (directory) {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("gives the baseline document exactly the requested vendor", async () => {
    const pages = await Promise.all(
      competitors.map(async (name) => {
        const response = await fetch(
          `http://127.0.0.1:${port}/baseline?cmp=${name}`
        );
        return { html: await response.text(), name, status: response.status };
      })
    );
    for (const { html, name, status } of pages) {
      expect(status).toBe(200);
      expect(bootstraps(html)).toEqual([name]);
      expect(html).toContain("<main>baseline</main>");
    }
    const plain = await fetch(`http://127.0.0.1:${port}/baseline`);
    expect(bootstraps(await plain.text())).toEqual([]);
  });

  it("refuses a vendor it doesn't know or a page other than the baseline", async () => {
    const unknown = await fetch(`http://127.0.0.1:${port}/baseline?cmp=nope`);
    expect(unknown.status).toBe(400);
    const elsewhere = await fetch(`http://127.0.0.1:${port}/?cmp=onetrust`);
    expect(elsewhere.status).toBe(400);
  });

  it.runIf(mode === "static")(
    "defers only the vendors named by --after-hydration",
    async () => {
      const deferred = await start([
        "--static",
        directory as string,
        "--after-hydration",
        "cookie-yes",
      ]);
      try {
        const timing = async (name: string) => {
          const response = await fetch(
            `http://127.0.0.1:${deferred.port}/baseline?cmp=${name}`
          );
          const html = await response.text();
          return html.includes('data-cookiebench-timing="after-hydration"');
        };
        expect(await timing("cookie-yes")).toBe(true);
        expect(await timing("ketch")).toBe(false);
      } finally {
        await stop(deferred.child);
      }
    },
    30_000
  );

  it.runIf(mode === "static")(
    "encodes every vendor document before the first visit",
    async () => {
      await fetch(`http://127.0.0.1:${port}/baseline?cmp=osano`);
      const misses = await fetch(
        `http://127.0.0.1:${port}/controlled/encoding-misses`
      );
      const late = ((await misses.json()) as { at: number }[]).filter(
        (miss) => miss.at >= readyAt
      );
      expect(late).toEqual([]);
    }
  );
});
