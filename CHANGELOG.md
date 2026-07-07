# Changelog

All notable changes to app-base live here. Derived sites: merge from release tags, not from `main` — read the entry for anything marked **breaking** before you merge.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow semver (pre-1.0: minors may break, and the entry will say so).

## [0.1.0] — 2026-07-07

The first tagged release — the baseline every derived site starts from.

### Added

- **Platform core**: Cloudflare Workers + Hono backend and a React + TanStack Router SPA, deployed as one unit. Tenant resolution by hostname (`single` or `multi` tenancy, overrides in KV).
- **Module system**: self-contained feature modules (blog, pages, portfolio, dashboard) opted into via the site manifest. Unlisted modules cost zero bytes in either bundle. Mounts (path or hostname) are site configuration (ADR 007).
- **Auth**: pluggable `AuthProvider` interface with Cloudflare Access JWT as the default and a dev provider that's statically removed from production builds (ADR 002).
- **Data layer**: one D1 database per install, module-owned forward-only migrations applied automatically by the core runner.
- **Content engine**: file-first, static-site-style content — a site-owned markdown tree at `apps/web/content/`, publication control in frontmatter, an in-memory registry at runtime, and read-only admin panels (ADR 008).
- **Theming**: token-only rebranding through `theme.css`; structural branding through `site.config.ts`.
- **Admin**: dashboard-hosted backoffice behind `/api/admin/*` auth + role middleware, one lazy chunk per panel.
- **Deploy bootstrap**: Deploy to Cloudflare button with placeholder resource IDs rewritten at provision time. `wrangler.jsonc` lives at the repo root so the button detects it — verified against a real deploy (ADR 005).
- **Docs**: architecture overview, per-feature docs, guides (installation, new-site, maintenance, contributing), ADRs 001–008, and design-record plans 01–07.

[0.1.0]: https://github.com/renshawau/app-base/releases/tag/v0.1.0
