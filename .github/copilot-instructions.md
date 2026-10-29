# Copilot instructions for this repository

## Repository overview

This repo is a headless commerce storefront for DisplayCellPros built on Next.js 16, Shopify Storefront API, and Builder.io CMS.

- The app is a Pages Router app, not App Router.
- `pages/[[...path]].tsx` is the main Builder-driven catch-all route; it resolves page content through `lib/resolve-builder-content.ts` and renders it with `<BuilderComponent>`.
- Native storefront routes such as `pages/product/[handle].tsx`, `pages/collection/[handle].tsx`, `pages/products.tsx`, and `pages/cart.tsx` handle transactional flows that are not CMS-managed.
- Shopify data access is split between the active service layer (`services/shopify.ts`) and an older hook layer under `lib/shopify/storefront-data-hooks/`; prefer the service layer for new work unless a file is intentionally using the Builder/Cart context pattern.
- `config/shopify.ts` and `next.config.js` are the source of truth for Storefront env usage and browser-exposed settings, including CSP and remote image allowlists.

Important repo-specific guidance from `AGENTS.md`, `CLAUDE.md`, and the README:

- This app runs on Next.js 16 and may differ from older examples; read `node_modules/next/dist/docs/` before changing Next.js-specific behavior.
- Do not reintroduce older Next.js 13/14 conventions that conflict with this version.
- Read `AGENT_WORKFLOW.md` before work that overlaps with other agent branches or is intended for a pull request.

## Build, lint, and validation commands

Use Node 24.x and npm 11+ as required by `package.json`.

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

This serves the storefront at `http://localhost:3000`.

Production build:

```bash
npm run build
```

`npm run build` runs the repo's build prechecks and the Next.js production build.

Lint:

```bash
npm run lint
```

Type-check:

```bash
npm run typecheck
```

Run a single Jest test file:

```bash
npx jest tests/cart-storage.test.js
```

Or run a specific file by path:

```bash
npx jest --runTestsByPath tests/cart-storage.test.js
```

Other repo checks worth knowing:

```bash
npm run precheck
npm run precheck:fast
npm run check:secrets
npm run check:customer-account-auth-health
npm run check:security-cors
npm run test
npm run test:a11y
```

Run lint on a specific file with:

```bash
npx eslint "pages/product/[handle].tsx"
```

For PR validation, follow `AGENT_WORKFLOW.md` and `CONTRIBUTING.md`; `npm run precheck` is the CI-equivalent suite and includes the build.

## Architecture and feature boundaries

### 1. Builder-driven page shell + native storefront pages

- Marketing and CMS-managed pages are resolved through the Builder catch-all route at `pages/[[...path]].tsx`.
- `lib/resolve-builder-content.ts` resolves page data, enriches Builder entries with Shopify products/collections, and wires up custom Builder blocks (`ProductGrid`, `CollectionBox`, etc.).
- Native pages remain in `pages/` when the route is transactional or app-like rather than CMS-defined.
- Static pages use `getStaticProps` / `getStaticPaths` and `revalidate`, matching the repo's storefront route pattern.
- When adding a Builder block, follow its existing registration in `pages/_app.tsx`; if it needs Shopify-backed data before render, follow the `getAsyncProps` resolution pattern in `lib/resolve-builder-content.ts`.

### 2. Shopify integration and data flow

- `services/shopify.ts` is the active Storefront client used by pages and feature code.
- `lib/shopify/storefront-data-hooks/` contains the older hook-based client used by Builder block resolution and the cart context.
- `config/shopify.ts` is the centralized env/config layer and validates public token usage so private Shopify tokens are not exposed in browser bundles.
- `fetchAllAvailableProducts` and related helpers may fall back to the demo catalog when Storefront credentials are missing or restricted; treat that as an integration fallback, not a sign that the code path is broken.
- Keep API boundaries clear: use `services/shopify.ts` for Storefront reads and current product/collection work; use the existing hook operations when changing `CartContext` or Builder resolution. Admin mutations and customer-account OAuth belong to their separate service modules and API routes, not the public Storefront client.

### 3. Cart and shared UI state

- `context/CartContext.tsx` owns app-wide cart state.
- `lib/cart-storage.ts` persists cart data in the browser.
- The cart layer still builds on the older storefront-data-hooks API, so cart-related features should match existing patterns even when new code is written elsewhere.

### 4. Builder + app shell + security

- `blocks/` holds Builder visual blocks and data models; `components/` holds reusable UI and shared storefront components.
- `next.config.js` enforces the app's CSP and remote image allowlists. When introducing an external API or asset host, update the relevant CSP directive and `images.remotePatterns` together when images use that host.
- Secret and security checks are part of the repo's health guardrails (`check:secrets`, `check:customer-account-auth-health`, `check:xss-hardening`, `check:security-cors`, `audit:csp`). Do not weaken them to make a change pass.
- Validate untrusted input at API boundaries, use explicit origins for CORS, preserve OAuth redirect protections, and keep Admin/API credentials server-only through the existing config and service layers.

## Key conventions

- Prefer the repo alias imports already configured in `tsconfig.json`: `@lib/*`, `@config/*`, `@components/*`, `@services/*`, `@utils/*`.
- Keep environment-driven defaults centralized in `config/shopify.ts` and related config files; do not read Shopify credentials or private env vars from feature code directly.
- Builder owns the structure of CMS-managed marketing pages; Shopify supplies current product and collection data. Native Next.js pages own transactional and app-like flows.
- Preserve public response shapes and user-facing behavior unless a feature explicitly requires a change.
- Check `AGENT_WORKFLOW.md` and `CONTRIBUTING.md` for branch isolation, overlap checks, PR validation, and maintainer boundaries. Do not push to a branch after its PR merges or self-merge agent-authored PRs.
- Use the `playwright` MCP server in `.mcp.json` for browser-based storefront checks against a running local app; use `chrome-devtools` for browser inspection and diagnostics. Avoid real customer data or production-affecting actions during local browser validation.

## Project-specific guardrails

- Never commit `.env` or `.env.local` files.
- Treat `BUILDER_PUBLIC_KEY`, `SHOPIFY_STOREFRONT_API_TOKEN`, `NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN`, and customer-account OAuth env vars as configuration concerns that must go through the existing config layer.
- Keep public Storefront tokens distinct from private `shpat_`/`shpua_` tokens; never expose private tokens to browser code.
- Follow the repo's repository-guidelines instructions, especially around security boundaries, narrow changes, and avoiding overly broad refactors.
