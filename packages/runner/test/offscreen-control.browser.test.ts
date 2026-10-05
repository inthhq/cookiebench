import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { act } from "../src/scenario.ts";

const url = "http://cookiebench.test/";

// Like Enzuzo's mobile banner: a fixed control created below the viewport.
const banner = (script: string) => `<!doctype html>
<style>
  #banner { position: fixed; bottom: 0; left: 0; right: 0; transform: translateY(300px); transition: transform 800ms linear; }
  #banner.shown { transform: none; }
</style>
<div id="banner"><button id="accept">Accept</button></div>
<script>
  document.querySelector("#accept").addEventListener("click", () => {
    window.clicked = true;
  });
  ${script}
</script>`;

async function open(page: Page, body: string) {
  await page.setViewportSize({ height: 400, width: 400 });
  await page.route(url, (route) =>
    route.fulfill({ body, contentType: "text/html" })
  );
  await page.goto(url);
}

const clicked = (page: Page) =>
  page.evaluate(() => (window as { clicked?: boolean }).clicked === true);

test("a forced click waits for a sliding control to reach the screen", async ({
  page,
}) => {
  const slidesIn =
    banner(`requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelector("#banner").classList.add("shown");
  }));`);
  await open(page, slidesIn);
  await expect(
    page
      .locator("#accept")
      .click({ force: true, noWaitAfter: true, timeout: 1000 })
  ).rejects.toThrow(/Element is outside of the viewport/u);

  await page.goto(url);
  await act(page, "#accept", "pointer", false, 2000);
  expect(await clicked(page)).toBe(true);
});

test("a control that never reaches the screen still fails at the deadline", async ({
  page,
}) => {
  await open(page, banner(""));
  const started = Date.now();
  await expect(act(page, "#accept", "pointer", false, 300)).rejects.toThrow(
    /Element is outside of the viewport/u
  );
  expect(Date.now() - started).toBeGreaterThanOrEqual(300);
  expect(await clicked(page)).toBe(false);
});
