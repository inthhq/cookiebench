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
    consentCategories: ["necessary", "measurement", "marketing"],
    // buildManifest: true is the documented default, but Nitro 2.13 rewrites
    // the snapshot's null fields to "" and every policy then fails to parse.
    // The server fetches and caches the manifest at runtime instead.
    manifest: "server",
  },
  compatibilityDate: "2026-09-27",
  modules: baseline ? [] : ["@c15t/vue"],
  nitro: { output: { dir: baseline ? ".output-baseline" : ".output" } },
});
