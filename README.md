# Next.js + Shopify + Builder.io Headless Commerce

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2Fbuilderio%2Fnextjs-shopify)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/BuilderIO/nextjs-shopify)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance, SEO-optimized headless commerce starter kit. This template combines the power of **Next.js** for a fast frontend, **Shopify** for robust commerce logic, and **Builder.io** for a flexible Visual CMS.

**Demo Live at: [headless.builders](https://headless.builders/)**

---

## 🚀 Key Features

*   **Ultra High Performance**: Built on Next.js with optimized image loading, code splitting, and server-side rendering.
*   **SEO Optimized**: Fully customizable metadata, automatic sitemap generation, and clean URL structures.
*   **Visual CMS Integrated**: Drag-and-drop page building with Builder.io, allowing marketers to launch pages without developer intervention.
*   **Personalizable**: Built-in support for internationalization, A/B testing, and dynamic content delivery.
*   **Headless OAuth**: Secure customer account management using Shopify's Customer Account API with PKCE.

---

## 📺 Video Walkthrough

Learn how to get started with this Builder + Next.js + Shopify example with this step-by-step video guide:

<a href="https://www.youtube.com/watch?v=uIHqPu2t1O0">
  <img width="600" src="https://cdn.builder.io/api/v1/image/assets%2FYJIGb4i01jvw0SRdL5Bt%2Fc161ccb26f6446869cba865d014c7caf" alt="Next.js Shopify Walkthrough Video" />
</a>

---

## 🛠️ Getting Started

### Prerequisites

*   **Node.js**: `>=24.x` (See [`.nvmrc`](./.nvmrc))
*   **NPM**: `>=8.x`
*   **Shopify Account**: An active Shopify store and partner account.
*   **Builder.io Account**: [Create one here](https://builder.io/signup).

### 1. Initialize Builder.io

1.  **Get Private Key**: Visit [Organization Settings](https://builder.io/account/organization) and copy your private key.
2.  **Run CLI**:
    ```bash
    # Install Builder CLI
    npm install --global "@builder.io/cli"

    # Create your space
    builder create --key "<private-key>" --name "<space-name>" --debug
    ```
    *Note: This will output a **Public API Key**. Copy it for step 3.*

### 2. Configure Shopify

1.  **Create Custom App**: In Shopify Admin > Settings > Apps and sales channels > Develop apps.
2.  **Enable Storefront API**: Grant all permissions under `Storefront API` configuration.
3.  **Customer Account API**: Enable headless OAuth 2.0 with PKCE in your Shopify Partner dashboard or Admin settings.

### 3. Environment Setup

Create a `.env.local` file by copying [`.env.example`](./.env.example):

```bash
cp .env.example .env.local
```

Update the following variables in `.env.local`:
*   `BUILDER_PUBLIC_KEY`: Your Builder Public API Key.
*   `SHOPIFY_STORE_DOMAIN`: `your-store.myshopify.com`.
*   `SHOPIFY_STOREFRONT_API_TOKEN`: Your Shopify Storefront Access Token.
*   `SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID`: Required for buyer authentication.

---

## 🏗️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be running at `http://localhost:3000`.

### Scripts

*   `npm run build`: Production build and health checks.
*   `npm run lint`: Run ESLint checks.
*   `npm run typecheck`: Run TypeScript compiler checks.
*   `npm run check:project-health`: Run internal consistency and security audits.

---

## 📂 Project Structure

```text
├── components/     # React UI components (Cart, Modal, Product, etc.)
├── pages/          # Next.js routes (Headless routes via [[...path]])
├── services/       # API clients (Shopify Storefront, Admin, Customer Account)
├── lib/            # Shared utilities and Shopify data hooks
├── config/         # App configuration (SEO, Theme, Builder)
└── public/         # Static assets
```

---

## 🔒 Security & Best Practices

> [!IMPORTANT]
> **Never commit your `.env` or `.env.local` files.** This project includes a [`.gitignore`](./.gitignore) that excludes them by default.

*   **Secrets Check**: Run `npm run check:secrets` to scan for hardcoded credentials.
*   **Web Bot Authentication**: If experiencing crawler blocks, configure the `HTTP-Crawler-Access` signature as detailed in your Shopify settings.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](./LICENSE.md) file for details.
