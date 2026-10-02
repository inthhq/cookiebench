import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { FixtureConfig, ScenarioConfig } from "@cookiebench/schema";

const excluded = new Set([
  "node_modules",
  ".next",
  ".nuxt",
  ".nuxt-baseline",
  ".output",
  ".output-baseline",
  ".astro",
  "dist",
  "dist-baseline",
  ".turbo",
  ".tanstack",
]);
export function sourceHash(directory: string): string {
  const hash = createHash("sha256");
  const visit = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true }).toSorted(
      (a, b) => a.name.localeCompare(b.name)
    )) {
      if (
        (path.basename(current) === "public" && entry.name === "vendor") ||
        excluded.has(entry.name) ||
        (entry.name.startsWith("run") && entry.name.endsWith(".json")) ||
        entry.name === "config.json" ||
        entry.name.endsWith(".tsbuildinfo")
      ) {
        continue;
      }
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        hash.update(path.relative(directory, absolute));
        hash.update("\0");
        const contents = readFileSync(absolute);
        hash.update(String(contents.byteLength));
        hash.update("\0");
        hash.update(contents);
        hash.update("\0");
      }
    }
  };
  visit(directory);
  return hash.digest("hex");
}
export function finalizeFixture(
  fixture: FixtureConfig,
  scenarios: readonly ScenarioConfig[],
  artifactIntegrity: string,
  sourceUrl: string,
  options: { workspaceRoot?: string; sourceCommit?: string } = {}
): FixtureConfig {
  const directory = fixture.server?.cwd;
  if (!directory) {
    throw new Error("Local fixture provenance requires a source directory.");
  }
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const lockfileHash = createHash("sha256")
    .update(readFileSync(path.join(workspaceRoot, "pnpm-lock.yaml")))
    .digest("hex");
  const provenance = {
    artifactIntegrity,
    lockfileHash,
    sourceUrl,
    ...(options.sourceCommit ? { sourceCommit: options.sourceCommit } : {}),
  };
  const {
    configurationHash: previousHash,
    provenance: previousProvenance,
    ...configuration
  } = fixture;
  void previousHash;
  void previousProvenance;
  const configurationHash = createHash("sha256")
    .update(
      JSON.stringify({
        configuration,
        fixtureSource: sourceHash(path.resolve(workspaceRoot, directory)),
        provenance,
        scenarios,
        supportSource: sourceHash(
          path.join(workspaceRoot, "packages/fixture-support")
        ),
      })
    )
    .digest("hex");
  return { ...fixture, configurationHash, provenance };
}
