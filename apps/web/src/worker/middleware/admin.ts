import type { MiddlewareHandler } from "hono";

// Enforces admin role. Must be applied AFTER authMiddleware — never standalone.
export const adminMiddleware: MiddlewareHandler = async (c, next) => {
  const user = c.get("user");
  if (!user?.roles.includes("admin")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
};
