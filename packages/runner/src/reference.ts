import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import type {
  DeviceProfile,
  FixtureConfig,
  ScenarioConfig,
} from "@cookiebench/schema";

import type { RunConfig } from "./index.ts";

export const REFERENCE_VARIANTS: readonly string[] = [
  "correct",
  "missing",
  "hidden",
  "delayed",
  "shadow",
  "hydration-delay",
  "noninteractive",
  "leak",
  "duplicate",
  "backend-error",
  "baseline",
  "animated-dialog",
  "transparent-overlay",
  "css-hidden-override",
  "delayed-local-persistence",
  "draft-selection",
  "button-category",
];
export const desktopProfile: DeviceProfile = {
  cpuSlowdown: 1,
  deviceScaleFactor: 1,
  id: "desktop-local",
  isMobile: false,
  locale: "en-GB",
  network: {
    downloadBytesPerSecond: 12_500_000,
    latencyMs: 0,
    uploadBytesPerSecond: 12_500_000,
  },
  region: "GB",
  viewport: { height: 768, width: 1365 },
};
export function referenceFixture(
  options: {
    variant?: string;
    port?: number;
    query?: Record<string, string>;
    // `portable` starts the server with `node` from the repository root, for
    // configurations written to disk and run on another host.
    server?: boolean | "portable";
  } = {}
): FixtureConfig {
  const variant = options.variant ?? "correct";
  if (!REFERENCE_VARIANTS.includes(variant)) {
    throw new RangeError(`Unknown reference variant: ${variant}`);
  }
  const port = options.port ?? 4173;
  const params = new URLSearchParams({ variant, ...options.query });
  const url = `http://127.0.0.1:${port}/?${params}`;
  const node = options.server === "portable" ? "node" : process.execPath;
  // oxlint-disable-next-line sort-keys -- The optional server spread separates identity from lifecycle configuration.
  return {
    schemaVersion: 3,
    id: `reference-${variant}`,
    revision: "3.0.0",
    product: "Controlled reference",
    version: "3.0.0",
    framework: "script-tag",
    frameworkVersion: "html",
    mode: "local-only",
    deployment: {
      assets: "local",
      backend: variant === "baseline" ? "none" : "controlled-local",
    },
    baseline: variant === "baseline",
    presentation: "default",
    configurationHash: createHash("sha256").update(url).digest("hex"),
    url,
    ...(options.server === false
      ? {}
      : {
          server: {
            build: { args: ["build.mjs"], command: node },
            cwd:
              options.server === "portable"
                ? "fixtures/reference"
                : fileURLToPath(
                    new URL("../../../fixtures/reference", import.meta.url)
                  ),
            readinessTimeoutMs: 5000,
            readinessUrl: `http://127.0.0.1:${port}/health`,
            start: {
              args: ["server.mjs", String(port)],
              command: node,
            },
          },
        }),
    adapter: {
      accept: "#accept",
      acknowledgement: "#feedback",
      banner: "#banner",
      categoryToggle: "#analytics",
      controlledRequestPath: "/controlled.js",
      overlay: "#overlay",
      pageAction: "#page-action",
      preferences: "#preferences",
      preferencesPanel: "#choices",
      primaryContent: "[data-primary-content]",
      ready: 'html[data-ready="true"]',
      reject: "#reject",
      reopen: "#reopen",
      save: "#save",
      serverEventsUrl: `http://127.0.0.1:${port}/events`,
      stateGlobal: "__cookiebench",
      withdraw: "#withdraw",
    },
  };
}
export function referenceScenario(
  overrides: Partial<ScenarioConfig> = {}
): ScenarioConfig {
  return {
    action: "accept",
    actionDeadlineMs: 1200,
    cache: "cold",
    expectedBanner: true,
    followupOffsetMs: 100,
    id: "fresh-accept-ready",
    input: "pointer",
    navigationTimeoutMs: 5000,
    observationMs: 500,
    readiness: "ready",
    visitor: "fresh",
    workload: { categories: ["analytics", "marketing"], scriptCount: 2 },
    ...overrides,
  };
}
export function referenceRunConfig(
  options: {
    iterations?: number;
    variant?: string;
    port?: number;
    server?: "portable";
  } = {}
): RunConfig {
  return {
    fixtures: [referenceFixture(options)],
    iterations: options.iterations ?? 1,
    profile: desktopProfile,
    scenarios: [referenceScenario()],
    seed: 1,
  };
}
