# DisplayCellPros Storefront

A headless commerce storefront for **DisplayCellPros** — **Next.js (Pages Router, v16)** for rendering, the **Shopify Storefront API** for product/cart/checkout data, and **Builder.io** as the visual CMS driving page content.

**Live at:** [www.displaycellpros.com](https://www.displaycellpros.com) — verified against this repo's connected Vercel project (`www.displaycellpros.com` canonical; `displaycellpros.com` apex 308-redirects there)
**Shopify store:** `displaycellpros.myshopify.com`
**Repository:** [cheyoung1983-sudo/builderio-shopify-commerce-headless](https://github.com/cheyoung1983-sudo/builderio-shopify-commerce-headless)

Built from Builder.io's open-source [Next.js + Shopify headless commerce template](https://github.com/BuilderIO/nextjs-shopify) ([MIT-licensed](https://github.com/BuilderIO/nextjs-shopify/blob/main/LICENSE.md)) and since customized for this store — see `CLAUDE.md` for what's changed from the upstream template.

---

## 📚 Documentation map

This README is the short front door. The detailed, load-bearing docs live in these files — read them before making non-trivial changes:

| File | What it covers |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Architecture, the two Shopify data-client layers, routing (Builder-driven catch-all vs. native pages), CSP/env-var conventions, health-check scripts |
| [`AGENTS.md`](./AGENTS.md) | Next.js 16 breaking-change notes — read before writing Next.js code |
| [`AGENT_WORKFLOW.md`](./AGENT_WORKFLOW.md) | Full multi-agent development protocol: worktree isolation, dependency-bump rules, merge-conflict handling, PR policy |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Maintainer/agent responsibilities, PR review policy |

---

## 🚀 Key Features

*   **Ultra High Performance**: Next.js with optimized image loading, code splitting, and server-side rendering.
*   **SEO Optimized**: Customizable metadata, automatic sitemap generation, clean URL structures.
*   **Visual CMS Integrated**: Drag-and-drop page building with Builder.io — most marketing pages don't need a code change to edit.
*   **Headless customer accounts**: Buyer authentication via Shopify's Customer Account API (OAuth 2.0 + PKCE) — see `services/shopify-customer-account.ts`.

---

## 📺 Background: the underlying stack

This store is built on Builder.io's Next.js + Shopify starter pattern. If you're unfamiliar with how the three pieces (Next.js / Shopify / Builder.io) fit together, this walkthrough of the upstream template covers the same architecture this repo extends:

<a href="https://www.youtube.com/watch?v=uIHqPu2t1O0">
  <img width="600" src="https://cdn.builder.io/api/v1/image/assets%2FYJIGb4i01jvw0SRdL5Bt%2Fc161ccb26f6446869cba865d014c7caf" alt="Next.js Shopify Walkthrough Video" />
</a>

---

## 🛠️ Getting Started

### Prerequisites

*   **Node.js**: `24.x` (see [`.nvmrc`](./.nvmrc) — must match `package.json`'s `engines.node` and CI, enforced by `npm run check:node-version`)
*   **NPM**: `>=8.x`
*   Access to the **`displaycellpros.myshopify.com`** Shopify Partner/Admin account (for the Storefront API token and Customer Account API client credentials)
*   Access to the Builder.io organization backing this space

### 1. Environment setup

```bash
cp .env.example .env.local
```

`.env.example` already documents every variable and, where safe, pre-fills this store's own non-secret identifiers (`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_CUSTOMER_ACCOUNT_API_SHOP_ID`). You still need to fill in, at minimum:

*   `BUILDER_PUBLIC_KEY` / `NEXT_PUBLIC_BUILDER_PUBLIC_KEY` — from this store's Builder.io space.
*   `SHOPIFY_STOREFRONT_API_TOKEN` (server-side) and/or `NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN` (public, browser-exposed — never a private `shpat_`/`shpua_` token here).
*   `SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID` — required for buyer sign-in; `getShopId()`/`getCustomerAccountClientId()` throw loudly if either this or the shop ID is missing, by design.
*   `NEXT_PUBLIC_SITE_URL` — for local dev, `http://localhost:3000`; in production this should be `https://www.displaycellpros.com` (the OAuth redirect URI and SEO base URL fall back to that domain automatically if unset — see `services/shopify-customer-account.ts#getSiteUrl` and `lib/seo.ts#getBaseUrl`).

### 2. Install and run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

### Scripts

See `CLAUDE.md`'s "Commands" section for the full list (typecheck, lint, a11y tests, the Shopify-catalog health check, etc.). The essentials:

*   `npm run dev` — local dev server
*   `npm run build` — runs `precheck` (node-version, CI-integrity, dependency-health, typecheck, lint, secret scan, customer-account-auth-health), then `next build`
*   `npm run precheck && npm run test:a11y && npm run build` — the full suite to run before opening a PR (see `AGENT_WORKFLOW.md` → Validation)

---

## 📂 Project Structure

```text
├── components/     # React UI components (Cart, Modal, Product, etc.)
├── pages/          # Next.js routes — Builder-driven catch-all ([[...path]].tsx) + native pages
│   └── api/account/   # Customer Account API OAuth flow (login/callback/logout)
├── services/       # API clients (Shopify Storefront, Admin, Customer Account)
├── lib/            # Shared utilities and the older Shopify data-hooks layer
├── config/         # App configuration (SEO, Theme, Builder, Shopify env resolution)
├── scripts/        # Health-check scripts backing `npm run check:*` and CI
└── public/         # Static assets
```

---

## 🤝 Multi-agent development

This repo is developed by multiple isolated agents working in separate branches, integrated via pull request by the maintainer. Before starting work, read `AGENT_WORKFLOW.md` in full — key rules:

*   Check for other branches already touching the same files before starting.
*   Never push to a branch after its PR has merged — open a new branch instead.
*   Don't self-merge agent-authored PRs.
*   Fix the cause of a failing check; don't weaken or remove the check.

---

## 🔒 Security & Best Practices

> [!IMPORTANT]
> **Never commit your `.env` or `.env.local` files.** [`.gitignore`](./.gitignore) excludes them by default.

*   **Secrets check**: `npm run check:secrets` scans for hardcoded credentials and fallback literals baked in for sensitive env vars.
*   **Customer Account API login flow check**: `npm run check:customer-account-auth-health` guards the OAuth/PKCE login flow specifically (identity-env fallbacks, domain drift, open-redirect sanitizer completeness).
*   **Web Bot Authentication**: if you see crawler blocks, configure the `HTTP-Crawler-Access` signature as detailed in Shopify's settings.

---

## 📄 License

This repository was forked from an MIT-licensed template, but **no `LICENSE` file exists in this repo** and its actual terms for this specific store's code haven't been established. Don't assume MIT applies here — confirm the intended license with the repository owner before reusing or redistributing this code, or add a `LICENSE` file to make it explicit.
