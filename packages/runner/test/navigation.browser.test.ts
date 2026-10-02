import { expect, test } from "@playwright/test";

import { installObserver } from "../src/browser-observer.ts";
import {
  captureDocuments,
  installNavigationCapture,
  waitForFixtureReady,
  waitForPublicState,
} from "../src/navigation.ts";
import { referenceFixture } from "../src/reference.ts";

const { adapter } = referenceFixture();
const expected = {
  allowedCategories: ["analytics", "marketing"],
  consent: "accepted",
};

test("restoration waits beyond the consent label for public resolution and exact effective categories", async ({
  page,
}) => {
  await page.setContent("<main>Restoring</main>");
  await page.evaluate(() => {
    Object.assign(window, {
      __cookiebench: {
        allowedCategories: [],
        consent: "accepted",
        ready: false,
        scripts: [],
      },
    });
    setTimeout(() => {
      Object.assign(window, {
        __cookiebench: {
          allowedCategories: ["analytics", "marketing"],
          consent: "accepted",
          ready: true,
          scripts: [],
        },
      });
      document.documentElement.dataset.ready = "true";
    }, 150);
  });
  const evidence = await waitForPublicState(page, adapter, expected, 2000);
  expect(evidence.matches).toBe(true);
  expect(evidence.state?.allowedCategories).toEqual(expected.allowedCategories);
});

test("a real lost choice and a resolution that never becomes ready remain failures", async ({
  page,
}) => {
  await page.setContent("<main>Lost choice</main>");
  await page.evaluate(() => {
    Object.assign(window, {
      __cookiebench: {
        allowedCategories: [],
        consent: "unset",
        ready: true,
        scripts: [],
      },
    });
    document.documentElement.dataset.ready = "true";
  });
  expect(await waitForPublicState(page, adapter, expected, 100)).toMatchObject({
    matches: false,
    ready: true,
    reason: "public-state-mismatch",
    state: { consent: "unset" },
  });
  await page.evaluate(() => {
    Object.assign(window, {
      __cookiebench: {
        allowedCategories: ["analytics", "marketing"],
        consent: "accepted",
        ready: false,
        scripts: [],
      },
    });
  });
  expect(await waitForPublicState(page, adapter, expected, 100)).toMatchObject({
    matches: false,
    ready: false,
    reason: "public-state-not-ready",
  });
});

test("trusted withdrawal input survives a document reload in host evidence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const session = await page.context().newCDPSession(page);
  const captured = await captureDocuments(session, "captureNavigation");
  await page.addInitScript({
    content: `(${installObserver.toString()})(${JSON.stringify({ banner: "#banner", categories: ["analytics"], maxDurationMs: 5000, pageAction: "#page-action", stateGlobal: "__cookiebench" })});\n(${installNavigationCapture.toString()})("captureNavigation");`,
  });
  await page.route("https://navigation.test/", (route) =>
    route.fulfill({
      body: `<html data-ready="true"><button id="withdraw">Withdraw</button><button id="page-action">Page action</button><script>
      window.__cookiebench = { consent: sessionStorage.withdrawn ? 'rejected' : 'accepted', allowedCategories: sessionStorage.withdrawn ? [] : ['analytics'], ready: true, scripts: [] };
      document.querySelector('#withdraw').onclick = () => { sessionStorage.withdrawn = 'true'; setTimeout(() => location.reload(), 250); };
      document.querySelector('#page-action').onclick = () => { window.__cookiebench.pageActionAt = performance.now(); };
    </script></html>`,
      contentType: "text/html",
    })
  );
  await page.goto("https://navigation.test/");
  const originalOrigin = await page.evaluate(() => {
    window.__bench.arm("#withdraw", "withdraw");
    return performance.timeOrigin;
  });
  await page.locator("#withdraw").click({ noWaitAfter: true });
  await page.locator("#page-action").click();
  await page.waitForFunction(
    (origin) =>
      performance.timeOrigin !== origin &&
      (window as unknown as { __cookiebench?: { consent: string } })
        .__cookiebench?.consent === "rejected",
    originalOrigin
  );
  const result = await waitForPublicState(
    page,
    adapter,
    { allowedCategories: [], consent: "rejected" },
    1000
  );
  expect(result.matches).toBe(true);
  expect(captured.some((entry) => entry.reason === "beforeunload")).toBe(true);
  expect(
    captured.findLast((entry) => entry.timeOrigin === originalOrigin)
      ?.observations.state?.pageActionAt
  ).toEqual(expect.any(Number));
  expect(result.state?.pageActionAt).toBeUndefined();
  expect(errors).toEqual([]);
  expect(captured[0]?.timeOrigin).toBe(originalOrigin);
  expect(captured[0]?.observations.input).toMatchObject({
    target: "#withdraw",
    type: "pointerdown",
  });
  expect(
    await page.evaluate(() => window.__bench.observations.input)
  ).toBeUndefined();
});

