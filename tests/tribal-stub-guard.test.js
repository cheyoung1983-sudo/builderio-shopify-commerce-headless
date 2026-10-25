/**
 * @jest-environment node
 *
 * Tribal verification test suite, part 3: stub guard.
 *
 * The old fake "eligibility checker" (hardcoded discount code, hardcoded
 * Shopify discount id, hardcoded audit salt, tribal_* cookies that granted a
 * discount) must never come back. These tests:
 *   1. scan all application source for the removed stub's identifiers and for
 *      code that sets tribal_* cookies (with self-tests proving the detectors
 *      actually fire, and do NOT fire on the legitimate tribal_* metafield keys);
 *   2. prove /api/tribal/check-enrollment never reads an enrollment ID and never
 *      reports verified;
 *   3. pin down that the ONLY code path that tags a customer as tribal-verified
 *      is the Slack approval route.
 *
 * Scans read files only. No network.
 */
const fs = require('fs')
const path = require('path')
const { run } = require('./helpers/tribal-harness')

const root = path.resolve(__dirname, '..')
// Application source only. Docs, tests and agent scratch dirs are excluded on purpose:
// they are allowed to talk about the removed stub.
const APP_PATHS = ['blocks', 'components', 'config', 'context', 'hooks', 'lib', 'pages', 'services', 'extensions', 'utils', 'functions/src', 'proxy.ts', 'builder-registry.tsx', 'shopify.app.toml']
const CODE_FILE = /\.(ts|tsx|js|jsx|cjs|mjs|json|graphql|toml)$/
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage'])

function walk(rel, out = []) {
  const full = path.join(root, rel)
  if (!fs.existsSync(full)) return out
  const st = fs.statSync(full)
  if (st.isFile()) return out.concat(rel.replace(/\\/g, '/'))
  for (const name of fs.readdirSync(full)) {
    if (SKIP_DIRS.has(name)) continue
    out = walk(path.join(rel, name), out)
  }
  return out
}
// Comments may legitimately describe what a route does NOT do; only inspect code.
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1')

const appFiles = APP_PATHS.flatMap((p) => walk(p)).filter((f) => CODE_FILE.test(f))
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const scan = (detector) => appFiles.filter((f) => detector(read(f)))

// --- detectors -------------------------------------------------------------

const FORBIDDEN_LITERALS = [
  'verifyTribalEnrollment', // the removed fake checker function
  'TRIBAL-MEMBER-20', // hardcoded discount code
  '1826009317748', // hardcoded Shopify discount id
  'dcp_tribal_audit_salt_2026', // hardcoded audit salt
  'Tribal_Verified', // old customer tag / flag casing
]
const containsLiteral = (lit) => (text) => text.includes(lit)

