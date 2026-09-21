import React from 'react'

export interface ProductCardSkeletonProps {
  /** Optional HTML element id */
  id?: string
  /** Additional container classes */
  className?: string
  /** Visual presentation mode: standard (full card) or compact (list / drawer) */
  variant?: 'standard' | 'compact'
  /** Staggered animation index to offset animation timings */
  index?: number
  /** Aspect ratio class for the image placeholder (default: 'aspect-square') */
  imageAspectRatio?: string
  /** Whether to show the top-left badges placeholder (default: true) */
  showBadges?: boolean
  /** Whether to show the top-right corner action placeholder (default: true) */
  showCornerAction?: boolean
  /** Whether to show action buttons in the card footer (default: true) */
  showActions?: boolean
}

/**
 * Skeleton loader representing a product card while waiting for Shopify API data.
 * Employs animated gradient shimmers and pulsing typography placeholders matching
 * the real product card dimensions to eliminate layout shifts.
 */
export const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({
  id,
  className = '',
  variant = 'standard',
  index = 0,
  imageAspectRatio = 'aspect-square',
  showBadges = true,
  showCornerAction = true,
  showActions = true,
}) => {
  const staggerDelay = `${Math.min(index * 45, 450)}ms`

  if (variant === 'compact') {
    return (
      <div
        id={id}
        style={{ animationDelay: staggerDelay }}
        className={`bg-white border border-neutral-200/80 rounded-xl p-3 flex items-center gap-3 ${className}`}
        aria-hidden="true"
      >
        <div className="relative w-16 h-16 rounded-lg bg-neutral-100 shrink-0 overflow-hidden">
          <div className="absolute inset-0 animate-shimmer" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="relative h-3 w-16 bg-neutral-200/80 rounded-sm overflow-hidden">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
          <div className="relative h-4 w-3/4 bg-neutral-200/80 rounded-sm overflow-hidden">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
          <div className="relative h-3.5 w-14 bg-neutral-200/80 rounded-sm overflow-hidden">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      id={id}
      style={{ animationDelay: staggerDelay }}
      className={`group relative bg-white border border-surface-stone/90 rounded-xl overflow-hidden shadow-xs flex flex-col transition-all ${className}`}
      aria-hidden="true"
    >
      {/* Image Container with Shimmer Effect */}
      <div
        className={`relative w-full ${imageAspectRatio} bg-neutral-100/90 overflow-hidden flex items-center justify-center`}
      >
        {/* Ambient Shimmer Gradient */}
        <div className="absolute inset-0 animate-shimmer" />

        {/* Top Badges Placeholder (e.g. Sale, Category, In Stock) */}
        {showBadges && (
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
            <div className="relative h-4.5 w-16 bg-neutral-200/80 backdrop-blur-xs rounded shadow-xs overflow-hidden">
              <div className="absolute inset-0 animate-shimmer" />
            </div>
            <div className="relative h-4 w-12 bg-neutral-200/60 backdrop-blur-xs rounded shadow-xs overflow-hidden hidden sm:block">
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </div>
        )}

        {/* Top Right Compare Button Placeholder */}
        {showCornerAction && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <div className="relative h-6 w-18 rounded-full bg-white/80 backdrop-blur-xs shadow-xs border border-neutral-200/70 overflow-hidden">
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </div>
        )}

        {/* Central Product Icon Placeholder */}
        <div className="relative w-12 h-12 rounded-xl bg-neutral-200/50 flex items-center justify-center text-neutral-300 overflow-hidden">
          <div className="absolute inset-0 animate-shimmer opacity-70" />
          <svg
            className="w-6 h-6 opacity-40 relative z-10"
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

      {/* Card Content Placeholder */}
      <div className="p-4 flex flex-col flex-1">
        {/* Vendor Tag Placeholder */}
        <div className="relative h-3 w-16 bg-neutral-200/80 rounded-sm mb-2 overflow-hidden">
          <div className="absolute inset-0 animate-shimmer" />
        </div>

        {/* Product Title (2-line staggered placeholders) */}
        <div className="space-y-1.5 mb-2">
          <div className="relative h-4.5 w-full bg-neutral-200/80 rounded overflow-hidden">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
          <div className="relative h-4.5 w-4/5 bg-neutral-200/70 rounded overflow-hidden">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>

        {/* Product Description / Specification Placeholder */}
        <div className="space-y-1 mb-3">
          <div className="relative h-3 w-full bg-neutral-100 rounded overflow-hidden">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
          <div className="relative h-3 w-2/3 bg-neutral-100 rounded overflow-hidden">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>

        {/* Card Footer: Price & Quick Action Buttons */}
        <div className="mt-auto pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="relative h-5 w-20 bg-neutral-200/80 rounded overflow-hidden">
              <div className="absolute inset-0 animate-shimmer" />
            </div>
            <div className="relative h-3 w-12 bg-neutral-100 rounded overflow-hidden">
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-1.5">
              {/* Quick Add Button Placeholder */}
              <div className="relative h-8 w-14 rounded-lg bg-emerald-50/80 border border-emerald-200/60 overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              {/* Quick View Button Placeholder */}
              <div className="relative h-8 w-20 rounded-lg bg-neutral-100 border border-neutral-200/60 overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductCardSkeleton
