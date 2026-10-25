import type { NextApiRequest, NextApiResponse } from 'next'
import {
  getShopifyDomain,
  getStorefrontAccessToken,
  getShopifyApiVersion,
} from '../../../config/shopify'
import {
  applyCors,
  createRateLimiter,
  handleOptions,
  isAllowedOrigin,
  DEFAULT_AGENT_CORS_OPTIONS,
} from '../../../lib/api-security'

const rateLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000 })

function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return address?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
}

async function executeStorefrontGraphQL(query: string, variables: Record<string, any> = {}) {
  const domain = getShopifyDomain()
  const token = getStorefrontAccessToken()
  const apiVersion = getShopifyApiVersion()

  if (!token) {
    throw new Error('Shopify Storefront Access Token is not configured.')
  }

  const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Shopify Storefront API returned HTTP ${res.status}: ${errorText}`)
  }

  const json = await res.json()
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors.map((e: any) => e.message).join(', '))
  }

  return json.data
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const corsOptions = DEFAULT_AGENT_CORS_OPTIONS
  applyCors(res, req.headers.origin, corsOptions)

  if (handleOptions(req, res, corsOptions)) {
    return
  }

  if (!rateLimiter.check(getClientKey(req)).allowed) {
    const result = rateLimiter.check(getClientKey(req))
    res.setHeader('Retry-After', String(result.retryAfterSeconds))
    return res.status(429).json({ ok: false, error: 'Too many requests' })
  }

  if (!isAllowedOrigin(req.headers.origin, corsOptions)) {
    return res.status(403).json({ ok: false, error: 'Origin not allowed' })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: `Method ${req.method} not allowed. Use GET or POST.`,
    })
  }

  try {
    const body = req.method === 'POST' ? req.body : undefined
    const rawQuery =
      req.method === 'POST'
        ? (body?.query || body?.q || req.query?.query || req.query?.q)
        : (req.query?.query || req.query?.q)

    const rawFirst = req.method === 'POST' ? (body?.first || req.query?.first) : req.query?.first

    const queryStr = (typeof rawQuery === 'string' ? rawQuery : '').trim().slice(0, 200)
    const firstNum = Math.min(Math.max(parseInt(String(rawFirst || 5), 10) || 5, 1), 25)

    const gqlQuery = `
      query SearchProducts($query: String!, $first: Int!) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              title
              handle
              description
              availableForSale
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              featuredImage {
                url
                altText
              }
              variants(first: 5) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    availableForSale
                  }
                }
              }
            }
          }
        }
      }
    `

    const data = await executeStorefrontGraphQL(gqlQuery, {
      query: queryStr,
      first: firstNum,
    })

    const products = (data?.products?.edges || []).map(({ node }: any) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      description: node.description,
      availableForSale: node.availableForSale,
      minPrice: node.priceRange?.minVariantPrice?.amount,
      currency: node.priceRange?.minVariantPrice?.currencyCode || 'USD',
      image: node.featuredImage?.url,
      variants: (node.variants?.edges || []).map(({ node: v }: any) => ({
        id: v.id,
        title: v.title,
        price: v.price?.amount,
        availableForSale: v.availableForSale,
      })),
    }))

    return res.status(200).json({
      ok: true,
      query: queryStr,
      count: products.length,
      products,
    })
  } catch (error: any) {
    console.error('[API /api/agent/search] Search failed:', error)
    return res.status(500).json({
      ok: false,
      error: 'Product search failed',
      products: [],
    })
  }
}
