/**
 * Shared cart storage contract for the modern CartContext implementation and the
 * legacy storefront-data-hooks bridge.
 *
 * Keep these values centralized to avoid duplicate cart schemas drifting apart.
 */
export const CART_STORAGE_KEYS = {
  ITEMS: 'shopify_bag_items_v2',
  ITEMS_FALLBACK: 'shopify_cart_items',
  CART_ID: 'shopify_bag_cart_id_v2',
  CHECKOUT_URL: 'shopify_bag_checkout_url_v2',
  LEGACY_CART: 'shopify_local_store__cart',
} as const

export const LEGACY_CART_STORAGE_KEY = CART_STORAGE_KEYS.LEGACY_CART

export type CartStorageItem = {
  id: string
  lineId?: string
  variantId: string
  productId?: string
  title: string
  handle?: string
  variantTitle?: string
  quantity: number
  price?: {
    amount: string
    currencyCode: string
  }
  compareAtPrice?: {
    amount: string
    currencyCode: string
  } | null
  image?: {
    url: string
    src?: string
    altText?: string | null
    width?: number | null
    height?: number | null
  } | null
  options?: Array<{ name: string; value: string }>
  vendor?: string
  sku?: string
  customAttributes?: Array<{ key: string; value: string }>
}

/**
 * Loads stored cart items and identifiers from localStorage across primary,
 * fallback, and legacy storefront-data-hooks keys.
 */
export function loadStoredCartItems(): {
  items: CartStorageItem[]
  cartId: string | null
  checkoutUrl: string | null
} {
  if (typeof window === 'undefined') {
    return { items: [], cartId: null, checkoutUrl: null }
  }

  let items: CartStorageItem[] = []
  let cartId: string | null = null
  let checkoutUrl: string | null = null

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEYS.ITEMS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        items = parsed
      }
    }
  } catch (e) {
    console.warn(`[CartContext] Failed to parse primary cart items from localStorage:`, e)
  }

  if (items.length === 0) {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEYS.ITEMS_FALLBACK)
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

  if (items.length === 0) {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEYS.LEGACY_CART)
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

  try {
    const storedCartId = window.localStorage.getItem(CART_STORAGE_KEYS.CART_ID)
    if (storedCartId) cartId = storedCartId
    const storedCheckout = window.localStorage.getItem(CART_STORAGE_KEYS.CHECKOUT_URL)
    if (storedCheckout) checkoutUrl = storedCheckout
  } catch {
    // ignore
  }

  return { items, cartId, checkoutUrl }
}

/**
 * Persists cart items, cart ID, and checkout URL across all relevant localStorage keys
 * and synchronizes the legacy storefront-data-hooks storage format so all parts of the
 * app stay consistent across refreshes.
 */
export function persistAllCartData(
  items: CartStorageItem[],
  cartId: string | null,
  checkoutUrl: string | null
): void {
  if (typeof window === 'undefined') return

  try {
    if (items.length > 0) {
      window.localStorage.setItem(CART_STORAGE_KEYS.ITEMS, JSON.stringify(items))
      window.localStorage.setItem(CART_STORAGE_KEYS.ITEMS_FALLBACK, JSON.stringify(items))
    } else {
      window.localStorage.removeItem(CART_STORAGE_KEYS.ITEMS)
      window.localStorage.removeItem(CART_STORAGE_KEYS.ITEMS_FALLBACK)
    }

    if (cartId) {
      window.localStorage.setItem(CART_STORAGE_KEYS.CART_ID, cartId)
    } else {
      window.localStorage.removeItem(CART_STORAGE_KEYS.CART_ID)
    }

    if (checkoutUrl) {
      window.localStorage.setItem(CART_STORAGE_KEYS.CHECKOUT_URL, checkoutUrl)
    } else {
      window.localStorage.removeItem(CART_STORAGE_KEYS.CHECKOUT_URL)
    }

    if (items.length === 0) {
      window.localStorage.removeItem(CART_STORAGE_KEYS.LEGACY_CART)
      return
    }

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

    window.localStorage.setItem(CART_STORAGE_KEYS.LEGACY_CART, JSON.stringify(legacyCart))
  } catch (e) {
    console.warn('[CartContext] Failed to persist cart data to localStorage:', e)
  }
}
