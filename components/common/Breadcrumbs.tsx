import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ChevronRight, Home, ArrowLeft, Loader2, Tag, Layers } from 'lucide-react'
import { getBaseUrl } from '../../lib/seo'
import {
  fetchStorefrontProductBreadcrumbPath,
  fetchStorefrontCollectionBreadcrumbPath,
  ShopifyProductNode,
  ShopifyProductDetailNode,
} from '../../services/shopify'
import { getDemoProductByHandle } from '../../lib/shopify/demo-catalog'

export interface BreadcrumbItem {
  label: string
  href?: string
  isCurrent?: boolean
  count?: number
  icon?: React.ComponentType<{ className?: string }>
}

export interface BreadcrumbsProps {
  /** Explicit items array (takes precedence if provided) */
  items?: BreadcrumbItem[]
  /** Shopify product object or detail node */
  product?: ShopifyProductNode | ShopifyProductDetailNode | any | null
  /** Product handle to fetch breadcrumb hierarchy from Shopify Storefront API */
  productHandle?: string
  /** Shopify collection object */
  collection?: { id?: string; handle?: string; title?: string; products?: any[] } | null
  /** Collection handle to fetch breadcrumb hierarchy from Shopify Storefront API */
  collectionHandle?: string
  /** Active category or query override (e.g. from router query) */
  categoryOverride?: string | null
  /** Active collection or query override */
  collectionOverride?: string | null
  /** Whether to show the Home icon on the first item */
  showHomeIcon?: boolean
  /** Whether to show a mobile quick back button on narrow viewports */
  showBackOnMobile?: boolean
  /** Visual presentation variant */
  variant?: 'minimal' | 'contained' | 'card'
  /** Root link behavior: whether to include intermediate /products link or direct Home > Category > Product */
  includeProductsRoot?: boolean
  /** Additional CSS class names */
  className?: string
  /** HTML ID */
  id?: string
  /** Base URL for Schema.org JSON-LD generation */
  siteUrl?: string
  /** Callback fired when items are resolved */
  onItemsResolved?: (items: BreadcrumbItem[]) => void
}

/**
 * Pure helper function to format breadcrumb items from a product object
 */
export function formatProductBreadcrumbs(params: {
  product: {
    title: string
    handle?: string
    productType?: string
    vendor?: string
    collections?: {
      edges?: Array<{
        node: {
          id?: string
          handle: string
          title: string
        }
      }>
    }
  }
  categoryOverride?: string | null
  collectionOverride?: string | null
  includeProductsRoot?: boolean
}): BreadcrumbItem[] {
  const { product, categoryOverride, collectionOverride, includeProductsRoot = false } = params

  const items: BreadcrumbItem[] = [{ label: 'Home', href: '/' }]

  if (includeProductsRoot) {
    items.push({ label: 'Products', href: '/products' })
  }

  // Determine category or collection segment
  const firstCollection = product.collections?.edges?.[0]?.node
  const resolvedCategory =
    categoryOverride ||
    (collectionOverride
      ? collectionOverride.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      : null) ||
    firstCollection?.title ||
    product.productType ||
    product.vendor

  const resolvedCategoryHref = categoryOverride
    ? `/products?category=${encodeURIComponent(categoryOverride)}`
    : collectionOverride
    ? `/collection/${encodeURIComponent(collectionOverride)}`
    : firstCollection?.handle
    ? `/collection/${encodeURIComponent(firstCollection.handle)}`
    : product.productType
    ? `/products?category=${encodeURIComponent(product.productType)}`
    : '/products'

  if (resolvedCategory) {
    items.push({
      label: resolvedCategory,
      href: resolvedCategoryHref,
    })
  } else if (!includeProductsRoot) {
    items.push({
      label: 'Products',
      href: '/products',
    })
  }

  // Add the current product
  items.push({
    label: product.title || 'Product Details',
    isCurrent: true,
  })

  return items
}

/**
 * Pure helper function to format breadcrumb items from a collection object
 */
export function formatCollectionBreadcrumbs(params: {
  collection: {
    title: string
    handle?: string
    products?: any[]
  }
  includeProductsRoot?: boolean
}): BreadcrumbItem[] {
  const { collection, includeProductsRoot = true } = params

  const items: BreadcrumbItem[] = [{ label: 'Home', href: '/' }]

  if (includeProductsRoot) {
    items.push({ label: 'Products', href: '/products' })
  }

  items.push({
    label: collection.title || 'Collection',
    isCurrent: true,
    count: collection.products?.length,
  })

  return items
}

/**
 * Custom React Hook to fetch and compute breadcrumbs using Shopify Storefront API
 */
