import type { FixtureConfig, Sample } from "@cookiebench/schema";
import { expect, test } from "vitest";

import { artifactEligibility } from "./artifacts.ts";

const fixture: Pick<FixtureConfig, "artifactPolicy"> = {
  artifactPolicy: "mutable-network",
};
const request = {
  decodedBodySha256: "a".repeat(64),
  finished: true,
  party: "third-party",
  resourceType: "Script",
  url: "https://vendor.test/loader.js",
};
const sample = (requests: unknown): Pick<Sample, "diagnostics"> => ({
  diagnostics: {
    networkCoverage: { complete: true, reasons: [], scope: "page-target" },
    requests,
  },
});
test("dated identical measured bytes qualify even when their URL is mutable", () => {
  expect(
    artifactEligibility(fixture, [sample([request]), sample([request])])
  ).toEqual([]);
});
test("missing bodies, failed requests and observed artifact drift withhold identity", () => {
  for (const changed of [
    { ...request, decodedBodySha256: undefined },
    { ...request, finished: false },
    { ...request, failed: "network" },
    { ...request, bodyDigestUnavailable: "body gone" },
  ]) {
    expect(
      artifactEligibility(fixture, [sample([changed])]).join(" ")
    ).toContain("missing");
  }
  expect(
    artifactEligibility(fixture, [
      sample([request]),
      sample([{ ...request, decodedBodySha256: "b".repeat(64) }]),
    ]).join(" ")
  ).toContain("changed");
  expect(
    artifactEligibility(fixture, [
      sample([request]),
      sample([{ ...request, url: `${request.url}?revision=2` }]),
    ]).join(" ")
  ).toContain("changed");
});

test("captured response identity cannot qualify unseen frame or worker assets", () => {
  for (const networkCoverage of [
    undefined,
    { complete: false, reasons: ["Worker target"], scope: "page-target" },
    { complete: true, reasons: ["Child frame"], scope: "page-target" },
  ]) {
    const retained = { diagnostics: { networkCoverage, requests: [request] } };
    expect(artifactEligibility(fixture, [retained]).join(" ")).toContain(
      "network coverage is missing or incomplete"
    );
    expect(artifactEligibility({}, [retained])).toEqual([]);
  }
});
