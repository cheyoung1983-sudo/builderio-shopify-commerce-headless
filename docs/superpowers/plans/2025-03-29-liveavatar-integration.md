# HeyGen LiveAvatar Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate HeyGen LiveAvatar interactive real-time video streaming as a floating shopping assistant.

**Architecture:** A Vercel Function API endpoint (`pages/api/avatar/session.ts`) handles secure session token acquisition from HeyGen. A floating React component (`components/avatar/FloatingLiveAvatarWidget.tsx`) leverages `@heygen/liveavatar-web-sdk` to manage WebRTC streams and user controls. Consent is enforced via pre-existing `AiDisclosureBanner` logic.

**Tech Stack:** Next.js, React, `@heygen/liveavatar-web-sdk`, Vercel Functions.

**Spec:** [`docs/superpowers/specs/2025-03-29-liveavatar-integration-design.md`](file:///C:/Users/cheyo/OneDrive/Documents/GitHub/latest/builderio-shopify-commerce-headless/docs/superpowers/specs/2025-03-29-liveavatar-integration-design.md)

## Global Constraints

- Never expose `LIVEAVATAR_API_KEY` to browser code; all API calls to HeyGen must proxy through `/api/avatar/session`.
- Rate-limit the session generation endpoint to 10 requests per minute.
- Enforce pre-interaction consent check using `dcp_ai_consent_accepted` before starting WebRTC streams.
- All errors from HeyGen upstream must be sanitized before being returned to the client.

## Review Focus

1. **Unauthorized / Missing API Key:** Verify the API rejects requests without proper server-side configuration.
2. **Invalid Session Request:** Ensure HeyGen error responses are sanitized for security.
3. **Missing Consent:** Ensure widget prevents camera/mic initialization if `dcp_ai_consent_accepted` is false.
4. **Session Leak:** Ensure WebRTC streams are cleanly disposed on component unmount or session end.
5. **Rate Limiting:** Confirm that hitting the limit returns 429 status.

---

### Task 1: Serverless Session API (`pages/api/avatar/session.ts`)

**Files:**
- Create: `pages/api/avatar/session.ts`
- Test: `tests/avatar-session.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/avatar/session` -> `{ success: boolean, sessionUrl: string, avatarId: string, contextId: string }`

- [ ] **Step 1: Write failing test for Session API**

```typescript
// tests/avatar-session.test.ts
import { describe, it, expect } from 'vitest'
// Mock API call to HeyGen...
```

- [ ] **Step 2: Run test (Expect Failure)**
- [ ] **Step 3: Implement `pages/api/avatar/session.ts`**
- [ ] **Step 4: Run test (Expect Pass)**
- [ ] **Step 5: Commit**

### Task 2: Floating LiveAvatar Widget (`components/avatar/FloatingLiveAvatarWidget.tsx`)

**Files:**
- Create: `components/avatar/FloatingLiveAvatarWidget.tsx`

**Interfaces:**
- Consumes: `/api/avatar/session`
- Produces: Floating widget UI with camera/mic controls.

- [ ] **Step 1: Implement widget shell**
- [ ] **Step 2: Implement SDK lifecycle hooks (`connect`, `disconnect`)**
- [ ] **Step 3: Add consent guard logic**
- [ ] **Step 4: Commit**

### Task 3: Global Integration (`pages/_app.tsx`)

**Files:**
- Modify: `pages/_app.tsx`

**Interfaces:**
- Consumes: `<FloatingLiveAvatarWidget />`

- [ ] **Step 1: Mount component globally**
- [ ] **Step 2: Verify visibility across store**
- [ ] **Step 3: Commit**
