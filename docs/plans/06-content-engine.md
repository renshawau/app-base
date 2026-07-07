# Plan 06 — Content Engine

**Status: Superseded by [Plan 07](./07-content-simplification.md) / [ADR 008](../adr/008-content-simplification-file-first.md)** — originally implemented 2026-07-05 — see [docs/features/content.md](../features/content.md) for current behavior. All three conversions landed (blog with detail pages; pages = the former site template; portfolio with projects + profile collections). Ownership matrix verified live: repo edits update repo-owned bodies, UI publication state survives re-sync, detached entries resist file edits, UI-created entries untouched, additive seeding into an existing database confirmed. Deviations from the design below: the shared table is named per the design but structured frontmatter is not yet editable in the admin UI (repo-only for now), and the dashboard Overview's demo data stays in code deliberately — it is application data, not content (ADR 006 taxonomy). Kept as the design record.

**Implements:** [ADR 006](../adr/006-content-architecture.md) (markdown-seeded, D1-resident content, uniform across modules)
**Prereqs:** Plan 05 (admin foundation) for the editing half; the pipeline itself only needs Plans 01/04 (landed).

## Scope

One core-owned engine; three consumers converted in order: **blog** (reference implementation), then **portfolio**, then **site** (marketing pages). Dashboard/CRM data is application data, not content — out of scope (ADR 006 taxonomy).

## Design

### Schema (core migration, not per-module)

```sql
content_entries (
  module      TEXT NOT NULL,          -- "blog"
  collection  TEXT NOT NULL,          -- "posts"
  slug        TEXT NOT NULL,
  tenant_id   TEXT,                   -- NULL = all tenants (repo-seeded default)
  title       TEXT NOT NULL,
  body_md     TEXT NOT NULL,
  body_html   TEXT NOT NULL,          -- rendered at write time; client ships no md parser
  frontmatter TEXT NOT NULL,          -- JSON: module-specific fields (tags, dates, images)
  source      TEXT NOT NULL,          -- "repo" | "ui"
  file_hash   TEXT,                   -- sync ledger for repo-sourced entries
  status      TEXT NOT NULL,          -- "draft" | "published"
  publish_at  TEXT,                   -- publication state is UI-owned, always
  sort_order  INTEGER,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (module, collection, slug, tenant_id)
)
```

The engine's migrations ride the existing runner under a reserved module name (`_content`). Module-specific typed fields live in `frontmatter` JSON, validated by a per-collection zod schema the module declares — same "core owns the mechanism, module owns the schema" split as settings.

### Module declaration

```ts
// worker module
export const collections = [{
  name: "posts",
  schema: postFrontmatterSchema,          // zod, validates frontmatter at sync + admin save
  content: import.meta.glob("./content/*.md", { query: "?raw", eager: true }),
}];
```

### Sync (mirrors the migration runner)

On boot, per collection: parse frontmatter, validate, hash each file. New slug → insert (`source: "repo"`). Changed hash → update body + frontmatter **only if** `source` is still `"repo"`. Never deletes: a file removed from the repo leaves its entry (flagged orphaned in admin) — deleting published content should be a human decision.

### Ownership rules (ADR 006)

- File owns `body_md`/`frontmatter` while `source = "repo"`; UI owns `status`/`publish_at`/`sort_order`/`tenant_id` always.
- UI body-edit on a repo entry = explicit **detach** (source → `"ui"`, admin labels it "no longer synced from repo").
- UI-created entries: engine never touches them at sync.

### Read API + rendering

Core exposes a query helper (`getEntries(module, collection, tenant, { includeDrafts })`) that public routes use; it filters `status = "published" AND (publish_at IS NULL OR publish_at <= now)` and tenant scope. Public pages render `body_html`. Markdown → HTML happens in the worker at sync/save (small md renderer; sanitize on the UI path since admin input is HTML-bearing).

### Admin (per collection, via Plan 05 panels)

List (with provenance + status badges), edit (textarea + preview v1), publish controls (status, publish_at), detach confirmation, orphan indicator. One shared set of CRUD components in the base; modules get them nearly for free by declaring collections.

## Steps

1. Engine core: schema migration, frontmatter parsing/validation, hash sync, query helper, write-time rendering.
2. **Blog end-to-end** (reference): move demo posts into `content/*.md`, public list/detail reads engine, admin panel with edit/publish/detach. Templates' fake posts deleted.
3. **Portfolio**: convert template into a module with a `projects` collection; same admin panel wiring.
4. **Site**: convert into a `pages` module — hero/features/sections as entries; layout stays code, copy becomes content.
5. Verify the ownership matrix: file edit → body updates; UI publish flip survives a re-sync; detach stops sync; UI-created entry untouched; unknown frontmatter rejected loudly.
6. Docs: `docs/features/content.md`; update modules.md and the new-site guide (authoring section).

## Done when

All three content-bearing modules serve every visible word from the engine; a post can be authored in markdown, committed, then scheduled from the admin UI without another commit; `git grep "Acme Corp"` in module code returns nothing.
