'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react'

export type ToastType = 'cart' | 'wishlist' | 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick?: () => void
  href?: string
}

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
  image?: string | null
  variantTitle?: string | null
  price?: string | null
  quantity?: number | null
  badge?: string | null
  action?: ToastAction
  secondaryAction?: ToastAction
  duration?: number // duration in ms, 0 means persistent until user dismisses
  createdAt: number
}

export type ToastInput = Omit<ToastItem, 'id' | 'createdAt'> & {
  id?: string
  duration?: number
}

export interface ShowWishlistToastParams {
  product: {
    id: string
    title: string
    handle?: string
    featuredImage?: { url?: string; altText?: string | null } | null
    images?: { edges?: Array<{ node?: { url?: string; altText?: string | null } }> }
    priceRange?: { minVariantPrice?: { amount: string; currencyCode: string } }
  }
  actionType: 'added' | 'removed'
  onUndo?: () => void
}

export interface ShowCartToastParams {
  title: string
  image?: string | null
  price?: string | null
  quantity?: number | null
  variantTitle?: string | null
  subtotalFormatted?: string | null
  totalQuantity?: number | null
  onViewBag?: () => void
  onCheckout?: () => void
}

export interface ToastContextValue {
  toasts: ToastItem[]
  showToast: (input: ToastInput) => string
  showCartToast: (params: ShowCartToastParams) => string
  showWishlistToast: (params: ShowWishlistToastParams) => string
  showSuccess: (title: string, message?: string, options?: Partial<ToastInput>) => string
  showError: (title: string, message?: string, options?: Partial<ToastInput>) => string
  showInfo: (title: string, message?: string, options?: Partial<ToastInput>) => string
  dismissToast: (id: string) => void
  clearToasts: () => void
}

const DEFAULT_DURATION = 4500
const MAX_CONCURRENT_TOASTS = 3

export const ToastContext = createContext<ToastContextValue | null>(null)

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  const showToast = useCallback(
    (input: ToastInput): string => {
      const id = input.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
      const newToast: ToastItem = {
        ...input,
        id,
        duration: typeof input.duration === 'number' ? input.duration : DEFAULT_DURATION,
        createdAt: Date.now(),
      }

      setToasts((prev) => {
        // Keep newest and cap at MAX_CONCURRENT_TOASTS
        const filtered = prev.filter((t) => t.id !== id)
        const updated = [...filtered, newToast]
        if (updated.length > MAX_CONCURRENT_TOASTS) {
          return updated.slice(updated.length - MAX_CONCURRENT_TOASTS)
        }
        return updated
      })

      return id
    },
    []
  )

  const showCartToast = useCallback(
    (params: ShowCartToastParams): string => {
      const qty = params.quantity || 1
      return showToast({
        type: 'cart',
        title: 'Added to Shopping Bag',
        message: `${params.title}${qty > 1 ? ` (${qty}x)` : ''} has been added to your shopping bag.`,
        image: params.image || null,
        variantTitle: params.variantTitle || null,
        price: params.price || null,
        quantity: qty,
        action: {
          label: 'View Bag',
          onClick: params.onViewBag,
          href: !params.onViewBag ? '/cart' : undefined,
        },
        duration: DEFAULT_DURATION,
      })
    },
    [showToast]
  )

  const showWishlistToast = useCallback(
    ({ product, actionType, onUndo }: ShowWishlistToastParams): string => {
      const imageUrl =
        product.featuredImage?.url ||
        product.images?.edges?.[0]?.node?.url ||
        null

      const minPrice = product.priceRange?.minVariantPrice?.amount
      const currency = product.priceRange?.minVariantPrice?.currencyCode || 'USD'
      const formattedPrice = minPrice ? `$${parseFloat(minPrice).toFixed(2)} ${currency}` : null

      if (actionType === 'added') {
        return showToast({
          type: 'wishlist',
          title: 'Saved to Wishlist',
          message: `${product.title} has been added to your wishlist.`,
          image: imageUrl,
          price: formattedPrice,
          action: {
            label: 'View Wishlist',
            href: '/wishlist',
          },
          duration: DEFAULT_DURATION,
        })
      }

      // actionType === 'removed'
      return showToast({
        type: 'wishlist',
        title: 'Removed from Wishlist',
        message: `${product.title} was removed from your wishlist.`,
        image: imageUrl,
        action: onUndo
          ? {
              label: 'Undo',
              onClick: onUndo,
            }
          : {
              label: 'View Wishlist',
              href: '/wishlist',
            },
        duration: DEFAULT_DURATION,
      })
    },
    [showToast]
  )

  const showSuccess = useCallback(
    (title: string, message?: string, options?: Partial<ToastInput>): string => {
      return showToast({
        type: 'success',
        title,
        message,
        ...options,
      })
    },
    [showToast]
  )

  const showError = useCallback(
    (title: string, message?: string, options?: Partial<ToastInput>): string => {
      return showToast({
        type: 'error',
        title,
        message,
        duration: options?.duration ?? 6000,
        ...options,
      })
    },
    [showToast]
  )

  const showInfo = useCallback(
    (title: string, message?: string, options?: Partial<ToastInput>): string => {
      return showToast({
        type: 'info',
        title,
        message,
        ...options,
      })
    },
    [showToast]
  )

  const contextValue = useMemo(
    () => ({
      toasts,
      showToast,
      showCartToast,
      showWishlistToast,
      showSuccess,
      showError,
      showInfo,
      dismissToast,
      clearToasts,
    }),
    [
      toasts,
      showToast,
      showCartToast,
      showWishlistToast,
      showSuccess,
      showError,
      showInfo,
      dismissToast,
      clearToasts,
    ]
  )

  return <ToastContext.Provider value={contextValue}>{children}</ToastContext.Provider>
}

// Fallback safe hook that doesn't throw if outside provider
const fallbackValue: ToastContextValue = {
  toasts: [],
  showToast: () => '',
  showCartToast: () => '',
  showWishlistToast: () => '',
  showSuccess: () => '',
  showError: () => '',
  showInfo: () => '',
  dismissToast: () => {},
  clearToasts: () => {},
}

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext)
  return context || fallbackValue
}

export default ToastProvider
