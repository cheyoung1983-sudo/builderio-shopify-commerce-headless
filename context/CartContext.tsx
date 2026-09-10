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
} from 'react'
import {
  createStorefrontCart,
  fetchStorefrontCart,
  addStorefrontCartLines,
  updateStorefrontCartLines,
  removeStorefrontCartLines,
} from '../services/shopify'

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
  proceedToCheckout: () => void
  /** Checks if a variant is already in the shopping bag */
  isItemInCart: (variantId: string) => boolean
  /** Returns the quantity of a specific variant in the shopping bag */
  getItemQuantity: (variantId: string) => number
}

// ---------------------------------------------------------------------------
// Storage Keys & Helpers
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  ITEMS: 'shopify_bag_items_v2',
  ITEMS_FALLBACK: 'shopify_cart_items',
  CART_ID: 'shopify_bag_cart_id_v2',
  CHECKOUT_URL: 'shopify_bag_checkout_url_v2',
  LEGACY_CART: 'shopify_local_store__cart',
}

/**
 * Loads stored cart items and identifiers from localStorage across primary,
 * fallback, and legacy storefront-data-hooks keys.
 */
export function loadStoredCartItems(): {
  items: CartItem[]
  cartId: string | null
  checkoutUrl: string | null
} {
  if (typeof window === 'undefined') {
    return { items: [], cartId: null, checkoutUrl: null }
  }

  let items: CartItem[] = []
  let cartId: string | null = null
  let checkoutUrl: string | null = null

  // 1. Try primary storage key
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ITEMS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        items = parsed
      }
    }
  } catch (e) {
    console.warn(`[CartContext] Failed to parse primary cart items from localStorage:`, e)
  }

  // 2. Fallback to secondary storage key if primary is empty
  if (items.length === 0) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.ITEMS_FALLBACK)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          items = parsed
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback to legacy storefront-data-hooks cart if still empty
  if (items.length === 0) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.LEGACY_CART)
      if (raw) {
        const parsed = JSON.parse(raw)
        const lines = parsed?.lineItems || []
        if (Array.isArray(lines) && lines.length > 0) {
          items = lines.map((li: any) => ({
            id: String(li.id || li.variant?.id || Math.random()),
            lineId: li.id ? String(li.id) : undefined,
            variantId: String(li.variant?.id || li.id),
            productId: li.variant?.product?.id ? String(li.variant.product.id) : undefined,
            title: li.title || li.variant?.title || 'Product',
            handle: li.variant?.product?.handle || '',
            variantTitle: li.variant?.title || 'Default Title',
            quantity: Number(li.quantity) || 1,
            price: {
              amount: String(li.variant?.priceV2?.amount || li.variant?.price || '0.00'),
              currencyCode: String(li.variant?.priceV2?.currencyCode || 'USD'),
            },
            image: li.variant?.image
              ? {
                  url: li.variant.image.src || li.variant.image.url || '',
                  src: li.variant.image.src || li.variant.image.url || '',
                  altText: li.title,
                }
              : null,
            options: li.variant?.selectedOptions || [],
          }))
          if (parsed.id && !cartId) cartId = String(parsed.id)
          if ((parsed.webUrl || parsed.checkoutUrl) && !checkoutUrl) {
            checkoutUrl = String(parsed.webUrl || parsed.checkoutUrl)
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Retrieve cart ID and checkout URL
  try {
    const storedCartId = window.localStorage.getItem(STORAGE_KEYS.CART_ID)
    if (storedCartId) cartId = storedCartId

    const storedCheckout = window.localStorage.getItem(STORAGE_KEYS.CHECKOUT_URL)
    if (storedCheckout) checkoutUrl = storedCheckout
  } catch {
    // ignore
  }

  return { items, cartId, checkoutUrl }
}

/**
 * Persists cart items, cart ID, and checkout URL across all relevant localStorage keys
 * and synchronizes the legacy storefront-data-hooks storage format so all parts
 * of the app stay perfectly consistent across page refreshes.
 */
export function persistAllCartData(
  items: CartItem[],
  cartId: string | null,
  checkoutUrl: string | null
): void {
  if (typeof window === 'undefined') return

  try {
    // 1. Save to primary and fallback item keys
    if (items.length > 0) {
      window.localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items))
      window.localStorage.setItem(STORAGE_KEYS.ITEMS_FALLBACK, JSON.stringify(items))
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.ITEMS)
      window.localStorage.removeItem(STORAGE_KEYS.ITEMS_FALLBACK)
    }

    // 2. Save cartId
    if (cartId) {
      window.localStorage.setItem(STORAGE_KEYS.CART_ID, cartId)
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.CART_ID)
    }

    // 3. Save checkoutUrl
    if (checkoutUrl) {
      window.localStorage.setItem(STORAGE_KEYS.CHECKOUT_URL, checkoutUrl)
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.CHECKOUT_URL)
    }

    // 4. Synchronize legacy storefront-data-hooks storage format
    let subtotalNum = 0
    let currency = 'USD'
    const lineItems = items.map((it) => {
      const p = parseFloat(it.price?.amount || '0')
      if (!isNaN(p)) subtotalNum += p * it.quantity
      if (it.price?.currencyCode) currency = it.price.currencyCode
      return {
        id: it.lineId || it.id,
        title: it.title,
        quantity: it.quantity,
        variant: {
          id: it.variantId,
          title: it.variantTitle || 'Default Title',
          price: it.price?.amount || '0.00',
          priceV2: {
            amount: it.price?.amount || '0.00',
            currencyCode: it.price?.currencyCode || 'USD',
          },
          image: it.image
            ? {
                id: it.variantId,
                src: it.image.url || it.image.src || '',
                altText: it.title,
              }
            : null,
          product: {
            id: it.productId || '',
            handle: it.handle || '',
            title: it.title,
          },
          selectedOptions: it.options || [],
        },
      }
    })

    const legacyCart = {
      id: cartId || 'local-cart',
      webUrl: checkoutUrl || '',
      checkoutUrl: checkoutUrl || '',
      subtotalPrice: subtotalNum.toFixed(2),
      subtotalPriceV2: {
        amount: subtotalNum.toFixed(2),
        currencyCode: currency,
      },
      totalPrice: subtotalNum.toFixed(2),
      totalPriceV2: {
        amount: subtotalNum.toFixed(2),
        currencyCode: currency,
      },
      lineItems,
      completedAt: null,
    }

    window.localStorage.setItem(STORAGE_KEYS.LEGACY_CART, JSON.stringify(legacyCart))
  } catch (e) {
    console.warn('[CartContext] Failed to persist cart data to localStorage:', e)
  }
}

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

  const isLoadedRef = useRef<boolean>(false)
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const syncQueueRef = useRef<Promise<any>>(Promise.resolve())

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
    },
    []
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

      if (storedItems && Array.isArray(storedItems) && storedItems.length > 0) {
        setItems(storedItems)
      }
      if (storedCartId) {
        setCartId(storedCartId)
      }
      if (storedCheckout) {
        setCheckoutUrl(storedCheckout)
      }
    } catch (err) {
      console.warn('[CartContext] Failed to load initial cart from localStorage:', err)
    } finally {
      isLoadedRef.current = true
      setIsInitialized(true)
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
          setItems(freshItems)
        } catch {
          // ignore
        }
      }
      if (e.key === STORAGE_KEYS.CART_ID) {
        setCartId(e.newValue || null)
      }
      if (e.key === STORAGE_KEYS.CHECKOUT_URL) {
        setCheckoutUrl(e.newValue || null)
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

  /**
   * Syncs an array of line items with the Shopify Storefront Cart API.
   * If cartId is null or invalid, creates a new cart.
   */
  const syncWithStorefront = useCallback(
    async (currentItems: CartItem[], currentCartId: string | null) => {
      setIsSyncing(true)
      try {
        if (currentItems.length === 0) {
          return { cartId: currentCartId, checkoutUrl: null }
        }

        // Format lines for Storefront API
        const lines = currentItems.map((item) => ({
          merchandiseId: item.variantId,
          quantity: item.quantity,
        }))

        // If we don't have a cartId, create a new cart
        if (!currentCartId) {
          const createRes = await createStorefrontCart(lines)
          if (createRes.ok && createRes.data?.cartCreate?.cart) {
            const newCart = createRes.data.cartCreate.cart
            setCartId(newCart.id)
            setCheckoutUrl(newCart.checkoutUrl)

            // Map lineIds back onto items
            const lineEdges = newCart.lines?.edges || []
            setItems((prev) =>
              prev.map((it) => {
                const matched = lineEdges.find(
                  (edge: any) => edge.node?.merchandise?.id === it.variantId
                )
                return matched
                  ? { ...it, lineId: matched.node.id, id: matched.node.id }
                  : it
              })
            )
            return { cartId: newCart.id, checkoutUrl: newCart.checkoutUrl }
          }
        } else {
          // Verify or update existing cart
          const fetchRes = await fetchStorefrontCart(currentCartId)
          if (fetchRes.ok && fetchRes.data?.cart) {
            const cart = fetchRes.data.cart
            setCheckoutUrl(cart.checkoutUrl)
            return { cartId: currentCartId, checkoutUrl: cart.checkoutUrl }
          } else {
            // Cart might have expired or been completed; recreate it
            const createRes = await createStorefrontCart(lines)
            if (createRes.ok && createRes.data?.cartCreate?.cart) {
              const newCart = createRes.data.cartCreate.cart
              setCartId(newCart.id)
              setCheckoutUrl(newCart.checkoutUrl)
              return { cartId: newCart.id, checkoutUrl: newCart.checkoutUrl }
            }
          }
        }
      } catch (err: any) {
        console.warn('[CartContext] Background Storefront sync warning:', err)
      } finally {
        setIsSyncing(false)
      }
      return { cartId: currentCartId, checkoutUrl }
    },
    [checkoutUrl]
  )

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
        let updatedItemsList: CartItem[] = []

        // 1. Optimistically update local state immediately
        setItems((prev) => {
          const existingIndex = prev.findIndex((it) => it.variantId === variantId)

          if (existingIndex > -1) {
            // Increment existing item quantity
            const existing = prev[existingIndex]
            const updated: CartItem = {
              ...existing,
              quantity: existing.quantity + qtyToAdd,
              // Update with freshest metadata if provided
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
            updatedItemsList = next
            persistAllCartData(next, cartId, checkoutUrl)
            return next
          } else {
            // Add new line item
            const newItem: CartItem = {
              id: variantId,
              variantId,
              title: input.title || 'Product',
              handle: input.handle || '',
              variantTitle: input.variantTitle || 'Default Title',
              quantity: qtyToAdd,
              price: {
                amount: priceAmount,
                currencyCode: priceCurrency,
              },
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
            const next = [...prev, newItem]
            updatedItemsList = next
            persistAllCartData(next, cartId, checkoutUrl)
            return next
          }
        })

        // 2. Trigger notification
        triggerNotification({
          type: 'add',
          title: 'Added to Shopping Bag',
          message: `${input.title || 'Item'} (${qtyToAdd}x) has been added to your shopping bag.`,
          item: addedItemReference || undefined,
        })

        // 3. Queue Storefront API background synchronization
        syncQueueRef.current = syncQueueRef.current.then(async () => {
          try {
            if (!cartId) {
              const res = await createStorefrontCart([
                { merchandiseId: variantId, quantity: qtyToAdd },
              ])
              if (res.ok && res.data?.cartCreate?.cart) {
                const newCart = res.data.cartCreate.cart
                setCartId(newCart.id)
                setCheckoutUrl(newCart.checkoutUrl)

                const lineEdge = newCart.lines?.edges?.[0]?.node
                if (lineEdge) {
                  setItems((curr) =>
                    curr.map((it) =>
                      it.variantId === variantId
                        ? { ...it, lineId: lineEdge.id, id: lineEdge.id }
                        : it
                    )
                  )
                }
              }
            } else {
              const res = await addStorefrontCartLines(cartId, [
                { merchandiseId: variantId, quantity: qtyToAdd },
              ])
              if (res.ok && res.data?.cartLinesAdd?.cart) {
                setCheckoutUrl(res.data.cartLinesAdd.cart.checkoutUrl)
              } else {
                // If cart was stale, recreate with all items
                await syncWithStorefront(updatedItemsList, null)
              }
            }
          } catch (syncErr) {
            console.warn('[CartContext] Background sync notice:', syncErr)
          }
        })
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
    [cartId, syncWithStorefront, triggerNotification]
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
   * Updates the quantity of an item in the bag.
   */
  const updateQuantity = useCallback(
    async (variantOrLineId: string, nextQuantity: number) => {
      if (nextQuantity <= 0) {
        await removeItem(variantOrLineId)
        return
      }

      let updatedItem: CartItem | null = null
      let targetLineId: string | undefined

      // Optimistically update
      setItems((prev) => {
        const next = prev.map((it) => {
          if (it.variantId === variantOrLineId || it.id === variantOrLineId || it.lineId === variantOrLineId) {
            updatedItem = { ...it, quantity: nextQuantity }
            targetLineId = it.lineId
            return updatedItem
          }
          return it
        })
        persistAllCartData(next, cartId, checkoutUrl)
        return next
      })

      if (updatedItem) {
        triggerNotification({
          type: 'update',
          title: 'Shopping Bag Updated',
          message: `Quantity for ${(updatedItem as any).title} changed to ${nextQuantity}.`,
          item: updatedItem,
        })
      }

      // Background Storefront sync
      syncQueueRef.current = syncQueueRef.current.then(async () => {
        if (!cartId) return
        try {
          if (targetLineId) {
            await updateStorefrontCartLines(cartId, [
              { id: targetLineId, quantity: nextQuantity },
            ])
          }
        } catch (err) {
          console.warn('[CartContext] Failed to update line quantity on Shopify:', err)
        }
      })
    },
    [cartId, checkoutUrl, triggerNotification]
  )

  /**
   * Removes an item completely from the shopping bag.
   */
  const removeItem = useCallback(
    async (variantOrLineId: string) => {
      let removedItem: CartItem | null = null
      let targetLineId: string | undefined

      setItems((prev) => {
        const match = prev.find(
          (it) =>
            it.variantId === variantOrLineId ||
            it.id === variantOrLineId ||
            it.lineId === variantOrLineId
        )
        if (match) {
          removedItem = match
          targetLineId = match.lineId
        }
        const next = prev.filter(
          (it) =>
            it.variantId !== variantOrLineId &&
            it.id !== variantOrLineId &&
            it.lineId !== variantOrLineId
        )
        persistAllCartData(next, cartId, checkoutUrl)
        return next
      })

      if (removedItem) {
        triggerNotification({
          type: 'remove',
          title: 'Item Removed',
          message: `${(removedItem as any).title} was removed from your shopping bag.`,
          item: removedItem,
        })
      }

      // Background Storefront sync
      syncQueueRef.current = syncQueueRef.current.then(async () => {
        if (!cartId || !targetLineId) return
        try {
          await removeStorefrontCartLines(cartId, [targetLineId])
        } catch (err) {
          console.warn('[CartContext] Failed to remove line from Shopify:', err)
        }
      })
    },
    [cartId, checkoutUrl, triggerNotification]
  )

  /**
   * Clears all items from the shopping bag.
   */
  const clearCart = useCallback(async () => {
    setItems([])
    setCartId(null)
    setCheckoutUrl(null)
    persistAllCartData([], null, null)
    triggerNotification({
      type: 'clear',
      title: 'Shopping Bag Cleared',
      message: 'All items have been removed from your shopping bag.',
    })
  }, [triggerNotification])

  /**
   * Refreshes the cart from Shopify Storefront API
   */
  const refreshCart = useCallback(async () => {
    if (!cartId) return
    setIsSyncing(true)
    try {
      const res = await fetchStorefrontCart(cartId)
      if (res.ok && res.data?.cart) {
        const remoteCart = res.data.cart
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
          setItems(freshItems)
        }
      }
    } catch (err) {
      console.warn('[CartContext] refreshCart failed:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [cartId])

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

  const proceedToCheckout = useCallback(() => {
    if (checkoutUrl && typeof window !== 'undefined') {
      window.location.href = checkoutUrl
    }
  }, [checkoutUrl])

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
