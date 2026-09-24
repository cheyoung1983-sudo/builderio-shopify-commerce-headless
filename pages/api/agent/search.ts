import type { NextApiRequest, NextApiResponse } from 'next'
import {
  searchStorefrontProducts,
  fetchAllAvailableProducts,
  isShopifyConfigured,
} from '../../../services/shopify'
import {
  applyCors,
  createRateLimiter,
  handleOptions,
  isAllowedOrigin,
  readBoundedString,
  readBoundedInteger,
} from '../../../lib/api-security'

const allowedOrigins = ['https://displaycellpros.com', 'https://www.displaycellpros.com']
const rateLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000 })

function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return address?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const corsOptions = {
    allowedOrigins,
    allowLocalhost: true,
    allowRunApp: true,
  }
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
      error: 'Method not allowed. Use GET or POST.',
    })
  }

  try {
    const rawQuery =
      req.method === 'POST'
        ? req.body?.query ?? req.body?.q ?? req.query?.query ?? req.query?.q
        : req.query?.query ?? req.query?.q

    const rawFirst =
      req.method === 'POST'
        ? req.body?.first ?? req.query?.first
        : req.query?.first

    const query = rawQuery === undefined
      ? ''
      : readBoundedString(rawQuery, { maxLength: 200 })
    const first = rawFirst === undefined
      ? 5
      : readBoundedInteger(rawFirst, { min: 1, max: 25 }) || 5

    const result = query
      ? await searchStorefrontProducts(query, {
          maxProducts: first,
          batchSize: Math.max(first, 10),
          onlyAvailable: true,
        })
      : await fetchAllAvailableProducts({
          maxProducts: first,
          batchSize: Math.max(first, 10),
          onlyAvailable: true,
        })

    const formattedProducts = (result.products || []).map((product) => {
      const primaryPrice =
        product.priceRange?.minVariantPrice?.amount || '0.00'
      const currency =
        product.priceRange?.minVariantPrice?.currencyCode || 'USD'

      const variants = (product.variants?.edges || []).map(({ node }) => ({
        id: node.id,
        title: node.title,
        price: `${node.price?.amount || primaryPrice} ${node.price?.currencyCode || currency}`,
        availableForSale: node.availableForSale,
        sku: node.sku || undefined,
      }))

      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        url: `/product/${product.handle}`,
        price: `${primaryPrice} ${currency}`,
        availableForSale: product.availableForSale,
        vendor: product.vendor,
        productType: product.productType,
        description: product.description ? product.description.slice(0, 240) : '',
        image: product.featuredImage?.url || null,
        variants,
      }
    })

    return res.status(200).json({
      ok: true,
      query: query || null,
      count: formattedProducts.length,
      shopifyConfigured: isShopifyConfigured(),
      products: formattedProducts,
    })
  } catch (error) {
    console.error('[API /api/agent/search] Error searching products:', error)
    return res.status(502).json({
      ok: false,
      error: 'Failed to search products',
      products: [],
    })
  }
}
