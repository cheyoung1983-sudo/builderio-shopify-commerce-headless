'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
  startTransition,
} from 'react'
import {
  createStorefrontCart,
  fetchStorefrontCart,
  addStorefrontCartLines,
  updateStorefrontCartLines,
  removeStorefrontCartLines,
} from '../services/shopify'
import { useToast } from './ToastContext'
import { reconcileCart, remoteLinesFromCart } from '../lib/cart-reconcile'

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export interface CartItemImage {
  url: string
  src?: string
  altText?: string | null
  width?: number | null
  height?: number | null
}

export interface CartItemPrice {
  amount: string
  currencyCode: string
}

export interface CartItem {
  /** Unique identifier for this line (Storefront Line ID or Variant ID) */
  id: string
  /** Shopify Storefront GraphQL line ID (e.g. gid://shopify/CartLine/...) */
  lineId?: string
  /** Shopify Variant ID (e.g. gid://shopify/ProductVariant/...) */
  variantId: string
  /** Parent product ID */
  productId?: string
  /** Product display title */
  title: string
  /** Product URL slug */
  handle?: string
  /** Specific variant title (e.g. "Space Black / 256GB" or "Default Title") */
  variantTitle?: string
  /** Quantity of this item in the shopping bag */
  quantity: number
  /** Unit price */
  price: CartItemPrice
  /** Original/compare price for sale items */
  compareAtPrice?: CartItemPrice | null
  /** Primary product/variant image */
  image?: CartItemImage | null
  /** Selected options (e.g. [{ name: "Color", value: "Black" }]) */
  options?: Array<{ name: string; value: string }>
  /** Product brand/vendor */
  vendor?: string
  /** Stock keeping unit */
  sku?: string
  /** Custom line attributes */
  customAttributes?: Array<{ key: string; value: string }>
}

export interface AddToCartInput {
  /** Shopify Variant ID (required) */
  variantId: string
  /** Quantity to add (default: 1) */
  quantity?: number
  /** Product title */
  title?: string
  /** Product URL handle */
  handle?: string
  /** Variant specific title */
  variantTitle?: string
  /** Item price */
  price?: string | number | { amount: string | number; currencyCode?: string }
  /** Compare-at / original price */
  compareAtPrice?: string | number | { amount: string | number; currencyCode?: string } | null
  /** Product or variant image */
  image?: string | { url?: string; src?: string; altText?: string | null } | null
  /** Selected options */
  options?: Array<{ name: string; value: string }>
  /** Product vendor */
  vendor?: string | null
  /** Variant SKU */
  sku?: string | null
  /** Custom attributes */
  customAttributes?: Array<{ key: string; value: string }>
}

export interface CartNotification {
  id: string
  type: 'add' | 'update' | 'remove' | 'error' | 'clear'
  title: string
  message: string
  item?: CartItem
  timestamp: number
}

