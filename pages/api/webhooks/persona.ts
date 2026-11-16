import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyPersonaSignature } from '../../../lib/webhooks/persona-signature.ts'
import { readRawBody } from '../../../lib/api/read-raw-body.ts'
import {
  claimKey,
  releaseKey,
  isReviewStoreAvailable,
  isSlackConfigured,
  isTribalVerifyEnabled,
  newReviewRecord,
  postReviewToSlack,
  saveReview,
} from '../../../lib/tribal/manual-review.ts'
import { normalizeCustomerGid } from '../../../lib/tribal/tag-gate.ts'

/**
 * Persona webhook.
 *
 * A Persona result is NEVER an approval. A completed/approved inquiry only
 * records a PENDING tribal review request (no Shopify tag, no tax exemption,
 * no enrollment number or hash stored) and posts it to the existing Slack
 * Approve/Deny flow. A human reviewer decides in Slack or the admin dashboard,
 * and the tag is added only through the TRIBAL_SHOPIFY_TAG_MODE gate.
 *
 * Stage 1 skips Persona: unless PERSONA_ENABLED is exactly 'true' the webhook
 * returns 410 and does nothing (no body read, nothing stored, nothing posted).
 * Even when enabled, nothing is stored unless TRIBAL_VERIFY_ENABLED is 'true'
 * (the review flow's master switch). Repeat deliveries of the same inquiry
 * create one record.
 */
export const config = { api: { bodyParser: false } }

const PENDING_EVENTS = new Set(['inquiry.completed', 'inquiry.approved', 'verification.passed'])
const PERSONA_CLAIM_PREFIX = 'tribal:persona-inquiry:'
const SAFE_ID_RE = /^[A-Za-z0-9_-]{1,100}$/

export function isPersonaEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (env.PERSONA_ENABLED || '').trim().toLowerCase() === 'true'
}

function str(v: unknown, max = 120): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isPersonaEnabled()) {
    return res.status(410).json({ success: false, error: 'Persona verification is disabled.' })
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const rawBody = await readRawBody(req)

  // Constant-time HMAC check over `${t}.${rawBody}` with a 300s replay window. A missing or
  // non-numeric `t` is rejected (previously NaN slipped past the tolerance check).
  const check = verifyPersonaSignature({
    secret: process.env.PERSONA_WEBHOOK_SECRET,
    header: req.headers['persona-signature'],
    rawBody,
  })
  if (!check.ok) {
    const status = check.reason === 'missing_secret' ? 503 : 401
    return res.status(status).json({ success: false, error: 'Invalid or missing webhook signature' })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON payload' })
  }

  try {
    const eventType = str(payload?.event || payload?.type, 80)
    const inquiryData = payload?.data || payload?.payload?.inquiry || {}
    const inquiryId = str(inquiryData.id, 100)
    const attributes = inquiryData.attributes || {}
    const fields = attributes.fields || {}
    const isResult = PENDING_EVENTS.has(eventType) || attributes.status === 'approved' || attributes.status === 'completed'

    if (!isResult) return res.status(200).json({ success: true, processed: false })

    if (!isTribalVerifyEnabled()) {
      // Review flow is off: acknowledge, store nothing, tag nothing.
      return res.status(200).json({ success: true, processed: false, reason: 'review_disabled' })
    }
    if (!isReviewStoreAvailable()) {
      return res.status(503).json({ success: false, error: 'Review store unavailable' })
    }
    if (!SAFE_ID_RE.test(inquiryId)) {
      return res.status(400).json({ success: false, error: 'Missing inquiry id' })
    }

    // One pending record per Persona inquiry, however often Persona redelivers.
    if (!(await claimKey(PERSONA_CLAIM_PREFIX + inquiryId))) {
      return res.status(200).json({ success: true, processed: true, duplicate: true })
    }

    const referenceId = str(attributes['reference-id'] || attributes.reference_id, 100)
    const tribalNation =
      str(fields['tribal-nation']?.value) || str(fields['tribal-affiliation']?.value) || str(fields.tribalNation) || 'Not provided'

    // Deliberately NOT read: enrollment / ID numbers. Nothing about the ID is stored.
    const record = {
      ...newReviewRecord(
        {
          firstName: str(fields['name-first']?.value) || 'Persona',
          lastName: str(fields['name-last']?.value) || 'Applicant',
          tribalNation,
          customerId: normalizeCustomerGid(referenceId),
          source: 'persona',
        },
        { version: 'persona-inquiry' }
      ),
      personaInquiryId: inquiryId,
    }
    try {
      await saveReview(record)
    } catch (err) {
      await releaseKey(PERSONA_CLAIM_PREFIX + inquiryId).catch(() => undefined)
      throw err
    }

    let notified = false
    if (isSlackConfigured()) {
      notified = await postReviewToSlack(record).catch(() => false)
    }

    return res.status(202).json({ success: true, processed: true, status: 'pending_review', reviewId: record.id, notified })
  } catch (err: any) {
    console.error('[Persona Webhook] Processing error:', err?.name || 'Error')
    return res.status(500).json({ success: false, error: 'Webhook processing failed' })
  }
}
