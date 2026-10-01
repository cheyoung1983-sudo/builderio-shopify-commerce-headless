# Project Task Tracker & Roadmap

This document tracks completed tasks, in-flight work, and outstanding configuration items for the `builderio-shopify-commerce-headless` storefront.

---

## Completed Tasks

### Shopify Storefront Integration
- [x] **Storefront API Authentication (Action 1)**: Corrected Storefront API token type mismatch (`shpat_` Admin token replaced with valid Storefront token `9dc9...ae0f`).
- [x] **Private Token Support**: Updated `services/shopify.ts` to recognize both `shpca_` (official Headless private token prefix) and `shpat_` tokens with `Shopify-Storefront-Private-Token`.
- [x] **Catalog Connectivity Health**: Verified connectivity using `npm run diagnose:shopify` and `npm run check:shopify-catalog-health` (both passing `200 OK`).

### Security, Legal & API Hardening
- [x] **Root License Compliance**: Added root `LICENSE` file with MIT terms and upstream Builder.io / Vercel template attribution.
- [x] **Cart Input Hardening**: Enforced 50-item limit per cart request and clamped quantities (`1`..`100`) in `pages/api/agent/cart.ts` (`create_cart` and `add_lines`).
- [x] **Security Boundary Assertions**: Updated `scripts/check-security-boundaries.cjs` to validate centralized bounded string helpers (`readBoundedString`) and multi-action cart validation.
- [x] **Precheck Test Suite**: All 10 precheck tasks passing cleanly (Node 24 version, CI integrity, dependency health, CORS/security headers, CSP audit, TypeScript, ESLint, secret scan, customer auth, and XSS hardening).

### Performance & Component Defaults
- [x] **Builder.io Registry Defaults**: Updated `builder-registry.tsx` product card defaults to `imgPriority: false` and `imgLoading: 'lazy'` for safer LCP and bandwidth optimization.

### Agent Tooling & Voice Services
- [x] **Shopify AI Toolkit Plugin**: Installed `shopify-plugin` providing Liquid and UCP skills.
- [x] **Telemetry Hook Cleanup**: Removed broken `.disabled` pre-tool hook to ensure agent tools execute without errors.
- [x] **ElevenLabs WebSocket Proxy**: Implemented server-side WebSocket proxy `/api/agent/ws-proxy` with origin spoofing and automatic active specialist fallback.

---

## Active / Pending Tasks

### Builder.io Space Provisioning (Action 2) — P0
- [x] **In-Project Model Mapping (`builder-registry.tsx`)**: Configured model bindings (`page`, `product-page`, `collection-page`, `theme`) code-first in `builder-registry.tsx`.
- [ ] **Publish Initial `page` Entry**: Publish at least one entry for model `page` (e.g., `/` or `/home`) in the Builder space to eliminate CDN 404 warnings (`npm run check:builder-content`, see `docs/OPERATIONAL_CHECKLIST.md`).

### Ops / Maintenance — P1
- [ ] **Triage Dependabot PR #36**: Evaluate dependency bump compatibility across packages.
- [ ] **Pre-Deploy Verification Pipeline**: Run `npm run precheck && npm run test:a11y && npm run build`.

---

## Backlog / Quality Assurance — P2

- [ ] **Audit Non-LCP Priority Images**: Verify product grids only prioritize the first 2 visible cards (`i < 2`).
- [ ] **Shopify Client Layer Convergence**: Unify client-side queries and server-side `services/shopify.ts` with normalized types.
- [ ] **CartContext Splitting**: Modularize state storage, cart mutation methods, and UI drawer toggle logic during future cart refactoring.
