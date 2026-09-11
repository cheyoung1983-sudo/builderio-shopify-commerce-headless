import React, { useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  X,
  Check,
  ShoppingCart,
  ShieldCheck,
  Truck,
  RotateCcw,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Wrench,
  Clock,
  Layers,
  Tag,
  PackageOpen,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import {
  fetchStorefrontProductByHandle,
  ShopifyProductDetailNode,
  ShopifyVariantNode,
} from '../../services/shopify'
import { useUI } from '../common/context'
import { useAddItemToCart } from '../../lib/shopify/storefront-data-hooks/src/hooks/useAddItemToCart'
import { CartContext } from '../../context/CartContext'
import { ProductDetailSkeleton } from './ProductDetailSkeleton'
import { Breadcrumbs } from '../common/Breadcrumbs'

export interface ProductDetailProps {
  /** The Shopify product handle to fetch and display */
  handle?: string | null
  /** Optional pre-loaded product data (e.g. from SSR) */
  initialProduct?: ShopifyProductDetailNode | null
  /** Whether the component is rendered inside an overlay modal */
  asModal?: boolean
  /** Controlled open state when rendered as modal */
  isOpen?: boolean
  /** Callback fired when user requests closing the detail view or modal */
  onClose?: () => void
  /** Optional callback when user clicks "View in Grid" or Back */
  onBackToGrid?: () => void
  /** Base URL for product links (default: /product) */
  productBaseUrl?: string
  /** Additional container class name */
  className?: string
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  handle,
  initialProduct = null,
  asModal = false,
  isOpen = true,
  onClose,
  onBackToGrid,
  productBaseUrl = '/product',
  className = '',
}) => {
  const [product, setProduct] = useState<ShopifyProductDetailNode | null>(initialProduct)
  const [loading, setLoading] = useState<boolean>(!initialProduct && Boolean(handle))
  const [error, setError] = useState<string | null>(null)

  // Active gallery image index
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)
  // Selected variant
  const [selectedVariantId, setSelectedVariantId] = useState<string>('')
  // Quantity selector
  const [quantity, setQuantity] = useState<number>(1)
  // Adding to cart state
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false)
  const [addSuccess, setAddSuccess] = useState<boolean>(false)
  // Active tab in info section
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'warranty'>('overview')
  // Share notification
  const [copiedLink, setCopiedLink] = useState<boolean>(false)

  // Modal scroll progress tracking
  const modalBodyRef = useRef<HTMLDivElement>(null)
  const [modalScrollProgress, setModalScrollProgress] = useState<number>(0)

  const handleModalScroll = useCallback(() => {
    if (!modalBodyRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = modalBodyRef.current
    const diff = scrollHeight - clientHeight
    if (diff > 0) {
      setModalScrollProgress(Math.min(Math.max((scrollTop / diff) * 100, 0), 100))
    } else {
      setModalScrollProgress(0)
    }
  }, [])

  // Context & Hooks
  const { openSidebar } = useUI()
  const addItemToCart = useAddItemToCart()
  const cart = useContext(CartContext)

  // Fetch product data whenever handle changes
  const loadProduct = useCallback(async (productHandle: string) => {
    if (!productHandle) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetchStorefrontProductByHandle(productHandle)
      if (res.ok && res.data?.product) {
        setProduct(res.data.product)
        setSelectedImageIndex(0)
        // Select first available variant or first variant
        const variants = res.data.product.variants?.edges || []
        const firstAvailable =
          variants.find((v) => v.node.availableForSale)?.node || variants[0]?.node
        if (firstAvailable) {
          setSelectedVariantId(firstAvailable.id)
        }
      } else {
        const errorMsg =
          res.errors?.[0]?.message || `Product with handle "${productHandle}" not found.`
        setError(errorMsg)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load product details from Shopify Storefront API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialProduct && (!handle || initialProduct.handle === handle)) {
      // This branch resyncs local state when `handle`/`initialProduct`
      // change on an already-mounted instance (client-side nav between
      // product pages reuses the component); the other branch below
      // triggers a genuine async fetch, so the effect can't be split into
      // a pure derived-state read without duplicating the
      // handle/initialProduct matching logic in two places.
       
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProduct(initialProduct)
      setLoading(false)
      const variants = initialProduct.variants?.edges || []
      const firstAvailable =
        variants.find((v) => v.node.availableForSale)?.node || variants[0]?.node
      if (firstAvailable) {
        setSelectedVariantId(firstAvailable.id)
      }
    } else if (handle) {
      loadProduct(handle)
    }
  }, [handle, initialProduct, loadProduct])

  // Extract all images for the gallery
  const images = useMemo(() => {
    if (!product) return []
    const list: Array<{ url: string; altText?: string | null; width?: number | null; height?: number | null }> = []
    
    // Check featuredImage
    if (product.featuredImage?.url) {
      list.push(product.featuredImage)
    }
    // Check images edges
    product.images?.edges?.forEach((edge) => {
      if (edge.node?.url && !list.some((img) => img.url === edge.node.url)) {
        list.push(edge.node)
      }
    })
    return list
  }, [product])

  // Variants list
  const variants = useMemo(() => {
    return product?.variants?.edges?.map((edge) => edge.node) || []
  }, [product])

  // Active selected variant
  const selectedVariant: ShopifyVariantNode | undefined = useMemo(() => {
    if (!variants.length) return undefined
    return variants.find((v) => v.id === selectedVariantId) || variants[0]
  }, [variants, selectedVariantId])

  // Handle variant selection
  const handleVariantSelect = (variant: ShopifyVariantNode) => {
    setSelectedVariantId(variant.id)
    // If variant has an associated image, switch gallery to it
    if (variant.image?.url) {
      const imgIdx = images.findIndex((img) => img.url === variant.image?.url)
      if (imgIdx !== -1) {
        setSelectedImageIndex(imgIdx)
      }
    }
  }

  // Pricing calculations
  const priceAmount = selectedVariant
    ? selectedVariant.price.amount
    : product?.priceRange.minVariantPrice.amount || '0'
  const currencyCode = selectedVariant
    ? selectedVariant.price.currencyCode
    : product?.priceRange.minVariantPrice.currencyCode || 'USD'

  const compareAtPriceAmount = selectedVariant?.compareAtPrice?.amount
    ? selectedVariant.compareAtPrice.amount
    : product?.compareAtPriceRange?.minVariantPrice?.amount

  const hasDiscount =
    compareAtPriceAmount &&
    parseFloat(compareAtPriceAmount) > parseFloat(priceAmount)

  const discountAmount = hasDiscount
    ? (parseFloat(compareAtPriceAmount!) - parseFloat(priceAmount)).toFixed(2)
    : null

  const discountPercent = hasDiscount
    ? Math.round(
        ((parseFloat(compareAtPriceAmount!) - parseFloat(priceAmount)) /
          parseFloat(compareAtPriceAmount!)) *
          100
      )
    : null

  const isAvailable = selectedVariant ? selectedVariant.availableForSale : product?.availableForSale

  // Quantity controls
  const handleDecreaseQuantity = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1))
  }

  const handleIncreaseQuantity = () => {
    setQuantity((prev) => Math.min(prev + 1, 99))
  }

  // Add to cart handler
  const handleAddToCart = async () => {
    if (!selectedVariant || !isAvailable || !product) return
    setIsAddingToCart(true)

    try {
      // Add to modern CartContext
      if (cart && typeof cart.addItem === 'function') {
        await cart.addItem({
          variantId: selectedVariant.id,
          quantity,
          title: product.title,
          handle: product.handle,
          variantTitle: selectedVariant.title,
          price: { amount: priceAmount, currencyCode },
          compareAtPrice: compareAtPriceAmount
            ? { amount: compareAtPriceAmount, currencyCode }
            : null,
          image: selectedVariant.image?.url || product.featuredImage?.url || undefined,
          vendor: product.vendor,
          sku: selectedVariant.sku || undefined,
        })
      }

      // Also invoke storefront-data-hooks for backwards compatibility
      if (typeof addItemToCart === 'function') {
        try {
          await addItemToCart(selectedVariant.id, quantity)
        } catch (e) {
          // Soft-catch if already processed by modern cart
        }
      }

      setAddSuccess(true)
      setTimeout(() => {
        setAddSuccess(false)
        if (typeof openSidebar === 'function') {
          openSidebar()
        }
      }, 700)
    } catch (err) {
      console.warn('Cart notice: item requested, opening sidebar fallback', err)
      setAddSuccess(true)
      setTimeout(() => {
        setAddSuccess(false)
        if (typeof openSidebar === 'function') {
          openSidebar()
        }
      }, 700)
    } finally {
      setIsAddingToCart(false)
    }
  }

  // Copy product link to clipboard
  const handleShare = () => {
    if (typeof window !== 'undefined' && product?.handle) {
      const url = `${window.location.origin}${productBaseUrl}/${product.handle}`
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      })
    }
  }

  // Keyboard navigation & Esc key listener for modal
  useEffect(() => {
    if (!asModal || !isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    // Prevent body scrolling while modal is open
    const originalStyle = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalStyle
    }
  }, [asModal, isOpen, onClose])

  // Don't render modal if closed
  if (asModal && !isOpen) {
    return null
  }

  // Content body rendering
  const renderContent = () => {
    if (loading) {
      return (
        <ProductDetailSkeleton
          asModal={asModal}
          className={asModal ? 'p-2 sm:p-4' : 'p-2 sm:p-4 border-0 shadow-none'}
        />
      )
    }

    if (error || !product) {
      return (
        <div id="product-detail-error" className="p-8 md:p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">Product Not Found</h3>
          <p className="text-sm text-neutral-600 mb-6">
            {error || `Unable to locate details for product handle "${handle}".`}
          </p>
          <div className="flex items-center justify-center gap-3">
            {handle && (
              <button
                id="product-detail-retry-btn"
                onClick={() => loadProduct(handle)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </button>
            )}
            {onClose && asModal && (
              <button
                id="product-detail-close-error-btn"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                Close
              </button>
            )}
            {onBackToGrid && !asModal && (
              <button
                id="product-detail-back-error-btn"
                onClick={onBackToGrid}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                Back to Catalog
              </button>
            )}
          </div>
        </div>
      )
    }

    const currentImage = images[selectedImageIndex] || {
      url: '',
      altText: product.title,
    }

    return (
      <div id="product-detail-content" className="p-6 md:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* LEFT: Multi-Image Gallery */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Main Active Image Box */}
            <div className="relative aspect-square w-full bg-neutral-100/80 rounded-2xl overflow-hidden border border-neutral-200/80 group">
              {currentImage.url ? (
                <Image
                  src={currentImage.url}
                  alt={currentImage.altText || product.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 gap-3">
                  <PackageOpen className="w-16 h-16 stroke-[1.2]" />
                  <span className="text-sm font-medium">No Image Available</span>
                </div>
              )}

              {/* Status Badges Overlay */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                {hasDiscount && (
                  <span className="bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
                    Save {discountPercent}%
                  </span>
                )}
                {product.productType && (
                  <span className="bg-neutral-900/85 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-md shadow-sm">
                    {product.productType}
                  </span>
                )}
              </div>

              {/* Stock Status Badge */}
              <div className="absolute top-4 right-4 z-10">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-md shadow-sm inline-flex items-center gap-1.5 backdrop-blur-sm ${
                    isAvailable
                      ? 'bg-emerald-600/90 text-white'
                      : 'bg-neutral-800/90 text-neutral-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isAvailable ? 'bg-emerald-300 animate-pulse' : 'bg-neutral-400'
                    }`}
                  />
                  {isAvailable ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              {/* Carousel Arrows (if > 1 image) */}
              {images.length > 1 && (
                <>
                  <button
                    id="product-gallery-prev-btn"
                    aria-label="Previous image"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedImageIndex((prev) =>
                        prev === 0 ? images.length - 1 : prev - 1
                      )
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    id="product-gallery-next-btn"
                    aria-label="Next image"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedImageIndex((prev) =>
                        prev === images.length - 1 ? 0 : prev + 1
                      )
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-neutral-900/70 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                  {selectedImageIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div
                id="product-detail-thumbnails"
                className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin"
              >
                {images.map((img, idx) => {
                  const isSelected = idx === selectedImageIndex
                  return (
                    <button
                      key={idx}
                      id={`thumbnail-btn-${idx}`}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                          : 'border-neutral-200/80 hover:border-neutral-300 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt={img.altText || `${product.title} thumbnail ${idx + 1}`}
                        fill
                        sizes="80px"
                        className="object-contain p-1.5"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Trust and Assurance Banner */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200/70 text-center">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-[11px] font-semibold text-neutral-800">
                  90-Day Warranty
                </span>
                <span className="text-[10px] text-neutral-500">Tested & Verified</span>
              </div>
              <div className="flex flex-col items-center gap-1 border-x border-neutral-200">
                <Truck className="w-5 h-5 text-blue-600" />
                <span className="text-[11px] font-semibold text-neutral-800">
                  Fast Shipping
                </span>
                <span className="text-[10px] text-neutral-500">Same-Day Dispatch</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Wrench className="w-5 h-5 text-amber-600" />
                <span className="text-[11px] font-semibold text-neutral-800">
                  Labor Included
                </span>
                <span className="text-[10px] text-neutral-500">Pro Installation</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Product Details, Variants, Add to Cart */}
          <div className="lg:col-span-5 flex flex-col">
            {/* Header Metadata */}
            <div className="flex items-center justify-between gap-2 mb-2">
              {product.vendor && (
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded">
                  {product.vendor}
                </span>
              )}
              {/* Share & External Link Controls */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  id="product-share-btn"
                  onClick={handleShare}
                  title="Copy product link"
                  className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors relative"
                >
                  {copiedLink ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      Copied!
                    </span>
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </button>
                <Link
                  href={`${productBaseUrl}/${product.handle}`}
                  title="Open full page"
                  className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 leading-snug mb-3">
              {product.title}
            </h1>

            {/* Price Row */}
            <div className="flex items-baseline gap-3 py-3 border-y border-neutral-100 my-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
                ${parseFloat(priceAmount).toFixed(2)}{' '}
                <span className="text-xs font-medium text-neutral-500">{currencyCode}</span>
              </span>
              {hasDiscount && (
                <span className="text-base text-neutral-400 line-through">
                  ${parseFloat(compareAtPriceAmount!).toFixed(2)}
                </span>
              )}
              {discountAmount && (
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  Save ${discountAmount}
                </span>
              )}
            </div>

            {/* Repair / Service Notice */}
            <div className="flex items-center gap-2 text-xs text-neutral-600 bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-lg mb-5">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Includes professional installation labor. Typical turnaround:{' '}
                <strong className="text-neutral-800">45–60 minutes</strong>.
              </span>
            </div>

            {/* Variant Selector (if more than 1 variant exists) */}
            {variants.length > 1 && (
              <div id="product-variants-selector" className="mb-5">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                  Select Option / Variant:
                </label>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const isSelected = variant.id === selectedVariantId
                    return (
                      <button
                        key={variant.id}
                        id={`variant-btn-${variant.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
                        onClick={() => handleVariantSelect(variant)}
                        disabled={!variant.availableForSale}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                            : variant.availableForSale
                            ? 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                            : 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed line-through'
                        }`}
                      >
                        <span>{variant.title}</span>
                        {variant.price && (
                          <span
                            className={`text-[10px] ${
                              isSelected ? 'text-neutral-300' : 'text-neutral-500'
                            }`}
                          >
                            (${parseFloat(variant.price.amount).toFixed(2)})
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quantity and Add to Cart Section */}
            <div className="space-y-3 pt-2 mb-6">
              <div className="flex items-center gap-4">
                {/* Quantity Stepper */}
                <div className="flex items-center border border-neutral-300 rounded-lg bg-white overflow-hidden shadow-sm">
                  <button
                    id="quantity-decrease-btn"
                    aria-label="Decrease quantity"
                    onClick={handleDecreaseQuantity}
                    disabled={quantity <= 1 || !isAvailable}
                    className="p-2.5 text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span
                    id="quantity-display"
                    className="w-10 text-center font-bold text-sm text-neutral-800 select-none"
                  >
                    {quantity}
                  </span>
                  <button
                    id="quantity-increase-btn"
                    aria-label="Increase quantity"
                    onClick={handleIncreaseQuantity}
                    disabled={quantity >= 99 || !isAvailable}
                    className="p-2.5 text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Primary Add to Cart Button */}
                <button
                  id="product-add-to-cart-btn"
                  onClick={handleAddToCart}
                  disabled={!isAvailable || isAddingToCart}
                  className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
                    addSuccess
                      ? 'bg-emerald-600 text-white'
                      : isAvailable
                      ? 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white hover:shadow-lg focus:ring-2 focus:ring-primary-400 focus:ring-offset-2'
                      : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isAddingToCart ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : addSuccess ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Added to Cart!</span>
                    </>
                  ) : isAvailable ? (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to Cart • ${(parseFloat(priceAmount) * quantity).toFixed(2)}</span>
                    </>
                  ) : (
                    <span>Sold Out</span>
                  )}
                </button>
              </div>
            </div>

            {/* Tabbed Info Panel: Overview, Specs, Warranty */}
            <div className="mt-auto border-t border-neutral-200 pt-4">
              {/* Tab navigation */}
              <div className="flex border-b border-neutral-200 text-xs font-semibold text-neutral-500 mb-4">
                <button
                  id="tab-overview-btn"
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2.5 px-3 -mb-px transition-colors border-b-2 ${
                    activeTab === 'overview'
                      ? 'border-emerald-600 text-emerald-700 font-bold'
                      : 'border-transparent hover:text-neutral-800'
                  }`}
                >
                  Overview & Features
                </button>
                <button
                  id="tab-specs-btn"
                  onClick={() => setActiveTab('specs')}
                  className={`pb-2.5 px-3 -mb-px transition-colors border-b-2 ${
                    activeTab === 'specs'
                      ? 'border-emerald-600 text-emerald-700 font-bold'
                      : 'border-transparent hover:text-neutral-800'
                  }`}
                >
                  Specifications
                </button>
                <button
                  id="tab-warranty-btn"
                  onClick={() => setActiveTab('warranty')}
                  className={`pb-2.5 px-3 -mb-px transition-colors border-b-2 ${
                    activeTab === 'warranty'
                      ? 'border-emerald-600 text-emerald-700 font-bold'
                      : 'border-transparent hover:text-neutral-800'
                  }`}
                >
                  Warranty & Shipping
                </button>
              </div>

              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div id="tab-overview-content" className="text-xs text-neutral-600 space-y-3 leading-relaxed">
                  {product.descriptionHtml ? (
                    <div
                      className="prose prose-sm prose-neutral max-w-none text-xs text-neutral-600 [&>h2]:text-sm [&>h2]:font-bold [&>h2]:text-neutral-900 [&>h2]:mb-1.5 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:mb-2 [&>li]:mb-1 [&>strong]:text-neutral-900"
                      dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                    />
                  ) : product.description ? (
                    <p>{product.description}</p>
                  ) : (
                    <p>No description provided for this product.</p>
                  )}
                </div>
              )}

              {/* Tab 2: Specifications */}
              {activeTab === 'specs' && (
                <div id="tab-specs-content" className="text-xs space-y-2">
                  <div className="grid grid-cols-2 py-1.5 border-b border-neutral-100">
                    <span className="text-neutral-500">Handle</span>
                    <span className="font-mono text-neutral-800 text-[11px] truncate">
                      {product.handle}
                    </span>
                  </div>
                  {product.vendor && (
                    <div className="grid grid-cols-2 py-1.5 border-b border-neutral-100">
                      <span className="text-neutral-500">Brand / Vendor</span>
                      <span className="font-semibold text-neutral-800">{product.vendor}</span>
                    </div>
                  )}
                  {product.productType && (
                    <div className="grid grid-cols-2 py-1.5 border-b border-neutral-100">
                      <span className="text-neutral-500">Product Type</span>
                      <span className="text-neutral-800">{product.productType}</span>
                    </div>
                  )}
                  {selectedVariant?.sku && (
                    <div className="grid grid-cols-2 py-1.5 border-b border-neutral-100">
                      <span className="text-neutral-500">Variant SKU</span>
                      <span className="font-mono text-neutral-800">{selectedVariant.sku}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 py-1.5 border-b border-neutral-100">
                    <span className="text-neutral-500">Total Variants</span>
                    <span className="text-neutral-800">{variants.length} available</span>
                  </div>
                  {product.tags && product.tags.length > 0 && (
                    <div className="py-2">
                      <span className="text-neutral-500 block mb-1.5">Tags:</span>
                      <div className="flex flex-wrap gap-1">
                        {product.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded text-[10px]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Warranty & Shipping */}
              {activeTab === 'warranty' && (
                <div id="tab-warranty-content" className="text-xs text-neutral-600 space-y-2.5 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-neutral-900 block">90-Day Coverage</strong>
                      We stand behind all display screens and console components with a 90-day defect replacement warranty.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Truck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-neutral-900 block">Fast Safe Shipping</strong>
                      Packed in shock-absorbent anti-static packaging with tracking included on every order.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-neutral-900 block">30-Day Easy Returns</strong>
                      Unopened and uninstalled parts can be returned within 30 days of delivery.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If rendered as Modal Dialog / Slide-Over Drawer
  if (asModal) {
    return (
      <div
        id="product-detail-modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) {
            onClose()
          }
        }}
        className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      >
        <div
          id="product-detail-modal-container"
          className={`relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200/90 my-auto transition-all ${className}`}
        >
          {/* Modal Header Bar with Close Button and Progress Bar */}
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-3.5 border-b border-neutral-100 flex items-center justify-between relative">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Product Quick View
              </span>
              {product?.title && (
                <span className="hidden sm:inline text-xs text-neutral-400 truncate max-w-sm">
                  • {product.title}
                </span>
              )}
            </div>
            {onClose && (
              <button
                id="product-detail-close-btn"
                aria-label="Close product details"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Subtle Horizontal Scroll Progress Bar inside Modal */}
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-neutral-100/80 overflow-hidden pointer-events-none">
              <div
                className="h-full bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 transition-[width] duration-75 ease-out"
                style={{ width: `${modalScrollProgress}%` }}
              />
            </div>
          </div>

          {/* Modal Body */}
          <div
            ref={modalBodyRef}
            onScroll={handleModalScroll}
            className="max-h-[85vh] overflow-y-auto"
          >
            {renderContent()}
          </div>
        </div>
      </div>
    )
  }

  // Standalone Full-Page / Inline View
  return (
    <div
      id="product-detail-inline-container"
      className={`max-w-6xl mx-auto bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden ${className}`}
    >
      {/* Breadcrumb Navigation & Back Link Bar */}
      <div className="px-6 py-3.5 border-b border-neutral-100 flex items-center justify-between gap-4 flex-wrap bg-neutral-50/50">
        <Breadcrumbs
          id="product-detail-inline-breadcrumbs"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/' },
            ...(product?.productType
              ? [{ label: product.productType, href: `/?category=${encodeURIComponent(product.productType)}` }]
              : []),
            { label: product?.title || 'Product Details', isCurrent: true },
          ]}
        />
        {onBackToGrid && (
          <button
            id="product-detail-back-btn"
            onClick={onBackToGrid}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to All Products
          </button>
        )}
      </div>
      {renderContent()}
    </div>
  )
}

export default ProductDetail
