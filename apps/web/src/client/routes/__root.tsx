import { createRootRoute, Outlet } from "@tanstack/react-router";
import { createRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MaintenanceScreen } from "../components/MaintenanceScreen";
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
//
// Maintenance mode: when the tenant has it enabled, unauthenticated visitors
// get the brand splash instead of the app; /api/admin/me decides who's
// authenticated. Nothing renders until the tenant resolves, so no content
// flashes before the decision. The worker also 503s public module APIs while
// maintenance is on — the splash is presentation, not the security boundary.
function RootLayout() {
  const tenant = useTenant();
  useDarkMode();
  const maintenance = tenant?.maintenance.enabled ?? false;
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    if (tenant) document.title = tenant.branding.name;
  }, [tenant]);

  useEffect(() => {
    if (!maintenance) return;
    let cancelled = false;
    fetch("/api/admin/me")
      .then((res) => {
        if (!cancelled) setAuthed(res.ok);
      })
      .catch(() => {
        if (!cancelled) setAuthed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [maintenance]);

  if (!tenant) return null;
  if (maintenance) {
    if (authed === null) return null;
    if (!authed) return <MaintenanceScreen />;
  }
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
