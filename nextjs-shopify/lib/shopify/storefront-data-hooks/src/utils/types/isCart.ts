import { Cart } from '../../types'

export function isCart(potentialCart: any): potentialCart is Cart {
  return (
    potentialCart != null &&
    potentialCart.id != null &&
    potentialCart.webUrl != null &&
    Array.isArray(potentialCart.lineItems)
  )
}
