const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

/**
 * Client-credentials Admin token cache (lib/shopify/admin-token.ts) and the
 * Admin GraphQL client's 401 refresh (services/shopify-admin.ts).
 * Runs each scenario in a fresh Node process (native TS strip-types) with a
 * mocked fetch; no network access.
 */
const repoRoot = path.resolve(__dirname, '..')
const tokenUrl = pathToFileURL(path.join(repoRoot, 'lib/shopify/admin-token.ts')).href
const adminUrl = pathToFileURL(path.join(repoRoot, 'services/shopify-admin.ts')).href

const BASE_ENV = {
  SHOPIFY_STORE_DOMAIN: 'test-shop.myshopify.com',
  NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: '',
  SHOPIFY_CLIENT_ID: 'cid_test',
  SHOPIFY_CLIENT_SECRET: 'csecret_test_DO_NOT_LOG',
  SHOPIFY_ADMIN_ACCESS_TOKEN: '',
  SHOPIFY_ADMIN_API_VERSION: '',
}

function run(body, env = {}) {
  const script = `
    const logs = []
    for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
      console[level] = (...args) => logs.push(args.map((a) => (a instanceof Error ? a.stack || a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
    }
    const emit = (obj) => process.stdout.write('__RESULT__' + JSON.stringify({ ...obj, logs }) + '\\n')
    const tokenModule = await import(${JSON.stringify(tokenUrl)})
    const adminModule = await import(${JSON.stringify(adminUrl)})
    const tokenCalls = []
    const graphqlCalls = []
    let tokenCounter = 0
    let tokenResponse = (n) => ({ ok: true, status: 200, json: async () => ({ access_token: 'shpat_secret_token_' + n, scope: 'read_orders', expires_in: 86399 }) })
    let graphqlResponse = () => ({ ok: true, status: 200, json: async () => ({ data: { shop: { name: 'Test' } } }) })
    globalThis.fetch = async (url, init) => {
      url = String(url)
      if (url.endsWith('/admin/oauth/access_token')) {
        tokenCounter += 1
        tokenCalls.push({ url, body: init.body, headers: init.headers })
        return tokenResponse(tokenCounter)
      }
      graphqlCalls.push({ url, token: init.headers['X-Shopify-Access-Token'] })
      return graphqlResponse(graphqlCalls.length, init.headers['X-Shopify-Access-Token'])
    }
    ${body}
  `
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test', ...BASE_ENV, ...env },
  })
  const line = out.split('\n').find((l) => l.startsWith('__RESULT__'))
  return JSON.parse(line.slice('__RESULT__'.length))
}

describe('Shopify Admin client-credentials token cache', () => {
  test('POSTs the client credentials grant to the shop token endpoint and caches the token', () => {
    const r = run(`
      const a = await tokenModule.getShopifyAdminAccessToken()
      const b = await tokenModule.getShopifyAdminAccessToken()
      emit({ a, b, tokenCalls })
    `)
    expect(r.a).toBe('shpat_secret_token_1')
    expect(r.b).toBe('shpat_secret_token_1')
    expect(r.tokenCalls).toHaveLength(1)
    expect(r.tokenCalls[0].url).toBe('https://test-shop.myshopify.com/admin/oauth/access_token')
    expect(r.tokenCalls[0].headers['Content-Type']).toBe('application/x-www-form-urlencoded')
    const params = new URLSearchParams(r.tokenCalls[0].body)
    expect(params.get('grant_type')).toBe('client_credentials')
    expect(params.get('client_id')).toBe('cid_test')
    expect(params.get('client_secret')).toBe('csecret_test_DO_NOT_LOG')
  })

  test('Refreshes shortly before expires_in, not after', () => {
    const r = run(`
      let clock = 1_000_000
      const now = () => clock
      tokenResponse = (n) => ({ ok: true, status: 200, json: async () => ({ access_token: 'tok_' + n, expires_in: 86399 }) })
      const first = await tokenModule.getShopifyAdminAccessToken({ now })
      clock += (86399 - 6 * 60) * 1000 // 6 min before expiry: still cached
      const stillCached = await tokenModule.getShopifyAdminAccessToken({ now })
      clock += 2 * 60 * 1000 // 4 min before expiry: inside the 5 min refresh margin
      const refreshed = await tokenModule.getShopifyAdminAccessToken({ now })
      emit({ first, stillCached, refreshed, count: tokenCalls.length, margin: tokenModule.TOKEN_REFRESH_MARGIN_MS })
    `)
    expect(r.margin).toBe(5 * 60 * 1000)
    expect(r.first).toBe('tok_1')
    expect(r.stillCached).toBe('tok_1')
    expect(r.refreshed).toBe('tok_2')
    expect(r.count).toBe(2)
  })

  test('Concurrent callers share one in-flight token request', () => {
    const r = run(`
      const tokens = await Promise.all([1, 2, 3, 4].map(() => tokenModule.getShopifyAdminAccessToken()))
      emit({ tokens, count: tokenCalls.length })
    `)
    expect(new Set(r.tokens).size).toBe(1)
    expect(r.count).toBe(1)
  })

  test('invalidate / forceRefresh fetch a new token', () => {
    const r = run(`
      const a = await tokenModule.getShopifyAdminAccessToken()
      tokenModule.invalidateShopifyAdminAccessToken()
      const b = await tokenModule.getShopifyAdminAccessToken()
      const c = await tokenModule.getShopifyAdminAccessToken({ forceRefresh: true })
      emit({ a, b, c })
    `)
    expect([r.a, r.b, r.c]).toEqual(['shpat_secret_token_1', 'shpat_secret_token_2', 'shpat_secret_token_3'])
  })

  test('Short store handle is normalized to the myshopify domain', () => {
    const r = run(
      `
      await tokenModule.getShopifyAdminAccessToken()
      emit({ url: tokenCalls[0].url, domain: tokenModule.getAdminShopDomain() })
    `,
      { SHOPIFY_STORE_DOMAIN: 'https://DisplayCellPros/' }
    )
    expect(r.domain).toBe('displaycellpros.myshopify.com')
    expect(r.url).toBe('https://displaycellpros.myshopify.com/admin/oauth/access_token')
  })

  test('SHOPIFY_ADMIN_ACCESS_TOKEN acts as a static override (no token request)', () => {
    const r = run(
      `
      const t = await tokenModule.getShopifyAdminAccessToken()
      const res = await adminModule.shopifyAdminFetch({ query: '{ shop { name } }' })
      emit({ isOverride: t === process.env.SHOPIFY_ADMIN_ACCESS_TOKEN, tokenCalls: tokenCalls.length, usedOverride: graphqlCalls[0].token === process.env.SHOPIFY_ADMIN_ACCESS_TOKEN, data: res.data })
    `,
      { SHOPIFY_ADMIN_ACCESS_TOKEN: 'shpat_static_override', SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '' }
    )
    expect(r.isOverride).toBe(true)
    expect(r.usedOverride).toBe(true)
    expect(r.tokenCalls).toBe(0)
    expect(r.data).toEqual({ shop: { name: 'Test' } })
  })

  test('Missing credentials => not configured (typed error / notConfigured result), no network', () => {
    const r = run(
      `
      let errorName = null
      try { await tokenModule.getShopifyAdminAccessToken() } catch (e) { errorName = e.name }
      const res = await adminModule.shopifyAdminFetch({ query: '{ shop { name } }' })
      emit({ errorName, configured: adminModule.isShopifyAdminConfigured(), res, calls: tokenCalls.length + graphqlCalls.length })
    `,
      { SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '' }
    )
    expect(r.errorName).toBe('ShopifyAdminNotConfiguredError')
    expect(r.configured).toBe(false)
    expect(r.res.notConfigured).toBe(true)
    expect(r.calls).toBe(0)
  })

  test('Token endpoint failure surfaces Shopify error code without secrets', () => {
    const r = run(`
      tokenResponse = () => ({ ok: false, status: 400, json: async () => ({ error: 'shop_not_permitted', error_description: 'Client credentials cannot be performed on this shop.' }) })
      const res = await adminModule.shopifyAdminFetch({ query: '{ shop { name } }' })
      emit({ res })
    `)
    expect(r.res.errors[0].message).toContain('HTTP 400')
    expect(r.res.errors[0].message).toContain('shop_not_permitted')
    expect(JSON.stringify(r.res)).not.toContain('csecret_test_DO_NOT_LOG')
  })
})

