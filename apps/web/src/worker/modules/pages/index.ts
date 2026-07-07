import { Hono } from "hono";
import { z } from "zod";
import type { ModuleMigration } from "@app-base/types";
import type { AppBindings } from "../../bindings";
import { moduleMeta } from "../../../modules";
import { getPublishedEntries, toDto, type ContentCollection } from "../../content/engine";
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

export const collections: ContentCollection[] = [sections];

export const routes = new Hono<{ Bindings: AppBindings }>();

routes.get("/", (c) => {
  const entries = getPublishedEntries(meta.name, sections.name, c.get("tenant").id);
  return c.json({
    sections: Object.fromEntries(entries.map((e) => [e.slug, toDto(e)])),
  });
});

export const adminRoutes = new Hono<{ Bindings: AppBindings }>();
adminRoutes.route("/sections", createContentAdminRoutes(meta.name, sections));
