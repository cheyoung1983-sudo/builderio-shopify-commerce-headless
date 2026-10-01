# Implementation Plan: Fix WsProxy Upstream Error & Unexpected Token '<'

Fix the two errors occurring in the voice agent session:
- **Error 0**: `[WsProxy] ElevenLabs upstream error: WebSocket was closed before the connection was established`
- **Error 1**: `Uncaught SyntaxError: Unexpected token '<'`

---

## 1. Root Cause Analysis

### Error 1: `Uncaught SyntaxError: Unexpected token '<'`
- `pages/api/agent/ws-proxy.ts` was an empty (0-byte) file without a default export.
- When requested by the browser or client script, Next.js returned an HTTP 500 HTML error page (`<!DOCTYPE html>...`).
- Parsing this HTML response as JSON or JavaScript threw `Uncaught SyntaxError: Unexpected token '<'`.

### Error 2: `[WsProxy] ElevenLabs upstream error: WebSocket was closed before connection was established`
- The proxy attempted to connect to ElevenLabs upstream using the primary agent ID (`agent_3101m30qaxc1f3981zq05pp86ax1`).
- ElevenLabs immediately closes WebSockets for `agent_3101m30qaxc1f3981zq05pp86ax1` with code `3000` because its credit quota is depleted.
- When ElevenLabs closes the connection before handshake completion, `ws` emits: `WebSocket was closed before the connection was established`.
- The fallback agent (`agent_6301kqxr35beedj8n91eq7gz73d7`) has active credits and connects cleanly when provided with the approved origin header (`https://www.displaycellpros.com`).

---

## 2. Proposed Changes

### Component 1: Complete WebSocket Proxy Implementation (`lib/ws-proxy-server.ts`)
- Implement `getWsProxyServer()` using `ws.WebSocketServer({ noServer: true })`.
- Upstream connection logic:
  - Route to `agent_6301kqxr35beedj8n91eq7gz73d7` (healthy agent with credits) by default, or accept requested `agentId` with automatic failover if close code 3000 is encountered.
  - Set `Origin: "https://www.displaycellpros.com"` on the upstream request to satisfy ElevenLabs domain origin restrictions.
  - Forward messages, audio buffers, and close frames bidirectionally between client and ElevenLabs upstream.
- Implement `attachWsProxyToServer(server)` to intercept HTTP upgrade requests on `/api/agent/ws-proxy` without disrupting Next.js HMR or other upgrade listeners.

### Component 2: Next.js API Route Handler (`pages/api/agent/ws-proxy.ts`)
- Export a valid default API handler function.
- Attach the WebSocket upgrade listener to the underlying Node HTTP server via `(res.socket as any)?.server`.
- Return valid HTTP 200 JSON (`{ status: "ok", service: "ElevenLabs WebSocket Proxy", ... }`) to ensure no HTML error pages are ever returned to the client.

### Component 3: Client Widget Integration (`components/ElevenLabsAgent.jsx`)
- Ensure the widget safely detects proxy availability and falls back seamlessly between direct WebSocket, proxied WebSocket, and WebRTC.

---

## 3. Verification Plan

### Automated & Manual Verification
1. **Endpoint Validation**:
   - `curl -s -i http://localhost:3000/api/agent/ws-proxy` -> Confirm HTTP 200 JSON response (verifying no `<!DOCTYPE html>` or `Unexpected token '<'`).
2. **Upstream Proxy Connection Test**:
   - Run a live test connecting through the local WebSocket proxy to ElevenLabs and verify successful reception of `conversation_initiation_metadata`.
3. **Typecheck & Lint**:
   - `npm run typecheck` -> 0 TypeScript errors.
   - `npm run lint` -> 0 ESLint errors.
4. **App Health**:
   - Verify dev server on port 3000 serves requests properly.
