import { createRootRoute, Outlet } from "@tanstack/react-router";
import { createRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShowcasePage } from "../templates/showcase";
import { registerModuleRoutes } from "../modules";
import { useDarkMode } from "../hooks/useDarkMode";
import { useTenant } from "../hooks/useTenant";
import { moduleMeta } from "../../modules";

// The document title is branding, so it comes from tenant config rather than
// the hardcoded index.html value (which is only the pre-hydration fallback).
// Subscribing to useDarkMode here keeps <html data-mode> applied on every
// surface — including pages that render no mode toggle — so the platform
// never flips between light and dark across navigations.
function RootLayout() {
  const tenant = useTenant();
  useDarkMode();
  useEffect(() => {
    if (tenant) document.title = tenant.branding.name;
  }, [tenant]);
  return <Outlet />;
}

export const rootRoute = createRootRoute({
  component: RootLayout,
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
