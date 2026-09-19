import React, { useState } from 'react'
import Image, { ImageProps } from 'next/image'
import { useIntersectionObserver } from '../../lib/hooks/useIntersectionObserver'
import { PRODUCT_IMAGE_BLUR_DATA_URL, RESPONSIVE_IMAGE_SIZES } from '../../lib/image'

export interface LazyProductImageProps {
  /** Primary product image source URL */
  src: string
  /** Alt text for accessibility */
  alt: string
  /** Secondary image source (e.g. alternate angle displayed on hover) */
  secondarySrc?: string
  /** Alt text for secondary image */
  secondaryAlt?: string
  /** Whether this image is above the fold / LCP priority */
  priority?: boolean
  /** Responsive image sizes string */
  sizes?: string
  /** Quality level (1-100) */
  quality?: number
  /** Next.js image fill layout (default: true) */
  fill?: boolean
  /** Width if fill is false */
  width?: number
  /** Height if fill is false */
  height?: number
  /** Aspect ratio class (e.g. 'aspect-square') */
  aspectRatio?: string
  /** CSS classes for the image */
  className?: string
  /** CSS classes for the container element */
  containerClassName?: string
  /** Root margin for intersection observer proactive loading. Default: '250px 0px' */
  rootMargin?: string
  /** Optional callback fired when the primary image finishes loading */
  onLoad?: () => void
}

/**
 * LazyProductImage utilizes the Intersection Observer API to detect when
 * an off-screen product image approaches the viewport before loading its assets.
 * Features zero-CLS placeholder layout, blur-up transition, and optional hover secondary angle.
 */
export const LazyProductImage: React.FC<LazyProductImageProps> = ({
  src,
  alt,
  secondarySrc,
  secondaryAlt,
  priority = false,
  sizes = RESPONSIVE_IMAGE_SIZES.productGrid,
  quality = 85,
  fill = true,
  width,
  height,
  aspectRatio = 'aspect-square',
  className = '',
  containerClassName = '',
  rootMargin = '250px 0px',
  onLoad,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)

  // Observe container intersection with rootMargin
  const { ref: containerRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    rootMargin,
    triggerOnce: true,
    initialIsIntersecting: priority,
    enabled: !priority,
  })

  const shouldRenderImage = priority || isIntersecting

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${aspectRatio} overflow-hidden bg-neutral-100 ${containerClassName}`}
    >
      {/* Zero-CLS blur-up placeholder & shimmer visible until image decodes */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 z-0 pointer-events-none ${
          imageLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundImage: `url("${PRODUCT_IMAGE_BLUR_DATA_URL}")`,
          filter: 'blur(10px)',
          transform: 'scale(1.05)',
        }}
        aria-hidden="true"
      />

      {/* Subtle shimmer bar while downloading */}
      <div
        className={`absolute inset-0 animate-shimmer transition-opacity duration-300 z-0 pointer-events-none ${
          imageLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      />

      {/* Image is only mounted and requested once intersecting or if priority is true */}
      {shouldRenderImage ? (
        <>
          <Image
            src={src}
            alt={alt}
            fill={fill}
            width={!fill ? width : undefined}
            height={!fill ? height : undefined}
            placeholder="blur"
            blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
            sizes={sizes}
            priority={priority}
            loading={priority ? 'eager' : 'lazy'}
            quality={quality}
            className={`object-cover object-center transition-all duration-500 ease-out group-hover:scale-105 ${
              secondarySrc ? 'group-hover:opacity-0' : ''
            } ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
            onLoad={() => {
              setImageLoaded(true)
              onLoad?.()
            }}
            referrerPolicy="no-referrer"
          />

          {secondarySrc && (
            <Image
              src={secondarySrc}
              alt={secondaryAlt || `${alt} - Alternate angle`}
              fill={fill}
              width={!fill ? width : undefined}
              height={!fill ? height : undefined}
              placeholder="blur"
              blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
              sizes={sizes}
              loading="lazy"
              quality={quality}
              className="object-cover object-center transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          )}
        </>
      ) : null}
    </div>
  )
}

export default LazyProductImage
