/* eslint-disable no-await-in-loop -- Retries and polls wait on remote sandboxes. */
/**
 * Measures batch entries on Vercel Sandboxes, one sandbox per entry, then
 * merges them with the batch helper on this machine. One sandbox installs the
 * pushed commit and becomes a snapshot. Each pending entry then runs
 * `batch.ts --entry` on a fresh sandbox from that snapshot. Every sandbox and
 * the snapshot carry this run's tag and are deleted when the run ends, fails
 * or is interrupted. The snapshot also expires after a day.
 *
 *   node --env-file=.env.local packages/cli/src/sandbox.ts PLAN.json OUTPUT_DIRECTORY [PLAN.json OUTPUT_DIRECTORY ...]
 */
import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { Sandbox, Snapshot } from "@vercel/sandbox";

import { decodePlan, runBatch, skippedReason } from "./batch.ts";

const region = "lhr1";
const vcpus = 8;
const sandboxTimeout = 2 * 60 * 60_000;
const snapshotExpiration = 24 * 60 * 60_000;
const pollInterval = 30_000;
// Merged envelopes must share one CPU model and kernel, so an entry that lands
// on a different host moves to a new sandbox.
const hostTries = 3;
const hostScript = `node -e 'const os = require("node:os"); console.log(JSON.stringify({ cpu: os.cpus()[0]?.model, platform: os.platform(), release: os.release(), node: process.version }))'`;
const shellSafe = /^[\w./-]+$/u;

const execFileAsync = promisify(execFile);
async function git(...args: string[]) {
  const { stdout } = await execFileAsync("git", args);
  return stdout.trim();
}

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

interface Job {
  plan: string;
  output: string;
  entry: string;
}

/** Entries that would launch a browser and have no recorded result yet. */
export async function pendingEntries(
  planFile: string,
  outputDirectory: string
) {
  const plan = decodePlan(JSON.parse(await readFile(planFile, "utf-8")));
  const pending: string[] = [];
  for (const entry of plan.entries) {
    const directory = path.join(outputDirectory, entry.id);
    if (
      skippedReason(entry) ||
      (await exists(path.join(directory, "result.json")))
    ) {
      continue;
    }
    if (await exists(directory)) {
      throw new Error(
        `${directory} has no result.json. Move it aside or use a new output directory.`
      );
    }
    pending.push(entry.id);
  }
  return pending;
}

/** Sandboxes clone over HTTPS without credentials. */
export function httpsRepository(remote: string) {
  const ssh = /^git@(?<host>[^:]+):(?<name>.+?)(?:\.git)?$/u.exec(remote);
  const url = ssh?.groups
    ? `https://${ssh.groups.host}/${ssh.groups.name}`
    : remote;
  if (!url.startsWith("https://")) {
    throw new Error(`Cannot clone ${remote} over HTTPS.`);
  }
  return url.endsWith(".git") ? url : `${url}.git`;
}

async function pushedRevision() {
  if (
    path.resolve(await git("rev-parse", "--show-toplevel")) !== process.cwd()
  ) {
    throw new Error("Run from the repository root.");
  }
  if (await git("status", "--porcelain", "--untracked-files=no")) {
    throw new Error(
      "Commit tracked changes first. Sandboxes check out the pushed commit."
    );
  }
  const revision = await git("rev-parse", "HEAD");
  const refs = await git("ls-remote", "origin");
  if (!refs.split("\n").some((line) => line.startsWith(revision))) {
    throw new Error(`Push ${revision} to origin first.`);
  }
  return {
    repository: httpsRepository(await git("remote", "get-url", "origin")),
    revision,
  };
}

async function shell(
  sandbox: Sandbox,
  cwd: string,
  script: string,
  signal: AbortSignal
) {
  const command = await sandbox.runCommand({
    args: ["-lc", script],
    cmd: "bash",
    cwd,
    signal,
  });
  const [stdout, stderr] = await Promise.all([
    command.stdout(),
    command.stderr(),
  ]);
  if (command.exitCode !== 0) {
    throw new Error(
      `${sandbox.name}: \`${script}\` exited ${command.exitCode}\n${stderr.slice(-2000)}`
    );
  }
  return stdout.trim();
}

async function extract(archive: Buffer, directory: string) {
  const file = path.join(directory, "entry.tgz");
  await writeFile(file, archive);
  await execFileAsync("tar", ["-xzf", file, "-C", directory]);
  await rm(file);
}

function log(label: string, message: string) {
  process.stderr.write(`[${label}] ${message}\n`);
}

type Source =
  | { type: "git"; url: string; revision: string; depth: number }
  | { type: "snapshot"; snapshotId: string };

