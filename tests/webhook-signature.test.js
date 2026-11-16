const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..')
const libUrl = pathToFileURL(path.join(repoRoot, 'lib/webhooks/persona-signature.ts')).href

function run(body) {
  const script = `
    const m = await import(${JSON.stringify(libUrl)})
    const secret = 'test-secret-not-real'
    const raw = Buffer.from(JSON.stringify({ userId: 'auth0|1', email: 'a@b.co' }))
    const now = 1_800_000_000
    const sig = m.computePersonaSignature(secret, String(now), raw)
    ${body}
  `
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', script], { cwd: repoRoot, encoding: 'utf8' })
  return JSON.parse(out.trim().split('\n').pop())
}

describe('persona-signature helper', () => {
  test('accepts a valid signature and rejects tampering, staleness and malformed headers', () => {
    const r = run(`
      const v = (header, opts = {}) => m.verifyPersonaSignature({ secret, header, rawBody: raw, nowSeconds: now, ...opts })
      console.log(JSON.stringify({
        good: v('t=' + now + ',v1=' + sig),
        rotated: v('t=' + now + ',v1=deadbeef,v1=' + sig),
        tampered: m.verifyPersonaSignature({ secret, header: 't=' + now + ',v1=' + sig, rawBody: raw.toString() + ' ', nowSeconds: now }),
        stale: v('t=' + now + ',v1=' + sig, { nowSeconds: now + 301 }),
        noT: v('v1=' + sig),
        nanT: v('t=abc,v1=' + sig),
        missing: v(undefined),
        noSecret: m.verifyPersonaSignature({ secret: undefined, header: 't=' + now + ',v1=' + sig, rawBody: raw, nowSeconds: now }),
      }))
    `)
    expect(r.good).toEqual({ ok: true })
    expect(r.rotated).toEqual({ ok: true })
    expect(r.tampered.reason).toBe('bad_signature')
    expect(r.stale.reason).toBe('stale_timestamp')
    expect(r.noT.reason).toBe('malformed_signature')
    expect(r.nanT.reason).toBe('malformed_signature')
    expect(r.missing.reason).toBe('missing_signature')
    expect(r.noSecret.reason).toBe('missing_secret')
  })

  test('bearer token check is exact and fails closed without a secret', () => {
    const r = run(`console.log(JSON.stringify({
      ok: m.verifyBearerToken('Bearer ' + secret, secret),
      wrong: m.verifyBearerToken('Bearer nope', secret),
      prefix: m.verifyBearerToken('Bearer ' + secret.slice(0, 4), secret),
      noScheme: m.verifyBearerToken(secret, secret),
      noSecret: m.verifyBearerToken('Bearer ', undefined),
    }))`)
    expect(r).toEqual({ ok: true, wrong: false, prefix: false, noScheme: false, noSecret: false })
  })

  test('idempotency key prefers a safe event id and otherwise hashes the body', () => {
    const r = run(`console.log(JSON.stringify({
      evt: m.deriveIdempotencyKey('evt_123', raw),
      unsafe: m.deriveIdempotencyKey('../../x', raw),
      a: m.deriveIdempotencyKey(undefined, raw),
      b: m.deriveIdempotencyKey(undefined, raw),
    }))`)
    expect(r.evt).toBe('evt_evt_123')
    expect(r.unsafe).toMatch(/^sha256_[0-9a-f]{64}$/)
    expect(r.a).toBe(r.b)
  })
})

describe('webhook routes use the hardened helper', () => {
  const read = (p) => fs.readFileSync(path.join(repoRoot, p), 'utf8')

  test('auth0-persona verifies raw body, fails closed and is idempotent', () => {
    const src = read('pages/api/webhooks/auth0-persona.ts')
    expect(src).toMatch(/bodyParser:\s*false/)
    expect(src).toMatch(/verifyPersonaSignature/)
    expect(src).toMatch(/verifyBearerToken/)
    expect(src).toMatch(/status\(503\)/)
    expect(src).toMatch(/webhook_events/)
    expect(src).not.toMatch(/token !== expectedSecret/)
    expect(src).not.toMatch(/error:\s*err\?\.message/)
  })

  test('persona webhook uses constant-time verification and generic errors', () => {
    const src = read('pages/api/webhooks/persona.ts')
    expect(src).toMatch(/verifyPersonaSignature/)
    expect(src).not.toMatch(/signatureValue !== computedDigest/)
    expect(src).not.toMatch(/error:\s*err\?\.message/)
  })

  test('MCP admin APIs have no static header bypass and are behind the proxy guard', () => {
    for (const p of ['pages/api/mcp/integrations.ts', 'pages/api/persona/mcp-query.ts']) {
      expect(read(p)).not.toMatch(/=== 'display-cell-pros-backend'/)
    }
    const proxy = read('proxy.ts')
    expect(proxy).toMatch(/'\/api\/mcp'/)
    expect(proxy).toMatch(/'\/api\/persona\/mcp-query'/)
  })
})