// A tribal_* *cookie* being set. Matches the cookie-setting idioms, never the tribal_* metafield keys.
const COOKIE_SETTERS = [
  /document\.cookie\s*=\s*[^;\n]*tribal_/i,
  /set-cookie['"`]?\s*[,:][^\n]*tribal_/i,
  /\bcookies?\s*\.\s*set\s*\(\s*['"`]tribal_/i,
  /\bres\.setHeader\s*\(\s*['"`]set-cookie['"`][^)]*tribal_/i,
  /['"`]tribal_[a-z0-9_]*=[^'"`]*['"`]/i, // "tribal_verified=1; Path=/" style cookie strings
  /serialize\s*\(\s*['"`]tribal_/i, // cookie.serialize('tribal_...')
]
const setsTribalCookie = (text) => COOKIE_SETTERS.some((re) => re.test(text))

// Legit uses of tribal_* names: metafield keys, not cookies.
const LEGIT_METAFIELD_SAMPLES = [
  "{ namespace: 'custom', key: 'tribal_verified_at', value: now }",
  "key: 'tribal_verification_hash'",
  'tribal_verification_status',
  "const cookieName = 'shopify_customer_token'",
  "document.cookie = 'cookie_consent=1; Path=/'",
]

describe('stub guard: the detectors themselves work (so a green scan means something)', () => {
  test.each([
    ['literal in code', "export function verifyTribalEnrollment(id) { return { ok: true } }", containsLiteral('verifyTribalEnrollment')],
    ['discount code', "const code = 'TRIBAL-MEMBER-20'", containsLiteral('TRIBAL-MEMBER-20')],
    ['discount id', '"id": "gid://shopify/DiscountCodeNode/1826009317748"', containsLiteral('1826009317748')],
    ['audit salt', "const salt = 'dcp_tribal_audit_salt_2026'", containsLiteral('dcp_tribal_audit_salt_2026')],
    ['old tag casing', "tags: ['Tribal_Verified']", containsLiteral('Tribal_Verified')],
  ])('forbidden literal is detected: %s', (_n, sample, detector) => {
    expect(detector(sample)).toBe(true)
  })

  test.each([
    "document.cookie = 'tribal_verified=true; path=/'",
    'document.cookie = `tribal_member=${id}; max-age=3600`',
    "res.setHeader('Set-Cookie', 'tribal_verified=1; Path=/; HttpOnly')",
    "res.setHeader('Set-Cookie', [`tribal_discount=${code}; Path=/`])",
    "cookies.set('tribal_verified', '1')",
    "const c = 'tribal_member_id=abc; Secure'",
    "cookie.serialize('tribal_verified', 'yes')",
    "headers.append('Set-Cookie', 'tribal_ok=1')",
  ])('a tribal_* cookie setter is detected: %s', (sample) => {
    expect(setsTribalCookie(sample)).toBe(true)
  })

  test.each(LEGIT_METAFIELD_SAMPLES)('legit tribal_* metafield keys / unrelated cookies are NOT flagged: %s', (sample) => {
    expect(setsTribalCookie(sample)).toBe(false)
  })

  test('the scan actually covers the files that matter (guards against a silently empty scan)', () => {
    expect(appFiles.length).toBeGreaterThan(100)
    for (const f of [
      'pages/api/tribal/verify.ts',
      'pages/api/tribal/check-enrollment.ts',
      'pages/api/slack/tribal-interaction.ts',
      'lib/tribal/manual-review.ts',
      'lib/tribal/shopify-admin.ts',
      'extensions/tribal-discount/src/run.ts',
    ]) {
      expect(appFiles).toContain(f)
    }
  })
})

describe('stub guard: removed stub identifiers must stay absent from application source', () => {
  test.each(FORBIDDEN_LITERALS)('%s does not appear anywhere in app code/config', (lit) => {
    expect(scan(containsLiteral(lit))).toEqual([])
  })

  test('no app code sets a tribal_* cookie (verification state must never live in a client-settable cookie)', () => {
    expect(scan(setsTribalCookie)).toEqual([])
  })

  test('no app code reads a tribal_* cookie to grant a discount or status', () => {
    const readsTribalCookie = (t) => /cookies?\s*(\.\s*get\s*\(|\[)\s*['"`]tribal_/i.test(t) || /\bcookies?\.tribal_/i.test(t) || /['"`]tribal_[a-z_]*['"`]\s*\]?\s*\)?\s*===?\s*['"`](true|1|yes)['"`]/i.test(t)
    expect(scan(readsTribalCookie)).toEqual([])
  })

  test('the only cookie the verify route reads is the Shopify customer token', () => {
    const src = read('pages/api/tribal/verify.ts') + read('lib/tribal/manual-review.ts')
    const cookieNames = [...src.matchAll(/cookies?\[\s*['"`]([^'"`]+)['"`]\s*\]/g)].map((m) => m[1])
    for (const n of cookieNames) expect(n).toBe('shopify_customer_token')
  })

  test('no client component or page posts an enrollment id to anything but the manual-review endpoint', () => {
    // check-enrollment is kept only as a 501 stub; UI must submit to /api/tribal/verify.
    const offenders = scan((t) => /fetch\(\s*['"`]\/api\/tribal\/check-enrollment/.test(t)).filter((f) => !f.startsWith('pages/api/'))
    expect(offenders).toEqual([])
  })
})

describe('stub guard: /api/tribal/check-enrollment is a pure 501 stub', () => {
  test('its source imports nothing but the Next.js types (no store, no Shopify, no hashing, no Redis)', () => {
    const src = read('pages/api/tribal/check-enrollment.ts')
    const imports = [...src.matchAll(/^\s*import[^\n]*from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1])
    expect(imports).toEqual(['next'])
    expect(src).not.toMatch(/\b(fetch|crypto|createHash|createHmac|process\.env|Redis|req\.body|req\.query|req\.headers|req\.cookies)\b/)
  })

  test('POST never reads the request body / headers / cookies and always answers 501 verified:false', () => {
    const r = run(`
      const touched = []
      const trap = (name) => new Proxy({}, { get(_t, p) { touched.push(name + '.' + String(p)); return undefined }, has(_t, p) { touched.push(name + ' in ' + String(p)); return false }, ownKeys() { touched.push(name + '.keys'); return [] } })
      const out = {}
      const send = (method, req) => {
        const res = mkRes()
        const ret = checkEnrollmentRoute({ method, ...req }, res)
        return { status: res.statusCode, headers: res.headers, body: res.body, sync: !(ret && typeof ret.then === 'function') }
      }
      // Throwing getters: if the handler touches the body/headers/cookies/query the call blows up and we notice.
      const hostile = { method: 'POST' }
      for (const k of ['body', 'headers', 'cookies', 'query']) Object.defineProperty(hostile, k, { get() { touched.push(k); throw new Error('handler touched req.' + k) } })
      out.hostile = send('POST', hostile)
      out.withRealisticId = send('POST', { body: { firstName: 'A', lastName: 'B', tribalNation: 'Navajo Nation', tribalEnrollmentId: 'NAV-98442-SECRET' }, headers: {}, cookies: {} })
      out.empty = send('POST', {})
      out.garbage = send('POST', { body: 'x'.repeat(100000) })
      out.get = send('GET', {})
      out.put = send('PUT', {})
      out.touched = touched
      out.calls = calls.length
      out.logs = logs.length
      emit(out)
    `)
    expect(r.touched).toEqual([])
    expect(r.calls).toBe(0) // no network at all
    expect(r.logs).toBe(0)
    for (const k of ['hostile', 'withRealisticId', 'empty', 'garbage']) {
      expect(r[k].status).toBe(501)
      expect(r[k].body).toMatchObject({ success: false, verified: false, manualVerificationRequired: true, manualReviewEndpoint: '/api/tribal/verify', discountApplied: false, taxExemptionApplied: false })
      expect(r[k].body).not.toHaveProperty('code')
      expect(r[k].body).not.toHaveProperty('discountCode')
      expect(r[k].headers['Set-Cookie']).toBeUndefined()
      expect(JSON.stringify(r[k])).not.toContain('NAV-98442')
      expect(JSON.stringify(r[k])).not.toMatch(/TRIBAL-MEMBER/i)
    }
    for (const k of ['get', 'put']) {
      expect(r[k].status).toBe(405)
      expect(r[k].headers.Allow).toBe('POST')
      expect(r[k].body.verified).not.toBe(true)
    }
  })

  test('the response is identical for every id, so it cannot be used as an enrollment oracle', () => {
    const r = run(`
      const bodies = []
      for (const id of ['NN-94821', 'ABCD', '', 'anything-goes-12345', "' OR 1=1 --", 'TRIBAL-MEMBER-20']) {
        const res = mkRes()
        checkEnrollmentRoute({ method: 'POST', body: { tribalEnrollmentId: id } }, res)
        bodies.push(JSON.stringify([res.statusCode, res.body]))
      }
      emit({ distinct: [...new Set(bodies)].length })
    `)
    expect(r.distinct).toBe(1)
  })
})

describe('stub guard: only the Slack approval route can mark a customer tribal-verified', () => {
  test('updateShopifyCustomerTribalStatus is imported by exactly one route: the Slack interaction handler', () => {
    const importers = scan((t) => /\bupdateShopifyCustomerTribalStatus\b/.test(t)).filter((f) => f !== 'lib/tribal/shopify-admin.ts')
    expect(importers).toEqual(['pages/api/slack/tribal-interaction.ts'])
  })

  test('the public verify and check-enrollment routes never reference the Shopify admin tag helper or a tribal tag', () => {
    for (const f of ['pages/api/tribal/verify.ts', 'pages/api/tribal/check-enrollment.ts']) {
      const src = stripComments(read(f))
      expect(src).not.toMatch(/shopify-admin/)
      expect(src).not.toMatch(/updateShopifyCustomerTribalStatus|tagsAdd|tribal-member-verified|\btaxExempt\b/)
    }
  })

  test('the approval route is gated behind signature, authorization and the one-shot lock, in that order', () => {
    const src = read('pages/api/slack/tribal-interaction.ts')
    const at = (needle) => src.indexOf(needle)
    expect(at('verifySlackSignature(')).toBeGreaterThan(-1)
    expect(at('verifySlackSignature(')).toBeLessThan(at('authorizeSlackAction('))
    expect(at('authorizeSlackAction(')).toBeLessThan(at('acquireDecisionLock('))
    expect(at('acquireDecisionLock(')).toBeLessThan(at('updateShopifyCustomerTribalStatus({'))
  })

  test("the customer tag 'tribal-member-verified' is added by exactly one place (the Slack approval route)", () => {
    const adders = scan((t) => /tagsToAdd\s*:\s*\[[^\]]*tribal-member-verified/.test(t) || /tagsAdd[\s\S]{0,300}tribal-member-verified/.test(t))
    expect(adders).toEqual(['pages/api/slack/tribal-interaction.ts'])
  })
})
