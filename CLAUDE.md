# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A headless commerce storefront: **Next.js (Pages Router, v16)** for rendering, **Shopify Storefront API** for product/cart/checkout data, and **Builder.io** as the visual CMS driving page content. Live at `www.displaycellpros.com` (verified against this repo's connected Vercel project's domain configuration — `displaycellpros.com` apex 308-redirects there); this instance is configured for the `displaycellpros.myshopify.com` store.

Read `node_modules/next/dist/docs/` before writing Next.js code — this is Next 16 and APIs may differ from training data (see `AGENTS.md`).

## Commands

```bash
npm run dev              # next dev -p 3000 -H 0.0.0.0
npm run build            # runs precheck, then next build
npm run typecheck        # tsc --noEmit
npm run lint             # eslint blocks components config context lib pages services
npm run lint:a11y        # stylelint "**/*.css"
npm run test:a11y        # jest (jest-axe accessibility tests)
npm run check:secrets    # scan for hardcoded credentials
npm run check:shopify-catalog-health   # verify live Storefront API + ISR + CSP wiring to the Shopify catalog
npm run fix:shopify-catalog-health     # same, auto-fixing mechanical issues (stale revalidate, missing CSP/image entries)
npm run precheck         # node-version check + ci-integrity check + typecheck + lint + secrets (runs before build)
```

Single Jest test file: `npx jest tests/cart-storage.test.js`

Before opening a PR, run the full suite, not a subset — see "Validation" in `AGENT_WORKFLOW.md`:
```bash
npm run precheck && npm run test:a11y && npm run build
```

`scripts/check-ci-integrity.js` fails the build if `.github/workflows/ci.yml` steps are stripped or if `eslint.config.mjs` disables `react-hooks` rules wholesale — don't route around a failing check by weakening it; fix the underlying issue (see `AGENT_WORKFLOW.md`).

## Multi-agent workflow

This repo is developed by multiple isolated agents working in separate worktrees/branches, integrated via PR by a maintainer. Full protocol — worktree isolation, checking for overlapping branches before starting, dependency-bump rules, merge-conflict handling, stale-branch cleanup, post-merge branch hygiene — is in `AGENT_WORKFLOW.md` and `CONTRIBUTING.md`. Key points:

- Check `git log --all --oneline -- <path>` / `gh pr list` for other branches already touching the same files before starting — `pages/[[...path]].tsx` and Shopify config have had conflicting parallel edits before.
- Never push to a branch after its PR has merged; open a new branch instead.
- Don't self-merge agent-authored PRs.

## Architecture

### Routing: Builder-driven catch-all + a few native pages

`pages/[[...path]].tsx` is the primary route handler — it resolves *any* path against Builder.io's `page` model via `resolveBuilderContent()` (`lib/resolve-builder-content.ts`) and renders it with `<BuilderComponent>`. If no Builder page exists for the root `/`, it falls back to rendering a real homepage backed by live Shopify products (`fetchAllAvailableProducts`) rather than 404ing; non-root paths with no Builder page do 404. ISR revalidates every 30s.

Alongside the catch-all, a handful of routes are native Next pages, not Builder-driven: `pages/product/[handle].tsx`, `pages/collection/[handle].tsx`, `pages/products.tsx`, `pages/cart.tsx`, `pages/trends.tsx`, `pages/account/index.tsx`. When adding a new URL, decide whether it belongs in Builder (marketing/content pages) or as a native page (transactional/app-like pages).

`lib/resolve-builder-content.ts` also wires up Builder's `getAsyncProps` for custom blocks (`ProductGrid`, `CollectionBox`, `ProductBox`, `ProductCollectionGrid` — defined in `blocks/`) so their Shopify data is resolved server-side in production before Builder renders them.

### Shopify data layer — two parallel clients, know which to use

There are two independent ways to talk to Shopify Storefront in this codebase:

