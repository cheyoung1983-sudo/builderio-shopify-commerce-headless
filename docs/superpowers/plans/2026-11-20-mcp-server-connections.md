# MCP Server Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the repository's existing platform integrations to MCP safely, in phases, while preserving test-mode and least-privilege boundaries.

**Architecture:** Keep `.mcp.json` as the workspace-level MCP endpoint inventory, keep `agents/config/mcp-server-config.json` as the agent/server capability inventory, and keep `lib/mcp-integration-manager.ts` as the read-only health/configuration surface. Use provider OAuth or hosted MCP authentication for interactive development; keep application-only service credentials in server environment variables and never copy secrets into `.mcp.json`.

**Tech Stack:** Next.js 16 Pages Router, MCP JSON configuration, OAuth/Bearer authentication, Shopify GraphQL, Persona, Stripe Identity, Auth0, Builder.io, ElevenLabs, Slack, Sentry, Vercel, GitHub, Playwright, and Chrome DevTools.

**Spec:** Repository audit of `.mcp.json`, `agents/config/mcp-server-config.json`, `config/mcp.ts`, `lib/mcp-integration-manager.ts`, `.env.example`, and the integration API routes/services.

## Global Constraints

- Node.js 24.x and npm 11.x; do not change repository package versions for MCP setup.
- Do not add live secrets, private Shopify tokens, Stripe live keys, webhook secrets, or customer PII to MCP configuration or source control.
- Stripe Identity and Shopify customer-tag changes remain test-gated by `TRIBAL_VERIFY_ENABLED`, `STRIBAL_STRIPE_TEST_MODE_ONLY`, `TRIBAL_SHOPIFY_TAG_MODE`, and human approval.
- Auth0 MCP must retain `--read-only`; writes must use the Auth0 dashboard or a separately reviewed provider connection.
- Persona MCP operations involving identity or fraud signals require human approval and should remain behind `isAdminSession`.
- Production mutations require explicit user approval. Read operations may be automatic only when they cannot change platform state.

## Review Focus

- Hosted MCP endpoints must remain HTTPS except explicitly local stdio servers.
- MCP configuration changes must not expose secret values from `.mcp.json`, logs, or integration-status responses.
- A write-capable server must not be auto-approved in production or by default.
- Missing credentials must report a clear configuration status, not crash or expose upstream secrets.
- Auth and MCP changes must preserve the existing test suite and test-environment safeguards.

---

## Phase 1: Baseline and Validation

### Task 1: Record a credential-free MCP baseline

**Files:**
- Audit: `.mcp.json`
- Audit: `agents/config/mcp-server-config.json`
- Audit: `config/mcp.ts`
- Audit: `lib/mcp-integration-manager.ts`
- Test: `tests/mcp-config.test.js`

- [ ] **Step 1: Verify MCP configuration parsing and sanitization**

Run:

```bash
npx jest tests/mcp-config.test.js
```

Expected: PASS. The suite verifies Playwright, read-only Auth0, Persona, workspace guardrails, server URL validation, and secret-header redaction.

- [ ] **Step 2: Capture a baseline integration-status report**

Run only in an environment with valid local admin credentials:

```bash
curl -i -u "$ADMIN_USERNAME:$ADMIN_PASSWORD" http://localhost:3000/api/mcp/integrations
```

Expected: `200` and a JSON report listing every server without secret values. Missing credentials must appear only as configuration state/error text.

- [ ] **Step 3: Fix baseline gaps before provider authorization**

Add a test to `tests/mcp-config.test.js` only if the baseline reveals an untested entry. Verify every server in `agents/config/mcp-server-config.json` exists in `.mcp.json`, or explicitly classify it as server-side-only.

Run:

```bash
npx jest tests/mcp-config.test.js
```

Expected: PASS before any OAuth or write-capable connection is enabled.

## Phase 2: Development and Verification Servers

### Task 2: Connect GitHub MCP

**Files:**
- `.mcp.json`
- `.github/copilot-instructions.md`

- [ ] **Step 1: Authorize GitHub MCP**

Authenticate the hosted `github` server with repository access limited to this account/repository. Review repository, issue, pull-request, actions, and branch permissions.

- [ ] **Step 2: Verify read operations**

Confirm MCP can list/open the current repository, recent branches, open pull requests, workflow runs, and relevant issues.

- [ ] **Step 3: Restrict mutation operations**

Do not enable autonomous merge, branch deletion, secret changes, repository settings, or force-push operations. Require explicit review and approval for comments, review comments, branch creation, file changes, pull-request updates, and merges.

### Task 3: Connect Playwright and Chrome DevTools MCP

**Files:**
- `.mcp.json`
- `.github/copilot-instructions.md`
- `tests/mcp-config.test.js`

- [ ] **Step 1: Verify local Playwright startup**

Run:

```bash
npm run dev
npx jest tests/mcp-config.test.js
```

