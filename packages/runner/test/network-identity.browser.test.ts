import { createHash } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { gzipSync } from "node:zlib";

import { chromium, expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { collectNetwork } from "../src/network.ts";

const body = Buffer.from(
  JSON.stringify({ measurement: true, text: "fixture ".repeat(500) })
);
const zipped = gzipSync(body);
const chunkedBody = Buffer.from("x".repeat(1672));
const chunkedGzip = gzipSync(chunkedBody);
const latin1Source = 'window.__latin1Evidence = "café";';
const latin1Body = Buffer.from(latin1Source, "latin1");
const hash = (value: Buffer) =>
  createHash("sha256").update(value).digest("hex");
let app: Server;
let api: Server;
let origin: string;
let remote: string;
const methods: string[] = [];
const requestedUrls: string[] = [];

test.beforeAll(async () => {
  api = createServer((request, response) => {
    methods.push(request.method ?? "");
    requestedUrls.push(request.url ?? "");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "X-Request-Id");
    response.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    if (request.url === "/latin1.js") {
      response.setHeader(
        "Content-Type",
        "application/javascript; charset=iso-8859-1"
      );
      response.setHeader("Content-Length", latin1Body.length);
      response.end(latin1Body);
      return;
    }
    if (request.url === "/scope-frame") {
      response.setHeader("Content-Type", "text/html");
      response.end(
        '<!doctype html><script>fetch("/scope-frame-body.json").then(r => r.text()).then(() => parent.postMessage("frame-fetched", "*"))</script>'
      );
      return;
    }
    if (request.url?.startsWith("/prefetch-")) {
      const compressed = request.url.includes("gzip");
      response.setHeader("Cache-Control", "max-age=3600");
      response.setHeader("Content-Type", "text/javascript");
      if (compressed) {
        response.setHeader("Content-Encoding", "gzip");
      }
      const bytes = compressed ? zipped : body;
      response.setHeader("Content-Length", bytes.length);
      response.end(bytes);
      return;
    }
    if (request.url === "/redirect-to-gzip") {
      response.statusCode = 302;
      response.setHeader("Location", "/gzip.json");
      response.setHeader("Content-Length", 0);
      response.end();
      return;
    }
    if (request.method === "OPTIONS" || request.url === "/bodyless") {
      response.statusCode = 204;
      response.end();
      return;
    }
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Cache-Control", "no-store");
    if (["/chunked.json", "/chunked-gzip.json"].includes(request.url ?? "")) {
      const compressed = request.url === "/chunked-gzip.json";
      if (compressed) {
        response.setHeader("Content-Encoding", "gzip");
      }
      // Sending headers before end forces HTTP/1.1 chunk framing.
      response.writeHead(200);
      response.end(compressed ? chunkedGzip : chunkedBody);
      return;
    }
    if (request.url === "/same.json") {
      const bytes = Buffer.from(
        JSON.stringify({ id: request.headers["x-request-id"] })
      );
      response.end(bytes);
      return;
    }
    response.setHeader("Content-Encoding", "gzip");
    response.setHeader("Content-Length", zipped.length);
    response.end(zipped);
  });
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  app = createServer((request, response) => {
    if (request.url === "/shared-worker.js") {
      response.setHeader("Content-Type", "application/javascript");
      response.end(
        'onconnect = event => { fetch("/shared-worker-body.json").then(r => r.text()).then(() => event.ports[0].postMessage("fetched")); };'
      );
      return;
    }
    if (request.url === "/shared-worker-body.json") {
      requestedUrls.push(request.url);
      response.setHeader("Content-Type", "application/json");
      response.end('{"shared":true}');
      return;
    }
    response.setHeader("Content-Type", "text/html");
    response.end(
      "<!doctype html><html><body>Network identity fixture</body></html>"
    );
  });
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  const appAddress = app.address();
  const apiAddress = api.address();
  if (
    !appAddress ||
    typeof appAddress === "string" ||
    !apiAddress ||
    typeof apiAddress === "string"
  ) {
    throw new Error("Missing fixture address");
  }
  origin = `http://127.0.0.1:${appAddress.port}`;
  remote = `http://127.0.0.1:${apiAddress.port}`;
});