test("public-state readiness survives marker removal for dispatch, observation and restoration", async ({
  page,
}) => {
  const publicAdapter = {
    ...adapter,
    readinessSource: "public-state" as const,
  };
  await page.addInitScript({
    content: `(${installObserver.toString()})(${JSON.stringify({ ...publicAdapter, categories: ["analytics", "marketing"], maxDurationMs: 5000 })});`,
  });
  await page.route("https://public-readiness.test/", (route) =>
    route.fulfill({
      body: `<html data-ready="true"><button id="accept">Accept</button><script>
      window.__cookiebench = { consent: sessionStorage.accepted ? 'accepted' : 'unset', allowedCategories: sessionStorage.accepted ? ['analytics','marketing'] : [], ready: false, scripts: [] };
      document.querySelector('#accept').onclick = () => { sessionStorage.accepted = 'true'; Object.assign(window.__cookiebench, { consent: 'accepted', allowedCategories: ['analytics','marketing'] }); };
      setTimeout(() => { document.documentElement.removeAttribute('data-ready'); window.__cookiebench.ready = true; }, 120);
    </script></html>`,
      contentType: "text/html",
    })
  );
  await page.goto("https://public-readiness.test/");
  await waitForFixtureReady(page, publicAdapter, 2000);
  await page.waitForFunction(
    () => window.__bench.observations.readyAt !== undefined
  );
  await page.evaluate(() => window.__bench.arm("#accept", "accept"));
  await page.locator("#accept").click();
  const first = await page.evaluate(() => ({
    input: window.__bench.observations.input,
    marker: Object.hasOwn(document.documentElement.dataset, "ready"),
    readinessSource: window.__bench.observations.readinessSource,
    readyAt: window.__bench.observations.readyAt,
  }));
  expect(first.marker).toBe(false);
  expect(first.readinessSource).toBe("public-state");
  expect(first.readyAt).toBeLessThanOrEqual(first.input?.at ?? -1);
  await page.reload();
  await waitForFixtureReady(page, publicAdapter, 2000);
  const restored = await waitForPublicState(
    page,
    publicAdapter,
    expected,
    2000
  );
  expect(restored).toMatchObject({
    matches: true,
    readinessSource: "public-state",
    ready: true,
  });
  expect(restored.selectorReady).toBeUndefined();
  expect(await waitForPublicState(page, adapter, expected, 100)).toMatchObject({
    matches: false,
    selectorReady: false,
  });
});

test("a present DOM marker cannot satisfy public-state readiness before the bridge is ready", async ({
  page,
}) => {
  await page.setContent('<html data-ready="true"><main>Pending</main></html>');
  await page.evaluate(() =>
    Object.assign(window, {
      __cookiebench: {
        allowedCategories: ["analytics", "marketing"],
        consent: "accepted",
        ready: false,
        scripts: [],
      },
    })
  );
  const publicAdapter = {
    ...adapter,
    readinessSource: "public-state" as const,
  };
  await expect(waitForFixtureReady(page, publicAdapter, 100)).rejects.toThrow(
    /Timeout/u
  );
  expect(
    await waitForPublicState(page, publicAdapter, expected, 100)
  ).toMatchObject({ matches: false, ready: false });
  await page.evaluate(() => {
    delete (window as unknown as { __cookiebench: { ready?: boolean } })
      .__cookiebench.ready;
  });
  await expect(waitForFixtureReady(page, publicAdapter, 100)).rejects.toThrow(
    /Timeout/u
  );
  await waitForFixtureReady(page, adapter, 100);
});
