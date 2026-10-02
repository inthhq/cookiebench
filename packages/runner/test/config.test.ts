import { decodeResult } from "@cookiebench/schema";
import { expect, test } from "vitest";

import { decodeRunConfig } from "../src/config.ts";
import { referenceRunConfig } from "../src/reference.ts";

test("new mobile runs require an explicit touch and user-agent profile", () => {
  const config = referenceRunConfig();
  const mobile = { ...config, profile: { ...config.profile, isMobile: true } };
  expect(() => decodeRunConfig(mobile)).toThrow();
  expect(() =>
    decodeRunConfig({
      ...mobile,
      profile: { ...mobile.profile, hasTouch: true },
    })
  ).toThrow();
  expect(
    decodeRunConfig({
      ...mobile,
      profile: {
        ...mobile.profile,
        hasTouch: true,
        userAgent: "Recorded mobile UA",
      },
    }).profile.hasTouch
  ).toBe(true);
});

test("historical envelopes remain decodable without the added profile fields", () => {
  const config = referenceRunConfig();
  const result = decodeResult({
    artifacts: [],
    capabilities: [],
    fixtures: config.fixtures.map(
      ({ deployment: _deployment, ...fixture }) => fixture
    ),
    manifest: {
      collectorVersion: "legacy-test",
      createdAt: "2026-09-27T00:00:00Z",
      environment: {},
      id: "11111111-1111-4111-8111-111111111111",
      methodologyVersion: "legacy-test",
      profile: { ...config.profile, isMobile: true },
      seed: 1,
      versions: {},
    },
    samples: [],
    scenarios: config.scenarios,
    schemaVersion: 3,
    status: "incomplete",
  });
  expect(result.manifest.profile.hasTouch).toBeUndefined();
  expect(result.fixtures[0]?.deployment).toBeUndefined();
});

test("new runs require deployment classification and a backend-free baseline", () => {
  const config = referenceRunConfig();
  const [fixture] = config.fixtures;
  if (!fixture) {
    throw new Error("Missing reference fixture");
  }
  const { deployment, ...historical } = fixture;
  expect(deployment).toEqual({ assets: "local", backend: "controlled-local" });
  expect(() => decodeRunConfig({ ...config, fixtures: [historical] })).toThrow(
    /deployment/u
  );
  expect(() =>
    decodeRunConfig({ ...config, fixtures: [{ ...fixture, baseline: true }] })
  ).toThrow(/baselines/u);
  expect(decodeRunConfig(config).fixtures[0]?.deployment?.backend).toBe(
    "controlled-local"
  );
  expect(
    decodeRunConfig({
      ...config,
      fixtures: [
        {
          ...fixture,
          deployment: { assets: "mixed", backend: "remote-service" },
        },
      ],
    }).fixtures[0]?.deployment?.backend
  ).toBe("remote-service");
});
