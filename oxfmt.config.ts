import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    ".source-build/**",
    "artifacts/**",
    // Generated workload bytes are hashed by the adjacent asset manifest.
    "packages/fixture-support/assets/reading-list.json",
    // Preserve the pinned Chrome benchmark workload for source comparison.
    "packages/runner/src/vendor/chrome-devtools-benchmark.ts",
    "**/.next/**",
    "**/.output/**",
    "**/.output-baseline/**",
    "**/.nuxt/**",
    "**/.nuxt-baseline/**",
    "**/.astro/**",
    "**/dist-baseline/**",
    "**/public/vendor/**",
    "**/dist/**",
    "test-results/**",
    "playwright-report/**",
  ],
});
