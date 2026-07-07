# Plan 03 — Settings & Tenant Config

**Status: Implemented** (2026-07-04) — see [docs/features/settings.md](../features/settings.md) for current behavior. Kept here as the design record. Note: implementation used a `tenancy: "single" | "multi"` config field (not in the original design below) so today's one-deployment reality doesn't require a KV lookup for every request.

**Closes:** G6 (tenant resolution stub), G8 (no typed settings)
**Prereqs:** Plan 01 for module settings schemas; the KV work needs no prereq.

## Problem

Tenant "resolution" currently fabricates `{ id: host, domain: host }` from the Host header (`apps/web/src/worker/app.ts`). There is no store behind it, no per-tenant module flags or branding, and no typed way for a site to declare its own configuration — so the first real site would express settings as ad-hoc edits to base files.

## Design — three tiers, three owners

| Tier | Lives in | Changed by | Examples |
|---|---|---|---|
| Deploy | `wrangler.jsonc`, secrets | deploy/CI | bindings, routes, API keys |
| Site (build-time) | `site.config.ts` | site developer, in git | site name, branding, module list, defaults |
| Tenant (runtime) | KV (later D1) | operator/admin, no redeploy | per-tenant enabled modules, branding overrides, module settings |

**The base owns every schema; sites and tenants own only values.** That line is what keeps configuration from becoming code divergence.

### Site config

```ts
// packages/types: schemas. apps/web/src/site.config.ts: values.
const siteConfigSchema = z.object({
  name: z.string(),
  branding: brandingSchema,          // logo, nav, footer (Plan 02)
  modules: z.record(moduleDefaults), // which modules ship + their defaults
  tenancy: z.enum(["single", "multi"]),
});
```

Parsed once at worker startup and at client boot; a bad config fails fast and loudly. Modules contribute their own `settingsSchema` (Plan 01), composed under their name — so a motorsport module's settings are typed by the motorsport module, not by core.

### Tenant store

- **KV binding `TENANTS`**, key `tenant:<hostname>`, value: tenant id, display name, enabled-module overrides, branding overrides, module settings. KV's read-heavy/eventually-consistent profile fits config; move to D1 only if tenant admin UI needs transactions/queries.
- Tenant middleware: look up hostname → merge over site-config defaults → `c.set("tenant", …)`. Cache per-isolate with a short TTL to avoid a KV read per request. Unknown hostname in `multi` tenancy → 404; in `single` tenancy the site config *is* the tenant.
- Expose the merged, client-safe subset at `/api/tenant` for the SPA (branding, enabled modules — never secrets).
- Admin CRUD for tenants comes later behind `adminMiddleware`; day one, records are written with `wrangler kv key put`.

## Steps

1. Define `siteConfigSchema` + `tenantConfigSchema` in `packages/types` (zod becomes a real dependency there).
2. Create `apps/web/src/site.config.ts` and refactor hardcoded branding/nav out of templates into it (shared step with Plan 02).
3. Add the `TENANTS` KV binding to `wrangler.jsonc`; implement lookup + merge + cache in the tenant middleware; add `/api/tenant`.
4. Wire module gating (Plan 01's tenant gate) to the merged config.
5. Document tenant provisioning in the maintenance guide (replacing its current "implementation pending" note).

## Done when

A second hostname pointed at the same Worker renders different branding and a different module set purely from a KV record; a site's own knobs all live in `site.config.ts`; nothing per-site is edited inside base-owned files.
