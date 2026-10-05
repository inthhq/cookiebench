import { describe, expect, it } from "vitest";

import { preferencesEntry } from "../src/scenario.ts";

const panel = "#ketch-preference-panel, #ketch-purposes-modal";

describe("preferences entry", () => {
  it("opens preferences through the declared control", () => {
    expect(
      preferencesEntry("save", {
        preferences: ".customize",
        preferencesPanel: panel,
      })
    ).toEqual({ open: ".customize" });
    expect(
      preferencesEntry("withdraw", {
        preferencesPanel: panel,
        reopen: "#reopen",
      })
    ).toEqual({ open: "#reopen" });
  });

  it("saves from a first layer that already is the preference center", () => {
    // Ketch's initial modal carries the purpose toggles and Save choices.
    expect(preferencesEntry("save", { preferencesPanel: panel })).toEqual({
      visible: panel,
    });
  });

  it("still needs a reopening control to withdraw", () => {
    expect(
      preferencesEntry("withdraw", { preferencesPanel: panel })
    ).toBeUndefined();
    expect(preferencesEntry("save", {})).toBeUndefined();
  });
});
