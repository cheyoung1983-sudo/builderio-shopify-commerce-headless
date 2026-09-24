# Storefront Hardening and Boundary Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden public API boundaries, make Shopify and Customer Account configuration consistent, reduce observability/CSP risk, and add regression coverage without changing storefront behavior.

**Architecture:** Add a small dependency-free API-security utility and apply explicit per-route policies. Centralize Shopify normalization and canonical OAuth origin selection while preserving the existing Storefront data-client split. Keep all changes incremental, with focused tests before each implementation and full repository validation at the end.

**Tech Stack:** Next.js 16 Pages Router, TypeScript, Next API routes, Node `crypto`, Jest 29, existing ESLint/typecheck/security scripts.

**Spec:** `docs/superpowers/specs/2026-09-23-storefront-hardening-design.md`

## Global Constraints

- Do not add a new external rate-limiting service; in-memory limits are best-effort and per process.
- Preserve public response shapes where existing consumers depend on them.
- Do not merge or replace the two existing Shopify data-client layers.
- Keep browser exposure limited to `NEXT_PUBLIC_*` values and reject private Storefront tokens in browser configuration.
- Preserve PKCE, state, nonce, audience, and relative-return-path protections.
- Keep Builder, Theme UI, Vercel, and ElevenLabs integrations functional.
- Use the repository's existing test, lint, typecheck, secret, and build commands.

## Review Focus

- A missing or malformed `Origin` must not result in wildcard or reflected CORS access; test exact allowlist behavior in Task 1.
- Repeated requests from one client must receive a bounded `429` response without blocking unrelated clients; test expiry and client-key separation in Task 1.
- Oversized, malformed, or attacker-controlled API fields must be rejected or truncated before upstream calls/logging; test route validation in Tasks 2 and 3.
- An OAuth request must not turn untrusted forwarded headers into a callback URL; test canonical and trusted-proxy behavior in Task 4.
- A private `shpat_`/`shpua_` token must never be treated as a browser-public token, and environment aliases must normalize identically; test shared getters in Task 5.

---

### Task 1: Build the shared API security utility

**Files:**
- Create: `lib/api-security/index.ts`
- Test: `tests/api-security.test.js`

**Interfaces:**
- Produces `isAllowedOrigin(origin: string | undefined, options?: { allowLocalhost?: boolean; allowRunApp?: boolean }): boolean`.
- Produces `applyCors(res, origin, options)` where `options` contains an exact `allowedOrigins` array and optional local-development settings.
- Produces `handleOptions(req, res, options): boolean`.
- Produces `createRateLimiter(options): { check(key: string): { allowed: boolean; retryAfterSeconds: number } }`.
- Produces `readBoundedString(value, options): string | undefined` and `readBoundedInteger(value, options): number | undefined`.

- [ ] **Step 1: Write failing unit tests** for exact origins, rejected substring origins, localhost development origins, CORS headers, preflight handling, numeric bounds, string truncation, rate-limit rejection, expiry, and separate keys.

```js
test('accepts exact configured origin but rejects lookalikes', async () => {
  const {isAllowedOrigin} = await import('../lib/api-security/index.ts')
  expect(isAllowedOrigin('https://www.displaycellpros.com', {
    allowedOrigins: ['https://www.displaycellpros.com'],
  })).toBe(true)
  expect(isAllowedOrigin('https://www.displaycellpros.com.attacker.test', {
    allowedOrigins: ['https://www.displaycellpros.com'],
  })).toBe(false)
})
```

- [ ] **Step 2: Run the focused test and verify it fails.**

Run: `npx jest tests/api-security.test.js --runInBand`

Expected: FAIL because `lib/api-security/index.ts` does not exist.

- [ ] **Step 3: Implement the utility.** Normalize origins with `new URL`, compare serialized origins exactly, allow `http://localhost`/`127.0.0.1` only when explicitly enabled, set `Vary: Origin` when reflecting an approved origin, and return `429` metadata from the limiter without throwing.

- [ ] **Step 4: Run the focused test and verify it passes.**

Run: `npx jest tests/api-security.test.js --runInBand`

Expected: all API-security tests pass.

- [ ] **Step 5: Run typecheck and commit.**

Run: `npm run typecheck`

```bash
git add lib/api-security/index.ts tests/api-security.test.js
git commit -m "feat: add shared API security boundaries"
```

### Task 2: Harden public agent content and product-search routes

**Files:**
- Modify: `pages/api/agent/content.ts`
- Modify: `pages/api/agent/search.ts`
- Test: `tests/agent-api-security.test.js`

**Interfaces:**
- Consumes Task 1's `applyCors`, `handleOptions`, `readBoundedString`, `readBoundedInteger`, and rate-limiter factory.
- Produces unchanged successful response fields (`ok`, `model`, `count`, `results`, `products`) plus `429` responses with `Retry-After` when throttled.

- [ ] **Step 1: Add route tests** that invoke each handler with approved and unapproved origins, oversized query/model values, invalid `first`, preflight requests, and repeated requests.

