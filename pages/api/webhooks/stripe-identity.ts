import type { NextApiRequest, NextApiResponse } from 'next'
import {
  claimKey,
  getReview,
  isReviewStoreAvailable,
  isSlackConfigured,
  isValidReviewId,
  postStripeOutcomeToSlack,
  releaseKey,
  saveReview,
  type StripeSessionStatus,
  type TribalReviewRecord,
} from '../../../lib/tribal/manual-review.ts'
import {
  isStripeIdentityEnabled,
  isTestModeOnly,
  isValidSessionId,
  sanitizeReasonCode,
  verifyStripeWebhook,
} from '../../../lib/tribal/stripe-identity.ts'

/**
 * Stripe Identity webhook: POST /api/webhooks/stripe-identity
 *
 * Production URL (one stable endpoint): https://www.displaycellpros.com/api/webhooks/stripe-identity
 *
 * - 404 unless STRIPE_IDENTITY_ENABLED === 'true'. Independent of TRIBAL_VERIFY_ENABLED.
 * - The Stripe-Signature header is verified with stripe.webhooks.constructEvent on the
 *   RAW body (STRIPE_IDENTITY_WEBHOOK_SECRET, 5 minute tolerance). Bad, missing,
 *   tampered or stale signatures -> 400 with no side effects.
 * - Idempotent by event ID (Redis SET NX). Handles verified / requires_input /
 *   processing / canceled. Out-of-order events never move a session backwards.
 * - Posts only: first name + last initial, tribe, pass / needs-review + reason code and
 *   a dashboard link to Slack. No images, no ID numbers. The Slack Approve/Deny click
 *   stays the only final step; this route NEVER tags or updates a Shopify customer.
 * - The return URL is never trusted; only this signed webhook changes state.
 */
export const config = { api: { bodyParser: false } }

const MAX_BODY_BYTES = 1024 * 1024
const EVENT_TTL_SECONDS = 60 * 60 * 24 * 7
const OUTCOME_TTL_SECONDS = 60 * 60 * 24 * 30

class BodyTooLargeError extends Error {}

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req as any) {
    const b = typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk)
    size += b.length
    if (size > MAX_BODY_BYTES) throw new BodyTooLargeError()
    chunks.push(b)
  }
  return Buffer.concat(chunks as any)
}

const RANK: Record<StripeSessionStatus, number> = { created: 0, processing: 1, requires_input: 2, verified: 3, canceled: 4 }

const HANDLED: Record<string, StripeSessionStatus> = {
  'identity.verification_session.verified': 'verified',
  'identity.verification_session.requires_input': 'requires_input',
  'identity.verification_session.processing': 'processing',
  'identity.verification_session.canceled': 'canceled',
}

/** True when `next` may replace `current` (monotonic; canceled is terminal; requires_input can repeat after a retry). */
function canAdvance(current: StripeSessionStatus | undefined, next: StripeSessionStatus): boolean {
  const cur = current ?? 'created'
  if (cur === 'canceled' || cur === 'verified') return false
  return RANK[next] >= RANK[cur]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isStripeIdentityEnabled()) return res.status(404).json({ error: 'Not found' })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const secret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET
  if (!secret) {
    console.error('Stripe Identity webhook: STRIPE_IDENTITY_WEBHOOK_SECRET is not configured')
    return res.status(500).json({ error: 'Webhook not configured' })
  }

  let rawBody: Buffer
  try {
    rawBody = await readRawBody(req)
  } catch (err) {
    if (err instanceof BodyTooLargeError) return res.status(413).json({ error: 'Payload too large' })
    return res.status(400).json({ error: 'Bad request' })
  }

  let event: ReturnType<typeof verifyStripeWebhook>
  try {
    const sig = req.headers['stripe-signature']
    event = verifyStripeWebhook(rawBody as any, Array.isArray(sig) ? sig[0] : sig, secret)
  } catch {
    // No details: never echo what failed or any payload content.
    return res.status(400).json({ error: 'Invalid signature' })
  }

  const target = HANDLED[event.type]
  if (!target) return res.status(200).json({ received: true, ignored: true })

  // Live-mode events are refused while the test-mode-only guard is on.
  if (event.livemode && isTestModeOnly()) {
    console.error(`Stripe Identity webhook: refusing live-mode event ${event.id} (TRIBAL_STRIPE_TEST_MODE_ONLY is on)`)
    return res.status(400).json({ error: 'Live-mode events are not accepted' })
  }

  if (!isReviewStoreAvailable()) {
    console.error('Stripe Identity webhook: Redis not configured in production')
    return res.status(503).json({ error: 'Review store unavailable' })
  }

  const session: any = (event.data as any)?.object
  const sessionId = session?.id
  const requestId = session?.metadata?.request_id
  if (!isValidSessionId(sessionId) || !isValidReviewId(requestId)) {
    return res.status(200).json({ received: true, ignored: true })
  }

  const eventKey = `tribal:stripe-event:${event.id}`
  let eventClaimed = false
  const outcomeKeys: string[] = []
  try {
    const record = await getReview(requestId)
    // The session must be the one we created for this request (blocks forged/mismatched mappings).
    if (!record || record.source !== 'stripe_identity' || record.stripeSessionId !== sessionId) {
      return res.status(200).json({ received: true, ignored: true })
    }

    eventClaimed = await claimKey(eventKey, '1', EVENT_TTL_SECONDS)
    if (!eventClaimed) return res.status(200).json({ received: true, duplicate: true })

    if (record.status !== 'pending' || !canAdvance(record.stripeStatus, target)) {
      return res.status(200).json({ received: true, ignored: true })
    }

    const livemode = Boolean(event.livemode)
    let updated: TribalReviewRecord = { ...record, stripeStatus: target, stripeLivemode: livemode }

    if (target === 'verified' || target === 'requires_input') {
      // One Slack post per outcome per review, even under concurrent deliveries.
      const outcomeKey = `tribal:stripe-outcome:${record.id}:${target}`
      if (!(await claimKey(outcomeKey, event.id, OUTCOME_TTL_SECONDS))) {
        return res.status(200).json({ received: true, duplicate: true })
      }
      outcomeKeys.push(outcomeKey)
      if (!isSlackConfigured()) throw new Error('Slack is not configured')
      if (target === 'requires_input') updated = { ...updated, stripeReasonCode: sanitizeReasonCode(session?.last_error?.code) }
      const posted = await postStripeOutcomeToSlack(
        updated,
        target === 'verified'
          ? { kind: 'passed', sessionId, livemode }
          : { kind: 'manual_review', sessionId, livemode, reasonCode: updated.stripeReasonCode || 'unspecified' }
      )
      if (!posted) throw new Error('Slack post failed')
    }

    await saveReview(updated)
    return res.status(200).json({ received: true })
  } catch (err: any) {
    // Release claims so Stripe's retry can process the event; log name/message only, never the payload.
    if (eventClaimed) await releaseKey(eventKey).catch(() => undefined)
    for (const k of outcomeKeys) await releaseKey(k).catch(() => undefined)
    console.error(`Stripe Identity webhook: processing failed for event ${event.id}:`, err?.message || 'error')
    return res.status(500).json({ error: 'Processing failed' })
  }
}
