import type { useSaveConsents } from "c15t/react";

export function typeContract(save: ReturnType<typeof useSaveConsents>) {
  void save({ marketing: false, measurement: true });
  // @ts-expect-error Invalid action payloads must stay a compile error.
  void save("invented-action");
  // @ts-expect-error Consent values must be booleans.
  void save({ measurement: "yes" });
}