```js
test('agent search rejects unapproved origin and bounds first', async () => {
  const response = await invokeSearch({
    method: 'POST',
    headers: {origin: 'https://attacker.test'},
    body: {query: 'x'.repeat(500), first: 999},
  })
  expect(response.headers['Access-Control-Allow-Origin']).toBeUndefined()
  expect(response.statusCode).toBe(403)
})
```

- [ ] **Step 2: Run the route tests and verify they fail** against the current wildcard CORS and uncoupled route behavior.

Run: `npx jest tests/agent-api-security.test.js --runInBand`

Expected: FAIL on wildcard CORS and missing policy enforcement.

- [ ] **Step 3: Apply shared CORS, preflight, and rate-limit policy.** Keep catalog search public, but use exact production origins plus explicit local development origins, cap query/model lengths, clamp `first` to `1..25`, reject invalid JSON shapes, and return `429` before Shopify calls when the client exceeds its window.

- [ ] **Step 4: Ensure upstream errors expose only stable public messages.** Preserve the existing `Failed to search products` and `Failed to fetch Builder content` response messages; log detailed exceptions only on the server.

- [ ] **Step 5: Run focused tests, lint changed files, and commit.**

Run: `npx jest tests/agent-api-security.test.js --runInBand`

Run: `npx eslint pages/api/agent/content.ts pages/api/agent/search.ts`

```bash
git add pages/api/agent/content.ts pages/api/agent/search.ts tests/agent-api-security.test.js
git commit -m "fix: harden public agent API routes"
```

### Task 3: Harden ElevenLabs token routes and observability logging

**Files:**
- Modify: `pages/api/agent/token.ts`
- Modify: `pages/api/agent/signed-url.ts`
- Modify: `pages/api/observability/log.ts`
- Test: `tests/agent-token-and-observability.test.js`

**Interfaces:**
- Consumes Task 1's exact-origin, bounded-input, preflight, and rate-limiter helpers.
- Produces stable public errors without exposing upstream response bodies, API keys, or arbitrary server exception messages.

- [ ] **Step 1: Add tests** for exact-origin acceptance, rejection of arbitrary `.run.app` and substring `localhost` origins, ElevenLabs agent-ID validation, throttling, observability field caps, invalid timestamp replacement, and production response omission of `entry`.

- [ ] **Step 2: Run focused tests and verify they fail** because the current routes accept broad origins and reflect detailed exception data.

Run: `npx jest tests/agent-token-and-observability.test.js --runInBand`

Expected: FAIL on broad-origin acceptance, uncapped fields, or leaked details.

- [ ] **Step 3: Apply strict route policies.** Keep `https://displaycellpros.com` and `https://www.displaycellpros.com`; permit localhost only under an explicit development flag; remove arbitrary `.run.app` acceptance from production; validate agent IDs with a narrow ElevenLabs ID pattern before calling the upstream service.

- [ ] **Step 4: Bound observability payloads.** Cap event ID, name, message, stack, component stack, URL, user agent, and serialized metadata. Accept only finite timestamps in a valid ISO form or use the server timestamp. Return `{ ok, eventId, loggedAt }` in production without echoing arbitrary structured input.

- [ ] **Step 5: Run focused tests and lint, then commit.**

Run: `npx jest tests/agent-token-and-observability.test.js --runInBand`

Run: `npx eslint pages/api/agent/token.ts pages/api/agent/signed-url.ts pages/api/observability/log.ts`

```bash
git add pages/api/agent/token.ts pages/api/agent/signed-url.ts pages/api/observability/log.ts tests/agent-token-and-observability.test.js
git commit -m "fix: protect agent tokens and observability logs"
```

### Task 4: Make Customer Account OAuth origins deterministic

**Files:**
- Modify: `services/shopify-customer-account.ts`
- Modify: `pages/api/account/login.ts`
- Modify: `pages/api/account/callback.ts`
- Test: `tests/customer-account-origin.test.js`

**Interfaces:**
- Preserves `getSiteUrl(req?)`, `getCallbackUrl(req?)`, and all existing OAuth token helpers.
- Produces canonical URLs from `NEXT_PUBLIC_SITE_URL` first, with forwarded headers accepted only under an explicit trusted-proxy/local policy.

- [ ] **Step 1: Add tests** for configured canonical URL precedence, valid trusted forwarded headers, rejection of `javascript:` and malformed hosts, and preservation of relative-only `returnTo`.

- [ ] **Step 2: Run focused tests and verify the unsafe forwarded-header case fails** against the current implementation.

Run: `npx jest tests/customer-account-origin.test.js --runInBand`

Expected: FAIL for an untrusted forwarded host being used as the callback origin.

- [ ] **Step 3: Implement canonical-origin resolution.** Parse and normalize `NEXT_PUBLIC_SITE_URL`; require `https:` in production; only inspect forwarded headers when an explicit trusted-proxy environment flag is enabled; validate hostnames before constructing the URL.

