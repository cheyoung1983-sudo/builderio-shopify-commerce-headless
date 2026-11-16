import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../lib/firebase'
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { readRawBody } from '../../../lib/api/read-raw-body'
import {
  verifyPersonaSignature,
  verifyBearerToken,
  deriveIdempotencyKey,
} from '../../../lib/webhooks/persona-signature'

/**
 * Auth0 & Persona Profile Synchronization Webhook
 * Endpoint: POST /api/webhooks/auth0-persona
 *
 * Authentication (fails closed; 503 when no secret is configured):
 *   - `Persona-Signature: t=<unix>,v1=<hex>` HMAC-SHA256 over `${t}.${rawBody}` with
 *     PERSONA_WEBHOOK_SECRET (300s replay window, constant-time compare), or
 *   - `Authorization: Bearer <AUTH0_WEBHOOK_SECRET>` for Auth0 Actions (constant-time compare).
 *
 * Idempotency: `x-event-id` / body `eventId` (or a SHA-256 of the raw body) is recorded in
 * Firestore `webhook_events`; redeliveries return 200 `{ duplicate: true }` without re-writing.
 */
export const config = { api: { bodyParser: false } }

const MAX_BODY_BYTES = 64 * 1024
const USER_ID_PATTERN = /^[A-Za-z0-9|_.@:-]{1,128}$/
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,255}$/

// Per-instance fallback when Firestore is not configured (dev / tests).
const recentEvents = new Map<string, number>()
const RECENT_EVENT_TTL_MS = 24 * 60 * 60 * 1000

function rememberLocally(key: string): boolean {
  const now = Date.now()
  for (const [k, ts] of recentEvents) if (now - ts > RECENT_EVENT_TTL_MS) recentEvents.delete(k)
  if (recentEvents.has(key)) return false
  recentEvents.set(key, now)
  return true
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  const personaSecret = process.env.PERSONA_WEBHOOK_SECRET
  const auth0Secret = process.env.AUTH0_WEBHOOK_SECRET
  if (!personaSecret && !auth0Secret) {
    console.error('[auth0-persona webhook] No webhook secret configured; rejecting request.')
    return res.status(503).json({ success: false, error: 'Webhook not configured.' })
  }

  let rawBody: Buffer
  try {
    rawBody = await readRawBody(req)
  } catch {
    return res.status(400).json({ success: false, error: 'Unable to read request body.' })
  }
  if (rawBody.length > MAX_BODY_BYTES) {
    return res.status(413).json({ success: false, error: 'Payload too large.' })
  }

  const signatureHeader = req.headers['persona-signature']
  const authenticated = signatureHeader
    ? verifyPersonaSignature({ secret: personaSecret, header: signatureHeader, rawBody }).ok
    : verifyBearerToken(req.headers.authorization, auth0Secret)
  if (!authenticated) {
    return res.status(401).json({ success: false, error: 'Unauthorized: invalid webhook signature.' })
  }

  let body: any
  try {
    body = JSON.parse(rawBody.toString('utf8') || '{}')
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON payload.' })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ success: false, error: 'Invalid JSON payload.' })
  }

  const { userId, email, emailVerified, phoneNumber, name, metadata, personaInquiryId, status } = body
  if (typeof userId !== 'string' || !USER_ID_PATTERN.test(userId) || typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ success: false, error: 'Missing or invalid required fields: userId and email.' })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const syncTimestamp = new Date().toISOString()
  const idempotencyKey = deriveIdempotencyKey(req.headers['x-event-id'] ?? body.eventId, rawBody)

  try {
    if (db) {
      const eventRef = doc(db, 'webhook_events', `auth0-persona_${idempotencyKey}`)
      const existing = await getDoc(eventRef)
      if (existing.exists()) {
        return res.status(200).json({ success: true, duplicate: true })
      }

      await setDoc(
        doc(db, 'auth0_users', userId),
        {
          userId,
          email: normalizedEmail,
          emailVerified: emailVerified === true,
          phoneNumber: typeof phoneNumber === 'string' ? phoneNumber.slice(0, 32) : null,
          name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 200) : 'Valued Customer',
          metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {},
          personaInquiryId: typeof personaInquiryId === 'string' ? personaInquiryId.slice(0, 128) : null,
          verificationStatus: typeof status === 'string' ? status.slice(0, 64) : 'synchronized',
          lastSyncedAt: serverTimestamp(),
        },
        { merge: true }
      )

      await addDoc(collection(db, 'audit_logs'), {
        eventType: 'AUTH0_PERSONA_PROFILE_SYNC',
        userId,
        email: normalizedEmail,
        emailVerified: emailVerified === true,
        personaInquiryId: typeof personaInquiryId === 'string' ? personaInquiryId.slice(0, 128) : null,
        idempotencyKey,
        timestamp: syncTimestamp,
        createdAt: serverTimestamp(),
      })

      // Recorded last so a failed write above is retried on redelivery instead of being skipped.
      await setDoc(eventRef, { source: 'auth0-persona', userId, processedAt: serverTimestamp() })
    } else if (!rememberLocally(idempotencyKey)) {
      return res.status(200).json({ success: true, duplicate: true })
    }

    return res.status(200).json({
      success: true,
      userId,
      emailVerified: emailVerified === true,
      timestamp: syncTimestamp,
    })
  } catch (err: any) {
    console.error('[auth0-persona webhook] Sync failed:', err?.message)
    return res.status(500).json({ success: false, error: 'Failed to process Auth0-Persona profile synchronization.' })
  }
}
