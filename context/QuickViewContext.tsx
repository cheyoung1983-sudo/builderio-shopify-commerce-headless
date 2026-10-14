'use client'
import { useRouter } from 'next/router'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { ShopifyProductNode, ShopifyProductDetailNode } from '../services/shopify'

export type QuickViewProductInput = ShopifyProductNode | ShopifyProductDetailNode | string

export interface QuickViewContextValue {
  /** Whether the Quick View side-panel modal is currently open */
  isOpen: boolean
  /** The current product node if passed, or null */
  product: ShopifyProductNode | ShopifyProductDetailNode | null
  /** The handle of the active product to display */
  handle: string | null
  /** Open the Quick View side-panel modal for a given product or handle */
  openQuickView: (target: QuickViewProductInput) => void
  /** Close the Quick View side-panel modal */
  closeQuickView: () => void
}

export const QuickViewContext = createContext<QuickViewContextValue | undefined>(undefined)

export interface QuickViewProviderProps {
  children: ReactNode
}

export const QuickViewProvider: React.FC<QuickViewProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [product, setProduct] = useState<ShopifyProductNode | ShopifyProductDetailNode | null>(null)
  const [handle, setHandle] = useState<string | null>(null)

  const openQuickView = useCallback((target: QuickViewProductInput) => {
    if (typeof target === 'string') {
      setHandle(target)
      setProduct(null)
    } else if (target && typeof target === 'object') {
      setProduct(target)
      setHandle(target.handle || null)
    }
    setIsOpen(true)
  }, [])

  const closeQuickView = useCallback(() => {
    setIsOpen(false)
  }, [])

  // The provider lives in the shared Layout, so it survives client-side
  // navigation. Without this, clicking "View full product page" inside the
  // Quick View navigated to the product page with the drawer still open on
  // top of it, covering Add to Cart. Close it whenever the route changes.
  const router = useRouter()
  useEffect(() => {
    const events = router?.events
    if (!events) return
    const close = () => setIsOpen(false)
    events.on('routeChangeStart', close)
    return () => events.off('routeChangeStart', close)
  }, [router?.events])

  const value = {
    isOpen,
    product,
    handle,
    openQuickView,
    closeQuickView,
  }

  return (
    <QuickViewContext.Provider value={value}>
      {children}
    </QuickViewContext.Provider>
  )
}

export const useQuickView = (): QuickViewContextValue => {
  const context = useContext(QuickViewContext)
  if (!context) {
    throw new Error('useQuickView must be used within a QuickViewProvider')
  }
  return context
}

export default QuickViewContext
