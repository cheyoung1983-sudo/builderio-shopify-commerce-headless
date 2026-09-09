import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Search,
  RotateCcw,
  PackageOpen,
  Tag,
  ShoppingBag,
  Check,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  Layers,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import {
  fetchAllAvailableProducts,
  ShopifyProductNode,
  StorefrontGraphQLError,
} from '../../services/shopify'
import { ProductDetail } from './ProductDetail'
import { ProductGridSkeleton } from './ProductGridSkeleton'
import { SearchBar } from './SearchBar'
import { CartContext } from '../../context/CartContext'

export interface ProductGridProps {
  /** Optional pre-fetched products (e.g. from getStaticProps / getServerSideProps) */
  initialProducts?: ShopifyProductNode[]
  /** Section title */
  title?: string
  /** Section subtitle */
  subtitle?: string
  /** Whether to show the search, filter tags, and sort controls */
  showControls?: boolean
  /** Default search query filter to apply */
  initialQuery?: string
  /** Maximum products to display / load */
  limit?: number
  /** Callback triggered when a product is clicked */
  onProductClick?: (product: ShopifyProductNode) => void
  /** Whether clicking a product opens the rich ProductDetail modal directly (default: true) */
  enableModalQuickView?: boolean
  /** Additional container classes */
  className?: string
  /** Base URL path for product detail link (default: '/product') */
  productBaseUrl?: string
  /** Optional callback fired when search query changes */
  onSearchChange?: (query: string) => void
}

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'title-asc' | 'title-desc'

