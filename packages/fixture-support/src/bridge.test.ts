import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  controlledWorkload,
  initializeBridge,
  installPageInteraction,
  updateBridge,
} from "./browser.ts";

beforeEach(() => {
  vi.stubGlobal("window", {
    location: { href: "http://localhost/?scripts=3&token=attempt-1" },
  });
  vi.stubGlobal("document", { documentElement: { dataset: {} } });
});
afterEach(() => vi.unstubAllGlobals());

describe("public consent observation bridge", () => {
  it("installs the shared page interaction and resource only once", () => {
    const addEventListener = vi.fn();
    const append = vi.fn();
    const button = { addEventListener, dataset: {} };
    const resource = { dataset: {}, src: "", type: "" };
    vi.stubGlobal("document", {
      createElement: () => resource,
      head: { append },
      querySelector: () => button,
    });
    installPageInteraction();
    installPageInteraction();
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledTimes(1);
    expect(resource.src).toBe("/page-assets/reading-list.js");
    expect(resource.dataset).toEqual({ osano: "ESSENTIAL" });
  });
  it("does not infer a choice or persistence from a resolved policy", () => {
    updateBridge({
      effectivePermissions: { measurement: false, necessary: true },
      explicitChoice: null,
      resolution: { status: "matched" },
    });
    expect(initializeBridge()).toMatchObject({
      allowedCategories: [],
      consent: "unset",
      ready: true,
    });
    expect(initializeBridge().resolvedAt).toBeGreaterThanOrEqual(0);
    expect(initializeBridge()).not.toHaveProperty("persistedAt");
  });
  it("ignores required permissions when classifying optional rejection", () => {
    updateBridge({
      effectivePermissions: {
        marketing: false,
        measurement: false,
        necessary: true,
      },
      explicitChoice: {
        categories: {
          marketing: { value: false },
          measurement: { value: false },
          necessary: { value: true },
        },
      },
      resolution: { status: "matched" },
    });
    expect(initializeBridge()).toMatchObject({
      allowedCategories: [],
      consent: "rejected",
    });
  });
  it("reads granted permissions without inventing script executions", () => {
    updateBridge({
      effectivePermissions: { marketing: false, measurement: true },
      explicitChoice: {
        categories: {
          marketing: { value: false },
          measurement: { value: true },
        },
      },
      resolution: { status: "matched" },
    });
    expect(initializeBridge()).toMatchObject({
      allowedCategories: ["measurement"],
      consent: "custom",
      scripts: [],
    });
  });
  it("uses declared workload size and preserves the server correlation token", () => {
    const scripts = controlledWorkload();
    expect(scripts).toHaveLength(3);
    expect(scripts.map((script) => script.category)).toEqual([
      "measurement",
      "marketing",
      "measurement",
    ]);
    expect(
      new URL(scripts[0]?.src ?? "", "http://localhost").searchParams.get(
        "token"
      )
    ).toBe("attempt-1");
  });
});
