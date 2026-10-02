import type { ConsentClient } from "@c15t/browser/headless";
// Compiled as a consumer contract. This declaration is never loaded in a page.
export function typeContract(client: ConsentClient) {
  client.has("measurement");
  void client.save({ marketing: false, measurement: true });
  // @ts-expect-error Invalid category names must stay a compile error.
  client.has("invented-category");
  // @ts-expect-error Consent payloads accept booleans, not strings.
  void client.save({ measurement: "yes" });
}
