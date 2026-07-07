# ADR 002: Pluggable authentication providers

**Date:** 2026-06-30
**Status:** Accepted

## Context

ADR 001 fixed Cloudflare Zero Trust (JWT in `Cf-Access-Jwt-Assertion`) as the auth mechanism, and the original middleware (`apps/web/src/worker/middleware/auth.ts`) implemented it inline — reading CF Access headers and decoding the JWT directly in the middleware body.

That contradicts the platform's own modular-design goal (techstack.md: "modular system where features can be added and removed as required"). With one auth mechanism hardcoded into core middleware, any tenant or deployment that needs something different — session cookies, OAuth bearer tokens, API keys for service-to-service calls — would have to fork the middleware rather than configure it. Forking core middleware is the kind of divergence this platform exists to avoid.

## Decision

Introduce an `AuthProvider` interface in `packages/auth/src/types.ts`:

```ts
interface AuthProvider {
  name: string;
  authenticate(request: Request, env: unknown): Promise<AuthUser | null>;
}
```

- Cloudflare Access becomes the **default** implementation (`packages/auth/src/providers/cloudflare-access.ts`), not a special case baked into the middleware.
- `apps/web/src/worker/middleware/auth.ts` becomes provider-agnostic — it only calls `authProvider.authenticate(request, env)` and never references CF-specific headers or JWT decoding.
- The active provider is selected in exactly one place: `apps/web/src/worker/auth-provider.ts`. Swapping or adding a provider means writing a new file under `packages/auth/src/providers/` and changing one import — no middleware changes.
- `env` is typed `unknown` in the interface rather than generic, so providers needing bindings (e.g. a session table lookup) cast internally, keeping Hono's context types simple.

`apps/web/src/worker/middleware/admin.ts` required no change — it already only reads `user.roles`, independent of how the user was authenticated.

## Consequences

**Good:**
- New auth mechanisms (session cookie, OAuth, API key) plug in without touching the request pipeline.
- Tenants that don't sit behind Cloudflare Access (e.g. local dev, a tenant using a different IdP) become supportable later without a rewrite.
- Auth logic is unit-testable in isolation (`packages/auth`) rather than only via the Worker middleware.

**Trade-offs:**
- One more layer of indirection (`auth-provider.ts` → `AuthProvider` → concrete provider) versus the original direct implementation.
- Provider selection is still app-wide, not per-tenant — see Alternatives.

## Alternatives considered

- **Per-tenant provider configuration** (read from tenant config, select provider per request): rejected for now. Per ADR 001, tenant config storage (KV/D1) isn't implemented yet — hostname routing is still a stub. Adding per-tenant provider selection today would be speculative. The `AuthProvider` interface is designed so this can be added later (e.g. a provider registry keyed by tenant) without changing the interface shape.
- **Keep JWT decoding inline in middleware, just extract a function**: rejected — doesn't solve the actual problem, which is that the middleware would still need to know about every mechanism's request shape (headers vs. cookies vs. bearer tokens) to dispatch correctly.
