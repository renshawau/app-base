import { tenantConfigSchema, type Tenant, type TenantRecord, type Branding } from "@app-base/types";
import { siteConfig } from "../site.config";

// Modules read the resolved tenant from context without re-declaring it.
declare module "hono" {
  interface ContextVariableMap {
    tenant: Tenant;
  }
}

// Short per-isolate cache so a hot Worker doesn't hit KV on every request.
// Isolates are short-lived and this is best-effort — a stale entry lives at
// most TTL_MS past the last write, which is acceptable for branding/module
// flags (not for anything security-sensitive).
const TTL_MS = 30_000;
const cache = new Map<string, { tenant: Tenant; expiresAt: number }>();

// Field-by-field so a tenant override replaces whole values, never deep-merges
// them. Every brandingSchema field must appear here — a missing line silently
// drops that field from every tenant.
function mergeBranding(base: Branding, override?: Partial<Branding>): Branding {
  return {
    name: override?.name ?? base.name,
    nav: override?.nav ?? base.nav,
    logo: override?.logo ?? base.logo,
    footer: override?.footer ?? base.footer,
  };
}

function mergeTenant(host: string, record: TenantRecord | null): Tenant {
  return {
    id: record?.id ?? host,
    domain: record?.domain ?? host,
    name: record?.name ?? siteConfig.name,
    branding: mergeBranding(siteConfig.branding, record?.branding),
    modules: { ...siteConfig.modules, ...record?.modules },
  };
}

async function lookupTenantRecord(kv: KVNamespace, host: string): Promise<TenantRecord | null> {
  const raw = await kv.get(`tenant:${host}`, "json");
  if (!raw) return null;
  const parsed = tenantConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Resolves the Tenant for a request's Host header.
 *
 * - tenancy "single": the site config itself is the only tenant — no KV read.
 * - tenancy "multi": looks up `tenant:<host>` in the TENANTS KV and merges it
 *   over the site config defaults. An unknown host returns null (404).
 */
export async function resolveTenant(host: string, kv: KVNamespace | undefined): Promise<Tenant | null> {
  if (siteConfig.tenancy === "single") {
    return mergeTenant(host, null);
  }

  const cached = cache.get(host);
  if (cached && cached.expiresAt > Date.now()) return cached.tenant;

  const record = kv ? await lookupTenantRecord(kv, host) : null;
  if (!record) return null;

  const tenant = mergeTenant(host, record);
  cache.set(host, { tenant, expiresAt: Date.now() + TTL_MS });
  return tenant;
}
