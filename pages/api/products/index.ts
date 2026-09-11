import type { NextApiRequest, NextApiResponse } from 'next'
import {
  ALL_AVAILABLE_PRODUCTS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  storefrontFetch,
  ShopifyProductNode,
  ShopifyProductDetailNode,
} from '../../../services/shopify'
import { getDemoProducts, getDemoProductByHandle } from '../../../lib/shopify/demo-catalog'
import shopifyConfig from '../../../config/shopify'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  }

  const {
    query,
    sortKey,
    reverse: reverseParam,
    onlyAvailable: onlyAvailParam,
    limit: limitParam,
    handle,
  } = req.query

  const reverse = reverseParam === 'true'
  const onlyAvailable = onlyAvailParam !== 'false'
  const limit = limitParam ? parseInt(limitParam as string, 10) : 50
  const searchKeyword = typeof query === 'string' ? query : undefined

  // 1. Single Product by Handle
  if (typeof handle === 'string' && handle.trim()) {
    const productHandle = handle.trim()

    // Try live Shopify Storefront if token is present
    if (shopifyConfig.storefrontAccessToken) {
      try {
        const sfRes = await storefrontFetch<{ product: ShopifyProductDetailNode | null }>({
          query: PRODUCT_BY_HANDLE_QUERY,
          variables: { handle: productHandle },
          timeoutMs: 8000,
        })

        if (sfRes.ok && sfRes.data?.product) {
          return res.status(200).json({
            ok: true,
            product: sfRes.data.product,
            source: 'shopify-live',
          })
        }
      } catch (err) {
        console.warn('[api/products] Live storefront fetch failed for handle:', productHandle, err)
      }
    }

    // Fallback to Demo Catalog for product detail
    const demoProd = getDemoProductByHandle(productHandle)
    if (demoProd) {
      return res.status(200).json({
        ok: true,
        product: demoProd,
        source: 'preview-catalog',
        isDemo: true,
      })
    }

    return res.status(404).json({
      ok: false,
      error: `Product "${productHandle}" not found`,
    })
  }

  // 2. Fetch Products List
  let products: ShopifyProductNode[] = []
  let isDemo = false
  let notice: string | null = null

  // If storefront access token is available, attempt real fetch
  if (shopifyConfig.storefrontAccessToken) {
    try {
      const effectiveSortKey =
        sortKey === 'RELEVANCE' && !searchKeyword ? undefined : sortKey

      const sfRes = await storefrontFetch<{
        products: {
          edges: Array<{ node: ShopifyProductNode }>
        }
      }>({
        query: ALL_AVAILABLE_PRODUCTS_QUERY,
        variables: {
          first: Math.min(Math.max(limit, 1), 250),
          query: searchKeyword || undefined,
          sortKey: effectiveSortKey,
          reverse,
        },
        timeoutMs: 8000,
      })

      if (sfRes.ok && sfRes.data?.products?.edges) {
        products = sfRes.data.products.edges.map((e) => e.node)
        if (onlyAvailable) {
          products = products.filter((p) => p.availableForSale !== false)
        }
        return res.status(200).json({
          ok: true,
          products,
          totalCount: products.length,
          source: 'shopify-live',
        })
      }

      // If Shopify returned ACCESS_DENIED or other error, note it
      const hasAccessDenied = sfRes.errors?.some(
        (e) => e.message?.includes('ACCESS_DENIED') || (e as any).extensions?.code === 'ACCESS_DENIED'
      )
      if (hasAccessDenied) {
        notice =
          'Shopify Storefront API returned ACCESS_DENIED. Check that the Storefront API permissions (unauthenticated_read_product_listings) are active for this store.'
      }
    } catch (err: any) {
      console.warn('[api/products] Error fetching from live Storefront:', err?.message)
    }
  }

  // If live fetch didn't return products (e.g. missing token or ACCESS_DENIED), serve demo catalog
  isDemo = true
  products = getDemoProducts({
    query: searchKeyword,
    sortKey: typeof sortKey === 'string' ? sortKey : undefined,
    reverse,
    onlyAvailable,
    limit,
  })

  if (!notice) {
    notice = shopifyConfig.storefrontAccessToken
      ? 'Live Storefront access was not authorized (ACCESS_DENIED). Displaying preview catalog for displaycellpros.myshopify.com.'
      : 'Shopify Storefront API credentials are not set. Displaying preview catalog for displaycellpros.myshopify.com.'
  }

  return res.status(200).json({
    ok: true,
    products,
    totalCount: products.length,
    source: 'preview-catalog',
    isDemo,
    notice,
  })
}
