import React, { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Eye,
  Scan,
  Crosshair,
  SlidersHorizontal,
  CircleDot,
  Check,
} from 'lucide-react'
import { PRODUCT_IMAGE_BLUR_DATA_URL, RESPONSIVE_IMAGE_SIZES } from '../../lib/image'

export type ZoomMode = 'lens' | 'pan'

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
  /** Available zoom multiplier levels (default: [2, 2.8, 3.5]) */
  zoomScales?: number[]
  /** Default zoom level index (default: 1 -> 2.8x) */
  defaultScaleIndex?: number
  /** Default zoom inspection mode: 'lens' for magnifying loupe, 'pan' for full image pan zoom */
  defaultMode?: ZoomMode
  /** Diameter of the magnifying lens in pixels (default: 215) */
  lensSize?: number
  /** Children to render as overlays (badges, carousel controls, etc.) */
  children?: React.ReactNode
  /** Whether to allow modal inspection mode */
  allowModalInspection?: boolean
  /** Callback fired when zoom state changes */
  onZoomChange?: (isZoomed: boolean) => void
}

/**
 * ProductImageZoom provides an interactive hover-based magnifying lens (optical loupe)
 * inspection effect for product detail images, allowing users to examine fine fabric textures,
 * stitches, hardware finishes, and material nuances.
 *
 * Features:
 * - Circular optical magnifying lens that tracks the cursor with sub-pixel alignment
 * - Realistic convex glass styling with specular glare, metallic bezel, and precision reticle
 * - Centered target alignment so whatever is hovered appears at the exact focal center of the loupe
 * - Dual modes: 'lens' (circular loupe) and 'pan' (full frame zoom)
 * - Multi-level magnification control (e.g. 2.0x, 2.8x, 3.5x)
 * - Lens diameter toggle (Standard 215px vs Large 270px)
 * - Touch & drag mobile support with tap-to-pin
 * - Keyboard navigation (arrow keys, +, -, Enter, Esc)
 * - High-resolution fullscreen lightbox modal
 */
