import React, { useState } from 'react'
import type { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { DynamicSEO } from '../components/common/DynamicSEO'
import { Breadcrumbs, BreadcrumbItem } from '../components/common/Breadcrumbs'
import { PredictiveSearch } from '../components/search/PredictiveSearch'
import { ProductCard } from '../components/products/ProductCard'
import {
  searchStorefrontProducts,
  fetchStorefrontCollections,
  ShopifyProductNode,
} from '../services/shopify'
import {
  parseShopifySearchQuery,
  evaluateShopifyProduct,
  SearchSyntaxDebugResult,
} from '../lib/shopify-search-syntax'
import { getLayoutProps } from '../lib/get-layout-props'
import {
  Search,
  Filter,
  SlidersHorizontal,
  Code2,
  CheckCircle2,
  AlertCircle,
  Folder,
  FileText,
  PackageX,
  HelpCircle,
} from 'lucide-react'

// Page candidates for storefront search
const STATIC_PAGES = [
  {
    title: 'All Products & Replacement Screens',
    url: '/products',
    summary: 'Full catalog of smartphone display replacements, parts, and accessories',
  },
  {
    title: 'Industry Trends & Screen Technologies',
    url: '/trends',
    summary: 'Repair benchmarking, OLED vs LCD durability reports, and research',
  },
  {
    title: 'Saved Wishlist & Favorite Hardware',
    url: '/wishlist',
    summary: 'Review and manage your saved replacement screens and components',
  },
  {
    title: 'Shopping Cart & Secure Checkout',
    url: '/cart',
    summary: 'Review selected repair kits, accessories, and complete checkout',
  },
  {
    title: 'Customer Account & Order History',
    url: '/account',
    summary: 'Track shipments, view order history, and manage store addresses',
  },
]

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { query } = context

  // 1. Parse Storefront search query parameters according to Shopify specification
  const qParam = typeof query.q === 'string' ? query.q.trim() : ''
  const typeParam = typeof query.type === 'string' ? query.type : 'product,collection,page'
  const unavailableProducts = (typeof query['options[unavailable_products]'] === 'string'
    ? query['options[unavailable_products]']
    : 'last') as 'show' | 'hide' | 'last'
  const prefixOption = (typeof query['options[prefix]'] === 'string'
    ? query['options[prefix]']
    : 'last') as 'last' | 'none'
  const sortByParam = typeof query.sort_by === 'string' ? query.sort_by : 'relevance'

  // Map Shopify sort_by to Storefront GraphQL sortKey and reverse
  let sortKey: string | undefined = undefined
  let reverse = false

  switch (sortByParam) {
    case 'price-ascending':
      sortKey = 'PRICE'
      reverse = false
      break
    case 'price-descending':
      sortKey = 'PRICE'
      reverse = true
      break
    case 'title-ascending':
      sortKey = 'TITLE'
      reverse = false
      break
    case 'title-descending':
      sortKey = 'TITLE'
      reverse = true
      break
    case 'created-descending':
      sortKey = 'CREATED_AT'
      reverse = true
      break
    case 'relevance':
    default:
      sortKey = 'RELEVANCE'
      reverse = false
      break
  }

  // 2. Execute search if query provided
  let products: ShopifyProductNode[] = []
  let collections: Array<{ id: string; title: string; handle: string; url: string; image?: string }> = []
  let pages: typeof STATIC_PAGES = []

  const requestedTypes = new Set(typeParam.split(',').map((t) => t.trim().toLowerCase()))

  if (qParam) {
    // A. Product Search with Shopify query grammar & availability options
    if (requestedTypes.has('product')) {
      try {
        const searchRes = await searchStorefrontProducts(qParam, {
          batchSize: 50,
          maxProducts: 50,
          sortKey,
          reverse,
          unavailable_products: unavailableProducts,
          prefix: prefixOption,
        })

        // Apply evaluator fallback to ensure in-memory precision
        const initialList = searchRes.products || []
        const matched = initialList.filter((p) => evaluateShopifyProduct(p, qParam))
        products = matched.length > 0 ? matched : initialList
      } catch (err) {
        console.error('[pages/search] Error searching products:', err)
      }
    }

    // B. Collection Search
    if (requestedTypes.has('collection')) {
      try {
        const colRes = await fetchStorefrontCollections({ first: 20 })
        const rawEdges = colRes.data?.collections?.edges || []
        const lowerQ = qParam.toLowerCase()
        collections = rawEdges
          .map((e: any) => e.node)
          .filter((c: any) => {
            if (!c?.title) return false
            return (
              c.title.toLowerCase().includes(lowerQ) ||
              (c.handle && c.handle.toLowerCase().includes(lowerQ))
            )
          })
          .map((c: any) => ({
            id: c.id,
            title: c.title,
            handle: c.handle,
            url: `/collection/${c.handle}`,
            image: c.image?.url || null,
          }))
      } catch (err) {
        console.warn('[pages/search] Error fetching collections:', err)
      }
    }

    // C. Content Pages Search
    if (requestedTypes.has('page')) {
      const lowerQ = qParam.toLowerCase()
      pages = STATIC_PAGES.filter(
        (pg) =>
          pg.title.toLowerCase().includes(lowerQ) ||
          pg.summary.toLowerCase().includes(lowerQ) ||
          pg.url.toLowerCase().includes(lowerQ)
      )
    }
  }

  // 3. Parse search syntax for live AST inspection & debugging
  let syntaxDebug: SearchSyntaxDebugResult
  try {
    syntaxDebug = parseShopifySearchQuery(qParam)
  } catch (err) {
    console.warn('[pages/search] Error parsing search syntax:', err)
    syntaxDebug = {
      rawQuery: qParam,
      isValid: false,
      ast: { type: 'boolean', children: [] },
      parsed: { and: [], or: [] },
      warnings: [{ message: 'Failed to parse search syntax' }],
      formattedQuery: qParam,
    }
  }

  let layoutProps = { theme: null }
  try {
    layoutProps = await getLayoutProps()
  } catch (err) {
    console.error('[pages/search] Error fetching layout props:', err)
  }

  return {
    props: {
      query: qParam,
      products,
      collections,
      pages,
      sortBy: sortByParam,
      unavailableProducts,
      prefixOption,
      syntaxDebug,
      ...layoutProps,
    },
  }
}

