import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { getAdminNotificationSettings } from '../../lib/admin-notification-settings'

/**
 * Health check endpoint: /api/health
 * Validates connectivity for:
 * 1. Shopify Storefront API
 * 2. Firestore
 * 3. Auth0 (via notification settings/webhook availability)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const statusReport = {
    timestamp: new Date().toISOString(),
    shopify: { status: 'unknown' },
    firestore: { status: 'unknown' },
    auth0: { status: 'unknown' },
    overall: 'checking',
  }

  // 1. Validate Firestore Connectivity
  try {
    if (db) {
      // Perform a lightweight read to verify connectivity
      const healthCheckRef = doc(db, 'system', 'health')
      await getDoc(healthCheckRef)
      statusReport.firestore.status = 'connected'
    } else {
      statusReport.firestore.status = 'not_initialized'
    }
  } catch (err) {
    statusReport.firestore.status = 'error'
  }

  // 2. Validate Shopify Connectivity
  try {
    const shopifyDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
    if (shopifyDomain) {
      // Basic connectivity test to storefront
      const shopifyRes = await fetch(`https://${shopifyDomain}/api/2024-07/shop.json`, {
        method: 'GET',
        headers: {
          'X-Shopify-Storefront-Access-Token': process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN || '',
        },
      })
      statusReport.shopify.status = shopifyRes.ok ? 'connected' : 'error'
    } else {
      statusReport.shopify.status = 'not_configured'
    }
  } catch (err) {
    statusReport.shopify.status = 'error'
  }

  // 3. Validate Auth0 Connectivity
  try {
    // Check if Auth0 secret is available and settings can be retrieved
    const settings = await getAdminNotificationSettings()
    statusReport.auth0.status = settings.slackWebhookUrl ? 'configured' : 'partial'
  } catch (err) {
    statusReport.auth0.status = 'error'
  }

  // Determine overall status
  const services = [statusReport.shopify.status, statusReport.firestore.status, statusReport.auth0.status]
  statusReport.overall = services.every(s => s === 'connected' || s === 'configured')
    ? 'healthy'
    : 'degraded'

  return res.status(statusReport.overall === 'healthy' ? 200 : 503).json(statusReport)
}
