import { siteConfigSchema, type SiteConfig } from "@app-base/types";
import { moduleMeta } from "./modules";

// This is the one file a derived site edits to declare its own identity and
// module selection — see docs/guides/new-site.md. Parsed once at worker
// startup; a bad config fails fast rather than silently falling back.
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
} satisfies SiteConfig;

export const siteConfig: SiteConfig = siteConfigSchema.parse(raw);
