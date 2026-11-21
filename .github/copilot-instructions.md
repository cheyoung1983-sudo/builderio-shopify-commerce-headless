# Copilot instructions for this repository

## Repository overview

This is a Next.js 16 Pages Router headless commerce storefront using Shopify Storefront API and Builder.io. It also has Shopify Customer Account OAuth/PKCE, ElevenLabs voice interactions, tribal tax/geofencing logic, wholesale tooling, and Persona/Auth0 identity integrations.

Read `AGENTS.md` before Next.js changes. The installed Next.js guides in `node_modules/next/dist/docs/` take precedence over older Next.js conventions. Read `AGENT_WORKFLOW.md` and `CONTRIBUTING.md` before implementation or PR work.

## Build, lint, and test commands

Use Node.js 24.x and npm 11.x (`.nvmrc`, `package.json#engines`, `package.json#packageManager`, and CI must agree).

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run lint:a11y
npm test
npm run test:a11y
npm run build
```

Run a single Jest test:

```bash
npx jest tests/cart-storage.test.js
npx jest tests/<file>.test.js
```

Run a targeted ESLint check:

```bash
npx eslint path/to/file.ts
npx eslint path/to/file.tsx
```

Precheck variants:

- `npm run precheck` - full CI-equivalent suite: Node/CI/dependency health, typecheck, lint, secret and auth/security checks, Jest/a11y tests, and production build.
- `npm run precheck:fast` - full precheck without the production build.
- `npm run precheck:staged` - staged-change checks for the pre-commit hook.
- `npm run precheck:fix` - applies safe Prettier/ESLint fixes to changed lintable files, then reruns checks; it does not edit tests or logic.
- `npm run precheck:build` - build-gate security/configuration/type/lint checks without `next build`.
- `npm run build` - runs `scripts/build.cjs`, including `precheck:build`, then `next build`.

Before pushing or opening a PR, follow `AGENT_WORKFLOW.md` and run the suite against fresh `main`:

```bash
npm run precheck
npm run test:a11y
npm run build
```

Do not remove or weaken CI steps, ESLint rules, tests, or security checks to make a validation pass.

## Architecture and routing

### Next.js Pages Router and Builder.io

- `pages/index.tsx` is a special maintenance route. It reads `content/maintenance-homepage.html` in `getServerSideProps` and ends the response directly, so `/` bypasses `_app`, `_document`, and the normal layout. Do not change that behavior unless the maintenance-page requirement changes.
- `pages/[...path].tsx` handles other catch-all URLs. It resolves Builder's `page` model through `lib/resolve-builder-content.ts`, renders `BuilderComponent`, and supports preview; unknown non-root live paths return 404.
- Native transactional and application routes are separate, including `pages/product/[handle].tsx`, `pages/collection/[handle].tsx`, `pages/cart.tsx`, `pages/account/`, `pages/search.tsx`, `pages/wholesale/`, `pages/admin/`, and the tribal pages.
- Custom Builder components live in `blocks/` and are registered through `builder-registry.tsx`. Shared UI lives in `components/`.
- `lib/resolve-builder-content.ts` is the Shopify data-resolution boundary for Builder blocks. Keep ProductGrid, CollectionBox, ProductBox, and ProductCollectionGrid Shopify props there instead of issuing ad hoc block-level Shopify queries.

### Shopify and cart state

- `services/shopify.ts` is the primary Storefront API client for product/catalog/cart operations and browser-to-API proxy behavior. It uses `@shopify/storefront-api-client` and supports demo fallback through `lib/shopify/demo-catalog.ts`.
- `lib/shopify/storefront-data-hooks/` is a separate older GraphQL hook/data path. It remains used by Builder content resolution and `context/CartContext.tsx`; check call sites before changing or replacing it.
- `context/CartContext.tsx` owns app-wide cart state and reconciliation. `lib/cart-storage.ts` owns cart persistence keys and schema. Preserve the existing reconciliation and storage behavior in cart changes.
- `config/shopify.ts` centralizes Shopify environment resolution. `services/shopify-admin.ts`, `services/shopify-customer-account.ts`, and `services/shopify.ts` serve different server/client responsibilities; do not substitute one for another.

### Authentication and external integrations

- Buyer sign-in uses the Shopify Customer Account API OAuth 2.0 authorization-code flow with PKCE. The implementation spans `pages/api/account/` and `services/shopify-customer-account.ts`; preserve state validation, cookie flags, and redirect sanitization.
- `pages/api/` contains Serverless/API routes for tribal verification, wholesale, Slack, Persona, ElevenLabs speech/voice, webhooks, Stripe identity, newsletter, and other integrations. Match the security and response conventions of the nearest existing route.
- ElevenLabs voice work is concentrated in `components/ElevenLabsAgent.jsx`, `pages/api/agent/`, and `pages/api/elevenlabs/`.
- Tribal eligibility combines `lib/tax-calculator.ts` and `lib/geofencing.ts`; preserve both enrollment and geofence requirements unless the business rule explicitly changes.
- The Tribal Discount Shopify Function is under `extensions/tribal-discount/`.

## Environment, configuration, and security conventions

- Copy `.env.example` to `.env.local` for local development. Never commit `.env`, `.env.local`, credentials, or private tokens.
- Environment lookup belongs in `config/` and `services/`; unrelated components and API routes should not read private Shopify or integration variables directly.
- Public variables must not contain private Shopify Storefront tokens (`shpat_` or `shpua_`). The server stores private/admin secrets only.
- `next.config.js` owns CSP headers and remote image hosts. When a browser-facing origin is genuinely required, update only the relevant CSP directive and `images.remotePatterns`.
- API routes must validate untrusted input, keep upstream errors/private configuration out of public responses, preserve OAuth redirect protections, and follow explicit-origin CORS patterns rather than wildcard CORS.
- `scripts/check-ci-integrity.cjs` and the CI/config/secret/a11y checks enforce repository guardrails. Fix the underlying failure instead of bypassing or weakening it.

## Code conventions

- Use the aliases in `tsconfig.json`: `@lib/*`, `@assets/*`, `@blocks/*`, `@config/*`, `@components/*`, `@services/*`, and `@utils/*`, especially for cross-top-level imports.
- Follow the existing Pages Router patterns and the installed Next.js 16 APIs. Do not introduce App Router conventions.
- Match the nearest existing route/component/service pattern, including data resolution, error handling, and public response shapes.
- Keep Builder data resolution in `lib/resolve-builder-content.ts` and preserve the two established Shopify client patterns rather than rewriting the app onto only one client in an unrelated change.
- Preserve API response shapes and existing cart, OAuth, webhook, and fallback behavior unless the task explicitly requires a change.

## Browser validation

- For frontend, routing, cart, authentication, responsive layout, and visual changes, use Playwright MCP against `npm run dev` at `http://localhost:3000`.
- Capture a text/accessibility snapshot before interaction when an element's role or name is the important targeting signal; use the snapshot for browser actions and reserve screenshots for visual verification.
- Verify the maintenance homepage at `/` separately from Builder-driven non-root routes. The root route bypasses `_app` and `_document`, while catch-all and native routes use the normal application shell.
- Exercise relevant state transitions and API failures, not only the happy path. Cart changes should verify persistence/reconciliation, OAuth changes should verify redirect and callback behavior, and external integrations should avoid exposing secrets or upstream error details.
- Run Playwright through a fresh isolated browser context when cookies or account state could affect results. Never reuse live credentials or production customer data.
- Record only the branch, route, viewport, test flow, and pass/fail result in the handoff. Keep screenshots or downloaded artifacts out of source-control changes unless the task explicitly requires them.

## Multi-agent workflow

- Work in an isolated worktree and dedicated branch; do not modify another agent's worktree or push directly to `main`.
- Before editing, check recent/open branches for overlapping files with `git log --all --oneline -- <path>` and `gh pr list`. Coordinating is required for shared areas such as `pages/[...path].tsx` and Shopify configuration.
- Make focused changes, preserve unrelated work, and do not push again after a PR has merged.
- `.githooks/` is configured by `npm install`: pre-commit runs staged secret/CI/ESLint/type checks, and pre-push runs the full suite. Use repository scripts instead of bypassing hooks.
- Check `AGENT_WORKFLOW.md` and `CONTRIBUTING.md` for branch, validation, conflict, PR, and handoff requirements.
