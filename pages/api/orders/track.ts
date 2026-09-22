import type { NextApiRequest, NextApiResponse } from 'next'
import {
  retrieveOrderStatus,
  OrderTrackingData,
  TrackingMilestone,
  TrackedItem,
  OrderLookupResult,
} from '@services/shopify-orders'

export type { OrderTrackingData, TrackingMilestone, TrackedItem, OrderLookupResult }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderLookupResult>
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['POST', 'GET'])
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed. Please use POST or GET.`,
    })
  }

  const rawOrderId = (req.method === 'POST' ? req.body?.orderId : req.query?.orderId) as
    | string
    | undefined
  const rawEmail = (req.method === 'POST' ? req.body?.email : req.query?.email) as
    | string
    | undefined

  const orderId = String(rawOrderId || '').trim()
  const email = String(rawEmail || '').trim()

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
    const result = await retrieveOrderStatus({
      orderId,
      email,
    })

    if (!result.success) {
      return res.status(400).json(result)
    }

    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error while looking up order tracking status.',
    })
  }
}
