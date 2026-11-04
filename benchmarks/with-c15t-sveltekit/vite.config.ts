import node from "@sveltejs/adapter-node";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

// One app, two builds, as the Astro fixture does. The baseline build has its
// own routes, no server hooks and no Vite plugin from c15t, so no c15t module
// reaches its server or client graph. The proxy sends /baseline* to it.
const baseline = process.env.COOKIEBENCH_BASELINE === "1";

const plugins = baseline
  ? []
  : [
      // Downloads the policy manifest from the backend during `vite build`
      // and resolves each visitor on the server from it.
      (await import("@c15t/svelte/vite")).consentManifest({
        backendURL: "https://benchmarks-inth.inth.app",
      }),
    ];

export default defineConfig({
  plugins: [
    ...plugins,
    sveltekit({
      adapter: node({ out: baseline ? "build-baseline" : "build" }),
      files: baseline ? { appTemplate: "src/app.html", src: "baseline" } : {},
      paths: { base: baseline ? "/baseline" : "" },
    }),
  ],
});
