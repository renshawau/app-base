import type { AppBindings } from "../../bindings";

/**
 * Microsoft Graph client for the Bookings API (app-only / client credentials).
 * See docs/features/bookings.md for the Entra app registration this needs:
 * application permissions Bookings.Read.All (services, staff, availability)
 * and BookingsAppointment.ReadWrite.All (create appointments), admin-consented.
 *
 * Appointments created via application permissions bypass Bookings' own
 * checks, so this module enforces the business rules itself (business hours
 * via staff availability, scheduling policy lead times and slot intervals):
 * https://learn.microsoft.com/en-us/graph/bookingsbusiness-business-rules
 */

export type BookingsMode = "api" | "embed" | "unconfigured";

export function bookingsMode(env: AppBindings): BookingsMode {
  if (env.MS_TENANT_ID && env.MS_CLIENT_ID && env.MS_CLIENT_SECRET && env.BOOKINGS_BUSINESS_ID) {
    return "api";
  }
  if (env.BOOKINGS_EMBED_URL) return "embed";
  return "unconfigured";
}

// Per-isolate token cache — client-credentials tokens last ~an hour.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function graphToken(env: AppBindings): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;

  const res = await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MS_CLIENT_ID ?? "",
      client_secret: env.MS_CLIENT_SECRET ?? "",
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`graph token request failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function graph<T>(env: AppBindings, path: string, init?: RequestInit): Promise<T> {
  const token = await graphToken(env);
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`graph ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

const business = (env: AppBindings) =>
  `/solutions/bookingBusinesses/${encodeURIComponent(env.BOOKINGS_BUSINESS_ID ?? "")}`;

// --- Graph resource shapes (the subset we consume) ---

type SchedulingPolicy = {
  timeSlotInterval?: string;
  minimumLeadTime?: string;
  maximumAdvance?: string;
};

type BookingService = {
  id: string;
  displayName: string;
  description?: string;
  defaultDuration: string; // ISO 8601, e.g. "PT30M"
  defaultPrice?: number;
  preBuffer?: string;
  postBuffer?: string;
  staffMemberIds?: string[];
  schedulingPolicy?: SchedulingPolicy | null;
};

type StaffAvailabilityResponse = {
  value: {
    staffId: string;
    availabilityItems: {
      status: string;
      startDateTime: { dateTime: string; timeZone: string };
      endDateTime: { dateTime: string; timeZone: string };
    }[];
  }[];
};

export type PublicService = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number | null;
};

export type Slot = { start: string; end: string }; // ISO instants, UTC

// --- Helpers ---

/** ISO 8601 duration → minutes. Bookings uses day/hour/minute durations. */
export function durationToMinutes(iso: string | undefined, fallback = 30): number {
  if (!iso) return fallback;
  const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!m) return fallback;
  const [, d, h, min, s] = m;
  const total =
    (Number(d ?? 0) * 24 * 60) + (Number(h ?? 0) * 60) + Number(min ?? 0) + Math.ceil(Number(s ?? 0) / 60);
  return total > 0 ? total : fallback;
}

/**
 * Graph's availability responses carry timezone strings like
 * "(UTC-08:00) Pacific Time (US & Canada)" or plain "UTC". Parse the fixed
 * offset out and return the instant in epoch ms. Fixed-offset parsing is a
 * known approximation across DST transitions; slots are near-term so the
 * business's current offset is what the API reports.
 */
export function graphDateTimeToEpoch(dateTime: string, timeZone: string): number {
  const base = Date.parse(`${dateTime.replace(/\.\d+$/, "")}Z`);
  if (/^utc$/i.test(timeZone.trim())) return base;
  const m = timeZone.match(/\(UTC([+-])(\d{2}):(\d{2})\)/);
  if (!m) return base; // unknown format — treat as UTC rather than failing
  const offsetMs = (Number(m[2]) * 60 + Number(m[3])) * 60_000 * (m[1] === "+" ? 1 : -1);
  return base - offsetMs;
}

// --- Public operations ---

export async function getServices(env: AppBindings): Promise<PublicService[]> {
  const res = await graph<{ value: BookingService[] }>(env, `${business(env)}/services`);
  return res.value.map((s) => ({
    id: s.id,
    name: s.displayName,
    description: s.description ?? "",
    durationMinutes: durationToMinutes(s.defaultDuration),
    price: typeof s.defaultPrice === "number" && s.defaultPrice > 0 ? s.defaultPrice : null,
  }));
}

async function getService(env: AppBindings, serviceId: string): Promise<BookingService> {
  return graph<BookingService>(env, `${business(env)}/services/${encodeURIComponent(serviceId)}`);
}

