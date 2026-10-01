# DisplayCellPros Storefront

A headless commerce storefront for **DisplayCellPros** — **Next.js (Pages Router, v16)** for rendering, the **Shopify Storefront API** for product/cart/checkout data, and **Builder.io** as the visual CMS driving page content.

**Live at:** [www.displaycellpros.com](https://www.displaycellpros.com) — verified against this repo's connected Vercel project (`www.displaycellpros.com` canonical; `displaycellpros.com` apex 308-redirects there)
**Shopify store:** `displaycellpros.myshopify.com`
**Repository:** [cheyoung1983-sudo/builderio-shopify-commerce-headless](https://github.com/cheyoung1983-sudo/builderio-shopify-commerce-headless)

Built from Builder.io's open-source [Next.js + Shopify headless commerce template](https://github.com/BuilderIO/nextjs-shopify) ([MIT-licensed](https://github.com/BuilderIO/nextjs-shopify/blob/main/LICENSE.md)) and since customized for this store — see `CLAUDE.md` for what's changed from the upstream template.

---

## 📚 Documentation map

This README is the short front door. The detailed, load-bearing docs live in these files — read them before making non-trivial changes:

| File                                             | What it covers                                                                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`TODO.md`](./TODO.md)                           | Active task tracker, completed integration milestones, and pending dashboard setup                                                                   |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Comprehensive system architecture, subsystem data flows, security/auth specs, tax engine, AI voice agent, and development best practices             |
| [`CLAUDE.md`](./CLAUDE.md)                       | Architecture, the two Shopify data-client layers, routing (Builder-driven catch-all vs. native pages), CSP/env-var conventions, health-check scripts |
| [`AGENTS.md`](./AGENTS.md)                       | Next.js 16 breaking-change notes — read before writing Next.js code                                                                                  |
| [`AGENT_WORKFLOW.md`](./AGENT_WORKFLOW.md)       | Full multi-agent development protocol: worktree isolation, dependency-bump rules, merge-conflict handling, PR policy                                 |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md)           | Maintainer/agent responsibilities, PR review policy                                                                                                  |

---

## 🚀 Key Features

- **Ultra High Performance**: Next.js with optimized image loading, code splitting, and server-side rendering.
- **SEO Optimized**: Customizable metadata, automatic sitemap generation, clean URL structures.
- **Visual CMS Integrated**: Drag-and-drop page building with Builder.io — most marketing pages don't need a code change to edit.
- **Headless customer accounts**: Buyer authentication via Shopify's Customer Account API (OAuth 2.0 + PKCE) — see [`services/shopify-customer-account.ts`](./services/shopify-customer-account.ts).

---

## 📺 Background: the underlying stack

This store is built on Builder.io's Next.js + Shopify starter pattern. If you're unfamiliar with how the three pieces (Next.js / Shopify / Builder.io) fit together, this walkthrough of the upstream template covers the same architecture this repo extends:

<a href="https://www.youtube.com/watch?v=uIHqPu2t1O0">
  <img width="600" src="https://cdn.builder.io/api/v1/image/assets%2FYJIGb4i01jvw0SRdL5Bt%2Fc161ccb26f6446869cba865d014c7caf" alt="Next.js Shopify Walkthrough Video" />
