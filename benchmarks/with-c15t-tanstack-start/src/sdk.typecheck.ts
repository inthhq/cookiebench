import type { useSaveConsents } from "@c15t/tanstack-start";

export function verifyConsentTypes(save: ReturnType<typeof useSaveConsents>) {
  void save({ marketing: false, measurement: true });
  // @ts-expect-error The public API must reject invalid action names.
  void save("invented-action");
  // @ts-expect-error The public API must reject non-boolean category values.
  void save({ measurement: "yes" });
}
