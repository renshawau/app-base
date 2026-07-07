# Maintenance Guide

## Dependency updates

```bash
pnpm update -r          # update all packages across workspaces
pnpm outdated -r        # check what's stale
```

Two packages deserve extra care:

- `@cloudflare/workers-types` — update it whenever Wrangler bumps `compatibility_date`, so the types match the runtime you're actually on.
- `hono` — follow semver carefully here; the middleware API has changed across minor versions before.

## Wrangler compatibility date

Bump `compatibility_date` in `wrangler.jsonc` (repo root) when you want to adopt new platform features. Read the [Cloudflare changelog](https://developers.cloudflare.com/workers/configuration/compatibility-dates/) before bumping — the date controls runtime behavior, not just feature availability.

## Monitoring

Observability is already enabled in `wrangler.jsonc`. Traces and logs are in the Cloudflare dashboard under Workers > your worker > Logs.

Source maps are uploaded on deploy, so production stack traces point at your original TypeScript files rather than minified output.

## Secrets rotation

```bash
wrangler secret put <KEY>    # set a new value
wrangler secret delete <KEY> # remove
wrangler secret list         # list all secret names (not values)
```

## Tenant management

`apps/web/src/site.config.ts` sets `tenancy: "single"` or `"multi"`.

- **Single tenancy** (the default): every hostname resolves straight to the site config. KV isn't involved at all.
- **Multi tenancy**: the Worker looks up `tenant:<hostname>` in the `TENANTS` KV namespace (the binding is declared in `wrangler.jsonc`) and merges it over the site config defaults — see `apps/web/src/worker/tenant.ts`. A hostname with no tenant record 404s.

To add a tenant under multi tenancy:

```bash
wrangler kv key put --binding=TENANTS "tenant:<hostname>" \
  '{"id":"<hostname>","domain":"<hostname>","name":"Display Name","modules":{"blog":{"enabled":false}}}'
```

Then provision the domain in Cloudflare. One thing to be aware of: tenant lookups are cached per isolate for 30 seconds (`apps/web/src/worker/tenant.ts`), so a KV write can take up to that long to reach a warm Worker. If a new tenant doesn't appear immediately, wait half a minute before assuming something's wrong.

## Database migrations and backups

Module schema is versioned as migrations that ship inside each module, applied automatically by the runner in `apps/web/src/worker/migrations.ts` — the full design is in [docs/features/data.md](../features/data.md).

Before any deploy that brings new migrations to a production database, take a backup:

```bash
wrangler d1 export <database-name> --output backup-$(date +%Y%m%d).sql
```

There's no rollback mechanism, and that's deliberate: a bad migration gets fixed by a new forward migration, not by restoring the export. The backup exists for manual recovery if things go badly wrong — not as an undo button.