export const ProductImageZoom: React.FC<ProductImageZoomProps> = ({
  src,
  alt,
  sizes = RESPONSIVE_IMAGE_SIZES.productDetail,
  priority = false,
  blurDataURL = PRODUCT_IMAGE_BLUR_DATA_URL,
  className = '',
  imageClassName = '',
  zoomScales = [2, 2.8, 3.5],
  defaultScaleIndex = 1,
  defaultMode = 'lens',
  lensSize = 215,
  children,
  allowModalInspection = true,
  onZoomChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isTouchActive, setIsTouchActive] = useState(false)
  const [isManuallyToggled, setIsManuallyToggled] = useState(false)
  const [mode, setMode] = useState<ZoomMode>(defaultMode)
  const [scaleIndex, setScaleIndex] = useState(defaultScaleIndex)
  const [currentLensSize, setCurrentLensSize] = useState(lensSize)
  const [showOptionsBar, setShowOptionsBar] = useState(false)

  // Pixel and percentage coordinates
  const [pixelPos, setPixelPos] = useState<{ x: number; y: number }>({ x: 200, y: 200 })
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 })
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({
    width: 500,
    height: 500,
  })

  // Fullscreen modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalPos, setModalPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 })
  const [modalScale, setModalScale] = useState(2.8)

  const activeScale = zoomScales[scaleIndex] || 2.8
  const isZoomActive = isHovered || isTouchActive || isManuallyToggled

  // Update container size on mount and window resize
  const measureContainer = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      setContainerDimensions({ width: rect.width, height: rect.height })
    }
  }, [])

  useEffect(() => {
    measureContainer()
    window.addEventListener('resize', measureContainer)
    return () => window.removeEventListener('resize', measureContainer)
  }, [measureContainer])

  // Notify parent on zoom state changes
  useEffect(() => {
    onZoomChange?.(isZoomActive)
  }, [isZoomActive, onZoomChange])

  // Coordinate computation helper
  const updatePosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    setContainerDimensions({ width: rect.width, height: rect.height })

    const rawX = clientX - rect.left
    const rawY = clientY - rect.top

    const clampedX = Math.max(0, Math.min(rect.width, rawX))
    const clampedY = Math.max(0, Math.min(rect.height, rawY))

    const percentX = (clampedX / rect.width) * 100
    const percentY = (clampedY / rect.height) * 100

    setPixelPos({ x: clampedX, y: clampedY })
    setMousePos({ x: percentX, y: percentY })
  }, [])

  // Mouse event handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      updatePosition(e.clientX, e.clientY)
    },
    [updatePosition]
  )

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      measureContainer()
      updatePosition(e.clientX, e.clientY)
      setIsHovered(true)
    },
    [measureContainer, updatePosition]
  )

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  // Touch event handlers for mobile / tablet gestures
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 1) {
        measureContainer()
        updatePosition(e.touches[0].clientX, e.touches[0].clientY)
        setIsTouchActive(true)
      }
    },
    [measureContainer, updatePosition]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 1) {
        updatePosition(e.touches[0].clientX, e.touches[0].clientY)
      }
    },
    [updatePosition]
  )

  const handleTouchEnd = useCallback(() => {
    // Leave pinned if manually toggled, otherwise end touch inspection
    if (!isManuallyToggled) {
      setIsTouchActive(false)
    }
  }, [isManuallyToggled])

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
      const step = 20
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setPixelPos((p) => {
          const nextX = Math.max(0, p.x - step)
          setMousePos({ x: (nextX / containerDimensions.width) * 100, y: (p.y / containerDimensions.height) * 100 })
          return { ...p, x: nextX }
        })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setPixelPos((p) => {
          const nextX = Math.min(containerDimensions.width, p.x + step)
          setMousePos({ x: (nextX / containerDimensions.width) * 100, y: (p.y / containerDimensions.height) * 100 })
          return { ...p, x: nextX }
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPixelPos((p) => {
          const nextY = Math.max(0, p.y - step)
          setMousePos({ x: (p.x / containerDimensions.width) * 100, y: (nextY / containerDimensions.height) * 100 })
          return { ...p, y: nextY }
        })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPixelPos((p) => {
          const nextY = Math.min(containerDimensions.height, p.y + step)
          setMousePos({ x: (p.x / containerDimensions.width) * 100, y: (nextY / containerDimensions.height) * 100 })
          return { ...p, y: nextY }
        })
      } else if (e.key === 'Escape') {
        setIsManuallyToggled(false)
        setIsHovered(false)
        setIsTouchActive(false)
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

  // Lens radius
  const lensRadius = currentLensSize / 2

  return (
    <>
      <div
        id="product-image-zoom-container"
        ref={containerRef}
        role="region"
        aria-label={`${alt} - Hover with magnifying lens to inspect fine product details and texture`}
        tabIndex={0}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        className={`relative aspect-square w-full bg-neutral-100/90 rounded-2xl overflow-hidden border border-neutral-200/80 group focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 select-none ${
          isZoomActive
            ? mode === 'lens'
              ? 'cursor-none'
              : 'cursor-crosshair'
            : 'cursor-zoom-in'
        } ${className}`}
      >
        {/* Base Image Layer */}
        {src ? (
          <div
            id="product-zoom-base-layer"
            className="w-full h-full relative transition-transform will-change-transform transform-gpu"
            style={
              mode === 'pan' && isZoomActive
                ? {
                    transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                    transform: `scale(${activeScale})`,
                    transitionDuration: '75ms',
                    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
                  }
                : {
                    transform: 'scale(1)',
                    transitionDuration: '250ms',
                  }
            }
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

        {/* Subtle Focus Ring Indicator on the Base Image under the Lens */}
        {src && isZoomActive && mode === 'lens' && (
          <div
            id="product-lens-focal-spot"
            className="absolute pointer-events-none z-10 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150"
            style={{
              left: `${pixelPos.x}px`,
              top: `${pixelPos.y}px`,
            }}
          >
            <div className="w-10 h-10 rounded-full border-2 border-emerald-500/80 bg-emerald-500/10 shadow-xs animate-pulse" />
          </div>
        )}

        {/* Optical Magnifying Lens (Loupe) */}
        {src && isZoomActive && mode === 'lens' && (
          <div
            id="product-magnifying-lens"
            role="img"
            aria-label={`Magnifying lens inspecting ${alt} at ${activeScale}x magnification`}
            className="absolute pointer-events-none rounded-full overflow-hidden z-30 transform -translate-x-1/2 -translate-y-1/2 will-change-transform animate-in fade-in zoom-in-90 duration-150"
            style={{
              width: `${currentLensSize}px`,
              height: `${currentLensSize}px`,
              left: `${pixelPos.x}px`,
              top: `${pixelPos.y}px`,
              boxShadow:
                '0 22px 50px -10px rgba(0, 0, 0, 0.45), 0 0 0 3px rgba(255, 255, 255, 0.95), 0 0 0 4px rgba(0, 0, 0, 0.15), inset 0 0 16px rgba(0, 0, 0, 0.22)',
            }}
          >
            {/* Magnified Image Layer inside the Lens */}
            <div
              id="product-lens-inner-view"
              className="absolute top-0 left-0 will-change-transform transform-gpu pointer-events-none"
              style={{
                width: `${containerDimensions.width}px`,
                height: `${containerDimensions.height}px`,
                transformOrigin: `${pixelPos.x}px ${pixelPos.y}px`,
                transform: `translate(${lensRadius - pixelPos.x}px, ${lensRadius - pixelPos.y}px) scale(${activeScale})`,
                backgroundColor: '#ffffff',
              }}
            >
              <Image
                src={src}
                alt={`${alt} magnified detail`}
                fill
                sizes="1600px"
                quality={100}
                priority
                className={`object-contain p-4 select-none ${imageClassName}`}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Specular Convex Glass Highlight Overlay */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none z-10"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.08) 32%, transparent 55%, rgba(0, 0, 0, 0.16) 100%)',
              }}
            />

            {/* Glass Curvature Reflection Arc */}
            <div
              className="absolute top-1 left-4 right-4 h-1/3 rounded-t-full pointer-events-none z-10 opacity-75"
              style={{
                background: 'radial-gradient(ellipse at top, rgba(255, 255, 255, 0.6) 0%, transparent 75%)',
              }}
            />

            {/* Optical Glass Center Precision Reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="relative w-8 h-8 flex items-center justify-center">
                {/* Center target ring */}
                <div className="w-3.5 h-3.5 rounded-full border border-white/90 shadow-sm ring-1 ring-black/40" />
                {/* Center micro focus dot */}
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
                {/* 4-Axis Reticle Marks */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-px bg-white/90 shadow-sm" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-px bg-white/90 shadow-sm" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-2 bg-white/90 shadow-sm" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-2 bg-white/90 shadow-sm" />
              </div>
            </div>

            {/* Lens Magnification Badge Pill */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 pointer-events-none z-20">
              <span className="px-2 py-0.5 rounded-full bg-neutral-950/85 backdrop-blur-xs text-[10px] font-mono font-semibold text-white shadow-md border border-white/20 tracking-wider">
                {activeScale}x LOUPE
              </span>
            </div>
          </div>
        )}

        {/* Status overlays / badges (unaffected by zoom scale) */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {children}
        </div>

        {/* Hover Hint Pill (hidden when active zoom is engaged) */}
        <div
          id="product-zoom-hint"
          className={`absolute bottom-3 left-3 z-20 pointer-events-none transition-all duration-200 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-sm border border-neutral-200/80 text-neutral-800 text-xs font-medium ${
            isZoomActive ? 'opacity-0 translate-y-2 scale-95 pointer-events-none' : 'opacity-90 group-hover:opacity-100 translate-y-0'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
          <span>Hover to inspect fine details</span>
        </div>

        {/* Bottom Interactive Control Panel (visible when zoom is active or user hovers) */}
        <div
          id="product-zoom-controls-bar"
          className={`absolute bottom-3 left-3 z-20 transition-all duration-200 flex flex-wrap items-center gap-1.5 pointer-events-auto ${
            isZoomActive
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          {/* Mode Switcher: Magnifying Lens Loupe vs Full Pan Zoom */}
          <div className="inline-flex rounded-lg bg-neutral-900/90 backdrop-blur-md p-0.5 border border-white/10 shadow-md text-white">
            <button
              id="product-zoom-mode-lens-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMode('lens')
              }}
              title="Magnifying Lens Loupe (circular cursor inspection)"
              aria-label="Switch to Magnifying Lens mode"
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                mode === 'lens'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <CircleDot className="w-3 h-3" />
              <span>Lens</span>
            </button>
            <button
              id="product-zoom-mode-pan-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMode('pan')
              }}
              title="Pan Zoom (full container magnification)"
              aria-label="Switch to Full Pan Zoom mode"
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                mode === 'pan'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Scan className="w-3 h-3" />
              <span>Full</span>
            </button>
          </div>

          {/* Zoom Multipliers (2.0x, 2.8x, 3.5x) */}
          <div className="hidden sm:inline-flex rounded-lg bg-neutral-900/90 backdrop-blur-md p-0.5 border border-white/10 shadow-md text-white">
            {zoomScales.map((scale, idx) => (
              <button
                key={scale}
                id={`product-zoom-scale-${scale}x`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setScaleIndex(idx)
                }}
                title={`Set magnification to ${scale}x`}
                aria-label={`${scale} times magnification`}
                className={`px-2 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                  scaleIndex === idx
                    ? 'bg-neutral-700 text-white font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {scale}x
              </button>
            ))}
          </div>

          {/* Quick Cycle Scale on small screens */}
          <button
            id="product-zoom-cycle-scale-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setScaleIndex((prev) => (prev + 1) % zoomScales.length)
            }}
            title="Click to cycle zoom magnification"
            className="sm:hidden flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900/90 hover:bg-black text-white text-xs font-mono backdrop-blur-md shadow-sm border border-white/10"
          >
            {activeScale}x
          </button>

          {/* Lens Size Toggle (for lens mode) */}
          {mode === 'lens' && (
            <button
              id="product-zoom-size-toggle-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setCurrentLensSize((prev) => (prev === 215 ? 270 : 215))
              }}
              title={currentLensSize === 215 ? 'Expand lens diameter to 270px' : 'Set lens diameter to 215px'}
              aria-label="Toggle lens diameter size"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-900/90 hover:bg-black text-neutral-300 hover:text-white text-xs backdrop-blur-md shadow-sm border border-white/10 cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span className="hidden md:inline">{currentLensSize === 215 ? 'Wide' : 'Standard'}</span>
            </button>
          )}

          {/* Reset / Unpin Button if pinned */}
          {isManuallyToggled && (
            <button
              id="product-zoom-unpin-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsManuallyToggled(false)
                setIsTouchActive(false)
                setIsHovered(false)
              }}
              aria-label="Reset magnifying lens"
              title="Reset magnifying lens"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/95 hover:bg-white text-neutral-800 shadow-sm border border-neutral-200 text-xs font-medium cursor-pointer"
            >
              <ZoomOut className="w-3 h-3 text-neutral-600" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Top-Right Quick Zoom Toggle & Fullscreen Modal Controls */}
        {src && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
            {/* Quick Pin / Toggle inspection button */}
            <button
              id="product-zoom-touch-toggle-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                measureContainer()
                setIsManuallyToggled((prev) => !prev)
              }}
              aria-label={isZoomActive ? 'Lock/Unlock magnifying lens' : 'Inspect fabric details'}
              title={isZoomActive ? 'Lens active - Click to unlock' : 'Click to inspect fine details'}
              className={`p-2 rounded-xl transition-all shadow-xs cursor-pointer border ${
                isZoomActive
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white/90 hover:bg-white text-neutral-700 hover:text-neutral-900 border-neutral-200/80 backdrop-blur-xs'
              }`}
            >
              {isZoomActive ? (
                <Crosshair className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>

            {/* Fullscreen detail inspection modal */}
            {allowModalInspection && (
              <button
                id="product-zoom-fullscreen-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsModalOpen(true)
                }}
                aria-label="Open high-resolution fullscreen inspection"
                title="Inspect full-resolution fabric textures in lightbox"
                className="p-2 rounded-xl bg-white/90 hover:bg-white text-neutral-700 hover:text-neutral-900 border border-neutral-200/80 backdrop-blur-xs transition-all shadow-xs cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
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
              <span className="font-semibold text-sm tracking-wide flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-emerald-400" />
                Fine Texture & Weave Inspector
              </span>
              <span className="text-xs text-neutral-400 hidden sm:inline">
                Move cursor to pan across fine fabric details
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom In / Out Buttons */}
              <button
                type="button"
                onClick={() => setModalScale((s) => Math.min(4.5, s + 0.5))}
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
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-black/75 backdrop-blur-sm text-neutral-300 text-xs pointer-events-none border border-white/10 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              <span>Move mouse across canvas to examine stitch count, weaves, and texture</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ProductImageZoom
