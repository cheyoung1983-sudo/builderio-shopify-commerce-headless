const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const crypto = require('node:crypto')

/** Shared webhook HMAC helper (lib/shopify/webhook-hmac.ts). */
const repoRoot = path.resolve(__dirname, '..')
const helperUrl = pathToFileURL(path.join(repoRoot, 'lib/shopify/webhook-hmac.ts')).href

function run(body, env = {}) {
  const script = `
    const m = await import(${JSON.stringify(helperUrl)})
    ${body}
  `
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test', SHOPIFY_WEBHOOK_SECRET: '', SHOPIFY_CLIENT_SECRET: '', ...env },
  })
  return JSON.parse(out.trim())
}

const SECRET = 'whsec_test_123'
const sign = (body, secret = SECRET) => crypto.createHmac('sha256', secret).update(body).digest('base64')

describe('Shopify webhook HMAC helper', () => {
  const body = JSON.stringify({ id: 1001, note: 'café ☕ – unicode' })

  test('Accepts the exact raw body (string or Buffer) with the right signature', () => {
    const r = run(`
      const body = ${JSON.stringify(body)}
      console.log(JSON.stringify({
        str: m.verifyShopifyHmac(body, ${JSON.stringify(sign(body))}, ${JSON.stringify(SECRET)}),
        buf: m.verifyShopifyHmac(Buffer.from(body, 'utf8'), ${JSON.stringify(sign(body))}, ${JSON.stringify(SECRET)}),
        arr: m.verifyShopifyHmac(body, [${JSON.stringify(sign(body))}], ${JSON.stringify(SECRET)}),
        computed: m.computeShopifyWebhookHmac(body, ${JSON.stringify(SECRET)}),
      }))
    `)
    expect(r.str).toBe(true)
    expect(r.buf).toBe(true)
    expect(r.arr).toBe(true)
    expect(r.computed).toBe(sign(body))
  })

  test('Rejects missing, empty, malformed, wrong-secret and tampered signatures', () => {
    const r = run(`
      const body = ${JSON.stringify(body)}
      const good = ${JSON.stringify(sign(body))}
      const s = ${JSON.stringify(SECRET)}
      console.log(JSON.stringify([
        m.verifyShopifyHmac(body, undefined, s),
        m.verifyShopifyHmac(body, null, s),
        m.verifyShopifyHmac(body, '', s),
        m.verifyShopifyHmac(body, 'not base64 !!', s),
        m.verifyShopifyHmac(body, good.slice(0, -4), s),
        m.verifyShopifyHmac(body, ${JSON.stringify(sign(body, 'other_secret'))}, s),
        m.verifyShopifyHmac(body + ' ', good, s),
        m.verifyShopifyHmac(JSON.stringify(JSON.parse(body), null, 2), good, s),
      ]))
    `)
    expect(r).toEqual([false, false, false, false, false, false, false, false])
  })

  test('No secret configured => always false (no test-mode bypass)', () => {
    const r = run(`
      const body = ${JSON.stringify(body)}
      console.log(JSON.stringify({ ok: m.verifyShopifyHmac(body, ${JSON.stringify(sign(body))}), secret: m.getShopifyWebhookSecret() }))
    `)
    expect(r.ok).toBe(false)
    expect(r.secret).toBe('')
  })

  test('Secret resolution: SHOPIFY_WEBHOOK_SECRET first, then SHOPIFY_CLIENT_SECRET', () => {
    const both = run(`console.log(JSON.stringify({ s: m.getShopifyWebhookSecret() }))`, {
      SHOPIFY_WEBHOOK_SECRET: 'from_webhook',
      SHOPIFY_CLIENT_SECRET: 'from_client',
    })
    const clientOnly = run(`console.log(JSON.stringify({ s: m.getShopifyWebhookSecret() }))`, {
      SHOPIFY_CLIENT_SECRET: 'from_client',
    })
    expect(both.s).toBe('from_webhook')
    expect(clientOnly.s).toBe('from_client')
  })

  test('readRawRequestBody reads streams, passes strings/Buffers through, refuses parsed objects and oversize bodies', () => {
    const r = run(`
      const { Readable } = await import('node:stream')
      const stream = Readable.from([Buffer.from('{"a":'), Buffer.from('1}')])
      const fromStream = (await m.readRawRequestBody(stream)).toString('utf8')
      const fromString = (await m.readRawRequestBody({ body: 'raw' })).toString('utf8')
      const fromObject = await m.readRawRequestBody({ body: { a: 1 } })
      let tooLarge = false
      try { await m.readRawRequestBody(Readable.from([Buffer.alloc(20)]), 10) } catch { tooLarge = true }
      console.log(JSON.stringify({ fromStream, fromString, fromObject, tooLarge }))
    `)
    expect(r.fromStream).toBe('{"a":1}')
    expect(r.fromString).toBe('raw')
    expect(r.fromObject).toBeNull()
    expect(r.tooLarge).toBe(true)
  })
})
