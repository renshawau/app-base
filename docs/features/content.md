# Content Engine

Implements [ADR 008](../adr/008-content-simplification-file-first.md): content behaves like a **static site**. The site's content tree is the runtime truth, bundled into the worker and parsed into an in-memory registry; publication control lives in each entry's frontmatter; the admin panel represents content but never owns it. (The previous D1-resident hybrid is documented in ADR 006 / Plan 06, superseded.)

## The content tree

All content for a site lives in one place, `apps/web/content/<module>/<collection>/<slug>.md`:

```
content/
  blog/posts/building-fast-apis-with-hono.md
  pages/sections/hero.md
  portfolio/projects/cli-toolkit.md
  portfolio/profile/profile.md
```

The filename is the slug. Content is **site-owned, not module-owned**: a site's editorial content is one artifact, kept in one place. The flip side is that removing a module means also deleting its subtree under `content/` — this is documented rather than enforced, but leftover files fail boot loudly since their collection is no longer declared, so you can't forget for long.

## Frontmatter is the control plane

Every entry gets the core publication fields on top of its collection's own schema:

```yaml
---
title: Building fast APIs with Hono   # required
status: published                     # draft | published — default published
publish_at: 2026-08-01                # optional; hidden publicly until due ("date" also accepted)
order: 2                              # optional; collection sort (ascending, missing = last)
tenant: acme                          # optional; omit = all tenants
---
```

Changing publication state is the same action as changing the words: edit the file, commit, deploy. One artifact, one owner, no tug-of-war between git and a database. Collections sort by `order`, then newest publish date.

## Mechanics

- The engine (`apps/web/src/worker/content/engine.ts`) owns one glob — `import.meta.glob("/content/**/*.md")` — and builds the registry once per isolate (`ensureContent` in `app.ts`, before module routes).
- Frontmatter is validated by the core publication schema **plus** the module's per-collection zod schema. Any invalid file, or a path that doesn't match a declared module/collection, fails loudly (500; the server log names module/collection/slug).
- Markdown renders to HTML at registry build (`marked`) — the client ships no markdown parser. Authors are trusted (repo committers); add sanitization in `renderMarkdown` if that changes.
- Tenant scoping: a `tenant:` entry only renders for that tenant, and wins over a site-wide entry with the same slug.
- Public queries go through `getPublishedEntries` / `getPublishedEntry` / `toDto` — published + `publish_at` due + tenant-scoped only.

## Module wiring

```ts
// worker module — collections are name + schema; core owns the glob
const posts: ContentCollection = { name: "posts", schema: postFrontmatterSchema };
export const collections = [posts];
export const adminRoutes = new Hono<{ Bindings: AppBindings }>();
adminRoutes.route("/posts", createContentAdminRoutes(meta.name, posts));

// client admin panel
export function Panel() {
  return <ContentAdminPanel title="Blog" apiPath="/api/admin/blog/posts" />;
}
```

## Admin: read-only by design

Each content module's dashboard panel lists all entries with computed state (**draft / scheduled / live**), publish date, tenant badge, and the repo path where the entry lives; clicking a title previews the rendered body. There is no create/edit/publish/delete — editing means a commit. If a future site needs GUI editing, the evolution is "admin writes to R2" (below), not a return to D1.

## Current collections

| Module | Collection | Content |
|---|---|---|
| blog | posts | posts (list + `$slug` detail pages) |
| pages | sections | marketing page sections (hero, features, included, cta) — structured fields incl. icon names in frontmatter, prose in the body |
| portfolio | projects, profile | project cards; single profile entry (headline, skills, bio) |

## R2 source (planned — Plan 07 phase 2)

For content-heavy sites (worker bundle limits) or publishing without a deploy: the same tree layout as object keys in an R2 bucket, same schemas, same helpers. Uploading a `.md` is publishing. Not built until a site needs it.

## Known limits

- Bundled markdown counts against worker size limits — fine at site scale; R2 is the escape hatch.
- Scheduled publishing (`publish_at`) is evaluated at read time, so entries appear when due — but *un*-publishing bundled content requires a deploy.
- No GUI editing (by design, see above).
