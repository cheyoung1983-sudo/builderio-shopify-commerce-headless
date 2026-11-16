# QWEN.md - Project Instructional Context

## Project Overview
**DisplayCellPros Storefront** is a high-performance, headless commerce storefront built for DisplayCellPros. It leverages a modern stack to decouple the frontend presentation from the commerce backend.

- **Frontend**: Next.js 16 (Pages Router)
- **Commerce Engine**: Shopify Storefront API (Products, Cart, Checkout)
- **Visual CMS**: Builder.io (Drives marketing page content and dynamic layouts)
- **Identity & KYC**: Auth0 for authentication and Persona for identity verification
- **AI Capabilities**: Gemini (LLM) and ElevenLabs (Conversational AI Voice Assistant)
- **Specialized Logic**: Custom Tribal Tax Exemption and Geofencing system for compliance.

### Architecture Highlights
- **Hybrid Routing**: Uses a Builder.io catch-all route (`pages/[[...path]].tsx`) for CMS-driven pages, while maintaining native Next.js pages for transactional flows (e.g., `/product/[handle]`, `/cart`, `/account`).
- **Dual Shopify Data Layer**: 
    - `services/shopify.ts`: The primary, modern client using `@shopify/storefront-api-client`.
    - `lib/shopify/storefront-data-hooks/`: A legacy hook-based layer used by some components and Builder blocks.
- **Security-First Approach**: Strict CSP (Content Security Policy) defined in `next.config.js` and extensive pre-deployment security checks.

---

## Building and Running

### Prerequisites
- **Node.js**: `24.x` (strictly enforced via `.nvmrc` and `npm run check:node-version`)
- **NPM**: `>=11`

### Core Commands
| Task | Command | Description |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Starts the local development server at `http://localhost:3000`. |
| **Building** | `npm run build` | Runs the full `precheck` suite before executing `next build`. |
| **Typechecking** | `npm run typecheck` | Runs `tsc --noEmit` to verify TypeScript types. |
| **Linting** | `npm run lint` | Lints components, config, context, lib, pages, and services. |
| **Testing** | `npm test` | Runs the Jest test suite. |
| **A11y Testing**| `npm run test:a11y` | Runs accessibility tests using `jest-axe`. |

### Validation & Security Suite
The project employs a rigorous "precheck" process before PRs:
- **Full Precheck**: `npm run precheck` (Combines node-version, CI-integrity, dependency-health, security-cors, CSP audit, typecheck, lint, secrets scan, and auth-health checks).
- **Secrets Scan**: `npm run check:secrets` - Scans for hardcoded credentials.
- **Security Boundaries**: `npm run check:security-boundaries` - Verifies API and boundary hardening.
- **CSP Audit**: `npm run audit:csp` - Validates the Content Security Policy.

---

## Development Conventions

### Coding Standards
- **Import Aliases**: Use configured aliases instead of relative paths:
    - `@components/*`, `@lib/*`, `@services/*`, `@config/*`, `@blocks/*`, `@utils/*`, `@assets/*`.
- **Next.js 16**: Be aware that this project uses Next.js 16; refer to `AGENTS.md` for breaking changes compared to older versions.
- **Formatting**: Prettier is used (`semi: false`, `singleQuote: true`).

### Routing Decisions
- **Builder.io**: Use for marketing pages, landing pages, and content-heavy sections.
- **Native Pages**: Use for transactional, app-like, or highly dynamic pages (e.g., Account, Cart, Search).

### Shopify Integration
- Always prefer `services/shopify.ts` for new data fetching logic.
- Do not read `process.env.SHOPIFY_*` directly; use `config/shopify.ts` or `services/shopify.ts`'s `getShopifyConfig()` to ensure environment validation (e.g., preventing private token leaks to the browser).

### Multi-Agent Workflow
This repository follows a strict multi-agent protocol:
- **Isolation**: Work should be done in isolated worktrees/branches.
- **Verification**: `npm run precheck && npm test && npm run build` must pass before opening a PR.
- **Hygiene**: Do not self-merge; do not push to merged branches. Check for overlapping work in `pages/[[...path]].tsx` and Shopify config.

---

## Key Files Reference
- `README.md`: High-level overview and setup.
- `CLAUDE.md`: Detailed technical guidance and command list.
- `AGENTS.md`: Next.js 16 breaking changes and agent rules.
- `AGENT_WORKFLOW.md`: Development and PR protocol.
- `docs/ARCHITECTURE.md`: System architecture and data flows.
- `config/shopify.ts`: Shopify environment configuration.
- `services/shopify.ts`: Primary Shopify API client.
- `pages/[[...path]].tsx`: Primary CMS route handler.
