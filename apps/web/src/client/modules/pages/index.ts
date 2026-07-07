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
// <mount>/<slug>. Static sibling routes (e.g. /blog) outrank the dynamic
// $slug, so mounting this module at "/" is safe.
export function registerRoute(parentRoute: AnyRoute) {
  const branch = createRoute({
    getParentRoute: () => parentRoute,
    path: meta.mount.path,
  });

  const index = createRoute({
    getParentRoute: () => branch,
    path: "/",
    component: lazyRouteComponent(() => import("./SitePage"), "SitePage"),
  });

  const page = createRoute({
    getParentRoute: () => branch,
    path: "$slug",
    component: lazyRouteComponent(() => import("./StaticPage"), "StaticPage"),
  });

  return branch.addChildren([index, page]);
}
