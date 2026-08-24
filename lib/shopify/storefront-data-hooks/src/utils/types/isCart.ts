import ShopifyBuy from 'shopify-buy'

export function isCart(potentialCart: any): potentialCart is ShopifyBuy.Cart {
  return (
    potentialCart != null &&
    potentialCart.id != null &&
    potentialCart.webUrl != null &&
    potentialCart.lineItems != null &&
    potentialCart.type != null &&
    potentialCart.type.name === 'Checkout' &&
    potentialCart.type.kind === 'OBJECT'
  )
}
