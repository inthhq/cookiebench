import { afterEach, describe, expect, it, vi } from "vitest";

import {
  installNavigationCapture,
  inspectPublicState,
  navigationMeasurements,
} from "../src/navigation.ts";

const expected = {
  allowedCategories: ["analytics", "marketing"],
  consent: "accepted",
};
const inspect = () =>
  inspectPublicState({
    expected,
    global: "__cookiebench",
    ready: "[data-ready]",
  });
function documentState(
  consent: string,
  categories: string[],
  ready: boolean,
  selectorReady = ready
) {
  vi.stubGlobal("window", {
    __bench: { query: () => (selectorReady ? {} : null) },
    __cookiebench: {
      allowedCategories: categories,
      consent,
      ready,
      scripts: [],
    },
  });
  vi.stubGlobal("document", {
    querySelector: () => (selectorReady ? {} : null),
  });
}
afterEach(() => vi.unstubAllGlobals());

describe("restoration readiness", () => {
  it("does not accept restored labels while effective permissions are still resolving", () => {
    documentState("accepted", [], false);
    expect(inspect()).toMatchObject({
      matches: false,
      ready: false,
      reason: "public-state-not-ready",
    });
    documentState("accepted", ["analytics", "marketing"], true);
    expect(inspect()).toMatchObject({ matches: true, ready: true });
  });
  it("does not accept matching permissions until both public readiness conditions hold", () => {
    documentState("accepted", expected.allowedCategories, false, true);
    expect(inspect().matches).toBe(false);
    documentState("accepted", expected.allowedCategories, true, false);
    expect(inspect().matches).toBe(false);
  });
  it("preserves actual lost consent and the observed state as a failure", () => {
    documentState("unset", [], true);
    expect(inspect()).toMatchObject({
      matches: false,
      reason: "public-state-mismatch",
      state: { allowedCategories: [], consent: "unset" },
    });
  });
  it("requires category equality, regardless of category order", () => {
    documentState("accepted", ["marketing", "analytics"], true);
    expect(inspect().matches).toBe(true);
    documentState("accepted", ["analytics"], true);
    expect(inspect().matches).toBe(false);
  });
});
it("withholds action timing across navigation without replacing missing observations with zero", () => {
  const measurements = navigationMeasurements([
    {
      key: "action.dismissed",
      method: "test",
      status: "measured",
      unit: "ms",
      value: 0,
    },
    {
      key: "initial.transfer",
      method: "test",
      status: "measured",
      unit: "bytes",
      value: 300,
    },
  ]);
  expect(measurements[0]).toMatchObject({
    reason: expect.stringContaining("new document"),
    status: "unavailable",
  });
  expect(measurements[0]).not.toHaveProperty("value");
  expect(measurements[1]).toMatchObject({ status: "measured", value: 300 });
});

it("does not report action completion while a blocking overlay remains after navigation", () => {
  documentState("accepted", expected.allowedCategories, true);
  Object.assign(window.__bench, {
    inspectAction: () => ({
      bannerVisible: false,
      blockingOverlay: true,
      preferencesVisible: false,
    }),
  });
  expect(
    inspectPublicState({
      expected,
      global: "__cookiebench",
      ready: "[data-ready]",
      requireDismissed: true,
    })
  ).toMatchObject({
    dismissed: false,
    matches: false,
    ready: true,
    reason: "consent-ui-not-dismissed",
  });
});

describe("explicit public-state restoration", () => {
  const inspectPublic = () =>
    inspectPublicState({
      expected,
      global: "__cookiebench",
      readinessSource: "public-state",
      ready: "[data-ready]",
    });
  it("accepts exact ready public state after its old DOM marker disappears", () => {
    documentState("accepted", expected.allowedCategories, true, false);
    expect(inspectPublic()).toMatchObject({
      matches: true,
      readinessSource: "public-state",
      ready: true,
    });
    expect(inspectPublic().selectorReady).toBeUndefined();
    expect(inspect().matches).toBe(false);
  });
  it("requires an explicit true readiness value and exact restored permissions", () => {
    documentState("accepted", expected.allowedCategories, false, true);
    expect(inspectPublic().ready).toBe(false);
    delete (window as unknown as { __cookiebench: { ready?: boolean } })
      .__cookiebench.ready;
    expect(inspectPublic().ready).toBe(false);
    documentState("accepted", ["analytics"], true, false);
    expect(inspectPublic()).toMatchObject({
      matches: false,
      ready: true,
      reason: "public-state-mismatch",
    });
    vi.stubGlobal("window", {});
    expect(inspectPublic()).toMatchObject({
      matches: false,
      ready: false,
      reason: "public-state-unavailable",
    });
  });
});

function captureHarness() {
  const documentListeners = new Map<string, EventListener>();
  const windowListeners = new Map<string, EventListener>();
  const queue: (() => void)[] = [];
  const published: string[] = [];
  const observations = {
    input: undefined as { at: number } | undefined,
    inputs: [] as unknown[],
  };
  const page = {
    __bench: { observations, stop: () => observations },
    __cookiebenchCapture: (payload: string) => published.push(payload),
    addEventListener: (name: string, listener: EventListener) =>
      windowListeners.set(name, listener),
    top: undefined as unknown,
  };
  page.top = page;
  vi.stubGlobal("window", page);
  vi.stubGlobal("document", {
    addEventListener: (name: string, listener: EventListener) =>
      documentListeners.set(name, listener),
  });
  vi.stubGlobal("performance", { now: () => 120, timeOrigin: 1000 });
  for (const name of [
    "requestAnimationFrame",
    "setTimeout",
    "requestIdleCallback",
  ]) {
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Scheduler fakes run queued browser callbacks in order.
    vi.stubGlobal(name, (callback: () => void) => queue.push(callback));
  }
  installNavigationCapture("__cookiebenchCapture");
  return {
    drain: () => {
      while (queue.length) {
        queue.shift()?.();
      }
    },
    input: () => {
      // The observer's earlier capture listener has already recorded the trusted input.
      observations.input = { at: 100 };
      documentListeners.get("pointerdown")?.({
        isTrusted: true,
      } as Event);
    },
    published,
    unload: () => windowListeners.get("beforeunload")?.({} as Event),
  };
}

describe("navigation input capture", () => {
  it("does no serialization or binding work inside the input handler", () => {
    const harness = captureHarness();
    const stringify = vi.spyOn(JSON, "stringify");
    harness.input();
    harness.input();
    expect(stringify).not.toHaveBeenCalled();
    expect(harness.published).toEqual([]);
    stringify.mockRestore();
    harness.drain();
    expect(harness.published.map((payload) => JSON.parse(payload))).toEqual([
      expect.objectContaining({
        observations: expect.objectContaining({ input: { at: 100 } }),
        reason: "input",
        timeOrigin: 1000,
      }),
    ]);
  });

  it("does not publish a stale input snapshot after unload evidence", () => {
    const harness = captureHarness();
    harness.input();
    harness.unload();
    harness.drain();
    expect(
      harness.published.map((payload) => JSON.parse(payload).reason)
    ).toEqual(["beforeunload"]);
  });
});
