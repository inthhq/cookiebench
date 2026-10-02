import { describe, expect, it } from "vitest";

import type { BrowserObservations } from "../src/browser-observer.ts";
import { measurementsFor } from "../src/measure.ts";
import { referenceFixture, referenceScenario } from "../src/reference.ts";

const pageMetrics = [
  "page.primary-content-paint",
  "page.lcp",
  "page.fcp",
  "page.ttfb",
  "page.cls",
];
const observations = (): BrowserObservations => ({
  events: [],
  frameIntervals: [],
  inputs: [],
  longTasks: [],
  observationEndedAt: 5245,
  observerCallbacks: 1,
  primaryContentPaintAt: 4868,
  stateHistory: [],
  supported: ["element", "largest-contentful-paint", "paint", "layout-shift"],
  vitals: {
    CLS: { entries: [{ startTime: 4900, value: 0.1 }], value: 0.1 },
    FCP: { entries: [{ startTime: 200 }], value: 200 },
    LCP: { entries: [{ startTime: 4868 }], value: 4868 },
    TTFB: { entries: [{ responseStart: 180 }], value: 180 },
  },
});

describe("page observations without a trusted action input", () => {
  it.each(["accept", "save"] as const)(
    "withholds page metrics for an unstarted %s and retains raw evidence and bounded network data",
    (action) => {
      const data = observations();
      const before = structuredClone(data);
      const metrics = measurementsFor(
        data,
        [],
        referenceScenario({ action, observationMs: 1500 }),
        referenceFixture()
      );
      for (const key of pageMetrics) {
        expect(metrics.find((metric) => metric.key === key)).toMatchObject({
          reason: expect.stringContaining("No trusted action input"),
          status: "unavailable",
        });
        expect(metrics.find((metric) => metric.key === key)).not.toHaveProperty(
          "value"
        );
      }
      expect(
        metrics.find((metric) => metric.key === "initial.transfer")
      ).toMatchObject({ status: "measured", value: 0 });
      expect(data).toEqual(before);
    }
  );

  it.each(["load", "accept"] as const)(
    "preserves page metrics for a bounded %s visit",
    (action) => {
      const data = observations();
      if (action === "accept") {
        data.input = {
          at: 4000,
          handlerObservedAt: 4001,
          target: "#accept",
          type: "pointerdown",
        };
      }
      data.deadlineAt = 5500;
      const metrics = measurementsFor(
        data,
        [],
        referenceScenario({
          action,
          observationMs: action === "load" ? 5500 : 1500,
        }),
        referenceFixture()
      );
      for (const key of pageMetrics) {
        expect(metrics.find((metric) => metric.key === key)?.status).toBe(
          "measured"
        );
      }
      expect(metrics.find((metric) => metric.key === "page.lcp")).toMatchObject(
        {
          status: "measured",
          value: 4868,
        }
      );
    }
  );
});

describe("right-censored LCP", () => {
  const load = referenceScenario({ action: "load", observationMs: 5000 });
  const lcp = (data: BrowserObservations) =>
    measurementsFor(data, [], load, referenceFixture()).find(
      (metric) => metric.key === "page.lcp"
    );

  it.each([
    [{ elementTiming: true, imageComplete: false, present: true }, "loading"],
    [{ elementTiming: true, imageComplete: true, present: true }, "paint"],
    [{ elementTiming: false, present: false }, "not in the document"],
  ])(
    "withholds an earlier text candidate when primary content is %o",
    (primaryContentAtCutoff, reason) => {
      const data = {
        ...observations(),
        lcpAttribution: { role: "other" as const, size: 900, tag: "P" },
        primaryContentAtCutoff,
        primaryContentPaintAt: undefined,
        vitals: { LCP: { entries: [], value: 3140 } },
      };
      expect(lcp(data)).toMatchObject({
        reason: expect.stringContaining(reason),
        status: "unavailable",
      });
    }
  );

  it("keeps LCP once the timed primary content painted by cutoff", () => {
    expect(
      lcp({
        ...observations(),
        primaryContentAtCutoff: {
          elementTiming: true,
          imageComplete: true,
          present: true,
        },
      })
    ).toMatchObject({ status: "measured", value: 4868 });
  });
});
