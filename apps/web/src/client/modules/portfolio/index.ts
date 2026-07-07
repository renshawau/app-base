import { createRoute, lazyRouteComponent, type AnyRoute } from "@tanstack/react-router";
import { moduleMeta } from "../../../modules";
import type { AdminPanel } from "../../admin-panel";

export const meta = moduleMeta.portfolio;

export const adminPanel: AdminPanel = {
  module: meta.name,
  label: "Portfolio",
  path: "portfolio",
  load: () => import("./AdminPanel"),
};

export function registerRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: meta.mount.path,
    component: lazyRouteComponent(() => import("./PortfolioPage"), "PortfolioPage"),
  });
}