describe('Shopify Admin GraphQL client (services/shopify-admin.ts)', () => {
  test('Sends the cached token as X-Shopify-Access-Token to the versioned GraphQL endpoint', () => {
    const r = run(`
      await adminModule.shopifyAdminFetch({ query: '{ shop { name } }' })
      await adminModule.shopifyAdminFetch({ query: '{ shop { name } }' })
      emit({ graphqlCalls, tokenCount: tokenCalls.length })
    `)
    expect(r.tokenCount).toBe(1)
    expect(r.graphqlCalls).toHaveLength(2)
    expect(r.graphqlCalls[0].url).toBe('https://test-shop.myshopify.com/admin/api/2026-01/graphql.json')
    expect(r.graphqlCalls[0].token).toBe('shpat_secret_token_1')
  })

  test('On 401 drops the cached token, fetches a new one and retries once', () => {
    const r = run(`
      graphqlResponse = (n, token) =>
        token === 'shpat_secret_token_1'
          ? { ok: false, status: 401, json: async () => ({ errors: '[API] Invalid API key or access token' }) }
          : { ok: true, status: 200, json: async () => ({ data: { ok: true } }) }
      const res = await adminModule.shopifyAdminFetch({ query: '{ shop { name } }' })
      emit({ res, tokens: graphqlCalls.map((c) => c.token), tokenCount: tokenCalls.length })
    `)
    expect(r.res.data).toEqual({ ok: true })
    expect(r.res.status).toBe(200)
    expect(r.tokens).toEqual(['shpat_secret_token_1', 'shpat_secret_token_2'])
    expect(r.tokenCount).toBe(2)
  })

  test('Persistent 401 returns an error after a single retry (no loop)', () => {
    const r = run(`
      graphqlResponse = () => ({ ok: false, status: 401, json: async () => ({ errors: 'Unauthorized' }) })
      const res = await adminModule.shopifyAdminFetch({ query: '{ shop { name } }' })
      emit({ res, graphqlCount: graphqlCalls.length })
    `)
    expect(r.graphqlCount).toBe(2)
    expect(r.res.status).toBe(401)
    expect(r.res.errors[0].message).toContain('HTTP 401')
  })

  test('Never logs the access token or client secret, even on failures', () => {
    const r = run(`
      graphqlResponse = () => ({ ok: false, status: 401, json: async () => ({ errors: 'Unauthorized' }) })
      await adminModule.shopifyAdminFetch({ query: '{ shop { name } }' })
      tokenResponse = () => ({ ok: false, status: 500, json: async () => ({ error: 'server_error' }) })
      tokenModule.invalidateShopifyAdminAccessToken()
      const failed = await adminModule.shopifyAdminFetch({ query: '{ shop { name } }' })
      emit({ failed })
    `)
    const everything = JSON.stringify(r.logs) + JSON.stringify(r.failed)
    expect(everything).not.toMatch(/shpat_secret_token_/)
    expect(everything).not.toContain('csecret_test_DO_NOT_LOG')
  })
})
