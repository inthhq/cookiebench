import { describe, expect, it } from "vitest";

import { ketchSnapshot, normalizeCompetitorState } from "./competitor-state.ts";

describe("public competitor consent snapshots", () => {
  it("keeps fresh SDK defaults distinct from a saved rejection", () => {
    const permissions = { marketing: false, measurement: false };
    expect(
      normalizeCompetitorState({ explicit: false, permissions }).consent
    ).toBe("unset");
    expect(
      normalizeCompetitorState({ explicit: true, permissions }).consent
    ).toBe("rejected");
  });
  it("retains effective grants before explicit consent so strict-policy leaks remain observable", () => {
    expect(
      normalizeCompetitorState({
        explicit: false,
        permissions: { marketing: true, measurement: true },
      })
    ).toEqual({
      allowedCategories: ["marketing", "measurement"],
      consent: "unset",
    });
  });
  it("maps granular native permission to only the declared workload category", () => {
    expect(
      normalizeCompetitorState({
        explicit: true,
        permissions: { marketing: false, measurement: true },
      })
    ).toEqual({ allowedCategories: ["measurement"], consent: "custom" });
  });
  it("revokes effective categories without carrying forward an earlier acceptance", () => {
    expect(
      normalizeCompetitorState({
        explicit: true,
        permissions: { marketing: true, measurement: true },
      }).consent
    ).toBe("accepted");
    expect(
      normalizeCompetitorState({
        explicit: true,
        permissions: { marketing: false, measurement: false },
      })
    ).toEqual({ allowedCategories: [], consent: "rejected" });
  });
});

describe("Ketch public snapshots", () => {
  it("does not treat fresh legal-basis defaults as a choice", () => {
    expect(
      ketchSnapshot({
        purposes: { coreprodserv: true },
        source: { coreprodserv: "legalBasisDefault" },
      }).explicit
    ).toBe(false);
  });
  it("recognizes restored acceptance and rejection without source metadata", () => {
    for (const allowed of [true, false]) {
      const snapshot = ketchSnapshot({
        purposes: { bizsiteanalytics: allowed, persads: allowed },
      });
      expect(normalizeCompetitorState(snapshot).consent).toBe(
        allowed ? "accepted" : "rejected"
      );
    }
  });
  it("does not infer restored consent from an incomplete purpose list", () => {
    expect(
      ketchSnapshot({ purposes: { bizsiteanalytics: true } }).explicit
    ).toBe(false);
  });
});
