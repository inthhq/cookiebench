import { consentManifest } from "@c15t/tanstack-start/build";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { backendURL } from "./src/consent-backend";

export default defineConfig({
  plugins: [
    consentManifest({
      backendURL,
      importSource: "@c15t/tanstack-start/static",
    }),
    tanstackStart(),
    react(),
  ],
});
