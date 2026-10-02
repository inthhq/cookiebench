import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.browser.test.ts"],
    include: ["packages/**/*.test.ts"],
  },
});
