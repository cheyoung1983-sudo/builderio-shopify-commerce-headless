import type { NextApiRequest, NextApiResponse } from 'next'
import type {
  OrderTrackingData,
  TrackingMilestone,
  TrackedItem,
  OrderLookupResult,
} from '../../../services/shopify-orders.ts'
import { lookupOrderByNumberAndEmail } from '../../../lib/shopify/order-lookup.ts'

export type { OrderTrackingData, TrackingMilestone, TrackedItem, OrderLookupResult }

/**
 * POST /api/orders/track  { orderId, email }
 *
 * Looks up a real Shopify order (Admin API) by order number + email.
 * 200 found | 400 invalid input | 404 not found | 503 Admin not configured |
 * 502 Shopify error. No demo or placeholder orders are ever returned.
 * (POST only so customer emails don't end up in URLs/logs.)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<OrderLookupResult>) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed. Please use POST.`,
    })
  }

  let body: any = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }

  const orderId = String(body?.orderId || '').trim()
  const email = String(body?.email || '').trim()

  if (!orderId) {
    return res.status(400).json({
      success: false,
      error: 'Please enter your Order ID or Order Number (e.g., #1042).',
    })
  }

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Please enter the email address used when placing the order.',
    })
  }

  try {
    const outcome = await lookupOrderByNumberAndEmail({ orderNumber: orderId, email })

    switch (outcome.status) {
      case 'found':
        return res.status(200).json({ success: true, order: outcome.order })
      case 'invalid':
        return res.status(400).json({ success: false, error: outcome.message })
      case 'not_found':
        return res.status(404).json({
          success: false,
          error: 'We could not find an order with that order number and email. Please check both and try again.',
        })
      case 'not_configured':
        return res.status(503).json({ success: false, error: outcome.message })
      default:
        return res.status(502).json({ success: false, error: outcome.message })
    }
  } catch (error: any) {
    console.error('[orders/track] Unexpected error:', error?.message || error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error while looking up order status.',
    })
  }
}
