# Operational Checklist & Production Readiness

This document details the operational tasks, environment configurations, and production release procedures for the `builderio-shopify-commerce-headless` storefront.

---

## 🎯 Task Prioritization Matrix

### Priority 0 (P0) — Content & Provisioning Blockers
- [ ] **Publish Initial Builder `page` Entry**:
  - Model: `page`
  - URL / targeting: `/` (or `/home`)
  - Run verification: `npm run check:builder-content` until model `page` reports valid content entries.
  - Ensures storefront renders Builder visual content without fallback warnings.

### Priority 1 (P1) — Ops, Security & Legal Compliance
- [x] **Repository LICENSE**: Root `LICENSE` file added with standard MIT terms and upstream template attribution.
- [ ] **Triage Dependabot PR #36**: Evaluate Next.js dependency version upgrades across sub-packages to avoid breaking changes with Next 16 App Router.
- [ ] **Pre-Deploy Verification Pipeline**:
  - Run `npm run precheck` (all 10 security, integrity, and linting checks).
  - Run `npm run test:a11y` (accessibility compliance validation).
  - Run `npm run build` (production Next.js build compilation).

### Priority 2 (P2) — Performance, Backlog & Architecture Quality
- [x] **Builder Image Defaults**: Updated `builder-registry.tsx` defaults for product cards to `imgPriority: false` and `imgLoading: 'lazy'`.
- [ ] **Audit Non-LCP Priority Images**: Inspect homepage and grid components to ensure only the first two visible cards retain high priority (`i < 2`).
- [ ] **Shopify Client Layer Convergence**: Plan unification of client-side queries and server-side `services/shopify.ts` with normalized types.
- [ ] **CartContext Splitting**: Modularize state storage, cart mutation methods, and UI drawer toggle logic during future cart refactoring.

### Priority 3 (P3) — Optional / Enhancement Configuration
- [ ] **Custom Builder Model Mapping**: Configure optional environment variables for custom Builder model names if overriding default schemas (`BUILDER_PAGE_MODEL`, `BUILDER_PRODUCT_MODEL`, `BUILDER_THEME_MODEL`).

---

## 📋 Pre-Deployment Release Runbook

Execute the following sequence before deploying to staging or production:

1. **Verify Environment Variables**:
   - Ensure `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`, `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`, and `BUILDER_PUBLIC_KEY` are defined in production hosting settings.
2. **Execute Automated Quality Gates**:
   ```bash
   npm run precheck
   npm run test:a11y
   npm run build
   ```
3. **Verify API Routes & Proxy Health**:
   - Ensure `/api/agent/ws-proxy` and voice endpoints return valid JSON responses and proper CORS headers.
4. **Deploy & Smoke Test**:
   - Deploy artifact to hosting environment.
   - Verify homepage, product PDPs, collection grids, cart mutations, and ElevenLabs voice widget connectivity.
