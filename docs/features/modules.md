# Module System

Modules are self-contained features (currently: blog, dashboard) that a site opts into via its manifest. Worker routes, client routes, admin surfaces, and migrations only get bundled and mounted if the module is listed — nothing you don't ask for comes along for the ride.

## The manifest

`apps/web/src/modules.ts` is the single source of truth for what a site ships and where its surfaces mount:

```ts
export const moduleMeta: Record<"blog" | "dashboard", ClientModuleMeta> = {
  blog:      { name: "blog",      defaultEnabled: true, mount: { path: "/blog" } },
  dashboard: { name: "dashboard", defaultEnabled: true, mount: { path: "/dashboard" } },
};
```

This file is deliberately dependency-free — no Hono, no React — so both the worker and client registries can import it without pulling the other realm's code into their bundle. `ModuleMeta`/`ClientMount` live in `packages/types`.

**Mounts are site configuration** ([ADR 007](../adr/007-dashboard-hosts-admin.md)): `path` moves a surface (`/dash`), `host` pins it to a hostname (`dash.site.com`), and exactly one surface may own `/` per host. The client registry skips host-pinned branches on non-matching hosts at boot; the worker's `/api/...` paths don't care about mounts at all.

## Worker side

`apps/web/src/worker/modules/<name>/index.ts` exports:

```ts
export const meta = moduleMeta.<name>;                       // re-exported for convenience
export const routes: Hono<{ Bindings: AppBindings }>;        // mounted at /api/<name>
export const adminRoutes?: Hono<{ Bindings: AppBindings }>;  // optional → /api/admin/<name>, behind auth + role
export const migrations: ModuleMigration[];                  // ordered, forward-only (docs/features/data.md)
```

`apps/web/src/worker/modules.ts` lists every worker module (typed `WorkerModule`). `app.ts` mounts each one inside its own gated sub-app; the gate consults the resolved tenant's module config, with the module's `defaultEnabled` as the fallback:

```ts
const enabled = c.get("tenant").modules[mod.meta.name]?.enabled ?? mod.meta.defaultEnabled;
if (!enabled) return c.notFound();
```

Disabled modules 404. They're never "hidden" — from that request's point of view, they simply don't exist. `AppBindings` (`worker/bindings.ts`) is the shared env type; modules type their Hono instances with it so registry composition stays type-compatible.

Content-bearing modules also export `collections` (name + frontmatter schema); their markdown lives in the site-owned tree at `apps/web/content/<module>/<collection>/` (ADR 008). **Removing a module means also deleting its `content/` subtree** — orphaned files fail boot loudly, because their collection is no longer declared.

## Client side

`apps/web/src/client/modules/<name>/index.ts` exports:

```ts
export const meta = moduleMeta.<name>;

export function registerRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: meta.mount.path,
    component: lazyRouteComponent(() => import("./<Name>Page"), "<Name>Page"),
  });
}

// optional admin panel, composed into the dashboard (docs/features/admin.md)
export const adminPanel?: AdminPanel;
```

`lazyRouteComponent` is what makes this a real module boundary, not just a naming convention: the page component is only reachable via dynamic `import()`, so Vite emits it as its own chunk. A module removed from the registries contributes **zero bytes** to the client bundle — we've verified this by removing the blog entry and rebuilding.

`apps/web/src/client/modules.ts` lists every client module and builds the route branches (with host filtering) that `__root.tsx` consumes. Admin panels register separately in `apps/web/src/client/admin-panels.ts`.

## Adding a module

1. Add an entry (with `mount`) to `moduleMeta` in `apps/web/src/modules.ts`.
2. Create `apps/web/src/worker/modules/<name>/index.ts` — Hono routes plus `migrations: []`, and optionally `adminRoutes`.
3. Add it to `workerModules` in `apps/web/src/worker/modules.ts`.
4. Create `apps/web/src/client/modules/<name>/<Name>Page.tsx` and `apps/web/src/client/modules/<name>/index.ts` (the lazy route factory; optionally an `AdminPanel.tsx` and `adminPanel` descriptor).
5. Add it to `clientModules` in `apps/web/src/client/modules.ts` (and `adminPanels` in `admin-panels.ts` if it has one).
6. Add a feature doc under `docs/features/<name>.md`.

## Removing a module

Delete its entries from `moduleMeta`, `workerModules`, and `clientModules` (plus `admin-panels.ts`), then delete its directories — and if it's a content module, its subtree under `apps/web/content/` too. No other file references a module by name, so that's genuinely the whole list.

## Not yet implemented

- **Per-module settings schema** — modules don't yet declare a `settingsSchema`; only the coarse `{ enabled }` per tenant exists today.
- **Cross-module composition** — modules can't depend on each other. If a real case shows up, it becomes a core extension point (the admin-panel registry is the pattern to copy), not a module-to-module import.
- **showcase** is still the base's demo landing page (a plain route at `/`); a derived site typically replaces it by mounting a module at `/`.