Expected: the MCP server starts with the repository's existing `.mcp.json` entry and browser validation can open `http://localhost:3000`.

- [ ] **Step 2: Add a browser smoke-test checklist**

Verify `/`, `/products`, `/cart`, `/search`, and one native `/product/<handle>` route. Verify the maintenance root is not incorrectly rendered through `_app`, and verify a missing non-root route returns 404.

- [ ] **Step 3: Protect browser state**

Use isolated browser contexts and test-only account data. Never log Customer Account, Shopify, Stripe, Auth0, or Persona secrets through browser snapshots/network captures.

### Task 4: Connect Vercel MCP

**Files:**
- `.mcp.json`
- `AGENT_WORKFLOW.md`

- [ ] **Step 1: Authenticate Vercel MCP**

Authorize the hosted server for the team/project that owns the deployed storefront. Prefer read access plus deployment-preview access before write permissions.

- [ ] **Step 2: Verify read operations**

Confirm project lookup, deployment status, logs, environment variable names, and deployment URL access.

- [ ] **Step 3: Require approval for mutations**

Require explicit approval for environment variable changes, production deployment, domain changes, project settings, and destructive operations.

## Phase 3: Commerce and Identity Servers

### Task 5: Connect Shopify MCP

**Files:**
- `.mcp.json`
- `agents/config/mcp-server-config.json`
- `config/shopify.ts`
- `lib/mcp-integration-manager.ts`

- [ ] **Step 1: Test endpoint and OAuth authorization**

Verify the exact hosted endpoint in `.mcp.json` and the store-domain/token relationship in `config/shopify.ts`. Do not use private `shpat_` or `shpua_` tokens as public MCP credentials.

- [ ] **Step 2: Verify read-only operations first**

Test product lookup, collection lookup, inventory, store context, and order lookup. Confirm MCP sees the demo fallback only as demo data and not as live inventory.

- [ ] **Step 3: Keep writes human-gated**

Require approval for draft orders, mutations, catalog updates, customer tags, tax settings, webhook settings, and Admin API changes. Keep `TRIBAL_SHOPIFY_TAG_MODE=off` until an explicit allowlist/on policy is approved.

### Task 6: Connect Stripe MCP

**Files:**
- `.mcp.json`
- `agents/config/mcp-server-config.json`
- `lib/tribal/stripe-identity.ts`
- `pages/api/webhooks/stripe-identity.ts`
- `.env.example`

- [ ] **Step 1: Use test-mode credentials only**

Configure a restricted test-mode key with only the required Identity VerificationSession permissions. Verify the webhook secret and test-mode environment gates.

Run:

```bash
npx jest tests/tribal-verify.test.js tests/tribal-dual-track.test.js tests/webhook-signature.test.js
```

Expected: PASS. No live key or live event is accepted.

- [ ] **Step 2: Verify Identity reads**

List or retrieve test-mode verification sessions only. Do not read live data or output raw identity documents in MCP logs.

- [ ] **Step 3: Require approval for writes**

Require explicit approval for creating/retrieving/redacting Identity sessions and for changing webhook or payment settings.

### Task 7: Connect Persona MCP

**Files:**
- `.mcp.json`
- `lib/persona/mcp-client.ts`
- `pages/api/persona/mcp-query.ts`
- `lib/mcp-integration-manager.ts`
- `.env.example`

- [ ] **Step 1: Authenticate with a server-only key**

Set `PERSONA_MCP_API_KEY` only in the server environment. Do not expose it through `NEXT_PUBLIC_*`.

Run:

```bash
npx jest tests/mcp-config.test.js tests/tribal-approval-security.test.js tests/firebase-tribal-registry.test.js
```

Expected: PASS and Persona MCP remains behind owner/admin authorization.

- [ ] **Step 2: Exercise the admin proxy**

Verify unauthenticated requests are denied and approved owner sessions receive a configuration/status response. Test one read-only or fraud cross-reference prompt with synthetic inquiry/email data.

- [ ] **Step 3: Keep sensitive actions human-gated**

Require approval for redaction, inquiry updates, report dismissal, tag changes, case changes, and fraud or PII-related prompts. Do not log API keys or PII in responses.

### Task 8: Connect Auth0 MCP

**Files:**
- `.mcp.json`
- `agents/config/mcp-server-config.json`
- `lib/auth0.ts`
- `pages/api/auth/`

- [ ] **Step 1: Retain read-only startup**

Keep the Auth0 server command as `npx @auth0/auth0-mcp-server run --read-only`. Do not remove `--read-only`.

Run:

```bash
npx jest tests/mcp-config.test.js tests/strict-owner-security.test.js
```

Expected: PASS.

- [ ] **Step 2: Authorize read operations**

Use the interactive OAuth flow for tenant inspection limited to the environment needed for support and configuration review.

- [ ] **Step 3: Keep mutations separate**

