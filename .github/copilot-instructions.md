# Copilot instructions for this repository

## Repository overview

This is a headless commerce storefront built with Next.js 16 (Pages Router), Shopify Storefront API, and Builder.io. It also integrates Shopify Customer Account authentication, a voice assistant, and custom tax/geofencing functionality.

Read `AGENTS.md` before changing Next.js code: this project uses Next.js 16, whose APIs and conventions may differ from older examples. Check the installed guides under `node_modules/next/dist/docs/`.

## Build, lint, and validation commands

Use Node.js 24.x and the npm version specified by `package.json`.

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run lint:a11y
npm test
npx jest tests/cart-storage.test.js
npm run test:a11y
npm run build
```

`npm run build` runs the security/configuration checks in `precheck:build` before `next build`. For the full CI-equivalent validation before opening a PR, follow `AGENT_WORKFLOW.md`:

```bash
npm run precheck && npm run test:a11y && npm run build
```

`npm run lint` checks `blocks`, `components`, `config`, `context`, `lib`, `pages`, and `services`; for a targeted check, use `npx eslint path/to/file`. `npm run test:a11y` runs Jest, including the accessibility tests; use `npx jest tests/<file>.test.js` to run a single test file.

## Architecture and how the app is composed

### 1. Next.js routes and Builder content

This is a Pages Router application. The checked-in `pages/index.tsx` currently serves the standalone maintenance HTML in `content/maintenance-homepage.html` directly from `getServerSideProps`; it intentionally bypasses the shared `_app` and `_document` wrappers. Do not assume the root route is currently the Builder-backed storefront.

`pages/[...path].tsx` handles non-root catch-all paths. It resolves the Builder `page` model through `lib/resolve-builder-content.ts`, renders matching content with `BuilderComponent`, and returns 404 for missing live pages. Native routes such as product, collection, cart, account, and search pages are implemented separately under `pages/`. Decide whether a new route belongs in Builder or should be a native page by following the closest existing route.

Builder components live in `blocks/`; shared UI lives in `components/`. `lib/resolve-builder-content.ts` enriches Builder entries and resolves Shopify-backed props for custom blocks. Keep data resolution in that layer rather than adding ad hoc Shopify queries to Builder component trees.

### 2. Shopify data and cart state

`services/shopify.ts` is the primary Storefront API client used by the app for product/catalog and cart operations. Shopify environment configuration belongs in `config/shopify.ts`. `services/shopify-admin.ts` and `services/shopify-customer-account.ts` serve distinct server-side Admin API and Customer Account API use cases; do not substitute one client for another.

The older hook-based client under `lib/shopify/storefront-data-hooks/` remains in use by Builder content resolution. Check existing call sites before changing or replacing either data path.

`context/CartContext.tsx` owns app-wide cart state and reconciliation; `lib/cart-storage.ts` defines cart persistence. Preserve the existing cart model and reconciliation behavior when changing cart UI or API calls.

### 3. Authentication, configuration, and external services

Customer sign-in uses Shopify's Customer Account API OAuth 2.0 flow with PKCE. The API routes and `services/shopify-customer-account.ts` work together to manage the flow and validate return URLs; preserve state/redirect protections when changing authentication.

`config/builder.ts` and `config/shopify.ts` centralize Builder and Shopify environment resolution. Use `.env.example` for variable names; never commit `.env` or `.env.local`. Only explicitly configured public values may be exposed to the browser. Private Shopify tokens and client secrets must remain server-side.

`next.config.js` configures security headers/CSP and remote image hosts. When adding an external browser-facing service or image host, update only the necessary CSP directives and image patterns. Follow the established API security and explicit-origin CORS patterns.

Other substantial integrations include the ElevenLabs voice flow (`components/ElevenLabsAgent.jsx` and `pages/api/agent/`), tribal exemption/tax handling (`lib/tax-calculator.ts` and `lib/geofencing.ts`), and the Tribal Discount Shopify Function under `extensions/tribal-discount/`.

## Conventions specific to this repository

- Use configured aliases from `tsconfig.json` for cross-root imports: `@lib/*`, `@assets/*`, `@blocks/*`, `@config/*`, `@components/*`, `@services/*`, and `@utils/*`.
- Keep environment-variable lookup in the existing config/service layer; do not read Shopify credentials directly in unrelated components or API routes.
- For Next.js-specific changes, follow the installed Next.js 16 docs and the existing Pages Router patterns. Avoid introducing App Router conventions.
- Preserve API response shapes and existing behavior unless a change explicitly requires otherwise. Validate untrusted input, keep upstream errors/secrets out of responses, and maintain OAuth redirect and webhook-signature checks.
- Do not remove or weaken CI steps, security checks, lint rules, or tests to make a change pass. `scripts/check-ci-integrity.cjs` protects important CI and ESLint configuration.
- Check `AGENT_WORKFLOW.md` and `CONTRIBUTING.md` for branch/worktree, pull request, and full-validation requirements. The README links to `docs/ARCHITECTURE.md` for deeper subsystem details.
