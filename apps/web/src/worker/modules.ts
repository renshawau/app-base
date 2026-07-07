import type { Hono } from "hono";
import type { ModuleMeta, ModuleMigration } from "@app-base/types";
import type { AppBindings } from "./bindings";
import type { ContentCollection } from "./content/engine";
import * as blog from "./modules/blog";
import * as portfolio from "./modules/portfolio";
import * as pages from "./modules/pages";

export type WorkerModule = {
  meta: ModuleMeta;
  /** mounted at /api/<meta.name>, gated by tenant module config */
  routes: Hono<{ Bindings: AppBindings }>;
  /** optional admin API, mounted at /api/admin/<meta.name> behind auth + role checks */
  adminRoutes?: Hono<{ Bindings: AppBindings }>;
  /** optional content collections — name + schema; files live under content/<module>/<collection>/ (ADR 008) */
  collections?: ContentCollection[];
  migrations: ModuleMigration[];
};

// Worker-side module registry. Each entry's `routes` is mounted at
// /api/<meta.name>, gated by the tenant's module config (see app.ts).
export const workerModules: WorkerModule[] = [blog, portfolio, pages];
