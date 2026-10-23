const { execFileSync } = require('node:child_process')
const crypto = require('node:crypto')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..')
const u = (p) => JSON.stringify(pathToFileURL(path.join(repoRoot, p)).href)
const SECRET = 'test-signing-secret'

const BASE_ENV = {
  NODE_ENV: 'test',
  TRIBAL_VERIFY_ENABLED: 'true',
  SLACK_SIGNING_SECRET: SECRET,
  SLACK_TRIBAL_WEBHOOK_URL: 'https://hooks.slack.com/services/T/B/X',
  SHOPIFY_STORE_DOMAIN: 'example.myshopify.com',
  SHOPIFY_CLIENT_ID: 'id',
  SHOPIFY_CLIENT_SECRET: 'secret',
  UPSTASH_REDIS_REST_URL: '',
  UPSTASH_REDIS_REST_TOKEN: '',
  KV_REST_API_URL: '',
  KV_REST_API_TOKEN: '',
}

// Runs verify -> Slack interaction in one process (shared in-memory store).
function flow({ env = {}, action = 'tribal_approve', badSignature = false, customerId = 'cust_1' } = {}) {
  const script = `
    const { Readable } = await import('node:stream')
    const crypto = await import('node:crypto')
    const calls = []
    globalThis.fetch = async (url, init = {}) => {
      const body = init.body ? String(init.body) : ''
      calls.push({ url: String(url), body })
      if (String(url).includes('oauth/access_token')) return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 })
      if (String(url).includes('graphql') && body.includes('tagsAdd(')) return new Response(JSON.stringify({ data: { tagsAdd: { node: { id: 'gid://shopify/Customer/1' }, userErrors: [] } } }), { status: 200 })
      if (String(url).includes('graphql')) return new Response(JSON.stringify({ data: { customerUpdate: { customer: { id: 'gid://shopify/Customer/1', tags: ['tribal-member-verified'], taxExempt: false }, userErrors: [] } } }), { status: 200 })
      return new Response('ok', { status: 200 })
    }
    const mkRes = () => { const r = { statusCode: 200, headers: {}, json: null,
      setHeader(k, v) { this.headers[k] = v }, status(c) { this.statusCode = c; return this },
      json(b) { this.json = b; return this }, end() { return this } }; return r }
    const verify = (await import(${u('pages/api/tribal/verify.ts')})).default
    const interact = (await import(${u('pages/api/slack/tribal-interaction.ts')})).default

    const vres = mkRes()
    await verify({ method: 'POST', headers: {}, socket: {}, body: { firstName: 'Ann', lastName: 'Lee', tribalNation: 'Navajo Nation', tribalEnrollmentId: 'NAV-98442', customerId: ${JSON.stringify(customerId)} } }, vres)
    const verifyResult = { statusCode: vres.statusCode, body: vres.json }
    const reviewId = vres.json?.reviewId
    let interaction = null
    if (reviewId) {
      const payload = { type: 'block_actions', user: { username: 'ryan' }, response_url: 'https://hooks.slack.com/actions/T/1/abc', actions: [{ action_id: ${JSON.stringify(action)}, value: reviewId }] }
      const raw = 'payload=' + encodeURIComponent(JSON.stringify(payload))
      const ts = String(Math.floor(Date.now() / 1000))
      const sig = 'v0=' + crypto.createHmac('sha256', ${JSON.stringify(badSignature ? 'wrong' : SECRET)}).update('v0:' + ts + ':' + raw).digest('hex')
      const req = Readable.from([Buffer.from(raw)])
      req.method = 'POST'
      req.headers = { 'x-slack-request-timestamp': ts, 'x-slack-signature': sig }
      const ires = mkRes()
      await interact(req, ires)
      interaction = { statusCode: ires.statusCode }
    }
    console.log(JSON.stringify({ verifyResult, interaction, calls }))
  `
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...BASE_ENV, ...env },
  })
  return JSON.parse(out.trim().split('\n').pop())
}