export default function SearchPage({
  query,
  products,
  collections,
  pages,
  sortBy,
  unavailableProducts,
  prefixOption,
  syntaxDebug,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'collections' | 'pages'>('all')
  const [showSyntaxInspector, setShowSyntaxInspector] = useState(false)

  const totalResults = products.length + collections.length + pages.length

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    {
      label: query ? `Search: "${query}"` : 'Search Catalog',
      isCurrent: true,
      count: totalResults,
    },
  ]

  const handleSortChange = (newSort: string) => {
    router.push({
      pathname: '/search',
      query: {
        ...router.query,
        sort_by: newSort,
      },
    })
  }

  const handleAvailabilityChange = (newAvailability: string) => {
    router.push({
      pathname: '/search',
      query: {
        ...router.query,
        'options[unavailable_products]': newAvailability,
      },
    })
  }

  const handleSearchSubmit = (newQuery: string) => {
    router.push({
      pathname: '/search',
      query: {
        ...router.query,
        q: newQuery,
      },
    })
  }

  return (
    <>
      <DynamicSEO
        title={query ? `Search: "${query}" | DisplayCellPros` : 'Search Product Catalog | DisplayCellPros'}
        description={`Search results for "${query}" across screen replacements, hardware parts, and repair guides.`}
      />

      <div className="min-h-screen bg-gray-50/60 pb-20">
        {/* Top Breadcrumbs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Breadcrumbs
            items={breadcrumbs}
            variant="contained"
            showHomeIcon={true}
            showBackOnMobile={true}
          />
        </div>

        {/* Search Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="max-w-3xl">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                {query ? (
                  <>
                    Search Results for <span className="text-blue-600">&ldquo;{query}&rdquo;</span>
                  </>
                ) : (
                  'Search Catalog'
                )}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Powered by Shopify Search Query Syntax. Supports field filters (<code>vendor:</code>,{' '}
                <code>price:&gt;</code>, <code>tag:</code>), boolean logic (<code>AND</code>,{' '}
                <code>OR</code>, <code>NOT</code>), exact phrases (<code>&quot;&quot;</code>), and wildcards (<code>*</code>).
              </p>
            </div>

            {/* Predictive Search Bar with ARIA Combobox */}
            <div className="mt-6">
              <PredictiveSearch
                id="main-storefront-search"
                initialQuery={query}
                onSearchSubmit={handleSearchSubmit}
                showSyntaxTips={true}
                placeholder="Search products, brands, or syntax (e.g. vendor:Samsung price:>50)..."
              />
            </div>

            {/* Syntax Inspector Toggle */}
            {query && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-gray-500">
                  {syntaxDebug.isValid ? (
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Valid Shopify Syntax
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-700 font-medium">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      {syntaxDebug.warnings[0]?.message}
                    </span>
                  )}
                  <span>•</span>
                  <span className="font-mono text-gray-600 truncate max-w-md">
                    GraphQL Query: {syntaxDebug.formattedQuery || query}
                  </span>
                </div>

                <button
                  type="button"
                  id="toggle-syntax-inspector"
                  onClick={() => setShowSyntaxInspector((prev) => !prev)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-mono transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showSyntaxInspector ? 'Hide AST Debugger' : 'Inspect Search AST'}</span>
                </button>
              </div>
            )}

            {/* Syntax Inspector Panel */}
            {showSyntaxInspector && (
              <div className="mt-4 p-4 bg-gray-900 text-gray-100 rounded-xl font-mono text-xs overflow-x-auto">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800 text-gray-400 mb-3">
                  <span className="font-semibold text-gray-300">Shopify Search Query AST & Diagnostics</span>
                  <span>Shopify Search Grammar v1</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 mb-1 text-[11px] uppercase">Query AST Structure:</div>
                    <pre className="bg-black/50 p-3 rounded text-emerald-400 overflow-x-auto text-[11px]">
                      {JSON.stringify(syntaxDebug.ast, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1 text-[11px] uppercase">Parsed Clauses (extensions.search):</div>
                    <pre className="bg-black/50 p-3 rounded text-blue-400 overflow-x-auto text-[11px]">
                      {JSON.stringify(syntaxDebug.parsed, null, 2)}
                    </pre>
                    {syntaxDebug.warnings.length > 0 && (
                      <div className="mt-3 text-amber-400 text-[11px]">
                        <div className="font-semibold">Warnings:</div>
                        <ul className="list-disc pl-4 mt-1">
                          {syntaxDebug.warnings.map((w, idx) => (
                            <li key={idx}>{w.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search Results Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
            {/* Resource Type Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                All ({totalResults})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'products'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Products ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('collections')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'collections'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Collections ({collections.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pages')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'pages'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Pages ({pages.length})
              </button>
            </div>

            {/* Filter & Sort Selectors conforming to Shopify storefront search specification */}
            <div className="flex items-center gap-3">
              {/* Unavailable Products Filter */}
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <label htmlFor="unavailable-select" className="hidden sm:inline">
                  Availability:
                </label>
                <select
                  id="unavailable-select"
                  value={unavailableProducts}
                  onChange={(e) => handleAvailabilityChange(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="last">Unavailable Last</option>
                  <option value="hide">Hide Unavailable</option>
                  <option value="show">Show All</option>
                </select>
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <label htmlFor="sort-select" className="hidden sm:inline">
                  Sort:
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price-ascending">Price: Low to High</option>
                  <option value="price-descending">Price: High to Low</option>
                  <option value="title-ascending">Title: A to Z</option>
                  <option value="title-descending">Title: Z to A</option>
                  <option value="created-descending">Newest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Display */}
          {totalResults === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center mt-6">
              <PackageX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900">
                No results found for &ldquo;{query}&rdquo;
              </h2>
              <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                Check your spelling or try alternative keywords and Shopify syntax filters.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSearchSubmit('Samsung')}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs rounded-lg transition-colors"
                >
                  Search &ldquo;Samsung&rdquo;
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchSubmit('vendor:Samsung price:>50')}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs rounded-lg transition-colors font-mono"
                >
                  vendor:Samsung price:&gt;50
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchSubmit('tag:oled')}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs rounded-lg transition-colors font-mono"
                >
                  tag:oled
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-10">
              {/* Product Results */}
              {(activeTab === 'all' || activeTab === 'products') && products.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-900">
                      Products ({products.length})
                    </h2>
                    {activeTab === 'all' && products.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('products')}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        View all {products.length} products →
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product, idx) => (
                      <ProductCard key={product.id} product={product} index={idx} />
                    ))}
                  </div>
                </div>
              )}

              {/* Collection Results */}
              {(activeTab === 'all' || activeTab === 'collections') && collections.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-4">
                    Collections ({collections.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collections.map((col) => (
                      <Link
                        key={col.id}
                        href={col.url}
                        className="flex items-center gap-3 p-4 bg-white border border-gray-200 hover:border-blue-300 rounded-xl transition-all shadow-xs hover:shadow-sm"
                      >
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                          <Folder className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {col.title}
                          </h3>
                          <span className="text-xs text-blue-600 mt-0.5 inline-block">
                            Browse Collection →
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Pages Results */}
              {(activeTab === 'all' || activeTab === 'pages') && pages.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-4">
                    Pages & Guides ({pages.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pages.map((pg) => (
                      <Link
                        key={pg.url}
                        href={pg.url}
                        className="flex items-start gap-3 p-4 bg-white border border-gray-200 hover:border-blue-300 rounded-xl transition-all shadow-xs"
                      >
                        <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900">{pg.title}</h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{pg.summary}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
