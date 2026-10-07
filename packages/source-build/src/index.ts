import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  globSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { createScenario } from "@cookiebench/fixture-support/config";
import {
  finalizeFixture,
  sourceHash,
} from "@cookiebench/fixture-support/provenance";
import { FixtureConfig, ScenarioConfig } from "@cookiebench/schema";
import { Schema } from "effect";

import { verifyPackageContents } from "./integrity.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const pinnedCommit = "9993ae57867e33e96783640413a2429b649104c7";
const repository = "https://github.com/c15t/c15t.git";
const bunVersion = "1.3.11";
const fixtureDirectories = [
  "script",
  "react",
  "nextjs",
  "nuxt",
  "astro",
  "tanstack-start",
].map((name) => `benchmarks/with-c15t-${name}`);
const snapshotDirectories = [
  ...fixtureDirectories,
  "packages/schema",
  "packages/fixture-support",
  "packages/typescript-config",
];
const snapshotFiles = [
  "package.json",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "turbo.json",
];
const excluded = new Set([
  "node_modules",
  ".next",
  ".nuxt",
  ".nuxt-baseline",
  ".output",
  ".output-baseline",
  ".astro",
  ".tanstack",
  "dist",
  "dist-baseline",
  ".turbo",
  "test-results",
]);
const Strings = Schema.Record(Schema.String, Schema.String);
const Package = Schema.Struct({
  dependencies: Schema.optionalKey(Strings),
  name: Schema.String,
  optionalDependencies: Schema.optionalKey(Strings),
  peerDependencies: Schema.optionalKey(Strings),
  version: Schema.String,
});
const Artifact = Schema.Struct({
  file: Schema.String,
  integrity: Schema.String,
  name: Schema.String,
  originalManifestHash: Schema.String,
  packedManifestHash: Schema.String,
  version: Schema.String,
});
const ArtifactManifest = Schema.Struct({
  bunVersion: Schema.String,
  generatedDocumentation: Schema.Record(Schema.String, Schema.String),
  nodeVersion: Schema.String,
  packTransform: Schema.String,
  packages: Schema.Array(Artifact),
  repository: Schema.String,
  sourceCommit: Schema.String,
  sourceLockfileHash: Schema.String,
});
const ConsumerManifest = Schema.Struct({
  configs: Schema.Array(Schema.String),
  consumer: Schema.String,
  inputHash: Schema.String,
  lockfileHash: Schema.String,
  sourceCommit: Schema.String,
});
const jsonRecord = Schema.decodeUnknownSync(
  Schema.Record(Schema.String, Schema.Unknown)
);
const decodePackage = Schema.decodeUnknownSync(Package);
const decodePlan = Schema.decodeUnknownSync(
  Schema.Struct({
    fixtures: Schema.Array(FixtureConfig),
    scenarios: Schema.Array(ScenarioConfig),
  })
);
const decodeRun = (value: unknown) => ({
  ...jsonRecord(value),
  ...decodePlan(value),
});
const { values } = parseArgs({
  options: {
    checkout: { type: "string" },
    commit: { default: pinnedCommit, type: "string" },
    mode: { default: "all", type: "string" },
    output: { type: "string" },
  },
});
if (!/^[a-f\d]{40}$/u.test(values.commit)) {
  throw new Error("--commit must be a full immutable Git SHA.");
}
const { commit } = values;
const output = path.resolve(
  values.output ?? path.join(root, ".source-build", commit)
);
mkdirSync(output, { recursive: true });

