import type { NextApiRequest, NextApiResponse } from 'next'
import {
  fetchStorefrontProductRecommendations,
  fetchStorefrontProductByHandle,
  searchStorefrontProducts,
  fetchAllAvailableProducts,
  ShopifyProductNode,
} from '../../../services/shopify'

interface RecommendationsApiResponse {
  ok: boolean
  products: ShopifyProductNode[]
  count: number
  source: 'shopify-recommendations' | 'related-fallback'
  error?: string
}

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecommendationsApiResponse>
) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      ok: false,
      products: [],
      count: 0,
      source: 'related-fallback',
      error: 'Method not allowed. Use GET.',
    })
  }

  try {
    const rawProductId = req.query.productId as string | undefined
    const handle = req.query.handle as string | undefined
    const vendor = req.query.vendor as string | undefined
    const productType = req.query.productType as string | undefined
    const intent = (req.query.intent as 'RELATED' | 'COMPLEMENTARY') || 'RELATED'
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '8', 10), 1), 16)

    let resolvedProductId = rawProductId

    // If handle is provided without an ID, resolve the ID from the handle
    if (!resolvedProductId && handle) {
      try {
        const productRes = await fetchStorefrontProductByHandle(handle)
        if (productRes.data?.product?.id) {
          resolvedProductId = productRes.data.product.id
        }
      } catch (err) {
        console.warn('[RecommendationsAPI] Could not resolve product ID from handle:', err)
      }
    }

    // 1. Primary: Try Shopify Storefront Product Recommendations API
    if (resolvedProductId) {
      try {
        const recResult = await fetchStorefrontProductRecommendations(resolvedProductId, { intent })
        const rawRecs = recResult.data?.productRecommendations

        if (Array.isArray(rawRecs) && rawRecs.length > 0) {
          const filtered = rawRecs.filter(
            (p) => p.id !== resolvedProductId && p.availableForSale !== false
          )

          if (filtered.length > 0) {
            return res.status(200).json({
              ok: true,
              products: filtered.slice(0, limit),
              count: filtered.slice(0, limit).length,
              source: 'shopify-recommendations',
            })
          }
        }
      } catch (err) {
        console.warn('[RecommendationsAPI] Shopify recommendations query failed, falling back:', err)
      }
    }

    // 2. Fallback: Search by productType or vendor, or fetch top available products
    let fallbackProducts: ShopifyProductNode[] = []

    if (productType || vendor) {
      const searchTerm = [vendor, productType].filter(Boolean).join(' ')
      try {
        const searchRes = await searchStorefrontProducts(searchTerm, {
          maxProducts: limit + 2,
          onlyAvailable: true,
        })
        fallbackProducts = (searchRes.products || []).filter(
          (p) => p.id !== resolvedProductId && (handle ? p.handle !== handle : true)
        )
      } catch (err) {
        console.warn('[RecommendationsAPI] Fallback search failed:', err)
      }
    }

    // 3. Ultimate catalog fallback if still empty
    if (fallbackProducts.length === 0) {
      try {
        const catalogRes = await fetchAllAvailableProducts({
          maxProducts: limit + 4,
          onlyAvailable: true,
        })
        fallbackProducts = (catalogRes.products || []).filter(
          (p) => p.id !== resolvedProductId && (handle ? p.handle !== handle : true)
        )
      } catch (err) {
        console.warn('[RecommendationsAPI] Catalog fallback failed:', err)
      }
    }

    const finalProducts = fallbackProducts.slice(0, limit)

    return res.status(200).json({
      ok: true,
      products: finalProducts,
      count: finalProducts.length,
      source: 'related-fallback',
    })
  } catch (error) {
    const err = error as Error
    console.error('[RecommendationsAPI] Unhandled error:', err)
    return res.status(500).json({
      ok: false,
      products: [],
      count: 0,
      source: 'related-fallback',
      error: err.message || 'Internal server error',
    })
  }
}
