import React, { useState, useEffect, useMemo, useRef } from 'react'
import ShopifyBuy from 'shopify-buy'
import { Context } from './Context'
import { LocalStorage, LocalStorageKeys } from './utils'
import {
  createStorefrontCart,
  fetchStorefrontCart,
  addStorefrontCartLines,
  updateStorefrontCartLines,
  removeStorefrontCartLines,
} from '../../../../services/shopify'

export interface CommerceProviderProps extends ShopifyBuy.Config {
  children: React.ReactNode
}

function formatStorefrontCartToBuyCart(sfCart: any): any {
  if (!sfCart) return null
  const lineEdges = sfCart.lines?.edges || []
  const lineItems = lineEdges.map((edge: any) => {
    const node = edge.node || {}
    const merch = node.merchandise || {}
    const prod = merch.product || {}
    const imgUrl = merch.image?.url || prod.featuredImage?.url || ''

    return {
      id: node.id,
      title: prod.title || merch.title || 'Product',
      quantity: node.quantity || 1,
      variant: {
        id: merch.id,
        title: merch.title || 'Default Title',
        price: merch.price?.amount || '0.00',
        priceV2: {
          amount: merch.price?.amount || '0.00',
          currencyCode: merch.price?.currencyCode || 'USD',
        },
        image: {
          id: merch.id,
          src: imgUrl,
          altText: merch.image?.altText || prod.title || '',
        },
        product: {
          id: prod.id,
          handle: prod.handle || '',
          title: prod.title || '',
        },
        selectedOptions: merch.selectedOptions || [],
      },
    }
  })

  return {
    id: sfCart.id,
    webUrl: sfCart.checkoutUrl,
    checkoutUrl: sfCart.checkoutUrl,
    subtotalPrice: sfCart.cost?.subtotalAmount?.amount || '0.00',
    subtotalPriceV2: sfCart.cost?.subtotalAmount,
    totalPrice:
      sfCart.cost?.totalAmount?.amount ||
      sfCart.cost?.subtotalAmount?.amount ||
      '0.00',
    totalPriceV2: sfCart.cost?.totalAmount,
    lineItems,
    completedAt: null,
  }
}

export function CommerceProvider({
  storefrontAccessToken,
  domain,
  children,
}: CommerceProviderProps) {
  const isConfigured = Boolean(domain && storefrontAccessToken)
  const initialCart = LocalStorage.getInitialCart()
  const [cart, setCart] = useState<ShopifyBuy.Cart | null>(initialCart)
  const isInitializingRef = useRef(false)

  const client = useMemo(() => {
    if (!isConfigured) return null

    // Modern Storefront API Cart Bridge
    const modernCheckout = {
      create: async (input?: any) => {
        const lines = (input?.lineItems || []).map((li: any) => ({
          merchandiseId: li.variantId,
          quantity: li.quantity || 1,
        }))
        const res = await createStorefrontCart(lines)
        if (res.ok && res.data?.cartCreate?.cart) {
          return formatStorefrontCartToBuyCart(res.data.cartCreate.cart)
        }
        return null
      },
      fetch: async (cartId: string) => {
        if (!cartId) return null
        const res = await fetchStorefrontCart(cartId)
        if (res.ok && res.data?.cart) {
          return formatStorefrontCartToBuyCart(res.data.cart)
        }
        return null
      },
      addLineItems: async (cartId: string, items: any[]) => {
        const lines = items.map((li: any) => ({
          merchandiseId: String(li.variantId),
          quantity: li.quantity || 1,
        }))
        const res = await addStorefrontCartLines(cartId, lines)
        if (res.ok && res.data?.cartLinesAdd?.cart) {
          return formatStorefrontCartToBuyCart(res.data.cartLinesAdd.cart)
        }
        // If cart is stale or expired, create fresh cart
        const fallbackRes = await createStorefrontCart(lines)
        if (fallbackRes.ok && fallbackRes.data?.cartCreate?.cart) {
          return formatStorefrontCartToBuyCart(fallbackRes.data.cartCreate.cart)
        }
        return cart
      },
      updateLineItems: async (cartId: string, items: any[]) => {
        const lines = items.map((li: any) => ({
          id: String(li.id),
          quantity: Number(li.quantity),
        }))
        const res = await updateStorefrontCartLines(cartId, lines)
        if (res.ok && res.data?.cartLinesUpdate?.cart) {
          return formatStorefrontCartToBuyCart(res.data.cartLinesUpdate.cart)
        }
        return cart
      },
      removeLineItems: async (cartId: string, lineItemIds: string[]) => {
        const res = await removeStorefrontCartLines(cartId, lineItemIds)
        if (res.ok && res.data?.cartLinesRemove?.cart) {
          return formatStorefrontCartToBuyCart(res.data.cartLinesRemove.cart)
        }
        return cart
      },
    }

    try {
      const isCustomDomain = domain ? domain.includes('.') : false
      const customFetch = (url: string, opts: any = {}) => {
        const headers = { ...opts.headers }
        if (storefrontAccessToken.startsWith('shpat_')) {
          headers['Shopify-Storefront-Private-Token'] = storefrontAccessToken
          delete headers['X-Shopify-Storefront-Access-Token']
        }
        return fetch(url, { ...opts, headers })
      }

      const jsClient = (ShopifyBuy.buildClient as any)(
        {
          storefrontAccessToken,
          domain: isCustomDomain ? domain : `${domain}.myshopify.com`,
        },
        customFetch
      )

      // Attach modern checkout adapter to client
      jsClient.checkout = modernCheckout
      return jsClient
    } catch (e) {
      console.warn('Failed to build Shopify client:', e)
      return { checkout: modernCheckout } as any
    }
  }, [domain, storefrontAccessToken, isConfigured, cart])

  useEffect(() => {
    if (!client) return
    if (isInitializingRef.current) return
    isInitializingRef.current = true

    async function getNewCart() {
      try {
        const newCart = await client.checkout.create()
        if (newCart) {
          setCart(newCart)
        }
      } catch (error) {
        console.warn('Failed to create shopify cart:', error)
      }
    }

    async function refreshExistingCart(cartId: string) {
      try {
        const refreshedCart = await client.checkout.fetch(cartId)
        if (refreshedCart == null) {
          return getNewCart()
        }
        setCart(refreshedCart)
      } catch (error) {
        console.warn('Failed to refresh shopify cart:', error)
      }
    }

    if (cart == null) {
      getNewCart()
    } else {
      refreshExistingCart(String(cart.id))
    }
    // Intentionally run once on mount using whatever `cart` was loaded from
    // LocalStorage at that time — this effect itself calls setCart(), so
    // including `cart` in the deps would re-trigger it on every refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client])

  useEffect(() => {
    if (cart) {
      LocalStorage.set(LocalStorageKeys.CART, JSON.stringify(cart))
    }
  }, [cart])

  return (
    <Context.Provider
      value={{
        client,
        cart,
        setCart,
        domain,
        storefrontAccessToken,
      }}
    >
      {children}
    </Context.Provider>
  )
}
