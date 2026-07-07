# Plan 02 — Theming Without Divergence

**Status: Implemented** (2026-07-04) — see [docs/features/theming.md](../features/theming.md) for current behavior. Kept here as the design record.

**Closes:** G7 (no theming layer)
**Prereqs:** none technically; most valuable before the first derived site ships.

## Problem

`apps/web/src/client/styles/app.css` imports Kumo tokens and Tailwind with zero override points. A derived site wanting its own brand today has only bad options: edit base component code (divergence) or edit `app.css` in place (merge conflicts on every base update).

## Principle

**Sites override tokens, never components.** All base components already consume Kumo semantic tokens (`bg-kumo-canvas`, `text-kumo-brand`, `border-kumo-line` — see the template pages), which is exactly the discipline needed; the missing piece is a sanctioned place for a site to redefine what those tokens resolve to.

## Design

1. **Theme file.** Each site owns exactly one `apps/web/src/client/styles/theme.css`, imported *after* Kumo tokens and *before* Tailwind in `app.css`. It redefines CSS custom properties only: brand palette, canvas/surface colours, radius, font stack. The base ships it with an empty `:root {}` and a commented catalogue of the overridable Kumo variables (enumerate them from `@cloudflare/kumo/styles/tailwind` while implementing).
2. **Structural knobs stay config, not CSS.** Logo, product name, header nav, footer links come from `site.config.ts` (Plan 03) and are rendered by base shell components (`AppHeader` etc.). The current templates hardcode "Acme Corp" and nav buttons — extracting those into config is part of this plan.
3. **Dark mode** continues via `useDarkMode`; theme overrides must define both light and dark values where they differ (document the pattern in the theme file header).
4. **Escape hatch with a ratchet.** If a site genuinely needs a different component, the rule is: add a variant or slot to the base component upstream, then consume it. A component copied into a site repo is a bug against ADR 003's ownership boundary.

## Steps

1. Add `theme.css` with the documented token catalogue; wire the import order in `app.css`.
2. Extract branding/nav/footer from templates into a `branding` section of the site config schema; make `AppHeader` and the shell render from it.
3. Prove it: create a scratch second theme (different palette + radius + name) and confirm a convincing rebrand with `theme.css` + config changes only — no component edits.
4. Document in the new-site guide (done — [new-site.md](../guides/new-site.md) §Theme) and add a `docs/features/theming.md` describing the token catalogue once it exists.

## Done when

A derived site achieves a full rebrand by touching only `theme.css` and `site.config.ts`, and a subsequent base update merges into that site with no conflicts in styling code.
