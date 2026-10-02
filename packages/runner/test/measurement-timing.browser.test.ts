/* oxlint-disable promise/prefer-await-to-callbacks, promise/avoid-new -- Browser callback interception deliberately supplies stale frame timestamps and schedules paints around the cutoff. */
import { expect, test } from "@playwright/test";

import { installObserver } from "../src/browser-observer.ts";
import type { BrowserObservations } from "../src/browser-observer.ts";
import { longTaskBlocking, measurementsFor } from "../src/measure.ts";
import { referenceFixture, referenceScenario } from "../src/reference.ts";

test("trusted action endpoints follow input even when the frame timestamp is older", async ({
  page,
}) => {
  await page.setContent(
    '<div id="banner"><button id="accept">Accept</button></div>'
  );
  await page.evaluate(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) =>
      raf((at) => callback(at - 1000));
    Object.assign(window, {
      __cookiebench: { allowedCategories: [], consent: "unset", scripts: [] },
    });
    document.querySelector("#accept")?.addEventListener("click", () => {
      Object.assign(window, {
        __cookiebench: {
          allowedCategories: ["analytics"],
          consent: "accepted",
          scripts: [],
        },
      });
      document.querySelector("#banner")?.setAttribute("style", "display:none");
    });
  });
  await page.evaluate(installObserver, {
    banner: "#banner",
    categories: ["analytics"],
    maxDurationMs: 30_000,
    stateGlobal: "__cookiebench",
  });
  await page.evaluate(() => {
    window.__bench.arm("#accept", "accept");
    document
      .querySelector("#accept")
      ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  });
  expect(
    await page.evaluate(() => window.__bench.observations.input)
  ).toBeUndefined();
  await page.locator("#accept").click();
  await page.waitForFunction(
    () => window.__bench.observations.effectiveAt !== undefined
  );
  const data = await page.evaluate(() => window.__bench.stop());
  expect(data.effectiveAt).toBeGreaterThanOrEqual(data.input?.at ?? Infinity);
  expect(data.dismissedAt).toBeGreaterThanOrEqual(data.input?.at ?? Infinity);
  expect(data.inputEvents?.map((event) => event.type)).toEqual([
    "pointerdown",
    "pointerup",
    "click",
  ]);
});

test("action deadline freezes DOM state and exposes only in-window milestones", async ({
  page,
}) => {
  await page.setContent(
    '<div id="banner"><button id="accept">Accept</button></div>'
  );
  await page.evaluate(() => {
    Object.assign(window, {
      __cookiebench: { allowedCategories: [], consent: "unset", scripts: [] },
    });
    document.querySelector("#accept")?.addEventListener("click", () => {
      setTimeout(() => {
        Object.assign(window, {
          __cookiebench: {
            allowedCategories: ["analytics"],
            consent: "accepted",
            scripts: [],
          },
        });
        document
          .querySelector("#banner")
          ?.setAttribute("style", "display:none");
      }, 150);
    });
  });
  await page.evaluate(installObserver, {
    actionObservationMs: 50,
    banner: "#banner",
    categories: ["analytics"],
    maxDurationMs: 30_000,
    stateGlobal: "__cookiebench",
  });
  await page.evaluate(() => window.__bench.arm("#accept", "accept"));
  await page.locator("#accept").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#banner")?.getAttribute("style") ===
      "display:none"
  );
  const data = await page.evaluate(() => window.__bench.stop());
  expect(data.observationEndedAt).toBe((data.input?.at ?? Number.NaN) + 50);
  expect(data.effectiveAt).toBeUndefined();
  expect(data.dismissedAt).toBeUndefined();
  expect(data.state?.consent).toBe("unset");
});

test("a completed task crossing cutoff drains as a native longtask and clips to the window", async ({
  page,
}) => {
  await page.setContent("<main>Task boundary</main>");
  const deadline = await page.evaluate(() => performance.now() + 250);
  await page.evaluate(installObserver, {
    banner: "#banner",
    categories: [],
    fixedDeadlineMs: deadline,
    maxDurationMs: 30_000,
    stateGlobal: "__cookiebench",
  });
  await page.evaluate((cutoff) => {
    setTimeout(
      () => {
        const until = performance.now() + 250;
        while (performance.now() < until) {
          /* Deliberate uninterrupted renderer task. */
        }
      },
      Math.max(0, cutoff - 150 - performance.now())
    );
  }, deadline);
  await page.waitForFunction(
    () => window.__bench.observations.observationEndedAt !== undefined
  );
  const data = await page.evaluate(() => window.__bench.stop());
  const crossing = data.longTasks.find(
    (task) =>
      task.startTime < deadline && task.startTime + task.duration > deadline
  );
  expect(crossing).toBeDefined();
  if (!crossing) {
    throw new Error("Missing native long task across the declared cutoff");
  }
  expect(longTaskBlocking([crossing], 0, deadline)).toBeCloseTo(
    deadline - crossing.startTime - 50,
    3
  );
  expect(data.observationEndedAt).toBe(deadline);
});