export function useShopifyBreadcrumbs(options: {
  items?: BreadcrumbItem[]
  product?: ShopifyProductNode | ShopifyProductDetailNode | any | null
  productHandle?: string
  collection?: { id?: string; handle?: string; title?: string; products?: any[] } | null
  collectionHandle?: string
  categoryOverride?: string | null
  collectionOverride?: string | null
  includeProductsRoot?: boolean
}) {
  const {
    items: initialItems,
    product: initialProduct,
    productHandle,
    collection: initialCollection,
    collectionHandle,
    categoryOverride,
    collectionOverride,
    includeProductsRoot = false,
  } = options

  const [fetchedProduct, setFetchedProduct] = useState<any | null>(null)
  const [fetchedCollection, setFetchedCollection] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch product hierarchy if productHandle is provided and initialProduct is missing
  useEffect(() => {
    if (initialItems && initialItems.length > 0) return
    if (initialProduct) return
    if (!productHandle) return

    let isMounted = true

    async function loadProductBreadcrumb() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchStorefrontProductBreadcrumbPath(productHandle!)
        if (isMounted) {
          if (response?.data?.product) {
            setFetchedProduct(response.data.product)
          } else {
            // Fallback to demo catalog
            const demo = getDemoProductByHandle(productHandle!)
            if (demo) {
              setFetchedProduct(demo)
            } else {
              setFetchedProduct({
                title: productHandle!
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase()),
                handle: productHandle,
              })
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          const demo = getDemoProductByHandle(productHandle!)
          if (demo) {
            setFetchedProduct(demo)
          } else {
            setError(err?.message || 'Failed to fetch breadcrumbs from Shopify Storefront API')
          }
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadProductBreadcrumb()

    return () => {
      isMounted = false
    }
  }, [productHandle, initialProduct, initialItems])

  // Fetch collection hierarchy if collectionHandle is provided and initialCollection is missing
  useEffect(() => {
    if (initialItems && initialItems.length > 0) return
    if (initialCollection) return
    if (!collectionHandle) return

    let isMounted = true

    async function loadCollectionBreadcrumb() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchStorefrontCollectionBreadcrumbPath(collectionHandle!)
        if (isMounted) {
          if (response?.data?.collection) {
            setFetchedCollection(response.data.collection)
          } else {
            setFetchedCollection({
              title: collectionHandle!
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase()),
              handle: collectionHandle,
            })
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setFetchedCollection({
            title: collectionHandle!
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase()),
            handle: collectionHandle,
          })
          setError(err?.message || 'Failed to fetch collection breadcrumb')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadCollectionBreadcrumb()

    return () => {
      isMounted = false
    }
  }, [collectionHandle, initialCollection, initialItems])

  // Compute final breadcrumbs items
  const resolvedItems: BreadcrumbItem[] = useMemo(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems
    }

    const effectiveProduct = initialProduct || fetchedProduct
    if (effectiveProduct) {
      return formatProductBreadcrumbs({
        product: effectiveProduct,
        categoryOverride,
        collectionOverride,
        includeProductsRoot,
      })
    }

    const effectiveCollection = initialCollection || fetchedCollection
    if (effectiveCollection) {
      return formatCollectionBreadcrumbs({
        collection: effectiveCollection,
        includeProductsRoot: true,
      })
    }

    // Default fallback while loading or when nothing is provided
    if (loading && (productHandle || collectionHandle)) {
      return [
        { label: 'Home', href: '/' },
        { label: 'Loading...', isCurrent: true },
      ]
    }

    return [{ label: 'Home', href: '/' }]
  }, [
    initialItems,
    initialProduct,
    fetchedProduct,
    initialCollection,
    fetchedCollection,
    categoryOverride,
    collectionOverride,
    includeProductsRoot,
    loading,
    productHandle,
    collectionHandle,
  ])

  return { items: resolvedItems, loading, error }
}

