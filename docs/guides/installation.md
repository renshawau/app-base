# Installation Guide

## Prerequisites

You'll need:

- Node.js 20+
- pnpm 9+
- A Cloudflare account with Workers and Access enabled
- The Wrangler CLI: `pnpm add -g wrangler`

## Setup

```bash
git clone <repo>
cd app-base
pnpm install
```

## Local development

```bash
pnpm dev
```

That's it — this starts Vite with the Cloudflare plugin, which runs the Worker locally through Miniflare alongside the Vite dev server. One command, both halves of the app.

## Cloudflare Zero Trust (auth)

In production, protected routes (`/api/admin/*`) require a Cloudflare Access JWT with an `admin` role claim. You don't need to set any of that up to work locally, though: in dev, the `devAuthProvider` takes over (selected behind `import.meta.env.DEV` in `apps/web/src/worker/auth-provider.ts`) and authenticates every request as `dev@localhost` with the admin role. The dashboard just works out of the box, and because the switch happens at build time, the dev provider is statically removed from production builds — it can't leak. See [docs/features/admin.md](../features/admin.md) for the details.

## Deploy

```bash
cd apps/web
wrangler deploy
```

For anything that shouldn't live in `wrangler.jsonc`, set it as a secret instead: `wrangler secret put <KEY>`.
