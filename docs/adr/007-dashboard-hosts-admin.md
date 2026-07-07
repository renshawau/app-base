# ADR 007: One dashboard per deployment, with site-configurable surface mounts

**Date:** 2026-07-05
**Status:** Accepted (amends the "base-owned `/admin` shell" detail of ADR 006)

## Context

ADR 006 assumed a base-owned `/admin` shell separate from the dashboard template. In discussion a better model emerged: **the deployment is one app — "the dashboard" — with public surfaces (blog, marketing pages) hanging off it.** The dashboard was always intended as the backoffice, will grow its own sub-modules (CRM sections, analytics), and site-content admin (blog, marketing) belongs inside it. Two shells would be one too many.

That raises a routing question: if a marketing module is enabled, the site root should be the marketing page and the dashboard should move aside (`/dash`), or live on its own hostname (`dash.site.com` while `site.com` serves marketing). So mount locations are **site configuration, not code**.

## Decision

### One backoffice, hosted by the dashboard module

- **Core owns the mechanism, never the UI**: the admin-panel registry (`client/admin-panels.ts`, descriptor type in `client/admin-panel.ts`), optional `adminRoutes` on worker modules mounted at `/api/admin/<module>`, and the permission plane (`authMiddleware` + `adminMiddleware` on `/api/admin/*`, plus `/api/admin/me`).
- **The dashboard module owns the backoffice experience**: the shell (sidebar, header, auth gate), its own native pages (Overview now, CRM sub-modules later as nested routes), and a "Site content" section composed from every registered module admin panel.
- **Modules never import each other**: blog registers a panel descriptor (label, path, lazy loader) with the base-owned registry; the dashboard reads the registry. Descriptors carry metadata only — panel components stay behind dynamic imports, one lazy chunk per panel.
- **Naming stays split deliberately**: the dashboard surface is wherever it's mounted; `/api/admin/*` is the authorization plane. A headless site can ship admin APIs without the dashboard module.

### Surface mounts are site configuration

Every client surface declares a `mount` in the site manifest (`apps/web/src/modules.ts`):

```ts
blog:      { ..., mount: { path: "/blog" } },
dashboard: { ..., mount: { path: "/dashboard" } },
// site remaps freely:
dashboard: { ..., mount: { path: "/dash" } },                          // marketing takes "/"
dashboard: { ..., mount: { path: "/", host: "dash.example.com" } },    // own hostname
```

- The client registry resolves mounts at boot: a surface with `mount.host` only registers its route branch when `window.location.host` matches — on any other host the branch does not exist (404), verified live both ways.
- Exactly one surface may own `/` per host; the site manifest is where that's decided. A site with marketing enabled mounts it at `/` and moves the dashboard; a pure backoffice site mounts the dashboard at `/`.
- The worker is mount-agnostic: APIs stay at `/api/...` regardless of where client surfaces sit, and the SPA is served on every host (tenant resolution already happens per-hostname).
- Trade-off accepted: mount paths are runtime values, so TanStack's compile-time typed links can't know them — cross-surface links use plain paths (see showcase).

### Local development auth

A `devAuthProvider` (ADR 002's pluggable auth earning its keep) authenticates as a fixed admin, selected behind `import.meta.env.DEV` so it is statically eliminated from production bundles. Production authenticates via Cloudflare Access with an `admin` role claim. Verified: dev identity works locally; with the production provider forced, `/api/admin/*` returns 401 while public routes are unaffected.

## Consequences

**Good:**
- One backoffice, one navigation, one mental model; dashboard sub-modules and cross-module admin panels compose through the same sidebar.
- The same deployment serves `site.com` (marketing) and `dash.site.com` (backoffice) purely by manifest config — no second Worker, no second repo.
- Verified bundle effect: converting the dashboard to a lazy module *shrank* the public bundle ~70 kB minified; visitors download zero admin code, and each admin panel is its own chunk.

**Trade-offs:**
- A site without the dashboard module has admin APIs but no admin GUI — acceptable; the dashboard is the standard module for any site that wants one.
- The panel registry is a mild god-object (it imports every module's panel descriptor); kept harmless by the metadata-only rule.
- Typed-router literal paths are lost for module surfaces (above).
