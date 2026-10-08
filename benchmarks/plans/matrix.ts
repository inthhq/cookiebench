/**
 * Writes the framework matrix: on each framework, the no-CMP page, c15t and
 * every competitor share one build and one server. Competitors load on the
 * baseline page through `?cmp=<vendor>`, which the fixture server answers with
 * the vendor's bootstrap. Each profile gets a load cohort and a one-attempt
 * correctness pass per framework.
 *
 * CookieYes renders only on its registered host, while that host breaks
 * others: `vercel.app` is a public suffix, so iubenda's consent cookie is
 * rejected, and Cookie Control's key doesn't accept it. So CookieYes and its
 * own baseline serve over HTTPS on that host, and every other arm shares the
 * plain local origin the standalone fixtures use.
 *
 *   node benchmarks/plans/matrix.ts results/2026-10-09
 *   node packages/cli/src/batch.ts results/2026-10-09/plan-desktop.json results/2026-10-09/desktop
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { competitorBootstrap } from "../../packages/fixture-support/src/competitor-bootstrap.ts";
import { finalizeFixture } from "../../packages/fixture-support/src/provenance.ts";
import {
  referenceRunConfig,
  referenceScenario,
} from "../../packages/runner/src/reference.ts";

const [output] = process.argv.slice(2);
if (!output) {
  throw new Error("Usage: node benchmarks/plans/matrix.ts <output-directory>");
}
const seed = 20_261_009;
const scenarioIds = new Set(["load", "accept", "reject", "save"]);
const host = "benchmarks-with-cookie-yes.vercel.app";
const registeredHost = new Set(["cookie-yes"]);
const frameworks = [
  "with-c15t-script",
  "with-c15t-react",
  "with-c15t-nextjs",
  "with-c15t-nuxt",
  "with-c15t-astro",
  "with-c15t-tanstack-start",
] as const;
const vendors = {
  "cookie-control": "with-cookie-control",
  "cookie-yes": "with-cookie-yes",
  didomi: "with-didomi",
  enzuzo: "with-enzuzo",
  iubenda: "with-iubenda",
  ketch: "with-ketch",
  onetrust: "with-onetrust",
  osano: "with-osano",
  usercentrics: "with-usercentrics",
} as const;

// oxlint-disable-next-line typescript/no-explicit-any -- Run configurations are copied as JSON; the runner decodes them.
type Json = Record<string, any>;
const read = (file: string): Json => JSON.parse(readFileSync(file, "utf-8"));
// Usercentrics treats a HeadlessChrome user agent as a bot and shows no
// banner, so the desktop matrix uses its browser user agent for every arm.
const profiles = {
  desktop: read("benchmarks/with-usercentrics/run.json").profile,
  mobile: read("benchmarks/profiles/mobile.json"),
} as const;

const placement = (marker: string, side: string) =>
  ({
    "</body>:before": "body-end",
    "</head>:before": "head-end",
    "<head>:after": "head-start",
  })[`${marker}:${side}`];

/** Serve one framework over HTTPS on the registered host. */
function matrixServer(directory: string, server: Json) {
  const script: string = read(`benchmarks/${directory}/package.json`).scripts
    .start;
  const [command, ...args] = script.split(" ");
  const portIndex = args.indexOf("--port");
  const port = Number(args[portIndex + 1]);
  const tlsPort = port + 300;
  args.splice(portIndex + 2, 0, "--tls-port", String(tlsPort));
  return {
    origin: `https://${host}:${tlsPort}`,
    server: { ...server, start: { args, command } },
  };
}

const local = (fixture: Json) => ({
  ...fixture,
  revision: `${fixture.revision}-matrix`,
});
// Competitor rows carry their vendor name only until they're split by origin.
const strip = ({ name: _name, ...fixture }: Json) => fixture;

