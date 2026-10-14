import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { httpsRepository, pendingEntries } from "../src/sandbox.ts";

test("only unrecorded entries that launch a browser need a sandbox", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cookiebench-sandbox-"));
  const plan = path.join(directory, "plan.json");
  const output = path.join(directory, "out");
  await writeFile(
    plan,
    JSON.stringify({
      entries: [
        { config: "a.json", id: "done", kind: "load" },
        { config: "a.json", id: "todo", kind: "load" },
        {
          config: "a.json",
          excludedReason: "vendor down",
          id: "excluded",
          kind: "load",
        },
        {
          blockedReason: "no key",
          config: "a.json",
          id: "blocked-load",
          kind: "load",
        },
        {
          blockedReason: "no key",
          config: "a.json",
          id: "blocked-flows",
          kind: "flows",
        },
      ],
      seed: 1,
    })
  );
  await mkdir(path.join(output, "done"), { recursive: true });
  await writeFile(path.join(output, "done", "result.json"), "{}");

  await expect(pendingEntries(plan, output)).resolves.toEqual([
    "todo",
    "blocked-flows",
  ]);

  await mkdir(path.join(output, "todo", "attempt-001"), { recursive: true });
  await expect(pendingEntries(plan, output)).rejects.toThrow(
    "todo has no result.json"
  );
});

test("sandboxes clone the origin over HTTPS", () => {
  expect(httpsRepository("https://github.com/inthhq/cookiebench")).toBe(
    "https://github.com/inthhq/cookiebench.git"
  );
  expect(httpsRepository("git@github.com:inthhq/cookiebench.git")).toBe(
    "https://github.com/inthhq/cookiebench.git"
  );
  expect(() => httpsRepository("/srv/cookiebench")).toThrow("HTTPS");
});
