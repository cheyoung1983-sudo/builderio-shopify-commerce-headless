import React from 'react'
import { ProductCardSkeleton } from './ProductCardSkeleton'

export interface ProductGridSkeletonProps {
  /** Number of skeleton product cards to show (default: 8) */
  count?: number
  /** Whether to show header filters & search bar skeleton (default: false) */
  showControls?: boolean
  /** Whether to show a left filter sidebar skeleton (default: false) */
  showSidebar?: boolean
  /** Custom columns class name (default: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-6") */
  columnsClass?: string
  /** Card display variant */
  cardVariant?: 'standard' | 'compact'
  /** Optional custom title placeholder */
  title?: string
  /** Optional container class name */
  className?: string
}

export const ProductGridSkeleton: React.FC<ProductGridSkeletonProps> = ({
  count = 8,
  showControls = false,
  showSidebar = false,
  columnsClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-6',
  cardVariant = 'standard',
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
              <div className="relative h-7 w-48 sm:w-64 bg-neutral-200/80 rounded-lg overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              <div className="relative h-4 w-72 sm:w-96 bg-neutral-100 rounded-md overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-36 bg-neutral-200/80 rounded-xl overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              <div className="relative h-10 w-28 bg-neutral-100 rounded-xl overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
            </div>
          </div>

          {/* Search bar & Category chips skeleton */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative h-11 flex-1 bg-neutral-100 rounded-xl border border-neutral-200/70 overflow-hidden">
              <div className="absolute inset-0 animate-shimmer" />
            </div>
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="relative h-9 w-16 bg-neutral-200/80 rounded-lg overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              <div className="relative h-9 w-24 bg-neutral-100 rounded-lg overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              <div className="relative h-9 w-28 bg-neutral-100 rounded-lg overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              <div className="relative h-9 w-20 bg-neutral-100 rounded-lg overflow-hidden hidden md:block">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Area: Optional Sidebar + Product Cards Grid */}
      <div className={showSidebar ? 'flex flex-col lg:flex-row gap-8 items-start' : 'w-full'}>
        {/* Left Filter Sidebar Skeleton */}
        {showSidebar && (
          <aside className="w-full lg:w-64 shrink-0 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-6 hidden lg:block">
            {/* Sidebar Title & Clear Button */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="relative h-5 w-20 bg-neutral-200/80 rounded overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              <div className="relative h-4 w-12 bg-neutral-100 rounded overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
            </div>

            {/* Price Range Filter Skeleton */}
            <div className="space-y-3">
              <div className="relative h-4 w-24 bg-neutral-200/80 rounded overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative h-9 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200/60">
                  <div className="absolute inset-0 animate-shimmer" />
                </div>
                <div className="relative h-9 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200/60">
                  <div className="absolute inset-0 animate-shimmer" />
                </div>
              </div>
            </div>

            {/* Availability Toggle Skeleton */}
            <div className="space-y-3 pt-2 border-t border-neutral-100">
              <div className="relative h-4 w-28 bg-neutral-200/80 rounded overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 border border-neutral-200/60">
                <div className="relative h-3.5 w-24 bg-neutral-200/80 rounded overflow-hidden">
                  <div className="absolute inset-0 animate-shimmer" />
                </div>
                <div className="relative h-5 w-9 bg-neutral-300 rounded-full overflow-hidden">
                  <div className="absolute inset-0 animate-shimmer" />
                </div>
              </div>
            </div>

            {/* Brand / Vendor Checkboxes Skeleton */}
            <div className="space-y-3 pt-2 border-t border-neutral-100">
              <div className="relative h-4 w-20 bg-neutral-200/80 rounded overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative w-4 h-4 bg-neutral-200/80 rounded overflow-hidden">
                        <div className="absolute inset-0 animate-shimmer" />
                      </div>
                      <div
                        className={`relative h-3.5 bg-neutral-100 rounded overflow-hidden ${
                          i % 2 === 0 ? 'w-24' : 'w-16'
                        }`}
                      >
                        <div className="absolute inset-0 animate-shimmer" />
                      </div>
                    </div>
                    <div className="relative h-3 w-6 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="absolute inset-0 animate-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Grid of Product Skeletons */}
        <div className="flex-1 w-full min-w-0">
          <div
            id="storefront-products-skeleton"
            className={`grid ${columnsClass}`}
          >
            {Array.from({ length: count }).map((_, index) => (
              <ProductCardSkeleton
                key={index}
                id={`product-card-skeleton-${index}`}
                index={index}
                variant={cardVariant}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductGridSkeleton
