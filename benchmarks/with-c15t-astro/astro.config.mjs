import { fileURLToPath } from "node:url";

import node from "@astrojs/node";
import svelte from "@astrojs/svelte";
import c15t from "@c15t/astro";
import { defineConfig } from "astro/config";

const baseline = process.env.COOKIEBENCH_BASELINE === "1";
export default defineConfig({
  adapter: node({ mode: "standalone" }),
  base: baseline ? "/baseline" : "/",
  integrations: baseline
    ? []
    : [
        svelte(),
        c15t({
          // The default manifest() mode bundles the backend's policy at build
          // time and resolves each visitor on the server.
          backendURL: "https://benchmarks-inth.inth.app",
          clientEntrypoint: fileURLToPath(
            new URL("src/consent-client.ts", import.meta.url)
          ),
          consentCategories: ["necessary", "measurement", "marketing"],
          ui: "svelte",
        }),
      ],
  outDir: baseline ? "./dist-baseline" : "./dist",
  output: "server",
  srcDir: baseline ? "./baseline" : "./src",
});
