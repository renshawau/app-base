# ADR 003: Distribution and update strategy for derived sites

**Date:** 2026-07-04
**Status:** Proposed

## Context

app-base exists to launch further apps. Sites derived from it fall into two models:

- **Model A — tenant:** a hostname served by the shared multi-tenant Worker. No new code; config only.
- **Model B — install:** a separate repository and Worker deployment, needed when a site diverges in code, is operated independently, or requires isolation.

Model A updates are trivial — one deploy updates every tenant. Model B has no update path today: the moment you copy the repo, you own an orphaned fork. The pattern underneath is simple: the more base code a derived repo *contains*, the more painful upstream merges become; the more it merely *depends on*, the closer an update gets to a version bump. Everything in this ADR is about moving code from the first category to the second.

## Decision

**Shrink what a derived install owns until base updates are dependency updates.** Two phases:

### Phase 1 (now) — template repo + upstream merges

1. app-base becomes a proper git repository with a remote, marked as a GitHub template.
2. A derived site is created from the template and adds `git remote add upstream <app-base>`.
3. Base updates: `git fetch upstream && git merge upstream/main`. Tag releases in app-base (`v0.x`) so sites merge known-good points, with a CHANGELOG noting breaking changes.
4. Derived sites confine their edits to designated files (wrangler.jsonc, theme, site config, own modules) to keep the merge surface small. Editing base internals in a derived repo is the anti-pattern; the fix belongs upstream.

### Phase 2 (as APIs stabilise) — packages-first

Extract the base's substance into versioned, published `@app-base/*` packages (npm private or public):

| Package | Contents |
|---|---|
| `@app-base/core` | Worker kernel: Hono app factory, tenant middleware, module registry, migration runner |
| `@app-base/auth` | AuthProvider interface + providers (already a package; needs versioning + build) |
| `@app-base/ui` | App shell, shared components, theming contract |
| `@app-base/types` | Shared types + config schemas |
| `@app-base/testing` | Compatibility test kit (see ADR 004) |
| `@app-base/module-*` | Feature modules |
| `@app-base/preset-*` | Curated module bundles for a product family |

A derived site then owns only: `wrangler.jsonc`, `theme.css`, `site.config.ts`, its private modules, and a thin entry file calling `createApp(siteConfig)`. Base updates become `pnpm update "@app-base/*"` plus reading the changelog. Versioning managed with changesets; packages get a build step (tsup or similar) and drop `private: true`.

The template repo remains — it just gets thinner as packages absorb the substance.

## Consequences

**Good:**
- Update cost scales with what a site customises, not with how much the base grows.
- Clear ownership line: base files vs. site files. Divergence becomes visible in the dependency graph instead of hidden in merge conflicts.
- Phase 1 requires almost no work and unblocks launching sites immediately.

**Trade-offs:**
- Phase 1 merges will hurt if sites edit base internals — discipline (and the new-site guide) must enforce the boundary.
- Phase 2 adds release overhead: builds, versioning, changelogs. Deferred until the module API stops churning, deliberately.
- Two models means every "new site" decision starts with A-or-B; the new-site guide makes that call explicit.

## Alternatives considered

- **Everything stays a fork, merge forever:** works for 1–2 sites, degrades quadratically with site count and base velocity. Rejected as the end state, accepted as Phase 1.
- **Monorepo hosts all sites (no derived repos):** attractive for wholly-owned sites — and remains available via Model A or an `apps/<site>` directory — but cannot serve independently operated installs. Not sufficient alone.
- **Publish immediately, skip the template phase:** premature; the module API (ADR 004) doesn't exist yet, and versioning an unstable API generates churn without consumers.
