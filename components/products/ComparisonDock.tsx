import React from 'react'
import Image from 'next/image'
import { ArrowLeftRight, X, Trash2, Plus, Sparkles } from 'lucide-react'
import { ShopifyProductNode } from '../../services/shopify'

export interface ComparisonDockProps {
  selectedProducts: ShopifyProductNode[]
  onOpenModal: () => void
  onRemoveProduct: (productId: string) => void
  onClearAll: () => void
  maxProducts?: number
}

export const ComparisonDock: React.FC<ComparisonDockProps> = ({
  selectedProducts,
  onOpenModal,
  onRemoveProduct,
  onClearAll,
  maxProducts = 3,
}) => {
  if (selectedProducts.length === 0) return null

  const emptySlots = Math.max(0, maxProducts - selectedProducts.length)

  const formatPrice = (amount?: string, currencyCode = 'USD') => {
    if (!amount) return 'N/A'
    const num = parseFloat(amount)
    if (isNaN(num)) return amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(num)
  }

  return (
    <div
      id="comparison-floating-dock"
      className="fixed bottom-4 sm:bottom-6 inset-x-0 z-40 max-w-4xl mx-auto px-4 pointer-events-none transition-all duration-300 animate-slide-up"
    >
      <div className="pointer-events-auto bg-neutral-900/95 backdrop-blur-md text-white border border-neutral-700/80 shadow-2xl rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left Info */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold tracking-tight text-white">
                  Compare Products
                </span>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  {selectedProducts.length}/{maxProducts} Selected
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                {selectedProducts.length === 1
                  ? 'Select up to 2 more items to compare'
                  : selectedProducts.length === 2
                  ? 'Add 1 more item or compare now'
                  : 'Ready to compare side-by-side'}
              </p>
            </div>
          </div>

          {/* Clear button on mobile */}
          <button
            type="button"
            onClick={onClearAll}
            className="md:hidden text-[11px] text-neutral-400 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Center: Miniature Product Slots */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
          {selectedProducts.map((product) => {
            const imgUrl =
              product.featuredImage?.url || product.images?.edges?.[0]?.node?.url
            const price = product.priceRange?.minVariantPrice?.amount
            const currency = product.priceRange?.minVariantPrice?.currencyCode || 'USD'

            return (
              <div
                key={product.id}
                id={`dock-item-${product.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
                className="relative group bg-neutral-800/80 border border-neutral-700 rounded-xl p-1.5 flex items-center gap-2 min-w-[140px] max-w-[170px] shrink-0"
              >
                <div className="w-10 h-10 rounded-lg bg-neutral-900 relative overflow-hidden shrink-0 border border-neutral-700/50">
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={product.title}
                      fill
                      sizes="40px"
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500">
                      No img
                    </div>
                  )}
                </div>

                <div className="flex flex-col min-w-0 pr-4">
                  <span className="text-[11px] font-medium text-neutral-200 truncate leading-tight">
                    {product.title}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400">
                    {formatPrice(price, currency)}
                  </span>
                </div>

                {/* Remove 'X' button */}
                <button
                  type="button"
                  onClick={() => onRemoveProduct(product.id)}
                  aria-label={`Remove ${product.title} from comparison`}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neutral-800 border border-neutral-600 text-neutral-300 hover:text-white hover:bg-red-600 hover:border-red-600 flex items-center justify-center transition-colors shadow-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}

          {/* Empty slot placeholders */}
          {Array.from({ length: emptySlots }).map((_, idx) => (
            <div
              key={`empty-dock-${idx}`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-neutral-700 text-neutral-500 text-[11px] shrink-0 min-w-[110px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Slot {selectedProducts.length + idx + 1}</span>
            </div>
          ))}
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={onClearAll}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            id="open-comparison-table-btn"
            onClick={onOpenModal}
            className="w-full md:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Compare Now ({selectedProducts.length})</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ComparisonDock
