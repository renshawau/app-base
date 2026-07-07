# Architecture Overview

## High-level design

```
Browser
  │
  ▼
Cloudflare Zero Trust (auth proxy)
  │  Injects: Cf-Access-Jwt-Assertion, CF-Access-Authenticated-User-Email
  ▼
Cloudflare Worker (Hono)
  ├── Reads Host header → resolves Tenant
  ├── authMiddleware   → delegates to the active AuthProvider, sets user on context
  ├── adminMiddleware  → role check (admin routes only)
  ├── /api/*           → JSON API routes (per-module Hono routers)
  └── *                → serves static SPA assets via ASSETS binding
```

## Request lifecycle

A request flows through five stages:

1. It arrives at the Worker, having already passed through Cloudflare Zero Trust.
2. Tenant middleware reads the `Host` header and resolves the tenant config — every downstream handler sees the right branding, module flags, and data scope.
3. API routes match first. Auth is applied per route group, not globally — public routes stay public without exceptions or bypasses.
4. Anything that isn't an API route falls through to the ASSETS binding, which serves the React SPA.
5. The SPA boots TanStack Router and handles navigation client-side from there.

## Multi-tenancy

One Worker deployment serves every tenant, distinguished by hostname. Tenant config — enabled modules, branding, and so on — is loaded from a KV or D1 binding keyed by domain. There's no separate deployment per tenant, which is the point: adding a site is a config change, not an infrastructure change.

## Module system

Features are opt-in. Each module is a directory under `src/worker/modules/` and `src/client/modules/` exporting a standard interface. See [features/modules.md](../features/modules.md).

## Auth

Auth is provider-based. `packages/auth` defines an `AuthProvider` interface (`authenticate(request, env) => AuthUser | null`), and the middleware only ever calls the active provider — it has no idea *how* a user gets authenticated, and it doesn't need to. The default provider validates Cloudflare Access JWTs; if you need session cookies, OAuth, or API keys later, each is a new provider, and the middleware never changes. The Worker never issues tokens itself. See `AGENTS.md` and [ADR 002](../adr/002-pluggable-auth-providers.md).

## Key files

| File | Role |
|---|---|
| `apps/web/src/worker/index.ts` | Worker entry — exports the Hono app |
| `apps/web/src/worker/app.ts` | Route registration + tenant middleware |
| `apps/web/src/worker/auth-provider.ts` | Selects the active `AuthProvider` for the app |
| `apps/web/src/worker/middleware/auth.ts` | Provider-agnostic auth middleware |
| `apps/web/src/worker/middleware/admin.ts` | Role enforcement |
| `packages/auth/src/types.ts` | `AuthProvider` interface |
| `packages/auth/src/providers/cloudflare-access.ts` | Default provider (CF Access JWT) |
| `apps/web/src/client/main.tsx` | SPA entry |
| `apps/web/src/client/routes/__root.tsx` | TanStack Router root + route tree |
| `wrangler.jsonc` (repo root) | Cloudflare Worker config |
