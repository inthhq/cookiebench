/* oxlint-disable unicorn/prefer-event-target -- Playwright page/CDP APIs use Node EventEmitter semantics. */
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";

import type { Page } from "playwright";
import { expect, test } from "vitest";

import { collectNetwork } from "../src/network.ts";

const url = "https://vendor.test/config.json";
const body = Buffer.from('{"measurement":true}');
const digest = createHash("sha256").update(body).digest("hex");

async function collector(bodies = new Map<string, Buffer | Error>()) {
  const session = new EventEmitter();
  const bodyIds: string[] = [];
  Object.assign(session, {
    send(method: string, params?: { requestId: string }) {
      if (method === "Target.getTargetInfo") {
        return Promise.resolve({
          targetInfo: { browserContextId: "test-context" },
        });
      }
      if (method === "Network.getResponseBody") {
        const id = params?.requestId;
        if (!id) {
          throw new Error("Missing CDP request identity");
        }
        bodyIds.push(id);
        const bytes = bodies.get(id) ?? body;
        if (bytes instanceof Error) {
          return Promise.reject(bytes);
        }
        return Promise.resolve({
          base64Encoded: true,
          body: bytes.toString("base64"),
        });
      }
      return Promise.resolve({});
    },
  });
  const page = new EventEmitter();
  const context = Object.assign(new EventEmitter(), {
    newCDPSession: () => Promise.resolve(session),
    serviceWorkers: () => [],
  });
  Object.assign(page, {
    context: () => context,
    frames: () => [],
    mainFrame: () => {},
    workers: () => [],
  });
  const network = await collectNetwork(
    page as unknown as Page,
    "https://shop.test/"
  );
  const browserRequest = (size: number, bytes = body) =>
    page.emit("request", {
      response: () =>
        Promise.resolve({
          body: () => Promise.resolve(bytes),
          headers: () => ({ "content-type": "application/json" }),
        }),
      sizes: () => Promise.resolve({ responseBodySize: size }),
      url: () => url,
    });
  const start = (
    id: string,
    type: string,
    method = "GET",
    redirectResponse?: { status: number }
  ) =>
    session.emit("Network.requestWillBeSent", {
      redirectResponse,
      request: { method, url },
      requestId: id,
      timestamp: 1,
      type,
      wallTime: 1000,
    });
  const response = (
    id: string,
    status: number,
    mimeType = "application/json",
    headers = {}
  ) =>
    session.emit("Network.responseReceived", {
      requestId: id,
      response: { headers, mimeType, status },
      timestamp: 1.1,
    });
  const data = (id: string, encoded: number) =>
    session.emit("Network.dataReceived", {
      dataLength: body.length,
      encodedDataLength: encoded,
      requestId: id,
      timestamp: 1.2,
    });
  const finish = (id: string, transferred: number) =>
    session.emit("Network.loadingFinished", {
      encodedDataLength: transferred,
      requestId: id,
      timestamp: 1.3,
    });
  return {
    bodyIds,
    browserRequest,
    context,
    data,
    finish,
    network,
    page,
    response,
    session,
    start,
  };
}

test("preflight-first delivery cannot steal a same-URL XHR body or encoded bytes", async () => {
  const c = await collector();
  c.browserRequest(400);
  c.start("preflight", "Other", "OPTIONS");
  c.response("preflight", 200, "");
  c.finish("preflight", 0);
  c.start("xhr", "XHR");
  c.response("xhr", 200, "application/json", {
    "Content-Encoding": "gzip",
    "Content-Length": "40",
  });
  c.data("xhr", 40);
  c.finish("xhr", 400);
  const rows = await c.network.snapshot();
  expect(rows[0]?.decodedBodySha256).toBeUndefined();
  expect(rows[0]?.encodedBodyBytes).not.toBe(400);
  expect(rows[1]).toMatchObject({
    decodedBodySha256: digest,
    encodedBodyBytes: 40,
  });
});

test("unsupported execution targets keep missing network coverage explicit", async () => {
  const c = await collector();
  expect(c.network.coverage()).toMatchObject({ complete: true, reasons: [] });
  // Frames report through the page target or an attached child target.
  c.page.emit("frameattached", {});
  expect(c.network.coverage()).toMatchObject({ complete: true, reasons: [] });
  c.page.emit("worker", {});
  c.context.emit("serviceworker", {});
  c.context.emit("page", {});
  c.session.emit("Target.targetCreated", {
    targetInfo: {
      browserContextId: "different-context",
      type: "shared_worker",
    },
  });
  expect(c.network.coverage().reasons).toHaveLength(3);
  c.session.emit("Target.targetCreated", {
    targetInfo: { browserContextId: "test-context", type: "shared_worker" },
  });
  expect(c.network.coverage()).toMatchObject({
    complete: false,
    scope: "page-tree",
  });
  expect(c.network.coverage().reasons).toHaveLength(4);
  c.session.emit("Network.loadingFinished", {
    encodedDataLength: 10,
    requestId: "unseen",
    timestamp: 1,
  });
  expect(c.network.coverage().reasons.join(" ")).toContain(
    "start was not observed"
  );
});

