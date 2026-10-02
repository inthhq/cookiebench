import { afterEach, expect, test, vi } from "vitest";

import { readServerEvidence } from "../src/server-evidence.ts";

afterEach(() => vi.unstubAllGlobals());
const endpoint = new URL("http://localhost/events");
test.each([
  new Response("[]", { status: 503 }),
  Response.json({ unavailable: "logs lost" }),
  Response.json([{ timestamp: 10, type: "script" }]),
  Response.json([
    { category: "analytics", id: "1", timestamp: "bad", type: "script" },
  ]),
])("does not accept failed or malformed server evidence", async (response) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  await expect(
    readServerEvidence(endpoint, new AbortController().signal)
  ).rejects.toBeDefined();
});
test("preserves complete events while allowing an empty successful response", async () => {
  const events = [
    { category: "analytics", id: "1", timestamp: 10, type: "script" },
  ];
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json(events))
      .mockResolvedValueOnce(Response.json([]))
  );
  expect(
    await readServerEvidence(endpoint, new AbortController().signal)
  ).toEqual(events);
  expect(
    await readServerEvidence(endpoint, new AbortController().signal)
  ).toEqual([]);
});
