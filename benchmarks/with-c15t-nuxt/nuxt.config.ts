import { fileURLToPath } from "node:url";

const baseline = process.env.COOKIEBENCH_BASELINE === "1";
export default defineNuxtConfig({
  alias: {
    "#fixture-app": fileURLToPath(
      new URL(
        baseline ? "./app/baseline.vue" : "./app/consent.vue",
        import.meta.url
      )
    ),
  },
  app: { baseURL: baseline ? "/baseline/" : "/" },
  buildDir: baseline ? ".nuxt-baseline" : ".nuxt",
  c15t: {
    // The default manifest() mode bundles the backend's policy at build time
    // and resolves each visitor on the server.
    backendURL: "https://benchmarks-inth.inth.app",
    consentCategories: ["necessary", "measurement", "marketing"],
  },
  compatibilityDate: "2026-09-27",
  modules: baseline ? [] : ["@c15t/vue"],
  nitro: { output: { dir: baseline ? ".output-baseline" : ".output" } },
});
