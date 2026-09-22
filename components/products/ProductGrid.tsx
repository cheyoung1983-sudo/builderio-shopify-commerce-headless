import React, { useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react'
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
  ChevronDown,
  ArrowUpDown,
  ArrowLeftRight,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Layers,
  AlertCircle,
  ExternalLink,
  Eye,
  X,
  Keyboard,
} from 'lucide-react'
import {
  fetchAllAvailableProducts,
  ShopifyProductNode,
  StorefrontGraphQLError,
} from '../../services/shopify'
import { ProductDetail } from './ProductDetail'
import { ProductComparisonModal } from './ProductComparisonModal'
import { ComparisonDock } from './ComparisonDock'
import { ProductGridSkeleton } from './ProductGridSkeleton'
import { ProductCard } from './ProductCard'
import { ProductCardSkeleton } from './ProductCardSkeleton'
import { SearchBar } from './SearchBar'
import { ProductFilterSidebar, FilterState } from './ProductFilterSidebar'
import { CartContext } from '../../context/CartContext'
import { useQuickView } from '../../context/QuickViewContext'
import { Breadcrumbs, BreadcrumbItem } from '../common/Breadcrumbs'

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
  /** Optional category/tag filter to apply initially */
  initialCategory?: string
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
  /** Optional custom breadcrumbs array, or auto-generated if showBreadcrumbs is true */
  breadcrumbs?: BreadcrumbItem[]
  /** Whether to render breadcrumb navigation above the section */
  showBreadcrumbs?: boolean
  /** Explicit loading state override for external controllers */
  isLoading?: boolean
}

export type ShopifySortOption =
  | 'relevance'
  | 'price-asc'
  | 'price-desc'
  | 'best-selling'
  | 'title-asc'
  | 'title-desc'

export interface ShopifySortConfig {
  value: ShopifySortOption
  label: string
  sortKey: 'RELEVANCE' | 'PRICE' | 'TITLE' | 'BEST_SELLING'
  reverse: boolean
  apiParamDescription: string
}

