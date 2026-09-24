import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Eye,
  Loader2,
  Package,
} from 'lucide-react'
import { ShopifyProductNode } from '../../services/shopify'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { PRODUCT_IMAGE_BLUR_DATA_URL } from '../../lib/image'

export interface ProductRecommendationsCarouselProps {
  productId?: string
  productHandle?: string
  productTitle?: string
  productVendor?: string
  productType?: string
  productBaseUrl?: string
  onProductSelect?: (product: ShopifyProductNode) => void
  onCloseDrawer?: () => void
  className?: string
}

export const ProductRecommendationsCarousel: React.FC<
  ProductRecommendationsCarouselProps
> = ({
  productId,
  productHandle,
  productTitle,
  productVendor,
  productType,
  productBaseUrl = '/product',
  onProductSelect,
  onCloseDrawer,
  className = '',
}) => {
  const { addItem } = useCart()
  const { showSuccess, showError } = useToast()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [recommendations, setRecommendations] = useState<ShopifyProductNode[]>([])
  const [loading, setLoading] = useState<boolean>(() => Boolean(productId || productHandle))
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null)
  const [addedVariantId, setAddedVariantId] = useState<string | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false)
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false)

  // Update scroll indicator buttons state
  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 4)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4)
  }, [])

  // Fetch recommendations from API
  useEffect(() => {
    if (!productId && !productHandle) {
      return
    }

    let isMounted = true

    const params = new URLSearchParams()
    if (productId) params.set('productId', productId)
    if (productHandle) params.set('handle', productHandle)
    if (productVendor) params.set('vendor', productVendor)
    if (productType) params.set('productType', productType)
    params.set('limit', '8')

    fetch(`/api/products/recommendations?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!isMounted) return
        if (data.ok && Array.isArray(data.products)) {
          setRecommendations(data.products)
        } else {
          setRecommendations([])
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.warn('[RecommendationsCarousel] Failed to fetch recommendations:', err)
        setRecommendations([])
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
          setTimeout(checkScrollability, 100)
        }
      })

    return () => {
      isMounted = false
    }
  }, [productId, productHandle, productVendor, productType, checkScrollability])

  // Scroll controls
  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current
    if (!el) return
    const scrollAmount = el.clientWidth * 0.75
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  // Handle Quick Add to Bag
  const handleQuickAdd = async (
    e: React.MouseEvent,
    product: ShopifyProductNode
  ) => {
    e.stopPropagation()
    e.preventDefault()

    const firstVariant =
      product.variants?.edges?.[0]?.node ||
      (Array.isArray(product.variants) ? (product.variants as any)[0] : null)

    const variantId = firstVariant?.id
    if (!variantId) return

    setAddingVariantId(variantId)

    try {
      const priceAmount =
        firstVariant.price?.amount ||
        product.priceRange?.minVariantPrice?.amount ||
        '0'
      const currency =
        firstVariant.price?.currencyCode ||
        product.priceRange?.minVariantPrice?.currencyCode ||
        'USD'
      const imageUrl =
        firstVariant.image?.url ||
        product.featuredImage?.url ||
        product.images?.edges?.[0]?.node?.url

      await addItem({
        variantId,
        title: product.title,
        handle: product.handle,
        variantTitle: firstVariant.title || 'Default',
        price: {
          amount: priceAmount,
          currencyCode: currency,
        },
        image: imageUrl ? { url: imageUrl, altText: product.title } : null,
        quantity: 1,
      })

      setAddedVariantId(variantId)
      showSuccess(
        'Added to Shopping Bag',
        `${product.title} has been added.`
      )

      setTimeout(() => {
        setAddedVariantId((curr) => (curr === variantId ? null : curr))
      }, 2000)
    } catch (err) {
      console.warn('[RecommendationsCarousel] Quick add failed:', err)
      showError(
        'Failed to add item',
        'Could not add recommended item to cart.'
      )
    } finally {
      setAddingVariantId(null)
    }
  }

  // Don't render if not loading and no recommendations exist
  if (!loading && recommendations.length === 0) {
    return null
  }

  return (
    <section
      id="product-recommendations-carousel"
      aria-labelledby="recommendations-heading"
      className={`pt-5 mt-4 border-t border-neutral-200/80 ${className}`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Sparkles className="w-3 h-3" />
          </div>
          <div>
            <h3
              id="recommendations-heading"
              className="text-xs font-bold uppercase tracking-wider text-neutral-900"
            >
              You Might Also Like
            </h3>
            <p className="text-[11px] text-neutral-500">
              Frequently paired parts & repair upgrades
            </p>
          </div>
        </div>

        {/* Carousel Prev/Next Buttons */}
        {!loading && recommendations.length > 2 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              aria-label="Previous recommended products"
              className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              aria-label="Next recommended products"
              className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex gap-3 overflow-x-hidden py-1">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="w-36 sm:w-40 shrink-0 bg-neutral-50 border border-neutral-200/70 rounded-xl p-2.5 animate-pulse flex flex-col space-y-2"
            >
              <div className="w-full aspect-square bg-neutral-200/80 rounded-lg" />
              <div className="h-3 bg-neutral-200/80 rounded-sm w-4/5" />
              <div className="h-3 bg-neutral-200/80 rounded-sm w-1/2" />
              <div className="h-6 bg-neutral-200/80 rounded-lg mt-1" />
            </div>
          ))}
        </div>
      ) : (
        /* Recommendation Cards Carousel Container */
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollability}
          tabIndex={0}
          aria-label="Recommended products carousel"
          className="flex gap-3 overflow-x-auto pb-2 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-xl"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {recommendations.map((item) => {
            const firstVariant =
              item.variants?.edges?.[0]?.node ||
              (Array.isArray(item.variants) ? (item.variants as any)[0] : null)
            const variantId = firstVariant?.id || ''
            const isAddingThis = addingVariantId === variantId
            const isAddedThis = addedVariantId === variantId

            const price =
              item.priceRange?.minVariantPrice?.amount ||
              firstVariant?.price?.amount ||
              '0'
            const currency =
              item.priceRange?.minVariantPrice?.currencyCode ||
              firstVariant?.price?.currencyCode ||
              'USD'
            const comparePrice =
              item.compareAtPriceRange?.minVariantPrice?.amount ||
              firstVariant?.compareAtPrice?.amount
            const isOnSale =
              comparePrice && parseFloat(comparePrice) > parseFloat(price)
            const discountPercent = isOnSale
              ? Math.round(
                  ((parseFloat(comparePrice!) - parseFloat(price)) /
                    parseFloat(comparePrice!)) *
                    100
                )
              : 0

            const imageUrl =
              item.featuredImage?.url ||
              item.images?.edges?.[0]?.node?.url ||
              firstVariant?.image?.url

            return (
              <div
                key={item.id}
                role="group"
                aria-roledescription="slide"
                aria-label={item.title}
                className="group w-36 sm:w-40 shrink-0 snap-start bg-white border border-neutral-200/90 rounded-xl p-2.5 flex flex-col justify-between hover:border-emerald-500/80 hover:shadow-md transition-all duration-200 relative cursor-pointer"
                onClick={() => {
                  if (onProductSelect) {
                    onProductSelect(item)
                  }
                }}
              >
                {/* Thumbnail & Sale Badge */}
                <div className="relative w-full aspect-square bg-neutral-50 rounded-lg overflow-hidden border border-neutral-100 mb-2">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={item.featuredImage?.altText || item.title}
                      fill
                      sizes="160px"
                      placeholder="blur"
                      blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
                      referrerPolicy="no-referrer"
                      className="object-contain p-1.5 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <Package className="w-8 h-8" />
                    </div>
                  )}

                  {isOnSale && discountPercent > 0 && (
                    <span className="absolute top-1 left-1 bg-rose-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-md shadow-2xs">
                      -{discountPercent}%
                    </span>
                  )}

                  {/* Hover Quick View Overlay Action */}
                  <div className="absolute inset-0 bg-neutral-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                    <span className="bg-white/95 text-neutral-900 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5 text-emerald-600" />
                      View
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-semibold text-neutral-800 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                      {item.title}
                    </h4>

                    {item.vendor && (
                      <span className="text-[10px] text-neutral-400 block mt-0.5 truncate">
                        {item.vendor}
                      </span>
                    )}
                  </div>

                  {/* Price & Add to Bag button */}
                  <div className="mt-2 pt-1.5 border-t border-neutral-100 flex items-center justify-between gap-1">
                    <div>
                      <div className="text-xs font-bold text-neutral-900">
                        ${parseFloat(price).toFixed(2)}
                      </div>
                      {isOnSale && comparePrice && (
                        <div className="text-[10px] text-neutral-400 line-through">
                          ${parseFloat(comparePrice).toFixed(2)}
                        </div>
                      )}
                    </div>

                    {/* Quick Add Button */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickAdd(e, item)}
                      disabled={isAddingThis || item.availableForSale === false}
                      aria-label={`Add ${item.title} to bag`}
                      title="Quick Add to Bag"
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer shadow-2xs ${
                        isAddedThis
                          ? 'bg-emerald-600 text-white'
                          : isAddingThis
                          ? 'bg-neutral-100 text-neutral-500'
                          : item.availableForSale === false
                          ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white active:scale-95'
                      }`}
                    >
                      {isAddedThis ? (
                        <Check className="w-3.5 h-3.5 animate-scaleIn" />
                      ) : isAddingThis ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default ProductRecommendationsCarousel
