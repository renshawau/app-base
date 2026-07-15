import { Badge, Button, Text } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";

/**
 * The reusable booking widget (docs/features/bookings.md). Renders whatever
 * the bookings module's configuration supports:
 *
 *   api          — full in-site flow: service → day → time → details, backed
 *                  by Microsoft Bookings through the worker (Graph API)
 *   embed        — the Microsoft Bookings page in an iframe
 *   unconfigured — a quiet fallback pointing at `fallbackHref`
 *
 * It's a core component so any module can render it (modules can't import
 * each other); the bookings module's /book page is just this plus chrome.
 */

type Config = { mode: "api" | "embed" | "unconfigured"; embedUrl?: string };
type Service = { id: string; name: string; description: string; durationMinutes: number; price: number | null };
type Slot = { start: string; end: string };

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function BookingFlow({ fallbackHref = "/contact-us" }: { fallbackHref?: string }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [services, setServices] = useState<Service[] | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bookings")
      .then((res) => (res.ok ? (res.json() as Promise<Config>) : Promise.reject(res.status)))
      .then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
        if (cfg.mode === "api") {
          fetch("/api/bookings/services")
            .then((res) => (res.ok ? (res.json() as Promise<{ services: Service[] }>) : Promise.reject(res.status)))
            .then((d) => {
              if (!cancelled) setServices(d.services);
            })
            .catch(() => {
              if (!cancelled) setConfig({ mode: "unconfigured" });
            });
        }
      })
      .catch(() => {
        if (!cancelled) setConfig({ mode: "unconfigured" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!service) return;
    let cancelled = false;
    setSlots(null);
    setDay(null);
    setSlot(null);
    fetch(`/api/bookings/availability?serviceId=${encodeURIComponent(service.id)}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ slots: Slot[] }>) : Promise.reject(res.status)))
      .then((d) => {
        if (!cancelled) setSlots(d.slots);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load available times. Try again shortly.");
      });
    return () => {
      cancelled = true;
    };
  }, [service]);

  const days = useMemo(() => {
    if (!slots) return [];
    const seen = new Map<string, number>();
    for (const s of slots) seen.set(dayKey(s.start), (seen.get(dayKey(s.start)) ?? 0) + 1);
    return [...seen.entries()];
  }, [slots]);

  const daySlots = useMemo(() => (slots && day ? slots.filter((s) => dayKey(s.start) === day) : []), [slots, day]);

  async function submit() {
    if (!service || !slot) return;
    setStatus("submitting");
    setError(null);
    const res = await fetch("/api/bookings/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: service.id,
        start: slot.start,
        timeZone: tz,
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        },
      }),
    }).catch(() => null);

    if (res?.status === 201) {
      setStatus("done");
      return;
    }
    setStatus("error");
    setError(
      res?.status === 409
        ? "That time was just taken — pick another slot."
        : "Something went wrong making the booking. Try again, or use the contact page."
    );
    if (res?.status === 409 && service) {
      // refresh availability so the stale slot disappears
      const d = await fetch(`/api/bookings/availability?serviceId=${encodeURIComponent(service.id)}`)
        .then((r) => (r.ok ? (r.json() as Promise<{ slots: Slot[] }>) : null))
        .catch(() => null);
      if (d) {
        setSlots(d.slots);
        setSlot(null);
      }
    }
  }

  if (!config) return null;

  if (config.mode === "embed" && config.embedUrl) {
    return (
      <iframe
        src={config.embedUrl}
        title="Book an appointment"
        className="w-full rounded-lg border border-kumo-line"
        style={{ height: "1400px" }}
      />
    );
  }

  if (config.mode !== "api") {
    return (
      <div className="text-center py-10">
        <Text variant="secondary">
          Online booking isn't available right now — <a className="underline underline-offset-4" href={fallbackHref}>get in touch instead</a>.
        </Text>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="text-center py-10 flex flex-col items-center gap-3">
        <Text as="h2" variant="heading3">Booked.</Text>
        <Text variant="secondary" size="sm">
          {service?.name} — {slot && `${dayKey(slot.start)}, ${timeLabel(slot.start)}`}. A confirmation email is on
          its way to {form.email}.
        </Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Step 1 — service */}
      <div>
        <Text as="h2" variant="heading3" DANGEROUS_className="mb-3">1. What do you need?</Text>
        {!services && <Text variant="secondary" size="sm">Loading services…</Text>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(services ?? []).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setService(s)}
              className={`text-left rounded-lg border p-4 transition-colors ${
                service?.id === s.id ? "border-kumo-brand" : "border-kumo-line hover:border-kumo-brand"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <Text as="span" variant="body" bold>{s.name}</Text>
                <Badge variant="neutral">{s.durationMinutes} min</Badge>
              </div>
              {s.description && <Text variant="secondary" size="sm">{s.description}</Text>}
              {s.price !== null && <Text variant="secondary" size="xs">${s.price}</Text>}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — day + time */}
      {service && (
        <div>
          <Text as="h2" variant="heading3" DANGEROUS_className="mb-3">2. Pick a time</Text>
          {!slots && !error && <Text variant="secondary" size="sm">Checking availability…</Text>}
          {slots && slots.length === 0 && (
            <Text variant="secondary" size="sm">
              No times available in the next two weeks — <a className="underline underline-offset-4" href={fallbackHref}>contact us</a> and we'll sort something out.
            </Text>
          )}
          <div className="flex flex-wrap gap-2 mb-4">
            {days.map(([d, count]) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDay(d);
                  setSlot(null);
                }}
                className={`rounded-md border px-3 py-2 text-sm ${
                  day === d ? "border-kumo-brand font-medium" : "border-kumo-line hover:border-kumo-brand"
                }`}
              >
                {d} <span className="opacity-60">({count})</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((s) => (
              <button
                key={s.start}
                type="button"
                onClick={() => setSlot(s)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  slot?.start === s.start ? "border-kumo-brand font-medium" : "border-kumo-line hover:border-kumo-brand"
                }`}
              >
                {timeLabel(s.start)}
              </button>
            ))}
          </div>
          {day && (
            <Text variant="secondary" size="xs" DANGEROUS_className="mt-2">
              Times shown in your timezone ({tz}).
            </Text>
          )}
        </div>
      )}

      {/* Step 3 — details */}
      {service && slot && (
        <div>
          <Text as="h2" variant="heading3" DANGEROUS_className="mb-3">3. Your details</Text>
          <div className="flex flex-col gap-3 max-w-md">
            <input
              className="rounded-md border border-kumo-line bg-kumo-base px-3 py-2 text-sm"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="rounded-md border border-kumo-line bg-kumo-base px-3 py-2 text-sm"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="rounded-md border border-kumo-line bg-kumo-base px-3 py-2 text-sm"
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <textarea
              className="rounded-md border border-kumo-line bg-kumo-base px-3 py-2 text-sm min-h-24"
              placeholder="Anything we should know? (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            {error && <Text variant="secondary" size="sm" DANGEROUS_className="text-kumo-danger">{error}</Text>}
            <div>
              <Button
                variant="primary"
                size="sm"
                disabled={!form.name || !form.email || status === "submitting"}
                onClick={submit}
              >
                {status === "submitting"
                  ? "Booking…"
                  : `Book ${timeLabel(slot.start)}, ${dayKey(slot.start)}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
