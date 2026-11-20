import type { NextApiRequest, NextApiResponse } from 'next'
import { unifiedAdminSessionResolver, getAdminEmailFromRequest, type AdminSessionResolver } from './admin-auth.ts'
import {
  acquireDecisionLock,
  getReview,
  isReviewStoreAvailable,
  isValidReviewId,
  saveReview,
  writeDecisionAudit,
  type TribalReviewRecord,
} from './manual-review.ts'
import { getTribalShopifyTagMode, tagTribalCustomerIfAllowed } from './tag-gate.ts'
import { redactAfterDecision } from './stripe-identity.ts'

/**
 * Admin dashboard Approve / Deny for tribal verification.
 *
 * - The reviewer identity comes ONLY from the authenticated server-side session
 *   (never from a header, cookie or query parameter).
 * - A decision is only allowed for an existing PENDING review record; the
 *   Shopify customer comes from that record, never from the request body.
 * - Decisions are one-time: an atomic lock plus the pending-status check reject
 *   any second decision (409).
 * - Approval tags only through the TRIBAL_SHOPIFY_TAG_MODE gate (default off)
 *   and never sets tax exemption.
 * - Every decision writes an audit entry (record id, decision, reviewer, time).
 */
export async function handleAdminDecision(
  req: NextApiRequest,
  res: NextApiResponse,
  deps: { resolveSession?: AdminSessionResolver } = {}
) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  const reviewer = await getAdminEmailFromRequest(req, deps.resolveSession || unifiedAdminSessionResolver)
  if (!reviewer) {
    return res.status(403).json({ success: false, error: 'Access denied: sign in with an authorized administrator account.' })
  }

  const body = req.body || {}
  const requestId = body.requestId ?? body.reviewId
  const action = body.action
  if (!isValidReviewId(requestId) || (action !== 'approve' && action !== 'deny')) {
    return res.status(400).json({ success: false, error: 'requestId (a pending review id) and action ("approve" | "deny") are required.' })
  }

  if (!isReviewStoreAvailable()) {
    return res.status(503).json({ success: false, error: 'Review store unavailable.' })
  }

  const record = await getReview(requestId)
  if (!record) {
    return res.status(404).json({ success: false, error: 'No pending verification record with that id.' })
  }
  if (record.status !== 'pending' || !(await acquireDecisionLock(record.id))) {
    const latest = (await getReview(record.id)) || record
    return res.status(409).json({
      success: false,
      error: latest.status === 'pending' ? 'This request is already being decided.' : `This request was already ${latest.status}.`,
      status: latest.status,
    })
  }

  const decidedAt = new Date().toISOString()
  const isApproval = action === 'approve'
  let shopifySynced = false
  let shopifyTagged = false
  let note = ''

  if (isApproval) {
    if (record.customerId) {
      const tag = await tagTribalCustomerIfAllowed({
        customerId: record.customerId,
        reviewer,
        decidedAt,
        recordId: record.id,
        tribalNation: record.tribalNation,
        maskedEnrollmentId: record.maskedEnrollmentId || 'n/a',
        taxExempt: false,
      })
      shopifyTagged = tag.tagged
      shopifySynced = tag.tagged && tag.success
      note = !tag.tagged ? tag.note : shopifySynced ? 'Shopify customer tagged tribal-member-verified.' : 'Shopify update failed: tag the customer manually.'
    } else {
      note = 'Guest request: no Shopify customer on the record, nothing tagged.'
    }
  }

  let decided: TribalReviewRecord = {
    ...record,
    status: isApproval ? 'approved' : 'denied',
    decidedBy: reviewer,
    decidedAt,
    ...(isApproval ? { shopifySynced } : {}),
  }
  await saveReview(decided)

  if (decided.stripeSessionId) {
    const outcome = await redactAfterDecision(decided).catch(() => ({ status: 'failed' }) as const)
    const redaction = outcome.status === 'requested' ? 'requested' : outcome.status === 'failed' ? 'failed' : 'skipped'
    decided = { ...decided, redaction }
    await saveReview(decided)
  }

  await writeDecisionAudit({
    recordId: record.id,
    decision: decided.status as 'approved' | 'denied',
    reviewer,
    decidedAt,
    channel: 'admin_dashboard',
    source: record.source,
    shopifyTagged: shopifySynced,
    tagMode: getTribalShopifyTagMode(),
  })

  return res.status(200).json({
    success: true,
    requestId: record.id,
    status: decided.status,
    decidedBy: reviewer,
    decidedAt,
    shopifyTagged,
    shopifySynced,
    message: `Request ${record.id} ${isApproval ? 'approved' : 'denied'} by ${reviewer}.${note ? ' ' + note : ''}`,
  })
}
