import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseBackendDelay } from "./backend-delay.ts";

describe("backend delay configuration", () => {
  it.each([
    [undefined, 0],
    ["0", 0],
    ["150", 150],
    ["60000", 60_000],
  ] as const)("accepts %s as %d ms", (value, expected) => {
    expect(parseBackendDelay(value)).toBe(expected);
  });

  it.each(["", " ", "-1", "0.5", "NaN", "Infinity", "60001", "1e3"])(
    "rejects invalid delay %s",
    (value) => {
      expect(() => parseBackendDelay(value)).toThrow("--backend-delay-ms");
    }
  );
});

describe("fixture backend HTTP delay", () => {
  let directory: string;
  let baseUrl: string;
  let child: ChildProcessWithoutNullStreams;

  beforeAll(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "cookiebench-delay-"));
    await writeFile(path.join(directory, "app.js"), "window.loaded = true;");
    const reservation = createServer();
    reservation.listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const { port } = reservation.address() as AddressInfo;
    const closed = once(reservation, "close");
    reservation.close();
    await closed;
    baseUrl = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [
      fileURLToPath(new URL("serve.ts", import.meta.url)),
      "--port",
      String(port),
      "--static",
      directory,
      "--backend-delay-ms",
      "150",
    ]);
    const output = await once(child.stdout, "data", {
      signal: AbortSignal.timeout(5000),
    });
    expect(String(output[0])).toContain("Fixture listening");
  });

  afterAll(async () => {
    if (child && child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
    await rm(directory, { force: true, recursive: true });
  });

  it.each(["init", "subjects"])(
    "delays the %s response by 150 ms",
    async (route) => {
      const started = performance.now();
      const response = await fetch(`${baseUrl}/api/consent/${route}`, {
        body: "{}",
        method: "POST",
      });
      expect(performance.now() - started).toBeGreaterThanOrEqual(140);
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      const body = await response.json();
      if (route === "subjects") {
        expect(body).toEqual({ ok: true, subjectId: "cookiebench-subject" });
      } else {
        expect(body).toHaveProperty("jurisdiction", "NONE");
      }
    }
  );

  it("serves health, assets, control routes and preflight while consent waits", async () => {
    let consentReturned = false;
    const consent = fetch(`${baseUrl}/api/consent/init`).then(
      async (response) => {
        await response.arrayBuffer();
        consentReturned = true;
      }
    );
    await delay(20);
    const responses = await Promise.all([
      fetch(`${baseUrl}/health`),
      fetch(`${baseUrl}/app.js`),
      fetch(`${baseUrl}/controlled/script`),
      fetch(`${baseUrl}/controlled/events`),
      fetch(`${baseUrl}/api/consent/init`, { method: "OPTIONS" }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([
      200, 200, 200, 200, 204,
    ]);
    expect(await responses[0].text()).toBe("ready");
    expect(await responses[1].text()).toBe("window.loaded = true;");
    expect(consentReturned).toBe(false);
    await Promise.all(
      responses.slice(2).map((response) => response.arrayBuffer())
    );
    await consent;
  });
});
