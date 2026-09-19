import React, { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  X,
  ShoppingBag,
  Check,
  Heart,
  ShieldCheck,
  Truck,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  PackageOpen,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { useQuickView } from '../../context/QuickViewContext'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import {
  fetchStorefrontProductByHandle,
  ShopifyProductNode,
  ShopifyProductDetailNode,
  ShopifyVariantNode,
} from '../../services/shopify'
import { PRODUCT_IMAGE_BLUR_DATA_URL, RESPONSIVE_IMAGE_SIZES } from '../../lib/image'
import { sanitizeRichText } from '../../lib/sanitize-html'

export interface QuickViewDrawerProps {
  productBaseUrl?: string
}

interface QuickViewContentProps {
  initialProduct: ShopifyProductNode | ShopifyProductDetailNode | null
  handle: string | null
  productBaseUrl: string
  onClose: () => void
}

const QuickViewContent: React.FC<QuickViewContentProps> = ({
  initialProduct,
  handle,
  productBaseUrl,
  onClose,
}) => {
  const { addItem } = useCart()
  const { isInWishlist, toggleWishlist } = useWishlist()

  const [fetchedProduct, setFetchedProduct] = useState<ShopifyProductDetailNode | null>(null)
  const [loading, setLoading] = useState<boolean>(Boolean(handle && !initialProduct))
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)
  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
    return initialProduct?.variants?.edges?.[0]?.node?.id || ''
  })
  const [quantity, setQuantity] = useState<number>(1)
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false)
  const [addSuccess, setAddSuccess] = useState<boolean>(false)

  // Asynchronously fetch complete details if handle is present
  useEffect(() => {
    if (!handle) return

    let isMounted = true

    fetchStorefrontProductByHandle(handle)
      .then((res) => {
        if (!isMounted) return
        const productData = res.data?.product
        if (productData) {
          setFetchedProduct(productData)
          const firstVariantId = productData.variants?.edges?.[0]?.node?.id
          if (firstVariantId) {
            setSelectedVariantId((current) => current || firstVariantId)
          }
        }
      })
      .catch((err) => {
        console.warn('[QuickViewDrawer] Error loading product details:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [handle])

  const activeProduct = fetchedProduct || initialProduct

  // Extract images
  const images = useMemo(() => {
    if (!activeProduct) return []
    const edges = activeProduct.images?.edges || []
    if (edges.length > 0) {
      return edges.map((e: any) => ({
        url: e.node?.url,
        altText: e.node?.altText || activeProduct.title,
      }))
    }
    if (activeProduct.featuredImage?.url) {
      return [
        {
          url: activeProduct.featuredImage.url,
          altText: activeProduct.featuredImage.altText || activeProduct.title,
        },
      ]
    }
    return []
  }, [activeProduct])

  // Extract variants
  const variants = useMemo(() => {
    if (!activeProduct) return []
    return (activeProduct.variants?.edges || []).map((e: any) => e.node as ShopifyVariantNode)
  }, [activeProduct])

  // Active selected variant
  const currentVariant = useMemo(() => {
    if (!variants.length) return null
    return variants.find((v) => v.id === selectedVariantId) || variants[0]
  }, [variants, selectedVariantId])

  // Price calculations
  const price =
    currentVariant?.price?.amount || activeProduct?.priceRange?.minVariantPrice?.amount || '0'
  const currency =
    currentVariant?.price?.currencyCode ||
    activeProduct?.priceRange?.minVariantPrice?.currencyCode ||
    'USD'
  const compareAtPrice =
    currentVariant?.compareAtPrice?.amount ||
    activeProduct?.compareAtPriceRange?.minVariantPrice?.amount
  const isOnSale = compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price)
  const discountPercent = isOnSale
    ? Math.round(
        ((parseFloat(compareAtPrice!) - parseFloat(price)) / parseFloat(compareAtPrice!)) * 100
      )
    : 0

  const isSaved = activeProduct ? isInWishlist(activeProduct.id) : false

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId)
    // If variant has an image, switch gallery index to matching image
    const variant = variants.find((v) => v.id === variantId)
    const variantImgUrl = (variant as any)?.image?.url
    if (variantImgUrl) {
      const idx = images.findIndex((img) => img.url === variantImgUrl)
      if (idx !== -1) {
        setSelectedImageIndex(idx)
      }
    }
  }

  const handleAddToCart = async () => {
    if (!activeProduct) return
    setIsAddingToCart(true)

    try {
      const variantId = currentVariant?.id || activeProduct.id
      const variantTitle =
        currentVariant?.title && currentVariant.title !== 'Default Title'
          ? currentVariant.title
          : undefined
      const imgUrl = (currentVariant as any)?.image?.url || images[0]?.url || null

      await addItem({
        variantId,
        quantity,
        title: activeProduct.title,
        handle: activeProduct.handle,
        variantTitle,
        price: { amount: price, currencyCode: currency },
        compareAtPrice: compareAtPrice ? { amount: compareAtPrice, currencyCode: currency } : null,
        image: imgUrl,
        vendor: activeProduct.vendor,
        options: currentVariant?.selectedOptions || [],
      })

      setAddSuccess(true)
      setTimeout(() => {
        setAddSuccess(false)
      }, 2500)
    } catch (err) {
      console.warn('[QuickViewDrawer] Error adding item to cart:', err)
    } finally {
      setIsAddingToCart(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Quick View
          </span>
          {activeProduct?.vendor && (
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-medium hidden sm:inline">
              • {activeProduct.vendor}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeProduct?.handle && (
            <Link
              id="quick-view-full-page-link"
              href={`${productBaseUrl}/${activeProduct.handle}`}
              onClick={onClose}
              className="text-xs font-semibold text-neutral-600 hover:text-emerald-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              title="Open full product page"
            >
              <span className="hidden sm:inline">Full Details</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}

          <button
            id="quick-view-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close Quick View side-panel"
            className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-950 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {loading && !activeProduct ? (
          <div className="space-y-4 animate-pulse">
            <div className="aspect-square w-full bg-neutral-200 rounded-xl" />
            <div className="h-6 bg-neutral-200 rounded w-3/4" />
            <div className="h-5 bg-neutral-200 rounded w-1/3" />
            <div className="h-20 bg-neutral-100 rounded-lg" />
          </div>
        ) : activeProduct ? (
          <>
            {/* Image Gallery */}
            <div className="space-y-3">
              <div className="relative aspect-square w-full bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200/80">
                {images.length > 0 && images[selectedImageIndex]?.url ? (
                  <Image
                    src={images[selectedImageIndex].url}
                    alt={images[selectedImageIndex].altText || activeProduct.title}
                    fill
                    placeholder="blur"
                    blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
                    sizes={RESPONSIVE_IMAGE_SIZES.productDetail}
                    priority
                    className="object-contain p-4 object-center transition-all duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 gap-2">
                    <PackageOpen className="w-12 h-12 stroke-[1.5]" />
                    <span className="text-xs">No image preview</span>
                  </div>
                )}

                {/* Badges Overlay */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                  {isOnSale && (
                    <span className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                      Save {discountPercent}%
                    </span>
                  )}
                  <span className="bg-emerald-600/95 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-sm inline-flex items-center gap-1 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    In Stock & Ready to Ship
                  </span>
                </div>

                {/* Wishlist Toggle Button (Top Right) */}
                <button
                  id="quick-view-wishlist-toggle-btn"
                  type="button"
                  onClick={() => toggleWishlist(activeProduct as ShopifyProductNode)}
                  aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
                  aria-pressed={isSaved}
                  className={`absolute top-3 right-3 p-2.5 rounded-full transition-all shadow-md z-10 cursor-pointer ${
                    isSaved
                      ? 'bg-rose-500 text-white ring-2 ring-rose-300 scale-105'
                      : 'bg-white/90 hover:bg-white text-neutral-700 hover:text-rose-500 border border-neutral-200 backdrop-blur-xs'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      isSaved ? 'fill-current text-white' : ''
                    }`}
                  />
                </button>

                {/* Left / Right Carousel arrows for multi-image */}
                {images.length > 1 && (
                  <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-10">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImageIndex((prev) =>
                          prev > 0 ? prev - 1 : images.length - 1
                        )
                      }
                      aria-label="Previous image"
                      className="p-1.5 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md pointer-events-auto transition-transform active:scale-95 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImageIndex((prev) =>
                          prev < images.length - 1 ? prev + 1 : 0
                        )
                      }
                      aria-label="Next image"
                      className="p-1.5 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md pointer-events-auto transition-transform active:scale-95 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      aria-label={`View image thumbnail ${idx + 1}`}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border-2 transition-all cursor-pointer ${
                        selectedImageIndex === idx
                          ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'border-neutral-200 hover:border-neutral-400 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt={img.altText || `Thumbnail ${idx + 1}`}
                        fill
                        sizes="64px"
                        className="object-cover object-center"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Title & Brand */}
            <div>
              {activeProduct.vendor && (
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-1">
                  {activeProduct.vendor}
                </p>
              )}
              <h2
                id="quick-view-drawer-title"
                className="text-xl sm:text-2xl font-bold text-neutral-900 leading-snug tracking-tight"
              >
                {activeProduct.title}
              </h2>
            </div>

            {/* Pricing Block */}
            <div className="flex items-baseline gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/70">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-neutral-900">
                  ${parseFloat(price).toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-neutral-500 uppercase">
                  {currency}
                </span>
              </div>
              {isOnSale && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-500 line-through">
                    ${parseFloat(compareAtPrice!).toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                    Save ${(parseFloat(compareAtPrice!) - parseFloat(price)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Variant Options Selector */}
            {variants.length > 1 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Select Variant / Model
                  </label>
                  <span className="text-xs text-neutral-500">
                    {variants.length} options available
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const isSelected = variant.id === (currentVariant?.id || selectedVariantId)
                    const isAvailable = variant.availableForSale !== false
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => handleVariantSelect(variant.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border text-left cursor-pointer flex flex-col gap-0.5 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                            : isAvailable
                            ? 'border-neutral-200 hover:border-neutral-400 bg-white text-neutral-800'
                            : 'border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <span>{variant.title}</span>
                        {variant.price && (
                          <span className="text-[11px] text-neutral-500 font-normal">
                            ${parseFloat(variant.price.amount).toFixed(2)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="quick-view-quantity"
                  className="text-xs font-bold uppercase tracking-wider text-neutral-700 block"
                >
                  Quantity
                </label>
                <div className="flex items-center border border-neutral-300 rounded-xl bg-white shadow-xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="p-2.5 hover:bg-neutral-100 text-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    id="quick-view-quantity"
                    type="number"
                    min="1"
                    max="99"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val) && val >= 1) {
                        setQuantity(Math.min(val, 99))
                      }
                    }}
                    className="w-12 text-center text-sm font-semibold text-neutral-900 focus:outline-none py-1"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    disabled={quantity >= 99}
                    aria-label="Increase quantity"
                    className="p-2.5 hover:bg-neutral-100 text-neutral-700 disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 pt-5">
                <p className="text-xs text-neutral-500">
                  Total:{' '}
                  <span className="font-bold text-neutral-900 text-sm">
                    ${(parseFloat(price) * quantity).toFixed(2)} {currency}
                  </span>
                </p>
              </div>
            </div>

            {/* Primary Add To Cart Button */}
            <div>
              <button
                id="quick-view-add-to-cart-btn"
                type="button"
                onClick={handleAddToCart}
                disabled={isAddingToCart || currentVariant?.availableForSale === false}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                  addSuccess
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50 scale-[1.01]'
                    : currentVariant?.availableForSale === false
                    ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/20 hover:shadow-lg'
                }`}
              >
                {addSuccess ? (
                  <>
                    <Check className="w-5 h-5 animate-scaleIn" />
                    <span>Added to Shopping Bag!</span>
                  </>
                ) : isAddingToCart ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Adding to Bag...</span>
                  </>
                ) : currentVariant?.availableForSale === false ? (
                  <span>Sold Out</span>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      Add to Shopping Bag • ${(parseFloat(price) * quantity).toFixed(2)}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Description & Overview */}
            {activeProduct.description && (
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  Product Highlights
                </h3>
                <div
                  className="text-xs sm:text-sm text-neutral-600 leading-relaxed space-y-2 line-clamp-6"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichText(activeProduct.description),
                  }}
                />
              </div>
            )}

            {/* Value Propositions / Guarantee Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-neutral-100">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50 text-[11px] text-neutral-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Tested OEM</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50 text-[11px] text-neutral-700">
                <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Fast Shipping</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50 text-[11px] text-neutral-700">
                <RotateCcw className="w-4 h-4 text-purple-600 shrink-0" />
                <span>30-Day Returns</span>
              </div>
            </div>

            {/* View Full Product Page Link */}
            {activeProduct.handle && (
              <div className="pt-2 text-center">
                <Link
                  id="quick-view-bottom-full-page-link"
                  href={`${productBaseUrl}/${activeProduct.handle}`}
                  onClick={onClose}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center gap-1"
                >
                  <span>Need detailed specs & compatibility charts? View full product page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center text-neutral-500">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-neutral-400" />
            <p className="text-sm">Product information could not be loaded.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export const QuickViewDrawer: React.FC<QuickViewDrawerProps> = ({
  productBaseUrl = '/product',
}) => {
  const { isOpen, product: contextProduct, handle, closeQuickView } = useQuickView()
  const drawerRef = useRef<HTMLDivElement>(null)

  // Lock body scroll while Quick View side-panel modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeQuickView()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeQuickView])

  if (!isOpen) return null

  const instanceKey = handle || contextProduct?.id || 'quick-view-active'

  return (
    <div
      id="quick-view-side-panel-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop Overlay */}
      <div
        id="quick-view-backdrop"
        onClick={closeQuickView}
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity animate-fade-in cursor-pointer"
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        {/* Slide-over Side Panel */}
        <div
          ref={drawerRef}
          className="w-screen max-w-lg md:max-w-xl bg-white shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-out animate-slide-in-right relative"
        >
          <QuickViewContent
            key={instanceKey}
            initialProduct={contextProduct}
            handle={handle}
            productBaseUrl={productBaseUrl}
            onClose={closeQuickView}
          />
        </div>
      </div>
    </div>
  )
}

export default QuickViewDrawer
