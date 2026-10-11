// Usage: node results/2026-10-11-merged/paired.mjs
// The batch runner compares LCP, primary content paint, CLS and bytes, but not
// TTFB or FCP. This runs the same paired compare for those two metrics over
// every load envelope the merged dataset uses. Each profile's TTFB and FCP
// comparisons form one Bonferroni family of their own, separate from the
// batch's family.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const here = fileURLToPath(new URL(".", import.meta.url));
const frameworks = ["nextjs", "nuxt", "astro", "tanstack-start", "react", "script"];
const metrics = ["page.ttfb", "page.fcp"];

// The Next.js CookieYes rows come from the after-hydration rerun.
const envelopeFile = (profile, entry) =>
  entry === "nextjs-cookie-yes-load"
    ? `results/2026-10-11-cookie-yes-hydration/${profile}/${entry}/attempt-001/envelope.json`
    : `results/2026-10-11/${profile}/${entry}/attempt-001/envelope.json`;

for (const profile of ["desktop", "mobile"]) {
  const entries = frameworks.flatMap((fw) => [`${fw}-load`, `${fw}-cookie-yes-load`]);
  const candidates = entries.reduce((sum, entry) => {
    const env = JSON.parse(fs.readFileSync(path.join(repo, envelopeFile(profile, entry)), "utf8"));
    return sum + env.fixtures.filter((f) => !f.baseline).length;
  }, 0);
  const size = candidates * metrics.length;
  for (const entry of entries) {
    for (const metric of metrics) {
      const file = envelopeFile(profile, entry);
      // Exit 2 means some comparison was inconclusive; the output is complete.
      const run = spawnSync(
        process.execPath,
        [
          "packages/cli/src/index.ts", "compare",
          "--baseline", file, "--candidate", file, "--metric", metric,
          "--family", `merged-2026-10-11:${profile}:ttfb-fcp`, "--family-size", String(size),
        ],
        { cwd: repo, maxBuffer: 64 * 1024 * 1024 }
      );
      if (run.status !== 0 && run.status !== 2) {
        throw new Error(`compare ${profile} ${entry} ${metric} exited ${run.status}: ${run.stderr}`);
      }
      const out = path.join(here, "paired", profile, entry);
      fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(path.join(out, `compare-${metric}.json`), run.stdout);
      console.log(profile, entry, metric);
    }
  }
}