/**
 * Reusable Breadcrumbs Component
 * Fetches the current product or collection path using the Shopify Storefront API
 * and displays the hierarchy (Home > Category > Product) with Schema.org JSON-LD support.
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items: directItems,
  product,
  productHandle,
  collection,
  collectionHandle,
  categoryOverride,
  collectionOverride,
  showHomeIcon = true,
  showBackOnMobile = true,
  variant = 'minimal',
  includeProductsRoot = false,
  className = '',
  id = 'breadcrumb-nav',
  siteUrl,
  onItemsResolved,
}) => {
  const router = useRouter()

  // Extract router query fallbacks if not explicitly provided
  const queryCategory =
    categoryOverride ??
    (router?.query && typeof router.query.category === 'string' ? router.query.category : null)
  const queryCollection =
    collectionOverride ??
    (router?.query && typeof router.query.collection === 'string' ? router.query.collection : null)

  const { items, loading } = useShopifyBreadcrumbs({
    items: directItems,
    product,
    productHandle,
    collection,
    collectionHandle,
    categoryOverride: queryCategory,
    collectionOverride: queryCollection,
    includeProductsRoot,
  })

  useEffect(() => {
    if (onItemsResolved && items.length > 0) {
      onItemsResolved(items)
    }
  }, [items, onItemsResolved])

  if (!items || items.length === 0) {
    return null
  }

  const baseUrl = siteUrl || getBaseUrl()

  // Generate Schema.org compliant JSON-LD schema for SEO BreadcrumbList
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      let targetUrl = baseUrl
      if (item.href) {
        targetUrl = item.href.startsWith('http') ? item.href : `${baseUrl}${item.href}`
      }
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: targetUrl,
      }
    }),
  }

  // Find parent item for mobile quick-back navigation
  const parentItem = items.length >= 2 ? items[items.length - 2] : null

  // Variant styling
  const variantStyles = {
    minimal: 'py-2 px-1 text-xs text-neutral-500 font-medium',
    contained:
      'py-2.5 px-3.5 sm:px-4 text-xs font-medium bg-white/90 backdrop-blur-xs border border-neutral-200/80 rounded-xl shadow-2xs text-neutral-600',
    card:
      'p-3 sm:p-4 text-xs font-medium bg-white border border-neutral-200 rounded-2xl shadow-xs text-neutral-600',
  }

  return (
    <nav
      id={id}
      aria-label="Breadcrumb"
      className={`transition-colors ${variantStyles[variant] || variantStyles.minimal} ${className}`}
    >
      <script
        type="application/ld+json"
        // Escape "<" to prevent script injection (standard JSON-LD mitigation)
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="flex items-center justify-between gap-3 w-full">
        {/* Mobile Quick-Back Navigation (Visible on narrow viewports if enabled) */}
        {showBackOnMobile && parentItem && parentItem.href && (
          <div className="sm:hidden flex items-center shrink-0">
            <Link
              href={parentItem.href}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-emerald-700 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-sm py-0.5"
              aria-label={`Back to ${parentItem.label}`}
            >
              <ArrowLeft className="w-3.5 h-3.5 text-neutral-500 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[140px]">Back to {parentItem.label}</span>
            </Link>
          </div>
        )}

        {/* Structured Breadcrumbs Trail */}
        <ol
          itemScope
          itemType="https://schema.org/BreadcrumbList"
          className={`flex items-center flex-wrap gap-1.5 leading-none overflow-x-auto scrollbar-none py-0.5 ${
            showBackOnMobile && parentItem ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1 || item.isCurrent
            const isFirst = index === 0

            return (
              <li
                key={`${item.label}-${index}`}
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
                className="inline-flex items-center gap-1.5 shrink-0"
              >
                {index > 0 && (
                  <ChevronRight
                    className="w-3.5 h-3.5 text-neutral-400 shrink-0 select-none"
                    aria-hidden="true"
                  />
                )}

                {isLast ? (
                  <span
                    itemProp="name"
                    aria-current="page"
                    className="text-neutral-900 font-semibold truncate max-w-[200px] sm:max-w-sm md:max-w-lg inline-flex items-center gap-1.5"
                    title={item.label}
                  >
                    {loading && (
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-600 shrink-0" />
                    )}
                    <span>{item.label}</span>
                    {typeof item.count === 'number' && (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 bg-neutral-100 rounded-full border border-neutral-200/60">
                        {item.count}
                      </span>
                    )}
                  </span>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    itemProp="item"
                    className="group inline-flex items-center gap-1 text-neutral-500 hover:text-emerald-700 hover:underline transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-sm"
                  >
                    {isFirst && showHomeIcon && (
                      <Home className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-700 shrink-0 transition-colors" />
                    )}
                    <span itemProp="name">{item.label}</span>
                    {typeof item.count === 'number' && (
                      <span className="ml-0.5 text-[10px] text-neutral-600">({item.count})</span>
                    )}
                  </Link>
                ) : (
                  <span itemProp="name" className="text-neutral-500 inline-flex items-center gap-1">
                    <span>{item.label}</span>
                    {typeof item.count === 'number' && (
                      <span className="ml-0.5 text-[10px] text-neutral-600">({item.count})</span>
                    )}
                  </span>
                )}

                <meta
                  itemProp="item"
                  content={
                    item.href
                      ? item.href.startsWith('http')
                        ? item.href
                        : `${baseUrl}${item.href}`
                      : baseUrl
                  }
                />
                <meta itemProp="position" content={String(index + 1)} />
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}

/**
 * Convenience wrapper specifically for Product pages
 */
export const ProductBreadcrumbs: React.FC<
  Omit<BreadcrumbsProps, 'collection' | 'collectionHandle'>
> = (props) => <Breadcrumbs id="product-breadcrumbs" {...props} />

/**
 * Convenience wrapper specifically for Collection pages
 */
export const CollectionBreadcrumbs: React.FC<
  Omit<BreadcrumbsProps, 'product' | 'productHandle'>
> = (props) => <Breadcrumbs id="collection-breadcrumbs" {...props} />

export const ShopifyBreadcrumbs = Breadcrumbs

export default Breadcrumbs
