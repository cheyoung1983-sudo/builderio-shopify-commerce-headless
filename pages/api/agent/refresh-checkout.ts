import type { NextApiRequest, NextApiResponse } from 'next'
import {
  getShopifyDomain,
  getStorefrontAccessToken,
  getShopifyApiVersion,
} from '@config/shopify'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` })
  }

  try {
    let cartId = ''
    if (req.method === 'GET') {
      cartId = String(req.query.cartId || '')
    } else {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      cartId = String(body?.cartId || '')
    }

    if (!cartId) {
      return res.status(400).json({ success: false, error: 'Missing required "cartId" parameter' })
    }

    const domain = getShopifyDomain()
    const token = getStorefrontAccessToken()
    const apiVersion = getShopifyApiVersion()

    if (!token) {
      return res.status(500).json({ success: false, error: 'Shopify Storefront Access Token is not configured' })
    }

    const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`
    const query = `
      query GetFreshCheckoutUrl($id: ID!) {
        cart(id: $id) {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
        }
      }
    `

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables: { id: cartId } }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({ success: false, error: errorText })
    }

    const json = await response.json()
    if (json.errors && json.errors.length > 0) {
      return res.status(400).json({ success: false, error: json.errors[0]?.message })
    }

    const cart = json.data?.cart
    if (!cart || !cart.checkoutUrl) {
      return res.status(404).json({
        success: false,
        error: `Cart or checkout URL not found for id: ${cartId}. The cart may have expired.`,
      })
    }

    return res.status(200).json({
      success: true,
      cartId: cart.id,
      checkoutUrl: cart.checkoutUrl,
      totalQuantity: cart.totalQuantity,
      total: cart.cost?.totalAmount?.amount,
      currency: cart.cost?.totalAmount?.currencyCode || 'USD',
      refreshedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error in /api/agent/refresh-checkout:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error refreshing checkout URL',
    })
  }
}
