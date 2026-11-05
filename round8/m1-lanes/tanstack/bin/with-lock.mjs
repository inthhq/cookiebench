// with-lock.mjs <cmd> [args...]: run a command while holding CookieBench's
// measurement lock (same file and protocol as packages/runner/src/lifecycle.ts:
// open "wx", write our PID, stale if that PID is gone). Used so CPU-heavy work
// (the source-mapped attribution build) never overlaps anyone's measurement.
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
  let pid = NaN;
  try { pid = Number(await readFile(lockPath, "utf8")); } catch {}
  let alive = true;
  try { process.kill(pid, 0); } catch (e) { alive = e.code !== "ESRCH"; }
  if (!alive) { await unlink(lockPath).catch(() => {}); continue; }
  await sleep(10_000);
}
console.log(`lock held by ${process.pid} at ${new Date().toISOString()}`);
let status = 1;
try {
  const [cmd, ...args] = process.argv.slice(2);
  status = spawnSync(cmd, args, { stdio: "inherit" }).status ?? 1;
} finally {
  if (Number(await readFile(lockPath, "utf8").catch(() => "")) === process.pid) await unlink(lockPath);
}
process.exit(status);
