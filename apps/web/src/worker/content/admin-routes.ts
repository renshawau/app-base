import { Hono } from "hono";
import type { AppBindings } from "../bindings";
import { getAllEntries, type ContentCollection, type ContentEntry } from "./engine";

/**
 * Read-only admin listing for one content collection (ADR 008): the admin
 * represents content, it never owns it. Editing means a commit (or an R2
 * upload once phase 2 lands) — there is no CRUD here by design.
 * Auth + role are enforced upstream on /api/admin/*.
 */

function computedState(e: ContentEntry, now: string): "draft" | "scheduled" | "live" {
  if (e.status === "draft") return "draft";
  if (e.publish_at !== null && e.publish_at > now) return "scheduled";
  return "live";
}

export function createContentAdminRoutes(module: string, collection: ContentCollection) {
  const routes = new Hono<{ Bindings: AppBindings }>();

  routes.get("/", (c) => {
    const now = new Date().toISOString();
    const entries = getAllEntries(module, collection.name).map((e) => ({
      slug: e.slug,
      title: e.title,
      path: e.path,
      state: computedState(e, now),
      publish_at: e.publish_at,
      order: e.order,
      tenant: e.tenant,
      body_html: e.body_html,
    }));
    return c.json({ entries });
  });

  return routes;
}
