import React from 'react'
import { ProductCardSkeleton } from './ProductCardSkeleton'

export interface ProductGridSkeletonProps {
  /** Number of skeleton product cards to show (default: 8) */
  count?: number
  /** Whether to show header filters & search bar skeleton (default: false) */
  showControls?: boolean
  /** Optional custom title placeholder */
  title?: string
  /** Optional container class name */
  className?: string
}

export const ProductGridSkeleton: React.FC<ProductGridSkeletonProps> = ({
  count = 8,
  showControls = false,
  title,
  className = '',
}) => {
  return (
    <div
      id="product-grid-skeleton-container"
      className={`w-full ${className}`}
      aria-busy="true"
      aria-label="Loading products catalog"
    >
      {/* Optional Header / Filter Controls Skeleton */}
      {showControls && (
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="h-7 w-48 sm:w-64 bg-neutral-200 rounded-lg animate-pulse" />
              <div className="h-4 w-72 sm:w-96 bg-neutral-100 rounded-md animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-36 bg-neutral-200 rounded-xl animate-pulse" />
              <div className="h-10 w-28 bg-neutral-100 rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Search bar & Category chips skeleton */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="h-11 flex-1 bg-neutral-100 rounded-xl border border-neutral-200/70 animate-shimmer" />
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="h-9 w-16 bg-neutral-200 rounded-lg animate-pulse" />
              <div className="h-9 w-24 bg-neutral-100 rounded-lg animate-pulse" />
              <div className="h-9 w-28 bg-neutral-100 rounded-lg animate-pulse" />
              <div className="h-9 w-20 bg-neutral-100 rounded-lg animate-pulse hidden md:block" />
            </div>
          </div>
        </div>
      )}

      {/* Grid of Product Skeletons */}
      <div
        id="storefront-products-skeleton"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      >
        {Array.from({ length: count }).map((_, index) => (
          <ProductCardSkeleton
            key={index}
            id={`product-card-skeleton-${index}`}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}

export default ProductGridSkeleton
