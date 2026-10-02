import { readFile } from "node:fs/promises";

import * as PgMigrator from "@effect/sql-pg/PgMigrator";
import { Effect } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

const initial = Effect.gen(function* initial() {
  const sql = yield* SqlClient.SqlClient;
  const source = yield* Effect.tryPromise(() =>
    readFile(new URL("../migrations/001_initial.sql", import.meta.url), "utf-8")
  );
  // Statement boundaries are deliberately at CREATE, preserving the function body.
  for (const statement of source.split(/;\s*\n(?=CREATE)/u)) {
    if (statement.trim()) {
      yield* sql.unsafe(statement);
    }
  }
});

export const migrateEffect = PgMigrator.run({
  loader: PgMigrator.fromRecord({ "001_initial": initial }),
  table: "cookiebench_migrations",
});
