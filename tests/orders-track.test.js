const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

/** /api/orders/track: real Admin lookup only, no demo orders. */
const repoRoot = path.resolve(__dirname, '..')
const routeUrl = pathToFileURL(path.join(repoRoot, 'pages/api/orders/track.ts')).href

const ADMIN_ENV = {
  SHOPIFY_STORE_DOMAIN: 'test-shop.myshopify.com',
  NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: '',
  SHOPIFY_CLIENT_ID: 'cid',
  SHOPIFY_CLIENT_SECRET: 'csecret',
  SHOPIFY_ADMIN_ACCESS_TOKEN: '',
}
const NO_ADMIN_ENV = { ...ADMIN_ENV, SHOPIFY_STORE_DOMAIN: '', SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '' }

const ORDER_NODE = {
  id: 'gid://shopify/Order/555',
  name: '#1042',
  email: 'Customer@Example.com',
  createdAt: '2026-10-01T17:00:00Z',
  cancelledAt: null,
  displayFinancialStatus: 'PAID',
  displayFulfillmentStatus: 'FULFILLED',
  currentSubtotalPriceSet: { shopMoney: { amount: '89.99', currencyCode: 'USD' } },
  totalShippingPriceSet: { shopMoney: { amount: '0.0', currencyCode: 'USD' } },
  currentTotalTaxSet: { shopMoney: { amount: '8.10', currencyCode: 'USD' } },
  currentTotalPriceSet: { shopMoney: { amount: '98.09', currencyCode: 'USD' } },
  shippingLine: { title: 'USPS Priority' },
  shippingAddress: { name: 'Pat Doe', address1: '1 Main St', address2: null, city: 'Spokane', province: 'Washington', zip: '99201', country: 'United States' },
  lineItems: { nodes: [{ id: 'gid://shopify/LineItem/1', title: 'iPhone 13 Screen Repair', variantTitle: null, sku: 'IP13-SCR', quantity: 1, originalUnitPriceSet: { shopMoney: { amount: '89.99', currencyCode: 'USD' } } }] },
  fulfillments: [{ status: 'SUCCESS', displayStatus: 'IN_TRANSIT', createdAt: '2026-10-02T18:00:00Z', inTransitAt: '2026-10-02T20:00:00Z', deliveredAt: null, estimatedDeliveryAt: '2026-10-05T19:00:00Z', trackingInfo: [{ company: 'USPS', number: '9400100000000000000000', url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000000' }] }],
}

function call({ method = 'POST', body, env = ADMIN_ENV, nodes = [ORDER_NODE] }) {
  const script = `
    const graphqlCalls = []
    globalThis.fetch = async (url, init) => {
      url = String(url)
      if (url.endsWith('/admin/oauth/access_token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok', expires_in: 86399 }) }
      }
      graphqlCalls.push(JSON.parse(init.body))
      return { ok: true, status: 200, json: async () => ({ data: { orders: { nodes: ${JSON.stringify(nodes)} } } }) }
    }
    const origError = console.error
    console.error = () => {}
    const { default: handler } = await import(${JSON.stringify(routeUrl)})
    let statusCode = 0, json = null
    const headers = {}
    const res = {
      setHeader: (k, v) => { headers[k.toLowerCase()] = v },
      status: (c) => { statusCode = c; return { json: (d) => { json = d } } },
    }
    await handler({ method: ${JSON.stringify(method)}, body: ${JSON.stringify(body)}, query: {}, headers: {} }, res)
    console.error = origError
    console.log(JSON.stringify({ statusCode, json, headers, graphqlCalls }))
  `
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test', ...env },
  })
  return JSON.parse(out.trim())
}

describe('/api/orders/track (real Shopify Admin lookup, no demo data)', () => {
  test('405 for GET (emails stay out of URLs)', () => {
    const r = call({ method: 'GET', body: {} })
    expect(r.statusCode).toBe(405)
    expect(r.headers.allow).toBe('POST')
  })

  test('400 for missing or invalid input', () => {
    expect(call({ body: { email: 'a@b.co' } }).statusCode).toBe(400)
    expect(call({ body: { orderId: '1042' } }).statusCode).toBe(400)
    expect(call({ body: { orderId: '10 42; drop', email: 'a@b.co' } }).statusCode).toBe(400)
    expect(call({ body: { orderId: '1042', email: 'not-an-email' } }).statusCode).toBe(400)
  })

  test('503 with a clear message when Shopify Admin is not configured (no fake order)', () => {
    const r = call({ body: { orderId: '#1042', email: 'customer@example.com' }, env: NO_ADMIN_ENV })
    expect(r.statusCode).toBe(503)
    expect(r.json.success).toBe(false)
    expect(r.json.order).toBeUndefined()
    expect(r.json.error).toMatch(/temporarily unavailable/i)
    expect(r.graphqlCalls).toHaveLength(0)
  })

  test('404 when the email does not match the order', () => {
    const r = call({ body: { orderId: '#1042', email: 'someone-else@example.com' } })
    expect(r.statusCode).toBe(404)
    expect(r.json.success).toBe(false)
    expect(r.json.order).toBeUndefined()
  })

  test('404 when no order has that number', () => {
    const r = call({ body: { orderId: '9999', email: 'customer@example.com' }, nodes: [] })
    expect(r.statusCode).toBe(404)
  })

  test('200 with real order data when number + email match (case-insensitive)', () => {
    const r = call({ body: { orderId: '#1042', email: ' customer@EXAMPLE.com ' } })
    expect(r.statusCode).toBe(200)
    expect(r.headers['cache-control']).toBe('no-store')
    expect(r.graphqlCalls[0].variables.query).toBe('name:#1042 OR name:1042')
    const o = r.json.order
    expect(o.orderNumber).toBe('#1042')
    expect(o.isDemo).toBe(false)
    expect(o.status).toBe('shipped')
    expect(o.carrier.name).toBe('USPS')
    expect(o.carrier.trackingNumber).toBe('9400100000000000000000')
    expect(o.shippingAddress.city).toBe('Spokane')
    expect(o.total).toBe('98.09')
    expect(o.items[0].title).toBe('iPhone 13 Screen Repair')
    expect(o.items[0].image).toBeUndefined()
    const serialized = JSON.stringify(r.json)
    expect(serialized).not.toMatch(/unsplash|Portland/i)
  })

  test('Accepts a text/plain JSON string body (ElevenLabs agent tool posts without Content-Type)', () => {
    const r = call({ body: JSON.stringify({ orderId: '1042', email: 'customer@example.com' }) })
    expect(r.statusCode).toBe(200)
    expect(r.json.order.orderNumber).toBe('#1042')
  })

  test('Unshipped order shows honest placeholders, not invented carrier/tracking/delivery data', () => {
    const unshipped = { ...ORDER_NODE, displayFulfillmentStatus: 'UNFULFILLED', fulfillments: [] }
    const r = call({ body: { orderId: '1042', email: 'customer@example.com' }, nodes: [unshipped] })
    expect(r.statusCode).toBe(200)
    const o = r.json.order
    expect(o.status).toBe('confirmed')
    expect(o.carrier.name).toBe('Not shipped yet')
    expect(o.carrier.trackingUrl).toBe('#')
    expect(o.estimatedDeliveryDate).toBe('Not available yet')
  })
})
