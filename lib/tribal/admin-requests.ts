import type { NextApiRequest, NextApiResponse } from 'next'
import { unifiedAdminSessionResolver, getAdminEmailFromRequest, type AdminSessionResolver } from './admin-auth.ts'
import { displayName, isReviewStoreAvailable, listReviews } from './manual-review.ts'

/**
 * Lists tribal review records for the admin dashboard. Reads the same review
 * store the Slack flow decides on. Returns an empty list when there are none:
 * there are NO seeded / demo records. Only minimal fields are returned.
 */
export async function handleAdminRequests(
  req: NextApiRequest,
  res: NextApiResponse,
  deps: { resolveSession?: AdminSessionResolver } = {}
) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  const adminEmail = await getAdminEmailFromRequest(req, deps.resolveSession || unifiedAdminSessionResolver)
  if (!adminEmail) {
    return res.status(403).json({ success: false, error: 'Access denied: sign in with an authorized administrator account.' })
  }

  if (!isReviewStoreAvailable()) {
    return res.status(503).json({ success: false, error: 'Review store unavailable.' })
  }

  try {
    const records = await listReviews()
    const requests = records.map((r) => ({
      id: r.id,
      status: r.status,
      customerName: displayName(r),
      tribalNation: r.tribalNation,
      provider: r.source,
      createdAt: r.createdAt,
      hasShopifyCustomer: Boolean(r.customerId),
      maskedEnrollmentId: r.status === 'pending' ? r.maskedEnrollmentId || null : null,
      decidedBy: r.decidedBy || null,
      decidedAt: r.decidedAt || null,
      shopifySynced: r.shopifySynced ?? null,
    }))
    return res.status(200).json({ success: true, adminEmail, totalCount: requests.length, requests })
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to load verification requests.' })
  }
}