test("shared-worker fetches cannot leave network coverage marked complete", async ({
  page,
}, testInfo) => {
  const network = await collectNetwork(page, origin);
  await page.goto(origin);
  await page.evaluate(
    () =>
      // eslint-disable-next-line promise/avoid-new -- Bridge a SharedWorker port completion message.
      new Promise<void>((resolve, reject) => {
        const worker = new SharedWorker("/shared-worker.js");
        worker.port.addEventListener(
          "message",
          () => {
            worker.port.close();
            resolve();
          },
          { once: true }
        );
        worker.addEventListener(
          "error",
          () => reject(new Error("Shared worker failed")),
          { once: true }
        );
        worker.port.start();
      })
  );
  expect(requestedUrls).toContain("/shared-worker-body.json");
  expect(network.coverage()).toMatchObject({ complete: false });
  expect(network.coverage().reasons.join(" ")).toContain(
    "Shared-worker traffic"
  );
  await testInfo.attach("shared-worker-coverage", {
    body: JSON.stringify({
      collectorObserved: network.requests.some((row) =>
        row.url.endsWith("/shared-worker-body.json")
      ),
      coverage: network.coverage(),
      serverObserved: true,
    }),
    contentType: "application/json",
  });
});

test("text body identity records its encoding separately from original response byte lengths", async ({
  page,
}) => {
  const network = await collectNetwork(page, origin);
  await page.goto(origin);
  await page.addScriptTag({ url: `${remote}/latin1.js` });
  expect(
    await page.evaluate(() => Reflect.get(window, "__latin1Evidence"))
  ).toBe("café");
  await expect
    .poll(
      () =>
        network.requests.find((row) => row.url.endsWith("/latin1.js"))?.finished
    )
    .toBe(true);
  const snapshot = await network.snapshot();
  const row = snapshot.find((request) => request.url.endsWith("/latin1.js"));
  expect(row).toMatchObject({
    decodedBodyBytes: latin1Body.length,
    encodedBodyBytes: latin1Body.length,
  });
  expect(["utf8-text", "base64-bytes"]).toContain(row?.bodyDigestEncoding);
  const expectedBody =
    row?.bodyDigestEncoding === "utf8-text"
      ? Buffer.from(latin1Source, "utf-8")
      : latin1Body;
  expect(row?.decodedBodySha256).toBe(hash(expectedBody));
});

test("worker fetches reach the server without qualifying network totals", async ({
  page,
}, testInfo) => {
  const network = await collectNetwork(page, origin);
  await page.goto(origin);
  const url = `${remote}/scope-worker-body.json`;
  await page.evaluate(
    (target) =>
      // eslint-disable-next-line promise/avoid-new -- Bridge a worker message from the browser realm.
      new Promise<void>((resolve, reject) => {
        const source = `fetch(${JSON.stringify(target)}).then(r => r.text()).then(() => postMessage("fetched"))`;
        const worker = new Worker(
          URL.createObjectURL(new Blob([source], { type: "text/javascript" }))
        );
        worker.addEventListener(
          "message",
          () => {
            worker.terminate();
            resolve();
          },
          { once: true }
        );
        worker.addEventListener(
          "error",
          (event) => reject(new Error(event.message)),
          { once: true }
        );
      }),
    url
  );
  expect(requestedUrls).toContain("/scope-worker-body.json");
  expect(network.coverage()).toMatchObject({
    complete: false,
    scope: "page-tree",
  });
  expect(network.coverage().reasons.join(" ")).toContain("Worker traffic");
  await testInfo.attach("worker-coverage", {
    body: JSON.stringify({
      collectorObserved: network.requests.some((row) => row.url === url),
      coverage: network.coverage(),
      serverObserved: true,
    }),
    contentType: "application/json",
  });
});

async function frameTraffic(page: Page) {
  const network = await collectNetwork(page, origin);
  await page.goto(origin);
  const target = `${remote.replace("127.0.0.1", "localhost")}/scope-frame`;
  await page.evaluate(
    (url) =>
      // eslint-disable-next-line promise/avoid-new -- Bridge the child frame's completion message.
      new Promise<void>((resolve) => {
        window.addEventListener(
          "message",
          (event) => {
            if (event.data === "frame-fetched") {
              resolve();
            }
          },
          { once: true }
        );
        const frame = document.createElement("iframe");
        frame.src = url;
        document.body.append(frame);
      }),
    target
  );
  const rows = await network.snapshot();
  for (const suffix of ["/scope-frame", "/scope-frame-body.json"]) {
    const row = rows.find((request) => request.url.endsWith(suffix));
    expect(row).toMatchObject({ finished: true, status: 200 });
    expect(row?.transferBytes).toBeGreaterThan(0);
    expect(row?.byteInconsistencies).toBeUndefined();
  }
  expect(network.coverage()).toMatchObject({ complete: true });
}

