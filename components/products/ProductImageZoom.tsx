import React, { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { ZoomIn, ZoomOut, Maximize2, Minimize2, X, Move } from 'lucide-react'
import { PRODUCT_IMAGE_BLUR_DATA_URL, RESPONSIVE_IMAGE_SIZES } from '../../lib/image'

export interface ProductImageZoomProps {
  /** Image source URL */
  src: string
  /** Alt text for accessibility */
  alt: string
  /** Responsive image sizes (Next.js Image) */
  sizes?: string
  /** Whether this image is prioritized for LCP */
  priority?: boolean
  /** Blur placeholder URL */
  blurDataURL?: string
  /** Container CSS classes */
  className?: string
  /** Inner image CSS classes */
  imageClassName?: string
  /** Available zoom multiplier levels (default: [1.8, 2.5, 3.2]) */
  zoomScales?: number[]
  /** Children to render as overlays (badges, carousel controls, etc.) */
  children?: React.ReactNode
  /** Whether to allow modal inspection mode */
  allowModalInspection?: boolean
  /** Callback fired when zoom state changes */
  onZoomChange?: (isZoomed: boolean) => void
}

/**
 * ProductImageZoom provides interactive hover-to-zoom lens inspection
 * allowing users to examine fine fabric textures, seams, and product details.
 * Supports fluid cursor tracking, configurable zoom scales, keyboard navigation,
 * touch toggle inspection, and full-screen detail view.
 */
export const ProductImageZoom: React.FC<ProductImageZoomProps> = ({
  src,
  alt,
  sizes = RESPONSIVE_IMAGE_SIZES.productDetail,
  priority = false,
  blurDataURL = PRODUCT_IMAGE_BLUR_DATA_URL,
  className = '',
  imageClassName = '',
  zoomScales = [1.8, 2.5, 3.2],
  children,
  allowModalInspection = true,
  onZoomChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isManuallyToggled, setIsManuallyToggled] = useState(false)
  const [scaleIndex, setScaleIndex] = useState(1) // Default to 2.5x (index 1)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalPos, setModalPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 })
  const [modalScale, setModalScale] = useState(2.5)

  const activeScale = zoomScales[scaleIndex] || 2.5
  const isZoomActive = isHovered || isManuallyToggled

  // Notify parent on zoom state changes
  useEffect(() => {
    onZoomChange?.(isZoomActive)
  }, [isZoomActive, onZoomChange])

  // Calculate mouse percentage coordinates relative to container
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))

    setMousePos({ x, y })
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsManuallyToggled((prev) => !prev)
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      setScaleIndex((prev) => Math.min(zoomScales.length - 1, prev + 1))
      setIsManuallyToggled(true)
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault()
      setScaleIndex((prev) => Math.max(0, prev - 1))
    } else if (isZoomActive) {
      // Pan via arrow keys
      const step = 5
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setMousePos((p) => ({ ...p, x: Math.max(0, p.x - step) }))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setMousePos((p) => ({ ...p, x: Math.min(100, p.x + step) }))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMousePos((p) => ({ ...p, y: Math.max(0, p.y - step) }))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMousePos((p) => ({ ...p, y: Math.min(100, p.y + step) }))
      } else if (e.key === 'Escape') {
        setIsManuallyToggled(false)
        setIsHovered(false)
      }
    }
  }

  // Handle modal panning
  const handleModalMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    setModalPos({ x, y })
  }, [])

  // Cycle zoom scales (e.g. 1.8x -> 2.5x -> 3.2x -> 1.8x)
  const cycleScale = (e: React.MouseEvent) => {
    e.stopPropagation()
    setScaleIndex((prev) => (prev + 1) % zoomScales.length)
  }

  return (
    <>
      <div
        id="product-image-zoom-container"
        ref={containerRef}
        role="region"
        aria-label={`${alt} - Hover to zoom and inspect texture`}
        tabIndex={0}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        className={`relative aspect-square w-full bg-neutral-100/90 rounded-2xl overflow-hidden border border-neutral-200/80 group focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
          isZoomActive ? 'cursor-crosshair' : 'cursor-zoom-in'
        } ${className}`}
      >
        {/* Base / Zoomed Image */}
        {src ? (
          <div
            id="product-zoom-image-layer"
            className="w-full h-full relative transition-transform will-change-transform transform-gpu"
            style={{
              transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
              transform: isZoomActive ? `scale(${activeScale})` : 'scale(1)',
              transitionDuration: isZoomActive ? '75ms' : '250ms',
              transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
            }}
          >
            <Image
              src={src}
              alt={alt}
              fill
              priority={priority}
              placeholder="blur"
              blurDataURL={blurDataURL}
              sizes={sizes}
              quality={95}
              className={`object-contain p-4 select-none pointer-events-none ${imageClassName}`}
              referrerPolicy="no-referrer"
            />
          </div>
        ) : null}

        {/* Status overlays / badges (unaffected by zoom scale) */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {children}
        </div>

        {/* Hover Hint Pill (hidden when active zoom is engaged) */}
        <div
          id="product-zoom-hint"
          className={`absolute bottom-3 left-3 z-20 pointer-events-none transition-all duration-200 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-xs border border-neutral-200/60 text-neutral-800 text-xs font-medium ${
            isZoomActive ? 'opacity-0 translate-y-1 scale-95' : 'opacity-90 group-hover:opacity-100'
          }`}
        >
          <ZoomIn className="w-3.5 h-3.5 text-neutral-600" />
          <span>Hover to inspect texture</span>
        </div>

        {/* Active Zoom Badge & Controls (visible when zoomed) */}
        <div
          id="product-zoom-controls-bar"
          className={`absolute bottom-3 left-3 z-20 transition-all duration-200 flex items-center gap-1.5 ${
            isZoomActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          {/* Zoom Level Indicator / Switcher */}
          <button
            id="product-zoom-level-toggle"
            type="button"
            onClick={cycleScale}
            aria-label={`Current magnification: ${activeScale}x. Click to change magnification.`}
            title="Click to cycle zoom magnification"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900/90 hover:bg-black text-white text-xs font-medium backdrop-blur-md shadow-sm transition-transform active:scale-95 cursor-pointer pointer-events-auto"
          >
            <Move className="w-3 h-3 text-neutral-400" />
            <span>{activeScale}x Magnification</span>
          </button>

          {/* Reset Zoom Button */}
          {isManuallyToggled && (
            <button
              id="product-zoom-reset-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsManuallyToggled(false)
                setIsHovered(false)
              }}
              aria-label="Reset zoom"
              title="Reset zoom"
              className="p-1 rounded-lg bg-white/90 hover:bg-white text-neutral-800 shadow-sm transition-transform active:scale-95 cursor-pointer pointer-events-auto border border-neutral-200"
            >
              <ZoomOut className="w-3.5 h-3.5 text-neutral-600" />
            </button>
          )}
        </div>

        {/* Top-Right Quick Zoom / Fullscreen Modal Action */}
        {allowModalInspection && src && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
            {/* Toggle zoom lens button (great for touch/tablet) */}
            <button
              id="product-zoom-touch-toggle-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsManuallyToggled((prev) => !prev)
              }}
              aria-label={isZoomActive ? 'Exit inspection zoom' : 'Inspect fabric details'}
              title={isZoomActive ? 'Exit inspection zoom' : 'Inspect fabric details'}
              className={`p-2 rounded-xl transition-all shadow-xs cursor-pointer border ${
                isZoomActive
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white/90 hover:bg-white text-neutral-700 hover:text-neutral-900 border-neutral-200/80 backdrop-blur-xs'
              }`}
            >
              {isZoomActive ? (
                <ZoomOut className="w-4 h-4" />
              ) : (
                <ZoomIn className="w-4 h-4" />
              )}
            </button>

            {/* Fullscreen detail inspection modal */}
            <button
              id="product-zoom-fullscreen-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsModalOpen(true)
              }}
              aria-label="Open high-resolution fullscreen inspection"
              title="Inspect full-resolution fabric textures"
              className="p-2 rounded-xl bg-white/90 hover:bg-white text-neutral-700 hover:text-neutral-900 border border-neutral-200/80 backdrop-blur-xs transition-all shadow-xs cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen High-Resolution Inspection Lightbox Modal */}
      {isModalOpen && src && (
        <div
          id="product-zoom-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="High-resolution fabric and detail inspector"
          className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Modal Header Bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between py-2 text-white mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold text-sm tracking-wide">
                Texture & Detail Inspector
              </span>
              <span className="text-xs text-neutral-400">
                Move cursor to pan details
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom In / Out Buttons */}
              <button
                type="button"
                onClick={() => setModalScale((s) => Math.min(4, s + 0.5))}
                aria-label="Increase zoom"
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                {modalScale.toFixed(1)}x
              </span>
              <button
                type="button"
                onClick={() => setModalScale((s) => Math.max(1.2, s - 0.5))}
                aria-label="Decrease zoom"
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {/* Close Modal Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close texture inspector"
                className="p-1.5 ml-3 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Inspection Stage */}
          <div
            id="product-zoom-modal-stage"
            className="relative w-full max-w-5xl h-[80vh] bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 cursor-crosshair shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onMouseMove={handleModalMouseMove}
          >
            <div
              className="w-full h-full relative transition-transform will-change-transform transform-gpu"
              style={{
                transformOrigin: `${modalPos.x}% ${modalPos.y}%`,
                transform: `scale(${modalScale})`,
                transitionDuration: '75ms',
                transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
              }}
            >
              <Image
                src={src}
                alt={alt}
                fill
                quality={100}
                className="object-contain p-8 select-none pointer-events-none"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Overlay Instructions Pill */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm text-neutral-300 text-xs pointer-events-none border border-white/10">
              Drag or move mouse across canvas to examine weave, stitches, and finish
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ProductImageZoom
