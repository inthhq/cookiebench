/* oxlint-disable typescript/no-non-null-assertion -- Assertions deliberately fail when required samples, diagnostics or metric rows are absent. */
import type { ResultEnvelope, Sample } from "@cookiebench/schema";
import { expect, test } from "@playwright/test";
import { Effect } from "effect";

import type { BrowserObservations } from "../src/browser-observer.ts";
import {
  runBenchmarkPromise,
  referenceFixture,
  referenceRunConfig,
  referenceScenario,
  desktopProfile,
} from "../src/index.ts";
import type { NetworkRequest } from "../src/network.ts";
import { runInstrumentationOverhead } from "../src/overhead.ts";

const port = 43_127;
const metric = (sample: Sample, key: string) =>
  sample.measurements.find((measurement) => measurement.key === key)!;
function run(
  variant: string,
  overrides: Parameters<typeof referenceScenario>[0] = {}
) {
  return runBenchmarkPromise({
    ...referenceRunConfig({ port, variant }),
    scenarios: [referenceScenario(overrides)],
  });
}
function sampleOf(result: ResultEnvelope) {
  expect(result.samples).toHaveLength(1);
  return result.samples[0]!;
}

test("native metrics, raw bytes, external hosts, consent and reload persistence", async () => {
  const result = await run("correct");
  const sample = sampleOf(result);
  expect(sample.failures).toEqual([]);
  expect(result.status).toBe("passed");
  for (const key of [
    "banner.visible",
    "page.lcp",
    "page.fcp",
    "page.cls",
    "action.dismissed",
    "action.scripts-complete",
    "action.local-persisted",
    "action.remote-persisted",
  ]) {
    expect(metric(sample, key).status, key).toBe("measured");
  }
  expect(metric(sample, "initial.transfer")).toMatchObject({
    status: "measured",
    unit: "bytes",
    value: expect.any(Number),
  });
  const rows = sample.diagnostics!.requests as NetworkRequest[];
  const payload = rows.find((row) => row.url.endsWith("/payload.js"))!;
  expect(payload.party).toBe("third-party");
  expect(payload.decodedBodyBytes).toBeGreaterThan(16_000);
  expect(payload.transferBytes).toBeGreaterThan(100);
  expect(payload.transferBytes).toBeLessThan(2000);
  expect(payload.decodedBodySha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(sample.diagnostics!.persistenceVerified).toBe(true);
  expect(sample.diagnostics!.browserErrors).toEqual([]);
});
for (const variant of ["hidden", "missing"]) {
  test(`${variant} banner fails rather than becoming a fast zero`, async () => {
    const sample = sampleOf(
      await run(variant, {
        action: "load",
        actionDeadlineMs: 300,
        observationMs: 300,
      })
    );
    expect(sample.status).toBe("failed");
    expect(sample.failures.map((failure) => failure.code)).toContain(
      "banner-missing"
    );
    expect(metric(sample, "banner.visible").status).toBe("unavailable");
    expect(metric(sample, "page.lab-inp").status).toBe("unavailable");
    const observations = sample.diagnostics!
      .observations as BrowserObservations;
    expect(Math.max(...observations.frameIntervals)).toBeLessThan(100);
  });
}
test("delayed banner is observed and open shadow DOM controls work", async () => {
  const delayed = sampleOf(await run("delayed"));
  expect(delayed.status).toBe("passed");
  expect(metric(delayed, "banner.visible")).toMatchObject({
    status: "measured",
    value: expect.any(Number),
  });
  const visible = metric(delayed, "banner.visible");
  if (visible.status === "measured") {
    expect(visible.value).toBeGreaterThanOrEqual(140);
  }
  const shadow = sampleOf(await run("shadow"));
  expect(shadow.status).toBe("passed");
});
test("load observations exclude a banner that appears after the fixed window", async () => {
  const result = await runBenchmarkPromise({
    ...referenceRunConfig({ port }),
    fixtures: [
      referenceFixture({ port, query: { delayMs: "800" }, variant: "delayed" }),
    ],
    scenarios: [
      referenceScenario({
        action: "load",
        actionDeadlineMs: 1500,
        observationMs: 300,
      }),
    ],
  });
  const sample = sampleOf(result);
  expect(sample.status).toBe("failed");
  expect(sample.failures.map((failure) => failure.code)).toContain(
    "banner-missing"
  );
  expect(metric(sample, "banner.visible").status).toBe("unavailable");
  expect(
    (sample.diagnostics!.observations as BrowserObservations).observationEndedAt
  ).toBeLessThanOrEqual(300);
});

test("first early click exposes hydration gap; ready click succeeds", async () => {
  const early = sampleOf(await run("hydration-delay", { readiness: "early" }));
  expect(early.status).toBe("failed");
  expect(early.failures.map((failure) => failure.code)).toContain(
    "first-input-failed"
  );
  expect(
    (early.diagnostics!.observations as BrowserObservations).inputs.filter(
      (input) => input.target === "#accept"
    )
  ).toHaveLength(1);
  const ready = sampleOf(await run("hydration-delay", { readiness: "ready" }));
  expect(ready.status).toBe("passed");
});
test("visible but noninteractive controls fail declared readiness", async () => {
  const sample = sampleOf(
    await run("noninteractive", { actionDeadlineMs: 300 })
  );
  expect(sample.failures.map((failure) => failure.code)).toContain(
    "controls-not-ready"
  );
});
test("forbidden scripts fail both execution and server-confirmed egress checks", async () => {
  const sample = sampleOf(await run("leak", { action: "reject" }));
  expect(sample.status).toBe("failed");
  expect(sample.failures.map((failure) => failure.code)).toContain(
    "forbidden-script-execution"
  );
  expect(sample.failures.map((failure) => failure.code)).toContain(
    "forbidden-server-egress"
  );
});
test("duplicates and failed backend acknowledgements remain failures", async () => {
  const duplicate = sampleOf(await run("duplicate"));
  expect(duplicate.failures.map((failure) => failure.code)).toContain(
    "duplicate-script-execution"
  );
  const backend = sampleOf(await run("backend-error"));
  expect(backend.failures.map((failure) => failure.code)).toContain(
    "backend-persistence-failed"
  );
  expect(metric(backend, "action.remote-persisted").status).toBe("unavailable");
});
test("a declared unavailable server evidence endpoint makes the attempt incomplete", async () => {
  const fixture = referenceFixture({ port });
  const result = await runBenchmarkPromise({
    ...referenceRunConfig({ port }),
    fixtures: [
      {
        ...fixture,
        adapter: {
          ...fixture.adapter,
          serverEventsUrl: `http://127.0.0.1:${port}/missing-evidence`,
        },
      },
    ],
    scenarios: [referenceScenario({ action: "load" })],
  });
  const sample = sampleOf(result);
  expect(sample.status).toBe("incomplete");
  expect(sample.failures.map((failure) => failure.code)).toContain(
    "server-evidence-unavailable"
  );
  expect(result.capabilities[0]?.status).toBe("unknown");
});
test("fresh accept, reject, granular save and keyboard are isolated and repeatable", async () => {
  const scenarios = [
    referenceScenario({ action: "accept", id: "accept" }),
    referenceScenario({ action: "reject", id: "reject", input: "keyboard" }),
    referenceScenario({ action: "save", id: "save" }),
    referenceScenario({ action: "preferences", id: "preferences" }),
  ];
  const result = await runBenchmarkPromise({
    fixtures: [referenceFixture({ port })],
    iterations: 2,
    profile: desktopProfile,
    scenarios,
    seed: 17,
  });
  expect(result.samples.map((sample) => sample.failures)).toEqual(
    Array.from({ length: 8 }, () => [])
  );
  for (const sample of result.samples) {
    expect(metric(sample, "banner.visible").status).toBe("measured");
    expect(
      (sample.diagnostics!.observations as BrowserObservations).stateHistory[0]
        ?.consent
    ).toBe("unset");
  }
});
test("returning consent and cache are independent, withdrawal preserves earlier execution evidence", async () => {
  const scenarios = [
    referenceScenario({
      action: "load",
      cache: "cold",
      expectedBanner: false,
      id: "accepted-cold",
      visitor: "returning-accepted",
    }),
    referenceScenario({
      action: "load",
      cache: "warm",
      expectedBanner: false,
      id: "accepted-warm",
      visitor: "returning-accepted",
    }),
    referenceScenario({
      action: "load",
      cache: "cold",
      expectedBanner: false,
      id: "rejected-cold",
      visitor: "returning-rejected",
    }),
    referenceScenario({
      action: "withdraw",
      expectedBanner: false,
      id: "withdraw",
      visitor: "returning-accepted",
    }),
  ];
  const result = await runBenchmarkPromise({
    ...referenceRunConfig({ port }),
    scenarios,
  });
  expect(
    result.samples.map((sample) => ({
      failures: sample.failures,
      id: sample.scenarioId,
    }))
  ).toEqual(scenarios.map((scenario) => ({ failures: [], id: scenario.id })));
  const warm = result.samples[1]!;
  const rows = warm.diagnostics!.requests as NetworkRequest[];
  expect(rows.some((row) => row.fromCache)).toBe(true);
  const cold = result.samples[0]!.diagnostics!.requests as NetworkRequest[];
  expect(cold.some((row) => row.fromCache)).toBe(false);
});
test("returning preparation allows asynchronous local persistence before reload", async () => {
  const result = await run("delayed-local-persistence", {
    action: "withdraw",
    expectedBanner: false,
    followupOffsetMs: 400,
    observationMs: 500,
    visitor: "returning-accepted",
  });
  const sample = sampleOf(result);
  expect(sample.failures).toEqual([]);
  expect(sample.status).toBe("passed");
  const observations = sample.diagnostics!.observations as BrowserObservations;
  expect(observations.stateHistory[0]?.consent).toBe("accepted");
});

test("cancellation releases the browser, process tree and measurement lock", async () => {
  const controller = new AbortController();
  const running = runBenchmarkPromise(
    {
      ...referenceRunConfig({ port }),
      scenarios: [referenceScenario({ action: "load", observationMs: 15_000 })],
    },
    { signal: controller.signal }
  );
  setTimeout(() => controller.abort(), 500);
  await expect(running).rejects.toBeDefined();
  await expect(fetch(`http://127.0.0.1:${port}/health`)).rejects.toBeDefined();
  const completed = await run("correct");
  expect(completed.status).toBe("passed");
});

test("paired baseline runs load-only with shared action scenarios and stable methods", async () => {
  const result = await runBenchmarkPromise({
    ...referenceRunConfig({ port }),
    fixtures: [
      referenceFixture({ port, variant: "baseline" }),
      referenceFixture({ port }),
    ],
    iterations: 2,
  });
  expect(result.status).toBe("passed");
  expect(
    result.capabilities.every(
      (check) => check.fixtureId !== "reference-baseline"
    )
  ).toBe(true);
  const baseline = result.samples.filter(
    (sample) => sample.fixtureId === "reference-baseline"
  );
  expect(baseline).toHaveLength(2);
  for (const sample of baseline) {
    expect(metric(sample, "banner.visible").status).toBe("unavailable");
    expect(metric(sample, "action.dismissed").status).toBe("unavailable");
    expect(metric(sample, "page.lcp").status).toBe("measured");
  }
  expect(
    new Set(
      result.samples.map(
        (sample) => metric(sample, "initial.long-task-blocking").method
      )
    ).size
  ).toBe(1);
  for (const sample of result.samples.filter(
    (row) => row.fixtureId === "reference-correct"
  )) {
    expect(
      (sample.diagnostics!.observations as BrowserObservations).inputs
    ).toHaveLength(1);
    const probe = sample.diagnostics!.followupProbe as Sample;
    expect(
      (probe.diagnostics!.observations as BrowserObservations).inputs
    ).toHaveLength(2);
  }
});

test("save dismissal waits for the preferences dialog exit after the banner is gone", async () => {
  const sample = sampleOf(await run("animated-dialog", { action: "save" }));
  expect(sample.failures).toEqual([]);
  const dismissal = metric(sample, "action.dismissed");
  expect(dismissal.status).toBe("measured");
  if (dismissal.status === "measured") {
    expect(dismissal.value).toBeGreaterThanOrEqual(240);
  }
});

test("a transparent overlay remains blocking until it stops intercepting input", async () => {
  const sample = sampleOf(
    await run("transparent-overlay", { followupOffsetMs: 400 })
  );
  expect(sample.failures).toEqual([]);
  const dismissal = metric(sample, "action.dismissed");
  expect(dismissal.status).toBe("measured");
  if (dismissal.status === "measured") {
    expect(dismissal.value).toBeGreaterThanOrEqual(240);
  }
});

test("completion verified after cutoff is separate evidence and timed dismissal stays unavailable", async () => {
  const fixture = referenceFixture({ port, variant: "transparent-overlay" });
  const adapter = { ...fixture.adapter };
  delete adapter.pageAction;
  const sample = sampleOf(
    await runBenchmarkPromise({
      ...referenceRunConfig({ port }),
      fixtures: [{ ...fixture, adapter }],
      scenarios: [referenceScenario({ observationMs: 100 })],
    })
  );
  expect(sample.status).toBe("incomplete");
  expect(sample.failures.map((failure) => failure.code)).toContain(
    "observation-window-exceeded"
  );
  expect(sample.failures.map((failure) => failure.code)).not.toContain(
    "first-input-failed"
  );
  expect(metric(sample, "action.dismissed").status).toBe("unavailable");
  const observed = sample.diagnostics!.observations as BrowserObservations;
  expect(observed.dismissedAt).toBeUndefined();
  const late = sample.diagnostics!.lateActionObservation as {
    complete: boolean;
    observedAt: number;
    deadlineAt: number;
    bannerVisible: boolean;
    blockingOverlay: boolean;
    consent: string;
  };
  expect(late).toMatchObject({
    bannerVisible: false,
    blockingOverlay: false,
    complete: true,
    consent: "accepted",
  });
  expect(late.observedAt).toBeGreaterThan(late.deadlineAt);
  expect(observed.observationEndedAt).toBe(late.deadlineAt);
  expect(sample.diagnostics!.followupProbe).toBeUndefined();
});

test("late consent and server requests remain separate from the bounded permission snapshot", async () => {
  const fixture = referenceFixture({ port, query: { consentDelayMs: "250" } });
  const adapter = { ...fixture.adapter };
  delete adapter.pageAction;
  const sample = sampleOf(
    await runBenchmarkPromise({
      ...referenceRunConfig({ port }),
      fixtures: [{ ...fixture, adapter }],
      scenarios: [referenceScenario({ observationMs: 100 })],
    })
  );
  expect(sample.status).toBe("incomplete");
  const codes = sample.failures.map((failure) => failure.code);
  expect(codes).toContain("observation-window-exceeded");
  expect(codes).not.toContain("forbidden-server-egress");
  expect(codes).not.toContain("choice-lost-on-reload");
  expect(metric(sample, "action.consent-effective").status).toBe("unavailable");
  const observed = sample.diagnostics!.observations as BrowserObservations;
  expect(observed.state?.consent).toBe("unset");
  expect(observed.state?.scripts).toEqual([]);
  expect(sample.diagnostics!.lateActionObservation).toMatchObject({
    complete: true,
    consent: "accepted",
  });
  const events = sample.diagnostics!.serverEvents as {
    type: string;
    timestamp: number;
  }[];
  expect(
    events.some(
      (event) =>
        event.type === "script" &&
        event.timestamp >
          Number(sample.diagnostics!.timeOrigin) +
            Number(sample.diagnostics!.measurementWindowEnd)
    )
  ).toBe(true);
});

test("computed CSS overrides a hidden attribute when the banner still paints", async () => {
  const sample = sampleOf(
    await run("css-hidden-override", { action: "load", expectedBanner: false })
  );
  expect(sample.failures.map((failure) => failure.code)).toContain(
    "unexpected-banner"
  );
  expect(metric(sample, "banner.visible").status).toBe("measured");
});
test("declared draft choices commit once and prepare returning visitors through the same UI", async () => {
  const fixture = referenceFixture({ port, variant: "draft-selection" });
  const result = await runBenchmarkPromise({
    ...referenceRunConfig({ port }),
    fixtures: [
      {
        ...fixture,
        adapter: {
          ...fixture.adapter,
          accept: "#save",
          acceptPreparation: ["#accept"],
          reject: "#save",
          rejectPreparation: ["#reject"],
        },
      },
    ],
    scenarios: [
      referenceScenario(),
      referenceScenario({ action: "reject", id: "reject" }),
      referenceScenario({
        action: "load",
        expectedBanner: false,
        id: "returning",
        visitor: "returning-accepted",
      }),
    ],
  });
  expect(result.samples.map((sample) => sample.failures)).toEqual([[], [], []]);
  expect(result.samples[0]?.diagnostics?.choicePreparation).toHaveLength(1);
  expect(
    (result.samples[0]!.diagnostics!.observations as BrowserObservations).inputs
  ).toHaveLength(1);
});
test("instrumentation audit retains paired identical-page evidence and excluded warmups", async () => {
  const result = await Effect.runPromise(
    runInstrumentationOverhead({
      ...referenceRunConfig({ port, variant: "baseline" }),
      iterations: 2,
      scenarios: [
        referenceScenario({
          action: "load",
          expectedBanner: false,
          id: "load",
          observationMs: 500,
        }),
      ],
      warmups: 1,
    })
  );
  expect(result.status).toBe("passed");
  expect(result.samples).toHaveLength(4);
  expect(result.fixtures[0]?.url).toBe(result.fixtures[1]?.url);
  expect(result.samples[0]?.diagnostics?.excludedWarmupAttempts).toHaveLength(
    2
  );
  for (const sample of result.samples) {
    expect(metric(sample, "custom.audit.task-duration").status).toBe(
      "measured"
    );
    expect(metric(sample, "custom.audit.lcp").status).toBe("measured");
    if (sample.diagnostics?.arm === "minimal") {
      expect(sample.diagnostics?.observations).toBeUndefined();
    } else {
      expect(
        (sample.diagnostics!.observations as BrowserObservations)
          .observerCallbacks
      ).toBeGreaterThan(0);
    }
  }
});

test("granular save can prepare native buttons before its single final commit", async () => {
  const fixture = referenceFixture({ port, variant: "button-category" });
  const result = await runBenchmarkPromise({
    ...referenceRunConfig({ port }),
    fixtures: [
      {
        ...fixture,
        adapter: {
          ...fixture.adapter,
          categoryToggle: "#select-analytics",
          savePreparation: ["#select-analytics"],
        },
      },
    ],
    scenarios: [
      referenceScenario({ action: "save", id: "save" }),
      referenceScenario({
        action: "save",
        id: "save-early",
        readiness: "early",
      }),
    ],
  });
  const sample = result.samples.find((value) => value.scenarioId === "save")!;
  const early = result.samples.find(
    (value) => value.scenarioId === "save-early"
  )!;
  expect(early.diagnostics?.commitPreparation).toBeUndefined();
  expect(early.failures.map((failure) => failure.code)).toContain(
    "first-input-failed"
  );
  expect(sample.failures).toEqual([]);
  expect(sample.diagnostics?.choicePreparation).toHaveLength(1);
  expect(sample.diagnostics?.commitPreparation).toMatchObject({
    method: "actionability-trial-no-input",
    selector: "#save",
  });
  expect(
    (sample.diagnostics!.observations as BrowserObservations).inputs
  ).toHaveLength(1);
});
