import React from 'react'
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Tag,
  Layers,
  Sparkles,
  Check,
  Smartphone,
} from 'lucide-react'
import { PriceRangeSlider } from './PriceRangeSlider'

export interface TagCount {
  name: string
  count: number
}

export interface VendorCount {
  name: string
  count: number
}

export interface ProductCatalogSidebarProps {
  /** Min price in catalog */
  minPrice: number
  /** Max price in catalog */
  maxPrice: number
  /** Current selected price range [min, max] */
  priceRange: [number, number]
  /** Callback on price range change */
  onPriceRangeChange: (range: [number, number]) => void
  /** Callback to reset price filter */
  onResetPrice: () => void
  /** Whether price filter is active */
  isPriceFiltered: boolean
  /** Currency code */
  currencyCode?: string
  /** Products matching current filters */
  matchCount?: number
  /** Total products before price filtering */
  totalCount?: number

  /** Selected category / tag */
  selectedTag: string
  /** Callback on tag selection */
  onSelectTag: (tag: string) => void
  /** Available tags with counts */
  availableTags: TagCount[]

  /** Selected vendor / brand */
  selectedVendor: string
  /** Callback on vendor selection */
  onSelectVendor: (vendor: string) => void
  /** Available vendors with counts */
  availableVendors: VendorCount[]

  /** Filter for on-sale items only */
  onSaleOnly?: boolean
  /** Callback for on-sale toggle */
  onToggleOnSale?: (val: boolean) => void

  /** Callback to reset all filters */
  onResetAllFilters: () => void
  /** Total count of active filters */
  activeFiltersCount: number

  /** Mobile drawer open state */
  isOpenMobile?: boolean
  /** Callback to close mobile drawer */
  onCloseMobile?: () => void
  /** Additional container classes */
  className?: string
}

export const ProductCatalogSidebar: React.FC<ProductCatalogSidebarProps> = ({
  minPrice,
  maxPrice,
  priceRange,
  onPriceRangeChange,
  onResetPrice,
  isPriceFiltered,
  currencyCode = 'USD',
  matchCount,
  totalCount,
  selectedTag,
  onSelectTag,
  availableTags,
  selectedVendor,
  onSelectVendor,
  availableVendors,
  onSaleOnly = false,
  onToggleOnSale,
  onResetAllFilters,
  activeFiltersCount,
  isOpenMobile = false,
  onCloseMobile,
  className = '',
}) => {
  // Render sidebar filter contents (shared between desktop container and mobile drawer)
  const renderSidebarContent = () => (
    <div className="space-y-6">
      {/* 1. Price Range Section */}
      <div id="sidebar-price-range-section" className="space-y-3">
        <PriceRangeSlider
          min={minPrice}
          max={maxPrice}
          value={priceRange}
          onChange={onPriceRangeChange}
          onReset={onResetPrice}
          isFiltered={isPriceFiltered}
          currencyCode={currencyCode}
          matchCount={matchCount}
          totalCount={totalCount}
        />
      </div>

      <div className="border-t border-neutral-200/80" />

      {/* 2. Device Brands / Vendors */}
      {availableVendors.length > 0 && (
        <div id="sidebar-brands-section" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-neutral-500" />
              Brand / Make
            </span>
            {selectedVendor !== 'ALL' && (
              <button
                type="button"
                id="reset-vendor-filter-btn"
                onClick={() => onSelectVendor('ALL')}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-medium hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-1">
            <button
              type="button"
              id="vendor-filter-btn-all"
              onClick={() => onSelectVendor('ALL')}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedVendor === 'ALL'
                  ? 'bg-neutral-900 text-white font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <span>All Brands</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  selectedVendor === 'ALL'
                    ? 'bg-neutral-800 text-neutral-200'
                    : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {totalCount || availableVendors.reduce((acc, v) => acc + v.count, 0)}
              </span>
            </button>

            {availableVendors.map((vendor) => {
              const isSelected = selectedVendor.toLowerCase() === vendor.name.toLowerCase()
              return (
                <button
                  key={vendor.name}
                  type="button"
                  id={`vendor-filter-btn-${vendor.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => onSelectVendor(isSelected ? 'ALL' : vendor.name)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <span className="truncate">{vendor.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-neutral-800 text-neutral-200'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {vendor.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="border-t border-neutral-200/80" />

      {/* 3. Component & Assembly Types / Tags */}
      {availableTags.length > 0 && (
        <div id="sidebar-tags-section" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-neutral-500" />
              Part & Assembly Type
            </span>
            {selectedTag !== 'ALL' && (
              <button
                type="button"
                id="reset-tag-filter-btn"
                onClick={() => onSelectTag('ALL')}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-medium hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
            <button
              type="button"
              id="tag-filter-btn-all"
              onClick={() => onSelectTag('ALL')}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedTag === 'ALL'
                  ? 'bg-neutral-900 text-white font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <span>All Types</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  selectedTag === 'ALL'
                    ? 'bg-neutral-800 text-neutral-200'
                    : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {totalCount || availableTags.reduce((acc, t) => acc + t.count, 0)}
              </span>
            </button>

            {availableTags.map((tag) => {
              const isSelected = selectedTag.toLowerCase() === tag.name.toLowerCase()
              return (
                <button
                  key={tag.name}
                  type="button"
                  id={`tag-filter-btn-${tag.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => onSelectTag(isSelected ? 'ALL' : tag.name)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <span className="truncate">{tag.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-neutral-800 text-neutral-200'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {tag.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. Deals & Special Filter Toggle */}
      {onToggleOnSale && (
        <>
          <div className="border-t border-neutral-200/80" />
          <div id="sidebar-deals-section" className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
              Special Offers
            </span>
            <label
              htmlFor="filter-sale-only-toggle"
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 cursor-pointer transition-colors text-xs"
            >
              <span className="font-medium text-neutral-800">On Sale Only</span>
              <input
                type="checkbox"
                id="filter-sale-only-toggle"
                checked={onSaleOnly}
                onChange={(e) => onToggleOnSale(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 cursor-pointer"
              />
            </label>
          </div>
        </>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar Column */}
      <aside
        id="product-catalog-desktop-sidebar"
        className={`hidden lg:block w-72 shrink-0 ${className}`}
      >
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs sticky top-24">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80 mb-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-neutral-900 text-sm">Refine Catalog</h3>
              {activeFiltersCount > 0 && (
                <span
                  id="desktop-active-filters-count"
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white"
                >
                  {activeFiltersCount}
                </span>
              )}
            </div>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                id="sidebar-clear-all-btn"
                onClick={onResetAllFilters}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Clear All
              </button>
            )}
          </div>

          {/* Filter controls */}
          {renderSidebarContent()}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div
          id="mobile-catalog-filters-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-filters-heading"
          className="fixed inset-0 z-50 lg:hidden flex justify-end animate-fadeIn"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-left">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <h3 id="mobile-filters-heading" className="font-bold text-neutral-900 text-base">
                  Filter Catalog
                </h3>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={onResetAllFilters}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 mr-2"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  id="close-mobile-filters-btn"
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Filter Body */}
            <div className="p-5 overflow-y-auto flex-1">
              {renderSidebarContent()}
            </div>

            {/* Sticky Drawer Footer */}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50 shrink-0">
              <button
                type="button"
                id="apply-mobile-filters-btn"
                onClick={onCloseMobile}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>
                  Apply Filters
                  {typeof matchCount === 'number' ? ` (${matchCount} items)` : ''}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ProductCatalogSidebar
