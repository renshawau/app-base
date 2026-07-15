import { registerRoute as registerBlogRoute } from "./modules/blog";
import { registerRoute as registerBookingsRoute } from "./modules/bookings";
import { registerRoute as registerDashboardRoute } from "./modules/dashboard";
import { registerRoute as registerPortfolioRoute } from "./modules/portfolio";
import { registerRoute as registerPagesRoute } from "./modules/pages";
import { moduleMeta } from "../modules";
import type { AnyRoute } from "@tanstack/react-router";

// Client-side module registry. Each entry attaches its route branch under
// the shared root at its manifest-declared mount. Remove an entry here (and
// from ../modules.ts) to drop that module's code from the client bundle
// entirely. Module admin panels register separately in ./admin-panels.ts.
// Registers are typed AnyRoute deliberately: mounts are runtime config
// (ADR 007), so the router's literal path typing is loose by design.
type RegisterFn = (parent: AnyRoute) => AnyRoute | AnyRoute[];

const clientModules: { meta: (typeof moduleMeta)[keyof typeof moduleMeta]; register: RegisterFn }[] = [
  { meta: moduleMeta.blog, register: registerBlogRoute },
  { meta: moduleMeta.bookings, register: registerBookingsRoute },
  { meta: moduleMeta.dashboard, register: registerDashboardRoute },
  { meta: moduleMeta.portfolio, register: registerPortfolioRoute },
  { meta: moduleMeta.pages, register: registerPagesRoute },
];

export function registerModuleRoutes(rootRoute: AnyRoute) {
  // Host-pinned mounts (ADR 007): a surface with mount.host only exists on
  // that hostname — e.g. the dashboard on dash.site.com while marketing owns
  // site.com's root. Evaluated once at boot; the SPA is served on all hosts.
  // A module may register one route or several flat siblings (e.g. the pages
  // module's index + $slug) — hence the flat().
  const host = typeof window === "undefined" ? "" : window.location.host;
  return clientModules
    .filter(({ meta }) => !meta.mount.host || meta.mount.host === host)
    .flatMap(({ register }) => register(rootRoute));
}