function hash(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf-8"));
}
function writeJson(file: string, value: unknown): void {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
function command(
  commandName: string,
  args: string[],
  cwd: string,
  label?: string
): string {
  const result = spawnSync(commandName, args, {
    cwd,
    encoding: "utf-8",
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      NUXT_TELEMETRY_DISABLED: "1",
    },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (label) {
    writeFileSync(
      path.join(output, `${label}.log`),
      `${result.stdout ?? ""}${result.stderr ?? ""}`
    );
    process.stdout.write(
      `${label}: ${result.status === 0 ? "passed" : "failed"}\n`
    );
  }
  if (result.error || result.status !== 0) {
    throw new Error(
      `${commandName} ${args.join(" ")} failed. ${label ? `See ${path.join(output, `${label}.log`)}` : result.stderr}`,
      { cause: result.error }
    );
  }
  return result.stdout.trim();
}
function bun(args: string[], cwd: string, label: string): string {
  return command("npx", ["--yes", `bun@${bunVersion}`, ...args], cwd, label);
}
function loadArtifacts(): typeof ArtifactManifest.Type {
  const manifest = Schema.decodeUnknownSync(ArtifactManifest)(
    readJson(path.join(output, "artifacts.json"))
  );
  if (manifest.sourceCommit !== commit) {
    throw new Error("Artifact manifest does not match the requested commit.");
  }
  for (const artifact of manifest.packages) {
    const integrity = `sha512-${createHash("sha512")
      .update(readFileSync(path.join(output, artifact.file)))
      .digest("base64")}`;
    if (integrity !== artifact.integrity) {
      throw new Error(`Archive integrity mismatch: ${artifact.name}`);
    }
  }
  return manifest;
}
function prepareArtifacts(): void {
  if (existsSync(path.join(output, "artifacts.json"))) {
    loadArtifacts();
    process.stdout.write("Verified existing immutable package archives.\n");
    return;
  }
  const checkout = path.resolve(
    values.checkout ?? path.join(output, "upstream")
  );
  if (!existsSync(checkout)) {
    command(
      "git",
      ["clone", "--no-checkout", repository, checkout],
      root,
      "source-clone"
    );
    command("git", ["fetch", "origin", commit], checkout, "source-fetch");
    command(
      "git",
      ["checkout", "--detach", commit],
      checkout,
      "source-checkout"
    );
  }
  if (
    command("git", ["remote", "get-url", "origin"], checkout) !== repository ||
    command("git", ["rev-parse", "HEAD"], checkout) !== commit ||
    command("git", ["status", "--porcelain", "--untracked-files=no"], checkout)
  ) {
    throw new Error(
      "Source checkout must be clean, from the declared repository, and at the exact commit."
    );
  }
  bun(["install", "--frozen-lockfile"], checkout, "source-install");
  bun(
    [
      "run",
      "turbo",
      "run",
      "build",
      "--filter=c15t...",
      "--filter=@c15t/browser...",
      "--concurrency=3",
    ],
    checkout,
    "source-build"
  );
  const packages = new Map(
    readdirSync(path.join(checkout, "packages"))
      .filter((directory) =>
        existsSync(path.join(checkout, "packages", directory, "package.json"))
      )
      .flatMap((directory) => {
        const file = path.join(checkout, "packages", directory, "package.json");
        const value = jsonRecord(readJson(file));
        if (value.private === true) {
          return [];
        }
        const pkg = decodePackage(value);
        return [[pkg.name, { directory, file, pkg }] as const];
      })
  );
  const selected = new Set<string>();
  function visit(name: string): void {
    if (selected.has(name)) {
      return;
    }
    const entry = packages.get(name);
    if (!entry) {
      throw new Error(`Missing upstream package ${name}`);
    }
    selected.add(name);
    for (const dependency of Object.keys({
      ...entry.pkg.dependencies,
      ...entry.pkg.optionalDependencies,
      ...entry.pkg.peerDependencies,
    })) {
      if (packages.has(dependency)) {
        visit(dependency);
      }
    }
  }
  visit("c15t");
  visit("@c15t/browser");
  const artifacts: (typeof Artifact.Type)[] = [];
  mkdirSync(path.join(output, "archives"), { recursive: true });
  for (const name of [...selected].toSorted()) {
    const entry = packages.get(name);
    if (!entry) {
      throw new Error(`Missing package ${name}`);
    }
    const file = `archives/${name.replace("@", "").replace("/", "-")}-${entry.pkg.version}.tgz`;
    bun(
      ["pm", "pack", "--filename", path.join(output, file), "--quiet"],
      path.dirname(entry.file),
      `pack-${entry.directory}`
    );
    const packed = command(
      "tar",
      ["-xOf", path.join(output, file), "package/package.json"],
      root
    );
    const packedPackage = decodePackage(JSON.parse(packed));
    for (const value of Object.values({
      ...packedPackage.dependencies,
      ...packedPackage.optionalDependencies,
      ...packedPackage.peerDependencies,
    })) {
      if (value.startsWith("workspace:")) {
        throw new Error(`Unresolved workspace dependency in ${name}`);
      }
    }
    artifacts.push({
      file,
      integrity: `sha512-${createHash("sha512")
        .update(readFileSync(path.join(output, file)))
        .digest("base64")}`,
      name,
      originalManifestHash: hash(readFileSync(entry.file)),
      packedManifestHash: hash(packed),
      version: entry.pkg.version,
    });
  }
  const generatedDocumentation = Object.fromEntries(
    command("git", ["diff", "--name-only"], checkout)
      .split("\n")
      .filter(Boolean)
      .map((file) => {
        if (
          !/^packages\/[^/]+\/(?:docs\/|AGENTS\.md$|SKILL\.md$)/u.test(file)
        ) {
          throw new Error(`Upstream packaging changed a source file: ${file}`);
        }
        return [file, hash(readFileSync(path.join(checkout, file)))];
      })
  );
  writeJson(path.join(output, "artifacts.json"), {
    bunVersion,
    generatedDocumentation,
    nodeVersion: process.version,
    packTransform:
      "Bun pm pack runs the upstream prepack script, selects the upstream files list, and replaces workspace dependency ranges with the workspace package versions. No source or CSS patches.",
    packages: artifacts,
    repository,
    sourceCommit: commit,
    sourceLockfileHash: hash(readFileSync(path.join(checkout, "bun.lock"))),
  });
  loadArtifacts();
}
function currentInputHash(): string {
  return hash(
    JSON.stringify({
      builder: sourceHash(path.join(root, "packages/source-build")),
      configs: fixtureDirectories.flatMap((directory) =>
        globSync(`${directory}/run*.json`, { cwd: root })
          .toSorted()
          .map((file) => [file, hash(readFileSync(path.join(root, file)))])
      ),
      directories: snapshotDirectories.map((directory) => [
        directory,
        sourceHash(path.join(root, directory)),
      ]),
      files: snapshotFiles.map((file) => [
        file,
        hash(readFileSync(path.join(root, file))),
      ]),
    })
  );
}
function copySnapshot(consumer: string): void {
  mkdirSync(consumer, { recursive: true });
  for (const directory of snapshotDirectories) {
    cpSync(path.join(root, directory), path.join(consumer, directory), {
      filter: (file) =>
        !excluded.has(path.basename(file)) &&
        !file.endsWith(".tsbuildinfo") &&
        !(
          path.basename(file) === "vendor" &&
          path.basename(path.dirname(file)) === "public"
        ),
      recursive: true,
    });
  }
  for (const file of snapshotFiles) {
    cpSync(path.join(root, file), path.join(consumer, file));
  }
  const pkg = jsonRecord(readJson(path.join(consumer, "package.json")));
  const dependencies = jsonRecord(pkg.devDependencies);
  const { "@cookiebench/cli": ignoredCli, ...devDependencies } = dependencies;
  void ignoredCli;
  writeJson(path.join(consumer, "package.json"), { ...pkg, devDependencies });
}
function verifyInstalledPackages(
  consumer: string,
  artifacts: typeof ArtifactManifest.Type
): void {
  const archiveByName = new Map(
    artifacts.packages.map((artifact) => [artifact.name, artifact])
  );
  const expanded = new Map<string, string>();
  for (const artifact of artifacts.packages) {
    const directory = path.join(
      output,
      "archive-files",
      artifact.name.replace("/", "-")
    );
    mkdirSync(directory, { recursive: true });
    command(
      "tar",
      ["-xzf", path.join(output, artifact.file), "-C", directory],
      root
    );
    expanded.set(artifact.name, path.join(directory, "package"));
  }
  const installed = globSync(
    "node_modules/.pnpm/*/node_modules/{c15t,@c15t/*}/package.json",
    { cwd: consumer }
  );
  const seen = new Set<string>();
  for (const file of installed) {
    const absolute = path.join(consumer, file);
    const pkg = decodePackage(readJson(absolute));
    const artifact = archiveByName.get(pkg.name);
    if (!artifact) {
      throw new Error(`Unrecorded installed c15t package: ${pkg.name}`);
    }
    const packed = command(
      "tar",
      ["-xOf", path.join(output, artifact.file), "package/package.json"],
      root
    );
    if (
      hash(readFileSync(realpathSync(absolute), "utf-8").trim()) !==
      hash(packed)
    ) {
      throw new Error(
        `Installed package manifest differs from packed artifact: ${pkg.name}`
      );
    }
    const archiveDirectory = expanded.get(pkg.name);
    if (!archiveDirectory) {
      throw new Error(`Missing expanded archive: ${pkg.name}`);
    }
    verifyPackageContents(
      archiveDirectory,
      path.dirname(realpathSync(absolute))
    );
    seen.add(pkg.name);
  }
  for (const artifact of artifacts.packages) {
    if (!seen.has(artifact.name)) {
      throw new Error(`Source package was not installed: ${artifact.name}`);
    }
  }
}
function verifyConsumer(
  manifestFile = path.join(output, "current.json")
): void {
  const artifacts = loadArtifacts();
  const manifest = Schema.decodeUnknownSync(ConsumerManifest)(
    readJson(manifestFile)
  );
  if (
    manifest.sourceCommit !== commit ||
    manifest.inputHash !== currentInputHash()
  ) {
    throw new Error(
      "Consumer snapshot is stale. Run source:consumer again after fixture/support edits settle."
    );
  }
  if (
    manifest.lockfileHash !==
    hash(readFileSync(path.join(manifest.consumer, "pnpm-lock.yaml")))
  ) {
    throw new Error("Consumer lockfile changed after build.");
  }
  verifyInstalledPackages(manifest.consumer, artifacts);
  for (const file of manifest.configs) {
    const config = decodeRun(readJson(file));
    for (const fixture of config.fixtures) {
      const { provenance } = fixture;
      if (!provenance?.sourceUrl) {
        throw new Error(`Missing provenance: ${fixture.id}`);
      }
      const verified = finalizeFixture(
        fixture,
        config.scenarios,
        provenance.artifactIntegrity,
        provenance.sourceUrl,
        {
          workspaceRoot: manifest.consumer,
          ...(provenance.sourceCommit
            ? { sourceCommit: provenance.sourceCommit }
            : {}),
        }
      );
      if (verified.configurationHash !== fixture.configurationHash) {
        throw new Error(`Fixture changed after build: ${fixture.id}`);
      }
    }
  }
  process.stdout.write(
    `${JSON.stringify({ verified: true, ...manifest }, null, 2)}\n`
  );
}
function promoteConsumer(manifest: unknown): void {
  const pending = path.join(output, "current.pending.json");
  writeJson(pending, manifest);
  renameSync(pending, path.join(output, "current.json"));
}
function createConsumer(): void {
  const artifacts = loadArtifacts();
  const inputHash = currentInputHash();
  const consumer = path.join(output, "consumers", inputHash);
  const completed = path.join(consumer, "consumer.json");
  if (existsSync(completed)) {
    verifyConsumer(completed);
    promoteConsumer(readJson(completed));
    return;
  }
  if (existsSync(consumer)) {
    throw new Error(
      `Incomplete consumer exists at ${consumer}. Preserve its logs, then remove that generated directory before retrying.`
    );
  }
  copySnapshot(consumer);
  const rootPackagePath = path.join(consumer, "package.json");
  const rootPackage = jsonRecord(readJson(rootPackagePath));
  writeJson(rootPackagePath, {
    ...rootPackage,
    devDependencies: {
      ...jsonRecord(rootPackage.devDependencies),
      ...Object.fromEntries(
        artifacts.packages.map((artifact) => [
          artifact.name,
          `file:${path.join(output, artifact.file)}`,
        ])
      ),
    },
  });
  for (const directory of fixtureDirectories) {
    const packagePath = path.join(consumer, directory, "package.json");
    const pkg = jsonRecord(readJson(packagePath));
    const dependencies = { ...jsonRecord(pkg.dependencies) };
    const devDependencies = { ...jsonRecord(pkg.devDependencies) };
    for (const artifact of artifacts.packages) {
      const specifier = `file:${path.join(output, artifact.file)}`;
      if (artifact.name in dependencies) {
        dependencies[artifact.name] = specifier;
      } else {
        devDependencies[artifact.name] = specifier;
      }
    }
    writeJson(packagePath, { ...pkg, dependencies, devDependencies });
  }
  const workspace = path.join(consumer, "pnpm-workspace.yaml");
  const overrides = artifacts.packages
    .map(
      (artifact) =>
        `  ${JSON.stringify(artifact.name)}: ${JSON.stringify(`file:${path.join(output, artifact.file)}`)}`
    )
    .join("\n");
  writeFileSync(
    workspace,
    `${readFileSync(workspace, "utf-8")}\nautoInstallPeers: false\noverrides:\n${overrides}\n`
  );
  command(
    "pnpm",
    ["install", "--no-frozen-lockfile"],
    consumer,
    `consumer-${inputHash.slice(0, 12)}-install`
  );
  command(
    "pnpm",
    ["install", "--frozen-lockfile"],
    consumer,
    `consumer-${inputHash.slice(0, 12)}-frozen-install`
  );
  verifyInstalledPackages(consumer, artifacts);
  for (const directory of fixtureDirectories) {
    const name = path.basename(directory);
    command(
      "pnpm",
      ["run", "build"],
      path.join(consumer, directory),
      `${inputHash.slice(0, 12)}-${name}-build`
    );
    command(
      "pnpm",
      ["run", "typecheck"],
      path.join(consumer, directory),
      `${inputHash.slice(0, 12)}-${name}-typecheck`
    );
  }
  const configs: string[] = [];
  for (const directory of fixtureDirectories) {
    for (const original of globSync(`${directory}/run*.json`, {
      cwd: root,
    }).toSorted()) {
      const originalConfig = decodeRun(readJson(path.join(root, original)));
      const required = [
        "load",
        "accept",
        "reject",
        "save",
        "preferences",
        "withdraw",
      ].map((action) =>
        createScenario(action as Parameters<typeof createScenario>[0])
      );
      required.push(
        {
          ...createScenario("load", false),
          id: "returning-accepted",
          visitor: "returning-accepted",
        },
        {
          ...createScenario("load", false),
          id: "returning-rejected",
          visitor: "returning-rejected",
        },
        {
          ...createScenario("reject"),
          id: "reject-keyboard",
          input: "keyboard",
        },
        {
          ...createScenario("save"),
          followupOffsetMs: 100,
          id: "save-page-probe-100ms",
        }
      );
      const scenarios = Schema.decodeUnknownSync(Schema.Array(ScenarioConfig))([
        ...new Map(
          [...required, ...originalConfig.scenarios].map((scenario) => [
            scenario.id,
            {
              ...scenario,
              followupOffsetMs:
                scenario.id === "save-page-probe-100ms" ? 100 : 500,
            },
          ])
        ).values(),
      ]);
      const baseFixtures = [...originalConfig.fixtures];
      if (!baseFixtures.some((fixture) => fixture.baseline)) {
        const baseline = decodeRun(
          readJson(path.join(root, directory, "run.json"))
        ).fixtures.find((fixture) => fixture.baseline);
        if (!baseline) {
          throw new Error(`Missing matched baseline for ${original}`);
        }
        baseFixtures.unshift({
          ...baseline,
          id: `${baseline.id}-headless`,
          presentation: "headless",
        });
      }
      const config = {
        ...originalConfig,
        fixtures: baseFixtures,
        iterations: 15,
        scenarios,
        warmups: 3,
      };
      const fixtures = config.fixtures.map((fixture) => {
        if (!fixture.server || !fixture.provenance) {
          throw new Error(`Missing local fixture metadata for ${fixture.id}`);
        }
        const packageNames: Record<string, string> = {
          astro: "@c15t/astro",
          nuxt: "@c15t/vue",
          "script-tag": "@c15t/browser",
          "tanstack-start": "@c15t/tanstack-start",
        };
        const packageName = packageNames[fixture.framework] ?? "c15t";
        const artifact = artifacts.packages.find(
          (entry) => entry.name === packageName
        );
        if (!artifact) {
          throw new Error(`Missing candidate artifact ${packageName}`);
        }
        return finalizeFixture(
          {
            ...fixture,
            id: `${fixture.id}-source-${commit.slice(0, 12)}`,
            revision: `${fixture.revision}-source.${commit.slice(0, 12)}`,
            server: { ...fixture.server, cwd: path.join(consumer, directory) },
            version: fixture.baseline
              ? fixture.version
              : `${artifact.version}+source.${commit.slice(0, 12)}`,
          },
          config.scenarios,
          fixture.baseline
            ? fixture.provenance.artifactIntegrity
            : artifact.integrity,
          fixture.baseline
            ? (fixture.provenance.sourceUrl ?? repository)
            : `https://github.com/c15t/c15t/tree/${commit}`,
          {
            workspaceRoot: consumer,
            ...(fixture.baseline ? {} : { sourceCommit: commit }),
          }
        );
      });
      const target = path.join(consumer, original);
      writeJson(target, { ...config, fixtures });
      configs.push(target);
    }
  }
  const manifest = {
    configs,
    consumer,
    inputHash,
    lockfileHash: hash(readFileSync(path.join(consumer, "pnpm-lock.yaml"))),
    sourceCommit: commit,
  };
  writeJson(completed, manifest);
  verifyConsumer(completed);
  promoteConsumer(manifest);
}
switch (values.mode) {
  case "all": {
    prepareArtifacts();
    createConsumer();
    break;
  }
  case "artifacts": {
    prepareArtifacts();
    break;
  }
  case "consumer": {
    createConsumer();
    break;
  }
  case "verify": {
    verifyConsumer();
    break;
  }
  default: {
    throw new Error(`Unknown mode ${values.mode}`);
  }
}
