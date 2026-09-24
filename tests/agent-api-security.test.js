const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..')
const routePaths = {
  search: path.join(repoRoot, 'pages', 'api', 'agent', 'search.ts'),
  content: path.join(repoRoot, 'pages', 'api', 'agent', 'content.ts'),
}

function runRoute(routeName, requests, options = {}) {
  const shopifyMock = `
    globalThis.__calls = []
    export async function searchStorefrontProducts(query, requestOptions) {
      globalThis.__calls.push({ name: 'search', query, options: requestOptions })
      if (globalThis.__throwShopify) throw new Error('private Shopify details')
      if (globalThis.__structuredShopifyFailure) {
        return { ok: false, errors: [{ message: 'private Shopify details' }], products: [] }
      }
      return { ok: true, products: [] }
    }
    export async function fetchAllAvailableProducts(requestOptions) {
      globalThis.__calls.push({ name: 'all', options: requestOptions })
      if (globalThis.__throwShopify) throw new Error('private Shopify details')
      if (globalThis.__structuredShopifyFailure) {
        return { ok: false, errors: [{ message: 'private Shopify details' }], products: [] }
      }
      return { ok: true, products: [] }
    }
    export function isShopifyConfigured() {
      return true
    }
  `
  const builderMock = "export default { apiKey: 'test-builder-key' }"
  const loaderSource = `
    const shopifyUrl = ${JSON.stringify(`data:text/javascript,${encodeURIComponent(shopifyMock)}`)}
    const builderUrl = ${JSON.stringify(`data:text/javascript,${encodeURIComponent(builderMock)}`)}
    export async function resolve(specifier, context, nextResolve) {
      if (specifier.endsWith('/services/shopify')) return { url: shopifyUrl, shortCircuit: true }
      if (specifier.endsWith('/config/builder')) return { url: builderUrl, shortCircuit: true }
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) {
        try { return await nextResolve(specifier + '.ts', context, nextResolve) } catch {}
        try { return await nextResolve(specifier + '/index.ts', context, nextResolve) } catch {}
      }
      return nextResolve(specifier, context, nextResolve)
    }
  `
  const script = `
    globalThis.__calls = []
    const route = await import(${JSON.stringify(pathToFileURL(routePaths[routeName]).href)})
    globalThis.__throwShopify = ${Boolean(options.throwShopify)}
    globalThis.__structuredShopifyFailure = ${Boolean(options.structuredShopifyFailure)}
    globalThis.fetch = async () => ${options.fetchError
      ? "({ ok: false, status: 500 })"
      : "({ ok: true, async json() { return { results: [] } } })"}

    const responses = []
    for (const requestInput of ${JSON.stringify(requests)}) {
      const request = {
        method: 'POST',
        headers: { origin: 'https://displaycellpros.com' },
        body: {},
        query: {},
        socket: { remoteAddress: '198.51.100.10' },
        ...requestInput,
      }
      const headers = {}
      const response = {
        headers,
        statusCode: 200,
        setHeader(name, value) { headers[name] = value },
        getHeader(name) { return headers[name] },
        status(code) { this.statusCode = code; return this },
        json(body) { this.body = body; return this },
        end() { this.ended = true; return this },
      }
      await route.default(request, response)
      responses.push({
        statusCode: response.statusCode,
        headers: response.headers,
        body: response.body,
        ended: response.ended,
      })
    }
    console.log(JSON.stringify({ responses, calls: globalThis.__calls }))
  `
  const output = execFileSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--experimental-loader',
      `data:text/javascript,${encodeURIComponent(loaderSource)}`,
      '--input-type=module',
      '-e',
      script,
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: options.nodeEnv || 'test',
        NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --no-warnings`.trim(),
      },
      stdio: ['ignore', 'pipe', 'ignore'],
    }
  )

  return JSON.parse(output.trim())
}

describe('public agent API security', () => {
  test('search rejects unapproved origins without CORS access', () => {
    const result = runRoute('search', [{
      headers: { origin: 'https://attacker.test' },
      body: { query: 'x'.repeat(500), first: 999 },
    }])

    expect(result.responses[0].statusCode).toBe(403)
    expect(result.responses[0].headers['Access-Control-Allow-Origin']).toBeUndefined()
    expect(result.calls).toHaveLength(0)
  })

  test('search bounds first and preserves successful response fields', () => {
    const result = runRoute('search', [{ body: { query: 'phone', first: 999 } }])
    const response = result.responses[0]

    expect(response.statusCode).toBe(200)
    expect(result.calls[0].options.maxProducts).toBe(25)
    expect(response.body).toEqual({
      ok: true,
      query: 'phone',
      count: 0,
      shopifyConfigured: true,
      products: [],
    })
  })

  test('search rejects oversized and malformed input before Shopify calls', () => {
    const result = runRoute('search', [{ body: { query: 'x'.repeat(201) } }])
    expect(result.responses[0].statusCode).toBe(400)
    expect(result.calls).toHaveLength(0)

    const malformed = runRoute('search', [{ body: { query: { value: 'phone' } } }])
    expect(malformed.responses[0].statusCode).toBe(400)
    expect(malformed.calls).toHaveLength(0)

    const invalidFirst = runRoute('search', [{ body: { first: 'not-an-integer' } }])
    expect(invalidFirst.responses[0].statusCode).toBe(400)
    expect(invalidFirst.calls).toHaveLength(0)
  })

  test('content applies approved preflight without fetching Builder content', () => {
    const result = runRoute('content', [{
      method: 'OPTIONS',
      headers: {
        origin: 'https://www.displaycellpros.com',
        'access-control-request-method': 'POST',
      },
    }])

    expect(result.responses[0].statusCode).toBe(204)
    expect(result.responses[0].headers['Access-Control-Allow-Origin']).toBe(
      'https://www.displaycellpros.com'
    )
    expect(result.calls).toHaveLength(0)
  })

  test('content preserves successful response fields', () => {
    const result = runRoute('content', [{ body: { model: 'page', query: 'phone' } }])

    expect(result.responses[0].statusCode).toBe(200)
    expect(result.responses[0].body).toEqual({
      ok: true,
      model: 'page',
      count: 0,
      results: [],
    })
  })

  test('content rejects unapproved preflight origins', () => {
    const result = runRoute('content', [{
      method: 'OPTIONS',
      headers: {
        origin: 'https://displaycellpros.com.attacker.test',
        'access-control-request-method': 'POST',
      },
    }])

    expect(result.responses[0].statusCode).toBe(403)
    expect(result.responses[0].headers['Access-Control-Allow-Origin']).toBeUndefined()
  })

  test('content rejects oversized model and query values', () => {
    const modelResult = runRoute('content', [{ body: { model: 'x'.repeat(101) } }])
    expect(modelResult.responses[0].statusCode).toBe(400)
    expect(modelResult.calls).toHaveLength(0)

    const queryResult = runRoute('content', [{ body: { query: 'x'.repeat(121) } }])
    expect(queryResult.responses[0].statusCode).toBe(400)
    expect(queryResult.calls).toHaveLength(0)
  })

  test('localhost origins are development-only', () => {
    const development = runRoute('search', [{
      headers: { origin: 'http://localhost:3000' },
      body: { query: 'phone' },
    }], { nodeEnv: 'development' })
    expect(development.responses[0].statusCode).toBe(200)

    const production = runRoute('search', [{
      headers: { origin: 'http://localhost:3000' },
      body: { query: 'phone' },
    }], { nodeEnv: 'production' })
    expect(production.responses[0].statusCode).toBe(403)
  })

  test('rate limits one client before upstream calls without double-counting', () => {
    const result = runRoute(
      'search',
      Array.from({ length: 31 }, () => ({ body: { query: 'phone' } }))
    )
    const throttled = result.responses.filter(({ statusCode }) => statusCode === 429)

    expect(throttled).toHaveLength(1)
    expect(throttled[0].headers['Retry-After']).toMatch(/^\d+$/)
    expect(result.calls).toHaveLength(30)
  })

  test('rate limits on the socket address despite spoofed forwarded headers', () => {
    for (const routeName of ['search', 'content']) {
      const result = runRoute(
        routeName,
        Array.from({ length: 31 }, (_, index) => ({
          headers: {
            origin: 'https://displaycellpros.com',
            'x-forwarded-for': `203.0.113.${index + 1}`,
          },
          body: routeName === 'search' ? { query: 'phone' } : { model: 'page' },
        }))
      )
      const throttled = result.responses.filter(({ statusCode }) => statusCode === 429)

      expect(throttled).toHaveLength(1)
    }
  })

  test('returns stable failure for structured Shopify errors', () => {
    const search = runRoute(
      'search',
      [{ body: { query: 'phone' } }, { body: {} }],
      { structuredShopifyFailure: true }
    )

    expect(search.responses).toHaveLength(2)
    for (const response of search.responses) {
      expect(response.statusCode).toBe(502)
      expect(response.body).toEqual({ ok: false, error: 'Failed to search products', products: [] })
    }
  })

  test('routes expose stable upstream error messages', () => {
    const search = runRoute('search', [{ body: { query: 'phone' } }], { throwShopify: true })
    expect(search.responses[0].statusCode).toBe(502)
    expect(search.responses[0].body).toEqual({ ok: false, error: 'Failed to search products', products: [] })

    const content = runRoute('content', [{ body: { model: 'page' } }], { fetchError: true })
    expect(content.responses[0].statusCode).toBe(502)
    expect(content.responses[0].body).toEqual({ ok: false, error: 'Failed to fetch Builder content', results: [] })
  })
})
