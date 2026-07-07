import type { AuthUser } from "@app-base/types";
import type { AuthProvider } from "../types";

/**
 * Decodes a Cloudflare Access JWT.
 * In production the Worker should cache the public certs from CF's JWKS endpoint.
 * Returns the decoded payload on success, null on failure.
 */
async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as Record<string, unknown>;

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now) return null;

    // TODO: verify signature against CF Access JWKS endpoint
    return payload;
  } catch {
    return null;
  }
}

/**
 * Default auth provider — validates the Cloudflare Access JWT present on
 * every Zero Trust request. Swap via apps/web/src/worker/auth-provider.ts.
 */
export const cloudflareAccessProvider: AuthProvider = {
  name: "cloudflare-access",

  async authenticate(request: Request): Promise<AuthUser | null> {
    const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
    const email = request.headers.get("CF-Access-Authenticated-User-Email");

    if (!jwt || !email) return null;

    const payload = await verifyJwt(jwt);
    if (!payload) return null;

    return {
      email,
      roles: (payload["custom_roles"] as string[] | undefined) ?? [],
    };
  },
};
