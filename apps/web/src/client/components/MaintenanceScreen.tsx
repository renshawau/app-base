import { useTenant } from "../hooks/useTenant";

/**
 * The maintenance / coming-soon splash: brand colors and the logo, nothing
 * else. Shown to unauthenticated visitors when tenant.maintenance.enabled;
 * authenticated users bypass it (see routes/__root.tsx). Themed via:
 *
 *   --site-splash-bg           background (default: brand color)
 *   --site-splash-fg           text color
 *   --site-splash-logo-height  logo size
 *
 * The logo falls back: maintenance.logo, then branding.logo, then the site
 * name as a tracked wordmark.
 */
export function MaintenanceScreen() {
  const tenant = useTenant();
  const logo = tenant?.maintenance.logo ?? tenant?.branding.logo;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center"
      style={{
        background: "var(--site-splash-bg, var(--color-kumo-brand))",
        color: "var(--site-splash-fg, #fff)",
      }}
    >
      {logo ? (
        <img
          src={logo}
          alt={tenant?.branding.name ?? ""}
          style={{ height: "var(--site-splash-logo-height, 9rem)" }}
        />
      ) : (
        <span className="text-3xl font-bold tracking-[0.18em] uppercase">
          {tenant?.branding.name ?? ""}
        </span>
      )}
      {tenant?.maintenance.message && (
        <p className="text-sm max-w-md leading-relaxed" style={{ opacity: 0.85 }}>
          {tenant.maintenance.message}
        </p>
      )}
      {tenant?.maintenance.link?.href && (
        // External URLs only — internal paths are behind the maintenance gate
        // (see the schema comment). Themed via --site-splash-cta-*.
        <a
          href={tenant.maintenance.link.href}
          className="rounded-md px-5 py-2.5 text-sm font-medium border border-current"
          style={{
            background: "var(--site-splash-cta-bg, transparent)",
            color: "var(--site-splash-cta-fg, inherit)",
          }}
        >
          {tenant.maintenance.link.label}
        </a>
      )}
    </div>
  );
}
