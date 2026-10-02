import { execFileSync, spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const directory = path.join(root, "benchmarks/with-c15t-script");
const origin = "http://127.0.0.1:4318";
let server: ChildProcess | undefined;

test.beforeAll(async () => {
  test.setTimeout(180_000);
  execFileSync("pnpm", ["build"], { cwd: directory, stdio: "pipe" });
  server = spawn(
    process.execPath,
    [
      "packages/fixture-support/src/serve.ts",
      "--port",
      "4318",
      "--static",
      path.join(directory, "dist"),
    ],
    { cwd: root, stdio: "ignore" }
  );
  await expect
    .poll(async () => {
      try {
        const response = await fetch(`${origin}/health`);
        return response.ok;
      } catch {
        return false;
      }
    })
    .toBe(true);
});

test.afterAll(async () => {
  if (server && server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill("SIGTERM");
    await exited;
  }
});

const entries = [
  { name: "script", route: "/", stalled: /\/vendor\/c15t\.js$/u },
  {
    name: "headless",
    route: "/headless.html",
    stalled: /\/assets\/headless-[^/]+\.js$/u,
  },
  {
    name: "baseline",
    route: "/baseline.html",
    stalled: /\/assets\/baseline-[^/]+\.js$/u,
  },
];

for (const entry of entries) {
  test(`${entry.name} article renders before its JavaScript loads`, async ({
    page,
  }) => {
    const gate = Promise.withResolvers<boolean>();
    const intercepted = Promise.withResolvers<boolean>();
    await page.route(entry.stalled, async (route) => {
      intercepted.resolve(true);
      await gate.promise;
      await route.continue();
    });
    try {
      await page.goto(`${origin}${entry.route}`, { waitUntil: "commit" });
      await intercepted.promise;
      await expect(
        page.getByRole("heading", { name: "A quieter corner of the city" })
      ).toBeVisible();
      await expect(page.locator("#primary-content")).toBeVisible();
      await expect(page.locator("body")).toHaveCSS("margin", "0px");
      await expect(page.locator("html")).toHaveCSS(
        "background-color",
        "rgb(247, 247, 241)"
      );
      await expect(page.locator("html")).not.toHaveAttribute(
        "data-consent-ready",
        "true"
      );
    } finally {
      gate.resolve(true);
      await page.unrouteAll({ behavior: "wait" });
    }
    await page.waitForLoadState();
    await page.getByRole("button", { exact: true, name: "Save story" }).click();
    await expect(page.locator("#page-result")).toHaveText(
      "Reading list updated"
    );
  });
}
