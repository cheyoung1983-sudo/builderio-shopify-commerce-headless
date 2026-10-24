/**
 * Shared harness for the tribal verification test suite.
 *
 * The tribal routes are TypeScript ES modules, so (like the existing tribal
 * tests) each scenario batch runs in a child Node process using native
 * --experimental-strip-types. Inside the child:
 *   - globalThis.fetch is replaced by a recording mock. There is NO real
 *     network: any URL that is not explicitly mocked throws.
 *   - Upstash Redis is emulated over that same fetch mock (in-memory, records
 *     every write) so Redis writes can be inspected without a real Redis.
 *   - console.* is captured so tests can assert nothing sensitive is logged.
 *   - Date.now can be advanced with `advanceTime(ms)`.
 * The child emits a single JSON result line which the parent parses.
 */
const { execFileSync } = require('node:child_process')
const crypto = require('node:crypto')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..', '..')
const fileUrl = (p) => pathToFileURL(path.join(repoRoot, p)).href

const SIGNING_SECRET = 'test-signing-secret'
const SLACK_WEBHOOK = 'https://hooks.slack.com/services/T000/B000/XXXX'
const SHOP = 'example.myshopify.com'
const REDIS_URL = 'https://redis.test.invalid'
const RAW_ID = 'NAV-98442-SECRET'
const STRIPE_KEY = 'rk_test_FAKEFAKEFAKEFAKE0001'
const STRIPE_WEBHOOK_SECRET = 'whsec_FAKEFAKEFAKEFAKE_for_tests_only'
const DUP_SECRET = 'test-duplicate-hmac-secret-0123456789'

const BASE_ENV = {
  NODE_ENV: 'test',
  TRIBAL_VERIFY_ENABLED: 'true',
  TRIBAL_TAX_EXEMPT_ENABLED: '',
  SLACK_SIGNING_SECRET: SIGNING_SECRET,
  SLACK_TRIBAL_WEBHOOK_URL: SLACK_WEBHOOK,
  SLACK_BOT_TOKEN: '',
  SLACK_TRIBAL_CHANNEL_ID: '',
  SLACK_TRIBAL_APPROVER_IDS: 'U_APPROVER',
  SLACK_TEAM_ID: '',
  SLACK_APP_ID: '',
  SHOPIFY_STORE_DOMAIN: SHOP,
  SHOPIFY_CLIENT_ID: 'test-client-id',
  SHOPIFY_CLIENT_SECRET: 'test-client-secret',
  UPSTASH_REDIS_REST_URL: '',
  UPSTASH_REDIS_REST_TOKEN: '',
  KV_REST_API_URL: '',
  KV_REST_API_TOKEN: '',
  STRIPE_IDENTITY_ENABLED: '',
  STRIPE_IDENTITY_RESTRICTED_KEY: '',
  STRIPE_IDENTITY_WEBHOOK_SECRET: '',
  TRIBAL_STRIPE_TEST_MODE_ONLY: '',
  TRIBAL_STRIPE_RETURN_BASE_URL: '',
  NEXT_PUBLIC_SITE_URL: '',
  TRIBAL_DUPLICATE_HMAC_SECRET: 'test-duplicate-hmac-secret-0123456789',
}

