import { useEffect, useRef } from 'react'
import Router from 'next/router'

interface ScrollCoordinates {
  x: number
  y: number
  timestamp: number
}

const STORAGE_PREFIX = '__displaycell_scroll_'
const MAX_RESTORE_DURATION_MS = 1500
const MAX_RESTORE_ATTEMPTS = 60

// In-memory cache for ultra-fast lookup during active sessions
const memoryCache = new Map<string, ScrollCoordinates>()

/**
 * Normalizes a URL path for consistent scroll storage keys.
 * Removes trailing slashes (except root) and hash fragments.
 */
export function normalizeScrollKey(url: string): string {
  if (!url) return '/'
  const withoutHash = url.split('#')[0] || '/'
  const [path, query] = withoutHash.split('?')
  const cleanPath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path || '/'
  return query ? `${cleanPath}?${query}` : cleanPath
}

/**
 * Checks if a given path is a product listing or catalog page where
 * users browse collections or product grids.
 */
export function isProductListPage(url: string): boolean {
  if (!url) return false
  const cleanKey = normalizeScrollKey(url)
  const pathOnly = cleanKey.split('?')[0]
  return (
    pathOnly === '/' ||
    pathOnly === '/products' ||
    pathOnly.startsWith('/collection') ||
    pathOnly === '/search'
  )
}

/**
 * Saves scroll coordinates for a given key in memory and sessionStorage.
 */
export function saveScrollPosition(key: string, x: number, y: number): void {
  if (typeof window === 'undefined' || !key) return

  const coords: ScrollCoordinates = { x, y, timestamp: Date.now() }
  memoryCache.set(key, coords)

  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(coords))
  } catch {
    // sessionStorage quota exceeded or restricted in private browsing
  }
}

/**
 * Retrieves saved scroll coordinates from memory or sessionStorage.
 */
export function getSavedScrollPosition(key: string): { x: number; y: number } | null {
  if (typeof window === 'undefined' || !key) return null

  // 1. Check in-memory cache first
  const cached = memoryCache.get(key)
  if (cached) {
    return { x: cached.x, y: cached.y }
  }

  // 2. Fallback to sessionStorage
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (raw) {
      const parsed = JSON.parse(raw) as ScrollCoordinates
      if (typeof parsed?.y === 'number' && typeof parsed?.x === 'number') {
        memoryCache.set(key, parsed)
        return { x: parsed.x, y: parsed.y }
      }
    }
  } catch {
    // Parsing error or restricted storage
  }

  return null
}

/**
 * Performs resilient scroll restoration.
 * Because client-side product lists and images can take multiple frames to
 * lay out and expand document.documentElement.scrollHeight, this runner
 * periodically retries scrolling until the target scroll is reached,
 * or until the user manually interacts (wheel, touch, key).
 */
export function performResilientScroll(targetY: number, targetX = 0): () => void {
  if (typeof window === 'undefined') return () => {}

  let attempts = 0
  let isCancelled = false
  let animFrameId: number | null = null
  let resizeObserver: ResizeObserver | null = null

  // If user actively scrolls or touches screen, immediately yield control
  const cancelRestoration = () => {
    isCancelled = true
    cleanup()
  }

  const cleanup = () => {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId)
      animFrameId = null
    }
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    window.removeEventListener('wheel', cancelRestoration)
    window.removeEventListener('touchstart', cancelRestoration)
    window.removeEventListener('mousedown', cancelRestoration)
    window.removeEventListener('keydown', cancelRestoration)
  }

  window.addEventListener('wheel', cancelRestoration, { passive: true })
  window.addEventListener('touchstart', cancelRestoration, { passive: true })
  window.addEventListener('mousedown', cancelRestoration, { passive: true })
  window.addEventListener('keydown', cancelRestoration, { passive: true })

  const attemptScroll = () => {
    if (isCancelled) return

    const scrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    )
    const maxScrollY = Math.max(0, scrollHeight - window.innerHeight)
    const currentY = window.scrollY

    // Scroll to either the target or the current maximum reachable scroll
    window.scrollTo({
      top: Math.min(targetY, maxScrollY),
      left: targetX,
      behavior: 'instant' as ScrollBehavior,
    })

    const hasReachedTarget = Math.abs(window.scrollY - targetY) < 6
    const isAtMaxDocHeight = targetY > maxScrollY && Math.abs(window.scrollY - maxScrollY) < 6

    attempts++

    if (hasReachedTarget || (isAtMaxDocHeight && attempts >= MAX_RESTORE_ATTEMPTS)) {
      cleanup()
      return
    }

    if (attempts < MAX_RESTORE_ATTEMPTS) {
      animFrameId = requestAnimationFrame(attemptScroll)
    } else {
      cleanup()
    }
  }

  // Also observe document height changes to jump to target as soon as dynamic items expand DOM
  if (typeof ResizeObserver !== 'undefined' && document.body) {
    try {
      resizeObserver = new ResizeObserver(() => {
        if (!isCancelled && Math.abs(window.scrollY - targetY) >= 6) {
          attemptScroll()
        }
      })
      resizeObserver.observe(document.body)
    } catch {
      // ResizeObserver unsupported or restricted
    }
  }

  // Initial restoration trigger on next animation frame
  animFrameId = requestAnimationFrame(attemptScroll)

  // Safety timeout to clean up listeners even if uncancelled
  setTimeout(() => {
    cleanup()
  }, MAX_RESTORE_DURATION_MS)

  return cleanup
}

