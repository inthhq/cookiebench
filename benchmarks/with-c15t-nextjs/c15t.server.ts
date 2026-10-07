import type { ConsentManifestOptions } from "c15t/next/server";

import { consentManifest } from "./c15t-manifest.ts";
import { consentConfig } from "./c15t.config.ts";

export const consentOptions = {
  config: consentConfig,
  manifest: consentManifest,
} satisfies ConsentManifestOptions;
