'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
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
