import React, { useState, useEffect } from 'react'
import ShopifyBuy from 'shopify-buy'
import { Context } from './Context'
import { LocalStorage, LocalStorageKeys } from './utils'
import { createCart, fetchCart } from './api/cartClient'
import { Cart } from './types'

export interface CommerceProviderProps extends ShopifyBuy.Config {
  children: React.ReactNode
}

export function CommerceProvider({
  storefrontAccessToken,
  domain,
  children,
}: CommerceProviderProps) {
  if (domain == null || storefrontAccessToken == null) {
    throw new Error(
      'Unable to build shopify client. Please make sure that your access token and domain are correct.'
    )
  }

  const initialCart = LocalStorage.getInitialCart()
  const [cart, setCart] = useState<Cart | null>(initialCart)

  const isCustomDomain = domain.includes('.')
  const fullDomain = isCustomDomain ? domain : `${domain}.myshopify.com`
  const cartConfig = { domain: fullDomain, storefrontAccessToken }

  const client = ShopifyBuy.buildClient({
    storefrontAccessToken,
    domain: fullDomain,
  })

  useEffect(() => {
    async function getNewCart() {
      const newCart = await createCart(cartConfig)
      setCart(newCart)
    }

    async function refreshExistingCart(cartId: string) {
      try {
        const refreshedCart = await fetchCart(cartConfig, cartId)

        if (refreshedCart == null) {
          return getNewCart()
        }

        setCart(refreshedCart)
      } catch (error) {
        console.error(error)
      }
    }

    if (cart == null) {
      getNewCart()
    } else {
      refreshExistingCart(String(cart.id))
    }
  }, [])

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
