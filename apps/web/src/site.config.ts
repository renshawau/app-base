import { siteConfigSchema, type SiteConfig, type SiteConfigInput } from "@app-base/types";
import { moduleMeta } from "./modules";

// This is the one file a derived site edits to declare its own identity and
// module selection — see docs/guides/new-site.md. Parsed once at worker
// startup; a bad config fails fast rather than silently falling back.
// (SiteConfigInput, not SiteConfig: fields with schema defaults stay optional.)
const raw = {
  name: "app-base",
  tenancy: "single",
  branding: {
    name: "app-base",
    nav: [],
  },
  modules: Object.fromEntries(
    Object.values(moduleMeta).map((m) => [m.name, { enabled: m.defaultEnabled }])
  ),
  // Maintenance / coming-soon: flip enabled to true to show visitors the
  // brand splash while authenticated users keep the full site.
  maintenance: { enabled: false },
} satisfies SiteConfigInput;

export const siteConfig: SiteConfig = siteConfigSchema.parse(raw);
