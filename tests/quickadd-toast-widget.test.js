/**
 * Regression tests for fix/quickadd-toast-widget-overlap.
 */
const fs = require('fs')
const path = require('path')
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8')

describe('quick add shows exactly one toast', () => {
  test('CartContext.addItem is the single source of the add toast', () => {
    const ctx = read('context/CartContext.tsx')
    expect(ctx).toMatch(/type: 'add'/)
    expect(ctx).toMatch(/showCartToast\(/)
  })

  test.each(['components/products/ProductCard.tsx', 'components/products/ProductGrid.tsx'])(
    '%s does not show its own cart toast after cart.addItem',
    (file) => {
      const src = read(file)
      expect(src).toMatch(/cart\.addItem\(/)
      expect(src).not.toMatch(/showCartToast/)
    }
  )

  test('only one ToastContainer is mounted', () => {
    const layout = read('components/common/Layout.tsx')
    expect(layout.match(/<ToastContainer\b/g)).toHaveLength(1)
  })
})

describe('floating voice widget yields to the cart drawers', () => {
  const wrapper = read('components/voice/FloatingVoiceAgentWrapper.tsx')

  test('hides while the sidebar or cart drawer is open', () => {
    expect(wrapper).toMatch(/displaySidebar/)
    expect(wrapper).toMatch(/cart\?\.isOpen/)
    expect(wrapper).toMatch(/'cart-drawer:state'/)
    expect(wrapper).toMatch(/hidden=\{cartDrawerOpen\}/)
    expect(wrapper).toMatch(/removeEventListener\('cart-drawer:state'/)
  })

  test('does not use throwing hooks, so it still renders outside providers', () => {
    expect(wrapper).not.toMatch(/useUI\(\)/)
    expect(wrapper).not.toMatch(/useCart\(\)/)
  })

  test('CartDrawer broadcasts its open state', () => {
    expect(read('components/CartDrawer.jsx')).toMatch(
      /new CustomEvent\("cart-drawer:state", \{ detail: \{ open: isOpen \} \}\)/
    )
  })
})
