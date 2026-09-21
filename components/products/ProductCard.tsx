import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  PackageOpen,
  ShoppingBag,
  Check,
  ArrowLeftRight,
  ExternalLink,
  Eye,
  Layers,
  Heart,
} from 'lucide-react'
import { ShopifyProductNode } from '../../services/shopify'
import { ProductCardSkeleton } from './ProductCardSkeleton'
import { useWishlist, useQuickView } from '../../context'
import { PRODUCT_IMAGE_BLUR_DATA_URL, RESPONSIVE_IMAGE_SIZES } from '../../lib/image'
import { useIntersectionObserver } from '../../lib/hooks/useIntersectionObserver'

export interface ProductCardProps {
  /** The Shopify product data node */
  product?: ShopifyProductNode
  /** Whether the product card is in a loading state */
  loading?: boolean
  /** Index for staggered animation delay and grid keyboard navigation */
  index?: number
  /** Base URL for product links (default: '/product') */
  productBaseUrl?: string
  /** Whether the product is currently in the comparison list */
  isCompared?: boolean
  /** ID of the product currently being added to cart */
  isAddingToCart?: boolean
  /** Whether this product was just added to cart */
  isAdded?: boolean
  /** Price formatter function */
  formatPrice?: (amount?: string, currencyCode?: string) => string
  /** Handler when user clicks or presses Enter on the product card */
  onProductClick?: (product: ShopifyProductNode, e?: React.MouseEvent | React.KeyboardEvent) => void
  /** Handler when user clicks Quick View button */
  onQuickView?: (product: ShopifyProductNode, e?: React.MouseEvent | React.KeyboardEvent) => void
  /** Handler when user toggles comparison */
  onToggleCompare?: (product: ShopifyProductNode, e: React.MouseEvent) => void
  /** Handler when user clicks Quick Add */
  onQuickAddToCart?: (product: ShopifyProductNode, e: React.MouseEvent) => void
  /** Additional container classes */
  className?: string
  /** Roving tabindex value (0 if focused/active, -1 otherwise) */
  tabIndex?: number
  /** Whether this card is currently focused via keyboard navigation */
  isFocused?: boolean
  /** Callback when card receives keyboard/mouse focus */
  onCardFocus?: (index: number) => void
  /** Keyboard handler for grid-level arrow keys, Enter, and Escape */
  onCardKeyDown?: (
    e: React.KeyboardEvent<HTMLDivElement>,
    index: number,
    product: ShopifyProductNode
  ) => void
  /** Optional DOM ref callback */
  cardRef?: (node: HTMLDivElement | null) => void
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  loading = false,
  index = 0,
  productBaseUrl = '/product',
  isCompared = false,
  isAddingToCart = false,
  isAdded = false,
  formatPrice = (amount, currency = 'USD') => (amount ? `$${amount}` : ''),
  onProductClick,
  onQuickView,
  onToggleCompare,
  onQuickAddToCart,
  className = '',
  tabIndex,
  isFocused = false,
  onCardFocus,
  onCardKeyDown,
  cardRef,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const { isInWishlist, toggleWishlist } = useWishlist()
  const { openQuickView } = useQuickView()
  const isSaved = product ? isInWishlist(product.id) : false

  // Determine if card is initially above the fold (e.g. top 4 products get eager/priority loading)
  const isAboveTheFold = index < 4

  // Intersection observer lazily mounts off-screen product images when approaching viewport (250px margin)
  const { ref: imageObserverRef, isIntersecting: isImageVisible } = useIntersectionObserver<HTMLDivElement>({
    rootMargin: '250px 0px',
    triggerOnce: true,
    initialIsIntersecting: isAboveTheFold,
    enabled: !isAboveTheFold,
  })

  const shouldRenderImages = isAboveTheFold || isImageVisible

  // If explicitly loading or product data is not yet provided, show skeleton
  if (loading || !product) {
    return <ProductCardSkeleton index={index} className={className} />
  }

  const primaryImage =
    product.featuredImage?.url || product.images?.edges?.[0]?.node?.url
  const secondaryImage = product.images?.edges?.[1]?.node?.url
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

  const handleCardClick = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (onProductClick) {
      onProductClick(product, e)
    } else {
      openQuickView(product)
    }
  }

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleCompare?.(product, e)
  }

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product)
  }

  const handleQuickViewClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onQuickView) {
      onQuickView(product, e)
    } else {
      openQuickView(product)
    }
  }

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onQuickAddToCart?.(product, e)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const isInteractiveChild =
      target !== e.currentTarget &&
      ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)

    // Forward arrow keys, Home, End to parent grid navigation handler if provided
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)
    ) {
      if (onCardKeyDown) {
        onCardKeyDown(e, index, product)
        return
      }
    }

    if (e.key === 'Enter' || e.key === ' ') {
      // If user pressed Enter or Space directly on the card
      if (!isInteractiveChild || target === e.currentTarget) {
        e.preventDefault()
        e.stopPropagation()
        if (onQuickView) {
          onQuickView(product, e)
        } else if (onProductClick) {
          onProductClick(product, e)
        } else {
          openQuickView(product)
        }
      }
    } else if (e.key === 'Escape') {
      if (onCardKeyDown) {
        onCardKeyDown(e, index, product)
      } else if (!isInteractiveChild || target === e.currentTarget) {
        e.preventDefault()
        e.currentTarget.blur()
      }
    }
  }

  return (
    <div
      style={{
        animationDelay: `${Math.min(index * 45, 450)}ms`,
      }}
      className={`animate-grid-fade-in h-full flex flex-col ${className}`}
    >
      <div
        id={`product-card-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
        ref={cardRef}
        role="article"
        tabIndex={tabIndex ?? 0}
        aria-label={`${product.title}, ${formatPrice(minPrice, currency)}. Press Enter for Quick View.`}
        aria-roledescription="product card"
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        onFocus={() => onCardFocus?.(index)}
        className={`group relative bg-white border rounded-xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col flex-1 cursor-pointer transform-gpu will-change-transform hover:scale-[1.025] hover:-translate-y-1.5 hover:shadow-xl active:scale-[0.99] active:translate-y-0 focus:outline-hidden focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:border-emerald-500 focus-visible:shadow-lg ${
          isFocused
            ? 'ring-3 ring-emerald-500 ring-offset-2 border-emerald-500 shadow-lg scale-[1.01]'
            : isCompared
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
            : 'border-surface-stone hover:border-neutral-300 shadow-xs'
        }`}
      >
      {/* Media Container */}
      <div
        ref={imageObserverRef}
        className="relative aspect-square w-full bg-neutral-100 overflow-hidden"
      >
        {/* Clickable Image Link */}
        <Link
          id={`product-card-image-link-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
          href={`${productBaseUrl}/${product.handle}`}
          onClick={handleCardClick}
          tabIndex={-1}
          aria-hidden="true"
          className="block w-full h-full cursor-pointer relative"
        >
          {/* Shimmer skeleton active while Shopify CDN image is downloading */}
          <div
            className={`absolute inset-0 animate-shimmer transition-opacity duration-300 z-0 pointer-events-none ${
              imageLoaded ? 'opacity-0' : 'opacity-100'
            }`}
            aria-hidden="true"
          />

          {primaryImage ? (
            shouldRenderImages ? (
              <>
                <Image
                  src={primaryImage}
                  alt={imageAlt}
                  fill
                  placeholder="blur"
                  blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
                  sizes={RESPONSIVE_IMAGE_SIZES.productGrid}
                  priority={isAboveTheFold}
                  loading={isAboveTheFold ? 'eager' : 'lazy'}
                  quality={85}
                  className={`object-cover object-center transition-all duration-500 ease-out group-hover:scale-105 ${
                    secondaryImage ? 'group-hover:opacity-0' : ''
                  } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImageLoaded(true)}
                  referrerPolicy="no-referrer"
                />
                {secondaryImage && (
                  <Image
                    src={secondaryImage}
                    alt={`${imageAlt} - Alternate view`}
                    fill
                    placeholder="blur"
                    blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
                    sizes={RESPONSIVE_IMAGE_SIZES.productGrid}
                    loading="lazy"
                    quality={85}
                    className="object-cover object-center transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                )}
              </>
            ) : (
              /* Lightweight off-screen blur placeholder holding layout without network requests */
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url("${PRODUCT_IMAGE_BLUR_DATA_URL}")`,
                }}
                aria-hidden="true"
              />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 gap-2">
              <PackageOpen className="w-10 h-10 stroke-[1.5]" />
              <span className="text-xs">No image preview</span>
            </div>
          )}

          {/* Quick View Hover Hint */}
          <div className="absolute inset-x-0 bottom-0 py-2 bg-neutral-950/70 backdrop-blur-xs text-white text-[11px] font-medium text-center opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 z-10">
            <span>Click for Quick View</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </Link>

        {/* Badges Overlay (Top Left) */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
          {isOnSale && (
            <span className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
              Sale
            </span>
          )}
          {product.productType && (
            <span className="bg-neutral-900/80 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-sm max-w-30 truncate">
              {product.productType}
            </span>
          )}
          {/* Stock indicator badge */}
          <span className="bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-sm inline-flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            In Stock
          </span>
        </div>

        {/* Wishlist & Compare Floating Action Buttons (Top Right) */}
        <div className="absolute top-2.5 right-2.5 z-20 flex flex-col gap-2 items-end">
          {/* Wishlist Button */}
          <button
            id={`product-card-wishlist-btn-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
            type="button"
            onClick={handleWishlistClick}
            aria-label={isSaved ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`}
            aria-pressed={isSaved}
            title={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
            className={`p-2 rounded-full transition-all shadow-sm cursor-pointer ${
              isSaved
                ? 'bg-rose-500 text-white shadow-rose-500/30 ring-2 ring-rose-300 scale-105'
                : 'bg-white/95 hover:bg-white text-neutral-600 hover:text-rose-500 border border-neutral-200 backdrop-blur-xs hover:scale-105 active:scale-95'
            }`}
          >
            <Heart className={`w-4 h-4 transition-colors ${isSaved ? 'fill-current text-white' : ''}`} />
          </button>

          {/* Compare Button */}
          <button
            id={`product-card-compare-btn-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
            type="button"
            onClick={handleCompareClick}
            aria-label={
              isCompared
                ? `Comparing ${product.title}, click to remove`
                : `Compare ${product.title}`
            }
            title={
              isCompared
                ? 'Remove from comparison'
                : 'Compare with up to 3 products'
            }
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shadow-xs cursor-pointer ${
              isCompared
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                : 'bg-white/95 hover:bg-white text-neutral-700 hover:text-neutral-950 border border-neutral-200/90 backdrop-blur-xs hover:scale-105'
            }`}
          >
            {isCompared ? (
              <>
                <Check className="w-3 h-3 text-white" />
                <span>Comparing</span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-3 h-3 text-neutral-500" />
                <span>Compare</span>
              </>
            )}
          </button>
        </div>

        {/* Multi-image indicator badge */}
        {secondaryImage && (
          <div className="absolute bottom-2.5 right-2.5 z-10 opacity-75 group-hover:opacity-0 transition-opacity pointer-events-none">
            <span className="bg-neutral-900/80 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Layers className="w-2.5 h-2.5" />
              <span>2 views</span>
            </span>
          </div>
        )}

        {/* Hover Quick View Trigger on Image */}
        <div className="absolute inset-x-3 bottom-2.5 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none transform translate-y-1 group-hover:translate-y-0 hidden sm:flex justify-center">
          <button
            id={`product-card-hover-quick-view-btn-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
            type="button"
            onClick={handleQuickViewClick}
            aria-label={`Quick view ${product.title}`}
            title="Open side-panel quick view"
            className="pointer-events-auto w-full py-2 px-3 bg-white/95 hover:bg-neutral-900 text-neutral-900 hover:text-white text-xs font-bold rounded-lg shadow-md border border-neutral-200/90 backdrop-blur-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
            <span>Quick View</span>
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Vendor / Brand */}
        {product.vendor && (
          <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-600 mb-1">
            {product.vendor}
          </div>
        )}

        {/* Product Title */}
        <h3 className="font-semibold text-neutral-900 text-sm sm:text-base leading-snug group-hover:text-emerald-700 transition-colors line-clamp-2 mb-1.5">
          <Link
            href={`${productBaseUrl}/${product.handle}`}
            onClick={handleCardClick}
            tabIndex={-1}
            className="hover:underline"
          >
            {product.title}
          </Link>
        </h3>

        {/* On-Site Labor Guarantee Micro-Badge */}
        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md w-fit mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Includes On-Site Labor</span>
        </div>

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
                <span className="text-xs text-neutral-500 line-through">
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
              id={`product-card-add-btn-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
              type="button"
              onClick={handleAddToCartClick}
              disabled={isAddingToCart}
              aria-label={`Add ${product.title} to shopping bag`}
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isAdded
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600'
              }`}
              title="Add to Shopping Bag"
            >
              {isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5 animate-scaleIn" />
                  <span className="hidden sm:inline">Added!</span>
                </>
              ) : isAddingToCart ? (
                <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add</span>
                </>
              )}
            </button>

            <button
              id={`product-card-quick-view-btn-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
              type="button"
              onClick={handleQuickViewClick}
              aria-label={`Quick view ${product.title} in side panel`}
              title="Quick view product details without leaving this page"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-900 hover:text-white text-neutral-800 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Quick View</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)
}

export default ProductCard
