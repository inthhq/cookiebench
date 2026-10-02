import { createHash, randomUUID } from "node:crypto";

import { decodeResult } from "@cookiebench/schema";
import type { ResultEnvelope } from "@cookiebench/schema";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as PgClient from "@effect/sql-pg/PgClient";
import { Data, Effect, Layer, Redacted } from "effect";

import { parseLegacy } from "./legacy.ts";
import type { LegacyImport } from "./legacy.ts";
import { migrateEffect } from "./migrations.ts";

export { parseLegacy } from "./legacy.ts";
export { migrateEffect } from "./migrations.ts";
export type { LegacyImport } from "./legacy.ts";

export class StorageError extends Data.TaggedError("StorageError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/** Stable key order makes retry identity independent of JSON formatting. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .toSorted(([a], [b]) => Number(a > b) - Number(a < b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
export const contentHash = (value: unknown): string =>
  createHash("sha256").update(canonicalJson(value)).digest("hex");
function requiredIdentity(
  map: ReadonlyMap<string, string>,
  key: string
): string {
  const id = map.get(key);
  if (!id) {
    throw new StorageError({ message: `Missing normalized identity ${key}` });
  }
  return id;
}
const identityUuid = (value: string): string => {
  const hash = createHash("sha256").update(value).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

export function databaseLayer(url: string) {
  return PgClient.layer({
    applicationName: "cookiebench-v3",
    connectTimeout: "5 seconds",
    idleTimeout: "10 seconds",
    maxConnections: 4,
    minConnections: 0,
    url: Redacted.make(url),
  });
}
export function migrate(url: string) {
  return Effect.runPromise(
    migrateEffect.pipe(
      Effect.provide(Layer.merge(databaseLayer(url), NodeServices.layer))
    )
  );
}

export const ingestRunEffect = (input: ResultEnvelope) =>
  Effect.gen(function* storageOperation2381() {
    const envelope = yield* Effect.try({
      catch: (cause) =>
        new StorageError({ cause, message: "Invalid result envelope" }),
      try: () => decodeResult(input),
    });
    const sql = yield* PgClient.PgClient;
    return yield* sql.withTransaction(
      Effect.gen(function* storageOperation2694() {
        const hash = contentHash(envelope);
        // Serialize retries before examining immutable identity, including concurrent callers.
        yield* sql`SELECT pg_advisory_xact_lock(hashtextextended(${envelope.manifest.id}, 0))`;
        const existing = yield* sql<{
          ingestion_hash: string;
        }>`SELECT ingestion_hash FROM runs WHERE id = ${envelope.manifest.id}::uuid`;
        if (existing.length > 0) {
          if (existing[0]?.ingestion_hash !== hash) {
            return yield* new StorageError({
              message: "Run ID already exists with different content",
            });
          }
          return {
            inserted: false,
            runId: envelope.manifest.id,
            sampleCount: envelope.samples.length,
          };
        }
        const fixtureIds = new Map<string, string>();
        for (const fixture of envelope.fixtures) {
          const productId = identityUuid(`product:${fixture.product}`);
          const releaseIdentity = contentHash({
            product: fixture.product,
            provenance: fixture.provenance,
            version: fixture.version,
          });
          const releaseId = identityUuid(`release:${releaseIdentity}`);
          const fixtureIdentity = contentHash(fixture);
          const fixtureId = identityUuid(`fixture:${fixtureIdentity}`);
          fixtureIds.set(fixture.id, fixtureId);
          yield* sql`INSERT INTO products (id, name) VALUES (${productId}::uuid, ${fixture.product}) ON CONFLICT DO NOTHING`;
          yield* sql`INSERT INTO releases (id, product_id, identity, provenance) VALUES (${releaseId}::uuid, ${productId}::uuid, ${releaseIdentity}, ${sql.json({ version: fixture.version, ...fixture.provenance })}) ON CONFLICT DO NOTHING`;
          yield* sql`INSERT INTO fixtures (id, identity, release_id, framework, configuration) VALUES (${fixtureId}::uuid, ${fixtureIdentity}, ${releaseId}::uuid, ${fixture.framework}, ${sql.json(fixture)}) ON CONFLICT DO NOTHING`;
        }
        const scenarioIds = new Map<string, string>();
        for (const scenario of envelope.scenarios) {
          const identity = contentHash(scenario);
          const id = identityUuid(`scenario:${identity}`);
          scenarioIds.set(scenario.id, id);
          yield* sql`INSERT INTO scenarios (id, identity, configuration) VALUES (${id}::uuid, ${identity}, ${sql.json(scenario)}) ON CONFLICT DO NOTHING`;
        }
        const { manifest } = envelope;
        yield* sql`INSERT INTO runs (id, ingestion_hash, methodology_version, collector_version, status, created_at, manifest, envelope)
      VALUES (${manifest.id}::uuid, ${hash}, ${manifest.methodologyVersion}, ${manifest.collectorVersion}, ${envelope.status}, ${manifest.createdAt}::timestamptz, ${sql.json(manifest)}, ${sql.json(envelope)})`;
        for (const sample of envelope.samples) {
          yield* sql`INSERT INTO samples (id, run_id, fixture_id, scenario_id, pair_id, iteration, attempt, status, failures, diagnostics)
        VALUES (${sample.id}::uuid, ${manifest.id}::uuid, ${requiredIdentity(fixtureIds, sample.fixtureId)}::uuid, ${requiredIdentity(scenarioIds, sample.scenarioId)}::uuid,
          ${sample.pairId ?? null}, ${sample.iteration}, ${sample.attempt}, ${sample.status}, ${sql.json(sample.failures)}, ${sample.diagnostics === undefined ? null : sql.json(sample.diagnostics)})`;
          for (const metric of sample.measurements) {
            const integral = metric.unit === "bytes" || metric.unit === "count";
            const value = metric.status === "measured" ? metric.value : null;
            yield* sql`INSERT INTO measurements (sample_id, metric, unit, status, value, integer_value, reason, method)
          VALUES (${sample.id}::uuid, ${metric.key}, ${metric.unit}, ${metric.status}, ${integral ? null : value}, ${integral ? value : null}, ${metric.status === "measured" ? null : metric.reason}, ${metric.method})`;
          }
        }
        for (const artifact of envelope.artifacts) {
          yield* sql`INSERT INTO artifacts (id, run_id, sample_id, sha256, path, media_type, size_bytes)
        VALUES (${artifact.id}::uuid, ${manifest.id}::uuid, ${artifact.sampleId ?? null}::uuid, ${artifact.sha256}, ${artifact.path}, ${artifact.mediaType}, ${artifact.sizeBytes})`;
        }
        for (const check of envelope.capabilities) {
          yield* sql`INSERT INTO capability_checks (id, run_id, fixture_id, capability, status, framework, mode, evidence, verified_at, reason)
        VALUES (${check.id}::uuid, ${manifest.id}::uuid, ${requiredIdentity(fixtureIds, check.fixtureId)}::uuid, ${check.capability}, ${check.status}, ${check.framework}, ${check.mode}, ${sql.json(check.evidence)}, ${check.verifiedAt ?? null}::timestamptz, ${check.reason ?? null})`;
        }
        return {
          inserted: true,
          runId: manifest.id,
          sampleCount: envelope.samples.length,
        };
      })
    );
  });

export const ingestRun = (url: string, envelope: ResultEnvelope) =>
  Effect.runPromise(
    ingestRunEffect(envelope).pipe(Effect.provide(databaseLayer(url)))
  );
export const readRun = (url: string, runId: string) =>
  Effect.runPromise(
    Effect.gen(function* storageOperation7743() {
      const sql = yield* PgClient.PgClient;
      const rows = yield* sql<{
        envelope: unknown;
      }>`SELECT envelope FROM runs WHERE id = ${runId}::uuid`;
      const [row] = rows;
      if (!row) {
        return yield* new StorageError({
          message: `Run ${runId} was not found`,
        });
      }
      return yield* Effect.try({
        catch: (cause) =>
          new StorageError({
            cause,
            message: "Stored envelope failed validation",
          }),
        try: () => decodeResult(row.envelope),
      });
    }).pipe(Effect.provide(databaseLayer(url)))
  );

export const importLegacyEffect = (legacy: LegacyImport) =>
  Effect.gen(function* storageOperation8442() {
    const sql = yield* PgClient.PgClient;
    const inserted = yield* sql`INSERT INTO legacy_imports
    (id, source_sha256, source_path, methodology_version, collector_version, original_text, original_json, record_count, sample_count, reconciliation, units, comparison_eligible)
    VALUES (${randomUUID()}::uuid, ${legacy.sourceSha256}, ${legacy.sourcePath}, ${legacy.methodologyVersion}, ${legacy.collectorVersion}, ${legacy.originalText}, ${sql.json(legacy.originalJson)}, ${legacy.recordCount}, ${legacy.sampleCount}, ${sql.json(legacy.reconciliation)}, ${legacy.units}, false)
    ON CONFLICT (source_sha256) DO NOTHING RETURNING id`;
    return {
      comparisonEligible: false,
      inserted: inserted.length > 0,
      recordCount: legacy.recordCount,
      sampleCount: legacy.sampleCount,
      sourceSha256: legacy.sourceSha256,
    };
  });
export const importLegacy = (
  url: string,
  bytes: Uint8Array,
  sourcePath: string
) =>
  Effect.runPromise(
    importLegacyEffect(parseLegacy(bytes, sourcePath)).pipe(
      Effect.provide(databaseLayer(url))
    )
  );

export const saveAnalysis = (
  url: string,
  runIds: readonly string[],
  analysisVersion: string,
  result: unknown
) =>
  Effect.runPromise(
    Effect.gen(function* storageOperation9719() {
      const sql = yield* PgClient.PgClient;
      return yield* sql.withTransaction(
        Effect.gen(function* storageOperation9851() {
          const hash = contentHash({ analysisVersion, result, runIds });
          const id = identityUuid(`analysis:${hash}`);
          const inserted =
            yield* sql`INSERT INTO analyses (id, source_run_ids, analysis_version, content_hash, result)
      VALUES (${id}::uuid, ${runIds}::uuid[], ${analysisVersion}, ${hash}, ${sql.json(result)}) ON CONFLICT (content_hash) DO NOTHING RETURNING id`;
          if (inserted.length > 0) {
            for (const runId of new Set(runIds)) {
              yield* sql`INSERT INTO analysis_runs (analysis_id, run_id) VALUES (${id}::uuid, ${runId}::uuid)`;
            }
          }
          return { analysisId: id, inserted: inserted.length > 0 };
        })
      );
    }).pipe(Effect.provide(databaseLayer(url)))
  );
