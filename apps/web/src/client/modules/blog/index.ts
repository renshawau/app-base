import { createRoute, lazyRouteComponent, type AnyRoute } from "@tanstack/react-router";
import { moduleMeta } from "../../../modules";
import type { AdminPanel } from "../../admin-panel";

export const meta = moduleMeta.blog;

// Registered in client/admin-panels.ts; rendered inside the dashboard shell.
// Metadata only — the panel component itself stays behind the dynamic import.
export const adminPanel: AdminPanel = {
  module: meta.name,
  label: "Blog",
  path: "blog",
  load: () => import("./AdminPanel"),
};

// lazyRouteComponent keeps this file (and therefore the client registry)
// free of any static import of BlogPage, so Vite emits it as its own chunk —
// a site that doesn't ship the blog module never downloads its code.
export function registerRoute(parentRoute: AnyRoute) {
  const blogRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: meta.mount.path,
  });

  const indexRoute = createRoute({
    getParentRoute: () => blogRoute,
    path: "/",
    component: lazyRouteComponent(() => import("./BlogPage"), "BlogPage"),
  });

  const postRoute = createRoute({
    getParentRoute: () => blogRoute,
    path: "$slug",
    component: lazyRouteComponent(() => import("./BlogPostPage"), "BlogPostPage"),
  });

  return blogRoute.addChildren([indexRoute, postRoute]);
}
