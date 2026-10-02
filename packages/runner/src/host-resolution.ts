import { execFile } from "node:child_process";
import { createHash, X509Certificate } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type { FixtureConfig } from "@cookiebench/schema";
import { Effect } from "effect";

import { attempt } from "./lifecycle.ts";

const run = promisify(execFile);

export interface HostResolution {
  /** Hostnames the browser resolves to a local address, with that address. */
  readonly hosts: readonly { host: string; address: string }[];
  /** Run-scoped certificate for the HTTPS hosts, trusted only by its SPKI pin. */
  readonly tls?: {
    readonly certPath: string;
    readonly keyPath: string;
    readonly spki: string;
  };
}

export function mappedHosts(fixtures: readonly FixtureConfig[]) {
  const hosts = new Map<string, { address: string; https: boolean }>();
  for (const fixture of fixtures) {
    if (!fixture.resolveHost) {
      continue;
    }
    const url = new URL(fixture.url);
    if (isIP(url.hostname) || url.hostname === "localhost") {
      throw new Error(
        `Fixture ${fixture.id} sets resolveHost, but its URL already uses ${url.hostname}.`
      );
    }
    const previous = hosts.get(url.hostname);
    if (previous && previous.address !== fixture.resolveHost) {
      throw new Error(`Host ${url.hostname} resolves to two addresses.`);
    }
    hosts.set(url.hostname, {
      address: fixture.resolveHost,
      https: (previous?.https ?? false) || url.protocol === "https:",
    });
  }
  return hosts;
}

async function certificate(directory: string, hosts: readonly string[]) {
  const certPath = path.join(directory, "cert.pem");
  const keyPath = path.join(directory, "key.pem");
  await run("openssl", [
    "req",
    "-x509",
    "-newkey",
    "ec",
    "-pkeyopt",
    "ec_paramgen_curve:P-256",
    "-nodes",
    "-keyout",
    keyPath,
    "-out",
    certPath,
    "-days",
    "1",
    "-subj",
    `/CN=${hosts[0]}`,
    "-addext",
    `subjectAltName=${hosts.map((host) => `DNS:${host}`).join(",")}`,
  ]);
  const spki = createHash("sha256")
    .update(
      new X509Certificate(await readFile(certPath)).publicKey.export({
        format: "der",
        type: "spki",
      })
    )
    .digest("base64");
  return { certPath, keyPath, spki };
}

/**
 * Collects mapped hosts and, when any is HTTPS, creates a one-day self-signed
 * certificate in a temporary directory removed with the run scope.
 */
export const hostResolution = (fixtures: readonly FixtureConfig[]) =>
  Effect.gen(function* resolution() {
    const mapped = mappedHosts(fixtures);
    const hosts = [...mapped].map(([host, { address }]) => ({
      address,
      host,
    }));
    const httpsHosts = [...mapped]
      .filter(([, { https }]) => https)
      .map(([host]) => host);
    if (httpsHosts.length === 0) {
      return { hosts } satisfies HostResolution;
    }
    const directory = yield* Effect.acquireRelease(
      attempt("host-certificate", () =>
        mkdtemp(path.join(tmpdir(), "cookiebench-tls-"))
      ),
      (created) =>
        Effect.promise(() => rm(created, { force: true, recursive: true }))
    );
    const tls = yield* attempt("host-certificate", () =>
      certificate(directory, httpsHosts)
    );
    return { hosts, tls } satisfies HostResolution;
  });

/** Chromium switches that apply the mapping and trust only the run certificate. */
export function hostResolutionArgs(resolution: HostResolution): string[] {
  if (resolution.hosts.length === 0) {
    return [];
  }
  return [
    `--host-resolver-rules=${resolution.hosts
      .map(({ host, address }) => `MAP ${host} ${address}`)
      .join(", ")}`,
    ...(resolution.tls
      ? [`--ignore-certificate-errors-spki-list=${resolution.tls.spki}`]
      : []),
  ];
}

/** Fixture servers read these variables to open their HTTPS listener. */
export function hostResolutionEnv(
  resolution: HostResolution
): Record<string, string> {
  return resolution.tls
    ? {
        COOKIEBENCH_TLS_CERT: resolution.tls.certPath,
        COOKIEBENCH_TLS_KEY: resolution.tls.keyPath,
      }
    : {};
}
