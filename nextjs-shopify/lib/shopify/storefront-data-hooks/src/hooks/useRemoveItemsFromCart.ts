import { useContext } from 'react'
import { Context } from '../Context'
import { useGetLineItem } from './useGetLineItem'
import { removeLinesFromCart } from '../api/cartClient'

export function useRemoveItemsFromCart() {
  const { cart, setCart, domain, storefrontAccessToken } = useContext(Context)
  const getLineItem = useGetLineItem()

  async function removeItemsFromCart(variantIds: string[]) {
    if (cart == null) {
      throw new Error('Called removeItemsFromCart too soon')
    }

    if (variantIds.length < 1) {
      throw new Error('Must include at least one item to remove')
    }

    const lineItemIds = variantIds.map((variantId) => {
      const lineItem = getLineItem(variantId)
      if (lineItem === null) {
        throw new Error(
          `Could not find line item in cart with variant id: ${variantId}`
        )
      }
      return String(lineItem.id)
    })

    const newCart = await removeLinesFromCart(
      { domain, storefrontAccessToken },
      cart.id,
      lineItemIds
    )
    setCart(newCart)
  }

  return removeItemsFromCart
}
