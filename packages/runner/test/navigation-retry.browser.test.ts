import { expect, test } from "@playwright/test";

import { acrossNavigation } from "../src/scenario.ts";

const url = "http://cookiebench.test/";

test("an evaluate destroyed by a consent reload is retried on the new document", async ({
  page,
}) => {
  await page.route(url, (route) =>
    route.fulfill({
      body: "<!doctype html><p>page</p>",
      contentType: "text/html",
    })
  );
  await page.goto(url);
  const initialOrigin = await page.evaluate(() => performance.timeOrigin);
  // Like settle(), the first evaluate is still waiting when the page reloads.
  const reloadDuringEvaluate = (reload: boolean) =>
    page.evaluate(async (shouldReload) => {
      if (shouldReload) {
        setTimeout(() => location.reload(), 10);
        // oxlint-disable-next-line promise/avoid-new -- Page code cannot import node:timers/promises.
        await new Promise((resolve) => {
          setTimeout(resolve, 2000);
        });
      }
      return performance.timeOrigin;
    }, reload);

  await expect(reloadDuringEvaluate(true)).rejects.toThrow(
    /Execution context was destroyed/u
  );
  await page.waitForLoadState("domcontentloaded");

  let calls = 0;
  const origin = await acrossNavigation(page, () => {
    calls += 1;
    return reloadDuringEvaluate(calls === 1);
  });
  expect(calls).toBeGreaterThan(1);
  expect(origin).not.toBe(initialOrigin);
});
