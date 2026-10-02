import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

import { verifyPackageContents } from "./integrity.ts";

const temporary: string[] = [];
afterEach(() => {
  for (const directory of temporary.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});
function fixture() {
  const directory = mkdtempSync(
    path.join(os.tmpdir(), "cookiebench-source-integrity-")
  );
  temporary.push(directory);
  const expected = path.join(directory, "archive");
  const installed = path.join(directory, "installed");
  mkdirSync(path.join(expected, "dist"), { recursive: true });
  writeFileSync(
    path.join(expected, "package.json"),
    '{"name":"c15t","version":"3.0.0-alpha.2"}'
  );
  writeFileSync(
    path.join(expected, "dist", "index.js"),
    "export const source = true;\n"
  );
  cpSync(expected, installed, { recursive: true });
  return { expected, installed };
}
test("accepts the exact unpacked artifact", () => {
  const { expected, installed } = fixture();
  expect(() => verifyPackageContents(expected, installed)).not.toThrow();
});
test("rejects published code with the same package name and version", () => {
  const { expected, installed } = fixture();
  writeFileSync(
    path.join(installed, "dist", "index.js"),
    "export const source = false;\n"
  );
  expect(() => verifyPackageContents(expected, installed)).toThrow(
    "bytes differ"
  );
});
test("rejects extra installed executable files", () => {
  const { expected, installed } = fixture();
  writeFileSync(path.join(installed, "dist", "extra.js"), "export {};\n");
  expect(() => verifyPackageContents(expected, installed)).toThrow(
    "file list differs"
  );
});

test("allows pnpm-generated dependency command wrappers", () => {
  const { expected, installed } = fixture();
  mkdirSync(path.join(installed, "node_modules", ".bin"), { recursive: true });
  writeFileSync(
    path.join(installed, "node_modules", ".bin", "nuxt"),
    "#!/bin/sh\n"
  );
  expect(() => verifyPackageContents(expected, installed)).not.toThrow();
});
