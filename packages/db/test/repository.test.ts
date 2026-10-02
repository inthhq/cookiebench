import { randomUUID } from "node:crypto";

import type { ResultEnvelope } from "@cookiebench/schema";
import * as PgClient from "@effect/sql-pg/PgClient";
import { Effect } from "effect";
import { describe, expect, test } from "vitest";

import {
  canonicalJson,
  databaseLayer,
  importLegacy,
  ingestRun,
  migrate,
  parseLegacy,
  readRun,
  saveAnalysis,
} from "../src/index.ts";

const url = process.env.TEST_DATABASE_URL ?? "";
function firstRow<T>(items: readonly T[]): T {
  const [item] = items;
  if (item === undefined) {
    throw new Error("Expected a first row");
  }
  return item;
}
function envelope(): ResultEnvelope {
  const runId = randomUUID();
  return {
    artifacts: [],
    capabilities: [],
    fixtures: [
      {
        adapter: {
          accept: "#accept",
          banner: "#banner",
          reject: "#reject",
          stateGlobal: "consent",
        },
        baseline: false,
        configurationHash: "test",
        framework: "script-tag",
        frameworkVersion: "html",
        id: "reference",
        mode: "local-only",
        product: "reference",
        revision: "1",
        schemaVersion: 3,
        url: "http://localhost:8000",
        version: "1",
      },
    ],
    manifest: {
      collectorVersion: "test",
      createdAt: new Date().toISOString(),
      environment: { purpose: "repository-test" },
      id: runId,
      methodologyVersion: "cookiebench-v3.0.0",
      profile: {
        cpuSlowdown: 1,
        deviceScaleFactor: 1,
        id: "desktop",
        isMobile: false,
        locale: "en-US",
        network: {
          downloadBytesPerSecond: 1e6,
          latencyMs: 0,
          uploadBytesPerSecond: 1e6,
        },
        region: "GB",
        viewport: { height: 720, width: 1280 },
      },
      seed: 1,
      versions: { node: process.version },
    },
    samples: [
      {
        attempt: 0,
        failures: [],
        fixtureId: "reference",
        id: randomUUID(),
        iteration: 0,
        measurements: [
          {
            key: "page.fcp",
            method: "test",
            status: "measured",
            unit: "ms",
            value: 0.125,
          },
          {
            key: "initial.transfer",
            method: "test",
            status: "measured",
            unit: "bytes",
            value: 0,
          },
          {
            key: "page.lcp",
            method: "test",
            reason: "No paint",
            status: "unavailable",
            unit: "ms",
          },
          {
            key: "page.cls",
            method: "test",
            status: "measured",
            unit: "score",
            value: 1.2,
          },
        ],
        runId,
        scenarioId: "load",
        status: "passed",
      },
    ],
    scenarios: [
      {
        action: "load",
        actionDeadlineMs: 10,
        cache: "cold",
        expectedBanner: true,
        followupOffsetMs: 0,
        id: "load",
        input: "pointer",
        navigationTimeoutMs: 100,
        observationMs: 10,
        readiness: "ready",
        visitor: "fresh",
        workload: { categories: [], scriptCount: 0 },
      },
    ],
    schemaVersion: 3,
    status: "passed",
  };
}

const legacyBytes = Buffer.from(
  '{"app":"historic","results":[{"size":{"total":1.5}},{"size":{"total":2}}],"scores":{"totalScore":99}}'
);
test("legacy import preserves actual collector format and ambiguous units", () => {
  const legacy = parseLegacy(legacyBytes, "results.json");
  expect(legacy.originalText).toBe(legacyBytes.toString());
  expect(legacy.reconciliation.identities).toEqual(["historic"]);
  expect(legacy.recordCount).toBe(1);
  expect(legacy.sampleCount).toBe(2);
  expect(legacy.units).toBe("unknown-ambiguous");
  expect(legacy.comparisonEligible).toBe(false);
  expect(() => parseLegacy(Buffer.from("null"), "bad.json")).toThrow();
});
test("legacy UTF-8 BOM is preserved in the original text and source hash", () => {
  const bytes = Buffer.from('\uFEFF{"app":"old","results":[]}');
  const legacy = parseLegacy(bytes, "bom.json");
  expect(legacy.originalText).toBe(bytes.toString("utf-8"));
  expect(legacy.recordCount).toBe(1);
  expect(legacy.sourceSha256).not.toBe(
    parseLegacy(Buffer.from('{"app":"old","results":[]}'), "same-json.json")
      .sourceSha256
  );
});
test("canonical hash input ignores object ordering, preserves samples order", () => {
  expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ a: 1, b: 2 }));
  expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
});

