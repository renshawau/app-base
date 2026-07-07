import { createRoute, lazyRouteComponent, type AnyRoute } from "@tanstack/react-router";
import { moduleMeta } from "../../../modules";
import type { AdminPanel } from "../../admin-panel";

export const meta = moduleMeta.pages;

export const adminPanel: AdminPanel = {
  module: meta.name,
  label: "Pages",
  path: "pages",
  load: () => import("./AdminPanel"),
};

// Two surfaces under one mount: the sections-composed marketing page at the
// mount root, and standalone content pages ("pages" collection) at
// <mount>/<slug>. Registered as flat siblings, not a nested branch — a
// branch at path "/" with an index child at "/" never matches, and "/" is
// exactly where a marketing site mounts this module. Static sibling routes
// (e.g. /blog) outrank the dynamic $slug.
export function registerRoute(parentRoute: AnyRoute) {
  const base = meta.mount.path.replace(/\/$/, "");

  const index = createRoute({
    getParentRoute: () => parentRoute,
    path: meta.mount.path,
    component: lazyRouteComponent(() => import("./SitePage"), "SitePage"),
  });

  const page = createRoute({
    getParentRoute: () => parentRoute,
    path: `${base}/$slug`,
    component: lazyRouteComponent(() => import("./StaticPage"), "StaticPage"),
  });

  return [index, page];
}
