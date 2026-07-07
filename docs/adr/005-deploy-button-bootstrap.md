# ADR 005: Deploy to Cloudflare button as the deployment bootstrap

**Date:** 2026-07-05
**Status:** Accepted (one platform behavior pending verification — see below)

## Context

The base needs a way to go from "public repo" to "running Worker with real D1/KV resources" without committing account-specific resource IDs to git. This applies both to us (the canonical deployment) and to anyone creating a Model-B install. Review #2's N3 originally proposed creating resources manually and pasting IDs into `wrangler.jsonc` — rejected because those IDs are account-specific and would leak into every clone of the template.

## Decision

Adopt the [Deploy to Cloudflare button](https://developers.cloudflare.com/workers/platform/deploy-buttons/) as the primary deployment bootstrap:

- The root `README.md` carries the button, pointed at the **repo root** (URL filled in at first push).
- `wrangler.jsonc` keeps **placeholder IDs** (`local-dev-placeholder`) for the TENANTS KV namespace and DB D1 database. Local dev ignores them; the deploy flow provisions real resources in the deployer's account and rewrites them. The docs require default values to be present for exactly this purpose — the placeholders are the rewrite targets.
- Root `package.json` declares `build` and `deploy` scripts, which the deploy flow auto-detects and pre-populates. `deploy` runs wrangler from `apps/web` so the vite-plugin's deploy-config redirect (`.wrangler/deploy/config.json` → generated `dist/.../wrangler.json`) is honoured — verified working via `wrangler deploy --dry-run`.
- The GitHub Actions deploy step is now **conditional on `CLOUDFLARE_API_TOKEN` being set**: button-created repos deploy via Workers Builds and must not double-deploy or show failing CI; typecheck + build still run for everyone.

## Constraints (from the platform docs)

- Public GitHub/GitLab repos only — the button is inert until this repo is pushed publicly.
- A button URL pointing at a **subdirectory** requires the app to be fully isolated there, including dependencies. `apps/web` depends on `workspace:*` packages, so a subdirectory button is not an option — the root-pointed button is the only viable shape, which also matches the template's intent (deployers get the whole monorepo).
- One button per Worker; if the base ever ships multiple deployable Workers, each needs its own button.

## Pending verification (at first push)

The docs don't specify whether the provisioning step discovers `apps/web/wrangler.jsonc` from a root-pointed URL. If it doesn't: fall back plan is moving the wrangler config to the repo root with root-relative paths and pointing the vite plugin at it via `cloudflare({ configPath })`. Verify with a test-account deploy immediately after the repo goes public, and update this ADR's status line with the outcome.

## Consequences

**Good:**
- No account IDs, resource IDs, or tokens in git — ever. Each deployer (including us) gets isolated resources in their own account.
- The Model-B "new install" path collapses to one click plus theming/config, replacing manual `wrangler kv namespace create` / `d1 create` steps.
- Migrations still apply automatically on first request (Plan 04's lazy runner), so a button deploy reaches a working schema with zero manual steps.

**Trade-offs:**
- Two deploy paths exist (Workers Builds for button repos, the guarded Action for manual setups); docs must say when each applies.
- The provisioning-discovery question can't be answered until the repo is public; until verified, the button is a documented intention, not a tested feature.
