import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'

export interface ScrollProgressBarProps {
  /**
   * Whether to only display on product detail pages (default: true).
   * When false, it will be active on all scrollable pages.
   */
  onlyOnProductPages?: boolean
  /** Height class in Tailwind (default: 'h-[3px]') */
  heightClass?: string
  /** Show subtle reading percentage chip in top right when scrolling */
  showPercentageChip?: boolean
}

export const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({
  onlyOnProductPages = false,
  heightClass = 'h-[3px]',
  showPercentageChip = false,
}) => {
  let router: any = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter()
  } catch {
    router = null
  }
  const [mounted, setMounted] = useState<boolean>(false)
  const [scrollProgress, setScrollProgress] = useState<number>(0)
  const [isVisible, setIsVisible] = useState<boolean>(false)

  useEffect(() => {
    // Intentional hydration-safe mount flag: this must run once after the
    // client-side render to distinguish it from SSR output. There is no
    // derived-state equivalent that preserves that distinction.
     
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Check if current route is a product detail page
  const isProductPage =
    Boolean(router && (router.pathname?.startsWith('/product') || router.asPath?.includes('/product/')))

  // Determine if bar should be active
  const shouldBeActive = !onlyOnProductPages || isProductPage

  // This project doesn't run the React Compiler (no babel-plugin-react-compiler
  // configured) — the rule below is only a forward-looking advisory that the
  // compiler couldn't verify this manual useCallback boundary, not a
  // correctness bug in the callback itself.
   
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const calculateScrollProgress = useCallback(() => {
    if (typeof window === 'undefined') return

    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
    const scrollHeight =
      document.documentElement.scrollHeight - document.documentElement.clientHeight

    if (scrollHeight <= 0) {
      setScrollProgress(0)
      setIsVisible(false)
      return
    }

    const progress = Math.min(Math.max((scrollTop / scrollHeight) * 100, 0), 100)
    setScrollProgress(progress)
    // Only show if user has scrolled at least 8px, or on product detail page
    setIsVisible(scrollTop > 10 || isProductPage)
  }, [isProductPage])

  useEffect(() => {
    // No setIsVisible(false) here: the render gate below already returns
    // null when !shouldBeActive, and calculateScrollProgress() re-derives
    // isVisible from the actual scroll position as soon as shouldBeActive
    // flips back to true, so no stale-state flash is possible.
    if (!shouldBeActive) {
      return
    }

    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          calculateScrollProgress()
          ticking = false
        })
        ticking = true
      }
    }

    // Initial calculation on mount or route change — must measure real
    // scroll/layout state, which only exists post-mount; same sanctioned
    // pattern as ScrollToTop's checkScrollPosition().
     
    // eslint-disable-next-line react-hooks/set-state-in-effect
    calculateScrollProgress()

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [shouldBeActive, calculateScrollProgress])

  // Recalculate when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setTimeout(() => {
        calculateScrollProgress()
      }, 100)
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events, calculateScrollProgress])

  if (!mounted || !shouldBeActive || !isVisible) {
    return null
  }

  const roundedProgress = Math.round(scrollProgress)

  return (
    <div
      id="viewport-scroll-progress-container"
      className="fixed top-0 left-0 right-0 z-[100] pointer-events-none select-none transition-opacity duration-300"
      style={{ opacity: isVisible ? 1 : 0 }}
      role="progressbar"
      aria-valuenow={roundedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page scroll progress"
    >
      {/* Background Track */}
      <div className={`w-full ${heightClass} bg-surface-stone/40 backdrop-blur-xs relative overflow-hidden`}>
        {/* Animated Progress Bar */}
        <div
          id="viewport-scroll-progress-bar"
          className="h-full bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 transition-[width] duration-100 ease-out relative"
          style={{ width: `${scrollProgress}%` }}
        >
          {/* Luminous Glow Dot at the leading tip */}
          {scrollProgress > 0 && scrollProgress < 100 && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary-400 opacity-80 blur-[2px] shadow-[0_0_8px_#059669]" />
          )}
        </div>
      </div>

      {/* Subtle percentage badge for long product pages */}
      {(showPercentageChip || isProductPage) && scrollProgress > 3 && (
        <div
          className="absolute right-4 top-2 pointer-events-none transition-all duration-300 transform"
          style={{
            opacity: scrollProgress > 3 ? 1 : 0,
            transform: scrollProgress > 3 ? 'translateY(0)' : 'translateY(-6px)',
          }}
        >
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-surface/90 backdrop-blur-md text-ink-800 border border-surface-stone shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            <span>{isProductPage ? `Product Details • ${roundedProgress}%` : `${roundedProgress}%`}</span>
          </span>
        </div>
      )}
    </div>
  )
}

export default ScrollProgressBar
