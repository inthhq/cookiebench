import { describe, expect, it } from "vitest";

import { measured, missingRequiredMeasurements } from "../src/measure.ts";
import { classifyHostname, networkAtDeadline } from "../src/network.ts";
import { referenceScenario } from "../src/reference.ts";

it("requires load vitals only for load visits while retaining missing action metrics", () => {
  const metrics = [
    measured("page.lcp", "ms", undefined, "native"),
    measured("page.fcp", "ms", undefined, "native"),
    measured("page.cls", "score", undefined, "native"),
    measured("initial.transfer", "bytes", 100, "cdp"),
    measured("banner.visible", "ms", 20, "observer"),
  ];
  expect(
    missingRequiredMeasurements(metrics, referenceScenario({ action: "load" }))
  ).toHaveLength(3);
  expect(
    missingRequiredMeasurements(
      metrics,
      referenceScenario({ action: "withdraw" })
    )
  ).toEqual([]);
  expect(metrics[0].status).toBe("unavailable");
  const unavailableTransfer = [
    ...metrics,
    measured("initial.transfer", "bytes", undefined, "cdp"),
  ];
  expect(
    missingRequiredMeasurements(
      unavailableTransfer,
      referenceScenario({ action: "accept" })
    )
  ).toHaveLength(1);
});

describe("passive network attribution", () => {
  it("compares parsed hosts rather than substrings or URL paths", () => {
    const page = "https://shop.example/";
    expect(classifyHostname("https://shop.example/asset.js", page)).toBe(
      "first-party"
    );
    expect(
      classifyHostname("https://shop.example.evil.test/asset.js", page)
    ).toBe("third-party");
    expect(
      classifyHostname("https://vendor.test/shop.example/asset.js", page)
    ).toBe("third-party");
    expect(classifyHostname("https://cdn.shop.example/asset.js", page)).toBe(
      "third-party"
    );
    expect(classifyHostname("data:text/plain,shop.example", page)).toBe(
      "other"
    );
  });
  it("preserves measured zero and missing values separately", () => {
    expect(measured("initial.transfer", "bytes", 0, "test")).toMatchObject({
      status: "measured",
      value: 0,
    });
    expect(
      measured("initial.transfer", "bytes", undefined, "test")
    ).toMatchObject({ status: "unavailable" });
    expect(measured("page.lcp", "ms", Number.NaN, "test")).toMatchObject({
      status: "unavailable",
    });
  });
});

describe("input attribution", () => {
  it("does not substitute a later page interaction for a censored CMP input", async () => {
    const { interactionDuration } = await import("../src/measure.ts");
    const data = {
      events: [
        {
          duration: 80,
          interactionId: 7,
          name: "pointerdown",
          processingEnd: 170,
          processingStart: 160,
          startTime: 150,
        },
      ],
      frameIntervals: [],
      input: {
        at: 100,
        handlerObservedAt: 103,
        target: "#accept",
        type: "pointerdown",
      },
      inputs: [
        {
          at: 100,
          handlerObservedAt: 103,
          target: "#accept",
          type: "pointerdown",
        },
        {
          at: 150,
          handlerObservedAt: 160,
          target: "#page",
          type: "pointerdown",
        },
      ],
      longTasks: [],
      observerCallbacks: 1,
      stateHistory: [],
      supported: ["event"],
      vitals: {},
    };
    expect(interactionDuration(data)).toBeUndefined();
    expect(interactionDuration(data, "#page")).toBe(80);
  });
});

describe("fixed long-task windows", () => {
  it("includes blocking that began before the input and clips it at the window end", async () => {
    const { longTaskBlocking } = await import("../src/measure.ts");
    expect(longTaskBlocking([{ duration: 100, startTime: 50 }], 100, 200)).toBe(
      50
    );
    expect(longTaskBlocking([{ duration: 200, startTime: 50 }], 100, 180)).toBe(
      80
    );
    expect(longTaskBlocking([{ duration: 100, startTime: 200 }], 0, 200)).toBe(
      0
    );
  });
});

it("rejects a misspelled controlled reference variant", async () => {
  const { referenceFixture } = await import("../src/reference.ts");
  expect(() => referenceFixture({ variant: "corret" })).toThrow(
    /Unknown reference variant/u
  );
});

describe("actual-input network windows", () => {
  it("excludes late requests and completion bytes beyond the deadline", () => {
    const started = {
      finished: false,
      hostname: "shop.test",
      id: "request",
      party: "first-party" as const,
      phase: "initial" as const,
      resourceType: "Script",
      startedAt: 10,
      url: "https://shop.test/asset.js",
      wallTimeMs: 1000,
    };
    const revisions = [
      { at: 1000, request: started },
      { at: 1005, request: { ...started, encodedBodyBytes: 50 } },
      {
        at: 1010,
        request: {
          ...started,
          encodedBodyBytes: 100,
          finished: true,
          transferBytes: 200,
        },
      },
      { at: 1011, request: { ...started, id: "late", wallTimeMs: 1011 } },
    ];
    const cutoff = networkAtDeadline(revisions, 1007);
    expect(cutoff).toEqual([{ ...started, encodedBodyBytes: 50 }]);
    expect(networkAtDeadline(revisions, 1010)).toHaveLength(1);
    expect(networkAtDeadline(revisions, 1012)).toHaveLength(2);
  });
  it("keeps requests before dispatched input in the initial phase", async () => {
    const { partitionNetwork } = await import("../src/network.ts");
    const base = {
      finished: true,
      hostname: "shop.test",
      id: "request",
      party: "first-party" as const,
      phase: "initial" as const,
      resourceType: "Script",
      startedAt: 10,
      url: "https://shop.test/asset.js",
    };
    const requests = [
      { ...base, wallTimeMs: 1099.9 },
      { ...base, wallTimeMs: 1100 },
      { ...base, wallTimeMs: 1101 },
    ];
    expect(
      partitionNetwork(requests, 1100).map((request) => request.phase)
    ).toEqual(["initial", "deferred", "deferred"]);
    expect(
      partitionNetwork(requests).every((request) => request.phase === "initial")
    ).toBe(true);
    expect(requests.every((request) => request.phase === "initial")).toBe(true);
  });
});
