import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

// inth's Ultracite core is shared. Its private anti-slop plugin is not vendored.
export default defineConfig({
  extends: [core],
  ignorePatterns: [
    ...core.ignorePatterns,
    ".source-build/**",
    "artifacts/**",
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
  rules: {
    // Function declarations preserve readable helper order in deterministic analysis.
    "func-style": "off",
    // Effect schemas intentionally share names with their inferred TypeScript types.
    "no-redeclare": "off",
    "typescript/no-redeclare": "error",
  },
});
