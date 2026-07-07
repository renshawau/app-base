import type { ModuleMigration } from "@app-base/types";

type ModuleWithMigrations = { meta: { name: string }; migrations: ModuleMigration[] };

const LEDGER_TABLE = "_migrations";

async function applyPending(db: D1Database, modules: ModuleWithMigrations[]): Promise<void> {
  await db.exec(
    `CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (module TEXT NOT NULL, id TEXT NOT NULL, applied_at TEXT NOT NULL, PRIMARY KEY (module, id))`
  );

  for (const mod of modules) {
    for (const migration of mod.migrations) {
      const applied = await db
        .prepare(`SELECT 1 FROM ${LEDGER_TABLE} WHERE module = ?1 AND id = ?2`)
        .bind(mod.meta.name, migration.id)
        .first();
      if (applied) continue;

      // Migration + ledger write are one atomic batch — a crash mid-way
      // never leaves a migration applied without being recorded.
      await db.batch([
        db.prepare(migration.sql),
        db
          .prepare(`INSERT OR IGNORE INTO ${LEDGER_TABLE} (module, id, applied_at) VALUES (?1, ?2, ?3)`)
          .bind(mod.meta.name, migration.id, new Date().toISOString()),
      ]);
    }
  }
}

// One in-flight run per isolate — concurrent requests during a cold start
// await the same promise instead of racing. This is the fallback path for
// environments with no deploy-time migrate step; prefer running migrations
// as part of deploy once CI exists (see docs/plans/04-data-and-migrations.md).
// Module DDL must stay idempotent (CREATE TABLE IF NOT EXISTS, etc.) since a
// genuinely simultaneous cold start across isolates can still race the ledger
// check against a migration that isn't itself guarded.
let inFlight: Promise<void> | null = null;

export function ensureMigrations(db: D1Database, modules: ModuleWithMigrations[]): Promise<void> {
  if (!inFlight) {
    inFlight = applyPending(db, modules).catch((err) => {
      inFlight = null;
      throw err;
    });
  }
  return inFlight;
}
