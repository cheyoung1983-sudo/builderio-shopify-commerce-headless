import type { NextApiRequest, NextApiResponse } from 'next'
import { updateShopifyCustomerTribalStatus } from '../../../lib/tribal/shopify-admin.ts'
import { isTribalTaxExemptEnabled } from '../../../lib/tribal/tax-flags.ts'
import {
  acquireDecisionLock,
  authorizeSlackAction,
  getReview,
  isReviewStoreAvailable,
  isValidReviewId,
  reviewSummaryText,
  isTribalVerifyEnabled,
  maskEnrollmentId,
  saveReview,
  verifySlackSignature,
} from '../../../lib/tribal/manual-review.ts'

/**
 * Slack interactivity endpoint for tribal manual review (Approve / Deny).
 * Request URL in the Slack app: https://<domain>/api/slack/tribal-interaction
 * Gated by TRIBAL_VERIFY_ENABLED; authenticated with SLACK_SIGNING_SECRET and
 * authorized via SLACK_TRIBAL_APPROVER_IDS (+ SLACK_TEAM_ID, SLACK_TRIBAL_CHANNEL_ID,
 * SLACK_APP_ID when set). Decisions are made once, via an atomic SET NX lock.
 */
export const config = { api: { bodyParser: false } }

async function readRawBody(req: NextApiRequest): Promise<string> {
  let raw = ''
  for await (const chunk of req as any) raw += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8')
  return raw
}

async function replyToSlack(responseUrl: string | undefined, text: string, ephemeral = false) {
  if (!responseUrl || !responseUrl.startsWith('https://hooks.slack.com/')) return
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ephemeral ? { response_type: 'ephemeral', replace_original: false, text } : { replace_original: true, text }),
  }).catch(() => undefined)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }
  if (!isTribalVerifyEnabled()) return res.status(404).json({ error: 'Not found' })

  const rawBody = await readRawBody(req)
  const valid = verifySlackSignature({
    rawBody,
    timestamp: req.headers['x-slack-request-timestamp'] as string | undefined,
    signature: req.headers['x-slack-signature'] as string | undefined,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
  })
  if (!valid) return res.status(401).json({ error: 'Invalid signature' })

  let payload: any
  try {
    payload = JSON.parse(new URLSearchParams(rawBody).get('payload') || '')
  } catch {
    return res.status(400).json({ error: 'Bad payload' })
  }

  const action = payload?.actions?.[0]
  const actionId = action?.action_id
  if (actionId !== 'tribal_approve' && actionId !== 'tribal_deny') return res.status(200).end()

  const authz = authorizeSlackAction(payload)
  if (!authz.ok) {
    console.warn(`Tribal review: rejected Slack action (${authz.reason}) from ${String(payload?.user?.id || 'unknown')}`)
    await replyToSlack(payload?.response_url, 'You are not authorized to approve or deny tribal verification requests.', true)
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (!isReviewStoreAvailable()) {
    console.error('Tribal review: Redis not configured in production; refusing to process decision')
    return res.status(503).json({ error: 'Review store unavailable' })
  }

  const reviewId = String(action.value || '')
  if (!isValidReviewId(reviewId)) return res.status(400).json({ error: 'Bad review id' })

  const record = await getReview(reviewId)
  const who = String(payload?.user?.username || payload?.user?.name || payload?.user?.id || 'unknown').slice(0, 80).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (!record) {
    await replyToSlack(payload.response_url, 'Review request not found or expired.')
    return res.status(200).end()
  }
  if (record.status !== 'pending' || !(await acquireDecisionLock(record.id))) {
    const latest = (await getReview(record.id)) || record
    const state = latest.status === 'pending' ? 'being decided' : latest.status
    await replyToSlack(payload.response_url, `Already ${state}${latest.decidedBy ? ` by ${latest.decidedBy}` : ''}.`)
    return res.status(200).end()
  }

  const decidedAt = new Date().toISOString()
  const name = reviewSummaryText(record)

  if (actionId === 'tribal_deny') {
    await saveReview({ ...record, status: 'denied', decidedBy: who, decidedAt })
    await replyToSlack(payload.response_url, `Denied by ${who}: ${name}.`)
    return res.status(200).end()
  }

  let shopifySynced = false
  let note = 'Guest request: tag the Shopify customer manually.'
  if (record.customerId) {
    const result = await updateShopifyCustomerTribalStatus({
      customerId: record.customerId,
      tagsToAdd: ['tribal-member-verified'],
      // Tag only. Tax exemption is set only when TRIBAL_TAX_EXEMPT_ENABLED is on.
      taxExempt: isTribalTaxExemptEnabled(),
      audit: {
        verificationHash: record.id,
        verifiedAt: decidedAt,
        tribalNation: record.tribalNation,
        maskedEnrollmentId: maskEnrollmentId(record.tribalEnrollmentId),
      },
    })
    shopifySynced = Boolean(result?.success)
    note = shopifySynced ? 'Shopify customer tagged tribal-member-verified.' : 'Shopify update FAILED: tag the customer manually.'
  }
  await saveReview({ ...record, status: 'approved', decidedBy: who, decidedAt, shopifySynced })
  await replyToSlack(payload.response_url, `Approved by ${who}: ${name}. ${note}`)
  return res.status(200).end()
}
