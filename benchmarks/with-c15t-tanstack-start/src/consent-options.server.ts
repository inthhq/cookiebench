import type { ConsentManifestOptions } from "@c15t/tanstack-start/server";

import { consentManifest } from "./c15t-manifest";
import { backendURL } from "./consent-backend";

export const consentOptions = {
  backendURL,
  manifest: consentManifest,
} satisfies ConsentManifestOptions;
