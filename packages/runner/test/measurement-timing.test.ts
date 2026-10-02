/* oxlint-disable max-classes-per-file, typescript/no-extraneous-class, class-methods-use-this, promise/prefer-await-to-callbacks -- Minimal browser API fakes exercise actual observer behavior without a DOM dependency. */
import { afterEach, expect, test, vi } from "vitest";

import { installObserver, installVitals } from "../src/browser-observer.ts";
import type { BrowserObservations } from "../src/browser-observer.ts";
import { interactionDuration, longTaskBlocking } from "../src/measure.ts";

afterEach(() => vi.unstubAllGlobals());

function observerHarness(
  options: { supported?: string[]; deadline?: number } = {}
) {
  let now = 80;
  let frame: FrameRequestCallback | undefined;
  const listeners = new Map<string, EventListener>();
  const queues = new Map<string, PerformanceEntry[]>();
  const control = {
    getBoundingClientRect: () => ({
      bottom: 20,
      height: 20,
      left: 0,
      right: 20,
      top: 0,
      width: 20,
    }),
    getRootNode: () => ({}),
    isConnected: true,
    parentElement: null,
  };
  const browser = {
    __cookiebench: {
      allowedCategories: [] as string[],
      consent: "unset",
      scripts: [],
    },
    top: undefined as unknown,
  };
  browser.top = browser;
  vi.stubGlobal("window", browser);
  vi.stubGlobal("ShadowRoot", class {});
  vi.stubGlobal("innerWidth", 100);
  vi.stubGlobal("innerHeight", 100);
  vi.stubGlobal("getComputedStyle", () => ({ opacity: "1" }));
  vi.stubGlobal("performance", { now: () => now });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frame = callback;
  });
  vi.stubGlobal("document", {
    addEventListener: (name: string, listener: EventListener) =>
      listeners.set(name, listener),
    querySelector: (selector: string) =>
      selector === "#accept" ? control : null,
    querySelectorAll: () => [],
  });
  vi.stubGlobal(
    "PerformanceObserver",
    class {
      static supportedEntryTypes = options.supported ?? [];
      type = "";
      observe({ type }: { type: string }) {
        this.type = type;
        queues.set(type, []);
      }
      takeRecords() {
        const entries = queues.get(this.type) ?? [];
        queues.set(this.type, []);
        return entries;
      }
      disconnect() {}
    }
  );
  vi.stubGlobal("setTimeout", () => 0);
  installObserver({
    banner: "#banner",
    categories: ["analytics"],
    fixedDeadlineMs: options.deadline,
    maxDurationMs: 1000,
    stateGlobal: "__cookiebench",
  });
  window.__bench.arm("#accept", "accept");
  return {
    browser,
    input: (type: string, at: number) => {
      now = at + 1;
      listeners.get(type)?.({
        composedPath: () => [control],
        isTrusted: true,
        timeStamp: at,
        type,
      } as unknown as Event);
    },
    queue: (type: string, entries: Record<string, unknown>[]) =>
      queues
        .get(type)
        ?.push(
          ...entries.map(
            (entry) =>
              ({ ...entry, toJSON: () => entry }) as unknown as PerformanceEntry
          )
        ),
    stop: (at: number) => {
      now = at;
      return window.__bench.stop();
    },
    tick: (at: number, observedAt: number) => {
      now = observedAt;
      frame?.(at);
    },
  };
}

test("post-input milestones use observation time, never the older frame timestamp", () => {
  const harness = observerHarness();
  harness.input("pointerdown", 100);
  harness.browser.__cookiebench = {
    allowedCategories: ["analytics"],
    consent: "accepted",
    scripts: [],
  };
  harness.tick(90, 110);
  expect(window.__bench.observations.effectiveAt).toBe(110);
  expect(window.__bench.observations.dismissedAt).toBe(110);
});

