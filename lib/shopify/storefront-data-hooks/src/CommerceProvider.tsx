import React, { useState, useEffect, useMemo } from 'react'
import ShopifyBuy from 'shopify-buy'
import { Context } from './Context'
import { LocalStorage, LocalStorageKeys } from './utils'

export interface CommerceProviderProps extends ShopifyBuy.Config {
  children: React.ReactNode
}

export function CommerceProvider({
  storefrontAccessToken,
  domain,
  children,
}: CommerceProviderProps) {
  const isConfigured = Boolean(domain && storefrontAccessToken)
  const initialCart = LocalStorage.getInitialCart()
  const [cart, setCart] = useState<ShopifyBuy.Cart | null>(initialCart)

  const isCustomDomain = domain ? domain.includes('.') : false

  const client = useMemo(() => {
    if (!isConfigured) {
      return null
    }

    try {
      return ShopifyBuy.buildClient({
        storefrontAccessToken,
        domain: isCustomDomain ? domain : `${domain}.myshopify.com`,
      })
    } catch (error) {
      console.warn('Failed to build Shopify client:', error)
      return null
    }
  }, [domain, isConfigured, isCustomDomain, storefrontAccessToken])

  useEffect(() => {
    if (!client) return
    const shopifyClient = client

    async function getNewCart() {
      try {
        const newCart = await shopifyClient.checkout.create()
        setCart(newCart)
      } catch (error) {
        console.warn('Failed to create shopify cart:', error)
      }
    }

    async function refreshExistingCart(cartId: string) {
      try {
        const refreshedCart = await shopifyClient.checkout.fetch(cartId)

        if (refreshedCart == null) {
          return getNewCart()
        }

        const cartHasBeenPurchased = Boolean(refreshedCart.completedAt)

        if (cartHasBeenPurchased) {
          getNewCart()
        } else {
          setCart(refreshedCart)
        }
      } catch (error) {
        console.warn('Failed to refresh shopify cart:', error)
      }
    }

    if (cart == null) {
      getNewCart()
    } else {
      refreshExistingCart(String(cart.id))
    }
  }, [client])

  useEffect(() => {
    LocalStorage.set(LocalStorageKeys.CART, JSON.stringify(cart))
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
