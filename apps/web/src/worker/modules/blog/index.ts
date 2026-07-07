import { Hono } from "hono";
import { z } from "zod";
import type { ModuleMigration } from "@app-base/types";
import type { AppBindings } from "../../bindings";
import { moduleMeta } from "../../../modules";
import { getPublishedEntries, getPublishedEntry, type ContentCollection } from "../../content/engine";
import { createContentAdminRoutes } from "../../content/admin-routes";

export const meta = moduleMeta.blog;

export const migrations: ModuleMigration[] = [
  {
    id: "0001_create_posts",
    sql: `CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      published_at TEXT NOT NULL
    )`,
  },
  {
    id: "0002_add_tag",
    sql: `ALTER TABLE blog_posts ADD COLUMN tag TEXT`,
  },
  {
    // Posts moved to the content engine (ADR 006); demo-only table, no data
    // worth preserving. Destructive drops are otherwise a module-major event.
    id: "0003_drop_posts_moved_to_content_engine",
    sql: `DROP TABLE IF EXISTS blog_posts`,
  },
];

const postFrontmatter = z.object({
  title: z.string(),
  excerpt: z.string(),
  tag: z.string().optional(),
  date: z.coerce.date().optional(),
});

const posts: ContentCollection = {
  name: "posts",
  schema: postFrontmatter,
};

export const collections: ContentCollection[] = [posts];

export const routes = new Hono<{ Bindings: AppBindings }>();

routes.get("/", (c) => {
  const entries = getPublishedEntries(meta.name, posts.name, c.get("tenant").id);
  return c.json({
    posts: entries.map((e) => ({
      slug: e.slug,
      title: e.title,
      excerpt: typeof e.frontmatter.excerpt === "string" ? e.frontmatter.excerpt : "",
      tag: typeof e.frontmatter.tag === "string" ? e.frontmatter.tag : null,
      published_at: e.publish_at,
    })),
  });
});

routes.get("/:slug", (c) => {
  const entry = getPublishedEntry(meta.name, posts.name, c.req.param("slug"), c.get("tenant").id);
  if (!entry) return c.notFound();
  return c.json({
    slug: entry.slug,
    title: entry.title,
    tag: typeof entry.frontmatter.tag === "string" ? entry.frontmatter.tag : null,
    published_at: entry.publish_at,
    body_html: entry.body_html,
  });
});

export const adminRoutes = new Hono<{ Bindings: AppBindings }>();
adminRoutes.route("/posts", createContentAdminRoutes(meta.name, posts));
