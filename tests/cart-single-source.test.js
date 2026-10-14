/**
 * Regression tests for fix/cart-double-add-sync.
 *
 * Root cause: the product page added each item to BOTH the modern CartContext
 * and the legacy storefront-data-hooks cart. The legacy cart boots from the
 * `shopify_local_store__cart` key that CartContext writes (same Shopify cart
 * id), so one click sent two cartLinesAdd calls to the same Shopify cart
 * (quantity 2 at checkout and on /cart), while the drawer showed 1. /cart also
 * preferred the legacy cart, whose remove used a variant id as a line id and
 * silently failed, so the page did not empty until reload.
 */
const fs = require('fs')
const path = require('path')

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8')

describe('cart has a single source of truth (CartContext)', () => {
  test('ProductDetail adds to cart once, through CartContext only', () => {
    const src = read('components/products/ProductDetail.tsx')
    expect(src).not.toMatch(/useAddItemToCart/)
    expect(src).not.toMatch(/addItemToCart\(/)
    expect((src.match(/cart\.addItem\(/g) || []).length).toBe(1)
  })

  test('ProductView block uses CartContext, not legacy add hook', () => {
    const src = read('blocks/ProductView/ProductView.tsx')
    expect(src).not.toMatch(/useAddItemToCart/)
    expect(src).toMatch(/from '..\/..\/context\/CartContext'/)
  })

  test('CartItem mutates only CartContext', () => {
    const src = read('components/cart/CartItem/CartItem.tsx')
    expect(src).not.toMatch(/useUpdateItemQuantity|useRemoveItemFromCart/)
    expect(src).toMatch(/modernCart\.updateQuantity\(/)
    expect(src).toMatch(/modernCart\.removeItem\(/)
  })

  test('/cart view reads items from CartContext, same as the drawer', () => {
    const src = read('components/cart/CartSidebarView/CartSidebarView.tsx')
    expect(src).not.toMatch(/storefront-data-hooks/)
    expect(src).not.toMatch(/cart\?\.lineItems/)
    expect(src).toMatch(/const items = modernLineItems/)
  })
})
