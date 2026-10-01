# Specification: HeyGen LiveAvatar Integration & Floating Shopping Guide

**Date:** 2025-03-29  
**Status:** Approved  
**Scope:** Serverless Vercel Function Session API (`pages/api/avatar/session.ts`), Floating React LiveAvatar Widget Component (`components/avatar/FloatingLiveAvatarWidget.tsx`), and Storefront Integration in `pages/_app.tsx`.

---

## 1. Overview & Architecture

This specification details the integration of HeyGen LiveAvatar interactive real-time video streaming into the Next.js storefront:
1. **Serverless Session API (`pages/api/avatar/session.ts`):** Handles secure authentication with `https://api.liveavatar.com/v2/embeddings` using `LIVEAVATAR_API_KEY`.
2. **Floating React Widget (`components/avatar/FloatingLiveAvatarWidget.tsx`):** A client-side WebRTC floating video widget leveraging `@heygen/liveavatar-web-sdk`.
3. **Compliance & Consent Integration:** Integrates with `AiDisclosureBanner` consent tracking (`dcp_ai_consent_accepted`) before enabling microphone capture.

```
                    +--------------------------------+
                    | Next.js Client (_app.tsx)      |
                    +---------------+----------------+
                                    |
            1. POST /api/avatar/session (Request Session)
                                    |
                                    v
                    +--------------------------------+
                    | Vercel Function                |
                    | (pages/api/avatar/session.ts)  |
                    +---------------+----------------+
                                    |
            2. POST https://api.liveavatar.com/v2/embeddings
               Header: X-API-KEY: LIVEAVATAR_API_KEY
                                    |
                                    v
                    +--------------------------------+
                    | Return Session URL & Config    |
                    +---------------+----------------+
                                    |
            3. Initialize WebRTC Video Stream via
               @heygen/liveavatar-web-sdk
                                    |
                                    v
                    +--------------------------------+
                    | Floating Video Avatar Widget   |
                    | (FloatingLiveAvatarWidget.tsx) |
                    +--------------------------------+
```

---

## 2. Serverless Session API (`pages/api/avatar/session.ts`)

* **HTTP Method:** `POST`
* **Route:** `/api/avatar/session`
* **Security & Controls:**
  * Rate-limited to 10 requests per minute per IP.
  * Restricted origins using `DEFAULT_AGENT_CORS_OPTIONS`.
  * Checks server-side `process.env.LIVEAVATAR_API_KEY`.
* **Payload Parameters:**
  * `avatarId` (optional, default: `"65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0"`)
  * `contextId` (optional, default: `"158f5d55-2d4f-11f1-8d28-066a7fa2e369"`)
  * `isSandbox` (optional boolean, default: `true` for free credit testing)
* **Upstream Request:**
  * Endpoint: `https://api.liveavatar.com/v2/embeddings`
  * Headers: `X-API-KEY: process.env.LIVEAVATAR_API_KEY`, `Content-Type: application/json`
  * Body: `{ avatar_id, context_id, is_sandbox }`
* **Response Payload:**
  * `200 OK`: `{ success: true, sessionUrl: "https://embed.liveavatar.com/v1/...", avatarId, contextId }`
  * `400 / 500`: `{ success: false, error: "..." }`

---

## 3. Floating React Avatar Component (`components/avatar/FloatingLiveAvatarWidget.tsx`)

* **Client Component:** React client component with state management (`isExpanded`, `isConnecting`, `isConnected`, `isMuted`, `sessionUrl`).
* **UI Features:**
  * Trigger button in bottom-right corner with avatar video icon and notification badge.
  * Expandable modal panel with 16:9 video container.
  * Control bar with "Start Guide", "Mute/Unmute Mic", and "End Call" buttons.
  * Status text overlay ("Connecting...", "Live Avatar Active", "Disconnected").
* **SDK / WebRTC Management:**
  * Interacts with `@heygen/liveavatar-web-sdk` / session URL iframe or WebRTC stream.
  * Handles mic permissions cleanly with user prompts.
* **Consent Guard:**
  * Reads `localStorage.getItem('dcp_ai_consent_accepted')`.
  * Shows disclosure prompt before microphone audio initialization.

---

## 4. Storefront Mount (`pages/_app.tsx`)

* Mounts `<FloatingLiveAvatarWidget />` globally inside `pages/_app.tsx` so the interactive avatar assistant is available on all shop pages.

---

## 5. Testing & Verification

* Unit tests in `tests/avatar-session.test.ts`:
  1. Test successful session creation with mocked HeyGen API response.
  2. Test handling of missing `LIVEAVATAR_API_KEY`.
  3. Test rate limiting and HTTP 405 method enforcement.
