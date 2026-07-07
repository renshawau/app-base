# Plan 01 — Module Registry

**Status: Implemented** (2026-07-04) — see [docs/features/modules.md](../features/modules.md) for current behavior. Kept here as the design record.

**Closes:** G2 (module system documented but not implemented) · **Blocks:** presets, per-tenant features, install-size control
**Prereqs:** none — this is the first build item.

## Problem

[modules.md](../features/modules.md) documents a module interface nothing implements. The route tree in `apps/web/src/client/routes/__root.tsx` hardcodes five template pages; `apps/web/src/worker/modules/*` are empty directories; `ModuleConfig` is `{ enabled: boolean }`; there is no registration, gating, or code-splitting.

## Design

### Module definition (single object, both halves)

```ts
// packages/types (moves to @app-base/core when it exists)
export type ModuleDefinition = {
  /** unique slug; also the /api mount point and table prefix */
  name: string;
  /** hono router mounted at /api/<name>; omit for client-only modules */
  workerRoutes?: Hono;
  /** lazy TanStack route branch — dynamic import keeps it in its own chunk */
  clientRoutes?: (parent: AnyRoute) => AnyRoute[];
  /** zod schema for this module's per-tenant settings */
  settingsSchema?: ZodType;
  /** ordered SQL migrations, applied by the core runner (Plan 04) */
  migrations?: Migration[];
  defaults: { enabled: boolean };
};

export function defineModule(def: ModuleDefinition): ModuleDefinition;
```

### Registry

One file per site is the single source of truth for what ships:

```ts
// apps/web/src/modules.ts — the site manifest
import { blog } from "./modules/blog";        // static imports of definitions…
export const modules = [blog, portfolio];     // …but clientRoutes use dynamic import() internally
```

- **Worker:** `app.ts` iterates `modules`, mounting each `workerRoutes` at `/api/<name>` behind a tenant-gate middleware (404 when the tenant has it disabled).
- **Client:** the route tree is built from `modules`, each branch wrapped in `createLazyRoute`/dynamic `import()` so Vite emits one chunk per module. The definition object itself must stay tiny (metadata only) so importing it doesn't drag in module internals.
- **Tenant gating:** client reads enabled-modules from tenant config (Plan 03) to hide nav/routes; the worker gate is the authoritative check.

### Boundaries

- Module → core: only via the `defineModule` contract and core-exported helpers.
- Module → module: forbidden at v1. Cross-module needs become core extension points (events, shared services) — revisit when a real case appears.

## Steps

1. Extend `packages/types` with `ModuleDefinition`, `defineModule`, and the richer `ModuleConfig` (replacing the current stub type).
2. Create the registry: site manifest file, worker mounting loop with tenant gate, client route-tree builder with lazy branches.
3. Convert **blog** into the first real module end-to-end (worker routes + client branch + doc) — one module proves the pattern; don't batch-convert.
4. Convert the remaining template pages into modules or delete them (they are demo pages; keep `showcase` as the default index).
5. Verify chunking: `pnpm build`, confirm one client chunk per module and that removing a module from the manifest removes its chunk and worker routes.
6. Rewrite `docs/features/modules.md` to describe the *implemented* system (fixes half of G9); delete the empty `worker/modules/{crm,portfolio,blog}` stub dirs this obsoletes.

## Done when

A module can be added or removed from a site by editing only the manifest; a removed module contributes zero bytes to client and worker bundles; a disabled-per-tenant module 404s on its API and disappears from its nav.
