import { Hono } from "hono";
import { z } from "zod";
import type { ModuleMigration } from "@app-base/types";
import type { AppBindings } from "../../bindings";
import { moduleMeta } from "../../../modules";
import { getPublishedEntries, toDto, type ContentCollection } from "../../content/engine";
import { createContentAdminRoutes } from "../../content/admin-routes";

export const meta = moduleMeta.portfolio;

export const migrations: ModuleMigration[] = [];

const projects: ContentCollection = {
  name: "projects",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    badge: z.string().optional(),
    order: z.number().optional(),
  }),
};

// Single-entry collection: the profile/hero. Structured fields (skills,
// headline) live in frontmatter; the bio is the markdown body.
const profile: ContentCollection = {
  name: "profile",
  schema: z.object({ title: z.string() }).passthrough(),
};

export const collections: ContentCollection[] = [projects, profile];

export const routes = new Hono<{ Bindings: AppBindings }>();

routes.get("/", (c) => {
  const tenantId = c.get("tenant").id;
  const profileEntries = getPublishedEntries(meta.name, profile.name, tenantId);
  return c.json({
    profile: profileEntries[0] ? toDto(profileEntries[0]) : null,
    projects: getPublishedEntries(meta.name, projects.name, tenantId).map(toDto),
  });
});

export const adminRoutes = new Hono<{ Bindings: AppBindings }>();
adminRoutes.route("/projects", createContentAdminRoutes(meta.name, projects));
adminRoutes.route("/profile", createContentAdminRoutes(meta.name, profile));
