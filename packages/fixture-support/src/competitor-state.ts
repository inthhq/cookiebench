export type ControlledCategory = "measurement" | "marketing";
export interface CompetitorSnapshot {
  explicit: boolean;
  permissions: Record<ControlledCategory, boolean>;
}

/** Permission truth comes from SDK data, independently of whether a choice exists. */
export function normalizeCompetitorState(snapshot: CompetitorSnapshot) {
  const allowedCategories = Object.entries(snapshot.permissions)
    .filter(([, allowed]) => allowed)
    .map(([category]) => category);
  let consent: "unset" | "accepted" | "rejected" | "custom" = "unset";
  if (snapshot.explicit) {
    consent = "custom";
    if (allowedCategories.length === 2) {
      consent = "accepted";
    } else if (allowedCategories.length === 0) {
      consent = "rejected";
    }
  }
  return { allowedCategories, consent };
}

/** Ketch omits source on restored consent, while fresh legal defaults carry a source. */
export function ketchSnapshot(value: {
  purposes?: Record<string, boolean>;
  source?: Record<string, string>;
}): CompetitorSnapshot {
  const sources = [value.source?.bizsiteanalytics, value.source?.persads];
  const restoredChoice =
    value.source === undefined &&
    ["bizsiteanalytics", "persads"].every((purpose) =>
      Object.hasOwn(value.purposes ?? {}, purpose)
    );
  return {
    explicit:
      restoredChoice ||
      sources.some(
        (source) => source !== undefined && source !== "legalBasisDefault"
      ),
    permissions: {
      marketing: value.purposes?.persads === true,
      measurement: value.purposes?.bizsiteanalytics === true,
    },
  };
}
