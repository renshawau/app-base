# Settings & Tenant Config

Three tiers, three owners, three lifecycles. The base owns every schema; sites and tenants only ever own values. That line matters more than it looks — it's what keeps configuration from slowly turning into code divergence.

| Tier | Lives in | Changed by | Examples |
|---|---|---|---|
| Deploy | `wrangler.jsonc`, secrets | deploy/CI | bindings, routes, API keys |
| Site (build-time) | `apps/web/src/site.config.ts` | site developer, in git | site name, tenancy mode, branding, module list |
| Tenant (runtime) | `TENANTS` KV, only under `tenancy: "multi"` | operator, no redeploy | per-tenant branding/module overrides |

## Site config

`apps/web/src/site.config.ts` is parsed once at worker startup against `siteConfigSchema` (`packages/types/src/config.ts`). A bad config fails fast at boot rather than silently falling back to defaults — you find out immediately, not three days later when something looks subtly wrong:

```ts
export const siteConfigSchema = z.object({
  name: z.string(),
  tenancy: z.enum(["single", "multi"]).default("single"),
  branding: brandingSchema,          // { name, nav[] } — see docs/features/theming.md
  modules: z.record(z.string(), moduleConfigSchema).default({}),
});
```

## Tenant resolution

`apps/web/src/worker/tenant.ts` resolves the `Tenant` for each request's Host header:

- **`tenancy: "single"`** (the default, and what today's one-deployment reality actually needs): every hostname resolves straight to the site config. KV never gets read.
- **`tenancy: "multi"`**: the worker looks up `tenant:<hostname>` in the `TENANTS` KV namespace, validates it against `tenantConfigSchema`, and merges it over the site config defaults. An unknown hostname 404s. Results are cached per isolate for 30 seconds.

The resolved `Tenant` — site defaults merged with any tenant override — is what the rest of the worker sees. Module gating (`apps/web/src/worker/app.ts`) checks `tenant.modules[name].enabled` and falls back to the module's own `defaultEnabled`.

## Client access

`/api/tenant` exposes the client-safe subset: name, branding, and enabled modules. Nothing else from the tenant record reaches the SPA, and that's deliberate. `useTenant()` (`apps/web/src/client/hooks/useTenant.ts`) fetches it — `BlogPage.tsx` shows the consumption pattern.

## Maintenance / coming-soon mode

`maintenance: { enabled, message?, logo? }` in `site.config.ts` (or per tenant in KV — flip a live tenant into maintenance without a redeploy). While enabled, unauthenticated visitors get a brand splash (colors + logo, themed via the `--site-splash-*` variables), and the worker 503s public module APIs so content is genuinely unavailable, not just hidden. Authenticated users — anyone the active auth provider recognizes — see the full site. Note for local dev: the dev auth provider authenticates everyone, so you'll always see the real site; the splash only shows where real auth runs.

## Adding a tenant

See the [maintenance guide](../guides/maintenance.md#tenant-management).

## Not yet implemented

- An admin UI for tenant CRUD. For now, records are written with `wrangler kv key put` — fine for day one, worth revisiting when tenant count grows.
- Per-module settings schemas (a module declaring its own typed settings, composed under its name). The `settingsSchema` field from the early design notes was never built; today each module just gets a coarse `{ enabled: boolean }`.
