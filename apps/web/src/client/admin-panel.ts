import type { ComponentType } from "react";

/**
 * A module's admin surface, registered in client/modules.ts and composed
 * into the dashboard module's shell (ADR 007). `load` must be a dynamic
 * import of a file exporting the panel component as `Panel`, so each panel
 * stays in its own lazy chunk — dashboard users only download the panels
 * they open, and public visitors download none of this.
 */
export type AdminPanel = {
  /** owning module name (matches moduleMeta) */
  module: string;
  /** sidebar label */
  label: string;
  /** route segment under /dashboard, e.g. "blog" → /dashboard/blog */
  path: string;
  load: () => Promise<{ Panel: ComponentType }>;
};