export const SHOPIFY_SORT_CONFIGS: Record<ShopifySortOption, ShopifySortConfig> = {
  relevance: {
    value: 'relevance',
    label: 'Relevance',
    sortKey: 'RELEVANCE',
    reverse: false,
    apiParamDescription: 'sortKey: RELEVANCE, reverse: false',
  },
  'price-asc': {
    value: 'price-asc',
    label: 'Price: Low to High',
    sortKey: 'PRICE',
    reverse: false,
    apiParamDescription: 'sortKey: PRICE, reverse: false',
  },
  'price-desc': {
    value: 'price-desc',
    label: 'Price: High to Low',
    sortKey: 'PRICE',
    reverse: true,
    apiParamDescription: 'sortKey: PRICE, reverse: true',
  },
  'best-selling': {
    value: 'best-selling',
    label: 'Best Selling',
    sortKey: 'BEST_SELLING',
    reverse: false,
    apiParamDescription: 'sortKey: BEST_SELLING, reverse: false',
  },
  'title-asc': {
    value: 'title-asc',
    label: 'Alphabetical: A to Z',
    sortKey: 'TITLE',
    reverse: false,
    apiParamDescription: 'sortKey: TITLE, reverse: false',
  },
  'title-desc': {
    value: 'title-desc',
    label: 'Alphabetical: Z to A',
    sortKey: 'TITLE',
    reverse: true,
    apiParamDescription: 'sortKey: TITLE, reverse: true',
  },
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  initialProducts,
  title = 'Available Products',
  subtitle = 'Browse genuine OEM and premium replacement parts and accessories directly from the live catalog.',
  showControls = true,
  initialQuery = '',
  initialCategory = '',
  limit,
  onProductClick,
  enableModalQuickView = true,
  className = '',
  productBaseUrl = '/product',
  onSearchChange,
  breadcrumbs,
  showBreadcrumbs = false,
  isLoading,
}) => {
  const [baseProducts, setBaseProducts] = useState<ShopifyProductNode[]>(initialProducts || [])
  const [products, setProducts] = useState<ShopifyProductNode[]>(initialProducts || [])
  const [loading, setLoading] = useState<boolean>(!initialProducts || initialProducts.length === 0)
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const isGridLoading = isLoading !== undefined ? isLoading : (loading || isSearching)
  const [isSorting, setIsSorting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery)
  const [prevInitialCategory, setPrevInitialCategory] = useState<string>(initialCategory)
  const [selectedTag, setSelectedTag] = useState<string>(initialCategory || 'ALL')

  if (prevInitialCategory !== initialCategory) {
    setPrevInitialCategory(initialCategory)
    setSelectedTag(initialCategory || 'ALL')
  }
  const [sortBy, setSortBy] = useState<ShopifySortOption>('relevance')
  const [addedItemHandle, setAddedItemHandle] = useState<string | null>(null)
  const [selectedProductHandle, setSelectedProductHandle] = useState<string | null>(null)
  const [quickAddingId, setQuickAddingId] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    minPrice: '',
    maxPrice: '',
    selectedBrands: [],
    inStockOnly: false,
  })
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false)

  // Comparison tool states (up to 3 products)
  const [compareProducts, setCompareProducts] = useState<ShopifyProductNode[]>([])
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false)
  const [compareNotice, setCompareNotice] = useState<string | null>(null)

  const handleToggleCompare = (product: ShopifyProductNode, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setCompareProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id)
      if (exists) {
        return prev.filter((p) => p.id !== product.id)
      }
      if (prev.length >= 3) {
        setCompareNotice('Comparison limit reached: You can compare up to 3 products at a time.')
        setTimeout(() => setCompareNotice(null), 3500)
        return prev
      }
      return [...prev, product]
    })
  }

  const handleRemoveCompare = (productId: string) => {
    setCompareProducts((prev) => prev.filter((p) => p.id !== productId))
  }

  const handleClearCompare = () => {
    setCompareProducts([])
  }

  const cart = useContext(CartContext)
  const { openQuickView } = useQuickView()

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

  // Handle clicking or pressing Enter on a product to show Quick View side panel or trigger callback
  const handleProductCardClick = useCallback((
    product: ShopifyProductNode,
    e?: React.MouseEvent | React.KeyboardEvent
  ) => {
    if (enableModalQuickView) {
      if (e) {
        // Prevent default navigation if standard click or Enter without modifier keys
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault()
        }
      }
      openQuickView(product)
    }
    onProductClick?.(product)
  }, [enableModalQuickView, openQuickView, onProductClick])

  // Fetch products from shopify.ts Storefront service
  const loadProducts = useCallback(
    async (currentSortOption: ShopifySortOption = sortBy, query?: string) => {
      try {
        setLoading(true)
        setError(null)
        const activeSortConfig = SHOPIFY_SORT_CONFIGS[currentSortOption] || SHOPIFY_SORT_CONFIGS.relevance
        const res = await fetchAllAvailableProducts({
          maxProducts: limit,
          onlyAvailable: false,
          query: query?.trim() || undefined,
          sortKey: activeSortConfig.sortKey,
          reverse: activeSortConfig.reverse,
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
    },
    [limit, sortBy]
  )

  // Handle user-initiated sorting change via Shopify API parameters
  const handleSortChange = async (newSort: ShopifySortOption) => {
    setSortBy(newSort)
    const config = SHOPIFY_SORT_CONFIGS[newSort]

    // 1. Instant optimistic reorder for snappy UI response
    setProducts((prev) => {
      const copy = [...prev]
      if (newSort === 'price-asc') {
        copy.sort((a, b) => {
          const priceA = parseFloat(a.priceRange?.minVariantPrice?.amount || '0')
          const priceB = parseFloat(b.priceRange?.minVariantPrice?.amount || '0')
          return priceA - priceB
        })
      } else if (newSort === 'price-desc') {
        copy.sort((a, b) => {
          const priceA = parseFloat(a.priceRange?.minVariantPrice?.amount || '0')
          const priceB = parseFloat(b.priceRange?.minVariantPrice?.amount || '0')
          return priceB - priceA
        })
      } else if (newSort === 'title-asc') {
        copy.sort((a, b) => a.title.localeCompare(b.title))
      } else if (newSort === 'title-desc') {
        copy.sort((a, b) => b.title.localeCompare(a.title))
      }
      return copy
    })

    // 2. Query Shopify Storefront API with sortKey and reverse parameters
    try {
      setIsSorting(true)
      const res = await fetchAllAvailableProducts({
        maxProducts: limit,
        onlyAvailable: false,
        query: searchQuery?.trim() || undefined,
        sortKey: config.sortKey,
        reverse: config.reverse,
      })

      if (res.ok && res.products && res.products.length > 0) {
        setProducts(res.products)
        if (!searchQuery.trim()) {
          setBaseProducts(res.products)
        }
      }
    } catch (err) {
      console.warn('Shopify Storefront sorting request notice:', err)
    } finally {
      setIsSorting(false)
    }
  }

  // Initial load if not provided
  useEffect(() => {
    if (!initialProducts || initialProducts.length === 0) {
      // Fetch on mount when no server-provided products exist;
      // loadProducts sets a loading flag before its await, same
      // sanctioned pattern as the interactive sort/search path.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

    // Availability Filter
    if (filters.inStockOnly) {
      result = result.filter((p) => {
        const available = p.availableForSale ?? p.variants?.edges?.[0]?.node?.availableForSale ?? true
        return available
      })
    }

    // Price Range Filter
    if (filters.minPrice !== '') {
      const min = parseFloat(filters.minPrice)
      if (!isNaN(min)) {
        result = result.filter((p) => {
          const price = parseFloat(p.priceRange?.minVariantPrice?.amount || '0')
          return price >= min
        })
      }
    }
    if (filters.maxPrice !== '') {
      const max = parseFloat(filters.maxPrice)
      if (!isNaN(max)) {
        result = result.filter((p) => {
          const price = parseFloat(p.priceRange?.minVariantPrice?.amount || '0')
          return price <= max
        })
      }
    }

    // Brand Filter
    if (filters.selectedBrands.length > 0) {
      result = result.filter((p) => p.vendor && filters.selectedBrands.includes(p.vendor.trim()))
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
      case 'relevance':
      case 'best-selling':
      default:
        // Preserves server-side Storefront API ranking
        break
    }

    return result
  }, [products, selectedTag, sortBy, filters])

  // Format currency
  const formatPrice = useCallback((amount?: string, currencyCode: string = 'USD') => {
    if (!amount) return ''
    const num = parseFloat(amount)
    if (isNaN(num)) return `${currencyCode} ${amount}`
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(num)
  }, [])

  // Grid accessibility & keyboard navigation state
  const gridRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [focusedIndex, setFocusedIndex] = useState<number>(0)
  const [keyboardActive, setKeyboardActive] = useState<boolean>(false)
  const [announcement, setAnnouncement] = useState<string>('')

  // Safe focused index clamped within current filtered products length
  const safeFocusedIndex = Math.min(
    focusedIndex,
    Math.max(0, filteredProducts.length - 1)
  )

  // Dynamically compute the number of columns in the grid
  const getColumnCount = useCallback(() => {
    if (!gridRef.current) return 3
    try {
      const computed = window.getComputedStyle(gridRef.current)
      const templateCols = computed.getPropertyValue('grid-template-columns')
      const count = templateCols.split(' ').filter(Boolean).length
      return count > 0 ? count : 3
    } catch {
      return 3
    }
  }, [])

  // Programmatically focus a specific card and notify screen readers
  const focusCardAtIndex = useCallback((targetIndex: number) => {
    if (filteredProducts.length === 0) return
    const clampedIndex = Math.max(0, Math.min(filteredProducts.length - 1, targetIndex))
    setFocusedIndex(clampedIndex)
    setKeyboardActive(true)

    const targetEl = cardRefs.current[clampedIndex]
    if (targetEl) {
      targetEl.focus()
      targetEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    }

    const prod = filteredProducts[clampedIndex]
    if (prod) {
      const price = prod.priceRange?.minVariantPrice?.amount
        ? formatPrice(prod.priceRange.minVariantPrice.amount, prod.priceRange.minVariantPrice.currencyCode)
        : ''
      setAnnouncement(`Product ${clampedIndex + 1} of ${filteredProducts.length}: ${prod.title}, ${price}. Press Enter for Quick View, Escape to close.`)
    }
  }, [filteredProducts, formatPrice])

  // Grid keyboard event dispatcher for arrow keys, Enter, and Escape
  const handleGridKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLDivElement>,
    cardIndex: number,
    product: ShopifyProductNode
  ) => {
    const total = filteredProducts.length
    if (total === 0) return

    const cols = getColumnCount()

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault()
        const nextIdx = (cardIndex + 1) % total
        focusCardAtIndex(nextIdx)
        break
      }
      case 'ArrowLeft': {
        e.preventDefault()
        const prevIdx = (cardIndex - 1 + total) % total
        focusCardAtIndex(prevIdx)
        break
      }
      case 'ArrowDown': {
        e.preventDefault()
        const nextRowIdx = Math.min(total - 1, cardIndex + cols)
        focusCardAtIndex(nextRowIdx)
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        const prevRowIdx = Math.max(0, cardIndex - cols)
        focusCardAtIndex(prevRowIdx)
        break
      }
      case 'Home': {
        e.preventDefault()
        focusCardAtIndex(0)
        break
      }
      case 'End': {
        e.preventDefault()
        focusCardAtIndex(total - 1)
        break
      }
      case 'Enter':
      case ' ': {
        // If Enter or Space pressed on the card itself
        const target = e.target as HTMLElement
        const isInnerButton =
          target !== e.currentTarget &&
          ['BUTTON', 'A', 'INPUT', 'SELECT'].includes(target.tagName)
        if (!isInnerButton) {
          e.preventDefault()
          e.stopPropagation()
          handleProductCardClick(product, e)
        }
        break
      }
      case 'Escape': {
        e.preventDefault()
        setKeyboardActive(false)
        if (e.currentTarget) {
          e.currentTarget.blur()
        }
        break
      }
    }
  }, [filteredProducts, getColumnCount, focusCardAtIndex, handleProductCardClick])

  return (
    <section
      id="shopify-storefront-products-section"
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}
    >
      {/* Breadcrumb Navigation above catalog header */}
      {(showBreadcrumbs || breadcrumbs) && (
        <div className="mb-6">
          <Breadcrumbs
            id="storefront-product-grid-breadcrumbs"
            variant="contained"
            showHomeIcon={true}
            showBackOnMobile={true}
            items={
              breadcrumbs || [
                { label: 'Home', href: '/' },
                {
                  label: 'Products',
                  href: '/products',
                  isCurrent:
                    !title ||
                    title === 'Products' ||
                    title === 'Catalog & Screen Replacements' ||
                    title === 'Available Products',
                },
                ...(title &&
                title !== 'Products' &&
                title !== 'Catalog & Screen Replacements' &&
                title !== 'Available Products'
                  ? [{ label: title, isCurrent: true, count: filteredProducts.length }]
                  : []),
              ]
            }
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-2 border border-emerald-200/60">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Spokane On-Site Services &amp; Parts</span>
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
          <div className="text-xs sm:text-sm font-medium text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-lg self-start md:self-auto flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-neutral-500" />
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
                sortKey={SHOPIFY_SORT_CONFIGS[sortBy].sortKey}
                reverse={SHOPIFY_SORT_CONFIGS[sortBy].reverse}
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

            {/* Shopify Storefront API Sorting Dropdown */}
            <div
              id="shopify-sorting-controls"
              className="flex flex-col sm:flex-row sm:items-center gap-2.5 self-end lg:self-start pt-1 shrink-0"
            >
              <div className="flex items-center gap-2">
                <label
                  htmlFor="storefront-sort-select"
                  className="text-xs font-semibold text-neutral-600 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Sort by:</span>
                </label>
                <div className="relative inline-block">
                  <select
                    id="storefront-sort-select"
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value as ShopifySortOption)}
                    disabled={loading}
                    aria-label="Reorder products using Shopify Storefront API parameters"
                    className="text-xs sm:text-sm font-medium bg-white border border-neutral-300 hover:border-neutral-400 rounded-xl pl-3 pr-8 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs transition-colors appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="best-selling">Best Selling</option>
                    <option value="title-asc">Alphabetical: A to Z</option>
                    <option value="title-desc">Alphabetical: Z to A</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-neutral-600">
                    {isSorting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Compare Quick Button if items selected */}
              {compareProducts.length > 0 && (
                <button
                  type="button"
                  id="controls-compare-now-btn"
                  onClick={() => setIsCompareModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all cursor-pointer animate-scaleIn"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Compare ({compareProducts.length}/3)</span>
                </button>
              )}

              {/* Mobile Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-neutral-300 text-neutral-800 shadow-xs hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                <span>Filters</span>
                {(filters.minPrice || filters.maxPrice || filters.selectedBrands.length > 0 || filters.inStockOnly) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Filter Tag Chips */}
          {filterTags.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none pt-1">
              <span className="text-neutral-600 font-medium whitespace-nowrap flex items-center gap-1 pl-0.5">
                <Tag className="w-3 h-3" />
                Filter:
              </span>
              {filterTags.map((tag) => {
                const isActive = selectedTag === tag
                return (
                  <button
                    key={tag}
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

      {/* Main Content Layout with Sidebar & Products Grid */}
      <div className="mt-8 flex flex-col lg:flex-row gap-8 items-start">
        {/* Filter Sidebar */}
        <ProductFilterSidebar
          products={baseProducts}
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={() => setFilters({ minPrice: '', maxPrice: '', selectedBrands: [], inStockOnly: false })}
          isOpen={isMobileFilterOpen}
          onClose={() => setIsMobileFilterOpen(false)}
        />

        {/* Main Products Area */}
        <div className="flex-1 w-full min-w-0">
          {/* Loading Skeleton Grid */}
          {isGridLoading && (
            <ProductGridSkeleton
              count={Math.min(limit || 8, 8)}
            />
          )}

          {/* Error State */}
          {!isGridLoading && (error || searchError) && (
            <div
              id="storefront-products-error"
              className="p-6 rounded-xl border border-red-200 bg-red-50/70 text-red-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
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
          {!isGridLoading && !error && !searchError && filteredProducts.length === 0 && (
            <div
              id="storefront-products-empty"
              className="py-16 px-4 text-center bg-neutral-50 border border-dashed border-neutral-300 rounded-2xl max-w-xl mx-auto"
            >
              <div className="w-14 h-14 bg-neutral-200/70 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-500">
                <PackageOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-neutral-900">
                No matching products found
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
                {searchQuery || selectedTag !== 'ALL' || filters.minPrice || filters.maxPrice || filters.selectedBrands.length > 0 || filters.inStockOnly
                  ? `No products matched your selected filters in the live Shopify Storefront catalog. Try broadening your price range, clearing brand filters, or resetting search.`
                  : 'There are currently no available products published on the Storefront.'}
              </p>
              {(searchQuery || selectedTag !== 'ALL' || filters.minPrice || filters.maxPrice || filters.selectedBrands.length > 0 || filters.inStockOnly) && (
                <button
                  id="storefront-reset-filters-btn"
                  onClick={() => {
                    handleResetSearch()
                    setFilters({ minPrice: '', maxPrice: '', selectedBrands: [], inStockOnly: false })
                  }}
                  className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset All Filters & Search
                </button>
              )}
            </div>
          )}

          {/* Keyboard Accessibility Instruction & Shortcut Bar */}
          {!isGridLoading && !error && !searchError && filteredProducts.length > 0 && (
            <div
              id="product-grid-keyboard-hint-bar"
              className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 mb-4 rounded-xl bg-neutral-50/90 border border-neutral-200/70 text-xs text-neutral-600 shadow-2xs"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 font-semibold text-neutral-800">
                  <Keyboard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Keyboard Navigation:</span>
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-neutral-300 shadow-2xs font-bold text-neutral-800">←</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-neutral-300 shadow-2xs font-bold text-neutral-800">→</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-neutral-300 shadow-2xs font-bold text-neutral-800">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-neutral-300 shadow-2xs font-bold text-neutral-800">↓</kbd>
                  <span className="text-neutral-500 font-sans ml-0.5">navigate</span>
                </span>
                <span className="text-neutral-300 hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-neutral-300 shadow-2xs font-bold text-neutral-800">Enter</kbd>
                  <span className="text-neutral-500 font-sans ml-0.5">Quick View</span>
                </span>
                <span className="text-neutral-300 hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-neutral-300 shadow-2xs font-bold text-neutral-800">Esc</kbd>
                  <span className="text-neutral-500 font-sans ml-0.5">Close</span>
                </span>
              </div>

              {filteredProducts.length > 0 && (
                <span className="text-[11px] font-mono text-neutral-500">
                  Item {safeFocusedIndex + 1} of {filteredProducts.length}
                </span>
              )}
            </div>
          )}

          {/* Screen reader live announcement */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {announcement}
          </div>

          {/* Responsive Products Grid */}
          {!isGridLoading && !error && !searchError && filteredProducts.length > 0 && (
            <div
              id="storefront-products-grid"
              ref={gridRef}
              role="region"
              aria-label="Product catalog grid - use arrow keys to navigate between products, Enter to open quick view, Escape to close"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-6"
            >
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  cardRef={(el) => {
                    cardRefs.current[index] = el
                  }}
                  product={product}
                  index={index}
                  tabIndex={safeFocusedIndex === index ? 0 : -1}
                  isFocused={keyboardActive && safeFocusedIndex === index}
                  onCardFocus={(idx) => {
                    setFocusedIndex(idx)
                  }}
                  onCardKeyDown={handleGridKeyDown}
                  productBaseUrl={productBaseUrl}
                  isCompared={compareProducts.some((p) => p.id === product.id)}
                  isAddingToCart={quickAddingId === product.id}
                  isAdded={addedItemHandle === product.handle}
                  formatPrice={formatPrice}
                  onProductClick={(p, e) => handleProductCardClick(p, e)}
                  onToggleCompare={(p, e) => handleToggleCompare(p, e)}
                  onQuickAddToCart={(p, e) => handleQuickAddToCart(p, e)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Quick View Modal */}
      {selectedProductHandle && (
        <ProductDetail
          handle={selectedProductHandle}
          asModal={true}
          isOpen={Boolean(selectedProductHandle)}
          onClose={() => setSelectedProductHandle(null)}
          productBaseUrl={productBaseUrl}
        />
      )}

      {/* Floating Comparison Dock (visible when products are selected) */}
      <ComparisonDock
        selectedProducts={compareProducts}
        onOpenModal={() => setIsCompareModalOpen(true)}
        onRemoveProduct={handleRemoveCompare}
        onClearAll={handleClearCompare}
        maxProducts={3}
      />

      {/* Side-by-Side Product Comparison Table Modal Overlay */}
      <ProductComparisonModal
        products={compareProducts}
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        onRemoveProduct={handleRemoveCompare}
        onClearAll={handleClearCompare}
        productBaseUrl={productBaseUrl}
        onSelectMore={() => {
          const grid = document.getElementById('storefront-products-grid')
          grid?.scrollIntoView({ behavior: 'smooth' })
        }}
      />

      {/* Comparison Limit Notice Toast */}
      {compareNotice && (
        <div
          id="comparison-notice-toast"
          role="status"
          aria-live="polite"
          className="fixed top-24 right-4 z-50 bg-neutral-900 text-white border border-neutral-700 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs animate-slide-up"
        >
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-medium">{compareNotice}</span>
          <button
            type="button"
            onClick={() => setCompareNotice(null)}
            className="text-neutral-400 hover:text-white p-0.5 rounded transition-colors ml-1"
            aria-label="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </section>
  )
}

export default ProductGrid
