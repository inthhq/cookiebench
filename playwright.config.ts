import { defineConfig } from "@playwright/test";

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  retries: 0,
  testDir: "./packages/runner/test",
  testMatch: "**/*.browser.test.ts",
  timeout: 60_000,
  use: { browserName: "chromium", trace: "retain-on-failure" },
  workers: 1,
});
