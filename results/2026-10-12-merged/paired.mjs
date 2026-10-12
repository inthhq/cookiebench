import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  extraMetrics,
  frameworks,
  here,
  profiles,
  repo,
  sourceFor,
} from "./sources.mjs";

// Analyze the original alpha.11 load envelopes only. Competitor analyses stay unchanged.
for (const profile of profiles) {
  for (const framework of frameworks) {
    const entry = `${framework}-load`;
    const source = sourceFor("alpha11", profile, entry);
    for (const metric of extraMetrics) {
      const result = spawnSync(
        process.execPath,
        [
          "packages/cli/src/index.ts",
          "compare",
          "--baseline",
          source.entry.envelopeFile,
          "--candidate",
          source.entry.envelopeFile,
          "--metric",
          metric,
          "--family",
          `merged-2026-10-12:c15t:${profile}:ttfb-fcp`,
          "--family-size",
          String(frameworks.length * extraMetrics.length),
        ],
        { cwd: repo, maxBuffer: 64 * 1024 * 1024 }
      );
      if (result.status !== 0 && result.status !== 2) {
        throw new Error(
          `Compare ${profile} ${entry} ${metric}: ${result.stderr}`
        );
      }
      JSON.parse(result.stdout);
      const directory = path.join(here, "paired", profile, entry);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(
        path.join(directory, `compare-${metric}.json`),
        result.stdout
      );
      console.log(profile, entry, metric);
    }
  }
}
