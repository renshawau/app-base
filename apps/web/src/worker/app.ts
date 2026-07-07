import { Hono } from "hono";
import type { Tenant } from "@app-base/types";
import { authMiddleware } from "./middleware/auth";
import { adminMiddleware } from "./middleware/admin";
import { workerModules } from "./modules";
import { resolveTenant } from "./tenant";
import { ensureMigrations } from "./migrations";
import { contentEngineMigrations, ensureContent } from "./content/engine";
import type { AppBindings as Bindings } from "./bindings";

type Variables = {
  tenant: Tenant;
};

export const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Resolve tenant from Host header before any route handler runs. In "multi"
// tenancy an unknown host 404s; in "single" tenancy every host resolves to
// the site config. See ./tenant.ts and docs/plans/03-settings-and-tenant-config.md.
app.use("*", async (c, next) => {
  const host = c.req.header("host") ?? "";
  const tenant = await resolveTenant(host, c.env.TENANTS);
  if (!tenant) return c.notFound();
  c.set("tenant", tenant);
  await next();
});

// Public API routes
app.get("/api/health", (c) => c.json({ ok: true, tenant: c.get("tenant") }));

// Client-safe tenant subset — branding + which modules are enabled. Never
// include anything from the tenant record that shouldn't reach the SPA.
app.get("/api/tenant", (c) => {
  const tenant = c.get("tenant");
  return c.json({ name: tenant.name, branding: tenant.branding, modules: tenant.modules });
});

// Protected routes — auth then role check; the admin plane is /api/admin/*
// regardless of which UI (the dashboard module) consumes it. See ADR 007.
app.use("/api/admin/*", authMiddleware, adminMiddleware);

// Who am I — the dashboard shell uses this to gate its UI; the middleware
// above remains the authoritative check on every admin request.
app.get("/api/admin/me", (c) => c.json({ user: c.get("user") }));

// Apply pending migrations, then build the in-memory content registry from
// the bundled tree (ADR 008), before any module route runs. Both are
// per-isolate one-shots; invalid frontmatter fails here loudly.
app.use("/api/*", async (c, next) => {
  await ensureMigrations(c.env.DB, [contentEngineMigrations, ...workerModules]);
  ensureContent(workerModules);
  await next();
});

// Modules mount at /api/<name>, gated on whether the tenant has them enabled.
// The gate lives inside each module's own sub-app (not an external prefix
// pattern) so it applies to the mount root too, not just deeper paths.
for (const mod of workerModules) {
  const gated = new Hono<{ Bindings: Bindings; Variables: Variables }>();
  gated.use("*", async (c, next) => {
    const enabled = c.get("tenant").modules[mod.meta.name]?.enabled ?? mod.meta.defaultEnabled;
    if (!enabled) return c.notFound();
    await next();
  });
  gated.route("/", mod.routes);
  app.route(`/api/${mod.meta.name}`, gated);

  // Optional admin API — mounted under the already-guarded /api/admin/*
  if (mod.adminRoutes) {
    app.route(`/api/admin/${mod.meta.name}`, mod.adminRoutes);
  }
}

// SPA fallback: try the static asset first; serve index.html for unknown routes
app.get("*", async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw);
  if (res.status === 404) {
    const url = new URL(c.req.url);
    url.pathname = "/";
    return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
  }
  return res;
});
