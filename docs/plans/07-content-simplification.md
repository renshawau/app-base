# Plan 07 — Content simplification (file-first)

**Status: Phase 1 implemented** (2026-07-07) — see [docs/features/content.md](../features/content.md) for current behavior. Verified live: all three modules serve identically from the registry; draft/scheduled/tenant filtering works; invalid frontmatter 500s naming the entry; admin is read-only with source paths and preview. Phase 2 (R2) remains deferred. One deviation from the design below: `date:` is accepted as an alias for `publish_at` (the blog's existing frontmatter used it).

**Implements:** [ADR 008](../adr/008-content-simplification-file-first.md) (file-first, frontmatter-controlled, site-owned content tree)
**Replaces at runtime:** the D1 content pipeline from Plan 06. Plan 06 remains as the design record of what this removes.

## Scope

Phase 1 (this plan): the site content tree, the in-memory bundled loader, frontmatter publication control, read-only admin, removal of the D1 content path. Phase 2 (deferred until a site needs it): the R2 source.

## Phase 1

### 1. Content tree

Move all markdown to `apps/web/content/<module>/<collection>/<slug>.md`:

- `modules/blog/content/*.md` → `content/blog/posts/`
- `modules/pages/content/*.md` → `content/pages/sections/`
- `modules/portfolio/content-projects/*.md` → `content/portfolio/projects/`
- `modules/portfolio/content-profile/*.md` → `content/portfolio/profile/`

Add publication frontmatter where it was previously D1 state (`status`, optional `publish_at`, `order` replacing `sort_order`).

### 2. Core loader (`worker/content/`)

Replace `engine.ts`'s sync/CRUD with a registry:

- One `import.meta.glob("/content/**/*.md", { query: "?raw", eager: true })` in core.
- Parse path → `{ module, collection, slug }`; parse frontmatter; validate against the module-declared collection schema **merged with the core publication schema** (`status` default `"published"`, optional `publish_at`, `order`, `tenant`); render body to HTML once per isolate (`marked`, as today).
- Unknown module/collection segment or invalid frontmatter fails boot loudly (same philosophy as the current sync's 500s).
- Query helpers keep their names and shapes (`getPublishedEntries`, `getPublishedEntry`, `toDto`) but read the registry and filter by `status === "published"`, `publish_at` due, and tenant match — so public module routes change minimally or not at all.

Module declaration shrinks: collections become `{ name, schema }` only (no `files` glob — core owns the glob).

### 3. Read-only admin

- Worker: replace `content/admin-routes.ts` CRUD with `GET /collections` and `GET /:collection/entries` (computed state: draft / scheduled / live; source path shown per entry).
- Client: `ContentAdminPanel` drops create/edit/publish/delete/detach UI; keeps the list + preview. Module `AdminPanel.tsx` files unchanged apart from props.

### 4. Remove the D1 path

- Delete seed sync (`ensureContent` call in `app.ts`), hash ledger, provenance handling.
- `_content` migration: `DROP TABLE content_entries` (forward-only runner; existing installs drop demo data — acceptable per ADR 008 migration note; no production UI-authored entries exist).
- Before dropping on any real install: one-time check for `source = 'ui'` or detached rows and export them to files.

### 5. Docs

Rewrite `docs/features/content.md` for the new model; note the module-removal caveat (delete the module's `content/` subtree too) in `docs/features/modules.md`; link ADR 008 from the docs index table.

### Verification

- All three modules render identically to pre-change output for published entries (blog list/detail, pages sections, portfolio projects + profile).
- A `status: draft` entry disappears from public routes but appears as "draft" in admin.
- A future `publish_at` entry is hidden publicly, shown as "scheduled" in admin, and appears once due (fake clock or short-dated test).
- A `tenant:` entry only renders for that tenant.
- Removing a module registry entry + its content subtree: build passes, zero content bytes for it in the bundle.
- Worker boots with an invalid frontmatter file → loud failure naming module/collection/slug.

## Phase 2 — R2 source (deferred)

- Site/module-level config selects `bundled` (default) or `r2`.
- Same tree layout as object keys; loader lists + reads at first request, caches per isolate (honor ETags on revalidate).
- Same schema validation; invalid R2 content fails the *entry* (logged, skipped), not the boot — a bad upload must not take the site down.
- Publishing = uploading a `.md`; unpublishing = editing frontmatter or deleting the object. No deploy.
- Trigger to build it: a site whose content pushes worker bundle limits or that needs post-deploy publishing.
