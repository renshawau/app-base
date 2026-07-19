# Theming

## The rule

Sites override design **tokens**, never component code. If a component can't be restyled through tokens, that's a gap in the base — request a variant or slot upstream instead of forking the component. Forking feels faster on the day; you pay for it on every upstream merge afterwards.

## How it works

`apps/web/src/client/styles/theme.css` is the one file a site edits to rebrand. It's imported last in `app.css`, after Kumo's tokens and Tailwind:

```css
@import "@cloudflare/kumo/styles/tailwind";
@import "tailwindcss";
@import "./theme.css";
```

Interestingly, the import order isn't what makes the overrides win. Kumo's tokens are declared inside a Tailwind `@theme` block, which CSS cascade layers place in a `theme` layer — and per the CSS spec, **unlayered rules always beat layered ones**, regardless of source order or specificity. `theme.css` declares plain, unlayered `:root { --color-kumo-brand: ...; }` rules, so anything set there overrides Kumo's default unconditionally.

## Token catalogue

The base ships `theme.css` with every override commented out, so a fresh site inherits Kumo's defaults. The commented catalogue covers:

- **Brand:** `--color-kumo-brand`, `--color-kumo-brand-hover`, `--text-color-kumo-brand`
- **Surfaces:** `--color-kumo-canvas`, `--color-kumo-base`, `--color-kumo-recessed`, `--color-kumo-line`, `--color-kumo-hairline`
- **Shape & type** (Tailwind's own tokens, not Kumo-namespaced): `--radius-lg`, `--font-sans`

If you need something beyond the curated list, the full set of ~170 Kumo tokens is in `node_modules/@cloudflare/kumo/dist/styles/theme-kumo.css` — the same override mechanism applies to any of them.

The public-site chrome (`SiteHeader`, `SiteFooter`, and the pages module's hero band) adds its own site-level custom properties, all optional with sensible Kumo-token fallbacks: `--site-header-bg`, `--site-nav-bg`, `--site-nav-fg`, `--site-nav-accent`, `--site-hero-bg`, `--site-hero-fg`, `--site-hero-accent`, `--site-hero-cta-bg`, `--site-hero-cta-fg`, `--site-hero-overlay` (tint over rotating hero background images), `--site-splash-bg`, `--site-splash-fg`, `--site-splash-logo-height`, `--site-splash-cta-bg`, `--site-splash-cta-fg` (the maintenance/coming-soon screen), `--site-footer-bg`, `--site-footer-link`, and `--site-footer-fg`. Footer links and text are data, not CSS — they come from `branding.footer` in `site.config.ts`.

## Dark mode

`useDarkMode` (`apps/web/src/client/hooks/useDarkMode.ts`) sets `data-mode="dark"|"light"` on `<html>`. Kumo's tokens use the CSS `light-dark()` function gated on `color-scheme`, which Kumo's own binding CSS flips via `[data-mode="dark"] { color-scheme: dark; }`. If one of your theme overrides should differ between light and dark, put the dark value in the matching `[data-mode="dark"] { ... }` block in `theme.css`.

## Branding data (name, nav)

Structural branding — the site name, nav links — isn't CSS. It comes from `site.config.ts`'s `branding` field (schema in `@app-base/types`), flows through tenant resolution (`apps/web/src/worker/tenant.ts`), and reaches the client at `/api/tenant`. `useTenant()` (`apps/web/src/client/hooks/useTenant.ts`) fetches it; see `apps/web/src/client/modules/blog/BlogPage.tsx` for the pattern — its header title reads `tenant.branding.name` instead of a hardcoded string.

Only the blog module (the one real feature module) consumes this today. `portfolio`, `dashboard`, `site`, and `showcase` are demo pages showcasing the design system rather than product surfaces, so they keep their own hardcoded demo copy instead of being wired to site branding.

## Verified

We've done a full rebrand — different brand color, sharper corners, different site name — by editing only `theme.css` and `site.config.ts`, with zero component edits, then reverted it. If you want to repeat the exercise, the verification steps are in `docs/plans/02-theming.md`.