async function getAllStaffIds(env: AppBindings): Promise<string[]> {
  const res = await graph<{ value: { id: string }[] }>(env, `${business(env)}/staffMembers`);
  return res.value.map((s) => s.id);
}

/**
 * Compute bookable slots for a service between two instants, from staff
 * availability + the service's (or business's) scheduling policy. A slot is
 * offered when at least one staff member who performs the service has an
 * uninterrupted "available" window covering buffers + duration, and the slot
 * respects the minimum lead time.
 */
export async function getSlots(env: AppBindings, serviceId: string, fromISO: string, toISO: string): Promise<Slot[]> {
  const service = await getService(env, serviceId);
  const staffIds = service.staffMemberIds?.length ? service.staffMemberIds : await getAllStaffIds(env);
  if (staffIds.length === 0) return [];

  const policy = service.schedulingPolicy ?? null;
  const durationMin = durationToMinutes(service.defaultDuration);
  const preMin = durationToMinutes(service.preBuffer, 0);
  const postMin = durationToMinutes(service.postBuffer, 0);
  const intervalMin = durationToMinutes(policy?.timeSlotInterval, durationMin);
  const leadMin = durationToMinutes(policy?.minimumLeadTime, 0);

  const availability = await graph<StaffAvailabilityResponse>(env, `${business(env)}/getStaffAvailability`, {
    method: "POST",
    body: JSON.stringify({
      staffIds,
      startDateTime: { dateTime: fromISO.replace(/Z$/, ""), timeZone: "UTC" },
      endDateTime: { dateTime: toISO.replace(/Z$/, ""), timeZone: "UTC" },
    }),
  });

  const earliestStart = Date.now() + leadMin * 60_000;
  const slotSpanMs = (preMin + durationMin + postMin) * 60_000;
  const durationMs = durationMin * 60_000;
  const intervalMs = intervalMin * 60_000;
  const starts = new Set<number>();

  for (const staff of availability.value ?? []) {
    for (const item of staff.availabilityItems ?? []) {
      if (item.status.toLowerCase() !== "available") continue;
      const windowStart = graphDateTimeToEpoch(item.startDateTime.dateTime, item.startDateTime.timeZone);
      const windowEnd = graphDateTimeToEpoch(item.endDateTime.dateTime, item.endDateTime.timeZone);
      // The customer-facing slot starts after the pre-buffer.
      for (let t = windowStart; t + slotSpanMs <= windowEnd; t += intervalMs) {
        const slotStart = t + preMin * 60_000;
        if (slotStart >= earliestStart) starts.add(slotStart);
      }
    }
  }

  return [...starts]
    .sort((a, b) => a - b)
    .slice(0, 500)
    .map((start) => ({
      start: new Date(start).toISOString(),
      end: new Date(start + durationMs).toISOString(),
    }));
}

export type BookingRequest = {
  serviceId: string;
  start: string; // ISO instant (UTC) — must match an offered slot
  customer: { name: string; email: string; phone?: string; notes?: string };
  timeZone: string; // customer's IANA timezone, for their confirmation email
};

export async function createAppointment(env: AppBindings, req: BookingRequest): Promise<{ id: string }> {
  const service = await getService(env, req.serviceId);
  const durationMin = durationToMinutes(service.defaultDuration);
  const startISO = new Date(req.start).toISOString();
  const endISO = new Date(Date.parse(startISO) + durationMin * 60_000).toISOString();

  const appointment = {
    "@odata.type": "#microsoft.graph.bookingAppointment",
    serviceId: service.id,
    serviceName: service.displayName,
    customerTimeZone: req.timeZone,
    smsNotificationsEnabled: false,
    optOutOfCustomerEmail: false,
    isCustomerAllowedToManageBooking: true,
    start: {
      "@odata.type": "#microsoft.graph.dateTimeTimeZone",
      dateTime: startISO,
      timeZone: "UTC",
    },
    end: {
      "@odata.type": "#microsoft.graph.dateTimeTimeZone",
      dateTime: endISO,
      timeZone: "UTC",
    },
    // Staff is deliberately not passed: Bookings auto-assigns, which is valid
    // regardless of the business's allowStaffSelection policy setting.
    customers: [
      {
        "@odata.type": "#microsoft.graph.bookingCustomerInformation",
        name: req.customer.name,
        emailAddress: req.customer.email,
        phone: req.customer.phone ?? "",
        notes: req.customer.notes ?? "",
        timeZone: req.timeZone,
      },
    ],
  };

  const created = await graph<{ id: string }>(env, `${business(env)}/appointments`, {
    method: "POST",
    body: JSON.stringify(appointment),
  });
  return { id: created.id };
}
