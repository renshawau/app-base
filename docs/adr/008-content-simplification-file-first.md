# ADR 008: Content simplification — file-first, frontmatter-controlled, site-owned tree

**Date:** 2026-07-07
**Status:** Accepted
**Supersedes:** the ownership and storage model of [ADR 006](./006-content-architecture.md). The three-plane data taxonomy (content / config / application data) and the uniformity principle (every content module uses one pipeline) stand unchanged.

## Context

ADR 006 built a hybrid: markdown files sync into D1, D1 is runtime truth, publication state is UI-owned, and editing a repo body in the admin "detaches" it. It works (Plan 06 verified it live), but it carries real weight: a sync engine with a hash ledger, provenance tracking (`source: repo|ui`), detach semantics, per-entry ownership splits, and admin CRUD — all so that two authoring paths can coexist per entry.

Living with it revealed the actual requirement is simpler. These content modules should behave like a **static site**: content is authored where developers work (the repo, or R2 for post-deploy updates), publication control lives *with the content* in its frontmatter, and the admin panel only needs to *represent* content — not own half of each entry.

A second friction: content was scattered per-module (`modules/blog/content/`, `modules/portfolio/content-projects/`, …), with three inconsistent layouts. A site's content is a single editorial artifact and should live in one place.

## Decision

### One site content tree

All content for a site lives under `apps/web/content/`, structured `content/<module>/<collection>/<slug>.md`:

```
content/
  blog/posts/building-fast-apis-with-hono.md
  pages/sections/hero.md
  portfolio/projects/cli-toolkit.md
  portfolio/profile/profile.md
```

Content is **site-owned, not module-owned**. Modules still declare their collections (name + zod frontmatter schema); the core loader owns the single glob and maps the first path segment to the module. Trade-off accepted: removing a module no longer removes its content from the bundle automatically — deleting the module's subtree in `content/` is part of removing it (documented, not enforced).

### Frontmatter is the control plane

Publication state moves out of D1 into frontmatter, validated by a core schema every collection inherits:

```yaml
---
title: Building fast APIs with Hono   # required (as before)
status: published                     # draft | published; default published
publish_at: 2026-08-01                # optional; hidden until due
order: 2                              # optional; collection sort
tenant: acme                          # optional; omit = all tenants
---
```

Changing publication state is a commit (or an R2 upload) — the same action as changing the words. One artifact, one owner, no tug-of-war and therefore no detach semantics.

### D1 leaves the content path

Public views read from an in-memory registry built at worker boot: glob → parse → validate → render markdown to HTML (still write-time, per isolate; the client still ships no parser). Publication filtering (`status`, `publish_at`, `tenant`) is evaluated at read time from frontmatter. The `content_entries` table, seed sync, and hash ledger are removed. Backup/restore of content = the repo (or the R2 bucket). Nothing else.

### Two sources, one loader interface

- **Bundled (default):** `import.meta.glob` over `content/` — versioned, PR-reviewed, live after deploy.
- **R2 (per-site opt-in):** the same tree layout as objects in a bucket; the loader lists and reads at boot/first-request with per-isolate caching. This is the path for content-heavy sites (worker size limits) and for publishing without a deploy. Uploading a `.md` *is* publishing.

A site picks per-module or site-wide via config; the collection/schema contract is identical either way.

### Admin represents, never owns

The admin panels become **read-only**: list collections and entries, show computed publication state (draft / scheduled / live), preview rendered bodies, and say where each entry lives (repo path or R2 key). No create/edit/publish/delete. The shared `ContentAdminPanel` and its CRUD routes shrink accordingly.

## Consequences

**Good:**
- The engine collapses: no sync, no ledger, no provenance, no detach, no content CRUD. Roughly half the content-engine surface is deleted.
- One mental model: content behaves like a static site with an optional object-store backend; frontmatter is the whole story of an entry.
- One place to look: a site's entire editorial content is a single tree, portable between repo and R2 without restructuring.
- D1 content migrations, tenant-scoped row preference rules, and "file removed" badge states all disappear.

**Trade-offs / losses (accepted):**
- **Non-developers can no longer edit content in the admin.** Editing means a commit or an R2 upload. If a future site genuinely needs GUI editing, the admin could write to R2 — an additive feature on this model, not a return to D1.
- Scheduled publishing granularity for bundled content is bounded by isolate lifetime (frontmatter `publish_at` is evaluated at read time, so it still works — but "unpublish by editing a file" requires deploy or R2).
- Module removal no longer auto-prunes content from the bundle (see above).
- Per-tenant content moves from D1 rows to a frontmatter `tenant` field — fine at current scale; revisit if tenant-specific content grows large.

**Migration:** current D1 content is demo/seed data that already exists as files; UI-created or detached entries (none in production) would need a one-time export to files. `content_entries` is dropped via a `_content` migration.
