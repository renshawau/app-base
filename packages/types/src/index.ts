export * from "./config";

export type AuthUser = {
  email: string;
  /** Roles sourced from the CF Access JWT custom claims */
  roles: string[];
};

/** Per-tenant override for a single module (keyed by module name in TenantRecord) */
export type ModuleConfig = {
  enabled: boolean;
};

/** Where a module's client surface is mounted — path prefix, optionally pinned to a hostname */
export type ClientMount = {
  /** route prefix, e.g. "/" (site root), "/blog", "/dash" */
  path: string;
  /** when set, the surface only exists on this host (e.g. "dash.site.com") */
  host?: string;
};

/** Static metadata a module registers itself under — shared by worker and client registries */
export type ModuleMeta = {
  name: string;
  defaultEnabled: boolean;
  /** present when the module has a client surface; sites remap it in their manifest */
  mount?: ClientMount;
};

/** A single ordered, forward-only schema change owned by one module */
export type ModuleMigration = {
  id: string;
  sql: string;
};
