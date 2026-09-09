import React from 'react'

export interface ProductDetailSkeletonProps {
  /** Whether this skeleton is being rendered within a modal dialog */
  asModal?: boolean
  /** Optional container class name */
  className?: string
}

export const ProductDetailSkeleton: React.FC<ProductDetailSkeletonProps> = ({
  asModal = false,
  className = '',
}) => {
  return (
    <div
      id="product-detail-skeleton-container"
      className={`w-full max-w-7xl mx-auto bg-white rounded-2xl ${
        asModal ? 'p-4 sm:p-6' : 'p-6 sm:p-8 lg:p-10 shadow-xs border border-neutral-200/80'
      } ${className}`}
      aria-busy="true"
      aria-label="Loading product details from Shopify Storefront"
    >
      {/* Top Navigation / Breadcrumbs (Non-modal) */}
      {!asModal && (
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-neutral-200 rounded animate-pulse" />
            <div className="h-3 w-3 bg-neutral-100 rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse" />
            <div className="h-3 w-3 bg-neutral-100 rounded-full animate-pulse" />
            <div className="h-4 w-36 bg-neutral-100 rounded animate-pulse hidden sm:block" />
          </div>
          <div className="h-8 w-24 bg-neutral-100 rounded-lg animate-pulse" />
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Media Gallery Skeleton */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Main Large Image Box */}
          <div className="relative w-full aspect-square bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200/60 flex items-center justify-center">
            <div className="absolute inset-0 animate-shimmer" />

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <div className="h-6 w-24 bg-white/80 backdrop-blur-xs rounded-md shadow-xs border border-neutral-200/70 animate-pulse" />
              <div className="h-6 w-16 bg-white/80 backdrop-blur-xs rounded-md shadow-xs border border-neutral-200/70 animate-pulse" />
            </div>

            {/* Top Right Action Button */}
            <div className="absolute top-4 right-4 z-10">
              <div className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-xs shadow-xs border border-neutral-200/70 animate-pulse" />
            </div>

            {/* Centered Device Outline Silhouette */}
            <div className="w-28 h-40 rounded-2xl border-2 border-dashed border-neutral-200/80 flex flex-col items-center justify-center gap-2 p-3">
              <div className="w-10 h-1 bg-neutral-200 rounded-full" />
              <div className="w-12 h-12 rounded-xl bg-neutral-200/50 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-neutral-300 animate-pulse"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="w-6 h-1 bg-neutral-200 rounded-full" />
            </div>
          </div>

          {/* Thumbnails Row Skeleton */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className={`aspect-square rounded-xl overflow-hidden bg-neutral-100 border ${
                  idx === 0
                    ? 'border-emerald-500/60 ring-2 ring-emerald-500/20'
                    : 'border-neutral-200/70'
                } relative`}
              >
                <div className="absolute inset-0 animate-shimmer" />
              </div>
            ))}
          </div>

          {/* Assurance / Trust Badges Skeleton */}
          <div className="mt-3 grid grid-cols-3 gap-3 p-4 bg-neutral-50/80 border border-neutral-200/60 rounded-xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-1.5 p-1">
                <div className="w-8 h-8 rounded-lg bg-neutral-200 animate-pulse" />
                <div className="h-3.5 w-16 bg-neutral-200 rounded animate-pulse" />
                <div className="h-2.5 w-20 bg-neutral-100 rounded animate-pulse hidden sm:block" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Product Information & Purchase Action Skeleton */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Brand, Stock, and SKU Pill */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 bg-emerald-50 border border-emerald-200 rounded-full animate-pulse" />
              <div className="h-4 w-20 bg-neutral-100 rounded animate-pulse" />
            </div>
            <div className="h-4 w-16 bg-neutral-100 rounded animate-pulse" />
          </div>

          {/* Product Title Skeleton */}
          <div className="space-y-2.5">
            <div className="h-7 sm:h-8 w-11/12 bg-neutral-200 rounded-lg animate-pulse" />
            <div className="h-7 sm:h-8 w-3/4 bg-neutral-200/80 rounded-lg animate-pulse" />
          </div>

          {/* Rating & Review Counter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-xs bg-neutral-200 animate-pulse" />
              ))}
            </div>
            <div className="h-4 w-28 bg-neutral-100 rounded animate-pulse" />
          </div>

          {/* Pricing Highlight Box */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70 flex items-baseline justify-between">
            <div className="flex items-baseline gap-3">
              <div className="h-8 w-28 bg-neutral-900/80 rounded-lg animate-pulse" />
              <div className="h-5 w-20 bg-neutral-200 rounded animate-pulse" />
            </div>
            <div className="h-6 w-20 bg-emerald-100 border border-emerald-200 rounded-md animate-pulse" />
          </div>

          {/* Variant Selector Skeleton */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-neutral-200 rounded animate-pulse" />
              <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse" />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <div className="h-10 w-28 rounded-xl bg-neutral-200/80 border-2 border-neutral-300 animate-pulse" />
              <div className="h-10 w-32 rounded-xl bg-neutral-100 border border-neutral-200 animate-pulse" />
              <div className="h-10 w-24 rounded-xl bg-neutral-100 border border-neutral-200 animate-pulse" />
            </div>
          </div>

          {/* In-Stock Indicator */}
          <div className="flex items-center gap-2 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <div className="h-4 w-44 bg-emerald-200/80 rounded animate-pulse" />
          </div>

          {/* Quantity and Primary Add-to-Cart Buttons */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              {/* Stepper Skeleton */}
              <div className="h-12 w-28 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-between px-3">
                <div className="w-4 h-4 bg-neutral-200 rounded-full" />
                <div className="w-4 h-4 bg-neutral-200 rounded" />
                <div className="w-4 h-4 bg-neutral-200 rounded-full" />
              </div>

              {/* Add to Bag Button Skeleton */}
              <div className="h-12 flex-1 rounded-xl bg-emerald-600/80 shadow-xs flex items-center justify-center">
                <div className="h-4 w-32 bg-white/70 rounded animate-pulse" />
              </div>
            </div>

            {/* Express Checkout Button Skeleton */}
            <div className="h-12 w-full rounded-xl bg-neutral-900/80 shadow-xs flex items-center justify-center">
              <div className="h-4 w-36 bg-white/70 rounded animate-pulse" />
            </div>
          </div>

          {/* Feature Bullets List Skeleton */}
          <div className="pt-4 border-t border-neutral-100 space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-neutral-200 animate-pulse flex-shrink-0" />
                <div
                  className={`h-3.5 bg-neutral-100 rounded animate-pulse ${
                    i === 0 ? 'w-4/5' : i === 1 ? 'w-3/5' : 'w-2/3'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Description Snippet Skeleton */}
          <div className="space-y-2 pt-2">
            <div className="h-4 w-full bg-neutral-100 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-neutral-100 rounded animate-pulse" />
            <div className="h-4 w-4/6 bg-neutral-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetailSkeleton
