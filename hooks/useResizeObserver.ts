'use client'

import { useEffect, useRef } from 'react'

/**
 * Modern ResizeObserver hook to replace legacy element-resize-detector logic.
 */
export function useResizeObserver<T extends HTMLElement>(
  callback: (entry: ResizeObserverEntry) => void
) {
  const ref = useRef<T>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ResizeObserver) return

    observerRef.current = new ResizeObserver((entries) => {
      if (entries[0]) {
        callback(entries[0])
      }
    })

    const element = ref.current
    if (element) {
      observerRef.current.observe(element)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [callback])

  return ref
}
