import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { hashCollectorSource } from "../src/provenance.ts";

it("changes collector provenance when source bytes or filenames change", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cookiebench-source-"));
  try {
    await mkdir(path.join(directory, "nested"));
    await writeFile(path.join(directory, "nested", "collector.ts"), "original");
    const original = await hashCollectorSource(directory);
    expect(await hashCollectorSource(directory)).toBe(original);
    await writeFile(path.join(directory, "nested", "collector.ts"), "changed");
    expect(await hashCollectorSource(directory)).not.toBe(original);
    await rm(path.join(directory, "nested", "collector.ts"));
    await writeFile(path.join(directory, "nested", "renamed.ts"), "original");
    expect(await hashCollectorSource(directory)).not.toBe(original);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