test("in-process cross-site frame traffic is collected without breaking coverage", async ({
  page,
}) => {
  await frameTraffic(page);
});

test("out-of-process frame traffic is collected through its own target", async () => {
  // Headless shell keeps cross-site frames in-process unless site isolation is on.
  const browser = await chromium.launch({ args: ["--site-per-process"] });
  try {
    await frameTraffic(await browser.newPage());
  } finally {
    await browser.close();
  }
});

test("redirect hops record their own transfer bytes", async ({ page }) => {
  const network = await collectNetwork(page, origin);
  const hopHeaders: number[] = [];
  network.session.on("Network.responseReceivedExtraInfo", (event) => {
    if (event.statusCode === 302 && event.headersText) {
      hopHeaders.push(Buffer.byteLength(event.headersText));
    }
  });
  await page.goto(origin);
  await page.evaluate(async (base) => {
    const response = await fetch(`${base}/redirect-to-gzip`);
    await response.text();
  }, remote);
  const rows = await network.snapshot();
  const hop = rows.find((row) => row.url.endsWith("/redirect-to-gzip"));
  expect(hop).toMatchObject({
    decodedBodyBytes: 0,
    encodedBodyBytes: 0,
    finished: true,
    status: 302,
  });
  // A bodyless redirect transfers exactly its header bytes.
  expect(hop?.transferBytes).toBe(hopHeaders[0]);
  expect(rows.find((row) => row.url.endsWith("/gzip.json"))).toMatchObject({
    encodedBodyBytes: zipped.length,
  });
});

for (const compressed of [false, true]) {
  // oxlint-disable-next-line no-loop-func -- Both cases use server origins initialized by beforeAll.
  test(`chunked ${compressed ? "gzip" : "identity"} responses do not treat protocol event bytes as body bytes`, async ({
    page,
  }) => {
    const network = await collectNetwork(page, origin);
    const eventBytes = new Map<string, number>();
    network.session.on("Network.dataReceived", (event) => {
      eventBytes.set(
        event.requestId,
        (eventBytes.get(event.requestId) ?? 0) + event.encodedDataLength
      );
    });
    await page.goto(origin);
    const url = `${remote}/${compressed ? "chunked-gzip" : "chunked"}.json`;
    await page.evaluate(async (target) => {
      const response = await fetch(target);
      await response.text();
    }, url);
    await expect
      .poll(() => network.requests.find((row) => row.url === url)?.finished)
      .toBe(true);
    const snapshot = await network.snapshot();
    const row = snapshot.find((request) => request.url === url);
    const protocolId = row?.id.slice(0, row.id.lastIndexOf(":")) ?? "";
    const raw = eventBytes.get(protocolId);
    expect(raw).toBeGreaterThan(0);
    expect(row?.encodedDataBytes).toBe(raw);
    expect(row?.decodedBodyBytes).toBe(chunkedBody.length);
    expect(row?.decodedBodySha256).toBe(hash(chunkedBody));
    if (compressed) {
      expect(row?.encodedBodyBytes).toBeUndefined();
    } else {
      expect(raw).toBe(chunkedBody.length + 12);
      expect(row?.encodedBodyBytes).toBe(chunkedBody.length);
    }
  });
}

test.afterAll(async () => {
  await Promise.all(
    [app, api].map((server) => {
      const closed = once(server, "close");
      server.closeAllConnections();
      server.close();
      return closed;
    })
  );
});

