import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { ArrowUp } from 'lucide-react'

export interface ScrollToTopProps {
  /** Optional custom hero section element ID to track */
  heroElementId?: string
  /** Fallback scroll distance in px if hero element is not present on page */
  fallbackThreshold?: number
  /** Additional CSS class names */
  className?: string
}

export const ScrollToTop: React.FC<ScrollToTopProps> = ({
  heroElementId = 'hero-banner',
  fallbackThreshold = 350,
  className = '',
}) => {
  const router = useRouter()
  const [mounted, setMounted] = useState<boolean>(false)
  const [isVisible, setIsVisible] = useState<boolean>(false)

  // Ensure hydration safety
  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate if user has scrolled past the hero section
  const checkScrollPosition = useCallback(() => {
    if (typeof window === 'undefined') return

    const heroEl = document.getElementById(heroElementId)
    let threshold = fallbackThreshold

    if (heroEl) {
      // Calculate hero bottom relative to document top
      const rect = heroEl.getBoundingClientRect()
      const heroBottomDoc = rect.bottom + window.scrollY
      // Trigger once user passes the hero section
      threshold = Math.max(heroBottomDoc - 80, 150)
    }

    const pastHero = window.scrollY > threshold
    setIsVisible(pastHero)
  }, [heroElementId, fallbackThreshold])

  useEffect(() => {
    if (!mounted) return

    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkScrollPosition()
          ticking = false
        })
        ticking = true
      }
    }

    // Check position initially
    checkScrollPosition()

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    const handleRouteChange = () => {
      // Re-evaluate on page transition
      setTimeout(checkScrollPosition, 100)
    }
    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [mounted, router.events, checkScrollPosition])

  const handleScrollToTop = () => {
    if (typeof window === 'undefined') return
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  if (!mounted) {
    return null
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ease-out transform ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
      } ${className}`}
    >
      <div className="relative group">
        <button
          type="button"
          id="scroll-to-top-btn"
          onClick={handleScrollToTop}
          aria-label="Scroll to top of page"
          title="Scroll to top"
          className="w-12 h-12 rounded-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white shadow-lg hover:shadow-xl shadow-primary-500/25 flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
        >
          <ArrowUp className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5 stroke-[2.5]" />
        </button>

        {/* Floating tooltip */}
        <div
          role="tooltip"
          className="absolute bottom-full right-0 mb-2 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-neutral-900 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-md"
        >
          Back to top
          <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-neutral-900" />
        </div>
      </div>
    </div>
  )
}

export default ScrollToTop
