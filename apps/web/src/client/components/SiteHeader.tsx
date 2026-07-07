import { useState } from "react";
import { useTenant } from "../hooks/useTenant";

/**
 * Public-site header: brand top-right, nav band underneath. Everything is
 * branding-driven (site.config.ts) and themed through CSS custom properties —
 * sites set the --site-header / --site-nav vars in theme.css, never edit this file:
 *
 *   --site-header-bg   header row background (default: page base)
 *   --site-nav-bg      nav band background
 *   --site-nav-fg      nav link color
 *   --site-nav-accent  menu button + hover color
 *
 * Links are plain anchors: mounts are runtime config (ADR 007), so the typed
 * router's literal paths can't be used here.
 */
export function SiteHeader() {
  const tenant = useTenant();
  const [open, setOpen] = useState(false);
  const nav = tenant?.branding.nav ?? [];

  return (
    <header style={{ background: "var(--site-header-bg, var(--color-kumo-base))" }}>
      <div className="max-w-5xl mx-auto w-full px-6 pt-4 pb-3 flex items-center justify-between">
        {/* Menu button — placeholder dots motif until the client's device
            graphic arrives (site brief item 6); shown on small screens only. */}
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="sm:hidden flex items-center gap-1 p-2"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: "var(--site-nav-accent, var(--color-kumo-brand))" }}
            />
          ))}
        </button>

        <span aria-hidden className="sm:block hidden" />

        {/* Brand, top right (site brief item 2): image logo when the site
            provides one, styled wordmark until then. */}
        <a href="/" className="flex items-center">
          {tenant?.branding.logo ? (
            <img src={tenant.branding.logo} alt={tenant.branding.name} className="h-10" />
          ) : (
            <span
              className="text-lg font-bold tracking-[0.18em] uppercase"
              style={{ color: "var(--site-nav-accent, var(--color-kumo-brand))" }}
            >
              {tenant?.branding.name ?? ""}
            </span>
          )}
        </a>
      </div>

      {/* The nav band (site brief item 3) */}
      <nav
        className={`border-y border-kumo-line ${open ? "block" : "hidden"} sm:block`}
        style={{ background: "var(--site-nav-bg, var(--color-kumo-base))" }}
      >
        <div className="max-w-5xl mx-auto w-full px-6 flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-x-6">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="py-3 text-sm whitespace-nowrap hover:underline underline-offset-4"
              style={{ color: "var(--site-nav-fg, var(--color-kumo-default))" }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