test("redirect hops keep their own transfer bytes and an unread body", async () => {
  const c = await collector();
  c.start("hop", "Script");
  c.session.emit("Network.requestWillBeSent", {
    redirectResponse: { encodedDataLength: 180, status: 301 },
    request: { method: "GET", url },
    requestId: "hop",
    timestamp: 1.05,
    type: "Script",
    wallTime: 1000.05,
  });
  c.response("hop", 200, "application/json", { "Content-Length": "40" });
  c.data("hop", 40);
  c.finish("hop", 300);
  const [redirect, final] = await c.network.snapshot();
  expect(redirect).toMatchObject({
    decodedBodyBytes: 0,
    encodedBodyBytes: 0,
    finished: true,
    status: 301,
    transferBytes: 180,
  });
  expect(final).toMatchObject({ encodedBodyBytes: 40, transferBytes: 300 });
});

test("exchanges without a response by failure or cutoff carry zero bytes", async () => {
  const c = await collector();
  c.start("blocked", "Script");
  c.session.emit("Network.loadingFailed", {
    errorText: "net::ERR_BLOCKED_BY_CLIENT",
    requestId: "blocked",
    timestamp: 1.1,
  });
  c.start("pending", "Fetch");
  c.start("cors", "Fetch");
  c.session.emit("Network.responseReceivedExtraInfo", { requestId: "cors" });
  c.session.emit("Network.loadingFailed", {
    corsErrorStatus: { corsError: "MissingAllowOriginHeader" },
    errorText: "net::ERR_FAILED",
    requestId: "cors",
    timestamp: 1.1,
  });
  c.start("partial", "Fetch");
  c.response("partial", 200);
  c.data("partial", 40);
  const rows = await c.network.snapshot();
  const byId = (id: string) => rows.find((row) => row.id.startsWith(`${id}:`));
  for (const [id, reason] of [
    ["blocked", "failed"],
    ["pending", "pending-at-cutoff"],
  ] as const) {
    expect(byId(id)).toMatchObject({
      decodedBodyBytes: 0,
      encodedBodyBytes: 0,
      noResponse: reason,
      transferBytes: 0,
    });
  }
  // Headers arrived before the failure or the cutoff: the bytes stay unknown.
  for (const id of ["cors", "partial"]) {
    expect(byId(id)?.noResponse).toBeUndefined();
    expect(byId(id)?.transferBytes).toBeUndefined();
  }
});

test("an exchange the page cancelled after its response began counts the bytes seen", async () => {
  const c = await collector();
  const cancelled = (id: string, headerBytes?: number) => {
    c.start(id, "Fetch", "POST");
    c.session.emit("Network.responseReceived", {
      requestId: id,
      response: {
        encodedDataLength: headerBytes,
        headers: {},
        mimeType: "application/json",
        status: 201,
      },
      timestamp: 1.1,
    });
  };
  const cancel = (id: string, canceled = true) =>
    c.session.emit("Network.loadingFailed", {
      canceled,
      errorText: "net::ERR_ABORTED",
      requestId: id,
      timestamp: 1.3,
    });
  // The Usercentrics consent POST: a 201, then the SDK cancels before the body.
  cancelled("headers", 74);
  cancel("headers");
  cancelled("body", 74);
  c.data("body", 40);
  cancel("body");
  cancelled("uncounted");
  cancel("uncounted");
  cancelled("network", 74);
  cancel("network", false);
  const rows = await c.network.snapshot();
  const byId = (id: string) => rows.find((row) => row.id.startsWith(`${id}:`));
  expect(byId("headers")).toMatchObject({
    cancelledAfterResponse: true,
    decodedBodyBytes: 0,
    encodedBodyBytes: 0,
    transferBytes: 74,
  });
  expect(byId("body")).toMatchObject({
    cancelledAfterResponse: true,
    decodedBodyBytes: body.length,
    encodedBodyBytes: 40,
    transferBytes: 114,
  });
  // Without a header count, or when the network rather than the page ended it,
  // the bytes stay unknown.
  for (const id of ["uncounted", "network"]) {
    expect(byId(id)?.cancelledAfterResponse).toBeUndefined();
    expect(byId(id)?.transferBytes).toBeUndefined();
  }
});

test("bodyless responses retain zero even when a browser size fallback reports transfer bytes", async () => {
  const c = await collector();
  c.browserRequest(567);
  c.start("bodyless", "XHR", "POST");
  c.response("bodyless", 204);
  c.finish("bodyless", 567);
  const [row] = await c.network.snapshot();
  expect(row).toMatchObject({
    decodedBodyBytes: 0,
    encodedBodyBytes: 0,
    transferBytes: 567,
  });
});