- [ ] **Step 4: Preserve OAuth protections.** Do not alter PKCE cookie names, state comparison, nonce validation, audience validation, or relative return-path sanitization.

- [ ] **Step 5: Run focused tests, typecheck, and commit.**

Run: `npx jest tests/customer-account-origin.test.js --runInBand`

Run: `npm run typecheck`

```bash
git add services/shopify-customer-account.ts pages/api/account/login.ts pages/api/account/callback.ts tests/customer-account-origin.test.js
git commit -m "fix: validate customer account OAuth origins"
```

### Task 5: Centralize Shopify configuration access

**Files:**
- Modify: `config/shopify.ts`
- Modify: `services/shopify.ts`
- Modify: `services/shopify-admin.ts`
- Test: `tests/shopify-config.test.js`

**Interfaces:**
- Produces typed shared getters for normalized domain, API version, Storefront token, Admin token, and public-token safety checks.
- Preserves `getShopifyConfig`, `isShopifyConfigured`, and `getStorefrontAuthHeaders` behavior for existing callers.

- [ ] **Step 1: Add tests** for all supported domain aliases, protocol/trailing-slash normalization, API-version fallback, public/private token detection, and precedence of server Storefront credentials over public credentials.

- [ ] **Step 2: Run focused tests and verify they fail** for at least one currently inconsistent alias or fallback.

Run: `npx jest tests/shopify-config.test.js --runInBand`

Expected: FAIL where direct service reads diverge from the canonical config behavior.

- [ ] **Step 3: Add typed configuration getters** in `config/shopify.ts` and make `services/shopify.ts` consume them without changing demo-catalog fallback behavior.

- [ ] **Step 4: Update `services/shopify-admin.ts`** to consume shared domain/API normalization while keeping Admin credentials server-only and preserving Admin-specific environment names.

- [ ] **Step 5: Verify private-token safety.** Ensure a `shpat_` or `shpua_` value in a public variable produces a warning/rejection path and is never emitted through a browser-facing config.

- [ ] **Step 6: Run focused tests, typecheck, lint, and commit.**

Run: `npx jest tests/shopify-config.test.js --runInBand`

Run: `npm run typecheck`

Run: `npx eslint config/shopify.ts services/shopify.ts services/shopify-admin.ts`

```bash
git add config/shopify.ts services/shopify.ts services/shopify-admin.ts tests/shopify-config.test.js
git commit -m "refactor: centralize Shopify configuration"
```

### Task 6: Tighten CSP without breaking required integrations

**Files:**
- Modify: `next.config.js`
- Test: `tests/csp-config.test.js`
- Create: `docs/README-security.md`

**Interfaces:**
- Preserves the existing `nextConfig.headers()` contract and required Builder, Vercel, Theme UI, Shopify, and ElevenLabs origins.

- [ ] **Step 1: Add configuration tests** that assert `unsafe-eval` appears only when `NODE_ENV=development`, required integration origins remain present, and security directives include `object-src 'none'`, `base-uri 'self'`, and explicit `worker-src`.

- [ ] **Step 2: Run the focused test and inspect current CSP output.**

Run: `npx jest tests/csp-config.test.js --runInBand`

Expected: the test identifies any broad origin that is not required by the documented integrations.

- [ ] **Step 3: Narrow only demonstrably unused wildcard origins.** Keep wildcard entries that are required by Builder/Vercel/ElevenLabs runtime behavior, and do not remove `style-src 'unsafe-inline'` unless the existing Emotion/Theme UI rendering path is migrated in the same task.

- [ ] **Step 4: Document remaining CSP exceptions** and why they are required.

- [ ] **Step 5: Run focused tests and commit.**

Run: `npx jest tests/csp-config.test.js --runInBand`

```bash
git add next.config.js tests/csp-config.test.js docs/README-security.md
git commit -m "fix: tighten storefront content security policy"
```

### Task 7: Complete regression validation and operational documentation

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `docs/README-security.md`
- Test: all existing tests

- [ ] **Step 1: Document the new policy knobs** including approved origins, local-development behavior, trusted-proxy behavior, in-memory limiter scope, and required production environment values.

- [ ] **Step 2: Add environment examples** for the explicit development/trusted-proxy flags without adding secrets or real credentials.

- [ ] **Step 3: Run the full repository precheck.**

Run: `npm run precheck`

Expected: node-version, CI-integrity, dependency-health, typecheck, lint, secret scan, Customer Account auth health, and XSS hardening all pass.

- [ ] **Step 4: Run the full test suite.**

Run: `npm run test:a11y`

Expected: all existing and newly added Jest suites pass with zero failures.

- [ ] **Step 5: Run the production build.**

Run: `npm run build`

Expected: the precheck and Next.js production build complete successfully.

- [ ] **Step 6: Review the final diff and commit documentation.**

```bash
git status --short
git --no-pager diff --check
git add README.md .env.example docs/README-security.md
git commit -m "docs: document storefront security boundaries"
```