test("gzip body bytes stay distinct from headers and bodyless responses remain zero", async ({
  page,
}) => {
  const network = await collectNetwork(page, origin);
  const headerSizes = new Map<string, number>();
  network.session.on("Network.responseReceivedExtraInfo", (event) => {
    if (event.headersText) {
      headerSizes.set(event.requestId, Buffer.byteLength(event.headersText));
    }
  });
  await page.goto(origin);
  await page.evaluate(async (base) => {
    const gzipResponse = await fetch(`${base}/gzip.json`);
    await gzipResponse.text();
    const emptyResponse = await fetch(`${base}/bodyless`);
    await emptyResponse.text();
  }, remote);
  await expect
    .poll(
      () =>
        network.requests.filter(
          (row) => row.url.startsWith(remote) && row.finished
        ).length
    )
    .toBe(2);
  const rows = await network.snapshot();
  const gzip = rows.find((row) => row.url.endsWith("/gzip.json"));
  expect(gzip).toMatchObject({
    decodedBodyBytes: body.length,
    decodedBodySha256: hash(body),
    encodedBodyBytes: zipped.length,
  });
  expect(gzip?.transferBytes).toBeGreaterThan(zipped.length);
  const protocolId = gzip?.id.slice(0, gzip.id.lastIndexOf(":")) ?? "";
  const headerSize = headerSizes.get(protocolId);
  expect(headerSize).toBeGreaterThan(0);
  expect(gzip?.transferBytes).toBe(zipped.length + (headerSize ?? 0));
  expect(rows.find((row) => row.url.endsWith("/bodyless"))).toMatchObject({
    decodedBodyBytes: 0,
    encodedBodyBytes: 0,
    status: 204,
  });
});

test("preflight and concurrent same-URL responses retain exact CDP body identity", async ({
  page,
}) => {
  const network = await collectNetwork(page, origin);
  const expected = new Map<string, string>();
  network.session.on("Network.requestWillBeSent", (event) => {
    const id = event.request.headers["X-Request-Id"];
    if (id) {
      expected.set(event.requestId, hash(Buffer.from(JSON.stringify({ id }))));
    }
  });
  await page.goto(origin);
  await page.evaluate(async (base) => {
    await Promise.all(
      ["first", "second"].map(async (id) => {
        const response = await fetch(`${base}/same.json`, {
          headers: { "X-Request-Id": id },
        });
        await response.text();
      })
    );
  }, remote);
  await expect
    .poll(
      () =>
        network.requests.filter(
          (row) =>
            row.url.endsWith("/same.json") &&
            row.resourceType === "Fetch" &&
            row.finished
        ).length
    )
    .toBe(2);
  const snapshot = await network.snapshot();
  const rows = snapshot.filter((row) => row.url.endsWith("/same.json"));
  expect(methods).toContain("OPTIONS");
  expect(expected.size).toBe(2);
  for (const row of rows) {
    if (row.method === "OPTIONS") {
      expect(row.decodedBodySha256).toBeUndefined();
      expect(row.encodedBodyBytes).toBe(0);
    } else {
      const protocolId = row.id.slice(0, row.id.lastIndexOf(":"));
      expect(row.decodedBodySha256).toBe(expected.get(protocolId));
    }
  }
});

test("prefetched bodies no renderer read keep exact or explicitly unknown decoded sizes", async ({
  page,
}) => {
  const network = await collectNetwork(page, origin);
  await page.goto(origin);
  await page.evaluate((base) => {
    for (const name of ["prefetch-identity.js", "prefetch-gzip.js"]) {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.crossOrigin = "anonymous";
      link.href = `${base}/${name}`;
      document.head.append(link);
    }
  }, remote);
  await expect
    .poll(
      () =>
        network.requests.filter(
          (row) => row.url.includes("/prefetch-") && row.finished
        ).length
    )
    .toBe(2);
  const rows = await network.snapshot();
  const identity = rows.find((row) =>
    row.url.endsWith("/prefetch-identity.js")
  );
  const gzip = rows.find((row) => row.url.endsWith("/prefetch-gzip.js"));
  // CDP reports the network bytes of a prefetch with zero decoded dataLength.
  expect(identity?.encodedDataBytes).toBeGreaterThan(0);
  expect(identity).toMatchObject({
    decodedBodyBytes: body.length,
    encodedBodyBytes: body.length,
  });
  expect(gzip).toMatchObject({ encodedBodyBytes: zipped.length });
  expect(gzip?.decodedBodyBytes).toBeUndefined();
  expect(gzip?.decodedBodyUnavailable).toContain("not delivered");
  for (const row of [identity, gzip]) {
    // An empty protocol body is not this response's identity.
    expect(row?.decodedBodySha256).toBeUndefined();
    expect(row?.byteInconsistencies).toBeUndefined();
  }
});
