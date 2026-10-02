import type { Sample } from "@cookiebench/schema";
import { describe, expect, it } from "vitest";

import { sampleCorrectness, summarizeCorrectness } from "./correctness.ts";

const sample: Sample = {
  attempt: 1,
  diagnostics: { correctnessChecksCompleted: true },
  failures: [],
  fixtureId: "fixture",
  id: "22222222-2222-4222-8222-222222222222",
  iteration: 0,
  measurements: [],
  runId: "11111111-1111-4111-8111-111111111111",
  scenarioId: "accept",
  status: "passed",
};
const unavailable: Sample = {
  ...sample,
  failures: [
    {
      code: "required-measurement-unavailable",
      message: "initial.transfer unavailable",
    },
  ],
  status: "incomplete",
};

describe("consent correctness and measurement availability", () => {
  it("requires positive evidence and retains verified checks when only observations are missing", () => {
    expect(summarizeCorrectness([sample, unavailable])).toEqual({
      attempts: 2,
      failed: 0,
      reasons: [],
      unknown: 0,
      verified: 2,
    });
    expect(sampleCorrectness({ ...sample, diagnostics: {} }).status).toBe(
      "unknown"
    );
    expect(
      sampleCorrectness({
        ...unavailable,
        diagnostics: { correctnessChecksCompleted: false },
      }).status
    ).toBe("unknown");
    expect(sampleCorrectness({ ...unavailable, failures: [] }).status).toBe(
      "unknown"
    );
  });
  it.each([
    "unsupported-action",
    "visitor-preparation",
    "sample-browser",
    "state-unavailable",
    "server-evidence-unavailable",
    "restoration-not-ready",
    "observation-window-exceeded",
    "unrecognized-failure",
  ])("does not infer verified correctness from %s", (code) => {
    const result = sampleCorrectness({
      ...unavailable,
      failures: [{ code, message: "Evidence missing" }],
    });
    expect(result.status).toBe("unknown");
    expect(result.reasons.join(" ")).toContain(code);
  });
  it("retains actual assertion failures even when other correctness evidence is unavailable", () => {
    const failed: Sample = {
      ...unavailable,
      diagnostics: {},
      failures: [
        ...unavailable.failures,
        { code: "state-unavailable", message: "Some state absent" },
        {
          code: "forbidden-server-egress",
          message: "Marketing request before consent",
        },
      ],
    };
    expect(summarizeCorrectness([failed])).toMatchObject({
      attempts: 1,
      failed: 1,
      unknown: 0,
      verified: 0,
    });
    expect(sampleCorrectness(failed).reasons.join(" ")).toContain(
      "forbidden-server-egress"
    );
  });
  it("requires the separate followup check completion and includes followup assertion failures", () => {
    const combined: Sample = {
      ...unavailable,
      diagnostics: {
        correctnessChecksCompleted: true,
        followupProbe: { diagnostics: { correctnessChecksCompleted: true } },
      },
      failures: [
        {
          code: "followup:required-measurement-unavailable",
          message: "Timing absent",
        },
      ],
    };
    expect(sampleCorrectness(combined).status).toBe("verified");
    expect(
      sampleCorrectness({
        ...combined,
        diagnostics: { correctnessChecksCompleted: true, followupProbe: {} },
      }).status
    ).toBe("unknown");
    expect(
      sampleCorrectness({
        ...combined,
        failures: [
          ...combined.failures,
          { code: "followup:choice-lost-on-reload", message: "Choice lost" },
        ],
      }).status
    ).toBe("failed");
  });
  it("does not turn an unclassified raw failure into verified correctness", () => {
    expect(sampleCorrectness({ ...unavailable, status: "failed" }).status).toBe(
      "unknown"
    );
  });
});
