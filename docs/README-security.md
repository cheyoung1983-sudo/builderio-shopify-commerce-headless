# Storefront Security Boundaries & CSP Documentation

This document outlines the security boundaries and Content Security Policy (CSP) configuration for the storefront.

## Content Security Policy (CSP)

The CSP is designed to protect users from Cross-Site Scripting (XSS) and other injection attacks while maintaining compatibility with essential third-party integrations.

### Required Exceptions

#### 1. Builder.io (`https://cdn.builder.io`, `https://builder.io`, `https://*.builder.io`)
- **Why:** Necessary for fetching content from the Builder.io API and loading the visual editor's embed bridge script.
- **Directives:** `script-src`, `connect-src`, `img-src`.

#### 2. Vercel (`https://vercel.live`, `https://*.vercel.live`)
- **Why:** Required for the Vercel Toolbar, Live feedback widget, and preview deployment infrastructure.
- **Directives:** `script-src`, `frame-src`, `connect-src`, `img-src`, `font-src`.

#### 3. Shopify (`https://*.myshopify.com`, `https://cdn.shopify.com`)
- **Why:** Essential for communicating with the Shopify Storefront API and loading product images.
- **Directives:** `connect-src`, `img-src`.

#### 4. ElevenLabs (`https://api.elevenlabs.io`, `https://*.elevenlabs.io`, etc.)
- **Why:** Required for the conversational AI voice agent, including WebSocket connections for real-time audio streaming.
- **Directives:** `connect-src`.

#### 5. LiveKit (`https://*.livekit.cloud`, `wss://*.livekit.cloud`)
- **Why:** Used as the underlying real-time transport for the voice agent.
- **Directives:** `connect-src`.

#### 6. Development Origins (`https://ais-dev-...run.app`, `ws://localhost:*`)
- **Why:** Allows development and testing on local machines and specific Google Cloud Run development environments.
- **Directives:** `connect-src`, `Permissions-Policy`.

### Special Directives

- **`script-src 'unsafe-eval'`**: Only enabled in `development` mode to support Next.js Fast Refresh and other developer tools.
- **`style-src 'unsafe-inline'`**: Required because the app uses CSS-in-JS (Emotion/Theme UI), which injects styles at runtime. This is a lower risk than `unsafe-eval` as it doesn't allow arbitrary JS execution.
- **`object-src 'none'`**: Blocks all plugins (Flash, Java, etc.) as they are not used and represent a significant security risk.
- **`base-uri 'self'`**: Prevents attackers from changing the base URL for relative links.

## API Security

The public API routes (`/api/agent/*`, `/api/observability/*`) implement the following protections:
- **Exact Origin Validation**: Rejects requests from unapproved origins to prevent CORS-based attacks.
- **Rate Limiting**: Implements in-memory rate limiting per client IP to prevent DoS attacks.
- **Input Bounding**: All incoming string and integer inputs are truncated or clamped to prevent buffer overflows or database stress.
- **Deterministic OAuth Origins**: The Customer Account OAuth flow uses a deterministic site URL, ignoring untrusted forwarded headers.