const PREAMBLE = `
const { Readable } = await import('node:stream')
const nodeCrypto = await import('node:crypto')
const calls = []
const logs = []
const redisOps = []
const redisData = new Map()
const redisTtl = new Map()
const unmocked = []

const stringify = (x) => { try { return typeof x === 'string' ? x : JSON.stringify(x, (k, v) => (v instanceof Error ? { message: v.message, stack: v.stack } : v)) } catch { return String(x) } }
for (const level of ['log', 'info', 'warn', 'error', 'debug']) console[level] = (...a) => { logs.push({ level, text: a.map(stringify).join(' ') }) }

// Controllable clock.
const realNow = Date.now.bind(Date)
let clockOffset = 0
Date.now = () => realNow() + clockOffset
globalThis.advanceTime = (ms) => { clockOffset += ms }

// Per-run Shopify behaviour switches.
globalThis.shopify = { tagFails: false, customerToken: 'good-token', customerId: 'gid://shopify/Customer/1' }
globalThis.slackWebhookOk = true
globalThis.slackWebhookThrows = false
// Stripe API mock (api.stripe.com). Nothing here ever reaches the real network.
globalThis.stripeMock = { createFails: false, redactFailsTimes: 0, redactAlways: false, redactErrorMessage: null, sessionCounter: 0 }

const b64 = (s) => Buffer.from(String(s), 'utf8').toString('base64')
function redisExec(cmd, encode) {
  for (const [k, t] of [...redisTtl]) if (t <= Date.now()) { redisTtl.delete(k); redisData.delete(k) } // emulate key expiry
  const [name, ...args] = cmd
  const op = String(name).toUpperCase()
  redisOps.push({ op, args: args.map(String) })
  const out = (v) => (encode && typeof v === 'string' && v !== 'OK' ? b64(v) : v)
  if (op === 'SET') {
    const [key, value, ...opts] = args.map(String)
    const nx = opts.map((o) => o.toUpperCase()).includes('NX')
    if (nx && redisData.has(key)) return null
    redisData.set(key, value)
    const up = opts.map((o) => o.toUpperCase())
    const exIdx = up.indexOf('EX'); const pxIdx = up.indexOf('PX')
    if (exIdx >= 0) redisTtl.set(key, Date.now() + Number(opts[exIdx + 1]) * 1000)
    else if (pxIdx >= 0) redisTtl.set(key, Date.now() + Number(opts[pxIdx + 1]))
    return 'OK'
  }
  if (op === 'GET') return redisData.has(String(args[0])) ? out(redisData.get(String(args[0]))) : null
  if (op === 'DEL') { let n = 0; for (const k of args.map(String)) { if (redisData.delete(k)) n++; redisTtl.delete(k) } return n }
  if (op === 'INCR') { const k = String(args[0]); const n = Number(redisData.get(k) || 0) + 1; redisData.set(k, String(n)); return n }
  if (op === 'PTTL') return redisTtl.has(String(args[0])) ? Math.max(0, redisTtl.get(String(args[0])) - Date.now()) : -1
  if (op === 'PEXPIRE') { redisTtl.set(String(args[0]), Date.now() + Number(args[1])); return 1 }
  throw new Error('unmocked redis command ' + op)
}

globalThis.fetch = async (url, init = {}) => {
  const u = String(url)
  const body = init.body ? String(init.body) : ''
  const headers = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v)]))
  const parsed = new URL(u)
  if (parsed.origin === ${JSON.stringify(REDIS_URL)}) {
    const encode = headers['upstash-encoding'] === 'base64'
    const cmds = JSON.parse(body)
    const isPipeline = parsed.pathname === '/pipeline' || parsed.pathname === '/multi-exec'
    const results = (isPipeline ? cmds : [cmds]).map((c) => ({ result: redisExec(c, encode) }))
    return new Response(JSON.stringify(isPipeline ? results : results[0]), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  calls.push({ url: u, method: init.method || 'GET', body })
  if (u.includes('/account/customer/api/')) {
    const ok = String(init.headers?.Authorization) === globalThis.shopify.customerToken
    return new Response(JSON.stringify(ok ? { data: { customer: { id: globalThis.shopify.customerId } } } : { errors: [{ message: 'unauthorized' }] }), { status: ok ? 200 : 401 })
  }
  if (u.includes('oauth/access_token')) return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 })
  if (parsed.hostname === ${JSON.stringify(SHOP)} && u.includes('graphql')) {
    if (body.includes('tagsAdd(')) {
      const errs = globalThis.shopify.tagFails ? [{ field: ['tags'], message: 'nope' }] : []
      return new Response(JSON.stringify({ data: { tagsAdd: { node: { id: 'gid://shopify/Customer/1' }, userErrors: errs } } }), { status: 200 })
    }
    return new Response(JSON.stringify({ data: { customerUpdate: { customer: { id: 'gid://shopify/Customer/1', tags: [], taxExempt: false }, userErrors: [] } } }), { status: 200 })
  }
  if (parsed.hostname === 'api.stripe.com') {
    const jsonRes = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } })
    const m = globalThis.stripeMock
    if (parsed.pathname === '/v1/identity/verification_sessions' && (init.method || 'GET') === 'POST') {
      if (m.createFails) return jsonRes({ error: { type: 'api_error', message: 'boom' } }, 500)
      const id = 'vs_TEST' + String(++m.sessionCounter).padStart(6, '0')
      const meta = new URLSearchParams(body).get('metadata[request_id]')
      return jsonRes({ id, object: 'identity.verification_session', url: 'https://verify.stripe.com/start/test_' + id, status: 'requires_input', livemode: false, metadata: { request_id: meta } })
    }
    const redact = parsed.pathname.match(/^\\/v1\\/identity\\/verification_sessions\\/(vs_[A-Za-z0-9_]+)\\/redact$/)
    if (redact && (init.method || 'GET') === 'POST') {
      if (m.redactAlways || m.redactFailsTimes > 0) { m.redactFailsTimes--; return jsonRes({ error: { type: 'api_error', message: m.redactErrorMessage || 'temporary failure' } }, 500) }
      return jsonRes({ id: redact[1], object: 'identity.verification_session', redaction: { status: 'processing' } })
    }
    unmocked.push(u)
    throw new Error('unmocked stripe call blocked: ' + u)
  }
  if (u.startsWith('https://hooks.slack.com/services/')) {
    if (globalThis.slackWebhookThrows) throw new Error('slack down')
    return new Response('ok', { status: globalThis.slackWebhookOk ? 200 : 500 })
  }
  if (u.startsWith('https://hooks.slack.com/actions/')) return new Response('ok', { status: 200 })
  unmocked.push(u)
  throw new Error('unmocked network call blocked: ' + u)
}

const mkRes = () => {
  const r = { statusCode: 200, headers: {}, body: undefined, ended: false,
    setHeader(k, v) { this.headers[k] = v }, status(c) { this.statusCode = c; return this },
    json(b) { this.body = b; return this }, end() { this.ended = true; return this } }
  return r
}
const summarize = (r) => ({ statusCode: r.statusCode, headers: r.headers, body: r.body })

const verifyRoute = (await import(${JSON.stringify(fileUrl('pages/api/tribal/verify.ts'))})).default
const interactRoute = (await import(${JSON.stringify(fileUrl('pages/api/slack/tribal-interaction.ts'))})).default
const checkEnrollmentRoute = (await import(${JSON.stringify(fileUrl('pages/api/tribal/check-enrollment.ts'))})).default
const stripeWebhookRoute = (await import(${JSON.stringify(fileUrl('pages/api/webhooks/stripe-identity.ts'))})).default
const stripeLib = await import(${JSON.stringify(fileUrl('lib/tribal/stripe-identity.ts'))})
const review = await import(${JSON.stringify(fileUrl('lib/tribal/manual-review.ts'))})

const RAW_ID = ${JSON.stringify(RAW_ID)}
const CONSENT_VERSION = (await import(${JSON.stringify(fileUrl('lib/tribal/consent.ts'))})).CONSENT_TEXT_VERSION
// Every call yields a NEW identity (the duplicate check rejects repeats) unless the caller overrides the
// fields. The first call keeps the plain name/RAW_ID; later ones change only the digits/suffix so the
// ID length and last 4 characters (and therefore the mask) stay identical. All raw IDs used are
// recorded in usedRawIds so leak assertions can check every one of them.
let identityCounter = 0
const usedRawIds = new Set([RAW_ID])
const validBody = (extra = {}) => {
  const n = identityCounter++
  const rawId = n === 0 ? RAW_ID : 'NAV-' + String(10000 + n) + '-SECRET'
  usedRawIds.add(rawId)
  return { firstName: n === 0 ? 'Ann' : 'Ann' + n, lastName: n === 0 ? 'Lee' : 'Lee' + n, tribalNation: 'Navajo Nation', tribalEnrollmentId: rawId, consent: true, consentVersion: CONSENT_VERSION, ...extra }
}
let stripeCounter = 0
const stripeBody = (extra = {}) => { const n = stripeCounter++; return { firstName: 'Stripe' + n, lastName: 'Person' + n, tribalNation: 'Navajo Nation', email: 'stripe' + n + '@example.com', consent: true, consentVersion: CONSENT_VERSION, ...extra } }
let ipCounter = 0
const callVerify = async (opts = {}) => {
  const { method = 'POST', headers, ip, cookie } = opts
  const body = 'body' in opts ? opts.body : validBody()
  const res = mkRes()
  const h = { 'x-real-ip': ip || ('198.51.100.' + (++ipCounter)), ...(headers || {}) }
  if (cookie) h.cookie = cookie
  await verifyRoute({ method, headers: h, socket: {}, body }, res)
  return res
}

const SECRET = ${JSON.stringify(SIGNING_SECRET)}
const sign = (raw, ts, secret = SECRET) => 'v0=' + nodeCrypto.createHmac('sha256', secret).update('v0:' + ts + ':' + raw).digest('hex')
const nowSec = () => Math.floor(Date.now() / 1000)
const interactionPayload = (reviewId, action = 'tribal_approve', extra = {}) => ({
  type: 'block_actions', user: { id: 'U_APPROVER', username: 'ryan' },
  response_url: 'https://hooks.slack.com/actions/T/1/abc',
  actions: [{ action_id: action, value: reviewId }], ...extra,
})
const callInteract = async ({ payload, raw, ts, sig, headers, method = 'POST', secret } = {}) => {
  const rawBody = raw ?? ('payload=' + encodeURIComponent(JSON.stringify(payload)))
  const timestamp = ts ?? String(nowSec())
  const req = Readable.from([Buffer.from(rawBody)])
  req.method = method
  req.headers = { ...(headers || {}) }
  if (timestamp !== null) req.headers['x-slack-request-timestamp'] = timestamp
  const signature = sig === undefined ? sign(rawBody, timestamp, secret) : sig
  if (signature !== null) req.headers['x-slack-signature'] = signature
  const res = mkRes()
  await interactRoute(req, res)
  return res
}
// Creates a pending review through the real verify route (signed-in customer by default).
const createReview = async ({ cookie = 'shopify_customer_token=good-token', body } = {}) => {
  const res = await callVerify(body === undefined ? { cookie } : { cookie, body })
  if (res.statusCode !== 202) throw new Error('review not created: ' + res.statusCode + ' ' + JSON.stringify(res.body))
  return res.body.reviewId
}
// --- Stripe Identity helpers -------------------------------------------------
const WHSEC = ${JSON.stringify(STRIPE_WEBHOOK_SECRET)}
const stripeSign = (raw, ts, secret = WHSEC) => 't=' + ts + ',v1=' + nodeCrypto.createHmac('sha256', secret).update(ts + '.' + raw).digest('hex')
let evtCounter = 0
const stripeEvent = (type, { reviewId, sessionId, livemode = false, id, lastErrorCode, metadata } = {}) => ({
  id: id || ('evt_TEST' + String(++evtCounter).padStart(6, '0')), object: 'event', api_version: '2025-01-01', created: nowSec(), livemode, type,
  data: { object: { id: sessionId, object: 'identity.verification_session', livemode, status: type.split('.').pop(), metadata: metadata || { request_id: reviewId },
    ...(lastErrorCode ? { last_error: { code: lastErrorCode, reason: 'redacted reason text' } } : {}) } },
})
const callStripeWebhook = async ({ event, raw, ts, sig, headers, method = 'POST', secret } = {}) => {
  const rawBody = raw ?? JSON.stringify(event ?? {})
  const timestamp = ts ?? nowSec()
  const req = Readable.from([Buffer.from(rawBody)])
  req.method = method
  req.headers = { ...(headers || {}) }
  const signature = sig === undefined ? stripeSign(rawBody, timestamp, secret) : sig
  if (signature !== null) req.headers['stripe-signature'] = signature
  const res = mkRes()
  await stripeWebhookRoute(req, res)
  return res
}
// Creates a Stripe-path review through the real verify route. Requires the Stripe env (see stripeEnv).
const createStripeReview = async ({ cookie = 'shopify_customer_token=good-token', body } = {}) => {
  const res = await callVerify({ cookie, body: body === undefined ? stripeBody() : body })
  if (res.statusCode !== 200 || !res.body.verificationUrl) throw new Error('stripe review not created: ' + res.statusCode + ' ' + JSON.stringify(res.body))
  const record = await review.getReview(res.body.reviewId)
  return { reviewId: res.body.reviewId, sessionId: record.stripeSessionId, res }
}
const stripeCalls = () => calls.filter((c) => new URL(c.url).hostname === 'api.stripe.com')
const slackPosts = () => calls.filter((c) => c.url.startsWith('https://hooks.slack.com/services/')).map((c) => JSON.parse(c.body))
const tagCalls = () => calls.filter((c) => c.body.includes('tagsAdd('))
const gqlCalls = () => calls.filter((c) => c.url.includes('/graphql') && !c.url.includes('/account/customer/api/')) // Admin API only
const slackReplies = () => calls.filter((c) => c.url.startsWith('https://hooks.slack.com/actions/')).map((c) => JSON.parse(c.body))
const emit = (o) => process.stdout.write('\\n__TRIBAL_RESULT__' + JSON.stringify(o) + '\\n')
`

