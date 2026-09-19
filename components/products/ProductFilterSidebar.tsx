import React from 'react'
import { Filter, X, RotateCcw, Check, SlidersHorizontal } from 'lucide-react'
import { ShopifyProductNode } from '../../services/shopify'

export interface FilterState {
  minPrice: string
  maxPrice: string
  selectedBrands: string[]
  inStockOnly: boolean
}

export interface ProductFilterSidebarProps {
  products: ShopifyProductNode[]
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  onResetFilters: () => void
  isOpen?: boolean
  onClose?: () => void
  className?: string
}

export const ProductFilterSidebar: React.FC<ProductFilterSidebarProps> = ({
  products,
  filters,
  onFilterChange,
  onResetFilters,
  isOpen = true,
  onClose,
  className = '',
}) => {
  // Extract available brands/vendors from products
  const availableBrands = React.useMemo(() => {
    const brandsSet = new Set<string>()
    products.forEach((p) => {
      if (p.vendor && p.vendor.trim()) {
        brandsSet.add(p.vendor.trim())
      }
    })
    return Array.from(brandsSet).sort()
  }, [products])

  const handlePriceChange = (field: 'minPrice' | 'maxPrice', value: string) => {
    onFilterChange({
      ...filters,
      [field]: value,
    })
  }

  const handleBrandToggle = (brand: string) => {
    const exists = filters.selectedBrands.includes(brand)
    const updatedBrands = exists
      ? filters.selectedBrands.filter((b) => b !== brand)
      : [...filters.selectedBrands, brand]
    onFilterChange({
      ...filters,
      selectedBrands: updatedBrands,
    })
  }

  const handleStockToggle = (checked: boolean) => {
    onFilterChange({
      ...filters,
      inStockOnly: checked,
    })
  }

  const activeFiltersCount =
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    filters.selectedBrands.length +
    (filters.inStockOnly ? 1 : 0)

  const content = (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs flex flex-col gap-6">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
        <h3 className="font-semibold text-neutral-900 flex items-center gap-2 text-base">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          Filter Catalog
        </h3>
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-lg"
          >
            <RotateCcw className="w-3 h-3" />
            Reset ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Availability Status */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Availability</h4>
        <label className="flex items-center gap-3 text-sm text-neutral-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => handleStockToggle(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 cursor-pointer"
          />
          <span>In Stock Only</span>
        </label>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Price Range ($)</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="min-price-input" className="block text-[11px] text-neutral-500 mb-1">Min Price</label>
            <input
              id="min-price-input"
              type="number"
              min="0"
              placeholder="0"
              value={filters.minPrice}
              onChange={(e) => handlePriceChange('minPrice', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="max-price-input" className="block text-[11px] text-neutral-500 mb-1">Max Price</label>
            <input
              id="max-price-input"
              type="number"
              min="0"
              placeholder="500"
              value={filters.maxPrice}
              onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, minPrice: '', maxPrice: '25' })}
            className="text-[11px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Under $25
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, minPrice: '25', maxPrice: '50' })}
            className="text-[11px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            $25 - $50
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, minPrice: '50', maxPrice: '100' })}
            className="text-[11px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            $50 - $100
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, minPrice: '100', maxPrice: '' })}
            className="text-[11px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            $100+
          </button>
        </div>
      </div>

      {/* Brand / Vendor */}
      {availableBrands.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Brand / Vendor</h4>
          <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
            {availableBrands.map((brand) => {
              const isSelected = filters.selectedBrands.includes(brand)
              return (
                <label
                  key={brand}
                  className="flex items-center gap-3 text-sm text-neutral-700 cursor-pointer select-none hover:text-neutral-950"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleBrandToggle(brand)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 cursor-pointer"
                  />
                  <span className="truncate">{brand}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:block w-72 shrink-0 ${className}`}>{content}</div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col z-10">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                Filter Products
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  )
}

export default ProductFilterSidebar
