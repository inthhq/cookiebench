import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { Effect } from "effect";
import { expect, test, vi } from "vitest";

import { productionServer } from "../src/lifecycle.ts";
import { referenceFixture } from "../src/reference.ts";

// Like next-server under pnpm: a descendant in its own process group that
// inherits the server's output pipes.
const server = `
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createServer } from "node:http";
const [pidFile, port] = process.argv.slice(2);
const descendant = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
  detached: true,
  stdio: ["ignore", "inherit", "inherit"],
});
writeFileSync(pidFile, String(descendant.pid));
createServer((_, response) => response.end("ok")).listen(Number(port), "127.0.0.1");
`;

async function freePort() {
  const probe = createServer().listen(0, "127.0.0.1");
  await once(probe, "listening");
  const { port } = probe.address() as AddressInfo;
  probe.close();
  return port;
}
const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

test.skipIf(process.platform === "win32")(
  "closing the server scope stops descendants in other process groups",
  async () => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "cookiebench-teardown-")
    );
    const pidFile = path.join(directory, "descendant.pid");
    const script = path.join(directory, "server.mjs");
    const port = await freePort();
    await writeFile(script, server);
    let pid: number | undefined;
    try {
      await Effect.runPromise(
        Effect.scoped(
          productionServer({
            ...referenceFixture(),
            server: {
              cwd: directory,
              readinessTimeoutMs: 5000,
              readinessUrl: `http://127.0.0.1:${port}/`,
              start: {
                args: [script, pidFile, String(port)],
                command: process.execPath,
              },
            },
          })
        )
      );
      pid = Number(await readFile(pidFile, "utf-8"));
      const descendant = pid;
      await vi.waitFor(() => expect(alive(descendant)).toBe(false), {
        timeout: 2000,
      });
    } finally {
      if (pid && alive(pid)) {
        process.kill(pid, "SIGKILL");
      }
      await rm(directory, { force: true, recursive: true });
    }
  }
);
