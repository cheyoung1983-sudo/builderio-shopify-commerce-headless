import type { NextApiRequest, NextApiResponse } from 'next'
import {
  searchStorefrontProducts,
  fetchStorefrontCollections,
  ShopifyProductNode,
} from '../../../services/shopify'
import {
  parseShopifySearchQuery,
  evaluateShopifyProduct,
} from '../../../lib/shopify-search-syntax'

export interface PredictiveSearchProductItem {
  id: string
  title: string
  handle: string
  url: string
  image?: string
  price: string
  compareAtPrice?: string
  vendor?: string
  productType?: string
  available: boolean
}

export interface PredictiveSearchCollectionItem {
  id: string
  title: string
  handle: string
  url: string
  image?: string
  description?: string
}

export interface PredictiveSearchPageItem {
  id: string
  title: string
  handle: string
  url: string
  summary?: string
}

export interface PredictiveSearchQueryItem {
  text: string
  styled_text: string
  url: string
}

export interface PredictiveSearchResponse {
  resources: {
    results: {
      products: PredictiveSearchProductItem[]
      collections: PredictiveSearchCollectionItem[]
      pages: PredictiveSearchPageItem[]
      queries: PredictiveSearchQueryItem[]
    }
  }
  terms?: string
}

// Pre-defined searchable store pages
const STORE_PAGES: PredictiveSearchPageItem[] = [
  {
    id: 'page-catalog',
    title: 'All Products & Replacement Screens',
    handle: 'products',
    url: '/products',
    summary: 'Full catalog of smartphone display replacements, parts, and accessories',
  },
  {
    id: 'page-trends',
    title: 'Industry Trends & Screen Technologies',
    handle: 'trends',
    url: '/trends',
    summary: 'Repair benchmarking, OLED vs LCD durability reports, and hardware research',
  },
  {
    id: 'page-wishlist',
    title: 'Saved Wishlist & Favorite Hardware',
    handle: 'wishlist',
    url: '/wishlist',
    summary: 'Review and manage your saved replacement screens and components',
  },
  {
    id: 'page-cart',
    title: 'Shopping Cart & Secure Checkout',
    handle: 'cart',
    url: '/cart',
    summary: 'Review selected repair kits, accessories, and complete checkout',
  },
  {
    id: 'page-account',
    title: 'Customer Account & Order History',
    handle: 'account',
    url: '/account',
    summary: 'Track shipments, view order history, and manage store addresses',
  },
]

