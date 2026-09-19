import type { NextApiRequest, NextApiResponse } from 'next'
import {
  searchStorefrontProducts,
  fetchAllAvailableProducts,
  isShopifyConfigured,
} from '../../../services/shopify'

/**
 * Handles CORS headers for agent tool queries
 */
function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
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

    const query = typeof rawQuery === 'string' ? rawQuery.trim() : ''
    const first = typeof rawFirst === 'number'
      ? Math.min(Math.max(rawFirst, 1), 25)
      : typeof rawFirst === 'string'
      ? Math.min(Math.max(parseInt(rawFirst, 10) || 5, 1), 25)
      : 5

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
  } catch (error: any) {
    console.error('[API /api/agent/search] Error searching products:', error)
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Failed to search products',
      products: [],
    })
  }
}
