import type { FixtureConfig } from "@cookiebench/schema";
import { expect, test } from "vitest";

import { hostResolutionArgs, mappedHosts } from "../src/host-resolution.ts";

const fixture = (id: string, url: string, resolveHost?: "127.0.0.1") =>
  ({ id, url, ...(resolveHost ? { resolveHost } : {}) }) as FixtureConfig;

test("maps only fixtures that request local resolution", () => {
  const hosts = mappedHosts([
    fixture("plain", "http://127.0.0.1:4310/"),
    fixture("mapped", "https://example.test:4410/", "127.0.0.1"),
    fixture("same-host", "http://example.test:4310/baseline", "127.0.0.1"),
  ]);
  expect([...hosts]).toEqual([
    ["example.test", { address: "127.0.0.1", https: true }],
  ]);
});

test("rejects resolveHost on an address that needs no mapping", () => {
  expect(() =>
    mappedHosts([fixture("ip", "https://127.0.0.1:4410/", "127.0.0.1")])
  ).toThrow(/already uses 127\.0\.0\.1/u);
});

test("pins the run certificate instead of ignoring every certificate error", () => {
  expect(
    hostResolutionArgs({
      hosts: [
        { address: "127.0.0.1", host: "a.test" },
        { address: "127.0.0.1", host: "b.test" },
      ],
      tls: { certPath: "c", keyPath: "k", spki: "SPKI=" },
    })
  ).toEqual([
    "--host-resolver-rules=MAP a.test 127.0.0.1, MAP b.test 127.0.0.1",
    "--ignore-certificate-errors-spki-list=SPKI=",
  ]);
  expect(hostResolutionArgs({ hosts: [] })).toEqual([]);
});
