# ADR 004: Module packaging, sub-bases as presets, and the compatibility contract

**Date:** 2026-07-04
**Status:** Proposed

## Context

We expect divergent product families to grow on this base — motorsport (race management, club management) and personal life organizing are the two in sight. That brings three risks, and each one has burned similar platforms before:

1. Forking the base per family, and losing the shared foundation that made the base worth building.
2. One base carrying every family's code, bloating each user-facing install.
3. Independently evolving modules silently breaking against core.

## Decision

### Sub-bases are presets, not forks

A product family is expressed as a **preset package**: a dependency list over the shared module catalogue plus default configuration. `@app-base/preset-motorsport` depends on `@app-base/module-race-management` and `@app-base/module-club-management`; a personal-organiser preset pulls a different set. Core stays singular; families differ only in which modules they compose.

### Install size is controlled at build time

A site's manifest (its `site.config.ts` module list) determines what is imported. Client module route branches are loaded via dynamic `import()` so Vite emits a chunk per module and only referenced modules are bundled; worker routes are tree-shaken the same way. Modules a site doesn't list are not shipped, so the catalogue can grow without any install growing. (Per-*tenant* disable within one deployment is a runtime flag on top of this; per-*site* exclusion is the build-time mechanism.)

### One repo now, package boundaries always

Modules live in this monorepo as workspace packages (`packages/modules/<name>`). We split a module (or family) into an external repo only when its release cadence or ownership genuinely diverges from core. Because consumers depend on the *package name*, moving a package to another repo later is invisible to them. External repos inherit the same contract below.

### The compatibility contract

1. **Explicit module API version.** `@app-base/core` exports the module interface (`defineModule`, route/registry types, migration hooks). Its semver is the contract: breaking the module interface is a core major (pre-1.0: a minor, flagged in the changelog).
2. **Peer dependencies.** Every module declares `peerDependencies: { "@app-base/core": "<range>" }`. Incompatibility surfaces at install time, not in production.
3. **Compatibility test kit.** `@app-base/testing` exports a harness that mounts a module into a minimal core app (Workers pool vitest) and asserts the contract: routes mount, config schema parses, migrations apply cleanly to an empty D1, module boots with the module disabled/enabled per tenant. Every module runs it in CI.
4. **Matrix CI.** Module CI runs the kit against the oldest and newest core versions in its declared peer range. A preset's CI smoke-builds a site using the preset, catching cross-module conflicts (route collisions, table-name collisions).
5. **Changesets everywhere.** Version bumps and changelogs are generated per package; a core release notes which module API surfaces changed.

## Consequences

**Good:**
- Both families grow independently on one foundation; a fix to core reaches motorsport and personal sites as the same version bump.
- No install pays for modules it doesn't use.
- Compatibility is checked by machines (peer ranges + test kit + matrix), not by hoping.

**Trade-offs:**
- Real versioning discipline is required once anything is published — that's the price of external installs regardless.
- The test kit is upfront work before the first divergent module exists; without it, "always compatible" is unenforceable, so it is a prerequisite for the first sub-base, not optional polish.
- Presets add one indirection layer; kept honest by making them nearly config-only.

## Alternatives considered

- **Repo-per-module now:** maximal isolation, but at current scale it multiplies CI/release overhead and slows refactoring of the still-moving module API. Deferred, not rejected.
- **Runtime plugin loading (fetch module code dynamically):** avoids rebuilds but fights the Workers model (bundled deploys), complicates security review, and defeats tree-shaking. Rejected.
- **One mega-bundle with runtime flags only:** simplest mentally; blows out install size as the catalogue grows and ships every family's code to every user. Rejected.
