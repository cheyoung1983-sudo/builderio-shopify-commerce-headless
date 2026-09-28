# Project Task Tracker & Roadmap

This document tracks completed tasks, in-flight work, and outstanding configuration items for the `builderio-shopify-commerce-headless` storefront.

---

## Completed Tasks

### Shopify Storefront Integration
- [x] **Storefront API Authentication (Action 1)**: Corrected Storefront API token type mismatch (`shpat_` Admin token replaced with valid Storefront token `9dc9...ae0f`).
- [x] **Private Token Support**: Updated `services/shopify.ts` to recognize both `shpca_` (official Headless private token prefix) and `shpat_` tokens with `Shopify-Storefront-Private-Token`.
- [x] **Catalog Connectivity Health**: Verified connectivity using `npm run diagnose:shopify` and `npm run check:shopify-catalog-health` (both passing `200 OK`).

### Security & API Hardening
- [x] **Cart Input Hardening**: Enforced 50-item limit per cart request and clamped quantities (`1`..`100`) in `pages/api/agent/cart.ts` (`create_cart` and `add_lines`).
- [x] **Security Boundary Assertions**: Updated `scripts/check-security-boundaries.cjs` to validate centralized bounded string helpers (`readBoundedString`) and multi-action cart validation.
- [x] **Precheck Test Suite**: All 10 precheck tasks passing cleanly (Node 24 version, CI integrity, dependency health, CORS/security headers, CSP audit, TypeScript, ESLint, secret scan, customer auth, and XSS hardening).

### Agent Tooling
- [x] **Shopify AI Toolkit Plugin**: Installed `shopify-plugin` via `agy plugin install https://github.com/Shopify/shopify-ai-toolkit` providing Liquid and UCP skills.
- [x] **Telemetry Hook Cleanup**: Removed broken `.disabled` pre-tool hook to ensure agent tools execute without errors.

---

## Active / Pending Tasks

### Builder.io Space Provisioning (Action 2)
- [ ] **Create `collection-page` Model**: In [Builder.io Dashboard](https://builder.io/content), create `Page` model named `collection-page` targeting `/collection/:handle`.
- [ ] **Create `product-page` Model**: In Builder.io Dashboard, create `Page` model named `product-page` targeting `/product/:handle`.
- [ ] **Publish Initial `page` Entry**: Publish at least one entry for model `page` (e.g., `/` or `/home`) to eliminate CDN 404/empty warnings (`npm run check:builder-content`).

---

## Backlog / Quality Assurance

- [ ] **End-to-End A11y & Jest Suite**: Run full accessibility check via `npm run test:a11y`.
- [ ] **Production Build Verification**: Run `npm run build` prior to merging or deploying to Vercel production.