const query = <A extends object>(
  text: string,
  params: readonly unknown[] = []
) =>
  Effect.runPromise(
    Effect.gen(function* executeQuery() {
      const sql = yield* PgClient.PgClient;
      return yield* sql.unsafe<A>(text, params);
    }).pipe(Effect.provide(databaseLayer(url)))
  );

describe.skipIf(!url)("real PostgreSQL repository", () => {
  test("ordered migration is rerunnable", async () => {
    await migrate(url);
    expect(await migrate(url)).toEqual([]);
  });
  test("retry is idempotent and raw zero/missing/CLS round-trip without mutation", async () => {
    const result = envelope();
    const outcomes = await Promise.all([
      ingestRun(url, result),
      ingestRun(url, result),
    ]);
    expect(outcomes.map((outcome) => outcome.inserted).toSorted()).toEqual([
      false,
      true,
    ]);
    expect(await readRun(url, result.manifest.id)).toEqual(result);
    const integerRow = firstRow(
      await query<{ stored: string; type: string; value: number | null }>(
        "SELECT integer_value::text AS stored, pg_typeof(integer_value)::text AS type, value FROM measurements WHERE sample_id = $1 AND metric = 'initial.transfer'",
        [firstRow(result.samples).id]
      )
    );
    expect(integerRow).toEqual({ stored: "0", type: "bigint", value: null });
    const scoreRow = firstRow(
      await query<{ value: number; integer_value: null }>(
        "SELECT value, integer_value FROM measurements WHERE sample_id = $1 AND metric = 'page.cls'",
        [firstRow(result.samples).id]
      )
    );
    expect(scoreRow).toEqual({ integer_value: null, value: 1.2 });
    const duration = firstRow(
      await query<{ value: number }>(
        "SELECT value FROM measurements WHERE sample_id = $1 AND metric = 'page.fcp'",
        [firstRow(result.samples).id]
      )
    );
    expect(duration.value).toBe(0.125);
    expect(
      await query("SELECT * FROM measurements WHERE sample_id = $1", [
        firstRow(result.samples).id,
      ])
    ).toHaveLength(4);
    await expect(
      ingestRun(url, { ...result, manifest: { ...result.manifest, seed: 2 } })
    ).rejects.toThrow("different content");
    await expect(
      query("UPDATE runs SET status = $1 WHERE id = $2", [
        "failed",
        result.manifest.id,
      ])
    ).rejects.toThrow();
    const analysis = { median: 0 };
    expect(
      await saveAnalysis(url, [result.manifest.id], "test-v1", analysis)
    ).toMatchObject({ inserted: true });
    expect(
      await saveAnalysis(url, [result.manifest.id], "test-v1", analysis)
    ).toMatchObject({ inserted: false });
  });
  test("partial sample insert failure rolls back the entire run", async () => {
    const result = envelope();
    const duplicateAttempt = { ...firstRow(result.samples), id: randomUUID() };
    const product = `rollback-${randomUUID()}`;
    await expect(
      ingestRun(url, {
        ...result,
        fixtures: result.fixtures.map((fixture) => ({ ...fixture, product })),
        samples: [...result.samples, duplicateAttempt],
      })
    ).rejects.toThrow();
    expect(
      await query("SELECT id FROM runs WHERE id = $1", [result.manifest.id])
    ).toEqual([]);
    expect(
      await query("SELECT id FROM samples WHERE run_id = $1", [
        result.manifest.id,
      ])
    ).toEqual([]);
    expect(
      await query("SELECT id FROM products WHERE name = $1", [product])
    ).toEqual([]);
  });
  test("database rejects unknown-as-zero and fractional bytes even outside schema validation", async () => {
    const result = envelope();
    await ingestRun(url, result);
    const sampleId = firstRow(result.samples).id;
    await expect(
      query(
        "INSERT INTO measurements (sample_id,metric,unit,status,value,method) VALUES ($1,'bad','ms','unavailable',NULL,'test')",
        [sampleId]
      )
    ).rejects.toThrow();
    await expect(
      query(
        "INSERT INTO measurements (sample_id,metric,unit,status,value,method) VALUES ($1,'bad','bytes','measured',1.5,'test')",
        [sampleId]
      )
    ).rejects.toThrow();
  });
  test("legacy import retries by exact source hash without entering v3 runs", async () => {
    const first = await importLegacy(url, legacyBytes, "results.json");
    const second = await importLegacy(
      url,
      legacyBytes,
      "/different/path/results.json"
    );
    expect(second.inserted).toBe(false);
    expect(second.sourceSha256).toBe(first.sourceSha256);
    const rows = await query<{ original_text: string; sample_count: number }>(
      "SELECT original_text, sample_count FROM legacy_imports WHERE source_sha256 = $1",
      [first.sourceSha256]
    );
    expect(firstRow(rows).original_text).toBe(legacyBytes.toString());
    expect(firstRow(rows).sample_count).toBe(2);
  });
});
