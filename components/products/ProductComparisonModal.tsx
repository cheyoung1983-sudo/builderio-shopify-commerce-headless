import React, { useState, useEffect, useContext } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  X,
  Check,
  ShoppingBag,
  ArrowLeftRight,
  ExternalLink,
  Tag,
  Package,
  Layers,
  Sparkles,
  Info,
  Trash2,
  Plus,
} from 'lucide-react'
import { ShopifyProductNode } from '../../services/shopify'
import { CartContext } from '../../context/CartContext'
import { useUniqueId } from '../../hooks/useUniqueId'

export interface ProductComparisonModalProps {
  products: ShopifyProductNode[]
  isOpen: boolean
  onClose: () => void
  onRemoveProduct: (productId: string) => void
  onClearAll: () => void
  productBaseUrl?: string
  onSelectMore?: () => void
}

export const ProductComparisonModal: React.FC<ProductComparisonModalProps> = ({
  products,
  isOpen,
  onClose,
  onRemoveProduct,
  onClearAll,
  productBaseUrl = '/product',
  onSelectMore,
}) => {
  const [highlightDifferences, setHighlightDifferences] = useState<boolean>(false)
  const [activeImageIndex, setActiveImageIndex] = useState<Record<string, number>>({})
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)

  const cart = useContext(CartContext)
  const getId = useUniqueId('product-comparison-modal')

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const formatPrice = (amount?: string, currencyCode = 'USD') => {
    if (!amount) return 'N/A'
    const num = parseFloat(amount)
    if (isNaN(num)) return amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(num)
  }

  // Find lowest price to highlight
  const numericPrices = products.map((p) =>
    parseFloat(p.priceRange?.minVariantPrice?.amount || '0')
  )
  const lowestPrice =
    numericPrices.length > 0 ? Math.min(...numericPrices.filter((p) => p > 0)) : null

  // Helpers to detect differences
  const hasPriceDiff =
    products.length > 1 &&
    new Set(products.map((p) => p.priceRange?.minVariantPrice?.amount)).size > 1
  const hasVendorDiff =
    products.length > 1 &&
    new Set(products.map((p) => p.vendor || '')).size > 1
  const hasTypeDiff =
    products.length > 1 &&
    new Set(products.map((p) => p.productType || '')).size > 1
  const hasAvailabilityDiff =
    products.length > 1 &&
    new Set(products.map((p) => p.availableForSale)).size > 1

  const handleAddToCart = async (product: ShopifyProductNode) => {
    if (!cart) return
    setAddingId(product.id)
    try {
      const firstVariant = product.variants?.edges?.[0]?.node
      const variantId = firstVariant?.id || product.id
      const price = firstVariant?.price?.amount || product.priceRange.minVariantPrice.amount
      const currency = firstVariant?.price?.currencyCode || product.priceRange.minVariantPrice.currencyCode
      const comparePrice =
        firstVariant?.compareAtPrice?.amount ||
        product.compareAtPriceRange?.minVariantPrice?.amount
      const imageUrl = product.featuredImage?.url || product.images?.edges?.[0]?.node?.url

      await cart.addItem({
        variantId,
        quantity: 1,
        title: product.title,
        handle: product.handle,
        variantTitle: firstVariant?.title,
        price: { amount: price, currencyCode: currency },
        compareAtPrice: comparePrice ? { amount: comparePrice, currencyCode: currency } : null,
        image: imageUrl || null,
        vendor: product.vendor,
      })

      setAddedId(product.id)
      setTimeout(() => setAddedId(null), 2000)
    } catch (err) {
      console.warn('Comparison add to bag error:', err)
    } finally {
      setAddingId(null)
    }
  }

  // Calculate slots up to 3
  const maxSlots = 3
  const emptySlotsCount = Math.max(0, maxSlots - products.length)

  return (
    <div
      id={getId('backdrop')}
      className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-dialog-title"
    >
      <div
        id={getId('container')}
        className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-neutral-200 bg-neutral-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="comparison-dialog-title" className="text-base sm:text-lg font-bold text-neutral-900">
                  Side-by-Side Product Comparison
                </h2>
                <span className="bg-neutral-200 text-neutral-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {products.length} of 3
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Compare prices, specifications, and availability across selected items
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Highlight Differences Toggle */}
            {products.length > 1 && (
              <button
                type="button"
                id={getId('toggle-highlight')}
                onClick={() => setHighlightDifferences(!highlightDifferences)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  highlightDifferences
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Highlight differences</span>
              </button>
            )}

            {/* Clear All Button */}
            {products.length > 0 && (
              <button
                type="button"
                id={getId('clear-all')}
                onClick={onClearAll}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 hover:text-red-700 hover:bg-red-50 border border-neutral-300 transition-colors"
                title="Clear all selected items"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              id="close-comparison-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/80 transition-colors"
              aria-label="Close comparison overlay"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Side-by-Side Comparison Table */}
        <div className="overflow-x-auto overflow-y-auto flex-1 p-4 sm:p-6 divide-y divide-neutral-200">
          {products.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-4">
                <ArrowLeftRight className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-neutral-800 mb-1">
                No products selected for comparison
              </h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto mb-6">
                Click the &ldquo;Compare&rdquo; button on any product card in the catalog to add up to 3 items here.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800 transition-colors"
              >
                Return to Product Catalog
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse min-w-160 text-left">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="w-40 sm:w-48 p-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 align-top bg-neutral-50/50 rounded-tl-lg">
                    Product
                  </th>
                  {products.map((product) => {
                    const imagesList =
                      product.images?.edges?.map((e) => e.node.url) ||
                      (product.featuredImage?.url ? [product.featuredImage.url] : [])
                    const activeIdx = activeImageIndex[product.id] || 0
                    const currentImg = imagesList[activeIdx] || product.featuredImage?.url

                    return (
                      <th
                        key={product.id}
                        className="p-3 align-top font-normal border-l border-neutral-200 relative min-w-50 w-1/3"
                      >
                        <div className="flex flex-col gap-2">
                          {/* Remove button */}
                          <div className="flex justify-between items-center">
                            {product.vendor && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                {product.vendor}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => onRemoveProduct(product.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-red-600 transition-colors ml-auto p-1 rounded hover:bg-neutral-100"
                              title="Remove from comparison"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Remove</span>
                            </button>
                          </div>

                          {/* Image preview with multi-angle thumbnails if available */}
                          <div className="relative aspect-square w-full rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden group">
                            {currentImg ? (
                              <Image
                                src={currentImg}
                                alt={product.title}
                                fill
                                sizes="(max-width: 768px) 33vw, 25vw"
                                className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                                No image preview
                              </div>
                            )}

                            {/* Multi-angle switcher pills inside modal */}
                            {imagesList.length > 1 && (
                              <div className="absolute bottom-2 inset-x-2 flex justify-center gap-1.5 z-10">
                                {imagesList.slice(0, 3).map((imgUrl, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() =>
                                      setActiveImageIndex((prev) => ({
                                        ...prev,
                                        [product.id]: idx,
                                      }))
                                    }
                                    className={`w-6 h-6 rounded-md overflow-hidden border transition-all ${
                                      activeIdx === idx
                                        ? 'border-emerald-600 ring-2 ring-emerald-500/40 shadow-xs'
                                        : 'border-white/80 opacity-70 hover:opacity-100'
                                    }`}
                                    title={`View angle ${idx + 1}`}
                                  >
                                    <Image
                                      src={imgUrl}
                                      alt=""
                                      width={24}
                                      height={24}
                                      className="object-cover w-full h-full"
                                      referrerPolicy="no-referrer"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Product Title */}
                          <h3 className="text-sm font-semibold text-neutral-900 hover:text-emerald-700 transition-colors line-clamp-2 mt-1">
                            <Link href={`${productBaseUrl}/${product.handle}`} className="hover:underline">
                              {product.title}
                            </Link>
                          </h3>

                          {/* Add to Bag in header */}
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            disabled={addingId === product.id}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                              addedId === product.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            }`}
                          >
                            {addedId === product.id ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Added to Bag!</span>
                              </>
                            ) : addingId === product.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>Add to Bag</span>
                              </>
                            )}
                          </button>
                        </div>
                      </th>
                    )
                  })}

                  {/* Empty Slots */}
                  {Array.from({ length: emptySlotsCount }).map((_, i) => (
                    <th
                      key={`empty-slot-${i}`}
                      className="p-3 align-top font-normal border-l border-dashed border-neutral-200 min-w-50 w-1/3 bg-neutral-50/40"
                    >
                      <div
                        onClick={() => {
                          onClose()
                          onSelectMore?.()
                        }}
                        className="h-full min-h-[220px] rounded-xl border-2 border-dashed border-neutral-300 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center p-4 text-center cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-neutral-100 group-hover:bg-emerald-100 text-neutral-400 group-hover:text-emerald-700 flex items-center justify-center mb-2 transition-colors">
                          <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-neutral-700 group-hover:text-emerald-800">
                          + Add Product to Compare
                        </span>
                        <span className="text-[11px] text-neutral-400 mt-1">
                          Slot {products.length + i + 1} of 3
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-200">
                {/* 1. Price Row */}
                <tr className={highlightDifferences && hasPriceDiff ? 'bg-amber-50/50' : ''}>
                  <td className="p-3 text-xs font-semibold text-neutral-700 bg-neutral-50/40 align-middle">
                    <div className="flex items-center gap-1.5">
                      <span>Price</span>
                      {highlightDifferences && hasPriceDiff && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Different values" />
                      )}
                    </div>
                  </td>
                  {products.map((product) => {
                    const price = product.priceRange?.minVariantPrice?.amount
                    const currency = product.priceRange?.minVariantPrice?.currencyCode || 'USD'
                    const comparePrice = product.compareAtPriceRange?.minVariantPrice?.amount
                    const isLowest =
                      lowestPrice !== null && parseFloat(price || '0') === lowestPrice && products.length > 1
                    const isOnSale =
                      comparePrice && parseFloat(comparePrice) > parseFloat(price || '0')

                    return (
                      <td key={product.id} className="p-3 border-l border-neutral-200 align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-bold text-neutral-900">
                              {formatPrice(price, currency)}
                            </span>
                            {isOnSale && (
                              <span className="text-xs text-neutral-400 line-through">
                                {formatPrice(comparePrice, currency)}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isLowest && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                <Check className="w-2.5 h-2.5" />
                                Lowest Price
                              </span>
                            )}
                            {isOnSale && (
                              <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                Sale
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    )
                  })}
                  {Array.from({ length: emptySlotsCount }).map((_, i) => (
                    <td key={i} className="p-3 border-l border-dashed border-neutral-200 text-neutral-300 text-xs text-center">
                      —
                    </td>
                  ))}
                </tr>

                {/* 2. Availability / Stock Row */}
                <tr className={highlightDifferences && hasAvailabilityDiff ? 'bg-amber-50/50' : ''}>
                  <td className="p-3 text-xs font-semibold text-neutral-700 bg-neutral-50/40 align-middle">
                    <div className="flex items-center gap-1.5">
                      <span>Availability</span>
                      {highlightDifferences && hasAvailabilityDiff && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                    </div>
                  </td>
                  {products.map((product) => (
                    <td key={product.id} className="p-3 border-l border-neutral-200 align-middle">
                      {product.availableForSale ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          In Stock & Ready to Ship
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-lg">
                          Out of Stock
                        </span>
                      )}
                    </td>
                  ))}
                  {Array.from({ length: emptySlotsCount }).map((_, i) => (
                    <td key={i} className="p-3 border-l border-dashed border-neutral-200 text-neutral-300 text-xs text-center">
                      —
                    </td>
                  ))}
                </tr>

                {/* 3. Product Type Row */}
                <tr className={highlightDifferences && hasTypeDiff ? 'bg-amber-50/50' : ''}>
                  <td className="p-3 text-xs font-semibold text-neutral-700 bg-neutral-50/40 align-middle">
                    <div className="flex items-center gap-1.5">
                      <span>Category / Type</span>
                      {highlightDifferences && hasTypeDiff && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                    </div>
                  </td>
                  {products.map((product) => (
                    <td key={product.id} className="p-3 border-l border-neutral-200 align-middle">
                      <span className="inline-block text-xs font-medium text-neutral-800 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded">
                        {product.productType || 'Screen Assembly'}
                      </span>
                    </td>
                  ))}
                  {Array.from({ length: emptySlotsCount }).map((_, i) => (
                    <td key={i} className="p-3 border-l border-dashed border-neutral-200 text-neutral-300 text-xs text-center">
                      —
                    </td>
                  ))}
                </tr>

                {/* 4. Vendor / Brand Row */}
                <tr className={highlightDifferences && hasVendorDiff ? 'bg-amber-50/50' : ''}>
                  <td className="p-3 text-xs font-semibold text-neutral-700 bg-neutral-50/40 align-middle">
                    <div className="flex items-center gap-1.5">
                      <span>Brand / Vendor</span>
                      {highlightDifferences && hasVendorDiff && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                    </div>
                  </td>
                  {products.map((product) => (
                    <td key={product.id} className="p-3 border-l border-neutral-200 align-middle text-xs font-semibold text-neutral-800">
                      {product.vendor || 'DisplayCellPros OEM'}
                    </td>
                  ))}
                  {Array.from({ length: emptySlotsCount }).map((_, i) => (
                    <td key={i} className="p-3 border-l border-dashed border-neutral-200 text-neutral-300 text-xs text-center">
                      —
                    </td>
                  ))}
                </tr>

                {/* 5. Key Description Row */}
                <tr>
                  <td className="p-3 text-xs font-semibold text-neutral-700 bg-neutral-50/40 align-top">
                    <span>Description</span>
                  </td>
                  {products.map((product) => (
                    <td key={product.id} className="p-3 border-l border-neutral-200 align-top text-xs text-neutral-600 leading-relaxed">
                      {product.description ? (
                        <div className="max-h-48 overflow-y-auto pr-1 text-xs text-neutral-600">
                          {product.description}
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">No description provided</span>
                      )}
                    </td>
                  ))}
                  {Array.from({ length: emptySlotsCount }).map((_, i) => (
                    <td key={i} className="p-3 border-l border-dashed border-neutral-200 text-neutral-300 text-xs text-center">
                      —
                    </td>
                  ))}
                </tr>

                {/* 6. Variants Available */}
                <tr>
                  <td className="p-3 text-xs font-semibold text-neutral-700 bg-neutral-50/40 align-middle">
                    <span>Options / Variants</span>
                  </td>
                  {products.map((product) => {
                    const count = product.variants?.edges?.length || 1
                    const firstVariant = product.variants?.edges?.[0]?.node?.title
                    return (
                      <td key={product.id} className="p-3 border-l border-neutral-200 align-middle text-xs text-neutral-700">
                        <span className="font-semibold">{count}</span> variant{count !== 1 ? 's' : ''}
                        {firstVariant && firstVariant !== 'Default Title' && (
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            e.g. {firstVariant}
                          </div>
                        )}
                      </td>
                    )
                  })}
                  {Array.from({ length: emptySlotsCount }).map((_, i) => (
                    <td key={i} className="p-3 border-l border-dashed border-neutral-200 text-neutral-300 text-xs text-center">
                      —
                    </td>
                  ))}
                </tr>

                {/* 7. Direct Action Links Row */}
                <tr>
                  <td className="p-3 text-xs font-semibold text-neutral-700 bg-neutral-50/40 align-middle rounded-bl-lg">
                    <span>Actions</span>
                  </td>
                  {products.map((product) => (
                    <td key={product.id} className="p-3 border-l border-neutral-200 align-middle">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Link
                          href={`${productBaseUrl}/${product.handle}`}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                        >
                          <span>Full Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  ))}
                  {Array.from({ length: emptySlotsCount }).map((_, i) => (
                    <td key={i} className="p-3 border-l border-dashed border-neutral-200 text-neutral-300 text-xs text-center">
                      —
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            <span>Attributes and pricing are synchronized with the live Shopify catalog.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-lg text-xs transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductComparisonModal
