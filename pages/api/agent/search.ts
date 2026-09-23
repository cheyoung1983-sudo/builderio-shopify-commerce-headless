import type { NextApiRequest, NextApiResponse } from 'next'
import {
  searchStorefrontProducts,
  fetchAllAvailableProducts,
  isShopifyConfigured,
} from '../../../services/shopify'
import {
  createRateLimiter,
  handleOptions,
  isAllowedOrigin,
  readBoundedInteger,
  readBoundedString,
} from '../../../lib/api-security'

const allowedOrigins = ['https://displaycellpros.com', 'https://www.displaycellpros.com']
const rateLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000 })

function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return address?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
}

function hasOwn(value: unknown, key: string): boolean {
  return typeof value === 'object' && value !== null && Object.prototype.hasOwnProperty.call(value, key)
}

function createSecurityResponse(res: NextApiResponse) {
  return {
    setHeader(name: string, value: string) {
      res.setHeader(name, value)
    },
    getHeader(name: string) {
      const value = res.getHeader(name)
      return typeof value === 'number' ? String(value) : value
    },
    get statusCode() {
      return res.statusCode
    },
    set statusCode(value: number) {
      res.statusCode = value
    },
    end: res.end.bind(res),
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const corsOptions = {
    allowedOrigins,
    allowLocalhost: process.env.NODE_ENV !== 'production',
  }
  const securityRes = createSecurityResponse(res)

  if (handleOptions(req, securityRes, corsOptions)) {
    return
  }

  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined
  if (req.headers.origin && !isAllowedOrigin(origin, corsOptions)) {
    return res.status(403).json({ ok: false, error: 'Origin not allowed' })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed. Use GET or POST.',
    })
  }

  const rateLimit = rateLimiter.check(getClientKey(req))
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
    return res.status(429).json({ ok: false, error: 'Too many requests' })
  }

  try {
    const body = req.method === 'POST' ? req.body : undefined
    if (
      req.method === 'POST' &&
      body !== undefined &&
      (body === null || typeof body !== 'object' || Array.isArray(body))
    ) {
      return res.status(400).json({ ok: false, error: 'Invalid request body' })
    }

    const rawQuery =
      req.method === 'POST'
        ? hasOwn(body, 'query')
          ? body.query
          : hasOwn(body, 'q')
          ? body.q
          : req.query?.query ?? req.query?.q
        : req.query?.query ?? req.query?.q

    const rawFirst =
      req.method === 'POST'
        ? hasOwn(body, 'first')
          ? body.first
          : req.query?.first
        : req.query?.first

    const query =
      rawQuery === undefined
        ? ''
        : readBoundedString(rawQuery, { maxLength: 200, truncate: false })
    const parsedFirst =
      rawFirst === undefined ? 5 : readBoundedInteger(rawFirst)
    const first =
      parsedFirst === undefined
        ? undefined
        : Math.min(Math.max(parsedFirst, 1), 25)

    if (query === undefined || first === undefined) {
      return res.status(400).json({ ok: false, error: 'Invalid query or first value' })
    }

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
