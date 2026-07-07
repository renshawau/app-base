import type { MiddlewareHandler } from "hono";
import type { AuthUser } from "@app-base/types";
import { authProvider } from "../auth-provider";

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

// Provider-agnostic — delegates to whichever AuthProvider is wired up in
// auth-provider.ts. Attach this to any route group that requires authentication.
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const user = await authProvider.authenticate(c.req.raw, c.env);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", user);
  await next();
};
