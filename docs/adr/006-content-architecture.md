# ADR 006: Content architecture — markdown-seeded, D1-resident, uniformly applied

**Date:** 2026-07-05
**Status:** Partially superseded by [ADR 008](./008-content-simplification-file-first.md) — the data taxonomy and uniformity principle stand; the D1-resident storage/ownership model does not.

## Context

The demo templates carry hardcoded arrays of posts, projects, features, and metrics. As templates dissolve into modules (blog already has), that data needs a real home. Requirements that emerged in discussion:

- Non-developers should be able to manage content from an admin GUI (create, edit, publish).
- Developers should be able to author content as markdown in the repo — versioned, PR-reviewed, portable.
- Both at once (the hybrid): write the body in markdown, control publication (timing, access, visibility) from the UI.
- Whatever the answer is, it must work per-tenant and survive the template-repo/deploy-button distribution model.

## Decision

### The three-plane data taxonomy

Not everything in a template is "content". Every piece of data belongs to exactly one plane:

| Plane | Examples | Home | Managed via |
|---|---|---|---|
| **Content** | blog posts, portfolio projects, marketing page sections | Content pipeline (below) | markdown files and/or admin UI |
| **Config** | site name, nav, branding, module flags | `site.config.ts` + tenant KV (ADR/Plan 03) | git + admin (later) |
| **Application data** | CRM leads, dashboard metrics | Module-owned D1 tables (Plan 04) | the module's own features |

### The content pipeline: markdown is an ingestion path, D1 is the runtime truth

A content entry has two planes of its own:

- **Body** — the authored artifact. Authored either as a markdown file in the module's `content/` directory (bundled into the worker via raw imports) or in the admin UI.
- **Publication state** — status, `publish_at`, tenant visibility, ordering. Always lives in D1, always editable from the UI, never requires a commit or deploy.

Mechanics:

1. **Seed sync.** At worker boot (same lazy-ledger pattern as the migration runner), repo markdown is synced into D1: new file → insert, changed file hash → update body. Ledger records file hashes so unchanged files cost nothing.
2. **Render from D1 only.** Public views never read files. This is what makes content tenant-scopable and UI-editable without special cases.
3. **Provenance decides ownership.** Each entry carries `source: "repo" | "ui"`. For repo-sourced entries the *file* owns the body and the *UI* owns publication state. UI-created entries are never touched by sync. Editing a repo-sourced body in the UI is an explicit **detach** action (source flips to `ui`; the file stops syncing over it) — no silent tug-of-war between git and the database.
4. **Markdown renders at write time** (sync or admin save) into stored HTML, so the client ships no markdown parser.

### Uniformity: every content-bearing module uses this pipeline

Blog posts, portfolio projects, and marketing page content all go through the same engine — no module bakes content into code. (Considered and rejected: keeping the marketing/site template's sections as code since it's "developer-facing". Rejected for uniformity: one pipeline, one admin pattern, one mental model, and marketing copy is exactly what non-developers want to edit.)

With three confirmed consumers, the engine is **core-owned from the start**: one `content_entries` table (keyed by module + collection + slug, with tenant scoping), one sync, one set of admin CRUD primitives. Modules declare their *collections* (blog → posts, portfolio → projects, site → pages) and provide the public rendering. This is not speculative abstraction — the consumers exist and are named.

### Admin plane

The module interface grows an optional admin surface: client admin panels composed under a base-owned `/admin` shell, worker CRUD under the existing `adminMiddleware` (which has been waiting unused since ADR 002). Details in Plan 05.

## Consequences

**Good:**
- The hybrid workflow falls out naturally: commit markdown, then schedule/hide/publish from the UI without touching git.
- Multi-tenant works: repo content seeds site-wide; per-tenant content and visibility exist only in D1.
- Derived sites (template clones, deploy-button installs) inherit the whole system — their markdown, their D1, no extra infrastructure.
- Backup/restore of content = `wrangler d1 export` plus the repo itself.

**Trade-offs:**
- Bundled markdown counts against worker size limits — fine at site scale; a move to KV/R2 ingestion is the escape hatch if a site becomes content-heavy.
- Detach semantics must be understood by editors ("this post no longer updates from the repo"); the admin UI must label provenance clearly.
- The engine lands in core before a second module has exercised it — mitigated by building blog first end-to-end as the reference before converting portfolio and site.

## Related

- [Plan 05 — Admin foundation](../plans/05-admin-foundation.md)
- [Plan 06 — Content engine](../plans/06-content-engine.md)
- Builds on: module registry (Plan 01), tenant config (Plan 03), migrations (Plan 04)
