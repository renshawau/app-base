import { createRoute, lazyRouteComponent, type AnyRoute } from "@tanstack/react-router";
import { moduleMeta } from "../../../modules";
import { adminPanels } from "../../admin-panels";

export const meta = moduleMeta.dashboard;

// The dashboard is the backoffice host (ADR 007): its route branch is the
// shell plus one lazy child route per registered module admin panel. Every
// component here and every panel stays behind a dynamic import, so public
// visitors download none of the admin code.
export function registerRoute(parentRoute: AnyRoute) {
  const shellRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: meta.mount.path,
    component: lazyRouteComponent(() => import("./DashboardShell"), "DashboardShell"),
  });

  const overviewRoute = createRoute({
    getParentRoute: () => shellRoute,
    path: "/",
    component: lazyRouteComponent(() => import("./Overview"), "Overview"),
  });

  const panelRoutes = adminPanels.map((panel) =>
    createRoute({
      getParentRoute: () => shellRoute,
      path: panel.path,
      component: lazyRouteComponent(panel.load, "Panel"),
    })
  );

  return shellRoute.addChildren([overviewRoute, ...panelRoutes]);
}
