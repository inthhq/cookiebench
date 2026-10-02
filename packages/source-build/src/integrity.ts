import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

function files(directory: string, relative = ""): string[] {
  return readdirSync(path.join(directory, relative), { withFileTypes: true })
    .flatMap((entry) => {
      const name = path.join(relative, entry.name);
      if (entry.isDirectory()) {
        return files(directory, name);
      }
      if (!entry.isFile()) {
        throw new Error(`Package archive contains a nonregular file: ${name}`);
      }
      return [name];
    })
    .toSorted();
}

export function verifyPackageContents(
  expected: string,
  installed: string
): void {
  const expectedFiles = files(expected);
  const installedFiles = files(installed).filter(
    (file) => !file.startsWith(`node_modules${path.sep}.bin${path.sep}`)
  );
  if (JSON.stringify(expectedFiles) !== JSON.stringify(installedFiles)) {
    throw new Error(
      `Installed package file list differs from archive: ${installed}`
    );
  }
  for (const file of expectedFiles) {
    const digest = (directory: string) =>
      createHash("sha256")
        .update(readFileSync(path.join(directory, file)))
        .digest("hex");
    if (digest(expected) !== digest(installed)) {
      throw new Error(
        `Installed package bytes differ from archive: ${path.join(installed, file)}`
      );
    }
  }
}
