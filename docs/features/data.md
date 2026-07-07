# Data & Migrations

## Topology

One D1 database per install, bound as `DB` (root `wrangler.jsonc`). Multi-tenant deployments (`tenancy: "multi"`, see [settings](../guides/maintenance.md#tenant-management)) scope rows with a `tenant_id` column where it matters. We deliberately don't do D1-per-tenant — it doesn't scale with tenant count, and one database with scoped rows does.

## Modules own their schema

Every module's tables are prefixed `<module>_` (e.g. `blog_posts`) so modules can't collide with each other. A module declares its schema as an ordered, forward-only list of migrations:

```ts
// apps/web/src/worker/modules/<name>/index.ts
export const migrations: ModuleMigration[] = [
  { id: "0001_create_posts", sql: "CREATE TABLE IF NOT EXISTS blog_posts (...)" },
  { id: "0002_add_tag", sql: "ALTER TABLE blog_posts ADD COLUMN tag TEXT" },
];
```

Write migration SQL to be idempotent — `CREATE TABLE IF NOT EXISTS`, and guard `ALTER TABLE` where the runtime allows it. The race-condition note below explains why this isn't just good hygiene.

## The runner

`apps/web/src/worker/migrations.ts` keeps a ledger table `_migrations (module, id, applied_at)` and applies each module's pending migrations in order. A migration and its ledger write happen in a single `D1Database.batch()` call, so a crash mid-migration can never leave a migration applied but unrecorded.

**When it runs:** on the first `/api/*` request an isolate handles (`ensureMigrations` in `apps/web/src/worker/app.ts`), cached as an in-flight promise so concurrent requests during a cold start all await the same run instead of racing each other. Keep in mind this is a **fallback mechanism** — a deploy-time step (`wrangler deploy && pnpm migrate`) is the preferred trigger, and should be added once CI exists for this deployment target (see [docs/plans/04-data-and-migrations.md](../plans/04-data-and-migrations.md) and [ADR 003](../adr/003-distribution-and-update-strategy.md), both deferred alongside the distribution work).

**Known race:** two isolates cold-starting at the exact same moment can both pass the ledger check for the same migration before either records it. Idempotent DDL (`IF NOT EXISTS`) makes this harmless for creates; a non-idempotent `ALTER TABLE ADD COLUMN` racing itself will error in whichever isolate loses. We've accepted this as a trade-off of the lazy fallback — the deploy-time step doesn't have the problem at all, because it runs once, before traffic.

**Forward-only, no rollback:** there are no down-migrations, on purpose. A mistake gets fixed by a new forward migration. The flip side: code that rolls back to an older version must still work against the newer schema. That's why destructive changes (dropping or renaming columns) should ride a module major version and be called out in its changelog — never shipped as routine migrations.

## Verifying an upgrade locally

```bash
# fresh state
rm -rf apps/web/.wrangler/state/v3/d1
pnpm dev
curl localhost:5173/api/blog   # migrations run on first hit, table created empty
```

Then add a new migration to a module, restart the dev server, and hit its route again — the ledger makes sure only the new migration runs.

## Backups

Before migrating a production database, export it:

```bash
wrangler d1 export <database-name> --output backup.sql
```

The [maintenance guide](../guides/maintenance.md) covers when to run this.

## Adding a table to a module

1. Add a migration to the module's `migrations` array with a new sequential `id`.
2. Write the route handlers that use it (`c.env.DB.prepare(...)`).
3. Restart the dev server (or redeploy) — the runner applies it automatically.

Don't hand-edit another module's tables. Cross-module data access isn't supported yet (see [docs/features/modules.md](./modules.md)), and reaching into someone else's schema is how that support gets painful to add later.
