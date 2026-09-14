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
} from 'lucide-react'
import { ShopifyProductNode } from '../../services/shopify'
import { ProductCardSkeleton } from './ProductCardSkeleton'

export interface ProductCardProps {
  /** The Shopify product data node */
  product?: ShopifyProductNode
  /** Whether the product card is in a loading state */
  loading?: boolean
  /** Index for staggered animation delay */
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
  /** Handler when user clicks the product card */
  onProductClick?: (product: ShopifyProductNode, e?: React.MouseEvent) => void
  /** Handler when user toggles comparison */
  onToggleCompare?: (product: ShopifyProductNode, e: React.MouseEvent) => void
  /** Handler when user clicks Quick Add */
  onQuickAddToCart?: (product: ShopifyProductNode, e: React.MouseEvent) => void
  /** Additional container classes */
  className?: string
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
  onToggleCompare,
  onQuickAddToCart,
  className = '',
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)

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

  const handleCardClick = (e: React.MouseEvent) => {
    onProductClick?.(product, e)
  }

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleCompare?.(product, e)
  }

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onQuickAddToCart?.(product, e)
  }

  return (
    <div
      id={`product-card-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
      style={{
        animationDelay: `${Math.min(index * 45, 450)}ms`,
      }}
      onClick={handleCardClick}
      className={`animate-grid-fade-in group relative bg-white border rounded-xl overflow-hidden transition-all duration-300 ease-out flex flex-col cursor-pointer ${
        isCompared
          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
          : 'border-surface-stone hover:border-neutral-300 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1'
      } ${className}`}
    >
      {/* Image Container with Link & Image Shimmer Skeleton */}
      <Link
        href={`${productBaseUrl}/${product.handle}`}
        onClick={handleCardClick}
        className="block relative aspect-square w-full bg-neutral-100 overflow-hidden cursor-pointer"
      >
        {/* Shimmer skeleton active while Shopify CDN image is downloading */}
        <div
          className={`absolute inset-0 animate-shimmer transition-opacity duration-300 z-0 pointer-events-none ${
            imageLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          aria-hidden="true"
        />

        {primaryImage ? (
          <>
            <Image
              src={primaryImage}
              alt={imageAlt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover object-center transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 gap-2">
            <PackageOpen className="w-10 h-10 stroke-[1.5]" />
            <span className="text-xs">No image preview</span>
          </div>
        )}

        {/* Badges Overlay (Left) */}
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

        {/* Compare Toggle Button (Top Right) */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <button
            type="button"
            id={`compare-toggle-btn-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
            onClick={handleCompareClick}
            aria-label={
              isCompared
                ? `Remove ${product.title} from comparison`
                : `Add ${product.title} to comparison`
            }
            title={
              isCompared
                ? 'Remove from comparison'
                : 'Compare with up to 3 products'
            }
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shadow-xs cursor-pointer ${
              isCompared
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                : 'bg-white/95 hover:bg-white text-neutral-700 hover:text-neutral-950 border border-neutral-200/90 backdrop-blur-xs'
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
          <div className="absolute bottom-2.5 right-2.5 z-10 opacity-75 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="bg-neutral-900/80 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Layers className="w-2.5 h-2.5" />
              <span>2 views</span>
            </span>
          </div>
        )}

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
            onClick={handleCardClick}
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
              type="button"
              id={`quick-view-btn-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
              onClick={handleCardClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-900 hover:text-white text-neutral-800 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Quick View</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
