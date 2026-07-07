# Base Review — July 2026

> **Update (2026-07-04):** G2, G5, G6, G7, G8, and the modules.md half of G9 are now closed — see [Plan 01](../plans/01-module-registry.md), [03](../plans/03-settings-and-tenant-config.md), [04](../plans/04-data-and-migrations.md), [02](../plans/02-theming.md) (each now marked `Status: Implemented`) and the corresponding docs under `docs/features/`. G1's immediate action (`git init` + first commit) is also done. This was deliberately scoped to the current codebase only: G3/G4/G11 (distribution, packaging, versioning) and G5's deploy-time CI step remain open — they depend on the repo actually being distributed to a second site, which hasn't started. The analysis below is left as-written; it was accurate at review time.

A point-in-time review of app-base as a foundation for launching further apps. Answers the standing questions about updates, divergence, modularity, and the new-site experience; ends with a gap analysis and links to the plans that close each gap.

**Status legend:** ✅ exists and works · 🟡 designed/documented but not implemented · 🔴 missing

## 1. How do downstream sites receive base updates?

There are two distinct ways to "launch a site off the base", and they have completely different update stories. The base currently conflates them.

**Model A — tenant on the shared Worker.** The base is multi-tenant by hostname: one deployment serves many domains. A "new site" is just a tenant record plus config. Updates are free — deploy once, every tenant gets it. This is the right model for sites *we* run that share one codebase and release cadence.

**Model B — separate install.** A fork/copy of the repo with its own Worker, its own wrangler.jsonc, its own data. Required when a site diverges in code (not just config), is operated by someone else, or must be isolated. This is where the update problem lives, and today there is **no strategy at all** — the working copy is not even a git repository, so there is no upstream to pull from.

**Direction (see [ADR 003](../adr/003-distribution-and-update-strategy.md)):** shrink what a downstream install owns until updates are mostly `pnpm update`. Short term: template repo + `git remote add upstream` merges. Medium term: extract the base's substance (worker core, module registry, auth, UI shell, theming contract) into versioned `@app-base/*` packages so a site is a thin shell — wrangler config, theme tokens, site config, module selection — and the merge surface approaches zero.

Current state: 🔴 no git repo, no upstream workflow, packages are `private: true` and unversioned.

## 2. Divergent streams (motorsport base vs. personal-organiser base)

The question is how to grow two product families without either forking the base twice or bloating every install with both families' code.

**Answer: sub-bases should be *presets*, not forks.** A sub-base is a named bundle of the core plus a curated module set:

- `@app-base/core` — worker kernel, registry, auth, theming contract
- Modules: `@app-base/module-race-management`, `@app-base/module-club-management`, `@app-base/module-life-planner`, …
- Presets: `@app-base/preset-motorsport`, `@app-base/preset-personal` — little more than a dependency list + default config

**Install size does not blow out** because inclusion is decided at build time: a site's manifest imports only the modules it uses; Vite code-splits client modules per route branch and tree-shakes the worker bundle. A motorsport site never ships a gram of life-planner code. This works only once the module registry is real (today the route tree hardcodes all pages — see gap G2).

**External repos?** Not yet. Keep everything in this monorepo publishing multiple packages until (a) a module's release cadence diverges from core, or (b) ownership differs. Premature repo-splitting multiplies CI, versioning, and review overhead for zero benefit at current scale. The package boundary is what matters; the repo boundary can follow later without breaking consumers.

**Compatibility** is a contract problem, not a repo problem: modules declare `peerDependencies` on `@app-base/core` semver ranges, core versions its module API explicitly, and CI runs each module against the core versions it claims to support. Details in [ADR 004](../adr/004-module-packaging-and-compatibility.md).

## 3. Does the current model actually enable modularity?

The *design* does; the *implementation* doesn't yet.

What's real today: pluggable auth (✅ genuinely modular — interface, default provider, single swap point), hostname tenant middleware (🟡 resolves `Host` but tenant config is a stub `{ id: host, domain: host }`), monorepo shared packages (✅).

What's aspirational: [modules.md](../features/modules.md) documents a module interface (`clientRoutes` / `workerRoutes` / `config`) that **nothing implements**. `apps/web/src/worker/modules/{blog,crm,portfolio}` are empty directories; the client has no modules directory; `__root.tsx` hardcodes five template pages; `ModuleConfig` is just `{ enabled: boolean }`; there is no registry, no per-tenant gating, no lazy loading. The docs describe the destination as if it were the current state — that drift should be fixed regardless (docs rule: current state only).

Verdict: the skeleton is right and nothing structural blocks the modular vision, but the module system is the single most important unbuilt piece. Everything else in this review (presets, per-tenant features, install size) depends on it. Plan: [module registry](../plans/01-module-registry.md).

## 4. Starting a new site on the base

There is no defined process today. The target process (steps marked with the plan that unblocks them) is written up as a guide in [guides/new-site.md](../guides/new-site.md); summary:

1. Decide Model A (tenant) or Model B (install).
2. Model A: add tenant record + config, provision hostname. Model B: clone template, add `upstream` remote, set wrangler name/routes.
3. Pick modules (preset or à la carte) in the site manifest.
4. Override theme tokens — one file, never component code.
5. Fill in the typed site config.
6. Deploy; migrations run against the site's D1.

**Theming without divergence** (🔴 today: `app.css` just imports Kumo + Tailwind, zero override points): the contract is *sites override tokens, never components*. A single `theme.css` redefining CSS custom properties (brand colours, radii, fonts) over the Kumo/Tailwind token layer, plus a small set of config-driven slots (logo, product name, nav). If a site needs to fork a component, that's a signal the base needs an extension point — upstream it. Plan: [theming](../plans/02-theming.md).

**Settings** (🔴 nothing exists): three tiers with different owners and lifecycles — (1) deploy config in `wrangler.jsonc`/secrets, (2) build-time site config in a typed `site.config.ts` validated by a zod schema the base owns, (3) runtime tenant settings in KV/D1, eventually editable via an admin UI. The base owns schemas; sites own values — that's what keeps settings from becoming divergence. Plan: [settings & tenant config](../plans/03-settings-and-tenant-config.md).

**Data & upgrades** (🔴 no D1/KV/R2 bindings, no schema, no migration story): D1 database per install; each module owns its tables (`<module>_` prefix) and ships ordered migrations inside its package; a base-owned runner tracks applied migrations per module, so updating a module package automatically brings and applies its schema changes. This is the mechanism that makes "update the base under a live site" safe. Plan: [data & migrations](../plans/04-data-and-migrations.md).

## Gap analysis

| # | Gap | Severity | Why it matters | Closed by |
|---|---|---|---|---|
| G1 | Working copy is not a git repository | **Critical** | No history, no upstream, no update path of any kind; CI deploy workflow exists but can never trigger | Immediate action (below) |
| G2 | Module system documented but not implemented | **Critical** | Blocks presets, per-tenant features, install-size control — the core promise of the base | [Plan 01](../plans/01-module-registry.md) |
| G3 | No distribution/update strategy for downstream installs | High | Every derived site becomes an orphaned fork | [ADR 003](../adr/003-distribution-and-update-strategy.md) |
| G4 | No module compatibility contract or versioning | High | Divergent streams will silently break against core | [ADR 004](../adr/004-module-packaging-and-compatibility.md) |
| G5 | No data layer, no migrations | High | Sites can't store anything; upgrades of live sites undefined | [Plan 04](../plans/04-data-and-migrations.md) |
| G6 | Tenant config is a stub (no KV/D1 lookup) | High | Multi-tenancy is nominal; no per-tenant modules/branding | [Plan 03](../plans/03-settings-and-tenant-config.md) |
| G7 | No theming layer / override points | Medium | First real site will fork components to restyle, and divergence starts | [Plan 02](../plans/02-theming.md) |
| G8 | No typed site/settings schema | Medium | Config becomes ad-hoc edits to base files | [Plan 03](../plans/03-settings-and-tenant-config.md) |
| G9 | Doc drift: modules.md describes unbuilt system; installation.md documents a `CF_ACCESS_BYPASS` flag that doesn't exist in code | Medium | Violates "docs reflect current state"; misleads the next builder | Fix when G2 lands / remove flag doc |
| G10 | No tests, CI runs typecheck only | Medium | Compatibility promises (G4) are unverifiable without a test kit | [ADR 004](../adr/004-module-packaging-and-compatibility.md) |
| G11 | Packages unversioned, export raw TS | Low (now) | Fine in-monorepo; blocks publishing when packages-first lands | [ADR 003](../adr/003-distribution-and-update-strategy.md) |

## Recommended sequence

1. **Now:** `git init`, push to a remote, mark the repo as a GitHub template (G1). Fix doc drift (G9).
2. **Next:** implement the module registry with one real module end-to-end (G2) — everything else stacks on it.
3. **Then, in order:** tenant config store + settings schema (G6/G8), data + migrations using that first module (G5), theming layer (G7).
4. **Before the first Model-B site ships:** adopt changesets/versioning and the compatibility test kit (G3/G4/G10/G11).

## Documents produced by this review

- [ADR 003 — Distribution and update strategy](../adr/003-distribution-and-update-strategy.md) *(proposed)*
- [ADR 004 — Module packaging and compatibility](../adr/004-module-packaging-and-compatibility.md) *(proposed)*
- [Plan 01 — Module registry](../plans/01-module-registry.md)
- [Plan 02 — Theming](../plans/02-theming.md)
- [Plan 03 — Settings and tenant config](../plans/03-settings-and-tenant-config.md)
- [Plan 04 — Data and migrations](../plans/04-data-and-migrations.md)
- [Guide — Starting a new site](../guides/new-site.md)
