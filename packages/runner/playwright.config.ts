import { defineConfig } from "@playwright/test";

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  reporter: "list",
  retries: 0,
  testDir: "./test",
  testMatch: "**/*.browser.test.ts",
  timeout: 60_000,
  use: { headless: true },
  workers: 1,
});
