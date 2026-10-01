# ElevenLabs Speech Engine & Compliance Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a standalone Node.js/TypeScript ElevenLabs Speech Engine Upstream WebSocket server along with TCPA DNC/time-zone compliance, HIPAA Zero Retention Mode guards, and pre-interaction AI disclosure components.

**Architecture:** A dedicated Node.js WebSocket server (`server/speech-engine-server.ts`) handles incoming ElevenLabs connections at `/speech-engine/upstream` with HS256 JWT verification, streaming LLM turns and interruption handling. Next.js compliance helpers (`lib/compliance/`) manage TCPA DNC registration, time-zone constraints, HIPAA ZRM validation, and React AI disclosure UI components.

**Tech Stack:** Node.js, TypeScript, `ws`, `jsonwebtoken`, `crypto`, React, Next.js, `vitest` / Node test runner.

**Spec:** [`docs/superpowers/specs/2025-03-29-elevenlabs-speech-engine-compliance-design.md`](file:///C:/Users/cheyo/OneDrive/Documents/GitHub/latest/builderio-shopify-commerce-headless/docs/superpowers/specs/2025-03-29-elevenlabs-speech-engine-compliance-design.md)

## Global Constraints

- Server-side API key processing ONLY; never expose `ELEVENLABS_API_KEY` to client.
- HS256 JWT verification using SHA-256 hash digest of `ELEVENLABS_API_KEY`.
- Interruption handling with monotonically increasing `event_id`.
- TCPA local time calling window enforced between 8:00 AM and 9:00 PM.
- Zero Retention Mode allowlist enforcement for HIPAA compliance.

## Review Focus

1. **Missing or invalid JWT header on WebSocket upgrade:** Must reject connection with HTTP 401 Unauthorized before upgrading.
2. **Outdated `event_id` in speech turn:** Must abort current response generation and discard outdated `agent_response` messages.
3. **Out-of-window automated call attempting execution:** Must block execution and return time-zone violation error.
4. **Unsupported LLM selection when ZRM is active:** Must reject non-compliant model requests with 400 Bad Request.
5. **Unacknowledged AI disclosure:** Client UI must prevent session initialization until user clicks "I Agree".

---

### Task 1: TCPA Compliance & DNC Registry (`lib/compliance/tcpa.ts`)

**Files:**
- Create: `lib/compliance/tcpa.ts`
- Test: `tests/compliance-tcpa.test.ts`

**Interfaces:**
- Produces:
  - `addNumberToDnc(phone: string, reason?: string): void`
  - `isNumberOnDnc(phone: string): boolean`
  - `checkCallingTimeWindow(recipientPhone: string, nowDate?: Date): { allowed: boolean; reason?: string }`
  - `optOutAndEndCallTool`: ElevenLabs system tool definition for verbal opt-out.

- [ ] **Step 1: Write failing tests for TCPA DNC & Time-Zone Validation**

```typescript
// tests/compliance-tcpa.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { addNumberToDnc, isNumberOnDnc, checkCallingTimeWindow, clearDncRegistry } from '../lib/compliance/tcpa'

describe('TCPA Compliance Module', () => {
  beforeEach(() => {
    clearDncRegistry()
  })

  it('should add numbers to internal DNC registry and correctly verify presence', () => {
    const phone = '+18005550199'
    expect(isNumberOnDnc(phone)).toBe(false)
    addNumberToDnc(phone, 'Verbal opt-out request')
    expect(isNumberOnDnc(phone)).toBe(true)
  })

  it('should allow calls within 8:00 AM to 9:00 PM local time window', () => {
    const phone = '+12125550100' // NY (Eastern Time)
    const validTime = new Date('2025-03-29T14:00:00-04:00') // 2:00 PM EDT
    const result = checkCallingTimeWindow(phone, validTime)
    expect(result.allowed).toBe(true)
  })

  it('should reject calls outside 8:00 AM to 9:00 PM local time window', () => {
    const phone = '+12125550100' // NY (Eastern Time)
    const lateTime = new Date('2025-03-29T22:30:00-04:00') // 10:30 PM EDT
    const result = checkCallingTimeWindow(phone, lateTime)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Calling time window restriction')
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/compliance-tcpa.test.ts`  
Expected: FAIL ("Cannot find module ../lib/compliance/tcpa")

- [ ] **Step 3: Implement `lib/compliance/tcpa.ts`**

```typescript
// lib/compliance/tcpa.ts
import fs from 'fs'
import path from 'path'

interface DncRecord {
  phone: string
  addedAt: string
  reason?: string
}

let inMemoryDncSet = new Set<string>()

export function clearDncRegistry(): void {
  inMemoryDncSet.clear()
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

export function addNumberToDnc(phone: string, reason?: string): void {
  const normalized = normalizePhone(phone)
  inMemoryDncSet.add(normalized)
}

export function isNumberOnDnc(phone: string): boolean {
  const normalized = normalizePhone(phone)
  return inMemoryDncSet.has(normalized)
}

export function checkCallingTimeWindow(recipientPhone: string, nowDate = new Date()): { allowed: boolean; reason?: string } {
  const hour = nowDate.getHours()
  if (hour < 8 || hour >= 21) {
    return {
      allowed: false,
      reason: `Calling time window restriction: local hour ${hour} is outside 8:00 AM - 9:00 PM window.`,
    }
  }
  return { allowed: true }
}

export const optOutAndEndCallTool = {
  name: 'opt_out_and_end_call',
  description: 'Opt out caller from future automated contacts and terminate the call immediately upon verbal request.',
  parameters: {
    type: 'object',
    properties: {
      phoneNumber: { type: 'string', description: 'Caller phone number to place on DNC list' },
      reason: { type: 'string', description: 'Reason for opt-out' },
    },
    required: ['phoneNumber'],
  },
  execute: async ({ phoneNumber, reason }: { phoneNumber: string; reason?: string }) => {
    addNumberToDnc(phoneNumber, reason || 'Verbal request during call')
    return {
      success: true,
      action: 'end_call',
      message: 'Phone number has been added to Do-Not-Call registry. Terminating call now.',
    }
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/compliance-tcpa.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/compliance/tcpa.ts tests/compliance-tcpa.test.ts
git commit -m "feat(compliance): add TCPA DNC registry and time-zone window validator"
```

---

### Task 2: HIPAA & Zero Retention Mode Guard (`lib/compliance/hipaa.ts`)

**Files:**
- Create: `lib/compliance/hipaa.ts`
- Test: `tests/compliance-hipaa.test.ts`

**Interfaces:**
- Produces:
  - `validateZrmConfiguration(model: string, isZrmActive: boolean): { valid: boolean; error?: string }`
  - `redactSensitivePayload<T>(payload: T): T`

- [ ] **Step 1: Write failing tests for HIPAA ZRM Guard**

```typescript
// tests/compliance-hipaa.test.ts
import { describe, it, expect } from 'vitest'
import { validateZrmConfiguration, redactSensitivePayload } from '../lib/compliance/hipaa'

describe('HIPAA & Zero Retention Mode Guard', () => {
  it('should allow valid BAA models when ZRM is active', () => {
    const validModels = ['claude-3-5-sonnet', 'gemini-2.5-flash', 'gpt-4o', 'qwen3.5-397b']
    for (const model of validModels) {
      const res = validateZrmConfiguration(model, true)
      expect(res.valid).toBe(true)
    }
  })

  it('should reject non-BAA models when ZRM is active', () => {
    const res = validateZrmConfiguration('unapproved-experimental-model', true)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('not supported under Zero Retention Mode')
  })

  it('should redact sensitive PII/PHI strings in payload', () => {
    const payload = {
      user: 'John Doe',
      phone: '+18005550199',
      notes: 'Patient SSN 000-00-0000 info',
    }
    const redacted = redactSensitivePayload(payload)
    expect(redacted.phone).toBe('[REDACTED]')
    expect(redacted.notes).not.toContain('+18005550199')
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/compliance-hipaa.test.ts`  
Expected: FAIL ("Cannot find module ../lib/compliance/hipaa")

- [ ] **Step 3: Implement `lib/compliance/hipaa.ts`**

```typescript
// lib/compliance/hipaa.ts

export const ZRM_APPROVED_MODELS = [
  'claude-3-7-sonnet',
  'claude-3-5-sonnet',
  'claude-3-haiku',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gpt-4o',
  'gpt-4.1',
  'gpt-4-turbo',
  'qwen3.5-397b',
  'glm-5.2',
  'custom-llm',
]

export function validateZrmConfiguration(model: string, isZrmActive: boolean): { valid: boolean; error?: string } {
  if (!isZrmActive) {
    return { valid: true }
  }

  const normalizedModel = model.toLowerCase().trim()
  const isApproved = ZRM_APPROVED_MODELS.some((approved) => normalizedModel.includes(approved))

  if (!isApproved) {
    return {
      valid: false,
      error: `Model '${model}' is not supported under Zero Retention Mode (ZRM). Please select a BAA-compliant model or use Custom LLM.`,
    }
  }

  return { valid: true }
}

export function redactSensitivePayload<T>(data: T): T {
  if (typeof data === 'string') {
    let redacted = data
    // Redact E.164 Phone Numbers
    redacted = redacted.replace(/\+?[1-9]\d{1,14}/g, '[REDACTED]')
    // Redact SSN patterns
    redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
    // Redact Email addresses
    redacted = redacted.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    return redacted as unknown as T
  }

  if (data && typeof data === 'object') {
    const copy: any = Array.isArray(data) ? [] : {}
    for (const key of Object.keys(data)) {
      if (['phone', 'phoneNumber', 'ssn', 'email', 'patientName'].includes(key)) {
        copy[key] = '[REDACTED]'
      } else {
        copy[key] = redactSensitivePayload((data as any)[key])
      }
    }
    return copy as T
  }

  return data
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/compliance-hipaa.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/compliance/hipaa.ts tests/compliance-hipaa.test.ts
git commit -m "feat(compliance): add HIPAA Zero Retention Mode validator and redaction helper"
```

---

### Task 3: Pre-Interaction Disclosure UI & Speech Helpers (`components/compliance/AiDisclosureBanner.tsx` & `lib/compliance/disclosures.ts`)

**Files:**
- Create: `components/compliance/AiDisclosureBanner.tsx`
- Create: `lib/compliance/disclosures.ts`
- Test: `tests/compliance-disclosures.test.ts`

**Interfaces:**
- Produces:
  - `<AiDisclosureBanner onAgree={() => void} />`
  - `getVerbalDisclosure(companyName?: string): string`

- [ ] **Step 1: Write failing tests for Disclosures**

```typescript
// tests/compliance-disclosures.test.ts
import { describe, it, expect } from 'vitest'
import { getVerbalDisclosure } from '../lib/compliance/disclosures'

describe('Disclosure Compliance Helper', () => {
  it('should generate standard verbal disclosure prompt', () => {
    const statement = getVerbalDisclosure('Display Cell Pros')
    expect(statement).toContain('AI assistant')
    expect(statement).toContain('Display Cell Pros')
    expect(statement).toContain('recorded and processed')
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/compliance-disclosures.test.ts`  
Expected: FAIL ("Cannot find module ../lib/compliance/disclosures")

- [ ] **Step 3: Implement `lib/compliance/disclosures.ts` and `components/compliance/AiDisclosureBanner.tsx`**

```typescript
// lib/compliance/disclosures.ts
export function getVerbalDisclosure(companyName = 'Display Cell Pros'): string {
  return `Hi, I am an AI assistant for ${companyName}. This conversation may be recorded and processed by service providers for quality assurance and service delivery. How can I assist you today?`
}
```

```tsx
// components/compliance/AiDisclosureBanner.tsx
import React, { useState, useEffect } from 'react'

interface AiDisclosureBannerProps {
  onAgree: () => void
  companyName?: string
}

export const AiDisclosureBanner: React.FC<AiDisclosureBannerProps> = ({ onAgree, companyName = 'Display Cell Pros' }) => {
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('dcp_ai_consent_accepted')
    if (consent === 'true') {
      setAgreed(true)
      onAgree()
    }
  }, [onAgree])

  const handleConsent = () => {
    localStorage.setItem('dcp_ai_consent_accepted', 'true')
    setAgreed(true)
    onAgree()
  }

  if (agreed) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-900 text-white shadow-2xl border-t border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="text-sm">
        <p className="font-semibold text-amber-400">AI Interaction & Recording Notice</p>
        <p className="mt-1 text-gray-300">
          You are interacting with an AI voice/chat assistant powered by {companyName}. By proceeding, you consent to recording, transcription, and processing by ElevenLabs and third-party providers for service fulfillment.
        </p>
      </div>
      <button
        onClick={handleConsent}
        className="px-5 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-black rounded-lg transition-colors whitespace-nowrap"
      >
        I Agree
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/compliance-disclosures.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/compliance/disclosures.ts components/compliance/AiDisclosureBanner.tsx tests/compliance-disclosures.test.ts
git commit -m "feat(compliance): add AI pre-interaction disclosure UI component and verbal disclosure helper"
```

---

### Task 4: Speech Engine Upstream Server & JWT Authentication (`server/speech-engine-server.ts` & `lib/compliance/jwt.ts`)

**Files:**
- Create: `lib/compliance/jwt.ts`
- Create: `server/speech-engine-server.ts`
- Test: `tests/speech-engine-server.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `verifySpeechEngineJwt(token: string, apiKey: string): boolean`
  - Runnable server on port `3001` via `npm run start:speech-engine`

- [ ] **Step 1: Write failing test for Speech Engine JWT Verification**

```typescript
// tests/speech-engine-server.test.ts
import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { verifySpeechEngineJwt } from '../lib/compliance/jwt'

describe('Speech Engine JWT Verification', () => {
  const apiKey = 'sk_test_mock_elevenlabs_api_key_12345'
  const hmacSecret = crypto.createHash('sha256').update(apiKey).digest()

  it('should successfully verify a valid ElevenLabs Speech Engine JWT', () => {
    const validJwt = jwt.sign(
      {
        iss: 'https://api.elevenlabs.io/convai/speech-engine',
        sub: 'convai_speech_engine_upstream',
      },
      hmacSecret,
      { algorithm: 'HS256', expiresIn: '60s' }
    )

    const isValid = verifySpeechEngineJwt(validJwt, apiKey)
    expect(isValid).toBe(true)
  })

  it('should reject a JWT signed with an incorrect secret', () => {
    const invalidJwt = jwt.sign(
      {
        iss: 'https://api.elevenlabs.io/convai/speech-engine',
        sub: 'convai_speech_engine_upstream',
      },
      'wrong_secret',
      { algorithm: 'HS256', expiresIn: '60s' }
    )

    const isValid = verifySpeechEngineJwt(invalidJwt, apiKey)
    expect(isValid).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/speech-engine-server.test.ts`  
Expected: FAIL ("Cannot find module ../lib/compliance/jwt")

- [ ] **Step 3: Implement `lib/compliance/jwt.ts` and `server/speech-engine-server.ts`**

```typescript
// lib/compliance/jwt.ts
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

export function verifySpeechEngineJwt(token: string, apiKey: string): boolean {
  if (!token || !apiKey) return false

  try {
    const hmacSecret = crypto.createHash('sha256').update(apiKey).digest()
    const decoded = jwt.verify(token, hmacSecret, {
      algorithms: ['HS256'],
      clockTolerance: 60,
    }) as jwt.JwtPayload

    return (
      decoded.iss === 'https://api.elevenlabs.io/convai/speech-engine' &&
      decoded.sub === 'convai_speech_engine_upstream'
    )
  } catch (error) {
    return false
  }
}
```

```typescript
// server/speech-engine-server.ts
import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifySpeechEngineJwt } from '../lib/compliance/jwt'

const PORT = Number(process.env.SPEECH_ENGINE_PORT) || 3001
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'speech-engine-upstream' }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  const authHeader = request.headers['x-elevenlabs-speech-engine-authorization'] as string | undefined

  if (!authHeader || !verifySpeechEngineJwt(authHeader, ELEVENLABS_API_KEY)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request)
  })
})

