import { createHash } from "node:crypto";

import type {
  FixtureConfig,
  Framework,
  ScenarioConfig,
} from "@cookiebench/schema";

export function createFixture(
  framework: Framework,
  frameworkVersion: string,
  port: number,
  baseline: boolean,
  directory: string,
  path = baseline ? "/baseline" : "/"
): FixtureConfig {
  const configurationHash = createHash("sha256")
    .update(
      JSON.stringify({
        baseline,
        directory,
        framework,
        frameworkVersion,
        path,
        policy: "strict-opt-in",
        presentation: "default",
      })
    )
    .digest("hex");
  return {
    adapter: {
      accept: '[data-testid="consent-banner-accept-button"]',
      banner: '[data-testid="consent-banner-root"]',
      categoryToggle: '[data-testid="consent-widget-switch-measurement"]',
      controlledRequestPath: "/controlled/script",
      overlay:
        '[data-testid="consent-dialog-overlay"], [data-testid="consent-banner-overlay"]',
      pageAction: "#page-action",
      preferences: '[data-testid="consent-banner-customize-button"]',
      preferencesPanel: '[data-testid="consent-dialog-root"]',
      primaryContent: "#primary-content",
      ready: 'html[data-consent-ready="true"]',
      reject: '[data-testid="consent-banner-reject-button"]',
      reopen: "#reopen-preferences",
      save: '[data-testid="consent-widget-footer-save-button"]',
      serverEventsUrl: `http://127.0.0.1:${port}/controlled/events`,
      stateGlobal: "__cookiebench",
      withdraw:
        '[data-testid="consent-widget-footer-reject-button"], [data-testid="consent-widget-reject-button"]',
    },
    baseline,
    configurationHash,
    deployment: {
      assets: "local",
      backend: baseline ? "none" : "controlled-local",
    },
    framework,
    frameworkVersion,
    id: `${framework}-${baseline ? "baseline" : "c15t"}`,
    mode: "hosted",
    presentation: "default",
    product: baseline ? "baseline" : "c15t",
    revision: "3.1.1-article-v1",
    schemaVersion: 3,
    server: {
      build: { args: ["build"], command: "pnpm" },
      cwd: directory,
      readinessTimeoutMs: 120_000,
      readinessUrl: `http://127.0.0.1:${port}/health`,
      start: { args: ["start"], command: "pnpm" },
    },
    url: `http://127.0.0.1:${port}${path}`,
    version: baseline ? frameworkVersion : "3.0.0-alpha.8",
  };
}
export function createScenario(
  action: ScenarioConfig["action"],
  expectedBanner = true
): ScenarioConfig {
  return {
    action,
    actionDeadlineMs: 5000,
    cache: "cold",
    expectedBanner: action === "withdraw" ? false : expectedBanner,
    followupOffsetMs: 100,
    id: action,
    input: "pointer",
    navigationTimeoutMs: 15_000,
    observationMs: action === "load" ? 5000 : 1500,
    readiness: "ready",
    visitor: action === "withdraw" ? "returning-accepted" : "fresh",
    workload: { categories: ["measurement", "marketing"], scriptCount: 2 },
  };
}
