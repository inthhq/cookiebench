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
    backendURL: "https://benchmarks-inth.inth.app",
    // Embeds the backend's manifest at build time and serves it from the server.
    buildManifest: true,
    consentCategories: ["necessary", "measurement", "marketing"],
  },
  compatibilityDate: "2026-09-27",
  modules: baseline ? [] : ["@c15t/vue"],
  nitro: { output: { dir: baseline ? ".output-baseline" : ".output" } },
});
