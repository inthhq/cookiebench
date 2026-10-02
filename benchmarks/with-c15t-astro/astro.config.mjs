import { fileURLToPath } from "node:url";

import node from "@astrojs/node";
import svelte from "@astrojs/svelte";
import c15t, { hosted } from "@c15t/astro";
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
          clientEntrypoint: fileURLToPath(
            new URL("src/consent-client.ts", import.meta.url)
          ),
          consentCategories: ["necessary", "measurement", "marketing"],
          mode: hosted({ url: "http://127.0.0.1:4315/api/consent" }),
          ui: "svelte",
        }),
      ],
  outDir: baseline ? "./dist-baseline" : "./dist",
  output: "server",
  srcDir: baseline ? "./baseline" : "./src",
});