export interface CartContextValue {
  /** List of all items currently in the shopping bag */
  items: CartItem[]
  /** Total count of all items (sum of quantities) */
  totalQuantity: number
  /** Numeric subtotal of all items */
  subtotal: number
  /** Primary currency code (e.g. 'USD') */
  currencyCode: string
  /** Formatted subtotal string (e.g. '$283.98') */
  subtotalFormatted: string
  /** Direct live Shopify checkout URL */
  checkoutUrl: string | null
  /** Active Shopify Storefront Cart ID */
  cartId: string | null
  /** Whether the shopping bag sidebar or modal is currently visible */
  isOpen: boolean
  /** Whether an active cart mutation is in flight */
  isLoading: boolean
  /** Whether background synchronization with Shopify is in progress */
  isSyncing: boolean
  /** Any error encountered during cart mutations */
  error: string | null
  /** Latest user feedback notification (e.g. "Added to shopping bag") */
  notification: CartNotification | null
  /** Adds an item to the shopping bag */
  addItem: (input: AddToCartInput) => Promise<void>
  /** Convenience method to add a raw Shopify product object */
  addProduct: (
    product: any,
    selectedVariantId?: string,
    quantity?: number
  ) => Promise<void>
  /** Updates the quantity of a specific line or variant in the bag */
  updateQuantity: (variantOrLineId: string, quantity: number) => Promise<void>
  /** Removes an item completely from the shopping bag */
  removeItem: (variantOrLineId: string) => Promise<void>
  /** Empties all items from the shopping bag */
  clearCart: () => Promise<void>
  /** Opens the shopping bag sidebar / drawer */
  openCart: () => void
  /** Closes the shopping bag sidebar / drawer */
  closeCart: () => void
  /** Toggles the shopping bag open/closed */
  toggleCart: () => void
  /** Dismisses the current floating notification */
  dismissNotification: () => void
  /** Forces a refresh and reconciliation with Shopify Storefront API */
  refreshCart: () => Promise<void>
  /** Redirects the browser to the live Shopify checkout */
  proceedToCheckout: () => Promise<void>
  /** Checks if a variant is already in the shopping bag */
  isItemInCart: (variantId: string) => boolean
  /** Returns the quantity of a specific variant in the shopping bag */
  getItemQuantity: (variantId: string) => number
}

// ---------------------------------------------------------------------------
// Storage Keys & Helpers
// ---------------------------------------------------------------------------

import {
  CART_STORAGE_KEYS as STORAGE_KEYS,
  loadStoredCartItems,
  persistAllCartData,
} from '../lib/cart-storage'

export function formatCurrency(amount: number | string, currency = 'USD'): string {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numeric)) return `$0.00`
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(numeric)
  } catch {
    return `$${numeric.toFixed(2)}`
  }
}

// ---------------------------------------------------------------------------
// Context Initialization
// ---------------------------------------------------------------------------

export const CartContext = createContext<CartContextValue | undefined>(undefined)

// ---------------------------------------------------------------------------
// Provider Implementation
// ---------------------------------------------------------------------------

export interface CartProviderProps {
  children: ReactNode
  /** Optional callback when cart drawer opens (e.g. to integrate with existing UI context) */
  onOpen?: () => void
  /** Optional callback when cart drawer closes */
  onClose?: () => void
}

