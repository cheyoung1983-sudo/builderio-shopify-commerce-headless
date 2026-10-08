import type { NextApiRequest, NextApiResponse } from 'next'
import { reconcileOrderTaxAndDiscounts } from '../../../lib/tribal/order-reconciler.ts'
import type { ShopifyOrderWebhookPayload } from '../../../lib/tribal/order-reconciler.ts'
import {
  getShopifyWebhookSecret,
  readRawRequestBody,
  verifyShopifyHmac,
} from '../../../lib/shopify/webhook-hmac.ts'

/**
 * Next.js API Route: /api/webhooks/shopify
 *
 * Processes Shopify order webhooks (orders/create, orders/updated, orders/paid,
 * orders/cancelled, orders/fulfilled) and reconciles tribal tax/discount tags.
 *
 * Every request must carry a valid X-Shopify-Hmac-Sha256 signature computed
 * over the raw body with SHOPIFY_WEBHOOK_SECRET (falls back to
 * SHOPIFY_CLIENT_SECRET). Missing or invalid signatures get 401. The body
 * parser is disabled so the exact bytes Shopify signed are verified.
 */
export const config = {
  api: {
    bodyParser: false,
  },
}

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

  // 3. Read the raw body and verify the HMAC before doing anything else.
  let rawBody: Buffer | null
  try {
    rawBody = await readRawRequestBody(req)
  } catch {
    return res.status(413).json({ success: false, error: 'Webhook payload too large.' })
  }

  const secret = getShopifyWebhookSecret()
  if (!secret) {
    console.error('[Shopify Webhook] No webhook secret configured (SHOPIFY_WEBHOOK_SECRET / SHOPIFY_CLIENT_SECRET); rejecting request.')
  }

  if (!rawBody || !verifyShopifyHmac(rawBody, hmacHeader, secret)) {
    console.warn(
      `[Shopify Webhook] Rejected request for topic ${topic}${shopDomain ? ` from ${shopDomain}` : ''}: ${
        hmacHeader ? 'invalid' : 'missing'
      } HMAC signature`
    )
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: missing or invalid Shopify webhook HMAC signature.',
    })
  }

  let orderPayload: ShopifyOrderWebhookPayload
  try {
    orderPayload = JSON.parse(rawBody.toString('utf8') || '{}')
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON webhook payload.' })
  }

  if (!orderPayload?.id) {
    return res.status(400).json({
      success: false,
      error: 'Invalid order webhook payload: missing order ID.',
    })
  }

  try {
    // 4. Reconcile Order Tax & Discounts
    const reconciliation = await reconcileOrderTaxAndDiscounts(orderPayload, topic)

    // 5. Respond 200 so Shopify doesn't retry
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
    console.error('[Shopify Webhook] Reconciliation processing error:', error?.message || error)
    return res.status(500).json({
      success: false,
      error: 'Internal error processing Shopify order webhook.',
    })
  }
}