Manage user/session configuration, applications, rules/actions, and tenant changes through the Auth0 dashboard or a separately reviewed write connection.

## Phase 4: Content, Voice, and Operations Servers

### Task 9: Connect Builder.io MCP

**Files:**
- `.mcp.json`
- `agents/config/mcp-server-config.json`
- `config/builder.ts`
- `lib/resolve-builder-content.ts`

- [ ] **Step 1: Authenticate**

Use hosted OAuth/Bearer access scoped to the Builder organization/space backing this storefront.

- [ ] **Step 2: Verify content reads**

Confirm content models, page entries, symbols/components, and preview resolution.

- [ ] **Step 3: Gate writes**

Require approval for publishing, model/schema changes, component registration changes, and deletion. Verify root `/` remains maintenance HTML and catch-all behavior remains unchanged after Builder changes.

### Task 10: Connect ElevenLabs MCP

**Files:**
- `.mcp.json`
- `agents/config/mcp-server-config.json`
- `components/ElevenLabsAgent.jsx`
- `pages/api/elevenlabs/`
- `lib/elevenlabs-token.ts`

- [ ] **Step 1: Authenticate with server credentials**

Use `ELEVENLABS_API_KEY` only server-side. Keep `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` public-only and non-sensitive.

Run:

```bash
npx jest tests/elevenlabs-token-security.test.js tests/voice-launcher-click.test.js
```

Expected: PASS and no API key is exposed to browser bundles.

- [ ] **Step 2: Verify read operations**

Confirm agent, voice, and usage metadata can be read with the correct workspace scope.

- [ ] **Step 3: Gate writes and voice synthesis**

Require approval for agent/voice changes and spending-producing operations. Retain existing token, webhook, and activity-keeper security tests.

### Task 11: Connect Slack MCP

**Files:**
- `.mcp.json`
- `agents/config/mcp-server-config.json`
- `lib/slack-notification-manager.ts`
- `pages/api/slack/tribal-interaction.ts`

- [ ] **Step 1: Authenticate a narrow Slack app**

Use a workspace-scoped app and grant only the channels it must read/post. Prefer existing webhook behavior for outbound alerts until MCP write needs are proven.

Run:

```bash
npx jest tests/tribal-approval-security.test.js
```

Expected: PASS and alerts remain human-reviewed/approved where applicable.

- [ ] **Step 2: Verify read operations**

Confirm channel and message metadata only for approved channels.

- [ ] **Step 3: Require approval for posting**

Require approval for sending customer/tribal review alerts or changing Slack settings. Never include full PII or verification documents in MCP messages.

### Task 12: Connect Sentry MCP

**Files:**
- `.mcp.json`
- `agents/config/mcp-server-config.json`
- `lib/tribal/sentry-monitor.ts`

- [ ] **Step 1: Authenticate a read-first integration**

Grant access to the relevant project and environment with read-only issue/event access.

- [ ] **Step 2: Verify read operations**

Confirm issue, stack trace, deployment, and release visibility.

- [ ] **Step 3: Require approval for mutations**

Require approval for issue assignment, resolution, release changes, alert-rule edits, and deletion.

## Phase 5: Integrations Without MCP

### Task 13: Keep direct integrations when no MCP is appropriate

**Files:**
- Audit: `lib/tax-calculator.ts`
- Audit: `lib/tribal/avatax.ts`
- Audit: `lib/firebase.ts`
- Audit: `lib/db/index.ts`
- Audit: `lib/redis.ts`
- Audit: `lib/tribal/email-service.ts`
- Audit: `pages/api/elevenlabs/`
- Audit: `pages/api/agent/`

- [ ] **Step 1: Classify the remaining integrations**

Keep direct SDK/API integration for AvaTax, Firebase, PostgreSQL/Drizzle, Redis/Upstash, SendGrid/Resend, Google Analytics, Gemini/Google, and SFTP supplier sync unless a verified, scoped MCP server is available.

- [ ] **Step 2: Route all remaining credentials through server configuration**

Keep service credentials out of `.mcp.json`, public environment variables, logs, and MCP prompts.

- [ ] **Step 3: Reassess only on provider support**

Add an MCP only after verifying supported operations, OAuth or least-privilege auth, mutation approval, PII handling, and test coverage.

## Final Validation

- [ ] Run `npm run precheck`.
- [ ] Run `npx jest tests/mcp-config.test.js`.
- [ ] Run provider-specific test files for every newly enabled server.
- [ ] Confirm `/api/mcp/integrations` returns configuration state with no secret values.
- [ ] Confirm unauthenticated and non-owner admin requests receive `403`.
- [ ] Confirm all write tools require explicit approval.
- [ ] Confirm local Playwright smoke flows and key responsive routes.
- [ ] Review `.mcp.json` and `agents/config/mcp-server-config.json` for consistency.
- [ ] Document each OAuth/grant approval and retained scope in the PR description.