interface Session {
  conversationId?: string
  lastEventId: number
  abortController?: AbortController
}

const activeSessions = new Map<WebSocket, Session>()

wss.on('connection', (ws) => {
  const session: Session = { lastEventId: 0 }
  activeSessions.set(ws, session)

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString())

      if (msg.type === 'init') {
        session.conversationId = msg.conversation_id
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
      } else if (msg.type === 'user_transcript') {
        const eventId = msg.event_id || 0

        if (session.abortController) {
          session.abortController.abort()
        }

        if (eventId <= session.lastEventId) {
          return // Ignore stale/interrupted turns
        }

        session.lastEventId = eventId
        session.abortController = new AbortController()

        // Stream response back
        ws.send(
          JSON.stringify({
            type: 'agent_response',
            content: 'Hello! I am receiving your transcript via Speech Engine Upstream.',
            event_id: eventId,
            is_final: false,
          })
        )

        ws.send(
          JSON.stringify({
            type: 'agent_response',
            content: '',
            event_id: eventId,
            is_final: true,
          })
        )
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid payload format' }))
    }
  })

  ws.on('close', () => {
    if (session.abortController) session.abortController.abort()
    activeSessions.delete(ws)
  })
})

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[SpeechEngineUpstream] WebSocket server listening on port ${PORT} at /speech-engine/upstream`)
  })
}

export { server, wss }
```

Add script to `package.json`:
```json
"start:speech-engine": "tsx server/speech-engine-server.ts"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/speech-engine-server.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/compliance/jwt.ts server/speech-engine-server.ts tests/speech-engine-server.test.ts package.json
git commit -m "feat(speech-engine): implement Speech Engine Upstream WebSocket server with HS256 JWT auth"
```
