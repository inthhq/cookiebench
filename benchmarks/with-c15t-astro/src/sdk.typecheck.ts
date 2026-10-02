import type { AstroConsentClient } from "@c15t/astro/client";

export function typeContract(client: AstroConsentClient) {
  void client.save({ marketing: false, measurement: true });
  // @ts-expect-error Invalid action payloads must fail consumer compilation.
  void client.save("invented-action");
  // @ts-expect-error Permission values must be boolean.
  void client.save({ measurement: "yes" });
  // @ts-expect-error Unknown category names must fail consumer compilation.
  void client.save({ inventedCategory: true });
}
