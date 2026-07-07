import type { AuthUser } from "@app-base/types";
import type { AuthProvider } from "../types";

/**
 * Local-development provider: unconditionally authenticates as an admin so
 * the dashboard/admin area is usable without Cloudflare Access in front.
 * Must only ever be selected behind a build-time dev flag (see
 * apps/web/src/worker/auth-provider.ts) so it is statically eliminated from
 * production bundles.
 */
export const devAuthProvider: AuthProvider = {
  name: "dev",

  async authenticate(): Promise<AuthUser | null> {
    return { email: "dev@localhost", roles: ["admin"] };
  },
};