/** The framework's arms, split by the origin each needs. */
function matrix(directory: string): { local: Json; registered: Json } {
  const source = read(`benchmarks/${directory}/run.json`);
  const baseline = source.fixtures.find((fixture: Json) => fixture.baseline);
  const c15t = source.fixtures.find((fixture: Json) => !fixture.baseline);
  const tls = matrixServer(directory, baseline.server);
  const onHost = (fixture: Json) => {
    const url = new URL(fixture.url);
    return {
      ...fixture,
      resolveHost: "127.0.0.1",
      server: tls.server,
      url: `${tls.origin}${url.pathname}${url.search}`,
    };
  };
  const competitors = Object.entries(vendors).map(([name, vendorDirectory]) => {
    const vendor = read(`benchmarks/${vendorDirectory}/run.json`).fixtures.find(
      (fixture: Json) => !fixture.baseline
    );
    const bootstrap = competitorBootstrap(name);
    if (!bootstrap) {
      throw new Error(`No bootstrap for ${name}`);
    }
    return {
      ...vendor,
      adapter: {
        ...vendor.adapter,
        serverEventsUrl: c15t.adapter.serverEventsUrl,
      },
      framework: baseline.framework,
      frameworkVersion: baseline.frameworkVersion,
      id: `${baseline.id.replace(/-baseline.*$/u, "")}-${name}`,
      name,
      revision: `3.4.0-matrix-article-v1-${placement(bootstrap.marker, bootstrap.side)}`,
      server: baseline.server,
      url: `${baseline.url}?cmp=${name}`,
    };
  });
  const scenarios = source.scenarios.filter((scenario: Json) =>
    scenarioIds.has(scenario.id)
  );
  return {
    local: {
      ...source,
      fixtures: [
        local(baseline),
        local(c15t),
        ...competitors
          .filter((fixture) => !registeredHost.has(fixture.name))
          .map(strip),
      ],
      scenarios,
    },
    registered: {
      ...source,
      fixtures: [
        onHost({ ...local(baseline), id: `${baseline.id}-registered-host` }),
        ...competitors
          .filter((fixture) => registeredHost.has(fixture.name))
          .map((fixture) => onHost(strip(fixture))),
      ],
      scenarios,
    },
  };
}

function write(name: string, config: Json): string {
  const file = path.join(output, "configs", `${name}.json`);
  const finalized = {
    ...config,
    fixtures: config.fixtures.map((fixture: Json) =>
      finalizeFixture(
        fixture as never,
        config.scenarios,
        fixture.provenance.artifactIntegrity,
        fixture.provenance.sourceUrl,
        fixture.provenance.sourceCommit
          ? { sourceCommit: fixture.provenance.sourceCommit }
          : {}
      )
    ),
  };
  writeFileSync(file, `${JSON.stringify(finalized, null, 2)}\n`);
  return file;
}

// The reference audit gets the same page and scenario as `instrumentation
// audit` builds, on each profile, since a batch cannot mix CPU settings.
function referenceAudit(profileName: string, profile: Json): string {
  const file = path.join(
    output,
    "configs",
    `reference-overhead-${profileName}.json`
  );
  const config = {
    ...referenceRunConfig({ variant: "baseline" }),
    profile,
    scenarios: [
      referenceScenario({
        action: "load",
        expectedBanner: false,
        id: "load",
        observationMs: 1000,
      }),
    ],
  };
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
  return file;
}

mkdirSync(path.join(output, "configs"), { recursive: true });
for (const [profileName, profile] of Object.entries(profiles)) {
  const entries: Json[] = [];
  for (const directory of frameworks) {
    const framework = directory.replace(/^with-c15t-/u, "");
    const configs = matrix(directory);
    for (const [suffix, config] of [
      ["", configs.local],
      ["-cookie-yes", configs.registered],
    ] as const) {
      const name = `${framework}${suffix}`;
      const file = write(`${name}-${profileName}`, { ...config, profile });
      entries.push(
        { config: file, id: `${name}-load`, kind: "load" },
        { config: file, id: `${name}-correctness`, kind: "flows" }
      );
    }
  }
  entries.push({
    config: referenceAudit(profileName, profile),
    id: "reference-overhead",
    kind: "audit",
  });
  writeFileSync(
    path.join(output, `plan-${profileName}.json`),
    `${JSON.stringify({ entries, seed }, null, 2)}\n`
  );
}
