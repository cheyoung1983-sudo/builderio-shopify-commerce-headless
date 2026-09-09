import ShopifyBuy from 'shopify-buy'

export function isCart(potentialCart: any): potentialCart is ShopifyBuy.Cart {
  return (
    potentialCart != null &&
    potentialCart.id != null &&
    (potentialCart.webUrl != null || potentialCart.checkoutUrl != null) &&
    potentialCart.lineItems != null &&
    Array.isArray(potentialCart.lineItems)
  )
}
