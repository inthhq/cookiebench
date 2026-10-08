import { describe, expect, it } from "vitest";

import {
  measured,
  measurementsFor,
  missingRequiredMeasurements,
} from "../src/measure.ts";
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

describe("per-request byte consistency", () => {
  const row = {
    finished: true,
    hostname: "shop.test",
    id: "request",
    party: "first-party" as const,
    phase: "initial" as const,
    resourceType: "Script",
    startedAt: 10,
    status: 200,
    url: "https://shop.test/asset.js",
    wallTimeMs: 1000,
  };
  it("accepts a tiny compressed body whose transfer exceeds its decoded size", async () => {
    const { byteInconsistencies } = await import("../src/network.ts");
    expect(
      byteInconsistencies({
        ...row,
        contentEncoding: "gzip",
        decodedBodyBytes: 2,
        encodedBodyBytes: 22,
        transferBytes: 300,
      })
    ).toEqual([]);
  });
  it("rejects identity bodies whose decoded size differs from the encoded body", async () => {
    const { byteInconsistencies } = await import("../src/network.ts");
    // The Nuxt rel=prefetch shape: network bytes arrived, decoded dataLength stayed 0.
    expect(
      byteInconsistencies({
        ...row,
        decodedBodyBytes: 0,
        encodedBodyBytes: 3016,
        transferBytes: 3402,
      })
    ).toEqual([
      "identity-encoded decoded body 0 B differs from encoded body 3016 B",
    ]);
    expect(
      byteInconsistencies({
        ...row,
        contentEncoding: "br",
        encodedBodyBytes: 500,
        transferBytes: 400,
      })
    ).toEqual(["transfer 400 B is smaller than encoded body 500 B"]);
    expect(byteInconsistencies({ ...row, transferBytes: 0 })).toEqual([
      "uncached response reported zero transfer bytes",
    ]);
    expect(
      byteInconsistencies({ ...row, fromCache: true, transferBytes: 0 })
    ).toEqual([]);
    // Chromium reports CORS preflight exchanges with zero encodedDataLength.
    expect(
      byteInconsistencies({
        ...row,
        method: "OPTIONS",
        preflight: true,
        transferBytes: 0,
      })
    ).toEqual([]);
  });
  it("withholds every phase byte total when one request is inconsistent", async () => {
    const reference = await import("../src/reference.ts");
    const metrics = measurementsFor(
      {
        events: [],
        frameIntervals: [],
        inputs: [],
        longTasks: [],
        observerCallbacks: 0,
        stateHistory: [],
        supported: [],
        vitals: {},
      },
      [
        {
          ...row,
          byteInconsistencies: [
            "transfer 400 B is smaller than encoded body 500 B",
          ],
          decodedBodyBytes: 900,
          encodedBodyBytes: 500,
          transferBytes: 400,
        },
      ],
      referenceScenario({ action: "load" }),
      reference.referenceFixture()
    );
    for (const key of ["transfer", "encoded-body", "decoded-body"]) {
      expect(
        metrics.find((metric) => metric.key === `initial.${key}`)
      ).toMatchObject({
        reason: expect.stringContaining("smaller than encoded body"),
        status: "unavailable",
      });
    }
  });
});

async function initialTransfer(rows: Parameters<typeof measurementsFor>[1]) {
  const reference = await import("../src/reference.ts");
  return measurementsFor(
    {
      events: [],
      frameIntervals: [],
      inputs: [],
      longTasks: [],
      observerCallbacks: 0,
      stateHistory: [],
      supported: [],
      vitals: {},
    },
    rows,
    referenceScenario({ action: "load" }),
    reference.referenceFixture()
  ).find((metric) => metric.key === "initial.transfer");
}

describe("byte totals with incomplete exchanges", () => {
  const base = {
    hostname: "shop.test",
    party: "first-party" as const,
    phase: "initial" as const,
    resourceType: "Fetch",
    startedAt: 10,
    url: "https://shop.test/api",
    wallTimeMs: 1000,
  };
  const done = {
    ...base,
    decodedBodyBytes: 10,
    encodedBodyBytes: 10,
    finished: true,
    id: "done",
    status: 200,
    transferBytes: 200,
  };
  it("counts a request with no response by the cutoff as zero bytes", async () => {
    expect(
      await initialTransfer([
        done,
        {
          ...base,
          decodedBodyBytes: 0,
          encodedBodyBytes: 0,
          finished: false,
          id: "pending",
          noResponse: "pending-at-cutoff",
          transferBytes: 0,
        },
      ])
    ).toMatchObject({ status: "measured", value: 200 });
  });
  it("counts an exchange the page cancelled after its response began", async () => {
    expect(
      await initialTransfer([
        done,
        {
          ...base,
          cancelledAfterResponse: true,
          decodedBodyBytes: 0,
          encodedBodyBytes: 0,
          failed: "net::ERR_ABORTED",
          finished: true,
          id: "consent",
          status: 201,
          transferBytes: 74,
        },
      ])
    ).toMatchObject({ status: "measured", value: 274 });
  });
  it("withholds totals while a started response is incomplete", async () => {
    expect(
      await initialTransfer([
        done,
        {
          ...base,
          decodedBodyBytes: 40,
          finished: false,
          id: "partial",
          status: 200,
        },
      ])
    ).toMatchObject({ status: "unavailable" });
  });
  it("requires an incomplete initial total from an action visit only when no response was still arriving", async () => {
    const reference = await import("../src/reference.ts");
    const required = (
      action: "load" | "accept",
      row: Parameters<typeof measurementsFor>[1][number]
    ) => {
      const scenario = referenceScenario({ action });
      const metrics = measurementsFor(
        {
          events: [],
          frameIntervals: [],
          inputs: [],
          longTasks: [],
          observerCallbacks: 0,
          stateHistory: [],
          supported: [],
          vitals: {},
        },
        [done, row],
        scenario,
        reference.referenceFixture()
      );
      return missingRequiredMeasurements(metrics, scenario)
        .map((metric) => metric.key)
        .includes("initial.transfer");
    };
    // The hero image was still downloading when an early banner took the click.
    const arriving = {
      ...base,
      decodedBodyBytes: 40,
      finished: false,
      id: "hero",
      status: 200,
    };
    expect(required("accept", arriving)).toBe(false);
    expect(required("load", arriving)).toBe(true);
    expect(
      required("accept", {
        ...arriving,
        failed: "net::ERR_CONNECTION_RESET",
        finished: true,
      })
    ).toBe(true);
    expect(
      required("accept", {
        ...done,
        id: "unmeasured",
        transferBytes: undefined,
      })
    ).toBe(true);
  });
});
