import { withConsentManifest } from "c15t/next/build";
import type { NextConfig } from "next";

import { backendURL } from "./c15t.config.ts";

const config: NextConfig = {
  transpilePackages: ["@cookiebench/fixture-support"],
};
// The build bundles the backend's policy manifest, so the server resolves
// each visitor without a runtime manifest or /init request.
export default withConsentManifest(config, {
  backendURL,
  rootDir: import.meta.dirname,
});
