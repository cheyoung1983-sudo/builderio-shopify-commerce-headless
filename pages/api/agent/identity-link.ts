import type { NextApiRequest, NextApiResponse } from 'next'
import { getBuyerLinkedToken } from '@services/shopify-customer-account'
import shopifyConfig from '@config/shopify'
import {
  applyCors,
  handleOptions,
  isAllowedOrigin,
  DEFAULT_AGENT_CORS_OPTIONS,
} from '@lib/api-security'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const corsOptions = DEFAULT_AGENT_CORS_OPTIONS
  applyCors(res, req.headers.origin, corsOptions)

  if (handleOptions(req, res, corsOptions)) {
    return
  }

  if (!isAllowedOrigin(req.headers.origin, corsOptions)) {
    return res.status(403).json({ success: false, error: 'Origin not allowed' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { shopAccessToken, resourceServer } = req.body

  if (!shopAccessToken) {
    return res.status(400).json({ error: 'Shop access token is required' })
  }

  try {
    const buyerLinkedToken = await getBuyerLinkedToken({
      shopAccessToken,
      clientId: shopifyConfig.clientId,
      clientSecret: shopifyConfig.clientSecret,
      resourceServer
    })

    return res.status(200).json({ success: true, buyerLinkedToken })
  } catch (error: any) {
    console.error('[Identity Linking] Failed:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
}
