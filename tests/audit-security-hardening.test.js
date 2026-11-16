/**
 * @jest-environment node
 */
/**
 * Security hardening from the Nov 15, 2026 store audit:
 *  - internal APIs (/api/admin/*, /api/tribal/certificate, /api/wholesale/*, unused
 *    Persona/Firestore helpers) fail closed behind the admin password in proxy.ts
 *  - /api/search/suggest never reflects unescaped input into its HTML response
 *  - public nav does not link to /admin tools
 */
const fs = require('node:fs')
const path = require('node:path')
const { NextRequest } = require('next/server')

const repoRoot = path.resolve(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8')

const INTERNAL_PATHS = [
  '/api/admin/slack-notifications/settings',
  '/api/admin/slack-notifications/queue',
  '/api/tribal/certificate',
  '/api/wholesale/sync',
  '/api/wholesale/simulate-order',
  '/api/wholesale/webhook',
  '/api/persona/inquiry',
  '/api/auth/sync-persona',
]

describe('proxy.ts admin guard covers internal APIs', () => {
  const { proxy, config } = require('../proxy')
  const ORIGINAL = { ...process.env }
  afterEach(() => {
    process.env = { ...ORIGINAL }
  })

  test.each(INTERNAL_PATHS)('%s fails closed (503) when admin credentials are not configured', (p) => {
    delete process.env.ADMIN_USERNAME
    delete process.env.ADMIN_PASSWORD
    const res = proxy(new NextRequest(`https://www.displaycellpros.com${p}`))
    expect(res.status).toBe(503)
  })

  test.each(INTERNAL_PATHS)('%s returns 401 without credentials', (p) => {
    process.env.ADMIN_USERNAME = 'admin-user'
    process.env.ADMIN_PASSWORD = 'admin-pass-for-tests'
    const res = proxy(new NextRequest(`https://www.displaycellpros.com${p}`, { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  test('valid Basic credentials pass through', () => {
    process.env.ADMIN_USERNAME = 'admin-user'
    process.env.ADMIN_PASSWORD = 'admin-pass-for-tests'
    const auth = 'Basic ' + Buffer.from('admin-user:admin-pass-for-tests').toString('base64')
    const res = proxy(
      new NextRequest('https://www.displaycellpros.com/api/admin/slack-notifications/settings', {
        headers: { authorization: auth },
      })
    )
    expect(res.status).toBe(200)
  })

  test('customer APIs are not caught by the admin guard', () => {
    delete process.env.ADMIN_USERNAME
    delete process.env.ADMIN_PASSWORD
    for (const p of ['/api/tribal/verify', '/api/search/suggest', '/api/agent/token', '/api/repair-requests']) {
      const res = proxy(new NextRequest(`https://www.displaycellpros.com${p}`))
      expect(res.status).toBe(200)
    }
  })

  test('matcher lists every internal API prefix so the proxy actually runs on them', () => {
    for (const m of ['/api/admin/:path*', '/api/tribal/certificate', '/api/wholesale/:path*', '/api/persona/inquiry', '/api/auth/sync-persona']) {
      expect(config.matcher).toContain(m)
    }
  })
})

describe('/api/search/suggest HTML output is escaped', () => {
  const mod = require('../pages/api/search/suggest')
  const handler = mod.default

  const run = (query) =>
    new Promise((resolve) => {
      const res = {
        headers: {},
        statusCode: 200,
        setHeader(k, v) {
          this.headers[k.toLowerCase()] = v
        },
        status(c) {
          this.statusCode = c
          return this
        },
        json(b) {
          resolve({ status: this.statusCode, body: b })
          return this
        },
        send(b) {
          resolve({ status: this.statusCode, body: b, headers: this.headers })
          return this
        },
        end() {
          resolve({ status: this.statusCode })
          return this
        },
      }
      Promise.resolve(handler({ method: 'GET', query, headers: {}, socket: { remoteAddress: '127.0.0.1' } }, res)).catch(
        (e) => resolve({ status: 500, error: e })
      )
    })

  test('escapeHtml escapes markup characters', () => {
    expect(mod.escapeHtml('<b a="1">\'&')).toBe('&lt;b a=&quot;1&quot;&gt;&#39;&amp;')
  })

  test('rejects a section_id that is not a plain slug', async () => {
    const out = await run({ q: 'screen', section_id: '<b>x</b>' })
    expect(out.status).toBe(400)
  })

  test('never reflects raw markup from the search terms', async () => {
    const out = await run({ q: '<img src=x onerror=alert(1)>', section_id: 'predictive-search' })
    expect(out.status).toBe(200)
    expect(String(out.body)).not.toContain('<img src=x')
    expect(String(out.body)).toContain('&lt;img src=x')
  })
})

describe('agent voice endpoints', () => {
  test('signed-url requires an allowed Origin and uses the shared rate limit', () => {
    const src = read('pages/api/agent/signed-url.ts')
    expect(src).not.toMatch(/if \(req\.headers\.origin && !isAllowedOrigin/)
    expect(src).toMatch(/checkRateLimit\(`agent-signed-url:/)
  })
  test('token uses the shared rate limit', () => {
    expect(read('pages/api/agent/token.ts')).toMatch(/checkRateLimit\(`agent-token:/)
  })
})

describe('public navigation', () => {
  test('does not link to admin tools', () => {
    const nav = read('components/common/Navbar.tsx')
    expect(nav).not.toMatch(/href="\/admin/)
  })
})

describe('public write endpoints use the shared rate limiter', () => {
  test.each([
    ['pages/api/repair-requests/index.ts', 'repair-request'],
    ['pages/api/newsletter/subscribe.ts', 'newsletter'],
    ['pages/api/services/request.ts', 'service-request'],
    ['pages/api/agent/cart.ts', 'agent-cart'],
  ])('%s', (file, key) => {
    const src = read(file)
    expect(src).toMatch(new RegExp('checkRateLimit\\(`' + key + ':'))
    expect(src).toMatch(/status\(429\)/)
  })

  test('observability log checks its limiter once per request', () => {
    const src = read('pages/api/observability/log.ts')
    expect(src.match(/rateLimiter\.check\(/g)).toHaveLength(1)
  })
})
