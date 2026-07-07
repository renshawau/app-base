import { useTenant } from "../hooks/useTenant";

/**
 * Public-site footer, rendered from branding.footer (site.config.ts): a row
 * of links plus an optional statement (e.g. an Acknowledgement of Country).
 * Themed via CSS custom properties in the site's theme.css:
 *
 *   --site-footer-bg    background (default: recessed surface)
 *   --site-footer-link  link color
 *   --site-footer-fg    statement text color
 *
 * Renders nothing when the site declares no footer.
 */
export function SiteFooter() {
  const tenant = useTenant();
  const footer = tenant?.branding.footer;
  if (!footer) return null;

  return (
    <footer
      className="mt-auto"
      style={{ background: "var(--site-footer-bg, var(--color-kumo-recessed))" }}
    >
      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
          {footer.links.map((link) => (
            <a
              key={link.href + link.label}
              href={link.href}
              className="text-xs hover:underline underline-offset-4"
              style={{ color: "var(--site-footer-link, var(--color-kumo-brand))" }}
            >
              {link.label}
            </a>
          ))}
        </div>
        {(footer.text || footer.logo) && (
          <div className="flex flex-wrap items-center gap-6">
            {footer.logo && (
              <img
                src={footer.logo}
                alt={tenant.branding.name}
                style={{ height: "var(--site-footer-logo-height, 4rem)" }}
              />
            )}
            {footer.text && (
              <p
                className="text-xs leading-relaxed max-w-3xl flex-1 min-w-64"
                style={{ color: "var(--site-footer-fg, var(--color-kumo-subtle))" }}
              >
                {footer.text}
              </p>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
