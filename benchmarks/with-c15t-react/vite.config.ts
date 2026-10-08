import react from "@vitejs/plugin-react";
import { consentManifest } from "c15t/build";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      input: { baseline: "baseline.html", cmp: "index.html" },
    },
  },
  plugins: [
    react(),
    // Downloads the policy and writes src/c15t-manifest.ts, as the React
    // quickstart does.
    consentManifest({ backendURL: "https://benchmarks-inth.inth.app" }),
  ],
});
