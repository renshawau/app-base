import type { ClientMount, ModuleMeta } from "@app-base/types";

type ClientModuleMeta = ModuleMeta & { mount: ClientMount };

// The site's module manifest: every module a site ships must have an entry here.
// Deliberately dependency-free (no Hono, no React) so both the worker registry
// and the client registry can import it without pulling the other realm's code
// into their bundle.
// `mount` is where each client surface lives — the site remaps freely:
// marketing at "/" with the dashboard at "/dash", or the dashboard pinned to
// its own hostname ({ path: "/", host: "dash.example.com" }). Exactly one
// surface may own "/" per host. See ADR 007.
export const moduleMeta: Record<"blog" | "dashboard" | "portfolio" | "pages", ClientModuleMeta> = {
  blog: { name: "blog", defaultEnabled: true, mount: { path: "/blog" } },
  // The backoffice shell (ADR 007) — client-only; its API surface is other
  // modules' adminRoutes plus the core /api/admin/* routes.
  dashboard: { name: "dashboard", defaultEnabled: true, mount: { path: "/dashboard" } },
  portfolio: { name: "portfolio", defaultEnabled: true, mount: { path: "/portfolio" } },
  // Marketing pages — a site making this its front door remaps to "/" and
  // moves the dashboard aside (ADR 007).
  pages: { name: "pages", defaultEnabled: true, mount: { path: "/site" } },
};

export type ModuleName = keyof typeof moduleMeta;
