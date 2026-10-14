/**
 * Regression tests for fix/cart-layout-a11y (Flow's cosmetic findings).
 */
const fs = require('fs')
const path = require('path')
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8')

describe('cart layout and accessibility', () => {
  test('cart drawers stack above the sticky header (z-40)', () => {
    expect(read('components/common/Sidebar.tsx')).toMatch(/zIndex:\s*60/)
    expect(read('components/CartDrawer.jsx')).toMatch(/z-\[60\]/)
  })

  test('cart views do not overflow horizontally', () => {
    const item = read('components/cart/CartItem/CartItem.tsx')
    expect(item).not.toMatch(/m:\s*12/)
    expect(item).toMatch(/minmax\(0, 1fr\)/)
    const view = read('components/cart/CartSidebarView/CartSidebarView.tsx')
    expect(view).toMatch(/overflowX:\s*'hidden'/)
    expect(view).not.toMatch(/paddingLeft:\s*5/)
    expect(read('components/common/Sidebar.tsx')).toMatch(/maxWidth:\s*'100vw'/)
  })

  test('cart lines have a labeled Remove button wired to CartContext', () => {
    const item = read('components/cart/CartItem/CartItem.tsx')
    expect(item).toMatch(/aria-label=\{`Remove \$\{item\.title\}`\}/)
    expect(item).toMatch(/onClick=\{handleRemove\}/)
    expect(item).toMatch(/Decrease quantity of/)
    expect(item).toMatch(/Increase quantity of/)
    expect(read('components/CartDrawer.jsx')).toMatch(/aria-label=\{`Remove \$\{item\.title\}`\}/)
  })

  test('cookie notice is a non-blocking bar below the drawers', () => {
    const bar = read('components/common/FeatureBar.tsx')
    expect(bar).not.toMatch(/CenterModal/)
    expect(bar).toMatch(/position:\s*'fixed'/)
    expect(bar).toMatch(/zIndex:\s*30/)
    // consent gating unchanged
    expect(read('components/common/Layout.tsx')).toMatch(/hide=\{Builder\.isEditing \? true : acceptedCookies\}/)
  })
})
