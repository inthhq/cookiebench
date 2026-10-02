import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";

import { expect, test } from "@playwright/test";

import type { BrowserObservations } from "../src/browser-observer.ts";
import {
  referenceFixture,
  referenceRunConfig,
  referenceScenario,
  runBenchmarkPromise,
} from "../src/index.ts";

let server: Server;
let origin: string;
const hero = readFileSync(
  new URL("../../fixture-support/assets/courtyard.png", import.meta.url)
);

test.beforeAll(async () => {
  server = createServer((request, response) => {
    if (request.url === "/hero.png") {
      response.setHeader("Content-Type", "image/png");
      response.end(hero);
      return;
    }
    response.setHeader("Content-Type", "text/html");
    response.end(`<!doctype html><html data-ready="true"><body>
      <img id="hero" width="600" height="400" elementtiming="primary-content">
      <script>
        window.__cookiebench = { consent: 'unset', allowedCategories: [], scripts: [], ready: true };
        setTimeout(() => document.querySelector('#hero').src = '/hero.png', 150);
        if (location.pathname === '/unsupported') {
          setTimeout(() => {
            const banner = document.createElement('div');
            banner.id = 'banner';
            banner.textContent = 'Consent';
            document.body.append(banner);
          }, 400);
        }
      </script></body></html>`);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Missing test server port");
  }
  origin = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  const closed = once(server, "close");
  server.closeAllConnections();
  server.close();
  await closed;
});

/* oxlint-disable no-loop-func -- Tests read the server origin only after beforeAll initializes it. */
for (const [variant, action, failure] of [
  ["missing", "accept", "banner-missing"],
  ["unsupported", "save", "unsupported-action"],
] as const) {
  test(`late native paint stays diagnostic after ${variant} action`, async () => {
    const result = await runBenchmarkPromise({
      ...referenceRunConfig(),
      fixtures: [
        {
          ...referenceFixture({ server: false }),
          adapter: {
            accept: "#accept",
            banner: "#banner",
            primaryContent: "#hero",
            reject: "#reject",
            stateGlobal: "__cookiebench",
          },
          url: `${origin}/${variant}`,
        },
      ],
      scenarios: [
        referenceScenario({
          action,
          actionDeadlineMs: 800,
          observationMs: 50,
          workload: { categories: [], scriptCount: 0 },
        }),
      ],
    });
    expect(result.samples).toHaveLength(1);
    const [sample] = result.samples;
    expect(sample?.failures.map((item) => item.code)).toContain(failure);
    const raw = sample?.diagnostics?.observations as BrowserObservations;
    expect(raw.input).toBeUndefined();
    expect(raw.primaryContentPaintAt).toBeGreaterThan(50);
    expect(raw.vitals.LCP?.value).toBeGreaterThan(50);
    for (const key of ["page.primary-content-paint", "page.lcp"]) {
      expect(
        sample?.measurements.find((metric) => metric.key === key)
      ).toMatchObject({
        reason: expect.stringContaining("No trusted action input"),
        status: "unavailable",
      });
    }
  });
}
