import type { Sample } from "@cookiebench/schema";
import { expect, it } from "vitest";

import { guardColdEncoding } from "../src/index.ts";

const sample: Sample = {
  attempt: 1,
  failures: [],
  fixtureId: "fixture",
  id: "6f1d2c1e-6c55-4b52-9d8a-0c3c8f1e2a10",
  iteration: 0,
  measurements: [],
  runId: "0b0c7a43-7a8f-4c5e-9a55-1b3e2d4c5f60",
  scenarioId: "load",
  status: "passed",
};
const miss = { at: 1, bytes: 400_000, durationMs: 530, source: "/_nuxt/a.js" };

it("marks a sample incomplete when the server encoded on demand during it", () => {
  const guarded = guardColdEncoding(sample, [miss], [miss, miss]);
  expect(guarded.status).toBe("incomplete");
  expect(guarded.failures).toEqual([
    expect.objectContaining({ code: "server-cold-encoding" }),
  ]);
  expect(guarded.diagnostics?.serverColdEncodings).toEqual([miss]);
});

it("leaves samples alone without new work or without a server log", () => {
  expect(guardColdEncoding(sample, [miss], [miss])).toBe(sample);
  expect(guardColdEncoding(sample, undefined, [miss])).toBe(sample);
  expect(
    guardColdEncoding({ ...sample, status: "failed" }, [], [miss]).status
  ).toBe("failed");
});
