import { execFileSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { desktopProfile } from "@cookiebench/runner";
import { expect, test } from "vitest";

const root = path.resolve(import.meta.dirname, "../../..");
const readJson = async (file: string) =>
  JSON.parse(await readFile(file, "utf-8"));

test("every generated plan runs all entries on its own profile", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "cookiebench-plans-"));
  execFileSync(process.execPath, ["benchmarks/plans/generate.ts", output], {
    cwd: root,
    stdio: "pipe",
  });
  const slowdown = async (entry: { config?: string }) => {
    // A config-less audit runs the reference page on the desktop profile.
    if (!entry.config) {
      return desktopProfile.cpuSlowdown;
    }
    const config = await readJson(entry.config);
    return config.profile.cpuSlowdown;
  };
  const plans = await Promise.all(
    ["desktop", "mobile"].map(async (name) => {
      const plan: { entries: { id: string; config?: string }[] } =
        await readJson(path.join(output, `plan-${name}.json`));
      return Promise.all(
        plan.entries.map(async (entry) => [entry.id, await slowdown(entry)])
      );
    })
  );
  const [desktop, mobile] = plans;
  expect(desktop).toEqual(desktop.map(([id]) => [id, 1]));
  expect(mobile).toEqual(mobile.map(([id]) => [id, 4]));
});
