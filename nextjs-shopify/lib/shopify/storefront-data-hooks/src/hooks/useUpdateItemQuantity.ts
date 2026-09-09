import { useContext } from 'react'
import { Context } from '../Context'

import { useGetLineItem } from './useGetLineItem'
import { updateLinesInCart } from '../api/cartClient'

export function useUpdateItemQuantity() {
  const { cart, setCart, domain, storefrontAccessToken } = useContext(Context)
  const getLineItem = useGetLineItem()

  async function updateItemQuantity(
    variantId: string | number,
    quantity: number
  ) {
    if (variantId == null) {
      throw new Error('Must provide a variant id')
    }

    if (quantity == null || Number(quantity) < 0) {
      throw new Error('Quantity must be greater than 0')
    }

    if (cart == null) {
      throw new Error('Called updateItemQuantity too soon')
    }

    const lineItem = getLineItem(variantId)
    if (lineItem == null) {
      throw new Error(`Item with variantId ${variantId} not in cart`)
    }

    const newCart = await updateLinesInCart(
      { domain, storefrontAccessToken },
      cart.id,
      [{ id: String(lineItem.id), quantity }]
    )
    setCart(newCart)
  }

  return updateItemQuantity
}
