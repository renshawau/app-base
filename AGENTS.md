# AGENTS.md

Primary coding guidance for all agents working in this repo.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers |
| Language | TypeScript (strict) |
| Backend router | Hono |
| Frontend framework | React + TanStack Router |
| UI library | @cloudflare/kumo + Tailwind CSS 4.x |
| Icons | @phosphor-icons/react |
| Build | Vite + @cloudflare/vite-plugin |
| Testing | @cloudflare/vitest-pool-workers |
| Auth | Pluggable `AuthProvider` interface (default: Cloudflare Zero Trust JWT) |
| Config | wrangler.jsonc |
| Package manager | pnpm workspaces |

## Repo Layout

```
apps/web/          — deployable Worker + SPA
packages/auth/     — AuthProvider interface + default Cloudflare Access provider
packages/types/    — shared TypeScript types
docs/              — living documentation
```

## Rules

- Comments explain **why**, not what. Keep them short and forward-looking.
- No unused code, no backwards-compat shims, no speculative abstractions.
- Documentation reflects **current state only**. Major design changes go in `docs/adr/`.
- When a gap in these rules is corrected during a session, update this file (or the relevant doc) before closing.

## Auth Flow

Authentication is provider-based, not hardcoded to one mechanism. `packages/auth/src/types.ts` defines the `AuthProvider` interface (`authenticate(request, env) => AuthUser | null`); `apps/web/src/worker/middleware/auth.ts` is provider-agnostic and only calls whatever provider is wired up.

- Default provider: `packages/auth/src/providers/cloudflare-access.ts` — validates the CF Access JWT (`Cf-Access-Jwt-Assertion` header) and user email (`CF-Access-Authenticated-User-Email` header). All requests pass through Cloudflare Zero Trust before reaching the Worker.
- Active provider is selected in one place: `apps/web/src/worker/auth-provider.ts`.
- To add a provider (session cookie, OAuth bearer, API key): implement `AuthProvider` in `packages/auth/src/providers/<name>.ts`, export it from `packages/auth/src/index.ts`, then swap the import in `auth-provider.ts`. No middleware changes needed.
- `apps/web/src/worker/middleware/admin.ts` is a **separate** middleware applied only to admin routes, operating only on `user.roles` — agnostic to which provider authenticated the user. Never conflate the two.
- See `docs/adr/002-pluggable-auth-providers.md` for the rationale.

## Multi-Tenant Routing

A single Worker serves all tenants. The Worker reads the `Host` header in `apps/web/src/worker/app.ts` to resolve the active tenant, then injects tenant config into the Hono context for downstream handlers.

## Module Pattern

Each feature (portfolio, blog, crm, dashboard) is a self-contained module that exports:

```ts
export const clientRoutes  // TanStack Router route branch
export const workerRoutes  // Hono router mounted at /api/<module>
export const config        // capability flags (for per-tenant enable/disable)
```

Server modules live in `apps/web/src/worker/modules/<name>/`.
Client modules live in `apps/web/src/client/modules/<name>/`.

## wrangler.jsonc

Always keep these enabled:
- `observability.enabled: true`
- `upload_source_maps: true`
- `compatibility_flags: ["nodejs_compat"]`

## Documentation

- `docs/README.md` — project overview
- `docs/architecture/` — system design docs
- `docs/features/` — per-feature documentation
- `docs/guides/` — installation, maintenance, contributing, new-site
- `docs/adr/` — Architectural Decision Records (one file per decision, numbered)
- `docs/plans/` — forward-looking gap-closure plans (sanctioned exception to the current-state rule; each names the gap it closes and is folded into features/ or deleted when done)
- `docs/review/` — point-in-time base reviews / gap analyses

## ADR Process

When a significant design decision is made:
1. Create `docs/adr/NNN-short-title.md`
2. Record: context, decision, consequences
3. Do not retroactively edit ADRs — supersede them with a new one if needed
