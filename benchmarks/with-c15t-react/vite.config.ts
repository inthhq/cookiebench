import react from "@vitejs/plugin-react";
import { consentManifest } from "c15t/build";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

// consentManifest adds its /init prefetch to every HTML entry. The baseline
// page has no consent manager, so it must not send /init.
const baselineWithoutPrefetch = (): Plugin => ({
  name: "baseline-without-prefetch",
  transformIndexHtml: {
    handler: (html, { filename }) =>
      filename.endsWith("baseline.html")
        ? html.replace(
            /<script id="c15t-initial-data-prefetch">[\s\S]*?<\/script>/u,
            ""
          )
        : html,
    order: "post",
  },
});

export default defineConfig({
  build: {
    rolldownOptions: {
      input: { baseline: "baseline.html", cmp: "index.html" },
    },
  },
  plugins: [
    react(),
    // Hands the backend URL to hosted() through c15t/generated and adds the
    // inline /init prefetch to index.html, as the React quickstart does.
    consentManifest({ backendURL: "https://benchmarks-inth.inth.app" }),
    baselineWithoutPrefetch(),
  ],
});
