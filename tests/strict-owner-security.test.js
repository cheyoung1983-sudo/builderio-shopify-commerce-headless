/**
 * @jest-environment node
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { NextRequest } = require('next/server')
const { createFirebaseJwtMock } = require('./helpers/firebase-jwt-mock')

const repoRoot = path.resolve(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8')
const url = (rel) => pathToFileURL(path.join(repoRoot, rel)).href

const jwtMock = createFirebaseJwtMock('dcpllcrev4')
const OWNER_PERSONAL_TOKEN = jwtMock.signIdToken({ email: 'cheyoung1983@gmail.com', email_verified: true })
const OWNER_BUSINESS_TOKEN = jwtMock.signIdToken({ email: 'ryan@displaycellpros.com', email_verified: true })
const UNVERIFIED_PERSONAL_TOKEN = jwtMock.signIdToken({ email: 'cheyoung1983@gmail.com', email_verified: false })
const OUTSIDER_TOKEN = jwtMock.signIdToken({ email: 'staff@displaycellpros.com', email_verified: true })
const EXPIRED_OWNER_TOKEN = jwtMock.signIdToken({ email: 'ryan@displaycellpros.com', email_verified: true, expiresInSeconds: -60 })

function runEsm(scriptBody, env = {}) {
  const script = `
    const realFetch = globalThis.fetch
    globalThis.fetch = async (u, init) => {
      if (String(u).includes('securetoken@system.gserviceaccount.com')) {
        return new Response(JSON.stringify(${JSON.stringify(jwtMock.certsPayload)}), {
          status: 200,
          headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' },
        })
      }
      return realFetch(u, init)
    }
    ${scriptBody}
  `
  const out = execFileSync(process.execPath, ['--experimental-transform-types', '--no-warnings', '--input-type=module', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test', ...env },
  })
  return JSON.parse(out.trim().split('\n').pop())
}

describe('Strict Two-Email Owner Security Hardening', () => {
  describe('lib/tribal/admin-auth.ts allowlist & RS256 verification', () => {
    test('permits only cheyoung1983@gmail.com and ryan@displaycellpros.com (case/whitespace normalized)', () => {
      const result = runEsm(`
        const auth = await import(${JSON.stringify(url('lib/tribal/admin-auth.ts'))})
        console.log(JSON.stringify({
          allowlist: auth.OWNER_EMAIL_ALLOWLIST,
          personalLower: auth.isAdminEmail('cheyoung1983@gmail.com'),
          personalUpper: auth.isAdminEmail('  CHEYOUNG1983@GMAIL.COM  '),
          businessLower: auth.isAdminEmail('ryan@displaycellpros.com'),
          businessMixed: auth.isAdminEmail('Ryan@DisplayCellPros.com'),
          sameDomainOther: auth.isAdminEmail('support@displaycellpros.com'),
          lookalikeGmail: auth.isAdminEmail('cheyoung1983@googlemail.com'),
          empty: auth.isAdminEmail(''),
          nullish: auth.isAdminEmail(null),
        }))
      `)

      expect(result.allowlist).toEqual(['cheyoung1983@gmail.com', 'ryan@displaycellpros.com'])
      expect(result.personalLower).toBe(true)
      expect(result.personalUpper).toBe(true)
      expect(result.businessLower).toBe(true)
      expect(result.businessMixed).toBe(true)
      expect(result.sameDomainOther).toBe(false)
      expect(result.lookalikeGmail).toBe(false)
      expect(result.empty).toBe(false)
      expect(result.nullish).toBe(false)
    })

    test('cryptographically verifies RS256 Firebase ID tokens and rejects unverified, expired, tampered, or non-allowlisted tokens', () => {
      const tampered = OWNER_BUSINESS_TOKEN.slice(0, -4) + 'AAAA'
      const result = runEsm(`
        const auth = await import(${JSON.stringify(url('lib/tribal/admin-auth.ts'))})
        const mkReq = (authorization, extraHeaders = {}) => ({
          headers: { ...(authorization ? { authorization } : {}), ...extraHeaders },
          query: { adminEmail: 'ryan@displaycellpros.com' },
        })
        console.log(JSON.stringify({
          personal: await auth.getAdminEmailFromRequest(mkReq('Bearer ' + ${JSON.stringify(OWNER_PERSONAL_TOKEN)})),
          business: await auth.getAdminEmailFromRequest(mkReq('Bearer ' + ${JSON.stringify(OWNER_BUSINESS_TOKEN)})),
          unverified: await auth.getAdminEmailFromRequest(mkReq('Bearer ' + ${JSON.stringify(UNVERIFIED_PERSONAL_TOKEN)})),
          outsider: await auth.getAdminEmailFromRequest(mkReq('Bearer ' + ${JSON.stringify(OUTSIDER_TOKEN)})),
          expired: await auth.getAdminEmailFromRequest(mkReq('Bearer ' + ${JSON.stringify(EXPIRED_OWNER_TOKEN)})),
          tampered: await auth.getAdminEmailFromRequest(mkReq('Bearer ' + ${JSON.stringify(tampered)})),
          rawString: await auth.getAdminEmailFromRequest(mkReq('Bearer not-a-jwt-just-string')),
          spoofHeaders: await auth.getAdminEmailFromRequest(mkReq(null, {
            'x-user-email': 'ryan@displaycellpros.com',
            'x-admin-email': 'cheyoung1983@gmail.com',
            'x-staff-preview': 'true',
            'x-api-key': 'pk_test_123',
          })),
        }))
      `, { AUTH0_DOMAIN: '', AUTH0_CLIENT_ID: '', AUTH0_SECRET: '' })

      expect(result.personal).toBe('cheyoung1983@gmail.com')
      expect(result.business).toBe('ryan@displaycellpros.com')
      expect(result.unverified).toBeNull()
      expect(result.outsider).toBeNull()
      expect(result.expired).toBeNull()
      expect(result.tampered).toBeNull()
      expect(result.rawString).toBeNull()
      expect(result.spoofHeaders).toBeNull()
    })
  })

  describe('proxy.ts covers all Admin, WGP, and Compliance paths', () => {
    const { proxy, config } = require('../proxy')
    const ORIGINAL = { ...process.env }

    afterEach(() => {
      process.env = { ...ORIGINAL }
    })

    const STRICT_OWNER_PATHS = [
      '/admin',
      '/admin/tribal-audit',
      '/admin/wholesale-integration',
      '/wholesale',
      '/compliance',
      '/api/v1/wholesale/products',
      '/api/v1/wholesale/orders',
      '/api/wholesale/sync',
      '/api/wholesale/simulate-order',
      '/api/wholesale/webhook',
      '/api/persona/audit-logs',
      '/api/persona/simulate',
      '/api/persona/transaction',
      '/api/persona/mcp-query',
      '/api/mcp/integrations',
      '/api/config',
      '/api/health',
    ]

    test.each(STRICT_OWNER_PATHS)('%s fails closed (503 unconfigured, 401 unauthorized, 200 valid Basic Auth)', (p) => {
      delete process.env.ADMIN_USERNAME
      delete process.env.ADMIN_PASSWORD
      expect(proxy(new NextRequest(`https://www.displaycellpros.com${p}`)).status).toBe(503)

      process.env.ADMIN_USERNAME = 'owner'
      process.env.ADMIN_PASSWORD = 'strong-test-password'
      expect(proxy(new NextRequest(`https://www.displaycellpros.com${p}`)).status).toBe(401)

      const auth = 'Basic ' + Buffer.from('owner:strong-test-password').toString('base64')
      const ok = proxy(new NextRequest(`https://www.displaycellpros.com${p}`, { headers: { authorization: auth } }))
      expect(ok.status).toBe(200)
      expect(ok.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive')
    })

    test('matcher includes /wholesale, /compliance, /api/v1/wholesale, and persona admin routes', () => {
      for (const m of ['/wholesale', '/wholesale/:path*', '/compliance', '/compliance/:path*', '/api/v1/wholesale', '/api/v1/wholesale/:path*', '/api/persona/audit-logs', '/api/persona/simulate', '/api/persona/transaction']) {
        expect(config.matcher).toContain(m)
      }
    })
  })

  describe('Protected server APIs fail closed on unauthenticated & non-owner requests', () => {
    const { Readable } = require('node:stream')
    const PROTECTED_ROUTES = [
      ['pages/api/persona/audit-logs.ts', 'GET'],
      ['pages/api/persona/simulate.ts', 'POST'],
      ['pages/api/persona/transaction.ts', 'POST'],
      ['pages/api/persona/inquiry.ts', 'POST'],
      ['pages/api/persona/mcp-query.ts', 'POST'],
      ['pages/api/mcp/integrations.ts', 'GET'],
      ['pages/api/admin/slack-notifications/settings.ts', 'GET'],
      ['pages/api/admin/slack-notifications/queue.ts', 'GET'],
      ['pages/api/auth/sync-persona.ts', 'POST'],
      ['pages/api/wholesale/sync.ts', 'POST'],
      ['pages/api/wholesale/simulate-order.ts', 'POST'],
      ['pages/api/wholesale/webhook.ts', 'POST'],
    ]

    let originalFetch
    beforeAll(() => {
      originalFetch = global.fetch
      global.fetch = async (u, init) => {
        if (String(u).includes('securetoken@system.gserviceaccount.com')) {
          return {
            ok: true,
            headers: { get: () => 'public, max-age=3600' },
            json: async () => jwtMock.certsPayload,
          }
        }
        return originalFetch ? originalFetch(u, init) : { ok: false, status: 500, json: async () => ({}) }
      }
    })

    afterAll(() => {
      if (originalFetch) {
        global.fetch = originalFetch
      }
    })

    test.each(PROTECTED_ROUTES)('%s (%s) rejects unauthenticated, spoofed, and non-owner callers', async (routeFile, method) => {
      const handler = require(path.join(repoRoot, routeFile)).default
      const invoke = async (headers = {}) => {
        const req = Readable.from(method === 'POST' ? [Buffer.from('{}')] : [])
        req.method = method
        req.url = '/'
        req.headers = { 'content-type': 'application/json', ...headers }
        req.query = {}
        req.body = {}
        req.socket = { remoteAddress: '127.0.0.1' }
        const res = {
          statusCode: 200,
          headers: {},
          body: undefined,
          setHeader(k, v) {
            this.headers[k.toLowerCase()] = v
            return this
          },
          status(c) {
            this.statusCode = c
            return this
          },
          json(b) {
            this.body = b
            return this
          },
          send(b) {
            this.body = b
            return this
          },
          end(b) {
            if (b !== undefined) this.body = b
            return this
          },
        }
        await handler(req, res)
        return { statusCode: res.statusCode, cacheControl: res.headers['cache-control'] || '' }
      }

      const unauth = await invoke()
      const spoof = await invoke({
        'x-user-email': 'ryan@displaycellpros.com',
        'x-admin-email': 'cheyoung1983@gmail.com',
        'x-staff-preview': 'true',
      })
      const outsider = await invoke({ authorization: `Bearer ${OUTSIDER_TOKEN}` })

      expect([401, 403]).toContain(unauth.statusCode)
      expect([401, 403]).toContain(spoof.statusCode)
      expect([401, 403]).toContain(outsider.statusCode)
      expect(unauth.cacheControl).toContain('no-store')
    })
  })

  describe('Static security invariants across client hooks, guards, and Firestore rules', () => {
    test('zero dev/preview auth bypasses or technician escalations exist in hooks and components', () => {
      for (const f of ['hooks/useAuth.tsx', 'hooks/useUserRole.ts', 'components/auth/AdminGuard.tsx', 'components/AdminProtectedRoute.tsx', 'components/AdminDashboard.tsx']) {
        const src = read(f)
        expect(src).not.toMatch(/x-staff-preview/)
        expect(src).not.toMatch(/x-user-email/)
        expect(src).not.toMatch(/x-admin-email/)
        expect(src).not.toMatch(/role\s*[:=]==?\s*['"]technician['"]/)
      }
    })

    test('firestore.rules enforces isOwnerEmail() for both owner emails only and validates email_verified', () => {
      const rules = read('firestore.rules')
      expect(rules).toContain("request.auth.token.email == 'cheyoung1983@gmail.com'")
      expect(rules).toContain("request.auth.token.email == 'ryan@displaycellpros.com'")
      expect(rules).toContain('request.auth.token.email_verified == true')
      expect(rules).not.toContain("'technician'")
    })
  })
})
