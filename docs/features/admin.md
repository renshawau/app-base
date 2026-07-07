# Admin & the Dashboard

One backoffice per deployment ([ADR 007](../adr/007-dashboard-hosts-admin.md)): the **dashboard module** hosts everything admin — its own pages plus a panel for each content-bearing module. There's no separate `/admin` area, and that's a feature: one shell, one nav, one place to look.

## The permission plane

- `/api/admin/*` runs `authMiddleware` (pluggable provider, ADR 002) and then `adminMiddleware` (requires the `admin` role). Both are mounted in `apps/web/src/worker/app.ts` **before** any admin routes, so every module admin API inherits them — a module can't accidentally ship an unprotected admin endpoint.
- `GET /api/admin/me` returns the authenticated user. The dashboard shell uses it to gate the UI, but the middleware stays the authoritative check on every request — the UI gate is a convenience, not the security boundary.
- **Local dev:** `devAuthProvider` (`packages/auth/src/providers/dev.ts`) authenticates everyone as `dev@localhost` with the admin role. It's selected in `apps/web/src/worker/auth-provider.ts` behind `import.meta.env.DEV`, which gets replaced at build time — so the dev provider is statically eliminated from production bundles and can't leak. Production requires Cloudflare Access with an `admin` role claim.

## Giving a module an admin surface

Two optional exports:

```ts
// worker (apps/web/src/worker/modules/<name>/index.ts)
export const adminRoutes = new Hono<{ Bindings: AppBindings }>();  // → /api/admin/<name>

// client (apps/web/src/client/modules/<name>/index.ts)
export const adminPanel: AdminPanel = {
  module: meta.name,
  label: "Blog",
  path: "blog",                        // → <dashboard mount>/blog
  load: () => import("./AdminPanel"),  // file must export `Panel`
};
```

Register the panel in `apps/web/src/client/admin-panels.ts` — the base-owned mediator, so modules never import each other. The descriptor is metadata only; the component stays behind the dynamic import. That means each panel is its own lazy chunk, and public visitors download none of the admin code.

## Surface mounts

Every client surface declares `mount` in the manifest (`apps/web/src/modules.ts`):

```ts
dashboard: { ..., mount: { path: "/dashboard" } }              // default
dashboard: { ..., mount: { path: "/dash" } }                   // marketing takes "/"
dashboard: { ..., mount: { path: "/", host: "dash.site.com" } } // own hostname
```

The rules: exactly one surface owns `/` per host; a `host`-pinned surface's routes only exist on that hostname (the registry checks `window.location.host` at boot); and the worker's `/api/...` paths are mount-agnostic. Because mounts are runtime config, cross-surface links use plain paths and anchors rather than the typed router's literal `to` values — the router can't know at compile time where a surface will be mounted.

## Current panels

| Panel | Module | State |
|---|---|---|
| Overview | dashboard (native) | demo application data, replaced when a real CRM/analytics module lands |
| Blog | blog | read-only content listing (posts) via the shared `ContentAdminPanel` — see [content.md](./content.md) |
| Pages | pages | read-only listing of marketing page sections |
| Portfolio | portfolio | read-only listing of the projects + profile collections |

Content panels are read-only by design since [ADR 008](../adr/008-content-simplification-file-first.md) — the admin shows publication state and source paths, and editing happens in the repo.
