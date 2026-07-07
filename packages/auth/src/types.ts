import type { AuthUser } from "@app-base/types";

/**
 * `env` is `unknown` rather than generic — providers needing bindings
 * (e.g. a session lookup in KV/D1) cast internally. Keeps call sites
 * (Hono middleware) free of provider-specific env typing.
 */
export interface AuthProvider {
  name: string;
  authenticate(request: Request, env: unknown): Promise<AuthUser | null>;
}
