import { createRootRoute, Outlet } from "@tanstack/react-router";
import { createRoute } from "@tanstack/react-router";
import { ShowcasePage } from "../templates/showcase";
import { registerModuleRoutes } from "../modules";
import { moduleMeta } from "../../modules";

export const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// The base's demo landing page. It only mounts when no module claims "/" in
// the site manifest (same host rules as the registry), so a site makes its
// marketing page the front door by remapping that module's mount — no edits
// to this base-owned file. See ADR 007.
const host = typeof window === "undefined" ? "" : window.location.host;
const rootIsOwned = Object.values(moduleMeta).some(
  (m) => m.mount.path === "/" && (!m.mount.host || m.mount.host === host)
);

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ShowcasePage,
});

export const routeTree = rootRoute.addChildren([
  ...(rootIsOwned ? [] : [indexRoute]),
  ...registerModuleRoutes(rootRoute),
]);
