/**
 * Image optimization utilities for responsive next/image loading,
 * blur-up placeholders, and Core Web Vitals optimization.
 */

// Universal base64-encoded SVG blur placeholder with smooth warm-neutral tones
// Designed specifically for replacement hardware, electronics, and catalog items
const BLUR_SVG_RAW = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f5f5f4" />
      <stop offset="50%" stop-color="#e7e5e4" />
      <stop offset="100%" stop-color="#f5f5f4" />
    </linearGradient>
    <filter id="b" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="8" />
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)" />
  <circle cx="20" cy="20" r="14" fill="#d6d3d1" opacity="0.4" filter="url(#b)" />
</svg>
`.trim()

/**
 * Base64 helper supporting both Node.js SSR and browser runtimes
 */
function toBase64(str: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(str).toString('base64')
  }
  return btoa(str)
}

/**
 * Default blur-up placeholder data URL for product imagery.
 * Encoded as a lightweight data URI to eliminate network latency for placeholders.
 */
export const PRODUCT_IMAGE_BLUR_DATA_URL = `data:image/svg+xml;base64,${toBase64(BLUR_SVG_RAW)}`

/**
 * Generate a customized blur-up data URL with specific background and accent colors
 */
export function getBlurDataURL(
  background = '#f5f5f4',
  accent = '#e7e5e4',
  innerGlow = '#d6d3d1'
): string {
  const customSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <defs>
    <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${background}" />
      <stop offset="50%" stop-color="${accent}" />
      <stop offset="100%" stop-color="${background}" />
    </linearGradient>
    <filter id="b" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="8" />
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#cg)" />
  <circle cx="20" cy="20" r="14" fill="${innerGlow}" opacity="0.35" filter="url(#b)" />
</svg>
`.trim()
  return `data:image/svg+xml;base64,${toBase64(customSvg)}`
}

/**
 * Standard responsive breakpoints for product image sizes attribute
 * to prevent oversized image payloads and improve LCP / Cumulative Layout Shift (CLS)
 */
export const RESPONSIVE_IMAGE_SIZES = {
  /** Responsive product catalog grid (1 col mobile, 2 col sm, 3 col md, 3-4 col lg/xl) */
  productGrid: '(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw',
  /** Main product detail page gallery hero */
  productDetail: '(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 50vw',
  /** Product gallery thumbnail buttons */
  thumbnail: '(max-width: 768px) 80px, 96px',
  /** Shopping cart drawer / line item row */
  cartItem: '(max-width: 768px) 96px, 130px',
  /** Floating dock miniature preview */
  dockItem: '40px',
  /** Product comparison modal card slot */
  comparisonSlot: '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw',
  /** Toast notification item thumbnail */
  notificationThumb: '48px',
  /** Full-width promotional hero banners */
  heroBanner: '(max-width: 1280px) 100vw, 1280px',
} as const