// Common query suggestion dictionary
const CATALOG_SUGGESTION_TERMS = [
  'Samsung Galaxy S22',
  'Samsung Galaxy S21',
  'Samsung Galaxy S20',
  'Samsung Note 20',
  'OLED Screen Replacement',
  'LCD Screen Assembly',
  'Ultra Display',
  'Digitizer with Frame',
  'Fast Shipping',
  'iPhone 13 Screen',
  'iPhone 12 Screen',
  'OEM Display',
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Support both GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  // Parse parameters from query or body
  const params = req.method === 'GET' ? req.query : req.body || {}
  const rawQ = typeof params.q === 'string' ? params.q.trim() : ''
  const sectionId = typeof params.section_id === 'string' ? params.section_id : null

  if (!rawQ) {
    return res.status(200).json({
      resources: {
        results: {
          products: [],
          collections: [],
          pages: [],
          queries: [],
        },
      },
      terms: '',
    })
  }

  // Parse resource types requested (default: product,collection,page,query)
  const resourceTypeParam =
    typeof params['resources[type]'] === 'string'
      ? params['resources[type]']
      : typeof params.type === 'string'
      ? params.type
      : 'product,collection,page,query'

  const requestedTypes = new Set(
    resourceTypeParam.split(',').map((t: string) => t.trim().toLowerCase())
  )

  const unavailableProducts =
    typeof params['resources[options][unavailable_products]'] === 'string'
      ? params['resources[options][unavailable_products]']
      : typeof params.unavailable_products === 'string'
      ? params.unavailable_products
      : 'last'

  const prefixOption =
    typeof params['resources[options][prefix]'] === 'string'
      ? (params['resources[options][prefix]'] as 'last' | 'none')
      : 'last'

  const limitParam = parseInt(
    String(params['resources[limit]'] || params.limit || '6'),
    10
  )
  const limit = isNaN(limitParam) ? 6 : Math.min(Math.max(limitParam, 1), 20)

  try {
    // 1. Fetch Product Suggestions via Storefront API
    let products: PredictiveSearchProductItem[] = []
    if (requestedTypes.has('product')) {
      const searchRes = await searchStorefrontProducts(rawQ, {
        batchSize: 20,
        maxProducts: 20,
        unavailable_products: unavailableProducts as any,
        prefix: prefixOption,
      })

      // If search returns products, filter using syntax evaluator
      const sourceList = searchRes.products || []
      const filtered = sourceList.filter((p) => evaluateShopifyProduct(p, rawQ))
      const finalProducts = filtered.length > 0 ? filtered : sourceList

      products = finalProducts.slice(0, limit).map((p: ShopifyProductNode) => {
        const primaryImage = p.images?.edges?.[0]?.node?.url
        const minPrice = p.priceRange?.minVariantPrice?.amount
        const currency = p.priceRange?.minVariantPrice?.currencyCode || 'USD'
        const formattedPrice = minPrice
          ? new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency,
            }).format(parseFloat(minPrice))
          : ''

        return {
          id: p.id,
          title: p.title,
          handle: p.handle,
          url: `/product/${p.handle}`,
          image: primaryImage,
          price: formattedPrice,
          vendor: p.vendor,
          productType: p.productType,
          available: p.availableForSale !== false,
        }
      })
    }

    // 2. Fetch Collection Suggestions
    let collections: PredictiveSearchCollectionItem[] = []
    if (requestedTypes.has('collection')) {
      try {
        const collectionsRes = await fetchStorefrontCollections({ first: 20 })
        const rawCollections = collectionsRes.data?.collections?.edges || []
        const lowerQ = rawQ.toLowerCase()

        collections = rawCollections
          .map((e: any) => e.node)
          .filter((c: any) => {
            if (!c?.title) return false
            const t = c.title.toLowerCase()
            const h = (c.handle || '').toLowerCase()
            return t.includes(lowerQ) || h.includes(lowerQ)
          })
          .slice(0, 4)
          .map((c: any) => ({
            id: c.id,
            title: c.title,
            handle: c.handle,
            url: `/collection/${c.handle}`,
            image: c.image?.url,
            description: c.description,
          }))
      } catch (err) {
        console.warn('[suggest API] Error fetching collections:', err)
      }
    }

    // 3. Search Page Suggestions
    let pages: PredictiveSearchPageItem[] = []
    if (requestedTypes.has('page')) {
      const lowerQ = rawQ.toLowerCase()
      pages = STORE_PAGES.filter((pg) => {
        return (
          pg.title.toLowerCase().includes(lowerQ) ||
          pg.handle.toLowerCase().includes(lowerQ) ||
          (pg.summary && pg.summary.toLowerCase().includes(lowerQ))
        )
      }).slice(0, 4)
    }

    // 4. Generate Query Suggestions
    let queries: PredictiveSearchQueryItem[] = []
    if (requestedTypes.has('query')) {
      const lowerQ = rawQ.toLowerCase()
      const matchingTerms = CATALOG_SUGGESTION_TERMS.filter((term) =>
        term.toLowerCase().includes(lowerQ)
      )

      // Add user query if not exactly matching
      const suggestionCandidates = [
        rawQ,
        ...matchingTerms.filter((t) => t.toLowerCase() !== lowerQ),
      ]

      queries = suggestionCandidates.slice(0, 4).map((text) => {
        // Highlight matching query substring in styled_text
        const index = text.toLowerCase().indexOf(lowerQ)
        let styledText = text
        if (index >= 0) {
          const before = text.slice(0, index)
          const match = text.slice(index, index + lowerQ.length)
          const after = text.slice(index + lowerQ.length)
          styledText = `${before}<b>${match}</b>${after}`
        }

        return {
          text,
          styled_text: styledText,
          url: `/search?q=${encodeURIComponent(text)}`,
        }
      })
    }

    // If Shopify Liquid section_id was requested (as described in predictive-search.liquid spec),
    // output the HTML markup
    if (sectionId) {
      const html = generatePredictiveSearchHtml({
        sectionId,
        terms: rawQ,
        products,
        collections,
        pages,
        queries,
      })
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(html)
    }

    // Standard JSON output matching Shopify Predictive Search API specification
    const responseData: PredictiveSearchResponse = {
      resources: {
        results: {
          products,
          collections,
          pages,
          queries,
        },
      },
      terms: rawQ,
    }

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    return res.status(200).json(responseData)
  } catch (err: any) {
    console.error('[API /search/suggest] Error generating suggestions:', err)
    return res.status(500).json({
      error: 'Failed to generate predictive search suggestions',
      details: err?.message,
    })
  }
}