test("related keyup identifies a reportable interaction when keydown was censored", () => {
  const input = {
    at: 100,
    handlerObservedAt: 101,
    target: "#accept",
    type: "keydown",
  };
  const data = {
    events: [
      {
        duration: 80,
        interactionId: 7,
        name: "keyup",
        processingEnd: 130,
        processingStart: 121,
        startTime: 120,
      },
    ],
    input,
    inputEvents: [input, { ...input, at: 120, type: "keyup" }],
    inputs: [input],
  } as unknown as BrowserObservations;
  expect(interactionDuration(data)).toBe(80);
  expect(
    interactionDuration({
      ...data,
      inputEvents: [input],
    } as BrowserObservations)
  ).toBeUndefined();
});

test("long-task blocking clips the unresponsive tail to either interval boundary", () => {
  const tasks = [
    { duration: 100, startTime: 0 },
    { duration: 100, startTime: 180 },
  ];
  expect(longTaskBlocking(tasks, 75, 250)).toBe(45);
  expect(longTaskBlocking(tasks, 110, 170)).toBe(0);
});

test("native queue draining admits in-window paint and CLS entries despite late delivery", () => {
  const harness = observerHarness({
    deadline: 2000,
    supported: ["paint", "largest-contentful-paint", "layout-shift", "element"],
  });
  harness.queue("paint", [{ name: "first-contentful-paint", startTime: 24 }]);
  harness.queue("largest-contentful-paint", [
    { size: 100, startTime: 1800 },
    { size: 200, startTime: 2010 },
  ]);
  harness.queue("layout-shift", [
    { hadRecentInput: false, startTime: 100, value: 0.1 },
    { hadRecentInput: false, startTime: 400, value: 0.1 },
    { hadRecentInput: true, startTime: 500, value: 0.9 },
    { hadRecentInput: false, startTime: 1500, value: 0.15 },
    { hadRecentInput: false, startTime: 2010, value: 0.9 },
  ]);
  harness.queue("element", [
    { identifier: "primary-content", renderTime: 1800, startTime: 1800 },
  ]);
  const data = harness.stop(2050);
  expect(data.vitals.FCP?.value).toBe(24);
  expect(data.vitals.LCP?.value).toBe(1800);
  expect(data.vitals.CLS?.value).toBe(0.2);
  expect(data.primaryContentPaintAt).toBe(1800);
  expect(data.observationEndedAt).toBe(2000);
});

test("CLS starts a new session at an exact one-second gap", () => {
  const harness = observerHarness({
    deadline: 3000,
    supported: ["paint", "layout-shift"],
  });
  harness.queue("paint", [{ name: "first-contentful-paint", startTime: 24 }]);
  harness.queue("layout-shift", [
    { hadRecentInput: false, startTime: 100, value: 0.2 },
    { hadRecentInput: false, startTime: 1100, value: 0.3 },
  ]);
  expect(harness.stop(3000).vitals.CLS?.value).toBe(0.3);
});

test("stop captures timestamped markers after the last frame without importing late permissions", () => {
  const harness = observerHarness({ deadline: 100 });
  harness.tick(80, 80);
  Object.assign(harness.browser.__cookiebench, {
    allowedCategories: ["analytics"],
    consent: "accepted",
    persistedAt: 99,
    scripts: [
      { at: 99, category: "analytics", id: "before" },
      { at: 101, category: "analytics", id: "after" },
    ],
  });
  const data = harness.stop(110);
  expect(data.state?.scripts.map((script) => script.id)).toEqual(["before"]);
  expect(data.persistedAt).toBe(99);
  expect(data.state?.consent).toBe("unset");
  expect(data.state?.allowedCategories).toEqual([]);
});

test("diagnostic vitals do not install in child documents or without the main observer", () => {
  vi.stubGlobal("window", { top: {} });
  expect(() => installVitals()).not.toThrow();
  const main = { top: undefined as unknown };
  main.top = main;
  vi.stubGlobal("window", main);
  expect(() => installVitals()).not.toThrow();
});
