// The Worker's full binding surface. Modules type their Hono instances with
// this (they run inside the app's env), which keeps the registry's
// WorkerModule type and app.route() composition type-compatible.
export type AppBindings = {
  ASSETS: Fetcher;
  TENANTS: KVNamespace;
  DB: D1Database;
};