class SandboxRun {
  readonly tag = `cb-${Date.now().toString(36)}`;
  readonly controller = new AbortController();
  readonly live = new Set<Sandbox>();
  snapshotId: string | undefined;
  cleanupFailures: string[] = [];

  async create(source: Source) {
    const { signal } = this.controller;
    for (let tryNumber = 1; ; tryNumber += 1) {
      try {
        const common = {
          persistent: false,
          region,
          resources: { vcpus },
          signal,
          tags: { cookiebench: this.tag },
          timeout: sandboxTimeout,
        };
        const sandbox = await Sandbox.create(
          source.type === "git" ? { ...common, source } : { ...common, source }
        );
        this.live.add(sandbox);
        return sandbox;
      } catch (error) {
        if (
          signal.aborted ||
          !String(error).includes("429") ||
          tryNumber >= 10
        ) {
          throw error;
        }
        await delay(15_000 * tryNumber, undefined, { signal });
      }
    }
  }

  async dispose(sandbox: Sandbox) {
    this.live.delete(sandbox);
    try {
      await sandbox.stop();
    } catch {
      // Already stopped; delete below still applies.
    }
    try {
      await sandbox.delete();
    } catch (error) {
      this.cleanupFailures.push(`sandbox ${sandbox.name}: ${String(error)}`);
    }
  }

  /** Deletes the snapshot and anything carrying this run's tag, including creates that outlived an abort. */
  async cleanup() {
    await Promise.all([...this.live].map((sandbox) => this.dispose(sandbox)));
    const tagged = await Sandbox.list({
      limit: 50,
      tags: { cookiebench: this.tag },
    });
    for (const { name } of await tagged.toArray()) {
      try {
        const sandbox = await Sandbox.get({ name });
        await sandbox.delete();
      } catch (error) {
        this.cleanupFailures.push(`sandbox ${name}: ${String(error)}`);
      }
    }
    if (this.snapshotId) {
      try {
        const snapshot = await Snapshot.get({ snapshotId: this.snapshotId });
        await snapshot.delete();
      } catch (error) {
        this.cleanupFailures.push(
          `snapshot ${this.snapshotId}: ${String(error)}`
        );
      }
    }
  }

  async prepare(repository: string, revision: string) {
    const { signal } = this.controller;
    const sandbox = await this.create({
      depth: 1,
      revision,
      type: "git",
      url: repository,
    });
    try {
      const { cwd } = sandbox;
      if (
        (await shell(sandbox, cwd, "git rev-parse HEAD", signal)) !== revision
      ) {
        throw new Error(
          `${sandbox.name} did not check out ${revision} in ${cwd}.`
        );
      }
      log("prepare", `installing ${revision.slice(0, 12)} on ${sandbox.name}`);
      await shell(sandbox, cwd, "pnpm install --frozen-lockfile", signal);
      await shell(
        sandbox,
        cwd,
        "sudo -E env PATH=$PATH pnpm exec playwright install-deps chromium && pnpm exec playwright install chromium",
        signal
      );
      const host = await shell(sandbox, cwd, hostScript, signal);
      log("prepare", `host ${host}`);
      const snapshot = await sandbox.snapshot({
        expiration: snapshotExpiration,
        signal,
      });
      this.snapshotId = snapshot.snapshotId;
      return { cwd, host };
    } finally {
      await this.dispose(sandbox);
    }
  }

