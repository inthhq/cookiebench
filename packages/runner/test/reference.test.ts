import { describe, expect, it } from "vitest";

import { referenceRunConfig } from "../src/reference.ts";

describe("reference run configuration", () => {
  it("records no host paths in a portable server", () => {
    const [fixture] = referenceRunConfig({ server: "portable" }).fixtures;
    expect(fixture?.server).toMatchObject({
      build: { args: ["build.mjs"], command: "node" },
      cwd: "fixtures/reference",
      start: { command: "node" },
    });
  });
});