1. **`services/shopify.ts`** — the primary, actively-developed client. Wraps `@shopify/storefront-api-client`, exposes `storefrontFetch`/`shopifyFetch`, ready-made GraphQL operations (products, collections, cart CRUD), and high-level helpers like `fetchAllAvailableProducts`, `fetchStorefrontProductByHandle`. Handles token-type detection (`shpat_` private vs public tokens), retries, and timeouts. **This is what pages and components should call.**
2. **`lib/shopify/storefront-data-hooks/`** — an older hook-based data layer (`useCart`, `useAddItemToCart`, etc.) with its own `operations.ts`, used by `lib/resolve-builder-content.ts` for Builder block resolution and by `context/CartContext.tsx`.

`fetchAllAvailableProducts` / `fetchStorefrontProductByHandle` in `services/shopify.ts` hit the Storefront API directly whether called server-side (SSR/SSG) or client-side — there is no `pages/api/products/` proxy route in this codebase (an earlier version of this doc described one; it doesn't exist).

**No demo/fallback catalog**: if Storefront credentials are missing or return `ACCESS_DENIED`, `fetchAllAvailableProducts` logs a `console.warn`/`console.error` and returns zero products (`{ products: [], ok: false, errors }`) — there is no `lib/shopify/demo-catalog.ts` and no `isDemo` flag (an earlier version of this doc described a fallback that was never built). A bad token or Storefront misconfiguration currently renders as a silently empty storefront, not obviously-fake demo data. Run `npm run check:shopify-catalog-health` to catch this class of failure explicitly.

`services/shopify-admin.ts` and `services/shopify-customer-account.ts` are separate: Admin API (server-side mutations) and Customer Account API (headless OAuth2/PKCE for buyer auth — see `pages/api/account/*` and `pages/api/auth/callback.ts`).

`config/shopify.ts` is the single source of truth for env var resolution (domain, tokens, API version) — it validates that `NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN` isn't accidentally a private (`shpat_`/`shpua_`) token, since that would leak a private token into the browser bundle. Don't read `process.env.SHOPIFY_*` directly elsewhere; go through `config/shopify.ts` / `services/shopify.ts`'s `getShopifyConfig()`.

### Cart state

`context/CartContext.tsx` (large, ~1050 lines) provides cart state app-wide, backed by `lib/cart-storage.ts` for persistence. It builds on the `storefront-data-hooks` cart operations, not `services/shopify.ts`'s cart mutations directly.

### Import aliases

Configured in `tsconfig.json`: `@lib/*`, `@assets/*`, `@blocks/*`, `@config/*`, `@components/*`, `@services/*`, `@utils/*`. Use these instead of relative paths crossing top-level directories.

### Security headers / CSP

`next.config.js` sets a strict CSP allowlisting exactly the origins this app needs (Builder.io, `*.myshopify.com`, Vercel Live/Toolbar, Cloudinary, Unsplash placeholder images). When adding a new external asset host, image domain, or API the browser calls directly, update both `images.remotePatterns` and the CSP's `connect-src`/`img-src` in `next.config.js` — comments there explain why each origin is present.

### Environment variables

Only variables explicitly listed in `next.config.js`'s `env` block reach the browser bundle; everything else (Admin token, client secret, private Storefront token) stays server-only. `.env.example` documents every variable; copy to `.env.local` for local dev. Never commit `.env`/`.env.local`.

### Health-check scripts (`scripts/`)

A number of custom Node scripts back the `check:*` npm scripts and CI: `check-ci-integrity.js` (see above), `check-hardcoded-secrets.js`, `check-node-version-consistency.js` (Node version must match across `.nvmrc`, `package.json` `engines`, and CI), `check-builder-content-health.js`, `check-project-health.js`, `check-shopify-catalog-health.js` (live Storefront API reachability/catalog contents + regression guard for ISR `revalidate` windows on catalog pages and the Shopify CDN/API entries in `next.config.js`'s CSP and `images.remotePatterns` — run with `--fix` to auto-correct mechanical drift; not part of `precheck` since it makes a live network call and needs real Storefront credentials), `check-stale-branches.js` (finds fully-merged remote branches safe to delete — run weekly via `.github/workflows/stale-branches.yml`). These are guardrails other agents have tripped in the past (see `AGENT_WORKFLOW.md` for the incidents) — don't disable them to unblock a push.
