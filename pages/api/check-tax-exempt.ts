import type { NextApiRequest, NextApiResponse } from 'next'
import {
  getShopifyDomain,
  getShopifyApiVersion,
  getAdminAccessToken,
} from '@config/shopify'
import {
  applyCors,
  handleOptions,
  isAllowedOrigin,
  DEFAULT_AGENT_CORS_OPTIONS,
} from '@lib/api-security'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const corsOptions = DEFAULT_AGENT_CORS_OPTIONS
  applyCors(res, req.headers.origin, corsOptions)

  if (handleOptions(req, res, corsOptions)) {
    return
  }

  if (!isAllowedOrigin(req.headers.origin, corsOptions)) {
    return res.status(403).json({ verified: false, status: 'error', message: 'Origin not allowed' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      verified: false,
      status: 'error',
      message: 'Method not allowed. Use POST.',
    })
  }

  const { email } = req.body || {}

  if (!email || typeof email !== 'string') {
    return res.status(400).json({
      verified: false,
      status: 'error',
      message: 'Email is required',
    })
  }

  const adminToken = process.env.SHOPIFY_ADMIN_TOKEN || getAdminAccessToken()
  const domain = getShopifyDomain()
  const apiVersion = getShopifyApiVersion()

  if (!adminToken) {
    console.error('SHOPIFY_ADMIN_TOKEN is missing in environment variables.')
    return res.status(500).json({
      verified: false,
      status: 'error',
      message: 'Server configuration error: missing Shopify Admin Token',
    })
  }

  const query = `
    query getCustomerTaxStatus($query: String!) {
      customers(first: 1, query: $query) {
        edges {
          node {
            id
            displayName
            email
            metafield(namespace: "custom", key: "tribal_verified") {
              value
            }
          }
        }
      }
    }
  `

  try {
    const response = await fetch(
      `https://${domain}/admin/api/${apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken,
        },
        body: JSON.stringify({
          query,
          variables: { query: `email:${email}` },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Shopify Admin API returned ${response.status}:`, errorText)
      return res.status(500).json({
        verified: false,
        status: 'error',
        message: 'Failed to communicate with Shopify Admin API',
      })
    }

    const data = await response.json()
    const customer = data?.data?.customers?.edges?.[0]?.node

    if (!customer) {
      return res.status(200).json({
        verified: false,
        status: 'not_found',
        message: 'No account found for that email',
      })
    }

    const metaValue = customer.metafield?.value
    const isVerified = metaValue === 'verified'

    return res.status(200).json({
      verified: isVerified,
      customer_name: customer.displayName,
      status: metaValue || 'not_verified',
      message: isVerified
        ? 'Tax-exempt status confirmed'
        : 'No verified tax-exempt status on file',
    })
  } catch (err) {
    console.error('Tax exempt check failed:', err)
    return res.status(500).json({
      verified: false,
      status: 'error',
      message: 'Lookup failed, please try again',
    })
  }
}
