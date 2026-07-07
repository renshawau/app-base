# Starting a New Site on app-base

This is the end-to-end process for launching a site. Steps marked **[planned — Plan NN]** depend on gap-closure work that hasn't landed yet; everything else works today.

## Step 0 — Pick the model

The first decision is how the site relates to the base, and it shapes everything after it.

**Tenant (Model A):** the site is just a hostname on the shared multi-tenant Worker. Pick this when we operate the site ourselves, it only needs modules that already exist, and it can share the base's release cadence. There's no new repo, and updates happen automatically with every base deploy.

**Install (Model B):** the site gets its own repo and its own Worker deployment. Pick this when the site needs private modules, someone else operates it, or it genuinely needs isolation. Updates follow [ADR 003](../adr/003-distribution-and-update-strategy.md).

If you're unsure, start with Model A — promoting a tenant to its own install later is much easier than consolidating an install back in.

## Model A — new tenant

1. Provision the hostname/zone in Cloudflare and route it to the Worker.
2. Configure Cloudflare Access for the new hostname (or a public-access policy if it's an open site).
3. Set `tenancy: "multi"` in `site.config.ts` if it isn't already, then add the tenant record — branding, enabled modules — to the `TENANTS` KV store. See the [maintenance guide](./maintenance.md#tenant-management).
4. That's it. The next base deploy picks the tenant up automatically.

## Model B — new install

### 1. Create the repo

**The easy way is the Deploy to Cloudflare button** in the root README ([ADR 005](../adr/005-deploy-button-bootstrap.md)). It clones the repo into your GitHub account, provisions the D1 database and TENANTS KV namespace in your Cloudflare account (rewriting the placeholder IDs so you never touch them), and connects Workers Builds CI. Once it's done, clone your new repo locally and add the upstream remote as below.

**The manual alternative**, for private repos or if the button isn't set up yet:

```bash
# from the GitHub template ("Use this template"), then:
git clone <your-site-repo> && cd <your-site-repo>
git remote add upstream <app-base-repo-url>
pnpm install
```

### 2. Make it yours (only these files)

A derived site edits **its** files and leaves base internals alone — that's the whole trick to keeping upstream merges clean:

| You own | Purpose |
|---|---|
| `wrangler.jsonc` (repo root) | Worker name, routes/domains, bindings |
| `apps/web/src/site.config.ts` | name, tenancy mode, branding, module list |
| `apps/web/src/client/styles/theme.css` | design-token overrides |
| `apps/web/src/modules.ts` + your own modules | what ships |

If you find yourself needing to change anything outside this list, that's a gap in the base — raise it upstream rather than editing in place. Editing base internals feels faster today and costs you every merge from then on.

### 3. Pick modules

List your modules in `apps/web/src/modules.ts` and register them in the worker and client registries (see [docs/features/modules.md](../features/modules.md)). Anything you don't list costs zero bytes in your bundles — we've verified this by removing a module and watching its client chunk disappear from `dist/client/assets`. Presets (`@app-base/preset-*`) for curated bundles across a product family are **[planned — ADR 004]**; you don't need them for a single site today.

### 4. Theme

Redefine design tokens in `theme.css` — palette, radius, fonts. There's a commented catalogue already in the file, and [docs/features/theming.md](../features/theming.md) explains the full mechanism. Set the site name and nav in `site.config.ts`. Never copy or edit base components to restyle them; if a component can't be themed through tokens, that's a gap — request a variant or slot upstream.

### 5. Settings

Settings live in three tiers, and each value has exactly one home:

1. Deploy config in `wrangler.jsonc` and secrets.
2. Build-time values in `site.config.ts` — validated against the `siteConfigSchema` zod schema in `@app-base/types`, so a bad config fails fast at worker startup instead of surfacing as weird behavior later.
3. Runtime tenant settings in the `TENANTS` KV, which is only read when `tenancy: "multi"`.

The design rationale is in [docs/plans/03-settings-and-tenant-config.md](../plans/03-settings-and-tenant-config.md).

### 6. Data

If you deployed with the button, the D1 database is already provisioned. For manual setups: `wrangler d1 create <name>` and set `database_id` in `wrangler.jsonc` locally — never commit real IDs (see [ADR 005](../adr/005-deploy-button-bootstrap.md)). Either way, you never hand-write schema for base modules: the migration runner applies module schemas and upgrades automatically on first request. See [docs/features/data.md](../features/data.md). A deploy-time migrate step (instead of the request-time fallback) is **[planned — Plan 04 follow-up, needs CI]**.

### 7. Deploy

Button-created repos: push to main, and Workers Builds deploys automatically. Manual setups: `pnpm run deploy` from the repo root, or set the `CLOUDFLARE_API_TOKEN` secret to activate the GitHub Action's deploy step — the action skips itself when the secret is absent, so the two paths never double-deploy.

### Taking base updates

```bash
git fetch upstream
git merge upstream/<latest-release-tag>   # read the CHANGELOG first
pnpm install && pnpm typecheck && pnpm test
# migrations run on your next deploy
```

If you kept to the files in step 2, merges are near-automatic. Once packages-first lands (ADR 003 Phase 2), this whole section becomes `pnpm update "@app-base/*"`.
