// The Worker's full binding surface. Modules type their Hono instances with
// this (they run inside the app's env), which keeps the registry's
// WorkerModule type and app.route() composition type-compatible.
export type AppBindings = {
  ASSETS: Fetcher;
  TENANTS: KVNamespace;
  DB: D1Database;

  // Bookings module (docs/features/bookings.md). Non-secret values are
  // wrangler.jsonc vars (or .dev.vars locally); MS_CLIENT_SECRET is set via
  // `wrangler secret put`. All optional — the module degrades from Graph API
  // mode to iframe-embed mode to a contact-page fallback.
  MS_TENANT_ID?: string;
  MS_CLIENT_ID?: string;
  MS_CLIENT_SECRET?: string;
  BOOKINGS_BUSINESS_ID?: string;
  BOOKINGS_SERVICE_ID?: string;
  BOOKINGS_EMBED_URL?: string;
};
