// Paired TTFB and FCP for every load entry. The batch runner doesn't make
// these, so they form one Bonferroni family per profile of their own: ten CMPs
// on six frameworks, two metrics.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  entryName,
  extraMetrics,
  frameworks,
  here,
  profiles,
  repo,
  sourceFor,
} from "./sources.mjs";

const familySize = frameworks.length * 10 * extraMetrics.length;
for (const profile of profiles) {
  for (const framework of frameworks) {
    for (const product of ["c15t", "cookie-yes"]) {
      const entry = entryName(framework, product, "load");
      const source = sourceFor(profile, entry);
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
            `sandbox-2026-10-14:${profile}:ttfb-fcp`,
            "--family-size",
            String(familySize),
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
}
