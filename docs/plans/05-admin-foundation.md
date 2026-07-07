# Plan 05 — Admin Foundation

**Status: Implemented** (2026-07-05) — with a design revision during build: the admin surface is hosted by the **dashboard module**, not a separate base-owned `/admin` shell, and surface mount points became site configuration ([ADR 007](../adr/007-dashboard-hosts-admin.md), which records the final design; see also [docs/features/admin.md](../features/admin.md)). Kept as the design record.

**Closes:** the unused-auth gap (adminMiddleware and role plumbing existed but guarded nothing) · **Enables:** Plan 06's content editing, future tenant CRUD
**Prereqs:** none — modules (01), settings (03) already landed.

## Problem

There was no admin surface. `adminMiddleware` (role check) and the CF Access auth flow had existed since ADR 002 but guarded nothing. Plan 06 needs list/edit/publish screens; tenant management (Plan 03's deferred admin CRUD) will need the same shell later.

## Design (as implemented)

### Module interface grows an optional admin surface

```ts
// worker module:  export const adminRoutes?: Hono<{ Bindings: AppBindings }>
//                 → mounted at /api/admin/<name> behind auth + role middleware
// client module:  export const adminPanel?: AdminPanel   (label, path, lazy loader)
//                 → registered in client/admin-panels.ts, composed by the dashboard
```

Both optional. Panel descriptors carry metadata only; components stay behind dynamic imports (one lazy chunk per panel — verified in build output).

### The dashboard hosts the backoffice (ADR 007)

The dashboard module's shell renders its own pages (Overview) plus a "Site content" sidebar group built from the registered panels. Its mount is site config (`mount: { path, host? }` in the manifest) — root, `/dash`, or a dedicated hostname. Worker admin plane: `authMiddleware` + `adminMiddleware` on `/api/admin/*`, `GET /api/admin/me` for the UI gate.

### Local development auth

`devAuthProvider` in `packages/auth` returns a fixed admin user, selected in `auth-provider.ts` behind `import.meta.env.DEV` (statically eliminated from production bundles). This replaces the never-implemented `CF_ACCESS_BYPASS` idea from the original installation guide.

## Verified

- `/api/admin/me` and `/api/admin/blog` return data under the dev provider; with the production provider forced, both 401 without CF Access headers while public routes stay 200.
- Dashboard renders at its default mount, at a remapped `/dash`, and *does not exist* (404) when host-pinned to a non-matching hostname.
- Bundle: `DashboardShell`, `Overview`, and blog's `AdminPanel` are separate lazy chunks; converting the dashboard out of the eager route tree shrank the public bundle ~70 kB minified.

## Done when — met

A module adds an admin panel by exporting two optional members; the dashboard composes them behind real auth in production and the dev provider locally; visitors who never open the dashboard download none of it.