/**
 * Custom React hook that sets up full scroll position restoration
 * across route changes, browser back/forward history navigation, and
 * returns from product detail pages back to product listing pages.
 */
export function useScrollRestoration(): void {
  const isPopNavigationRef = useRef<boolean>(false)
  const lastProductListUrlRef = useRef<string | null>(null)
  const currentPathRef = useRef<string>('')
  const cancelActiveRestoreRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Opt out of native browser automatic scroll jumps to give Next.js
    // and our resilient restoration full authority
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    currentPathRef.current = normalizeScrollKey(Router.asPath)
    if (isProductListPage(currentPathRef.current)) {
      lastProductListUrlRef.current = currentPathRef.current
    }

    // Save scroll on continuous scroll events with RAF throttle
    let scrollRaf: number | null = null
    const handleScroll = () => {
      if (scrollRaf !== null) return
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null
        const currentKey = currentPathRef.current
        if (currentKey) {
          saveScrollPosition(currentKey, window.scrollX, window.scrollY)
          // Also save under current history state key if available
          const histKey = window.history.state?.key
          if (histKey) {
            saveScrollPosition(`hist_${histKey}`, window.scrollX, window.scrollY)
          }
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // Track popstate (browser back/forward button or swipe back)
    const handlePopState = () => {
      isPopNavigationRef.current = true
    }
    window.addEventListener('popstate', handlePopState)

    // Hook Next.js beforePopState to flag history back/forward navigation
    Router.beforePopState(() => {
      isPopNavigationRef.current = true
      return true
    })

    // Snapshot outgoing page scroll before route transition starts
    const handleRouteStart = (url: string) => {
      const outgoingKey = currentPathRef.current
      if (outgoingKey) {
        saveScrollPosition(outgoingKey, window.scrollX, window.scrollY)
        const histKey = window.history.state?.key
        if (histKey) {
          saveScrollPosition(`hist_${histKey}`, window.scrollX, window.scrollY)
        }

        if (isProductListPage(outgoingKey)) {
          lastProductListUrlRef.current = outgoingKey
        }
      }

      // Cancel any ongoing restoration from previous route
      if (cancelActiveRestoreRef.current) {
        cancelActiveRestoreRef.current()
        cancelActiveRestoreRef.current = null
      }
    }

    // Route complete: determine if scroll restoration or scroll-to-top applies
    const handleRouteComplete = (url: string) => {
      const incomingKey = normalizeScrollKey(url || Router.asPath)
      const previousPath = currentPathRef.current
      currentPathRef.current = incomingKey

      const isBackNavigation = isPopNavigationRef.current
      isPopNavigationRef.current = false

      // Also check if user is navigating from a product detail page back to the product list
      const isReturningFromProductDetail =
        previousPath.startsWith('/product') &&
        isProductListPage(incomingKey) &&
        (lastProductListUrlRef.current === incomingKey || incomingKey === '/products')

      const shouldRestore = isBackNavigation || isReturningFromProductDetail

      if (shouldRestore) {
        // Look up saved position by history key or normalized URL
        const histKey = window.history.state?.key
        const saved =
          (histKey ? getSavedScrollPosition(`hist_${histKey}`) : null) ||
          getSavedScrollPosition(incomingKey) ||
          (lastProductListUrlRef.current
            ? getSavedScrollPosition(lastProductListUrlRef.current)
            : null)

        if (saved && (saved.y > 0 || saved.x > 0)) {
          cancelActiveRestoreRef.current = performResilientScroll(saved.y, saved.x)
          return
        }
      }

      // For standard push navigations to new pages, reset scroll to top
      if (!isBackNavigation) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      }
    }

    // Save scroll position on page unload/refresh
    const handleBeforeUnload = () => {
      const key = currentPathRef.current
      if (key) {
        saveScrollPosition(key, window.scrollX, window.scrollY)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)

    Router.events.on('routeChangeStart', handleRouteStart)
    Router.events.on('routeChangeComplete', handleRouteComplete)

    return () => {
      if (scrollRaf !== null) {
        cancelAnimationFrame(scrollRaf)
      }
      if (cancelActiveRestoreRef.current) {
        cancelActiveRestoreRef.current()
      }
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
      Router.events.off('routeChangeStart', handleRouteStart)
      Router.events.off('routeChangeComplete', handleRouteComplete)
    }
  }, [])
}

export default useScrollRestoration
