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
  SLACK_TRIBAL_APPROVER_IDS: 'U_RYAN',
  SLACK_TEAM_ID: '',
  SLACK_APP_ID: '',
  SLACK_TRIBAL_CHANNEL_ID: '',
}

// Runs verify -> Slack interaction in one process (shared in-memory store).
function flow({
  env = {},
  action = 'tribal_approve',
  badSignature = false,
  customerId = 'gid://shopify/Customer/999',
  cookie = 'shopify_customer_token=good-token',
  body = {},
  verifyHeaders = {},
  payloadExtra = {},
  user = { id: 'U_RYAN', username: 'ryan' },
  clicks = 1,
} = {}) {
  const script = `
    const { Readable } = await import('node:stream')
    const crypto = await import('node:crypto')
    const calls = []
    globalThis.fetch = async (url, init = {}) => {
      const body = init.body ? String(init.body) : ''
      calls.push({ url: String(url), body })
      if (String(url).includes('/account/customer/api/')) {
        const ok = String(init.headers?.Authorization) === 'good-token'
        return new Response(JSON.stringify(ok ? { data: { customer: { id: 'gid://shopify/Customer/1' } } } : { errors: [{ message: 'unauthorized' }] }), { status: ok ? 200 : 401 })
      }
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
    const vHeaders = { ...${JSON.stringify(verifyHeaders)} }
    if (${JSON.stringify(cookie)}) vHeaders.cookie = ${JSON.stringify(cookie)}
    await verify({ method: 'POST', headers: vHeaders, socket: {}, body: { firstName: 'Ann', lastName: 'Lee', tribalNation: 'Navajo Nation', tribalEnrollmentId: 'NAV-98442', customerId: ${JSON.stringify(customerId)}, ...${JSON.stringify(body)} } }, vres)
    const verifyResult = { statusCode: vres.statusCode, body: vres.json }
    const reviewId = vres.json?.reviewId
    let interaction = null
    const interactions = []
    if (reviewId) for (let i = 0; i < ${clicks}; i++) {
      const payload = { type: 'block_actions', user: ${JSON.stringify(user)}, response_url: 'https://hooks.slack.com/actions/T/1/abc', actions: [{ action_id: ${JSON.stringify(action)}, value: reviewId }], ...${JSON.stringify(payloadExtra)} }
      const raw = 'payload=' + encodeURIComponent(JSON.stringify(payload))
      const ts = String(Math.floor(Date.now() / 1000))
      const sig = 'v0=' + crypto.createHmac('sha256', ${JSON.stringify(badSignature ? 'wrong' : SECRET)}).update('v0:' + ts + ':' + raw).digest('hex')
      const req = Readable.from([Buffer.from(raw)])
      req.method = 'POST'
      req.headers = { 'x-slack-request-timestamp': ts, 'x-slack-signature': sig }
      const ires = mkRes()
      await interact(req, ires)
      interaction = { statusCode: ires.statusCode }
      interactions.push(interaction)
    }
    console.log(JSON.stringify({ verifyResult, interaction, interactions, calls }))
  `
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...BASE_ENV, ...env },
  })
  return JSON.parse(out.trim().split('\n').pop())
}

const graphqlCalls = (r) => r.calls.filter((c) => c.url.includes('myshopify.com') && c.url.includes('graphql'))
const slackPost = (r) => r.calls.find((c) => c.url.startsWith('https://hooks.slack.com/services/'))

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

function lib(expr) {
  const script = `const m = await import(${u('lib/tribal/manual-review.ts')}); console.log(JSON.stringify(await (async () => ${expr})()))`
  return JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', script], { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, ...BASE_ENV } }).trim().split('\n').pop())
}

describe('Security hardening (#1 customer identity)', () => {
  test('ignores body.customerId and uses the signed-in Shopify customer from the session cookie', () => {
    const r = flow({ customerId: 'gid://shopify/Customer/999' })
    const accountCall = r.calls.find((c) => c.url.includes('/account/customer/api/'))
    expect(accountCall).toBeTruthy()
    expect(slackPost(r).body).toContain('gid://shopify/Customer/1')
    expect(slackPost(r).body).not.toContain('Customer/999')
    const tagsAdd = JSON.parse(graphqlCalls(r)[1].body)
    expect(tagsAdd.variables.id).toBe('gid://shopify/Customer/1')
  })

  test('no session cookie: stored as guest, Approve does not touch Shopify', () => {
    const r = flow({ cookie: '' })
    expect(r.verifyResult.statusCode).toBe(202)
    expect(slackPost(r).body).toContain('guest')
    expect(graphqlCalls(r)).toEqual([])
    expect(r.calls.some((c) => c.body.includes('tag the Shopify customer manually'))).toBe(true)
  })

  test('invalid session token: treated as guest', () => {
    const r = flow({ cookie: 'shopify_customer_token=forged' })
    expect(r.verifyResult.statusCode).toBe(202)
    expect(graphqlCalls(r)).toEqual([])
  })
})