export const CartProvider: React.FC<CartProviderProps> = ({
  children,
  onOpen,
  onClose,
}) => {
  const [items, setItems] = useState<CartItem[]>([])
  const [cartId, setCartId] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<CartNotification | null>(null)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const { showCartToast, showError } = useToast()

  const isLoadedRef = useRef<boolean>(false)
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const syncQueueRef = useRef<Promise<any>>(Promise.resolve())
  // Authoritative, synchronously updated copies so queued Shopify syncs never
  // read a stale cart id or item list from a render closure.
  const itemsRef = useRef<CartItem[]>([])
  const cartIdRef = useRef<string | null>(null)
  const checkoutUrlRef = useRef<string | null>(null)

  const commitItems = useCallback((next: CartItem[]) => {
    itemsRef.current = next
    setItems(next)
    persistAllCartData(next, cartIdRef.current, checkoutUrlRef.current)
  }, [])

  /**
   * Queue one reconcile of the Shopify cart against the latest local items.
   * Resolves with the checkoutUrl from the newest Shopify cart response.
   */
  const enqueueReconcile = useCallback((): Promise<string | null> => {
    const run = syncQueueRef.current.then(async () => {
      setIsSyncing(true)
      try {
        const result = await reconcileCart(
          {
            fetchCart: fetchStorefrontCart,
            createCart: (lines) => createStorefrontCart(lines),
            addLines: addStorefrontCartLines,
            updateLines: updateStorefrontCartLines,
            removeLines: removeStorefrontCartLines,
          },
          cartIdRef.current,
          itemsRef.current.map((it) => ({ variantId: it.variantId, quantity: it.quantity }))
        )
        cartIdRef.current = result.cartId
        checkoutUrlRef.current = result.checkoutUrl
        setCartId(result.cartId)
        setCheckoutUrl(result.checkoutUrl)
        if (result.cart) {
          const lines = remoteLinesFromCart(result.cart)
          const mapped = itemsRef.current.map((it) => {
            const line = lines.find((l) => l.variantId === it.variantId)
            return line ? { ...it, lineId: line.id, id: line.id } : it
          })
          itemsRef.current = mapped
          setItems(mapped)
        }
        persistAllCartData(itemsRef.current, result.cartId, result.checkoutUrl)
        return result.checkoutUrl
      } catch (err) {
        console.warn('[CartContext] Shopify cart sync warning:', err)
        return checkoutUrlRef.current
      } finally {
        setIsSyncing(false)
      }
    })
    syncQueueRef.current = run.catch(() => null)
    return run
  }, [])

  // Show auto-dismissing toast notification
  const triggerNotification = useCallback(
    (notif: Omit<CartNotification, 'id' | 'timestamp'>) => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current)
      }
      const fullNotif: CartNotification = {
        ...notif,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      }
      setNotification(fullNotif)
      notificationTimeoutRef.current = setTimeout(() => {
        setNotification(null)
      }, 4500)

      // Synchronize with global toast system
      if (notif.type === 'add' && notif.item) {
        const it = notif.item
        showCartToast({
          title: it.title,
          image: it.image?.url || it.image?.src || null,
          price: it.price?.amount ? `$${it.price.amount}` : null,
          quantity: it.quantity || 1,
          variantTitle:
            it.variantTitle && it.variantTitle !== 'Default Title' ? it.variantTitle : null,
          onViewBag: () => {
            if (typeof onOpen === 'function') {
              onOpen()
            } else {
              setIsOpen(true)
            }
          },
        })
      } else if (notif.type === 'error') {
        showError(notif.title || 'Error', notif.message)
      }
    },
    [showCartToast, showError, onOpen]
  )

  const dismissNotification = useCallback(() => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current)
    }
    setNotification(null)
  }, [])

  // 1. Initial Load from LocalStorage on mount (runs on client only)
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const {
        items: storedItems,
        cartId: storedCartId,
        checkoutUrl: storedCheckout,
      } = loadStoredCartItems()

      const toCartItem = (item: any) => ({
        id: item.id,
        lineId: item.lineId,
        variantId: item.variantId,
        productId: item.productId,
        title: item.title,
        handle: item.handle,
        variantTitle: item.variantTitle,
        quantity: item.quantity,
        price: {
          amount: item.price?.amount ?? '0.00',
          currencyCode: item.price?.currencyCode ?? 'USD',
        },
        compareAtPrice: item.compareAtPrice
          ? {
              amount: item.compareAtPrice.amount,
              currencyCode: item.compareAtPrice.currencyCode,
            }
          : null,
        image: item.image
          ? {
              url: item.image.url,
              src: item.image.src,
              altText: item.image.altText,
              width: item.image.width,
              height: item.image.height,
            }
          : null,
        options: item.options,
        vendor: item.vendor,
        sku: item.sku,
        customAttributes: item.customAttributes,
      })

      startTransition(() => {
        const loaded =
          storedItems && Array.isArray(storedItems) ? storedItems.map(toCartItem) : []
        itemsRef.current = loaded
        setItems(loaded)
        // A cart id without items is stale: never reuse it.
        cartIdRef.current = loaded.length > 0 ? storedCartId || null : null
        checkoutUrlRef.current = loaded.length > 0 ? storedCheckout || null : null
        setCartId(cartIdRef.current)
        setCheckoutUrl(checkoutUrlRef.current)
        setIsInitialized(true)
      })
    } catch (err) {
      console.warn('[CartContext] Failed to load initial cart from localStorage:', err)
      startTransition(() => {
        setIsInitialized(true)
      })
    } finally {
      isLoadedRef.current = true
    }
  }, [])

  // 2. Persist cart items, cartId, and checkoutUrl to LocalStorage whenever state changes
  useEffect(() => {
    if (!isLoadedRef.current || !isInitialized) return
    persistAllCartData(items, cartId, checkoutUrl)
  }, [items, cartId, checkoutUrl, isInitialized])

  // 3. Multi-tab synchronization via window storage event
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEYS.ITEMS ||
        e.key === STORAGE_KEYS.ITEMS_FALLBACK ||
        e.key === STORAGE_KEYS.LEGACY_CART
      ) {
        try {
          const { items: freshItems } = loadStoredCartItems()
          const toCartItem = (item: any) => ({
            id: item.id,
            lineId: item.lineId,
            variantId: item.variantId,
            productId: item.productId,
            title: item.title,
            handle: item.handle,
            variantTitle: item.variantTitle,
            quantity: item.quantity,
            price: {
              amount: item.price?.amount ?? '0.00',
              currencyCode: item.price?.currencyCode ?? 'USD',
            },
            compareAtPrice: item.compareAtPrice
              ? {
                  amount: item.compareAtPrice.amount,
                  currencyCode: item.compareAtPrice.currencyCode,
                }
              : null,
            image: item.image
              ? {
                  url: item.image.url,
                  src: item.image.src,
                  altText: item.image.altText,
                  width: item.image.width,
                  height: item.image.height,
                }
              : null,
            options: item.options,
            vendor: item.vendor,
            sku: item.sku,
            customAttributes: item.customAttributes,
          })
          const fresh = freshItems.map(toCartItem)
          itemsRef.current = fresh
          startTransition(() => {
            setItems(fresh)
          })
        } catch {
          // ignore
        }
      }
      if (e.key === STORAGE_KEYS.CART_ID) {
        cartIdRef.current = e.newValue || null
        startTransition(() => {
          setCartId(e.newValue || null)
        })
      }
      if (e.key === STORAGE_KEYS.CHECKOUT_URL) {
        checkoutUrlRef.current = e.newValue || null
        startTransition(() => {
          setCheckoutUrl(e.newValue || null)
        })
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Compute totalQuantity, subtotal, and currency
  const { totalQuantity, subtotal, currencyCode } = useMemo(() => {
    let qty = 0
    let sub = 0
    let curr = 'USD'

    for (const item of items) {
      qty += item.quantity
      const numericPrice = parseFloat(item.price?.amount || '0')
      if (!isNaN(numericPrice)) {
        sub += numericPrice * item.quantity
      }
      if (item.price?.currencyCode) {
        curr = item.price.currencyCode
      }
    }

    return {
      totalQuantity: qty,
      subtotal: Math.round(sub * 100) / 100,
      currencyCode: curr,
    }
  }, [items])

  const subtotalFormatted = useMemo(
    () => formatCurrency(subtotal, currencyCode),
    [subtotal, currencyCode]
  )

  // ---------------------------------------------------------------------------
  // Shopify Storefront API Reconciliation Helpers
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Cart Actions (Optimistic UI + Background Storefront Sync)
  // ---------------------------------------------------------------------------

  /**
   * Adds an item to the shopping bag.
   */
  const addItem = useCallback(
    async (input: AddToCartInput) => {
      setIsLoading(true)
      setError(null)

      try {
        const qtyToAdd = Math.max(1, input.quantity || 1)
        const variantId = input.variantId

        if (!variantId) {
          throw new Error('Cannot add to bag: Variant ID is required.')
        }

        // Parse price
        let priceAmount = '0.00'
        let priceCurrency = 'USD'
        if (typeof input.price === 'object' && input.price !== null) {
          priceAmount = String(input.price.amount || '0.00')
          priceCurrency = input.price.currencyCode || 'USD'
        } else if (typeof input.price === 'number' || typeof input.price === 'string') {
          priceAmount = String(input.price)
        }

        // Parse compareAtPrice
        let comparePriceAmount: string | null = null
        if (typeof input.compareAtPrice === 'object' && input.compareAtPrice !== null) {
          comparePriceAmount = String(input.compareAtPrice.amount || '')
        } else if (input.compareAtPrice) {
          comparePriceAmount = String(input.compareAtPrice)
        }

        // Normalize image
        let itemImage: CartItemImage | null = null
        if (typeof input.image === 'string') {
          itemImage = { url: input.image, src: input.image }
        } else if (typeof input.image === 'object' && input.image !== null) {
          const u = input.image.url || (input.image as any).src || ''
          itemImage = {
            url: u,
            src: u,
            altText: input.image.altText || input.title || '',
          }
        }

        let addedItemReference: CartItem | null = null

        // 1. Optimistically update local state immediately
        {
          const prev = itemsRef.current
          const existingIndex = prev.findIndex((it) => it.variantId === variantId)
          if (existingIndex > -1) {
            const existing = prev[existingIndex]
            const updated: CartItem = {
              ...existing,
              quantity: existing.quantity + qtyToAdd,
              title: input.title || existing.title,
              image: itemImage || existing.image,
              price: {
                amount: priceAmount !== '0.00' ? priceAmount : existing.price.amount,
                currencyCode: priceCurrency || existing.price.currencyCode,
              },
            }
            addedItemReference = updated
            const next = [...prev]
            next[existingIndex] = updated
            commitItems(next)
          } else {
            const newItem: CartItem = {
              id: variantId,
              variantId,
              title: input.title || 'Product',
              handle: input.handle || '',
              variantTitle: input.variantTitle || 'Default Title',
              quantity: qtyToAdd,
              price: { amount: priceAmount, currencyCode: priceCurrency },
              compareAtPrice: comparePriceAmount
                ? { amount: comparePriceAmount, currencyCode: priceCurrency }
                : null,
              image: itemImage,
              options: input.options || [],
              vendor: input.vendor || '',
              sku: input.sku || '',
              customAttributes: input.customAttributes || [],
            }
            addedItemReference = newItem
            commitItems([...prev, newItem])
          }
        }

        // 2. Trigger notification
        triggerNotification({
          type: 'add',
          title: 'Added to Shopping Bag',
          message: `${input.title || 'Item'} (${qtyToAdd}x) has been added to your shopping bag.`,
          item: addedItemReference || undefined,
        })

        // 3. Queue Storefront sync (serialized; uses latest cart id, so rapid
        // adds into a new cart can't create two carts)
        void enqueueReconcile()
      } catch (err: any) {
        console.error('[CartContext] addItem error:', err)
        setError(err.message || 'Failed to add item to shopping bag.')
        triggerNotification({
          type: 'error',
          title: 'Unable to Add Item',
          message: err.message || 'There was a problem adding this item to your bag.',
        })
      } finally {
        setIsLoading(false)
      }
    },
    [commitItems, enqueueReconcile, triggerNotification]
  )

  /**
   * Convenience method to add directly from a raw Shopify product object
   */
  const addProduct = useCallback(
    async (product: any, selectedVariantId?: string, quantity = 1) => {
      if (!product) return

      // Find variant
      const variants = product.variants?.edges || []
      let targetVariant = variants[0]?.node

      if (selectedVariantId) {
        const found = variants.find(
          (edge: any) => edge.node?.id === selectedVariantId
        )
        if (found) targetVariant = found.node
      }

      const variantId = targetVariant?.id || product.id
      const priceAmount =
        targetVariant?.price?.amount ||
        product.priceRange?.minVariantPrice?.amount ||
        '0.00'
      const currency =
        targetVariant?.price?.currencyCode ||
        product.priceRange?.minVariantPrice?.currencyCode ||
        'USD'

      const comparePrice =
        targetVariant?.compareAtPrice?.amount ||
        product.compareAtPriceRange?.minVariantPrice?.amount ||
        null

      const imageUrl =
        targetVariant?.image?.url ||
        product.featuredImage?.url ||
        product.images?.edges?.[0]?.node?.url ||
        null

      await addItem({
        variantId,
        quantity,
        title: product.title,
        handle: product.handle,
        variantTitle: targetVariant?.title,
        price: { amount: priceAmount, currencyCode: currency },
        compareAtPrice: comparePrice
          ? { amount: comparePrice, currencyCode: currency }
          : null,
        image: imageUrl ? { url: imageUrl, altText: product.title } : null,
        vendor: product.vendor,
        sku: targetVariant?.sku,
      })
    },
    [addItem]
  )

  /**
   * Removes an item completely from the shopping bag.
   */
  const removeItem = useCallback(
    async (variantOrLineId: string) => {
      const prev = itemsRef.current
      const matches = (it: CartItem) =>
        it.variantId === variantOrLineId ||
        it.id === variantOrLineId ||
        it.lineId === variantOrLineId
      const removedItem = prev.find(matches) || null
      commitItems(prev.filter((it) => !matches(it)))

      if (removedItem) {
        triggerNotification({
          type: 'remove',
          title: 'Item Removed',
          message: `${removedItem.title} was removed from your shopping bag.`,
          item: removedItem,
        })
      }

      // Reconcile removes the line from the same Shopify cart checkout uses,
      // even if its Shopify line id was never mapped locally.
      void enqueueReconcile()
    },
    [commitItems, enqueueReconcile, triggerNotification]
  )

  /**
   * Updates the quantity of an item in the bag.
   */
  const updateQuantity = useCallback(
    async (variantOrLineId: string, nextQuantity: number) => {
      if (nextQuantity <= 0) {
        await removeItem(variantOrLineId)
        return
      }

      let updatedItem: CartItem | null = null
      const next = itemsRef.current.map((it) => {
        if (it.variantId === variantOrLineId || it.id === variantOrLineId || it.lineId === variantOrLineId) {
          updatedItem = { ...it, quantity: nextQuantity }
          return updatedItem
        }
        return it
      })
      commitItems(next)

      if (updatedItem) {
        triggerNotification({
          type: 'update',
          title: 'Shopping Bag Updated',
          message: `Quantity for ${(updatedItem as any).title} changed to ${nextQuantity}.`,
          item: updatedItem,
        })
      }

      void enqueueReconcile()
    },
    [commitItems, enqueueReconcile, triggerNotification, removeItem]
  )

  /**
   * Clears all items from the shopping bag.
   */
  const clearCart = useCallback(async () => {
    commitItems([])
    void enqueueReconcile()
    triggerNotification({
      type: 'clear',
      title: 'Shopping Bag Cleared',
      message: 'All items have been removed from your shopping bag.',
    })
  }, [commitItems, enqueueReconcile, triggerNotification])

  /**
   * Refreshes the cart from Shopify Storefront API
   */
  const refreshCart = useCallback(async () => {
    const cartId = cartIdRef.current
    if (!cartId) return
    setIsSyncing(true)
    try {
      const res = await fetchStorefrontCart(cartId)
      if (res.ok && res.data?.cart) {
        const remoteCart = res.data.cart
        checkoutUrlRef.current = remoteCart.checkoutUrl
        setCheckoutUrl(remoteCart.checkoutUrl)

        // Sync lines if remote cart has items
        const remoteLines = remoteCart.lines?.edges || []
        if (remoteLines.length > 0) {
          const freshItems: CartItem[] = remoteLines.map((edge: any) => {
            const node = edge.node
            const merch = node.merchandise || {}
            return {
              id: node.id,
              lineId: node.id,
              variantId: merch.id,
              title: merch.product?.title || merch.title || 'Product',
              handle: merch.product?.handle || '',
              variantTitle: merch.title || '',
              quantity: node.quantity,
              price: {
                amount: merch.price?.amount || '0.00',
                currencyCode: merch.price?.currencyCode || 'USD',
              },
              compareAtPrice: merch.compareAtPrice
                ? {
                    amount: merch.compareAtPrice.amount,
                    currencyCode: merch.compareAtPrice.currencyCode || 'USD',
                  }
                : null,
              image: merch.image
                ? {
                    url: merch.image.url,
                    src: merch.image.url,
                    altText: merch.image.altText || merch.title,
                  }
                : null,
              vendor: merch.product?.vendor || '',
              sku: merch.sku || '',
            }
          })
          itemsRef.current = freshItems
          setItems(freshItems)
        }
      }
    } catch (err) {
      console.warn('[CartContext] refreshCart failed:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  // Drawer / Bag Visibility Toggles
  const openCart = useCallback(() => {
    setIsOpen(true)
    onOpen?.()
  }, [onOpen])

  const closeCart = useCallback(() => {
    setIsOpen(false)
    onClose?.()
  }, [onClose])

  const toggleCart = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev
      if (next) onOpen?.()
      else onClose?.()
      return next
    })
  }, [onOpen, onClose])

  const isItemInCart = useCallback(
    (variantId: string) => items.some((it) => it.variantId === variantId),
    [items]
  )

  const getItemQuantity = useCallback(
    (variantId: string) => {
      const found = items.find((it) => it.variantId === variantId)
      return found ? found.quantity : 0
    },
    [items]
  )

  /**
   * Waits for pending syncs, reconciles once more, and redirects to the
   * checkoutUrl from that latest Shopify response (never a cached URL).
   */
  const proceedToCheckout = useCallback(async () => {
    if (typeof window === 'undefined') return
    if (itemsRef.current.length === 0) return
    const url = await enqueueReconcile()
    if (url) {
      window.location.href = url
    } else {
      triggerNotification({
        type: 'error',
        title: 'Checkout unavailable',
        message: 'We could not prepare checkout. Please try again.',
      })
    }
  }, [enqueueReconcile, triggerNotification])

  // Context value object
  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalQuantity,
      subtotal,
      currencyCode,
      subtotalFormatted,
      checkoutUrl,
      cartId,
      isOpen,
      isLoading,
      isSyncing,
      error,
      notification,
      addItem,
      addProduct,
      updateQuantity,
      removeItem,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
      dismissNotification,
      refreshCart,
      proceedToCheckout,
      isItemInCart,
      getItemQuantity,
    }),
    [
      items,
      totalQuantity,
      subtotal,
      currencyCode,
      subtotalFormatted,
      checkoutUrl,
      cartId,
      isOpen,
      isLoading,
      isSyncing,
      error,
      notification,
      addItem,
      addProduct,
      updateQuantity,
      removeItem,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
      dismissNotification,
      refreshCart,
      proceedToCheckout,
      isItemInCart,
      getItemQuantity,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Main hook to consume the cart context
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a <CartProvider>')
  }
  return context
}

/**
 * Hook to retrieve only cart actions
 */
export function useCartActions() {
  const {
    addItem,
    addProduct,
    updateQuantity,
    removeItem,
    clearCart,
    openCart,
    closeCart,
    toggleCart,
    refreshCart,
    proceedToCheckout,
  } = useCart()

  return {
    addItem,
    addProduct,
    updateQuantity,
    removeItem,
    clearCart,
    openCart,
    closeCart,
    toggleCart,
    refreshCart,
    proceedToCheckout,
  }
}

/**
 * Hook to retrieve the total number of items in the shopping bag
 */
export function useShoppingBagCount(): number {
  const { totalQuantity } = useCart()
  return totalQuantity
}

/**
 * Hook to retrieve all items in the shopping bag
 */
export function useShoppingBagItems(): CartItem[] {
  const { items } = useCart()
  return items
}

export default CartContext