  async measure(job: Job, reference: { cwd: string; host: string }) {
    const { signal } = this.controller;
    const label = `${path.basename(job.output)}/${job.entry}`;
    const snapshotId = this.snapshotId ?? "";
    for (let hostTry = 1; hostTry <= hostTries; hostTry += 1) {
      const sandbox = await this.create({ snapshotId, type: "snapshot" });
      try {
        const run = (script: string) =>
          shell(sandbox, reference.cwd, script, signal);
        const host = await run(hostScript);
        if (host !== reference.host) {
          log(label, `${sandbox.name} has a different host ${host}`);
          continue;
        }
        const started = Date.now();
        log(label, `measuring on ${sandbox.name}`);
        await run(
          `nohup bash -c 'node packages/cli/src/batch.ts ${job.plan} ${job.output} --entry ${job.entry} >/tmp/batch.log 2>&1; echo $? >/tmp/exit' >/dev/null 2>&1 &`
        );
        let exit = "";
        let misses = 0;
        while (!exit) {
          await delay(pollInterval, undefined, { signal });
          try {
            exit = await run("cat /tmp/exit 2>/dev/null || true");
            misses = 0;
          } catch (error) {
            misses += 1;
            if (signal.aborted || misses > 10) {
              throw error;
            }
          }
        }
        await run(`tar -czf /tmp/entry.tgz -C ${job.output} ${job.entry}`);
        const [archive, batchLog] = await Promise.all(
          ["/tmp/entry.tgz", "/tmp/batch.log"].map((file) =>
            sandbox.readFileToBuffer({ path: file }, { signal })
          )
        );
        if (!archive || !batchLog) {
          throw new Error(`${sandbox.name} lost the entry archive or its log.`);
        }
        await mkdir(job.output, { recursive: true });
        const staging = await mkdtemp(path.join(job.output, ".sandbox-"));
        try {
          await extract(archive, staging);
          const minutes = ((Date.now() - started) / 60_000).toFixed(1);
          if (await exists(path.join(staging, job.entry, "result.json"))) {
            await rename(
              path.join(staging, job.entry),
              path.join(job.output, job.entry)
            );
            log(label, `recorded after ${minutes} min, batch exit ${exit}`);
            return;
          }
          const failed = path.join(
            `${job.output}-failed`,
            `${job.entry}-${sandbox.name}`
          );
          await mkdir(path.dirname(failed), { recursive: true });
          await rename(path.join(staging, job.entry), failed);
          await writeFile(path.join(failed, "batch.log"), batchLog);
          throw new Error(
            `${label} recorded no result after ${minutes} min (batch exit ${exit}). Evidence: ${failed}`
          );
        } finally {
          await rm(staging, { force: true, recursive: true });
        }
      } finally {
        await this.dispose(sandbox);
      }
    }
    throw new Error(
      `${label}: no sandbox matched the reference host in ${hostTries} tries.`
    );
  }
}

/** Measure every pending entry of each plan on its own sandbox, then complete each batch locally. */
export async function runOnSandboxes(
  pairs: { plan: string; output: string }[]
) {
  for (const { plan, output } of pairs) {
    if (
      ![plan, output].every(
        (value) => shellSafe.test(value) && !path.isAbsolute(value)
      )
    ) {
      throw new Error(`Use plain relative paths: ${plan} ${output}`);
    }
  }
  const jobs: Job[] = [];
  for (const pair of pairs) {
    for (const entry of await pendingEntries(pair.plan, pair.output)) {
      if (!shellSafe.test(entry)) {
        throw new Error(`Entry id ${entry} is not shell-safe.`);
      }
      jobs.push({ ...pair, entry });
    }
  }
  const sandboxes = new SandboxRun();
  const interrupt = () => sandboxes.controller.abort();
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  const failures: string[] = [];
  try {
    if (jobs.length > 0) {
      const { repository, revision } = await pushedRevision();
      log("run", `${jobs.length} entries, tag ${sandboxes.tag}`);
      const reference = await sandboxes.prepare(repository, revision);
      const settled = await Promise.allSettled(
        jobs.map(async (job, index) => {
          // Staggered creates stay under the allocation rate limit.
          await delay(index * 3000, undefined, {
            signal: sandboxes.controller.signal,
          });
          await sandboxes.measure(job, reference);
        })
      );
      for (const outcome of settled) {
        if (outcome.status === "rejected") {
          failures.push(String(outcome.reason));
        }
      }
    }
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
    await sandboxes.cleanup();
  }
  if (sandboxes.cleanupFailures.length > 0) {
    failures.push(
      `Cleanup failed; delete by hand:\n${sandboxes.cleanupFailures.join("\n")}`
    );
  }
  if (sandboxes.controller.signal.aborted) {
    failures.push("Interrupted.");
    return failures;
  }
  for (const { plan, output } of pairs) {
    const missing = await pendingEntries(plan, output);
    if (missing.length > 0) {
      failures.push(`${output} is missing ${missing.join(", ")}; not merged.`);
    } else {
      await runBatch(plan, output);
      log("merge", `${output}/index.json`);
    }
  }
  return failures;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.length % 2 !== 0) {
    process.stderr.write(
      "Usage: node --env-file=.env.local packages/cli/src/sandbox.ts PLAN.json OUTPUT_DIRECTORY [PLAN.json OUTPUT_DIRECTORY ...]\n"
    );
    process.exitCode = 1;
  } else {
    const pairs = [];
    for (let index = 0; index < args.length; index += 2) {
      pairs.push({ output: args[index + 1], plan: args[index] });
    }
    try {
      const failures = await runOnSandboxes(pairs);
      for (const failure of failures) {
        process.stderr.write(`${failure}\n`);
      }
      process.exitCode = failures.length > 0 ? 1 : 0;
    } catch (error) {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`
      );
      process.exitCode = 1;
    }
  }
}
