import { useCartItems } from './useCartItems'
import { CartLineItem } from '../types'

export function useGetLineItem() {
  const cartItems = useCartItems()

  function getLineItem(variantId: string | number): CartLineItem | null {
    if (cartItems.length < 1) {
      return null
    }

    const item = cartItems.find((cartItem) => {
      return String(cartItem.variant.id) === String(variantId)
    })

    if (item == null) {
      return null
    }

    return item
  }

  return getLineItem
}
