/* oxlint-disable no-await-in-loop -- Readiness polling is sequential and bounded by a deadline. */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { referenceRunConfig } from "@cookiebench/runner";
import { expect, test } from "vitest";

const enabled = process.env.COOKIEBENCH_CLI_BROWSER_TESTS === "1";
test.skipIf(!enabled).each([
  { code: 130, signal: "SIGINT" as const },
  { code: 143, signal: "SIGTERM" as const },
])(
  "$signal closes the detached production server before the CLI exits",
  async ({ signal: interruptSignal, code: expectedCode }) => {
    const reservation = createServer();
    reservation.listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const address = reservation.address();
    if (address === null || typeof address === "string") {
      throw new Error("No test port allocated");
    }
    const { port } = address;
    reservation.close();
    await once(reservation, "close");
    const directory = await mkdtemp(
      path.join(tmpdir(), "cookiebench-interrupt-")
    );
    const config = path.join(directory, "run.json");
    const serverFile = path.join(directory, "server.mjs");
    await writeFile(
      serverFile,
      `
      import { createServer } from "node:http";
      let browserRequested = false;
      const server = createServer((request, response) => {
        if (request.url === "/health") return response.end(String(process.pid));
        if (request.url === "/browser-requested") return response.end(String(browserRequested));
        browserRequested = true;
        response.setHeader("content-type", "text/html");
        response.end("<!doctype html><html><body>Interruption fixture</body></html>");
      });
      server.listen(${port}, "127.0.0.1");
      process.on("SIGTERM", () => setTimeout(() => server.close(() => process.exit(0)), 100));
    `
    );
    const run = referenceRunConfig({ iterations: 30, port });
    await writeFile(
      config,
      JSON.stringify({
        ...run,
        fixtures: run.fixtures.map((fixture) => ({
          ...fixture,
          server: {
            cwd: directory,
            readinessTimeoutMs: 15_000,
            readinessUrl: `http://127.0.0.1:${port}/health`,
            start: { args: [serverFile], command: process.execPath },
          },
        })),
        warmups: 0,
      })
    );
    const child = spawn(
      process.execPath,
      [
        fileURLToPath(new URL("../src/index.ts", import.meta.url)),
        "run",
        "--config",
        config,
        "--output",
        path.join(directory, "raw.json"),
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    const finished = once(child, "exit");
    let serverPid: number | undefined;
    try {
      const deadline = Date.now() + 15_000;
      let ready = false;
      while (Date.now() < deadline && !ready) {
        try {
          const response = await fetch(`http://127.0.0.1:${port}/health`);
          serverPid = Number(await response.text());
          const observed = await fetch(
            `http://127.0.0.1:${port}/browser-requested`
          );
          ready = (await observed.text()) === "true";
        } catch {
          // The scoped server has not started yet.
        }
        if (!ready) {
          await delay(50);
        }
      }
      expect(ready, stderr).toBe(true);
      child.kill(interruptSignal);
      const [code, signal] = await finished;
      expect(signal, stderr).toBe(null);
      expect(code, stderr).toBe(expectedCode);
      await expect(fetch(`http://127.0.0.1:${port}/health`)).rejects.toThrow();
    } finally {
      if (child.exitCode === null) {
        child.kill("SIGTERM");
      }
      if (serverPid) {
        try {
          process.kill(
            process.platform === "win32" ? serverPid : -serverPid,
            "SIGKILL"
          );
        } catch {
          // Best-effort teardown also runs when the shutdown assertion fails.
        }
      }
    }
  },
  30_000
);
