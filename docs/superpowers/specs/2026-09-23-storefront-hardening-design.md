# Storefront Hardening and Boundary Consistency

## Goal

Improve the production resilience of the DisplayCellPros storefront without
changing its core Next.js, Shopify, Builder.io, or Customer Account
architecture. The work covers all six improvement areas identified during the
project analysis and is sequenced by risk.

## Scope and success criteria

The implementation will:

- Reduce abuse risk on public agent, token, signed-URL, and observability API
  routes.
- Keep CORS behavior explicit and limited to the origins that need browser
  access.
- Centralize Shopify environment normalization without merging the two existing
  Shopify data-client layers.
- Make Customer Account OAuth redirect-origin selection deterministic and safe.
- Bound and validate client-supplied observability data.
- Preserve required CSP behavior while narrowing avoidable allowances.
- Add focused automated coverage for the changed security and configuration
  boundaries.

The implementation will not add a new external rate-limiting service. In-memory
limits are intentionally best-effort and per process; this limitation will be
documented.

## Design

### 1. Shared API security boundary

Create a small dependency-free utility under `lib/api-security` for:

- Allowed-origin matching with exact configured origins and explicit local
  development rules.
- Consistent CORS response headers and preflight handling.
- Allowed-method enforcement.
- Request field validation and bounded string/metadata parsing.
- A lightweight per-process token-bucket or fixed-window rate limiter.

Apply endpoint-specific policies:

- `/api/agent/search` and `/api/agent/content`: remain public, but validate
  query/model/limit values, enforce body-size and rate limits, and use explicit
  CORS.
- `/api/agent/token` and `/api/agent/signed-url`: accept only approved origins,
  validate agent IDs against the ElevenLabs format, enforce rate limits, and
  avoid reflecting broad `.run.app` or substring-based `localhost` origins.
- `/api/observability/log`: accept only the required POST shape, enforce strict
  field limits and rate limits, and do not echo arbitrary production payloads.

Upstream exception details remain server-side only. Existing public response
shapes are preserved where consumers depend on them.

### 2. Shopify configuration boundary

Extend the existing Shopify configuration module with typed helpers for the
normalized domain, Storefront token, API version, and server-only credentials.
Update service consumers to use those helpers rather than independently
reading environment variables. Preserve:

- Public versus private Storefront token detection.
- Browser exposure only for `NEXT_PUBLIC_*` values.
- Existing fallback/demo-catalog behavior.
- Existing Admin and Customer Account service responsibilities.

This is a boundary cleanup, not a rewrite of the legacy storefront-data-hooks
client.

### 3. Customer Account OAuth origin handling

Change site-origin resolution to prefer the configured canonical site URL.
Forwarded protocol/host headers may be used only in explicitly supported local
or trusted-proxy conditions. Validate protocol and host values before building
callback URLs. Retain current protections for:

- PKCE verifier and state cookies.
- State comparison.
- ID-token nonce and audience validation.
- Relative-only return paths.

### 4. Observability and CSP

For observability:

- Normalize timestamps or replace invalid client values with the server time.
- Cap message, stack, component stack, URL, user-agent, event ID, and metadata
  sizes.
- Validate metadata as bounded JSON-compatible data.
- Keep detailed structured output disabled in production.

For CSP:

- Keep Builder, Theme UI, Vercel, and ElevenLabs functionality working.
- Keep `unsafe-eval` development-only.
- Remove or narrow origins not required by the current runtime where this can
  be done without breaking preview/editor behavior.
- Document any remaining wildcard or inline-style requirement as an explicit
  integration constraint.

## Testing and validation

Add focused tests for:

- Exact and rejected CORS origins.
- Rate-limit behavior and reset/expiry.
- Agent ID, query, model, limit, and body validation.
- Shopify domain/token/API-version normalization and shared getter use.
- OAuth canonical-origin selection and trusted-forwarded-header handling.
- Observability truncation, invalid timestamps, and production response shape.

Run the repository's existing validation commands:

```text
npm run precheck
npm run test:a11y
npm run build
```

Also run targeted tests during implementation for each changed utility and API
route. No new test runner or linting tool will be introduced.

## Rollout and operational notes

Implement in this order:

1. Shared API security utility and public endpoint hardening.
2. Token/signed-URL and observability protections.
3. OAuth origin handling.
4. Shopify configuration consolidation.
5. CSP tightening.
6. Tests, documentation, and full validation.

The in-memory limiter is not globally consistent across multiple server
instances or cold starts. If abuse persists at scale, the next iteration should
replace only the limiter storage with a managed distributed store while keeping
the endpoint policy interface unchanged.

## Out of scope

- Replacing Shopify Storefront data-client layers.
- Introducing authentication for public product search.
- Changing checkout, cart, or product UX.
- Adding a new external infrastructure dependency.
- Broad unrelated refactoring or redesigning the CSP around non-required
  integrations.