</a>

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: `24.x` (see [`.nvmrc`](./.nvmrc) — must match `package.json`'s `engines.node` and CI, enforced by `npm run check:node-version`)
- **NPM**: `>=8.x`
- Access to the **`displaycellpros.myshopify.com`** Shopify Partner/Admin account (for the Storefront API token and Customer Account API client credentials)
- Access to the Builder.io organization backing this space

### 1. Environment setup

```bash
cp .env.example .env.local
```

`.env.example` already documents every variable and, where safe, pre-fills this store's own non-secret identifiers (`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_CUSTOMER_ACCOUNT_API_SHOP_ID`). You still need to fill in, at minimum:

- `BUILDER_PUBLIC_KEY` / `NEXT_PUBLIC_BUILDER_PUBLIC_KEY` — from this store's Builder.io space.
- `SHOPIFY_STOREFRONT_API_TOKEN` (server-side) and/or `NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN` (public, browser-exposed — never a private `shpat_`/`shpua_` token here).
- `SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID` — required for buyer sign-in; `getShopId()`/`getCustomerAccountClientId()` throw loudly if either this or the shop ID is missing, by design.
- `NEXT_PUBLIC_SITE_URL` — for local dev, `http://localhost:3000`; in production this should be `https://www.displaycellpros.com` (the OAuth redirect URI and SEO base URL fall back to that domain automatically if unset — see [`services/shopify-customer-account.ts#getSiteUrl`](./services/shopify-customer-account.ts#L39) and [`lib/seo.ts#getBaseUrl`](./lib/seo.ts#L81)).

### 2. Install and run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

### Scripts

See `CLAUDE.md`'s "Commands" section for the full list (typecheck, lint, a11y tests, the Shopify-catalog health check, etc.). The essentials:

- `npm run dev` — local dev server
- `npm run build` — runs `precheck` (node-version, CI-integrity, dependency-health, typecheck, lint, secret scan, customer-account-auth-health), then `next build`
- `npm run check:deployment-readiness` — validates Vercel CLI availability, project linkage, and full precheck suite readiness
- `npm test` — runs project Jest test suite (including ElevenLabs token security tests)
- `npm run precheck && npm test && npm run build` — the full suite to run before opening a PR (see `AGENT_WORKFLOW.md` → Validation)

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

- Check for other branches already touching the same files before starting.
- Never push to a branch after its PR has merged — open a new branch instead.
- Don't self-merge agent-authored PRs.
- Fix the cause of a failing check; don't weaken or remove the check.

---

## ⚡ Performance & Optimization: Next.js Image Preload Analysis

### Context

Analysis of the `displaycellpros.com` home page to resolve browser console warnings regarding preloaded image resources that were not consumed within the first few seconds of page load.

### Diagnostics

The browser identified multiple image resources preloaded via Next.js that were not utilized by the rendering engine.

| Resource URL (Shortened)                      | Type  | Status           | Size   |
| :-------------------------------------------- | :---- | :--------------- | :----- |
| `/_next/image?...samsung-galaxy-s22...&w=640` | Image | Preloaded/Unused | 7.1 kB |
| `/_next/image?...image_4f20e406...&w=640`     | Image | Preloaded/Unused | 7.1 kB |
| `/_next/image?...galaxy-s24-lcd...&w=640`     | Image | Preloaded/Unused | 5.2 kB |
| `/_next/image?...image_122b05ea...&w=640`     | Image | Preloaded/Unused | 7.2 kB |

### Technical Findings

- **Root Cause:** The `next/image` component is generating `<link rel="preload" as="image">` tags with `imagesrcset` and `imagesizes` that do not align with the actual layout requirements or viewport of the client.
- **Mismatched Requests:** The browser preloaded 640px wide versions of images, but the page logic subsequently requested different versions (e.g., 384px wide), causing the initial high-resolution downloads to be wasted.
- **Priority Overuse:** Multiple images in the product grid appear to have the `priority` attribute, triggering preloads for assets that may not be in the initial viewport.

### Actionable Recommendations

The following strategies are identified as potential fixes for the source code:

- **Audit Priority Prop:** Limit the `priority` attribute in Next.js `Image` components strictly to Largest Contentful Paint (LCP) elements, such as the main hero banner.
- **Refine Sizes Attribute:** Update the `sizes` prop to more accurately reflect the rendered width of the image. A mismatch between the `sizes` logic and the actual CSS width causes the browser to select the wrong source from the `srcset`.
- **Example Optimization:**

```tsx
// Suggested adjustment for product grid images
<Image
  src={productImage}
  alt="Product Description"
  // Remove priority if the image is not the LCP element
  priority={false}
  // Ensure sizes accurately reflect grid column widths
  sizes="(max-width: 768px) 50vw, 25vw"
/>
```

---

## 🔒 Security & Best Practices

> [!IMPORTANT] > **Never commit your `.env` or `.env.local` files.** [`.gitignore`](./.gitignore) excludes them by default.

- **Secrets check**: `npm run check:secrets` scans for hardcoded credentials and fallback literals baked in for sensitive env vars.
- **Customer Account API login flow check**: `npm run check:customer-account-auth-health` guards the OAuth/PKCE login flow specifically (identity-env fallbacks, domain drift, open-redirect sanitizer completeness).
- **Web Bot Authentication**: if you see crawler blocks, configure the `HTTP-Crawler-Access` signature as detailed in Shopify's settings.

---

## 📄 License

This repository is distributed under the MIT License. See [`LICENSE`](./LICENSE) for the full license text and upstream template attribution.
