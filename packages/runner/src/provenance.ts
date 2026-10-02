import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map((entry) => {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return sourceFiles(filename);
      }
      return entry.isFile() ? [filename] : [];
    })
  );
  return groups.flat();
}

/** Hash names and bytes in deterministic order, before measured browser work. */
export async function hashCollectorSource(directory: string): Promise<string> {
  const files = await sourceFiles(directory);
  const filenames = files.toSorted();
  const contents = await Promise.all(
    filenames.map((filename) => readFile(filename))
  );
  const hash = createHash("sha256");
  for (const [index, filename] of filenames.entries()) {
    const name = path.relative(directory, filename).split(path.sep).join("/");
    hash.update(JSON.stringify([name, contents[index].length]));
    hash.update(contents[index]);
  }
  return hash.digest("hex");
}
