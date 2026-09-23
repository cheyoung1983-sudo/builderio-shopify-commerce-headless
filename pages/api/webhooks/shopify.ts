import type { NextApiRequest, NextApiResponse } from 'next'
import {
  verifyShopifyWebhookHmac,
  reconcileOrderTaxAndDiscounts,
} from '../../../lib/tribal/order-reconciler.ts'
import type { ShopifyOrderWebhookPayload } from '../../../lib/tribal/order-reconciler.ts'

/**
 * Next.js API Route: /api/webhooks/shopify
 * 
 * Listens for and processes Shopify order webhook updates:
 * - orders/create
 * - orders/updated
 * - orders/paid
 * - orders/cancelled
 * - orders/fulfilled
 * 
 * Reconciles customer tribal status, reservation boundary address changes,
 * tax exemption eligibility (Avalara AvaTax Entity Use Code C), and 20% member discounts.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Enforce POST Method
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST for Shopify webhooks.',
    })
  }

  // 2. Extract Webhook Headers
  const topic = (req.headers['x-shopify-topic'] as string) || 'orders/updated'
  const hmacHeader = (req.headers['x-shopify-hmac-sha256'] as string) || ''
  const shopDomain = (req.headers['x-shopify-shop-domain'] as string) || ''
  const webhookId = (req.headers['x-shopify-webhook-id'] as string) || ''

  // 3. HMAC Verification
  // In Next.js, req.body is parsed by default unless disabled.
  // We serialize or take the body buffer for verification.
  const rawBody =
    typeof req.body === 'string'
      ? req.body
      : Buffer.isBuffer(req.body)
      ? req.body
      : JSON.stringify(req.body)

  const isHmacValid = verifyShopifyWebhookHmac(rawBody, hmacHeader)
  if (!isHmacValid && hmacHeader) {
    console.warn(`[Shopify Webhook] Invalid HMAC signature received for topic ${topic} from ${shopDomain}`)
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid Shopify webhook HMAC signature.',
    })
  }

  try {
    const orderPayload: ShopifyOrderWebhookPayload =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}

    if (!orderPayload.id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order webhook payload: missing order ID.',
      })
    }

    // 4. Reconcile Order Tax & Discounts in Real-Time
    const reconciliation = await reconcileOrderTaxAndDiscounts(orderPayload, topic)

    // 5. Respond with 200 OK immediately for Shopify SLA compliance
    return res.status(200).json({
      success: true,
      received: true,
      topic,
      webhookId,
      shopDomain,
      orderId: orderPayload.id,
      orderName: orderPayload.name,
      reconciliation,
    })
  } catch (error: any) {
    console.error('[Shopify Webhook] Reconciliation processing error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal error processing Shopify order webhook.',
      details: error?.message || String(error),
    })
  }
}