/**
 * Runs `body` (async ESM code using the preamble helpers) in a child process
 * and returns whatever it passes to emit(...).
 */
function run(body, env = {}) {
  const script = `${PREAMBLE}\n${body}\n`
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...BASE_ENV, ...env },
    maxBuffer: 16 * 1024 * 1024,
  })
  const line = out.split('\n').reverse().find((l) => l.startsWith('__TRIBAL_RESULT__'))
  if (!line) throw new Error('no result emitted. stdout was:\n' + out.slice(-2000))
  return JSON.parse(line.slice('__TRIBAL_RESULT__'.length))
}

const stripeEnv = {
  STRIPE_IDENTITY_ENABLED: 'true',
  STRIPE_IDENTITY_RESTRICTED_KEY: STRIPE_KEY,
  STRIPE_IDENTITY_WEBHOOK_SECRET: STRIPE_WEBHOOK_SECRET,
  TRIBAL_STRIPE_RETURN_BASE_URL: 'https://www.displaycellpros.com',
}
const redisEnv = { UPSTASH_REDIS_REST_URL: REDIS_URL, UPSTASH_REDIS_REST_TOKEN: 'test-redis-token' }

module.exports = { stripeEnv, STRIPE_KEY, STRIPE_WEBHOOK_SECRET, DUP_SECRET, run, repoRoot, fileUrl, BASE_ENV, redisEnv, RAW_ID, SIGNING_SECRET, SLACK_WEBHOOK, SHOP, crypto }
