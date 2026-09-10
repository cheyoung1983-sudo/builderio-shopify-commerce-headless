# Copilot instructions for this repository

## Repository overview

This repo is a headless commerce storefront built with Next.js 16 and a custom Shopify + Builder.io architecture.

- App entry points live in `pages/` for route-level pages and static generation.
- Storefront data is pulled from Shopify using the Storefront API and Shopify SDK helpers under `lib/shopify/` and `services/`.
- Builder.io CMS content is loaded via `@builder.io/react` and `resolveBuilderContent()` in `lib/resolve-builder-content.ts`.
- `blocks/` contains Builder data models and visual components, while `components/` contains reusable app UI.
- `config/shopify.ts` and `config/builder.ts` centralize environment-driven configuration and default fallbacks.

Important repo-specific guidance from `AGENTS.md` and `CLAUDE.md`:

- This app is intentionally on a newer Next.js version than the one most examples assume; if a code pattern feels out of date, check `node_modules/next/dist/docs/` before changing it.
- Avoid reintroducing older Next.js 13/14 conventions that conflict with the Next.js 16 setup here.

## Build, lint, and validation commands

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

This serves the storefront on `http://localhost:3000`.

Production build:

```bash
npm run build
```

The build script includes the repo's precheck: `npm run typecheck && npm run lint`.

Lint:

```bash
npm run lint -- --quiet
```

Type-check:

```bash
npm run typecheck
```

Single-file validation patterns:

```bash
npx eslint pages/some-page.tsx
npx eslint components/common/Navbar.tsx
npx tsc --noEmit
```

There is no dedicated `test` script or Jest setup in this repo today. Use the repo lint/typecheck commands as the normal validation path, and run targeted `eslint` commands for a changed file when you need a narrow check.

## Architecture and how the app is composed

### 1. Next.js route shell + Builder content

The app uses a catch-all route at `pages/[[...path]].tsx` to render Builder.io CMS-defined pages and a fallback storefront landing page when content is missing. Product and collection routes are handled separately in:

- `pages/product/[handle].tsx`
- `pages/collection/[handle].tsx`

These pages use `getStaticProps` / `getStaticPaths` with `revalidate` to generate and refresh static data. Builder.io content is loaded via `resolveBuilderContent()` and injected with `BuilderComponent`.

### 2. Shopify integration

The storefront depends on Shopify Storefront data for products, collections, cart items, and product detail pages. The canonical environment-backed config is in `config/shopify.ts` and is read by the storefront hooks and API service layer. The app also exposes env values from `next.config.js` to the browser.

Key product/collection access patterns:

- `services/shopify.ts` fetches direct storefront product data for product pages.
- `lib/shopify/storefront-data-hooks/src/api/operations` provides collection and product query helpers.
- `lib/resolve-builder-content.ts` enriches Builder entries with live Shopify product/collection records when the Builder page references them.

### 3. Builder.io CMS + visual components

`pages/_app.tsx` registers Builder insert menus for Shopify collections, products, and custom components. Visual building blocks live under `blocks/`, while reusable UI lives under `components/`.

This repo is designed so the storefront can be edited in Builder while still using the app shell and Shopify data model for product information.

### 4. Theme and layout

The app uses Theme UI plus a shared layout in `components/common/Layout` and app-wide styling from `styles/globals.css`. `next.config.js` enforces a CSP and allows remote image hosts for Shopify, Builder.io, Cloudinary, and placeholders.

## Conventions specific to this repository

- Prefer the repo alias imports already configured in `tsconfig.json`:
  - `@lib/*`
  - `@config/*`
  - `@components/*`
  - `@services/*`
  - `@utils/*`
- Keep environment-driven defaults centralized in `config/builder.ts` and `config/shopify.ts`; avoid scattering `process.env.*` reads across feature code.
- Static pages use `getStaticProps`/`getStaticPaths` and `revalidate`; match that pattern when working on routes that fetch Shopify/Builder data.
- Builder content is often the source of truth for page structure, while Shopify supplies product/collection data. When a Builder page references a product or collection by handle/string, follow the pattern in `lib/resolve-builder-content.ts` instead of hardcoding queries in component trees.
- The repo is tuned for Vercel and uses Next.js features consistent with that deployment target. Do not add a contradictory self-hosting build layout unless the task explicitly requires it.
- For env configuration, follow the README setup: `BUILDER_PUBLIC_KEY`, `SHOPIFY_STOREFRONT_API_TOKEN`, and `SHOPIFY_STORE_DOMAIN` are the essential values, typically set in `.env.local` or app environment variables.

## Setup notes from the project docs

The repo README describes the expected setup:

- Install Node.js and npm.
- Create a Builder.io account and generate a private key.
- Configure `BUILDER_PUBLIC_KEY`.
- Create a Shopify custom app and set the Storefront API token and store domain.
- Start the app with `npm run dev` and visit `http://localhost:3000`.

If you need to verify or troubleshoot environment-backed values, check the config files before changing runtime logic.
