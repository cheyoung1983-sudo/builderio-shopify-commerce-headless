# Specification: ElevenLabs Speech Engine Upstream Server & Compliance Suite

**Date:** 2025-03-29  
**Status:** Approved  
**Scope:** Standalone Node/TypeScript Speech Engine Upstream WebSocket Server, TCPA DNC/Time-Zone Guards, HIPAA Zero Retention Mode Validation, and User Disclosure UI/Voice Helpers.

---

## 1. Overview & Architecture

This specification details the architecture and implementation requirements for:
1. **Speech Engine Upstream Server:** A dedicated WebSocket server listening at `/speech-engine/upstream` to accept incoming WebSocket connections from ElevenLabs.
2. **TCPA Compliance & DNC Registry:** Internal Do-Not-Call storage, time-zone calling window checks, and an ElevenLabs tool callback (`opt_out_and_end_call`).
3. **HIPAA & Zero Retention Mode (ZRM):** BAA-compliant LLM allowlist validation and PII/PHI log redaction safeguards.
4. **End-User Disclosure Suite:** A Next.js React UI disclosure banner component and verbal disclosure text generators.

```
                    +-----------------------------+
                    |      ElevenLabs Platform    |
                    +--------------+--------------+
                                   |
                      WebSocket (Upstream)
             `X-Elevenlabs-Speech-Engine-Authorization`
                                   |
                                   v
             +-----------------------------------------------+
             | Node.js Speech Engine Upstream Server         |
             | (server/speech-engine-server.ts)              |
             | - JWT verification (HS256 via SHA256 API Key) |
             | - Event flow (init, user_transcript, ping)    |
             | - Interruption handling via event_id          |
             +---------------------+-------------------------+
                                   |
                                   v
             +-----------------------------------------------+
             | Compliance & Helper Suite                     |
             | - TCPA / DNC Store (lib/compliance/tcpa.ts)   |
             | - HIPAA / ZRM Guard (lib/compliance/hipaa.ts) |
             | - Disclosures (components/compliance/)        |
             +-----------------------------------------------+
```

---

## 2. Speech Engine Upstream WebSocket Server (`server/speech-engine-server.ts`)

### 2.1 Connection Setup & Security
* **Listen Address / Port:** Port `3001` (configurable via `process.env.SPEECH_ENGINE_PORT`) on path `/speech-engine/upstream`.
* **Authentication:**
  * Extracts header `X-Elevenlabs-Speech-Engine-Authorization`.
  * Computes HMAC secret: `crypto.createHash('sha256').update(process.env.ELEVENLABS_API_KEY || '').digest()`.
  * Verifies JWT using algorithm **HS256**.
  * Validates:
    * `iss === "https://api.elevenlabs.io/convai/speech-engine"`
    * `sub === "convai_speech_engine_upstream"`
    * `exp` with a 60-second clock skew leeway.
  * Rejects invalid upgrades with HTTP `401 Unauthorized`.

### 2.2 Protocol Message Handling
* **`init` (`InitPayload`):**
  * Registers new session with `conversation_id`.
* **`user_transcript` (`UserTranscriptPayload`):**
  * Receives `event_id` and `user_transcript` chronological array.
  * Checks active `event_id` for session:
    * If previous LLM task is running, calls `AbortController.abort()`.
    * Ensures `event_id` is higher than previously processed event.
  * Calls response pipeline (LLM / Mock LLM response generator).
  * Streams text back to ElevenLabs:
    * Text chunks: `{ type: 'agent_response', content: '...', event_id, is_final: false }`
    * Final payload: `{ type: 'agent_response', content: '', event_id, is_final: true }`
* **`ping` (`PingPayload`):**
  * Replies with `{ type: 'pong' }`.
* **`close` / `error`:**
  * Cleans up session state and closes socket cleanly.

---

## 3. TCPA Compliance & DNC Registry (`lib/compliance/tcpa.ts`)

### 3.1 Do-Not-Call (DNC) Store
* In-memory + persistent file storage (`data/dnc-registry.json`) for opt-out phone numbers.
* Functions:
  * `addNumberToDnc(phone: string, reason?: string): void`
  * `isNumberOnDnc(phone: string): boolean`
  * `getDncRecords(): DncRecord[]`

### 3.2 Time-Zone Window Validation
* `checkCallingTimeWindow(recipientPhone: string): { allowed: boolean; reason?: string }`
* Resolves US state/time-zone from phone number prefix.
* Restricts automated calls to recipient local time between **8:00 AM and 9:00 PM**.

### 3.3 ElevenLabs Tool Handler
* Exported tool: `opt_out_and_end_call`
* When triggered by user verbal request ("stop calling me", "remove my number"):
  1. Adds caller's number to internal DNC registry.
  2. Instructs agent to acknowledge removal and end call.

---

## 4. HIPAA & Zero Retention Mode (ZRM) (`lib/compliance/hipaa.ts`)

### 4.1 ZRM Configuration Guard
* Checks if `ELEVENLABS_ZERO_RETENTION_MODE === 'true'`.
* Validates selected LLM against BAA allowlist:
  * Google: Gemini 2.5 / 2.0 / 1.5 Flash & Pro
  * Anthropic: Claude 3.7 / 3.5 Sonnet, Claude 3 Haiku
  * OpenAI: GPT-4o, GPT-4.1, GPT-4 Turbo
  * Hosted: Qwen3.5, GLM-5.2
  * Custom LLM (BYO API key)
* Rejects disallowed LLMs when ZRM is enabled.

### 4.2 Log & Telemetry Redaction
* `redactSensitivePayload<T>(payload: T): T`
* Sanitizes phone numbers, names, email addresses, and transcript text before writing to server logs or external telemetry when ZRM/HIPAA mode is enabled.

---

## 5. Pre-Interaction Disclosure Suite

### 5.1 React UI Banner (`components/compliance/AiDisclosureBanner.tsx`)
* Next.js Client Component.
* Displays banner/modal informing users:
  1. They are interacting with an AI system.
  2. Audio/transcripts are processed and recorded for quality assurance.
* Requires explicit "I Agree" button click to unlock AI interaction features.
* Persists agreement in `localStorage` (`dcp_ai_consent_accepted`).

### 5.2 Verbal Disclosure Generator (`lib/compliance/disclosures.ts`)
* `getVerbalDisclosure(companyName?: string): string`
* Returns standard opening statement:
  *"Hi, I am an AI assistant for Display Cell Pros. This call is being recorded and processed by service providers for quality assurance. How can I help you today?"*

---

## 6. Testing & Verification

* Unit tests in `tests/compliance.test.ts`:
  1. Test JWT creation and verification with valid/invalid keys and clock skew.
  2. Test DNC registry addition and retrieval.
  3. Test calling time-zone logic for various US area codes.
  4. Test ZRM LLM allowlist validation and redaction helper.
