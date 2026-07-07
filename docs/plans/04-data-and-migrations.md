# Plan 04 — Data & Migrations

**Status: Implemented** (2026-07-04), with one deferral — see [docs/features/data.md](../features/data.md) for current behavior. Kept here as the design record. The deploy-time migrate step described below is **not** built; only the request-time fallback runner is, since CI/deploy tooling is out of scope until distribution work (ADR 003) begins.

**Closes:** G5 (no data layer, no upgrade story)
**Prereqs:** Plan 01 (modules own their schema); pairs with the first data-bearing module.

## Problem

There are no storage bindings and no schema anywhere. More importantly for a *base*, there is no answer to: a live derived site updates to a newer base/module version — what happens to its data? Without a mechanism, every update of a data-bearing module is a manual, per-site risk.

## Design

### Topology

- **One D1 database per install** (per Model-B site / per shared-Worker deployment). Multi-tenant deployments scope rows with a `tenant_id` column — D1-per-tenant is not viable at scale (binding limits, migration fan-out) and can be revisited for isolation-sensitive tenants later.
- KV stays for config (Plan 03); R2 added when a module needs blobs.

### Modules own their schema

- Tables are prefixed `<module>_` (e.g. `blog_posts`); the compatibility kit (ADR 004) asserts the prefix to prevent collisions.
- Each module ships ordered migrations in its package:

```ts
migrations: [
  { id: "0001_create_posts", sql: "CREATE TABLE blog_posts (…)" },
  { id: "0002_add_tags",     sql: "ALTER TABLE blog_posts ADD COLUMN …" },
]
```

### Core-owned migration runner

- Core keeps a ledger table `_migrations (module, id, applied_at)` and applies each module's pending migrations **in order, per module**, inside D1's transactional batch.
- **When:** on deploy via a post-deploy step (`wrangler deploy && pnpm migrate` in CI) — deterministic and observable. Lazily-on-first-request is the fallback for environments without CI, guarded by a lock row; prefer the deploy step.
- **Direction: forward-only.** No down-migrations; a bad migration is fixed by a new forward migration. Rollback of code must therefore tolerate the newer schema — which is why migrations must be additive within a module's minor/patch releases; destructive changes (drop/rename) ride a major and get called out in the changelog (ADR 004).
- This is the piece that makes ADR 003's promise real: `pnpm update @app-base/module-blog` brings code *and* the schema changes it needs, applied automatically and recorded.

### Safety rails

- `wrangler d1 export` documented as the pre-update backup step in the maintenance guide; CI runs it before migrating production.
- The compatibility kit runs every module's full migration chain against an empty D1 *and* against the previous release's schema (upgrade path test).

## Steps

1. Add the D1 binding (`DB`) to `wrangler.jsonc`; create dev database.
2. Implement the runner + ledger in the worker core (`packages/` once core is extracted); add the `migrate` script and CI post-deploy step.
3. Give the first real module (blog, from Plan 01) a table + migrations; exercise create/read through its worker routes.
4. Ship a second migration for that module and verify the upgrade path on a database created at version one.
5. Write `docs/features/data.md` (topology, prefix rule, how to add a migration) and add the backup step to the maintenance guide.

## Done when

A derived site on version N of a module updates to N+1 and its database is migrated automatically on deploy, with the ledger showing what ran; a fresh site reaches the same schema from zero; both paths are covered in CI.
