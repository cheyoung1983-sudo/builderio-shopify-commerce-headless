# QWEN.md - Project Instructions for DisplayCellPros Storefront

This document provides essential context and instructions for agents working on the DisplayCellPros headless commerce storefront.

## 🌟 Project Overview

The **DisplayCellPros Storefront** is a high-performance, SEO-optimized headless commerce site. It decouples the presentation layer from the commerce engine to provide a superior user experience and flexible content management.

### Tech Stack
- **Frontend Framework**: [Next.js (Pages Router, v16)](https://nextjs.org/) - Note: Next 16 contains breaking changes; refer to `AGENTS.md` and local docs in `node_modules/next/dist/docs/`.
- **Commerce Engine**: [Shopify Storefront API](https://shopify.dev/docs/api/storefront) - Handles products, collections, cart, and checkout.
- **Visual CMS**: [Builder.io](https://www.builder.io/) - Powers dynamic page content and marketing layouts via a drag-and-drop interface.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) and [Theme-UI](https://theme-ui.com/).
- **Buyer Authentication**: Shopify Customer Account API (OAuth 2.0 + PKCE).
- **Hosting**: Vercel.

### Architecture Key Points
- **Routing**: Uses a Builder-driven catch-all route (`pages/[[...path]].tsx`) for most content, with specific native Next.js pages for transactional flows (e.g., `/product/[handle]`, `/cart`, `/account`).
- **Data Layer**: 
    - `services/shopify.ts`: Primary client for Storefront API calls.
    - `lib/shopify/storefront-data-hooks/`: Legacy hook-based layer used by `CartContext` and Builder block resolution.
- **Cart Management**: Managed via `context/CartContext.tsx` with persistence handled by `lib/cart-storage.ts`.
- **Configuration**: `config/shopify.ts` is the single source of truth for Shopify environment variables.

## 🛠️ Building and Running

### Prerequisites
- **Node.js**: `24.x` (strictly enforced via `.nvmrc` and `npm run check:node-version`).
- **NPM**: `>=8.x`.

### Essential Commands
| Command | Purpose |
| :--- | :--- |
| `npm install` | Install dependencies |
| `npm run dev` | Start local development server (`http://localhost:3000`) |
| `npm run build` | Run `precheck` then execute `next build` |
| `npm run typecheck` | Run TypeScript compiler without emitting files |
| `npm run lint` | Run ESLint across core directories |
| `npm run test:a11y` | Run accessibility tests using Jest and `jest-axe` |
| `npm run precheck` | Comprehensive health check (Node version, CI integrity, typecheck, lint, secrets) |

### Pre-PR Validation Suite
Before submitting any Pull Request, execute the full validation chain:
```bash
npm run precheck && npm run test:a11y && npm run build
```

## 📏 Development Conventions

### Coding Style & Standards
- **Import Aliases**: Use configured aliases: `@lib/*`, `@assets/*`, `@blocks/*`, `@config/*`, `@components/*`, `@services/*`, `@utils/*`.
- **Styling**: Follow Tailwind CSS conventions. Use Stylelint for CSS and accessibility checks.
- **Security**: 
    - Never commit `.env` or `.env.local`.
    - Use `npm run check:secrets` to scan for hardcoded credentials.
    - Strict CSP is enforced in `next.config.js`; update `images.remotePatterns` and CSP headers when adding new external origins.

### Contribution Workflow
This project follows a strict multi-agent, PR-based workflow (detailed in `AGENT_WORKFLOW.md`):
1. **Isolation**: Work in isolated worktrees/branches.
2. **Collision Avoidance**: Check for overlapping branches modifying the same files (especially `pages/[[...path]].tsx`) before starting.
3. **Integrity**: Do not disable lint rules or strip CI steps to bypass failures; fix the root cause.
4. **Hygiene**: Merge/rebase `main` immediately before opening a PR. Once a PR merges, stop pushing to that branch; open a new one for further work.

### Critical Files for Reference
- `CLAUDE.md`: Deep dive into architecture, Shopify data layers, and commands.
- `AGENTS.md`: Next.js 16 specific breaking changes and agent rules.
- `AGENT_WORKFLOW.md`: Full protocol for multi-agent collaboration and validation.
- `CONTRIBUTING.md`: Maintainer and reviewer policies.
