// with-lock.mjs <cmd> [args...]: run a command while holding the shared
// CookieBench measurement lock (same file and pid protocol as the runner),
// so a CPU-heavy step never overlaps a measured run.
import { spawnSync } from "node:child_process";
import { open, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
const lockPath = path.join(tmpdir(), "cookiebench-v3-measurement.lock");
for (;;) {
  try {
    const f = await open(lockPath, "wx");
    await f.writeFile(String(process.pid));
    await f.close();
    break;
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }
  await sleep(5000);
}
let status = 1;
try {
  const [cmd, ...args] = process.argv.slice(2);
  status = spawnSync(cmd, args, { stdio: "inherit" }).status ?? 1;
} finally {
  if (Number(await readFile(lockPath, "utf8").catch(() => "0")) === process.pid) await unlink(lockPath);
}
process.exit(status);
