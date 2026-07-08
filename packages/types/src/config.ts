import { z } from "zod";

export const moduleConfigSchema = z.object({
  enabled: z.boolean(),
});

/** One nav entry; `children` makes it a dropdown in the public-site header. */
export const navItemSchema = z.object({
  label: z.string(),
  href: z.string(),
  children: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
});

/** Site-wide branding. Sites override values here, never component code (see docs/plans/02-theming.md). */
export const brandingSchema = z.object({
  name: z.string(),
  nav: z.array(navItemSchema).default([]),
  /** logo image URL (a site asset); the styled name is the fallback wordmark */
  logo: z.string().optional(),
  /** public-site footer: links row plus an optional statement (e.g. Acknowledgement of Country) */
  footer: z
    .object({
      links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
      text: z.string().optional(),
      /** logo image URL rendered beside the statement */
      logo: z.string().optional(),
      /** which side of the statement the logo sits on */
      logoSide: z.enum(["left", "right"]).default("left"),
    })
    .optional(),
});
export type Branding = z.infer<typeof brandingSchema>;

/**
 * Maintenance / coming-soon mode: visitors get a brand splash (colors + logo)
 * and the public module APIs return 503; authenticated users see the real
 * site. Toggle per tenant at runtime (KV) or site-wide at build time.
 */
export const maintenanceSchema = z.object({
  enabled: z.boolean().default(false),
  /** short line under the logo, e.g. "Coming soon" */
  message: z.string().optional(),
  /** splash logo URL; falls back to branding.logo, then the name wordmark */
  logo: z.string().optional(),
});
export type Maintenance = z.infer<typeof maintenanceSchema>;

/** Build-time config a site owns in its own repo. The base owns this schema; sites own the values. */
export const siteConfigSchema = z.object({
  name: z.string(),
  /** "single": site config IS the tenant, no KV lookup. "multi": tenant resolved per-hostname from the TENANTS KV. */
  tenancy: z.enum(["single", "multi"]).default("single"),
  branding: brandingSchema,
  modules: z.record(z.string(), moduleConfigSchema).default({}),
  maintenance: maintenanceSchema.default({ enabled: false }),
});
export type SiteConfig = z.infer<typeof siteConfigSchema>;
/** What a site writes in site.config.ts — schema defaults still optional. */
export type SiteConfigInput = z.input<typeof siteConfigSchema>;

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
  /** runtime maintenance toggle — flip a tenant into coming-soon without a redeploy */
  maintenance: maintenanceSchema.partial().optional(),
});
export type TenantRecord = z.infer<typeof tenantConfigSchema>;

/** The resolved tenant after merging a TenantRecord (if any) over SiteConfig defaults. */
export type Tenant = {
  id: string;
  domain: string;
  name: string;
  branding: Branding;
  modules: Record<string, { enabled: boolean }>;
  maintenance: Maintenance;
};