test("an earlier text LCP is withheld while the primary image is still loading at cutoff", async ({
  page,
}) => {
  await page.route("https://cookiebench.test/hero.png", () => {
    /* Leave the primary image request in flight past the cutoff. */
  });
  await page.setContent(
    '<p style="font-size:32px">An article paragraph that paints first</p><img id="hero" width="600" height="400" elementtiming="primary-content" src="https://cookiebench.test/hero.png">',
    { waitUntil: "domcontentloaded" }
  );
  const deadline = await page.evaluate(() => performance.now() + 300);
  await page.evaluate(installObserver, {
    banner: "#banner",
    categories: [],
    fixedDeadlineMs: deadline,
    maxDurationMs: 30_000,
    primaryContent: "#hero",
    stateGlobal: "__cookiebench",
  });
  await page.waitForFunction(
    () => window.__bench.observations.observationEndedAt !== undefined
  );
  const data = await page.evaluate(() => window.__bench.stop());
  expect(data.vitals.LCP?.value).toBeLessThanOrEqual(deadline);
  expect(data.lcpAttribution?.tag).toBe("P");
  expect(data.primaryContentAtCutoff).toEqual({
    elementTiming: true,
    imageComplete: false,
    present: true,
  });
  const fixture = referenceFixture();
  const lcp = measurementsFor(
    data,
    [],
    referenceScenario({ action: "load", observationMs: 300 }),
    { ...fixture, adapter: { ...fixture.adapter, primaryContent: "#hero" } }
  ).find((metric) => metric.key === "page.lcp");
  expect(lcp).toMatchObject({
    reason: expect.stringContaining("right-censored"),
    status: "unavailable",
  });
});

test("a paint presented before cutoff but queued after it still counts", async ({
  page,
}) => {
  await page.setContent("<p>Small first paint</p>");
  const deadline = await page.evaluate(() => performance.now() + 400);
  await page.evaluate(installObserver, {
    banner: "#banner",
    categories: [],
    fixedDeadlineMs: deadline,
    maxDurationMs: 30_000,
    paintGraceMs: 250,
    stateGlobal: "__cookiebench",
  });
  const data = await page.evaluate(
    (cutoff) =>
      new Promise<BrowserObservations>((resolve) => {
        setTimeout(
          () => {
            const late = document.createElement("h1");
            late.id = "late";
            late.style.fontSize = "64px";
            late.textContent = "Painted inside the window";
            document.body.append(late);
            // Keep the main thread busy after the frame is committed, so Chrome can only
            // queue its presentation-time entries once the cutoff has passed.
            requestAnimationFrame(() =>
              setTimeout(() => {
                while (performance.now() < cutoff + 5) {
                  /* Deliberate uninterrupted renderer task. */
                }
                resolve(window.__bench.settle());
              }, 0)
            );
          },
          Math.max(0, cutoff - 150 - performance.now())
        );
      }),
    deadline
  );
  expect(data.observationEndedAt).toBe(deadline);
  expect(data.lcpAttribution?.id).toBe("late");
  expect(data.vitals.LCP?.value).toBeLessThanOrEqual(deadline);
});

test("cached selector queries still see a banner in a shadow root attached later", async ({
  page,
}) => {
  await page.setContent('<div id="host"></div><main>Article</main>');
  await page.evaluate(installObserver, {
    banner: "#banner",
    categories: [],
    maxDurationMs: 30_000,
    stateGlobal: "__cookiebench",
  });
  // Let idle frames cache the missing banner before the host gains a shadow root.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      })
  );
  expect(
    await page.evaluate(() => window.__bench.observations.visibleAt)
  ).toBeUndefined();
  await page.evaluate(() => {
    const root = document
      .querySelector("#host")
      ?.attachShadow({ mode: "open" });
    setTimeout(() => {
      const banner = document.createElement("div");
      banner.id = "banner";
      banner.textContent = "Consent";
      root?.append(banner);
    }, 50);
  });
  await page.waitForFunction(
    () => window.__bench.observations.visibleAt !== undefined,
    undefined,
    { timeout: 2000 }
  );
});