const graphqlCalls = (r) => r.calls.filter((c) => c.url.includes('graphql'))

describe('Tribal verification: Slack manual review', () => {
  test('flag off (default): verify stays 501, nothing posted', () => {
    const r = flow({ env: { TRIBAL_VERIFY_ENABLED: '' } })
    expect(r.verifyResult.statusCode).toBe(501)
    expect(r.calls).toEqual([])
  })

  test('flag on: request stored, posted to Slack with Approve/Deny, 202 pending', () => {
    const r = flow({ action: 'none' })
    expect(r.verifyResult.statusCode).toBe(202)
    expect(r.verifyResult.body.pendingReview).toBe(true)
    expect(r.verifyResult.body.discountApplied).toBe(false)
    const slack = r.calls.find((c) => c.url.startsWith('https://hooks.slack.com/services/'))
    expect(slack).toBeTruthy()
    expect(slack.body).toContain('tribal_approve')
    expect(slack.body).toContain('tribal_deny')
  })

  test('Approve tags the Shopify customer (tag only, no taxExempt when tax flag off)', () => {
    const r = flow()
    expect(r.interaction.statusCode).toBe(200)
    const gql = graphqlCalls(r)
    expect(gql).toHaveLength(2)
    const input = JSON.parse(gql[0].body).variables.input
    expect(input.tags).toBeUndefined()
    expect(input.taxExempt).toBe(false)
    const tagsAdd = JSON.parse(gql[1].body)
    expect(tagsAdd.query).toContain('tagsAdd(')
    expect(tagsAdd.variables.tags).toEqual(['tribal-member-verified'])
    expect(r.calls.some((c) => c.body.includes('Shopify customer tagged'))).toBe(true)
    expect(r.calls.some((c) => c.url.startsWith('https://hooks.slack.com/actions/') && c.body.includes('Approved'))).toBe(true)
  })

  test('Approve sets taxExempt only when TRIBAL_TAX_EXEMPT_ENABLED=true', () => {
    const r = flow({ env: { TRIBAL_TAX_EXEMPT_ENABLED: 'true' } })
    expect(JSON.parse(graphqlCalls(r)[0].body).variables.input.taxExempt).toBe(true)
  })

  test('Deny does not touch Shopify', () => {
    const r = flow({ action: 'tribal_deny' })
    expect(r.interaction.statusCode).toBe(200)
    expect(graphqlCalls(r)).toEqual([])
    expect(r.calls.some((c) => c.body.includes('Denied'))).toBe(true)
  })

  test('Invalid Slack signature is rejected with 401 and does not touch Shopify', () => {
    const r = flow({ badSignature: true })
    expect(r.interaction.statusCode).toBe(401)
    expect(graphqlCalls(r)).toEqual([])
  })
})

describe('verifySlackSignature', () => {
  function check(opts) {
    const script = `const m = await import(${u('lib/tribal/manual-review.ts')}); console.log(JSON.stringify(m.verifySlackSignature(${JSON.stringify(opts)})))`
    return JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', script], { cwd: repoRoot, encoding: 'utf8' }).trim())
  }
  const ts = '1700000000'
  const raw = 'payload=x'
  const sig = 'v0=' + crypto.createHmac('sha256', SECRET).update(`v0:${ts}:${raw}`).digest('hex')
  test('accepts a valid signature, rejects stale or missing', () => {
    expect(check({ rawBody: raw, timestamp: ts, signature: sig, signingSecret: SECRET, nowSeconds: 1700000010 })).toBe(true)
    expect(check({ rawBody: raw, timestamp: ts, signature: sig, signingSecret: SECRET, nowSeconds: 1700001000 })).toBe(false)
    expect(check({ rawBody: raw, timestamp: ts, signature: sig, nowSeconds: 1700000010 })).toBe(false)
  })
})
