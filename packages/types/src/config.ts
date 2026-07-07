import { z } from "zod";

export const moduleConfigSchema = z.object({
  enabled: z.boolean(),
});

/** Site-wide branding. Sites override values here, never component code (see docs/plans/02-theming.md). */
export const brandingSchema = z.object({
  name: z.string(),
  nav: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
});
export type Branding = z.infer<typeof brandingSchema>;

/** Build-time config a site owns in its own repo. The base owns this schema; sites own the values. */
export const siteConfigSchema = z.object({
  name: z.string(),
  /** "single": site config IS the tenant, no KV lookup. "multi": tenant resolved per-hostname from the TENANTS KV. */
  tenancy: z.enum(["single", "multi"]).default("single"),
  branding: brandingSchema,
  modules: z.record(z.string(), moduleConfigSchema).default({}),
});
export type SiteConfig = z.infer<typeof siteConfigSchema>;

/**
 * Runtime, per-tenant record stored in the TENANTS KV namespace, keyed by
 * hostname. Fields are overrides — absent fields fall back to SiteConfig
 * defaults when merged (see worker/tenant.ts).
 */
export const tenantConfigSchema = z.object({
  id: z.string(),
  domain: z.string(),
  name: z.string().optional(),
  branding: brandingSchema.partial().optional(),
  modules: z.record(z.string(), moduleConfigSchema).optional(),
});
export type TenantRecord = z.infer<typeof tenantConfigSchema>;

/** The resolved tenant after merging a TenantRecord (if any) over SiteConfig defaults. */
export type Tenant = {
  id: string;
  domain: string;
  name: string;
  branding: Branding;
  modules: Record<string, { enabled: boolean }>;
};
