import { registerRoute as registerBlogRoute } from "./modules/blog";
import { registerRoute as registerDashboardRoute } from "./modules/dashboard";
import { registerRoute as registerPortfolioRoute } from "./modules/portfolio";
import { registerRoute as registerPagesRoute } from "./modules/pages";
import { moduleMeta } from "../modules";
import type { AnyRoute } from "@tanstack/react-router";

// Client-side module registry. Each entry attaches its route branch under
// the shared root at its manifest-declared mount. Remove an entry here (and
// from ../modules.ts) to drop that module's code from the client bundle
// entirely. Module admin panels register separately in ./admin-panels.ts.
const clientModules = [
  { meta: moduleMeta.blog, register: registerBlogRoute },
  { meta: moduleMeta.dashboard, register: registerDashboardRoute },
  { meta: moduleMeta.portfolio, register: registerPortfolioRoute },
  { meta: moduleMeta.pages, register: registerPagesRoute },
];

export function registerModuleRoutes(rootRoute: AnyRoute) {
  // Host-pinned mounts (ADR 007): a surface with mount.host only exists on
  // that hostname — e.g. the dashboard on dash.site.com while marketing owns
  // site.com's root. Evaluated once at boot; the SPA is served on all hosts.
  const host = typeof window === "undefined" ? "" : window.location.host;
  return clientModules
    .filter(({ meta }) => !meta.mount.host || meta.mount.host === host)
    .map(({ register }) => register(rootRoute));
}
