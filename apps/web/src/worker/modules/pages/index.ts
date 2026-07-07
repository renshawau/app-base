import { Hono } from "hono";
import { z } from "zod";
import type { ModuleMigration } from "@app-base/types";
import type { AppBindings } from "../../bindings";
import { moduleMeta } from "../../../modules";
import { getPublishedEntries, getPublishedEntry, toDto, type ContentCollection } from "../../content/engine";
import { createContentAdminRoutes } from "../../content/admin-routes";

export const meta = moduleMeta.pages;

export const migrations: ModuleMigration[] = [];

// Marketing page sections: layout is code, every visible word is content
// (ADR 006 — uniform, no module bakes copy in). Structured fields (feature
// items, CTA labels) live in frontmatter; prose is the markdown body.
const sections: ContentCollection = {
  name: "sections",
  schema: z.object({ title: z.string() }).passthrough(),
};

// Standalone pages (about, contact, …) — one markdown file per page,
// served client-side at <mount>/<slug>. Same engine, second collection.
const pages: ContentCollection = {
  name: "pages",
  schema: z.object({ title: z.string() }).passthrough(),
};

export const collections: ContentCollection[] = [sections, pages];

export const routes = new Hono<{ Bindings: AppBindings }>();

routes.get("/", (c) => {
  const entries = getPublishedEntries(meta.name, sections.name, c.get("tenant").id);
  return c.json({
    sections: Object.fromEntries(entries.map((e) => [e.slug, toDto(e)])),
  });
});

routes.get("/page/:slug", (c) => {
  const entry = getPublishedEntry(meta.name, pages.name, c.req.param("slug"), c.get("tenant").id);
  if (!entry) return c.notFound();
  return c.json(toDto(entry));
});

export const adminRoutes = new Hono<{ Bindings: AppBindings }>();
adminRoutes.route("/sections", createContentAdminRoutes(meta.name, sections));
adminRoutes.route("/pages", createContentAdminRoutes(meta.name, pages));