/**
 * Generates Shopify-compatible HTML section response when section_id parameter is passed
 */
function generatePredictiveSearchHtml(params: {
  sectionId: string
  terms: string
  products: PredictiveSearchProductItem[]
  collections: PredictiveSearchCollectionItem[]
  pages: PredictiveSearchPageItem[]
  queries: PredictiveSearchQueryItem[]
}): string {
  const { sectionId, terms, products, collections, pages, queries } = params

  return `
    <div id="shopify-section-${sectionId}">
      <div id="predictive-search-results">
        ${
          queries.length > 0
            ? `
          <div class="predictive-search__group">
            <h3 class="predictive-search__heading">Suggestions</h3>
            <ul role="listbox" aria-label="Query suggestions">
              ${queries
                .map(
                  (q) => `
                <li role="option">
                  <a href="${q.url}">${q.styled_text}</a>
                </li>
              `
                )
                .join('')}
            </ul>
          </div>
        `
            : ''
        }

        ${
          products.length > 0
            ? `
          <div class="predictive-search__group">
            <h3 id="predictive-search-products" class="predictive-search__heading">Products</h3>
            <ul role="listbox" aria-labelledby="predictive-search-products">
              ${products
                .map(
                  (p) => `
                <li role="option">
                  <a href="${p.url}">
                    ${p.image ? `<img src="${p.image}" alt="${p.title}" width="50" height="50" />` : ''}
                    <span>${p.title}</span>
                    <span class="price">${p.price}</span>
                  </a>
                </li>
              `
                )
                .join('')}
            </ul>
          </div>
        `
            : ''
        }

        ${
          collections.length > 0
            ? `
          <div class="predictive-search__group">
            <h3 class="predictive-search__heading">Collections</h3>
            <ul role="listbox" aria-label="Collections">
              ${collections
                .map(
                  (c) => `
                <li role="option">
                  <a href="${c.url}">${c.title}</a>
                </li>
              `
                )
                .join('')}
            </ul>
          </div>
        `
            : ''
        }

        ${
          pages.length > 0
            ? `
          <div class="predictive-search__group">
            <h3 class="predictive-search__heading">Pages</h3>
            <ul role="listbox" aria-label="Pages">
              ${pages
                .map(
                  (pg) => `
                <li role="option">
                  <a href="${pg.url}">${pg.title}</a>
                </li>
              `
                )
                .join('')}
            </ul>
          </div>
        `
            : ''
        }

        <div class="predictive-search__footer">
          <a href="/search?q=${encodeURIComponent(terms)}" class="predictive-search__button">
            Search for &ldquo;${terms}&rdquo;
          </a>
        </div>
      </div>
    </div>
  `
}
