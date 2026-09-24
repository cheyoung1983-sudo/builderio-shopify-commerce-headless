---
applyTo: '**'
---
Follow the repository's existing architecture and conventions when generating code, answering questions, or reviewing changes.

- Treat this as a Next.js 16 Pages Router storefront using Shopify Storefront API, Builder.io CMS, Theme UI, and the existing service/config layers.
- Keep Builder-driven routes, native transactional pages, Shopify services, cart context, and API routes aligned with the patterns already established in the repository.
- Use configured import aliases such as `@lib/*`, `@config/*`, `@components/*`, `@services/*`, and `@utils/*` instead of introducing unnecessary cross-root relative imports.
- Centralize environment-variable access in the existing configuration modules. Do not expose server-only secrets or read Shopify credentials directly in unrelated feature code.
- Preserve existing public response shapes and user-facing behavior unless the requested change explicitly requires a behavior change.
- Follow the repository's security conventions: validate untrusted input, use explicit origins rather than wildcard CORS, protect OAuth callback construction, avoid leaking upstream errors or secrets, and keep CSP changes narrowly scoped.
- Prefer small, surgical changes that reuse existing helpers and patterns. Do not refactor unrelated code or weaken health checks, lint rules, type safety, or security checks to make a change pass.
- Match the project's validation workflow. Use targeted ESLint and TypeScript checks during implementation, and run the repository's established precheck, accessibility tests, and build when the change warrants full validation.
- Read the relevant repository guidance and current Next.js documentation before changing Next.js-specific behavior.