describe('Security hardening (#1/#8 rate limiting by x-real-ip and email)', () => {
  test('rate limit key uses x-real-ip, not x-forwarded-for', () => {
    expect(lib(`m.getClientIp({ 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '1.2.3.4' }, '127.0.0.1')`)).toBe('203.0.113.9')
    expect(lib(`m.getClientIp({ 'x-forwarded-for': '1.2.3.4' }, '10.0.0.1')`)).toBe('10.0.0.1')
  })

  test('11th request from the same x-real-ip is 429 even with rotating customerIds/forwarded-for', () => {
    const script = `
      globalThis.fetch = async () => new Response('ok', { status: 200 })
      const verify = (await import(${u('pages/api/tribal/verify.ts')})).default
      const statuses = []
      for (let i = 0; i < 11; i++) {
        const r = { statusCode: 200, setHeader() {}, status(c) { this.statusCode = c; return this }, json() { return this } }
        await verify({ method: 'POST', headers: { 'x-real-ip': '198.51.100.7', 'x-forwarded-for': '10.0.0.' + i }, socket: {}, body: { firstName: 'A', lastName: 'B', tribalNation: 'N', tribalEnrollmentId: 'X1', customerId: 'gid://shopify/Customer/' + i } }, r)
        statuses.push(r.statusCode)
      }
      console.log(JSON.stringify(statuses))`
    const out = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', script], { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, ...BASE_ENV, TRIBAL_VERIFY_ENABLED: '' } }).trim().split('\n').pop())
    expect(out.slice(0, 10).every((s) => s !== 429)).toBe(true)
    expect(out[10]).toBe(429)
  })

  test('same email is limited across different IPs', () => {
    const script = `
      globalThis.fetch = async () => new Response('ok', { status: 200 })
      const verify = (await import(${u('pages/api/tribal/verify.ts')})).default
      const statuses = []
      for (let i = 0; i < 6; i++) {
        const r = { statusCode: 200, setHeader() {}, status(c) { this.statusCode = c; return this }, json() { return this } }
        await verify({ method: 'POST', headers: { 'x-real-ip': '192.0.2.' + i }, socket: {}, body: { firstName: 'A', lastName: 'B', tribalNation: 'N', tribalEnrollmentId: 'X1', email: 'Same@Example.com' } }, r)
        statuses.push(r.statusCode)
      }
      console.log(JSON.stringify(statuses))`
    const out = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', script], { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, ...BASE_ENV, TRIBAL_VERIFY_ENABLED: '' } }).trim().split('\n').pop())
    expect(out.slice(0, 5).every((s) => s !== 429)).toBe(true)
    expect(out[5]).toBe(429)
  })
})

describe('Security hardening (#2 approver authorization)', () => {
  test('non-allowlisted Slack user gets 403 and Shopify is untouched; message is not replaced', () => {
    const r = flow({ user: { id: 'U_EVIL', username: 'evil' } })
    expect(r.interaction.statusCode).toBe(403)
    expect(graphqlCalls(r)).toEqual([])
    const reply = r.calls.find((c) => c.url.startsWith('https://hooks.slack.com/actions/'))
    expect(JSON.parse(reply.body).replace_original).toBe(false)
  })

  test('empty SLACK_TRIBAL_APPROVER_IDS rejects everyone', () => {
    const r = flow({ env: { SLACK_TRIBAL_APPROVER_IDS: '' } })
    expect(r.interaction.statusCode).toBe(403)
    expect(graphqlCalls(r)).toEqual([])
  })

  test('team, channel and app id are enforced when set', () => {
    const env = { SLACK_TEAM_ID: 'T1', SLACK_APP_ID: 'A1' }
    expect(flow({ env, payloadExtra: { team: { id: 'T2' }, api_app_id: 'A1' } }).interaction.statusCode).toBe(403)
    expect(flow({ env, payloadExtra: { team: { id: 'T1' }, api_app_id: 'A2' } }).interaction.statusCode).toBe(403)
    expect(lib(`m.authorizeSlackAction({ user: { id: 'U1' }, channel: { id: 'C2' } }, { SLACK_TRIBAL_APPROVER_IDS: 'U1', SLACK_TRIBAL_CHANNEL_ID: 'C1' }).ok`)).toBe(false)
    expect(lib(`m.authorizeSlackAction({ user: { id: 'U1' }, channel: { id: 'C1' } }, { SLACK_TRIBAL_APPROVER_IDS: 'U0, U1', SLACK_TRIBAL_CHANNEL_ID: 'C1' }).ok`)).toBe(true)
    const ok = flow({ env, payloadExtra: { team: { id: 'T1' }, api_app_id: 'A1' } })
    expect(ok.interaction.statusCode).toBe(200)
    expect(graphqlCalls(ok)).toHaveLength(2)
  })
})

