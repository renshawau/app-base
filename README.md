# app-base

This is the base I use to build out all my websites and project shenanigans. It's built Cloudflare-native from the ground up — per-tenant configuration, module-based features, token-only theming, and database migrations that apply themselves. Build the base once, then launch each new site off it without forking the platform. The aim is to delete the need to rebuild the same stuff every single time, and just get to building the features. The base gets updated with the foundations and rolled up into other apps as I go. Reused components and modules are added here; more bespoke ones get added in sub-bases or in the projects themselves.

Built heavily with my AI coding buddies, and based off the toolsets I'm used to working with and enjoy for simplicity.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/renshawau/app-base)

The deploy button clones this repo into your own GitHub account, provisions the Cloudflare resources you need (a D1 database and a KV namespace) in **your** Cloudflare account, and connects Workers Builds CI. No resource IDs or account IDs ever live in this repository — everything it needs, it creates for you.

## What's in the box

- **Cloudflare Workers + Hono** backend and a **React + TanStack Router** SPA, deployed as one unit
- **Module system** — features are self-contained modules, and any module you don't list costs zero bytes in your bundles
- **Multi-tenant** — `single` or `multi` tenancy by hostname, with tenant overrides in KV
- **Data layer** — D1 with module-owned, forward-only migrations that apply automatically
- **Theming** — rebrand a whole site through design tokens in one CSS file; you never edit components
- **Auth** — pluggable providers, with Cloudflare Zero Trust JWT as the default

## Quick start (local)

```bash
pnpm install
pnpm dev        # Vite + embedded Workers runtime (miniflare)
```

## Documentation

Start at [docs/README.md](./docs/README.md). If you're launching a site off this base, go straight to [docs/guides/new-site.md](./docs/guides/new-site.md). Coding rules for humans and agents live in [AGENTS.md](./AGENTS.md).
