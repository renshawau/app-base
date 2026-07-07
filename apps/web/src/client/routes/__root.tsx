import { createRootRoute, Outlet } from "@tanstack/react-router";
import { createRoute } from "@tanstack/react-router";
import { ShowcasePage } from "../templates/showcase";
import { registerModuleRoutes } from "../modules";

export const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// The base's demo landing page — a derived site typically replaces this by
// mounting a module (pages, dashboard) at "/" instead. See ADR 007.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ShowcasePage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  ...registerModuleRoutes(rootRoute),
]);
