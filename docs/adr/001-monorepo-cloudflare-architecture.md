# ADR 001: Monorepo + Cloudflare Workers architecture

**Date:** 2025-06-22  
**Status:** Accepted

## Context

We need a reusable base for multiple web applications (portfolio, CRM, blog, dashboard) targeting multiple tenants on multiple domains. The platform must be maintainable by a small team and deployable without managing servers.

## Decision

Use a **pnpm monorepo** with a single deployable **Cloudflare Worker** that:

- Routes by `Host` header for multi-tenancy (no separate deployment per tenant)
- Uses **Hono** as the Worker HTTP framework for typed middleware and clean route composition
- Serves a **React + TanStack Router SPA** via the Workers Static Assets binding
- Authenticates via **Cloudflare Zero Trust** (JWT in headers) — the Worker never issues tokens
- Shares types and auth utilities in `packages/` across the monorepo

## Consequences

**Good:**
- Zero server ops — Cloudflare handles infra, scaling, and global distribution
- Single deploy covers all tenants
- Shared packages enforce type consistency across worker and client
- Zero Trust proxy means the Worker trusts header-injected identity, keeping auth code minimal

**Trade-offs:**
- Worker bundle size must stay under Cloudflare's limits — heavy server-side libraries are a risk
- TanStack Router requires React, ruling out lighter JSX-only runtimes (e.g. hono/jsx/dom)
- Multi-tenant KV/D1 schema for tenant config not yet implemented — hostname routing is the stub

## Alternatives considered

- **Separate Workers per tenant**: full isolation, but the deployment and ops complexity multiplies linearly with tenant count — exactly the burden a small team can't carry. Rejected.
- **Hono JSX frontend (no React)**: lighter, but incompatible with `@cloudflare/kumo`, which is React-based. Rejected.
- **Cloudflare Pages**: Pages Functions have tighter limits and less Worker API surface, and Workers give us more control for the same effort. Rejected.
