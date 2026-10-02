import { once } from "node:events";
import { createServer } from "node:http";
import type { Server } from "node:http";

import { expect, test } from "@playwright/test";

import { referenceFixture, referenceScenario } from "../src/reference.ts";
import { prime } from "../src/scenario.ts";

let server: Server;
let origin: string;

test.beforeAll(async () => {
  // A CMP that keeps writing on timers and while the page is hidden.
  server = createServer((_request, response) => {
    response.setHeader("Content-Type", "text/html");
    response.end(`<!doctype html><main>Article</main><script>
      const write = (key) => {
        localStorage.setItem(key, "1");
        document.cookie = key + "=1; path=/";
      };
      write("initial");
      setInterval(() => write("timer"), 1);
      addEventListener("pagehide", () => write("pagehide"));
    </script>`);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Missing test server port");
  }
  origin = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  const closed = once(server, "close");
  server.closeAllConnections();
  server.close();
  await closed;
});

test("warm fresh preparation leaves no storage the priming page wrote late", async ({
  browser,
}) => {
  const context = await browser.newContext();
  try {
    await prime(
      context,
      { ...referenceFixture({ server: false }), url: `${origin}/` },
      referenceScenario({ action: "load", cache: "warm", visitor: "fresh" })
    );
    const storage = await context.storageState();
    expect(storage.cookies).toEqual([]);
    expect(storage.origins.flatMap((item) => item.localStorage)).toEqual([]);
  } finally {
    await context.close();
  }
});
