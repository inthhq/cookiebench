import { expect, test } from "vitest";

import { overheadOrder, validateOverheadConfig } from "../src/overhead.ts";
import { referenceRunConfig, referenceScenario } from "../src/reference.ts";

test("audit pairs contain both arms with seeded order and repeatable randomization", () => {
  const orders = overheadOrder(2026, 30);
  expect(orders).toEqual(overheadOrder(2026, 30));
  expect(orders).not.toEqual(overheadOrder(2027, 30));
  expect(
    orders.every((order) => order.toSorted().join(",") === "full,minimal")
  ).toBe(true);
  expect(new Set(orders.map((order) => order[0])).size).toBe(2);
});
test("audit rejects consent visits, warm caches and multiple page configurations", () => {
  const config = {
    ...referenceRunConfig({ variant: "baseline" }),
    scenarios: [referenceScenario({ action: "load", expectedBanner: false })],
  };
  expect(validateOverheadConfig(config)).toEqual(config);
  expect(() => validateOverheadConfig(referenceRunConfig())).toThrow(
    /baseline fixture/u
  );
  expect(() =>
    validateOverheadConfig({
      ...config,
      scenarios: [{ ...config.scenarios[0], cache: "warm" }],
    })
  ).toThrow(/cold/u);
  expect(() =>
    validateOverheadConfig({
      ...config,
      scenarios: [{ ...config.scenarios[0], action: "accept" }],
    })
  ).toThrow(/load/u);
});
