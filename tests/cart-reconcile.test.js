/**
 * PR #50 follow-up: header count (A) and stale checkout cart (B).
 */
const fs = require('fs')
const path = require('path')
const ts = require('typescript')
function loadTs(rel) {
  const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', out)(m, m.exports, require)
  return m.exports
}
const { diffCartLines, reconcileCart } = loadTs('lib/cart-reconcile.ts')

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8')
const node = (id, variant, quantity) => ({ node: { id, quantity, merchandise: { id: variant } } })
const cartOf = (id, lines) => ({ id, checkoutUrl: `https://checkout.example/${id}?n=${lines.length}`, lines: { edges: lines } })

function fakeApi(carts) {
  let n = 0
  const calls = []
  const linesOf = (id) => carts[id].lines.edges
  const set = (id, edges) => { carts[id] = cartOf(id, edges); return carts[id] }
  return {
    calls,
    carts,
    fetchCart: async (id) => { calls.push(['fetch', id]); return carts[id] ? { ok: true, data: { cart: carts[id] } } : { ok: true, data: { cart: null } } },
    createCart: async (lines) => { calls.push(['create', lines]); const id = `new${++n}`; const c = set(id, lines.map((l, i) => node(`${id}-l${i}`, l.merchandiseId, l.quantity))); return { ok: true, data: { cartCreate: { cart: c } } } },
    addLines: async (id, lines) => { calls.push(['add', id, lines]); const c = set(id, [...linesOf(id), ...lines.map((l, i) => node(`${id}-a${i}`, l.merchandiseId, l.quantity))]); return { ok: true, data: { cartLinesAdd: { cart: c } } } },
    updateLines: async (id, lines) => { calls.push(['update', id, lines]); const c = set(id, linesOf(id).map((e) => { const u = lines.find((l) => l.id === e.node.id); return u ? node(e.node.id, e.node.merchandise.id, u.quantity) : e })); return { ok: true, data: { cartLinesUpdate: { cart: c } } } },
    removeLines: async (id, ids) => { calls.push(['remove', id, ids]); const c = set(id, linesOf(id).filter((e) => !ids.includes(e.node.id))); return { ok: true, data: { cartLinesRemove: { cart: c } } } },
  }
}

describe('diffCartLines', () => {
  test('removes lines the shopper removed and fixes quantities', () => {
    const d = diffCartLines(
      [{ id: 'L1', variantId: 'battery', quantity: 2 }, { id: 'L2', variantId: 'trip', quantity: 1 }],
      [{ variantId: 'battery', quantity: 1 }]
    )
    expect(d).toEqual({ add: [], update: [{ id: 'L1', quantity: 1 }], remove: ['L2'] })
  })
  test('collapses duplicate lines for one variant', () => {
    const d = diffCartLines(
      [{ id: 'A', variantId: 'v', quantity: 1 }, { id: 'B', variantId: 'v', quantity: 1 }],
      [{ variantId: 'v', quantity: 1 }]
    )
    expect(d.remove).toEqual(['B'])
    expect(d.update).toEqual([])
  })
})

describe('reconcileCart (B: checkout never uses a stale cart)', () => {
  test('re-add after emptying: old cart with Trip Fee is not used for checkout', async () => {
    const api = fakeApi({ old: cartOf('old', [node('L1', 'battery', 1), node('L2', 'trip', 1)]) })
    // shopper empties the bag
    const emptied = await reconcileCart(api, 'old', [])
    expect(emptied).toEqual({ cartId: null, checkoutUrl: null, cart: null })
    expect(api.carts.old.lines.edges).toHaveLength(0)
    // re-adds only the battery
    const r = await reconcileCart(api, emptied.cartId, [{ variantId: 'battery', quantity: 1 }])
    expect(r.cartId).not.toBe('old')
    expect(api.carts[r.cartId].lines.edges.map((e) => e.node.merchandise.id)).toEqual(['battery'])
    expect(r.checkoutUrl).toContain(r.cartId)
  })

  test('remove of a line with no mapped lineId still hits the Shopify cart', async () => {
    const api = fakeApi({ c: cartOf('c', [node('L1', 'battery', 1), node('L2', 'trip', 1)]) })
    const r = await reconcileCart(api, 'c', [{ variantId: 'battery', quantity: 1 }])
    expect(r.cartId).toBe('c')
    expect(api.carts.c.lines.edges.map((e) => e.node.merchandise.id)).toEqual(['battery'])
  })

  test('expired cart id creates a fresh cart with exactly the desired lines', async () => {
    const api = fakeApi({})
    const r = await reconcileCart(api, 'gone', [{ variantId: 'v', quantity: 3 }])
    expect(api.carts[r.cartId].lines.edges[0].node.quantity).toBe(3)
  })

  test('serialized rapid adds into a new cart create only one cart', async () => {
    const api = fakeApi({})
    let cartId = null
    let q = Promise.resolve()
    const desired = []
    for (const v of ['a', 'b', 'c']) {
      desired.push({ variantId: v, quantity: 1 })
      q = q.then(async () => { cartId = (await reconcileCart(api, cartId, desired.slice())).cartId })
    }
    await q
    expect(api.calls.filter((c) => c[0] === 'create')).toHaveLength(1)
    expect(api.carts[cartId].lines.edges).toHaveLength(3)
  })
})

describe('source wiring', () => {
  test('A: header count reads CartContext only, never the legacy cart', () => {
    const src = read('components/common/Navbar.tsx')
    expect(src).not.toMatch(/storefront-data-hooks/)
    expect(src).not.toMatch(/lineItems/)
    expect(src).toMatch(/modernCart\?\.totalQuantity \|\| 0/)
  })
  test('B: drawer and /cart checkout go through proceedToCheckout, not a cached href', () => {
    for (const f of ['components/CartDrawer.jsx', 'components/cart/CartSidebarView/CartSidebarView.tsx']) {
      const src = read(f)
      expect(src).toMatch(/proceedToCheckout/)
      expect(src).not.toMatch(/href=\{checkoutUrl/)
    }
  })
  test('B: CartContext checkout awaits a reconcile and uses its checkoutUrl', () => {
    const src = read('context/CartContext.tsx')
    expect(src).toMatch(/const url = await enqueueReconcile\(\)/)
    expect(src).not.toMatch(/window\.location\.href = checkoutUrl/)
  })
})

describe('legacy storage (B: stale ids cannot resurface)', () => {
  test('legacy shopify_local_store__cart is ignored and cleared', () => {
    const { loadStoredCartItems, CART_STORAGE_KEYS } = loadTs('lib/cart-storage.ts')
    const ls = window.localStorage
    ls.clear()
    ls.setItem(CART_STORAGE_KEYS.LEGACY_CART, JSON.stringify({ id: 'hWNHxN2cOpT0Kcq7ubeWzYwS', webUrl: 'https://old', lineItems: [{ id: 'x', quantity: 1, variant: { id: 'trip' } }] }))
    ls.setItem(CART_STORAGE_KEYS.CART_ID, 'orphan')
    const r = loadStoredCartItems()
    expect(r).toEqual({ items: [], cartId: null, checkoutUrl: null })
    expect(ls.getItem(CART_STORAGE_KEYS.LEGACY_CART)).toBeNull()
  })
})