test("redirect hops never receive the final response body from a reused CDP ID", async () => {
  const c = await collector();
  c.start("redirect", "XHR");
  c.response("redirect", 302);
  c.data("redirect", 12);
  c.start("redirect", "XHR", "GET", { status: 302 });
  c.response("redirect", 200);
  c.data("redirect", 40);
  c.finish("redirect", 400);
  const rows = await c.network.snapshot();
  expect(rows[0]?.decodedBodySha256).toBeUndefined();
  expect(rows[0]?.encodedBodyBytes).toBeUndefined();
  expect(rows[0]?.bodyDigestUnavailable).toMatch(/redirect/iu);
  expect(rows[1]?.decodedBodySha256).toBe(digest);
  expect(c.bodyIds).toEqual(["redirect"]);
});

test("same-URL responses retain their own bytes when another event stream arrives in reverse order", async () => {
  const second = Buffer.from('{"measurement":false}');
  const c = await collector(
    new Map([
      ["first", body],
      ["second", second],
    ])
  );
  c.browserRequest(500, second);
  c.browserRequest(400, body);
  for (const id of ["first", "second"]) {
    c.start(id, "XHR");
    c.response(id, 200);
    c.data(id, 40);
    c.finish(id, 400);
  }
  const rows = await c.network.snapshot();
  expect(rows.map((row) => row.decodedBodySha256)).toEqual([
    digest,
    createHash("sha256").update(second).digest("hex"),
  ]);
});

test("exact content length overrides a positive partial encoded event sum", async () => {
  const c = await collector();
  c.browserRequest(400);
  c.start("gzip", "XHR");
  c.response("gzip", 200, "application/json", {
    "Content-Encoding": "gzip",
    "Content-Length": "40",
  });
  c.data("gzip", 12);
  c.finish("gzip", 400);
  const rows = await c.network.snapshot();
  expect(rows[0]?.encodedBodyBytes).toBe(40);
  expect(rows[0]?.encodedDataBytes).toBe(12);
});

test("cached bodies use exact protocol identity while unavailable bodies stay explicit", async () => {
  const c = await collector(
    new Map([["evicted", new Error("CDP response body evicted")]])
  );
  for (const id of ["cached", "evicted"]) {
    c.start(id, "XHR");
    c.session.emit("Network.requestServedFromCache", { requestId: id });
    c.response(id, 200, "application/json", { "content-length": "40" });
    c.data(id, 0);
    c.finish(id, 0);
  }
  const rows = await c.network.snapshot();
  expect(rows[0]).toMatchObject({
    decodedBodySha256: digest,
    fromCache: true,
    transferBytes: 0,
  });
  expect(rows[0]?.encodedBodyBytes).toBeUndefined();
  expect(rows[1]?.decodedBodySha256).toBeUndefined();
  expect(rows[1]?.bodyDigestUnavailable).toContain("evicted");
});

test("missing encoded body bytes use only a valid body length and never transfer totals", async () => {
  const c = await collector();
  for (const id of ["length", "chunked"]) {
    c.start(id, "XHR");
    c.response(
      id,
      200,
      "application/json",
      id === "length"
        ? { "Content-Length": "40" }
        : { "Content-Encoding": "gzip" }
    );
    c.data(id, 0);
    c.finish(id, 400);
  }
  const rows = await c.network.snapshot();
  expect(rows[0]?.encodedBodyBytes).toBe(40);
  expect(rows[1]?.encodedBodyBytes).toBeUndefined();
});

test("responses unfinished at the fixed cutoff do not acquire later body evidence", async () => {
  const c = await collector();
  c.start("late", "XHR");
  c.response("late", 200);
  c.data("late", 40);
  c.finish("late", 400);
  const [row] = await c.network.snapshot(1_000_200);
  expect(row?.finished).toBe(false);
  expect(row?.decodedBodySha256).toBeUndefined();
  expect(row?.encodedBodyBytes).toBeUndefined();
  expect(c.bodyIds).toEqual([]);
});

test("completed identity bodies exclude framing while compressed bodies need an exact length", async () => {
  const c = await collector();
  for (const [id, headers] of [
    ["identity", { "Content-Encoding": " Identity " }],
    ["absent", {}],
    ["compressed", { "Content-Encoding": "gzip" }],
    ["invalid-length", { "Content-Encoding": "br", "Content-Length": "1.5" }],
  ] as const) {
    c.start(id, "XHR");
    c.response(id, 200, "application/json", headers);
    c.data(id, body.length + 12);
    c.finish(id, 400);
  }
  const rows = await c.network.snapshot();
  expect(rows.map((row) => row.encodedBodyBytes)).toEqual([
    body.length,
    body.length,
    undefined,
    undefined,
  ]);
  expect(rows.map((row) => row.encodedDataBytes)).toEqual(
    Array.from({ length: 4 }, () => body.length + 12)
  );
});