describe('Security hardening (#3/#4 Slack message content)', () => {
  test('enrollment ID masked, email masked, user fields escaped', () => {
    const r = flow({ action: 'none', body: { firstName: '<!channel>', lastName: 'A&B', tribalNation: '<https://evil.example|click>', email: 'ann.lee@example.com' } })
    const body = slackPost(r).body
    expect(body).not.toContain('NAV-98442')
    expect(body).toContain('*****8442')
    expect(body).not.toContain('ann.lee@example.com')
    expect(body).toContain('a***@example.com')
    expect(body).not.toContain('<!channel>')
    expect(body).not.toContain('<https://evil.example')
    expect(body).toContain('&lt;!channel&gt;')
    expect(body).toContain('A&amp;B')
  })
})

describe('Security hardening (#5 input validation)', () => {
  test('rejects over-long fields and bad email', () => {
    expect(flow({ body: { firstName: 'x'.repeat(121) } }).verifyResult.statusCode).toBe(400)
    expect(flow({ body: { email: 'not-an-email' } }).verifyResult.statusCode).toBe(400)
    expect(flow({ body: { tribalNation: 123 } }).verifyResult.statusCode).toBe(400)
    expect(flow({ action: 'none', body: { firstName: 'x'.repeat(120) } }).verifyResult.statusCode).toBe(202)
  })

  test('customer gid format is enforced', () => {
    expect(lib(`[m.isValidCustomerGid('gid://shopify/Customer/123'), m.isValidCustomerGid('123'), m.isValidCustomerGid('gid://shopify/Customer/1 OR 1'), m.isValidCustomerGid('gid://shopify/Order/1')]`)).toEqual([true, false, false, false])
  })
})

describe('Security hardening (#6 Redis required in production)', () => {
  test('production without Redis: verify returns 503 and nothing is posted', () => {
    const r = flow({ env: { NODE_ENV: 'production' } })
    expect(r.verifyResult.statusCode).toBe(503)
    expect(slackPost(r)).toBeUndefined()
  })
  test('isReviewStoreAvailable false in production without Redis, true in dev', () => {
    expect(lib(`[m.isReviewStoreAvailable({ NODE_ENV: 'production' }), m.isReviewStoreAvailable({ NODE_ENV: 'development' }), m.isReviewStoreAvailable({ NODE_ENV: 'production', UPSTASH_REDIS_REST_URL: 'https://x', UPSTASH_REDIS_REST_TOKEN: 't' })]`)).toEqual([false, true, true])
  })
})

describe('Security hardening (#7 atomic decision lock)', () => {
  test('lock is acquired only once', () => {
    expect(lib(`[await m.acquireDecisionLock('r1'), await m.acquireDecisionLock('r1'), await m.acquireDecisionLock('r2')]`)).toEqual([true, false, true])
  })
  test('concurrent approve clicks tag Shopify only once', () => {
    const script = `
      const { Readable } = await import('node:stream')
      const crypto = await import('node:crypto')
      const m = await import(${u('lib/tribal/manual-review.ts')})
      let tagCalls = 0
      globalThis.fetch = async (url, init = {}) => {
        const body = init.body ? String(init.body) : ''
        if (String(url).includes('oauth/access_token')) return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 })
        if (body.includes('tagsAdd(')) { tagCalls++; return new Response(JSON.stringify({ data: { tagsAdd: { node: { id: 'x' }, userErrors: [] } } }), { status: 200 }) }
        if (String(url).includes('graphql')) return new Response(JSON.stringify({ data: { customerUpdate: { customer: { id: 'x', tags: [], taxExempt: false }, userErrors: [] } } }), { status: 200 })
        return new Response('ok', { status: 200 })
      }
      const interact = (await import(${u('pages/api/slack/tribal-interaction.ts')})).default
      const rec = m.newReviewRecord({ customerId: 'gid://shopify/Customer/1', firstName: 'A', lastName: 'B', tribalNation: 'N', tribalEnrollmentId: 'X12345' })
      await m.saveReview(rec)
      const click = () => {
        const payload = { user: { id: 'U_RYAN' }, response_url: 'https://hooks.slack.com/actions/T/1/abc', actions: [{ action_id: 'tribal_approve', value: rec.id }] }
        const raw = 'payload=' + encodeURIComponent(JSON.stringify(payload))
        const ts = String(Math.floor(Date.now() / 1000))
        const req = Readable.from([Buffer.from(raw)])
        req.method = 'POST'
        req.headers = { 'x-slack-request-timestamp': ts, 'x-slack-signature': 'v0=' + crypto.createHmac('sha256', ${JSON.stringify(SECRET)}).update('v0:' + ts + ':' + raw).digest('hex') }
        const res = { statusCode: 200, setHeader() {}, status(c) { this.statusCode = c; return this }, json() { return this }, end() { return this } }
        return interact(req, res)
      }
      await Promise.all([click(), click(), click()])
      console.log(JSON.stringify(tagCalls))`
    const out = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', script], { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, ...BASE_ENV } }).trim().split('\n').pop())
    expect(out).toBe(1)
  })
})