export const ProductGrid: React.FC<ProductGridProps> = ({
  initialProducts,
  title = 'Available Products',
  subtitle = 'Browse genuine OEM and premium replacement parts and accessories directly from the live catalog.',
  showControls = true,
  initialQuery = '',
  limit,
  onProductClick,
  enableModalQuickView = true,
  className = '',
  productBaseUrl = '/product',
  onSearchChange,
}) => {
  const [baseProducts, setBaseProducts] = useState<ShopifyProductNode[]>(initialProducts || [])
  const [products, setProducts] = useState<ShopifyProductNode[]>(initialProducts || [])
  const [loading, setLoading] = useState<boolean>(!initialProducts || initialProducts.length === 0)
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery)
  const [selectedTag, setSelectedTag] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<SortOption>('featured')
  const [addedItemHandle, setAddedItemHandle] = useState<string | null>(null)
  const [selectedProductHandle, setSelectedProductHandle] = useState<string | null>(null)
  const [quickAddingId, setQuickAddingId] = useState<string | null>(null)

  const cart = useContext(CartContext)

  const handleQuickAddToCart = async (product: ShopifyProductNode, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!cart || !product) return

    setQuickAddingId(product.id)
    try {
      const firstVariant = product.variants?.edges?.[0]?.node
      const variantId = firstVariant?.id || product.id
      const price = firstVariant?.price?.amount || product.priceRange.minVariantPrice.amount
      const currency = firstVariant?.price?.currencyCode || product.priceRange.minVariantPrice.currencyCode
      const comparePrice = firstVariant?.compareAtPrice?.amount || product.compareAtPriceRange?.minVariantPrice?.amount
      const imageUrl = product.featuredImage?.url || product.images?.edges?.[0]?.node?.url

      await cart.addItem({
        variantId,
        quantity: 1,
        title: product.title,
        handle: product.handle,
        variantTitle: firstVariant?.title,
        price: { amount: price, currencyCode: currency },
        compareAtPrice: comparePrice ? { amount: comparePrice, currencyCode: currency } : null,
        image: imageUrl || null,
        vendor: product.vendor,
      })

      setAddedItemHandle(product.handle)
      setTimeout(() => {
        setAddedItemHandle(null)
      }, 1500)
    } catch (err) {
      console.warn('Quick add to cart notice:', err)
    } finally {
      setQuickAddingId(null)
    }
  }

  // Handle clicking a product to show ProductDetail
  const handleProductCardClick = (
    product: ShopifyProductNode,
    e?: React.MouseEvent
  ) => {
    if (enableModalQuickView) {
      if (e) {
        // Prevent full page reload if standard left click without modifiers
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault()
        }
      }
      setSelectedProductHandle(product.handle)
    }
    onProductClick?.(product)
  }

  // Fetch products from shopify.ts Storefront service
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchAllAvailableProducts({
        maxProducts: limit,
        onlyAvailable: true,
      })

      if (!res.ok && res.products.length === 0) {
        const msg = res.errors?.[0]?.message || 'Failed to fetch products from Storefront API'
        setError(msg)
      } else {
        setBaseProducts(res.products)
        setProducts(res.products)
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while loading products.')
    } finally {
      setLoading(false)
    }
  }, [limit])

  // Initial load if not provided
  useEffect(() => {
    if (!initialProducts || initialProducts.length === 0) {
      loadProducts()
    } else {
      setBaseProducts(initialProducts)
      setProducts(initialProducts)
    }
  }, [initialProducts, loadProducts])

  // Handle start of Storefront query
  const handleQueryStart = useCallback(() => {
    setIsSearching(true)
    setSearchError(null)
  }, [])

  // Handle products returned from Shopify Storefront API
  const handleProductsFetched = useCallback(
    (
      fetchedProducts: ShopifyProductNode[],
      term: string,
      errors?: StorefrontGraphQLError[]
    ) => {
      setIsSearching(false)
      setSearchQuery(term)
      onSearchChange?.(term)

      if (!term.trim()) {
        // Restoring base catalog
        setProducts(baseProducts)
        setSearchError(null)
        return
      }

      if (errors && errors.length > 0 && fetchedProducts.length === 0) {
        setSearchError(errors[0].message)
      } else {
        setSearchError(null)
      }

      setProducts(fetchedProducts)
    },
    [baseProducts, onSearchChange]
  )

  // Handle clear/reset search
  const handleResetSearch = useCallback(() => {
    setSearchQuery('')
    setSelectedTag('ALL')
    setProducts(baseProducts)
    setSearchError(null)
    onSearchChange?.('')
  }, [baseProducts, onSearchChange])

  // Extract unique tags or product types for quick filter chips
  const filterTags = useMemo(() => {
    const tagsSet = new Set<string>()
    const source = baseProducts.length > 0 ? baseProducts : products
    source.forEach((p) => {
      if (p.productType && p.productType.trim()) {
        tagsSet.add(p.productType.trim())
      }
      if (p.vendor && p.vendor.trim()) {
        tagsSet.add(p.vendor.trim())
      }
      p.tags?.forEach((t) => {
        if (t && t.length < 20) tagsSet.add(t)
      })
    })
    return ['ALL', ...Array.from(tagsSet).slice(0, 7)]
  }, [baseProducts, products])

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products]

    // Selected tag filter
    if (selectedTag !== 'ALL') {
      const tagLower = selectedTag.toLowerCase()
      result = result.filter(
        (p) =>
          p.productType?.toLowerCase() === tagLower ||
          p.vendor?.toLowerCase() === tagLower ||
          p.tags?.some((t) => t.toLowerCase() === tagLower)
      )
    }

    // Sorting
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => {
          const priceA = parseFloat(a.priceRange.minVariantPrice.amount || '0')
          const priceB = parseFloat(b.priceRange.minVariantPrice.amount || '0')
          return priceA - priceB
        })
        break
      case 'price-desc':
        result.sort((a, b) => {
          const priceA = parseFloat(a.priceRange.minVariantPrice.amount || '0')
          const priceB = parseFloat(b.priceRange.minVariantPrice.amount || '0')
          return priceB - priceA
        })
        break
      case 'title-asc':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'title-desc':
        result.sort((a, b) => b.title.localeCompare(a.title))
        break
      case 'featured':
      default:
        break
    }

    return result
  }, [products, selectedTag, sortBy])

  // Format currency
  const formatPrice = (amount?: string, currencyCode: string = 'USD') => {
    if (!amount) return ''
    const num = parseFloat(amount)
    if (isNaN(num)) return `${currencyCode} ${amount}`
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(num)
  }

  return (
    <section
      id="shopify-storefront-products-section"
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-2 border border-emerald-200/60">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Storefront API Catalog</span>
          </div>
          <h2
            id="storefront-products-title"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm sm:text-base text-neutral-600 max-w-2xl">{subtitle}</p>
          )}
        </div>

        {/* Total count badge */}
        {!loading && (
          <div className="text-xs sm:text-sm font-medium text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-lg self-start md:self-auto flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-neutral-400" />
            <span>
              {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'item' : 'items'} available
            </span>
          </div>
        )}
      </div>

      {/* Interactive Controls & Filters */}
      {showControls && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-start justify-between">
            {/* Storefront API Search Bar Component */}
            <div className="flex-1 max-w-2xl">
              <SearchBar
                id="storefront-product-search-bar"
                value={searchQuery}
                placeholder="Search screen replacements, parts, models by title or keyword..."
                onQueryStart={handleQueryStart}
                onProductsFetched={handleProductsFetched}
                onChange={(val) => {
                  setSearchQuery(val)
                  if (!val.trim()) {
                    setProducts(baseProducts)
                    setSearchError(null)
                  }
                }}
                onError={(err) => {
                  setIsSearching(false)
                  setSearchError(err)
                }}
                isLoading={isSearching}
                resultCount={filteredProducts.length}
                suggestions={['Galaxy S22', 'OLED', 'LCD', 'Ultra', 'Samsung']}
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-end lg:self-start pt-1">
              <label
                htmlFor="storefront-sort-select"
                className="text-xs font-medium text-neutral-500 flex items-center gap-1 whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Sort by:
              </label>
              <select
                id="storefront-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-sm bg-white border border-neutral-300 rounded-xl px-3 py-2 text-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
              >
                <option value="featured">Featured (Default)</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="title-asc">Title: A to Z</option>
                <option value="title-desc">Title: Z to A</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Tag Chips */}
          {filterTags.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none pt-1">
              <span className="text-neutral-400 font-medium whitespace-nowrap flex items-center gap-1 pl-0.5">
                <Tag className="w-3 h-3" />
                Filter:
              </span>
              {filterTags.map((tag) => {
                const isActive = selectedTag === tag
                return (
                  <button
                    key={tag}
                    id={`filter-chip-${tag.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                      isActive
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {tag === 'ALL' ? 'All Products' : tag}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Loading Skeleton Grid */}
      {(loading || isSearching) && (
        <ProductGridSkeleton
          count={Math.min(limit || 8, 8)}
          className="mt-8"
        />
      )}

      {/* Error State */}
      {!loading && !isSearching && (error || searchError) && (
        <div
          id="storefront-products-error"
          className="mt-8 p-6 rounded-xl border border-red-200 bg-red-50/70 text-red-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm sm:text-base text-red-900">
                Shopify Storefront API Search Notice
              </h4>
              <p className="text-xs sm:text-sm text-red-700 mt-0.5">
                {searchError || error}
              </p>
            </div>
          </div>
          <button
            id="storefront-retry-fetch-btn"
            onClick={handleResetSearch}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors shadow-sm self-end sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Catalog
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !isSearching && !error && !searchError && filteredProducts.length === 0 && (
        <div
          id="storefront-products-empty"
          className="mt-12 py-16 px-4 text-center bg-neutral-50 border border-dashed border-neutral-300 rounded-2xl max-w-xl mx-auto"
        >
          <div className="w-14 h-14 bg-neutral-200/70 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-500">
            <PackageOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-neutral-900">
            No matching products found
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedTag !== 'ALL'
              ? `No products matched "${searchQuery || selectedTag}" in the live Shopify Storefront catalog. Try more general keywords (e.g. "OLED", "Galaxy") or reset your search.`
              : 'There are currently no available products published on the Storefront.'}
          </p>
          {(searchQuery || selectedTag !== 'ALL') && (
            <button
              id="storefront-reset-filters-btn"
              onClick={handleResetSearch}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Search & Catalog
            </button>
          )}
        </div>
      )}

      {/* Responsive Products Grid */}
      {!loading && !isSearching && !error && !searchError && filteredProducts.length > 0 && (
        <div
          id="storefront-products-grid"
          className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {filteredProducts.map((product) => {
            const featuredImage =
              product.featuredImage?.url || product.images?.edges?.[0]?.node?.url
            const imageAlt =
              product.featuredImage?.altText ||
              product.images?.edges?.[0]?.node?.altText ||
              product.title

            const minPrice = product.priceRange?.minVariantPrice?.amount
            const currency = product.priceRange?.minVariantPrice?.currencyCode || 'USD'
            const comparePrice = product.compareAtPriceRange?.minVariantPrice?.amount
            const isOnSale =
              comparePrice && parseFloat(comparePrice) > parseFloat(minPrice || '0')

            const variantCount = product.variants?.edges?.length || 0

            return (
              <div
                key={product.id}
                id={`product-card-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
                className="group relative bg-white border border-neutral-200/80 rounded-xl overflow-hidden hover:border-neutral-300 hover:shadow-lg transition-all duration-200 flex flex-col"
              >
                {/* Image Container with Link */}
                <Link
                  href={`${productBaseUrl}/${product.handle}`}
                  onClick={(e) => handleProductCardClick(product, e)}
                  className="block relative aspect-square w-full bg-neutral-100 overflow-hidden cursor-pointer"
                >
                  {featuredImage ? (
                    <Image
                      src={featuredImage}
                      alt={imageAlt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 gap-2">
                      <PackageOpen className="w-10 h-10 stroke-[1.5]" />
                      <span className="text-xs">No image preview</span>
                    </div>
                  )}

                  {/* Badges Overlay */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
                    {isOnSale && (
                      <span className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                        Sale
                      </span>
                    )}
                    {product.productType && (
                      <span className="bg-neutral-900/80 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-sm max-w-[120px] truncate">
                        {product.productType}
                      </span>
                    )}
                  </div>

                  {/* Stock indicator badge */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-sm inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      In Stock
                    </span>
                  </div>

                  {/* Quick View Hover Hint */}
                  <div className="absolute inset-x-0 bottom-0 py-2 bg-neutral-950/70 backdrop-blur-xs text-white text-[11px] font-medium text-center opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <span>Click for Quick View</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </Link>

                {/* Card Body */}
                <div className="p-4 flex flex-col flex-1">
                  {/* Vendor / Brand */}
                  {product.vendor && (
                    <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 mb-1">
                      {product.vendor}
                    </div>
                  )}

                  {/* Product Title */}
                  <h3 className="font-semibold text-neutral-900 text-sm sm:text-base leading-snug group-hover:text-emerald-700 transition-colors line-clamp-2 mb-2">
                    <Link
                      href={`${productBaseUrl}/${product.handle}`}
                      onClick={(e) => handleProductCardClick(product, e)}
                      className="hover:underline"
                    >
                      {product.title}
                    </Link>
                  </h3>

                  {/* Short description excerpt if available */}
                  {product.description && (
                    <p className="text-xs text-neutral-500 line-clamp-2 mb-3">
                      {product.description}
                    </p>
                  )}

                  {/* Price & Action Area */}
                  <div className="mt-auto pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base sm:text-lg font-bold text-neutral-900">
                          {formatPrice(minPrice, currency)}
                        </span>
                        {isOnSale && (
                          <span className="text-xs text-neutral-400 line-through">
                            {formatPrice(comparePrice, currency)}
                          </span>
                        )}
                      </div>
                      {variantCount > 1 && (
                        <span className="text-[10px] text-neutral-500">
                          {variantCount} variants
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        id={`quick-add-btn-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
                        onClick={(e) => handleQuickAddToCart(product, e)}
                        disabled={quickAddingId === product.id}
                        aria-label={`Add ${product.title} to shopping bag`}
                        className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          addedItemHandle === product.handle
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600'
                        }`}
                        title="Add to Shopping Bag"
                      >
                        {addedItemHandle === product.handle ? (
                          <>
                            <Check className="w-3.5 h-3.5 animate-scaleIn" />
                            <span className="hidden sm:inline">Added!</span>
                          </>
                        ) : quickAddingId === product.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Add</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        id={`view-btn-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
                        onClick={(e) => handleProductCardClick(product, e)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-900 hover:text-white text-neutral-800 transition-colors cursor-pointer"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductDetail
        handle={selectedProductHandle}
        asModal={true}
        isOpen={Boolean(selectedProductHandle)}
        onClose={() => setSelectedProductHandle(null)}
        productBaseUrl={productBaseUrl}
      />
    </section>
  )
}

export default ProductGrid
