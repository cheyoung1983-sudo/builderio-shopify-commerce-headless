import { useEffect, useRef, useState, useCallback } from 'react'

export interface UseIntersectionObserverOptions {
  /** Root element for intersection (defaults to viewport) */
  root?: Element | Document | null
  /** Margin around root to trigger loading proactively before entering viewport. Defaults to '250px 0px' */
  rootMargin?: string
  /** Intersection threshold (0 = as soon as single pixel intersects). Defaults to 0 */
  threshold?: number | number[]
  /** Disconnect observer after first intersection (ideal for lazy-loading images). Defaults to true */
  triggerOnce?: boolean
  /** Whether the observer is active. Defaults to true */
  enabled?: boolean
  /** Initial visibility state (e.g. true for above-the-fold / priority images). Defaults to false */
  initialIsIntersecting?: boolean
}

export interface UseIntersectionObserverReturn<T extends HTMLElement = HTMLElement> {
  /** Callback ref to attach to the target element */
  ref: (node: T | null) => void
  /** True when the observed element intersects within the rootMargin */
  isIntersecting: boolean
  /** True if intersection has occurred at least once */
  hasTriggered: boolean
  /** The latest IntersectionObserverEntry object */
  entry: IntersectionObserverEntry | null
  /** Reset triggered status (e.g. when product changes) */
  reset: () => void
}

/**
 * Custom React hook utilizing the Intersection Observer API to detect
 * when an element enters or approaches the viewport.
 * Specifically optimized for lazy-loading off-screen product imagery across the storefront.
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLElement>({
  root = null,
  rootMargin = '250px 0px',
  threshold = 0,
  triggerOnce = true,
  enabled = true,
  initialIsIntersecting = false,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverReturn<T> {
  const [element, setElement] = useState<T | null>(null)
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  // Initialize visibility: true if initialIsIntersecting is true or if IntersectionObserver is not supported
  const [isIntersecting, setIsIntersecting] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
      return true
    }
    return initialIsIntersecting
  })
  const [hasTriggered, setHasTriggered] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
      return true
    }
    return initialIsIntersecting
  })

  const reset = useCallback(() => {
    setIsIntersecting(initialIsIntersecting)
    setHasTriggered(initialIsIntersecting)
    setEntry(null)
  }, [initialIsIntersecting])

  const ref = useCallback((node: T | null) => {
    setElement(node)
  }, [])

  useEffect(() => {
    if (!enabled || !element) {
      return
    }

    if (triggerOnce && hasTriggered) {
      return
    }

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return
    }

    try {
      const observer = new IntersectionObserver(
        (entries) => {
          const currentEntry = entries[0]
          if (!currentEntry) return

          setEntry(currentEntry)
          const intersects = currentEntry.isIntersecting || currentEntry.intersectionRatio > 0

          if (intersects) {
            setIsIntersecting(true)
            setHasTriggered(true)

            if (triggerOnce) {
              observer.disconnect()
            }
          } else if (!triggerOnce) {
            setIsIntersecting(false)
          }
        },
        {
          root: root ?? null,
          rootMargin,
          threshold,
        }
      )

      observer.observe(element)

      return () => {
        observer.disconnect()
      }
    } catch (err) {
      console.warn('[useIntersectionObserver] Failed to initialize observer:', err)
    }
  }, [element, enabled, hasTriggered, root, rootMargin, threshold, triggerOnce])

  return {
    ref,
    isIntersecting,
    hasTriggered,
    entry,
    reset,
  }
}
