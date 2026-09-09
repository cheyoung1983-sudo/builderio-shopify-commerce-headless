import React from 'react'

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
          <div
            key={index}
            id={`product-card-skeleton-${index}`}
            className="group relative bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-xs flex flex-col transition-all"
          >
            {/* Image Placeholder with Shimmer */}
            <div className="relative w-full aspect-square bg-neutral-100/90 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 animate-shimmer" />

              {/* Top Badge Skeleton */}
              <div className="absolute top-3 left-3 z-10">
                <div className="h-5 w-20 bg-white/80 backdrop-blur-xs rounded-md shadow-xs border border-neutral-200/60 animate-pulse" />
              </div>

              {/* Wishlist button placeholder */}
              <div className="absolute top-3 right-3 z-10">
                <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-xs shadow-xs border border-neutral-200/60 animate-pulse" />
              </div>

              {/* Subtle icon placeholder */}
              <div className="w-16 h-16 rounded-2xl bg-neutral-200/40 flex items-center justify-center text-neutral-300">
                <svg
                  className="w-8 h-8 opacity-40 animate-pulse"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-4 flex flex-col flex-1">
              {/* Vendor & Rating row */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="h-3.5 w-20 bg-neutral-200 rounded-full animate-pulse" />
                <div className="flex items-center gap-1">
                  <div className="h-3 w-12 bg-neutral-100 rounded animate-pulse" />
                </div>
              </div>

              {/* Product Title Skeleton (2 lines) */}
              <div className="space-y-1.5 mb-3">
                <div className="h-4 w-full bg-neutral-200 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-neutral-200/80 rounded animate-pulse" />
              </div>

              {/* Compatibility / Sub-tag Pill */}
              <div className="mb-4">
                <div className="h-5 w-28 bg-neutral-100 rounded-md border border-neutral-200/50 animate-pulse" />
              </div>

              {/* Card Footer: Price and Quick Actions */}
              <div className="mt-auto pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <div className="h-5 w-20 bg-neutral-200 rounded-md animate-pulse" />
                  <div className="h-3 w-12 bg-neutral-100 rounded animate-pulse" />
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Add button placeholder */}
                  <div className="h-8 w-14 sm:w-16 rounded-lg bg-emerald-50 border border-emerald-200/60 animate-pulse" />
                  {/* Details button placeholder */}
                  <div className="h-8 w-16 sm:w-18 rounded-lg bg-neutral-100 border border-neutral-200/60 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProductGridSkeleton
