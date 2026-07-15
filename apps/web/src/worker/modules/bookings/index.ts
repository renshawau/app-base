import { Hono } from "hono";
import { z } from "zod";
import type { ModuleMigration } from "@app-base/types";
import type { AppBindings } from "../../bindings";
import { moduleMeta } from "../../../modules";
import { bookingsMode, createAppointment, getServices, getSlots } from "./graph";

export const meta = moduleMeta.bookings;

export const migrations: ModuleMigration[] = [];

const bookingRequestSchema = z.object({
  serviceId: z.string().min(1),
  start: z.string().datetime(),
  timeZone: z.string().min(1).max(64),
  customer: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(254),
    phone: z.string().max(40).optional(),
    notes: z.string().max(2000).optional(),
  }),
});

export const routes = new Hono<{ Bindings: AppBindings }>();

// Mode + the safe config subset the client needs. Secrets never leave the worker.
routes.get("/", (c) => {
  const mode = bookingsMode(c.env);
  return c.json({ mode, embedUrl: mode === "embed" ? c.env.BOOKINGS_EMBED_URL : undefined });
});

routes.get("/services", async (c) => {
  if (bookingsMode(c.env) !== "api") return c.json({ error: "bookings API not configured" }, 501);
  try {
    return c.json({ services: await getServices(c.env) });
  } catch (err) {
    console.error("bookings/services:", err);
    return c.json({ error: "booking service unavailable" }, 502);
  }
});

routes.get("/availability", async (c) => {
  if (bookingsMode(c.env) !== "api") return c.json({ error: "bookings API not configured" }, 501);
  const serviceId = c.req.query("serviceId");
  if (!serviceId) return c.json({ error: "serviceId is required" }, 400);

  // Default window: now → +14 days; capped at 31 days per request.
  const from = c.req.query("from") ?? new Date().toISOString();
  const defaultTo = new Date(Date.parse(from) + 14 * 86_400_000).toISOString();
  const to = c.req.query("to") ?? defaultTo;
  if (Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    return c.json({ error: "invalid date range" }, 400);
  }
  if (Date.parse(to) - Date.parse(from) > 31 * 86_400_000) {
    return c.json({ error: "date range too large" }, 400);
  }

  try {
    return c.json({ slots: await getSlots(c.env, serviceId, from, to) });
  } catch (err) {
    console.error("bookings/availability:", err);
    return c.json({ error: "booking service unavailable" }, 502);
  }
});

routes.post("/book", async (c) => {
  if (bookingsMode(c.env) !== "api") return c.json({ error: "bookings API not configured" }, 501);
  const parsed = bookingRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid booking request" }, 400);
  const req = parsed.data;

  try {
    // App-created appointments bypass Bookings' own checks, so re-derive the
    // offered slots and require the requested start to be one of them —
    // this enforces business hours, lead time, and slot alignment.
    const dayStart = new Date(req.start);
    const from = new Date(Math.max(Date.now(), dayStart.getTime() - 86_400_000)).toISOString();
    const to = new Date(dayStart.getTime() + 86_400_000).toISOString();
    const slots = await getSlots(c.env, req.serviceId, from, to);
    const requested = new Date(req.start).toISOString();
    if (!slots.some((s) => s.start === requested)) {
      return c.json({ error: "that time is no longer available" }, 409);
    }

    const result = await createAppointment(c.env, { ...req, start: requested });
    return c.json({ ok: true, id: result.id }, 201);
  } catch (err) {
    console.error("bookings/book:", err);
    return c.json({ error: "booking service unavailable" }, 502);
  }
});
