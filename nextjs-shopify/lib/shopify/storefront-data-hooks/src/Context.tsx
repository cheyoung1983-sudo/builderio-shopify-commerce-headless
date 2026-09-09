import React from 'react'
import ShopifyBuy from 'shopify-buy'
import { Cart } from './types'

interface ContextShape {
  client: ShopifyBuy.Client | null
  cart: Cart | null
  setCart: React.Dispatch<React.SetStateAction<Cart | null>>
  domain: string
  storefrontAccessToken: string
}

export const Context = React.createContext<ContextShape>({
  client: null,
  cart: null,
  domain: '',
  storefrontAccessToken: '',
  setCart: () => {
    throw Error('You forgot to wrap this in a Provider object')
  },
})
