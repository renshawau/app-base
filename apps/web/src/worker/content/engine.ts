import matter from "gray-matter";
import { marked } from "marked";
import { z, type ZodType } from "zod";
import type { ModuleMigration } from "@app-base/types";

/**
 * The content engine (ADR 008): the site's content tree (content/<module>/
 * <collection>/<slug>.md) is the runtime truth, bundled into the worker and
 * parsed into an in-memory registry per isolate. Publication control lives
 * in frontmatter; the admin plane only reads. R2 is the planned second
 * source for content-heavy or post-deploy-publishing sites (Plan 07 phase 2).
 */

export type ContentCollection = {
  /** collection name, e.g. "posts" — also the directory under content/<module>/ */
  name: string;
  /** validates frontmatter beyond the core publication fields; boot fails loudly on violation */
  schema?: ZodType;
};

export type ContentEntry = {
  module: string;
  collection: string;
  slug: string;
  /** repo path — shown in admin so editors know where the entry lives */
  path: string;
  title: string;
  body_md: string;
  body_html: string;
  frontmatter: Record<string, unknown>;
  status: "draft" | "published";
  /** ISO date; from `publish_at` or `date` frontmatter. Hidden publicly until due. */
  publish_at: string | null;
  order: number | null;
  /** frontmatter `tenant:` — omit for all tenants */
  tenant: string | null;
};

// Publication control is core-owned frontmatter, identical for every
// collection; module schemas validate their own fields on top of this.
const publicationSchema = z.object({
  title: z.string().min(1),
  status: z.enum(["draft", "published"]).default("published"),
  publish_at: z.coerce.date().optional(),
  date: z.coerce.date().optional(),
  order: z.number().optional(),
  tenant: z.string().optional(),
});

// The one glob (site-owned tree, ADR 008). "/" is the Vite root: apps/web.
const files = import.meta.glob("/content/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// content_entries is dropped (ADR 008): forward-only runner, so the create
// stays in history and the drop rides after it. Fresh installs run both.
export const contentEngineMigrations = {
  meta: { name: "_content" },
  migrations: [
    {
      id: "0001_create_content_entries",
      sql: `CREATE TABLE IF NOT EXISTS content_entries (
        module TEXT NOT NULL,
        collection TEXT NOT NULL,
        slug TEXT NOT NULL,
        tenant_id TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        body_md TEXT NOT NULL,
        body_html TEXT NOT NULL,
        frontmatter TEXT NOT NULL,
        source TEXT NOT NULL,
        file_hash TEXT,
        status TEXT NOT NULL,
        publish_at TEXT,
        sort_order INTEGER,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (module, collection, slug, tenant_id)
      )`,
    },
    {
      id: "0002_drop_content_entries_file_first",
      sql: `DROP TABLE IF EXISTS content_entries`,
    },
  ] satisfies ModuleMigration[],
};

// Rendering happens once per isolate at registry build. Content authors are
// trusted (repo committers); add sanitization here if that ever changes.
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false });
}

type ModuleWithCollections = { meta: { name: string }; collections?: ContentCollection[] };

let registry: ContentEntry[] | null = null;

/**
 * Build the registry from the bundled tree: parse, validate (core publication
 * schema + the module's collection schema), render. Any invalid file or a
 * path that doesn't match a declared module/collection fails loudly — bad
 * content should never ship silently.
 */
export function ensureContent(modules: ModuleWithCollections[]): void {
  if (registry) return;

  const collectionSchemas = new Map<string, ZodType | undefined>();
  for (const mod of modules) {
    for (const collection of mod.collections ?? []) {
      collectionSchemas.set(`${mod.meta.name}/${collection.name}`, collection.schema);
    }
  }

  const entries: ContentEntry[] = [];
  for (const [path, raw] of Object.entries(files)) {
    // /content/<module>/<collection>/<slug>.md — exactly this shape
    const segments = path.replace(/^\/content\//, "").split("/");
    if (segments.length !== 3 || !segments[2].endsWith(".md")) {
      throw new Error(`content: ${path} must be content/<module>/<collection>/<slug>.md`);
    }
    const [module, collection, file] = segments;
    const slug = file.replace(/\.md$/, "");

    if (!collectionSchemas.has(`${module}/${collection}`)) {
      throw new Error(`content: ${path} does not match any declared collection`);
    }

    const { data, content } = matter(raw);
    const core = publicationSchema.safeParse(data);
    if (!core.success) {
      throw new Error(`content: invalid frontmatter in ${module}/${collection}/${slug}: ${core.error.message}`);
    }
    const schema = collectionSchemas.get(`${module}/${collection}`);
    if (schema) {
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        throw new Error(`content: invalid frontmatter in ${module}/${collection}/${slug}: ${parsed.error.message}`);
      }
    }

    const publishAt = core.data.publish_at ?? core.data.date;
    entries.push({
      module,
      collection,
      slug,
      path: `apps/web${path}`,
      title: core.data.title,
      body_md: content,
      body_html: renderMarkdown(content),
      frontmatter: data,
      status: core.data.status,
      publish_at: publishAt ? publishAt.toISOString() : null,
      order: core.data.order ?? null,
      tenant: core.data.tenant ?? null,
    });
  }

  // Collection order: explicit `order` first, then newest publish date.
  entries.sort((a, b) => {
    if (a.order !== b.order) return (a.order ?? Infinity) - (b.order ?? Infinity);
    return (b.publish_at ?? "").localeCompare(a.publish_at ?? "");
  });
  registry = entries;
}

function allEntries(module: string, collection: string): ContentEntry[] {
  if (!registry) throw new Error("content: ensureContent() has not run");
  return registry.filter((e) => e.module === module && e.collection === collection);
}

function isLive(e: ContentEntry, now: string): boolean {
  return e.status === "published" && (e.publish_at === null || e.publish_at <= now);
}

/** Published entries only, respecting publish_at and tenant scope. */
export function getPublishedEntries(module: string, collection: string, tenantId: string): ContentEntry[] {
  const now = new Date().toISOString();
  return allEntries(module, collection).filter(
    (e) => isLive(e, now) && (e.tenant === null || e.tenant === tenantId)
  );
}

/** A tenant-specific entry wins over a site-wide one with the same slug. */
export function getPublishedEntry(
  module: string,
  collection: string,
  slug: string,
  tenantId: string
): ContentEntry | null {
  const matches = getPublishedEntries(module, collection, tenantId).filter((e) => e.slug === slug);
  return matches.find((e) => e.tenant === tenantId) ?? matches[0] ?? null;
}

/** Everything, all statuses — the read-only admin listing. */
export function getAllEntries(module: string, collection: string): ContentEntry[] {
  return allEntries(module, collection);
}

/** Client-facing shape. */
export function toDto(entry: ContentEntry) {
  return {
    slug: entry.slug,
    title: entry.title,
    frontmatter: entry.frontmatter,
    body_html: entry.body_html,
    published_at: entry.publish_at,
  };
}
