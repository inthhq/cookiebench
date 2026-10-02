import type { RunManifest } from "@cookiebench/schema";
import { expect, test } from "vitest";

import { measurementValidity } from "./validity.ts";

const exactBodyCollector =
  "23c20f43c1361da063d0bb1806c16022bebc4ef82f083e331eaa8954b79fb2d3";
const manifest = (hash: string): RunManifest => ({
  collectorVersion: "test-collector",
  createdAt: "2026-09-27T00:00:00Z",
  environment: { collectorSourceHash: hash },
  id: "11111111-1111-4111-8111-111111111111",
  methodologyVersion: "test-methodology",
  profile: {
    cpuSlowdown: 1,
    deviceScaleFactor: 1,
    id: "desktop-test",
    isMobile: false,
    locale: "en-GB",
    network: {
      downloadBytesPerSecond: 12_500_000,
      latencyMs: 0,
      uploadBytesPerSecond: 12_500_000,
    },
    region: "GB",
    viewport: { height: 768, width: 1365 },
  },
  seed: 1,
  versions: {},
});

test("historical timing restrictions do not discard the corrected collector's body bytes", () => {
  const old = manifest(exactBodyCollector);
  expect(
    measurementValidity(old, {}, "page.lcp", { action: "load" }).join(" ")
  ).toContain("entry-time cutoff");
  expect(
    measurementValidity(old, {}, "action.input-to-next-paint", {
      action: "accept",
    }).join(" ")
  ).toContain("reporting threshold");
  expect(
    measurementValidity(old, {}, "initial.encoded-body", { action: "load" })
  ).toEqual([]);
  expect(
    measurementValidity(old, {}, "initial.transfer", { action: "load" })
  ).toEqual([]);
});

test("state-count invalidation follows the action window, and new collectors remain separate", () => {
  expect(
    measurementValidity(
      manifest(exactBodyCollector),
      {},
      "scripts.executions",
      { action: "accept" }
    ).join(" ")
  ).toContain("observation deadline");
  expect(
    measurementValidity(
      manifest(exactBodyCollector),
      {},
      "scripts.executions",
      { action: "load" }
    )
  ).toEqual([]);
  expect(
    measurementValidity(manifest("new-corrected-source"), {}, "page.lcp", {
      action: "load",
    })
  ).toEqual([]);
});

test("the legacy runner timing contract is invalid even for an unlisted source hash", () => {
  const old = {
    ...manifest("earlier-retained-source"),
    collectorVersion: "cookiebench-runner-3.0.0",
  };
  expect(
    measurementValidity(old, {}, "page.lcp", { action: "load" }).join(" ")
  ).toContain("entry-time cutoff");
  expect(
    measurementValidity(old, {}, "action.input-to-next-paint", {
      action: "accept",
    }).join(" ")
  ).toContain("reporting threshold");
  expect(
    measurementValidity(old, {}, "initial.transfer", { action: "load" })
  ).toEqual([]);
});

test("runner timing invalidation does not invalidate the overhead experiment's native methods", () => {
  const audit = {
    ...manifest(exactBodyCollector),
    collectorVersion: "cookiebench-instrumentation-audit-1.0.0",
    methodologyVersion: "cookiebench-instrumentation-overhead-v1",
  };
  expect(
    measurementValidity(audit, {}, "custom.audit.lcp", { action: "load" })
  ).toEqual([]);
  expect(
    measurementValidity(audit, {}, "custom.audit.task-duration", {
      action: "load",
    })
  ).toEqual([]);
});
