# Bookings (Microsoft Bookings integration)

The `bookings` module puts a "book a consult"-style flow on the public site, backed by [Microsoft Bookings](https://bookings.cloud.microsoft) — so appointments land in the business's real calendar, confirmation emails come from Microsoft 365, and staff manage everything in the Bookings app they already have.

It has three modes and picks the best one your configuration supports, falling back gracefully:

| Mode | What visitors see | What it needs |
|---|---|---|
| `api` | A fully branded, in-site flow: pick a service → pick a time → enter details → booked. Availability and appointment creation go through Microsoft Graph. | Entra app registration + admin consent, four vars + one secret (below) |
| `embed` | The Microsoft Bookings page in an iframe at `/book` | Just the booking page's embed URL |
| `unconfigured` | A quiet "get in touch instead" fallback linking to the contact page | Nothing |

The page lives at the module's mount (`/book` by default). Other modules integrate by linking there (any CTA `href`), or by rendering the core `BookingFlow` component (`apps/web/src/client/components/BookingFlow.tsx`) directly inside their own pages — it's core-owned precisely so modules don't need to import each other.

## Prerequisites (all modes)

1. A Microsoft 365 subscription that includes Bookings (Business Standard/Premium, E1/E3/E5, A3/A5).
2. A **shared booking page** — not a personal "Book with me" page; the Graph API and the embed code only exist for shared pages. Create one at [bookings.cloud.microsoft](https://bookings.cloud.microsoft) ("Create booking page"), add at least one **service** (e.g. "Initial consult, 30 min") and at least one **staff member**, set business hours, and **publish** it.

## Embed mode (10 minutes, no Azure)

1. In the Bookings app, open the booking page → **Embed** → copy the URL from the iframe snippet's `src`.
2. Set it in the root `wrangler.jsonc`:
   ```jsonc
   "vars": { "BOOKINGS_EMBED_URL": "https://outlook.office365.com/owa/calendar/..." }
   ```
3. Deploy. `/book` now renders the Microsoft page in an iframe. Done — but it looks like Microsoft, not like your site. That's what API mode fixes.

## API mode (the integrated one)

### 1. Register an Entra application

In the [Azure portal](https://portal.azure.com) (or [entra.microsoft.com](https://entra.microsoft.com)) → **App registrations** → **New registration**:

- Name: e.g. `site-bookings` — single tenant, no redirect URI needed.
- Note the **Application (client) ID** and **Directory (tenant) ID** from the overview page.

### 2. Grant application permissions

App registration → **API permissions** → **Add a permission** → **Microsoft Graph** → **Application permissions**:

- `Bookings.Read.All` — read the business, services, staff, and availability
- `BookingsAppointment.ReadWrite.All` — create appointments

Then **Grant admin consent** (requires a tenant admin). Without consent every call 403s.

### 3. Create a client secret

App registration → **Certificates & secrets** → **New client secret**. Copy the **value** immediately (it's shown once). Diary the expiry — bookings die silently when it lapses.

### 4. Find the booking business id

The business id is the booking page's mailbox-style address, e.g. `SimpkinLegal@contoso.onmicrosoft.com`. It's in the booking page's URL/share link, or list it:

```
GET https://graph.microsoft.com/v1.0/solutions/bookingBusinesses
```

(Graph Explorer works for this, signed in as an admin.)

### 5. Configure the worker

Non-secrets in the root `wrangler.jsonc`:

```jsonc
"vars": {
  "MS_TENANT_ID": "<directory-tenant-id>",
  "MS_CLIENT_ID": "<application-client-id>",
  "BOOKINGS_BUSINESS_ID": "SimpkinLegal@contoso.onmicrosoft.com",
  "BOOKINGS_SERVICE_ID": ""   // optional: pin one service; empty = visitor picks
}
```

The secret via wrangler (never a var, never committed):

```bash
wrangler secret put MS_CLIENT_SECRET
```

Local dev: put all five in `.dev.vars` at the repo root (beside `wrangler.jsonc`, gitignored) as `KEY=value` lines.

### 6. Deploy and test

`/api/bookings` should report `{"mode":"api"}`; `/book` shows your services. Book a test slot — the appointment should appear in the Bookings calendar and the confirmation email should arrive.

## How API mode works (and its rules)

- The worker authenticates app-only (client credentials, per-isolate token cache) and talks to `graph.microsoft.com/v1.0/solutions/bookingBusinesses/{id}`.
- Slots are computed from `getStaffAvailability` for the service's staff, sliced by the scheduling policy (slot interval, minimum lead time) and the service duration plus pre/post buffers. Graph's [business rules](https://learn.microsoft.com/en-us/graph/bookingsbusiness-business-rules) require app-created appointments to respect these — Bookings does **not** re-check them for application permissions, so the module re-derives availability at booking time and rejects requests for slots it wouldn't offer (409).
- Staff is not passed on create, so Bookings auto-assigns — valid regardless of the "allow staff selection" policy.
- All times cross the API as UTC instants; the visitor's browser renders them in their own timezone, and their IANA timezone goes on the appointment for Microsoft's confirmation emails.

## Limits and notes

- The booking POST is public (it has to be). Zod-validates shape and enforces slot validity, but there's no CAPTCHA/rate limit yet — if a site attracts abuse, add a Turnstile check in front of `POST /api/bookings/book`.
- Availability parsing uses the fixed UTC offset Graph reports per window; a slot that straddles a DST transition can be off by the DST delta. Near-term slots (the normal case) are unaffected.
- `BOOKINGS_SERVICE_ID` is reserved for pinning a single service; today the service list is always shown when more than one service exists.
- Personal "Book with me" pages don't work with either embed or API mode — shared booking pages only.
