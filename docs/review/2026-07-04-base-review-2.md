# Base Review #2 — 4 July 2026 (post-implementation)

> **Update (2026-07-05):** N1, N2, and N5 are closed (background fixes merged, toolchain pinned to real versions, hygiene done). N3 is **superseded** rather than done — instead of pasting real resource IDs into the repo, deployment bootstraps via the Deploy to Cloudflare button, which provisions D1/KV in the deployer's account and rewrites the placeholders ([ADR 005](../adr/005-deploy-button-bootstrap.md)). N4's content half awaits the template rewording pass.

Follow-up to [the July 2026 review](./2026-07-base-review.md), taken after the four gap-closure plans were implemented in this codebase. That review's analysis stands; this one records what the base actually is now, what was verified working, what remains open, and what surfaced during the work.

**Status legend:** ✅ exists and verified working · 🟡 partial / known caveat · 🔴 missing

## What the base is now

Six commits of history, working tree clean. The three promises that were documentation-only at the last review are now running code:

| Capability | Status | Verified by |
|---|---|---|
| Module registry (manifest → worker mount + lazy client route) | ✅ | Removing blog from the manifest drops its API routes and its client chunk (`BlogPage-*.js`) from the build entirely; disabled module 404s |
| Per-module code-splitting | ✅ | Blog ships as its own ~12 kB chunk; main bundle size unchanged by module count |
| Typed site config (`site.config.ts` + zod schema in `@app-base/types`) | ✅ | Bad config fails at worker startup; schema owns the shape, site owns values |
| Tenant resolution (`single` / `multi` tenancy, TENANTS KV, 30s isolate cache) | ✅ | `single`: every host resolves to site config. `multi`: unknown host 404s. Both exercised against the dev server |
| Per-tenant module gating | ✅ | Gate checks merged `tenant.modules[name].enabled`, falls back to module default |
| `/api/tenant` client-safe subset + `useTenant()` hook | ✅ | Blog header renders `branding.name` from config, not a hardcoded string |
| D1 data layer + module-owned forward-only migrations + ledger runner | ✅ | Fresh DB gets full chain; DB seeded at migration 1 picked up migration 2 on next boot without re-run or error; blog GET/POST hit real tables |
| Theming via unlayered token overrides (`theme.css`) | ✅ | Full rebrand (brand colour, radius, site name) done with only `theme.css` + `site.config.ts`, screenshotted, reverted — zero component edits |
| Pluggable auth (unchanged from review #1) | ✅ | — |
| Docs describe current state | ✅ | `features/{modules,settings,data,theming}.md` written from the implemented system; plan docs marked `Status: Implemented` |

Architecture shape: a derived site's ownership boundary is now real and small — `wrangler.jsonc`, `site.config.ts`, `theme.css`, `modules.ts` + its own module directories. Everything else is base internals a site shouldn't touch. That was the review #1 target for Model B sites, and the files now exist to point at.

## Updated gap table

| # | Gap (from review #1) | Then | Now |
|---|---|---|---|
| G1 | Not a git repository | 🔴 | 🟡 Local repo with per-plan history. **No remote** — history exists on one disk only; deploy workflow still can't trigger |
| G2 | Module system unimplemented | 🔴 | ✅ Closed |
| G3 | No distribution/update strategy | 🔴 | 🔴 Open by design (ADR 003 proposed; starts when a second site exists) |
| G4 | No compatibility contract/versioning | 🔴 | 🔴 Open by design (ADR 004 proposed) |
| G5 | No data layer/migrations | 🔴 | ✅ Closed, except deploy-time migrate step (needs CI; lazy request-time runner is the documented fallback, with a known cold-start race that idempotent DDL absorbs) |
| G6 | Tenant config stub | 🔴 | ✅ Closed |
| G7 | No theming layer | 🔴 | ✅ Closed |
| G8 | No typed settings schema | 🔴 | ✅ Closed |
| G9 | Doc drift | 🟡 | ✅ Closed |
| G10 | No tests; CI = typecheck only | 🔴 | 🔴 Still zero test files, despite vitest-pool-workers being configured. Now more pressing: the migration runner and tenant merge logic are exactly the kind of code that should be pinned by tests |
| G11 | Packages unversioned, raw TS | 🟡 | 🟡 Unchanged; blocks nothing until packages-first (ADR 003 phase 2) |

## New findings (surfaced during implementation)

- **N1 — `pnpm typecheck` fails repo-wide (37 errors).** All from `@cloudflare/kumo` being pinned as `"latest"` in `apps/web/package.json`: the installed 2.6.0 API drifted from what the demo templates were written against (`className` on `Text`, `isActive` vs `active`, required `aria-label`, etc.). Consequence: the deploy workflow's typecheck gate would fail, so **the base cannot currently deploy via CI even once a remote exists**. Fix in flight as a background task; the durable lesson is to pin Kumo (and `@cloudflare/vite-plugin`, `@cloudflare/vitest-pool-workers`, also on `latest`) to real versions and update deliberately.
- **N2 — wrangler CLI is broken in this checkout.** The `wrangler` package directory is simply absent from `node_modules/.pnpm/wrangler@4.105.0…/` despite being lockfile-resolved, so `pnpm exec wrangler …` dies with MODULE_NOT_FOUND. The embedded dev server (vite-plugin's miniflare) works fine, which is why development never noticed. Blocks: KV/D1 seeding from the shell, secrets, manual deploy. Fix in flight as a background task (likely `allowBuilds` policy or making wrangler an explicit devDependency).
- **N3 — placeholder binding IDs.** `wrangler.jsonc` carries `"local-dev-placeholder"` for both the TENANTS KV namespace and the D1 database. Deliberate (local emulation ignores them) and commented in-file, but they are a hard prerequisite step before the first real deploy: `wrangler kv namespace create TENANTS`, `wrangler d1 create app-base-web`, paste IDs.
- **N4 — demo templates are the main liability surface.** `portfolio/dashboard/site/showcase` are design-system demo pages, not modules — documented as such — but they own all 37 typecheck errors and all remaining hardcoded branding ("Acme Corp"). Options when convenient: fix their props (N1 task does this), or thin them down to a single showcase page.
- **N5 — minor hygiene.** `techstach.md` at the repo root (typo'd, pre-dates AGENTS.md, content superseded by it) and the committed `test-results/.last-run.json` are both deletable.

## Recommended next actions, in order

1. **Push to a remote** (and mark as template). Six commits of real work exist on one machine; this is now the single largest risk and it's a five-minute task. Closes the rest of G1 and arms the deploy workflow.
2. **Land the two in-flight fixes** (N1 Kumo drift, N2 wrangler CLI), then pin all `"latest"` dependencies to versions.
3. **First tests (G10).** Highest-value targets, all pure and cheap to test with the existing vitest-pool-workers setup: migration runner (fresh chain, partial upgrade, ledger idempotence), tenant merge (`single`/`multi`, override precedence, unknown host), site-config schema rejection. These same tests seed ADR 004's compatibility kit later.
4. **Deploy once for real** — create KV/D1, replace placeholder IDs (N3), `wrangler deploy`, confirm migrations run against production D1.
5. **Stop.** G3/G4/G11 (distribution, packaging, versioning, presets) stay parked until a second site or sub-base actually starts — per the agreed scoping, building them now would be speculative.

## Where this leaves the original questions

- *"How do we maintain a derived site?"* — the ownership boundary is now enforced by real files, so review #1's answer (template + upstream now, packages later) is executable the day the repo has a remote.
- *"Sub-bases without install bloat?"* — mechanically proven: module inclusion is build-time and a removed module costs zero bytes. Presets remain a packaging exercise on top (ADR 004), not new architecture.
- *"Is it actually modular?"* — yes, with one real module proving the pattern end-to-end (routes, gating, data, migrations, branding). The honest caveat: **one** module. The pattern's first true test is the second, data-heavier module — worth choosing deliberately (e.g. race-management would exercise auth-gated writes and richer schema).
- *"New-site process?"* — [guides/new-site.md](../guides/new-site.md) now has only two `[planned]` markers left (presets; deploy-time migrations), both blocked on distribution work, not on the base.
