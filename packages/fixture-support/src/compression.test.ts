import { describe, expect, it } from "vitest";

import { negotiateEncoding } from "./compression.ts";

describe("HTTP compression negotiation", () => {
  it.each([
    [undefined, "identity"],
    ["", "identity"],
    ["br, gzip", "br"],
    ["br;q=0, gzip", "gzip"],
    ["br;q=0.2, gzip;q=0.8", "gzip"],
    ["BR, GZIP", "br"],
    ["*;q=0.5, br;q=0", "gzip"],
    ["gzip;q=0, br;q=0", "identity"],
    ["identity;q=1, gzip;q=0.5", "identity"],
    ["gzip;q=bad", "identity"],
    ["*;q=0", undefined],
    ["*;q=0, identity;q=1", "identity"],
    ["identity;q=0, deflate", undefined],
  ])("negotiates %s as %s", (header, expected) => {
    expect(negotiateEncoding(header)).toBe(expected);
  });
  it("does not encode compressed image formats", () => {
    expect(negotiateEncoding("br, gzip", false)).toBe("identity");
    expect(negotiateEncoding("identity;q=0, br", false)).toBeUndefined();
  });
});
