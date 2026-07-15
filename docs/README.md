# app-base

A reusable Cloudflare-native application platform. One codebase deploys portfolio sites, CRMs, blogs, and dashboards, with per-tenant configuration doing the differentiating — so launching the next site never means forking the last one.

## Quick start

```bash
pnpm install
pnpm dev        # starts Vite + Wrangler dev server
```

## Documentation

Everything is indexed below. If you're new, read the [architecture overview](./architecture/overview.md) first — the rest of the docs assume its mental model.

| Doc | Purpose |
|---|---|
| [Architecture overview](./architecture/overview.md) | System design and data flow |
| [Module system](./features/modules.md) | How to add/remove feature modules |
| [Settings & tenant config](./features/settings.md) | Site config, tenant records, the three config tiers |
| [Data & migrations](./features/data.md) | D1, module-owned schema, the migration runner |
| [Theming](./features/theming.md) | Rebranding via tokens, never components |
| [Admin & dashboard](./features/admin.md) | The backoffice, module admin panels, surface mounts |
| [Bookings](./features/bookings.md) | Microsoft Bookings integration: branded in-site booking via Graph API, iframe embed fallback |
| [Content engine](./features/content.md) | File-first content: site-owned tree, frontmatter-controlled, read-only admin (ADR 008) |
| [Installation guide](./guides/installation.md) | First-time setup |
| [Contributing guide](./guides/contributing.md) | Development workflow and standards |
| [Maintenance guide](./guides/maintenance.md) | Ongoing ops tasks |
| [New site guide](./guides/new-site.md) | Launching a site off the base |
| [ADRs](./adr/) | Architectural Decision Records |
| [Base review 2026-07](./review/2026-07-base-review.md) | Gap analysis + roadmap for the base |
| [Base review #2 2026-07-04](./review/2026-07-04-base-review-2.md) | Post-implementation state, remaining gaps, next actions |
| [Plans](./plans/) | Design records for gap-closure work (see each plan's Status line) |

## Tech stack

See [AGENTS.md](../AGENTS.md) for the full stack and coding rules.
