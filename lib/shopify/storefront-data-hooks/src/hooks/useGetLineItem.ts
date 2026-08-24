import { useCartItems } from './useCartItems'

export function useGetLineItem() {
  const cartItems = useCartItems()

  function getLineItem(variantId: string | number): ShopifyBuy.LineItem | null {
    if (cartItems.length < 1) {
      return null
    }

    const item = cartItems.find((cartItem) => {
      // @ts-ignore
      return cartItem.variant.id === variantId
    })

    if (item == null) {
      return null
    }

    return item
  }

  return getLineItem
}
