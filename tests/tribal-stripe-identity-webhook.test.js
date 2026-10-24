/**
 * @jest-environment node
 *
 * Stripe Identity (TEST MODE) for tribal verification, part 2: POST /api/webhooks/stripe-identity.
 *
 * Signature + timestamp tolerance, the STRIPE_IDENTITY_ENABLED 404 gate, idempotent repeats,
 * the four handled event types, out-of-order delivery, live-mode rejection, "never tags
 * Shopify", and "no document data in logs / Slack". Mocked fetch only; no real Stripe call.
 */
const { run, redisEnv, stripeEnv, STRIPE_WEBHOOK_SECRET } = require('./helpers/tribal-harness')

const env = { ...redisEnv, ...stripeEnv }
const ROUTE = '/api/webhooks/stripe-identity'

describe('webhook gating and method', () => {
  test('route path is /api/webhooks/stripe-identity', () => {
    const fs = require('fs')
    expect(fs.existsSync(require('path').join(__dirname, '..', 'pages', 'api', 'webhooks', 'stripe-identity.ts'))).toBe(true)
    expect(ROUTE).toBe('/api/webhooks/stripe-identity')
  })

  test.each([[undefined], [''], ['false'], ['TRUE'], ['1'], [' true']])('STRIPE_IDENTITY_ENABLED=%j: 404 for everything, even a correctly signed event; independent of TRIBAL_VERIFY_ENABLED', (v) => {
    const x = run(
      `
      const { reviewId, sessionId } = await createStripeReview()
      process.env.STRIPE_IDENTITY_ENABLED = ${JSON.stringify(v)} === undefined ? '' : ${JSON.stringify(v)}
      if (${JSON.stringify(v)} === undefined) delete process.env.STRIPE_IDENTITY_ENABLED
      const a = await callStripeWebhook({ event: stripeEvent('identity.verification_session.verified', { reviewId, sessionId }) })
      const b = await callStripeWebhook({ method: 'GET' })
      emit({ a: a.statusCode, b: b.statusCode, slack: slackPosts().length })
      `,
      env
    )
    expect(x.a).toBe(404)
    expect(x.b).toBe(404)
    expect(x.slack).toBe(0)
  })

  test('works with TRIBAL_VERIFY_ENABLED off (webhook is independent of the verify flag)', () => {
    const x = run(
      `
      const { reviewId, sessionId } = await createStripeReview()
      process.env.TRIBAL_VERIFY_ENABLED = 'false'
      const a = await callStripeWebhook({ event: stripeEvent('identity.verification_session.verified', { reviewId, sessionId }) })
      emit({ a: a.statusCode, slack: slackPosts().length })
      `,
      env
    )
    expect(x.a).toBe(200)
    expect(x.slack).toBe(1)
  })

  test.each([['GET'], ['PUT'], ['DELETE'], ['PATCH']])('%s is 405 with Allow: POST when enabled', (m) => {
    const x = run(`const r = await callStripeWebhook({ method: ${JSON.stringify(m)} }); emit({ code: r.statusCode, allow: r.headers.Allow })`, env)
    expect(x).toEqual({ code: 405, allow: 'POST' })
  })

  test('enabled but STRIPE_IDENTITY_WEBHOOK_SECRET missing: 500, nothing processed', () => {
    const x = run(`const r = await callStripeWebhook({ event: stripeEvent('identity.verification_session.verified', {}) }); emit({ code: r.statusCode })`, { ...env, STRIPE_IDENTITY_WEBHOOK_SECRET: '' })
    expect(x.code).toBe(500)
  })

  test('Redis not configured in production: 503 (no silent in-memory fallback)', () => {
    const x = run(`const r = await callStripeWebhook({ event: stripeEvent('identity.verification_session.verified', {}) }); emit({ code: r.statusCode })`, { ...stripeEnv, NODE_ENV: 'production' })
    expect(x.code).toBe(503)
  })
})

describe('signature and timestamp verification', () => {
  let r
  beforeAll(() => {
    r = run(
      `
      const { reviewId, sessionId } = await createStripeReview()
      const ev = stripeEvent('identity.verification_session.verified', { reviewId, sessionId })
      const raw = JSON.stringify(ev)
      const now = Math.floor(Date.now() / 1000)
      const codes = {}
      codes.nosig = (await callStripeWebhook({ raw, sig: null })).statusCode
      codes.garbage = (await callStripeWebhook({ raw, sig: 'garbage' })).statusCode
      codes.wrongSecret = (await callStripeWebhook({ raw, secret: 'whsec_WRONGWRONGWRONG' })).statusCode
      codes.tampered = (await callStripeWebhook({ raw: raw.replace('verified', 'verifiex'), sig: stripeSign(raw, now) })).statusCode
      codes.tamperedId = (await callStripeWebhook({ raw: raw.replace(sessionId, 'vs_TESTEVIL999'), sig: stripeSign(raw, now) })).statusCode
      codes.stale = (await callStripeWebhook({ raw, ts: now - 301 })).statusCode
      codes.future = (await callStripeWebhook({ raw, ts: now + 400 })).statusCode
      codes.badScheme = (await callStripeWebhook({ raw, sig: stripeSign(raw, now).replace('v1=', 'v0=') })).statusCode
      codes.jsonReserialized = (await callStripeWebhook({ raw: JSON.stringify(ev, null, 2), sig: stripeSign(raw, now) })).statusCode
      const rejected = { slack: slackPosts().length, rec: await review.getReview(reviewId), eventKeys: redisOps.filter((o) => o.args[0].startsWith('tribal:stripe-event:')).length }
      const bodies = []
      for (const k of ['nosig', 'garbage']) bodies.push(JSON.stringify((await callStripeWebhook({ raw, sig: k === 'nosig' ? null : 'garbage' })).body))
      codes.ok = (await callStripeWebhook({ raw, ts: now - 290 })).statusCode
      emit({ codes, rejected, bodies, logs, after: { slack: slackPosts().length } })
      `,
      env
    )
  })

  test.each([['nosig'], ['garbage'], ['wrongSecret'], ['tampered'], ['tamperedId'], ['stale'], ['future'], ['badScheme'], ['jsonReserialized']])('%s is rejected with 400', (k) => {
    expect(r.codes[k]).toBe(400)
  })

  test('rejected requests have no side effects (no Slack post, no state change, event not recorded)', () => {
    expect(r.rejected.slack).toBe(0)
    expect(r.rejected.rec.stripeStatus).toBe('created')
    expect(r.rejected.eventKeys).toBe(0)
  })

  test('a valid signature within the 5 minute tolerance is accepted', () => {
    expect(r.codes.ok).toBe(200)
    expect(r.after.slack).toBe(1)
  })

  test('error responses reveal nothing about why they failed', () => {
    for (const b of r.bodies) expect(JSON.parse(b)).toEqual({ error: 'Invalid signature' })
  })

  test('the webhook signing secret never appears in logs', () => {
    for (const l of r.logs) expect(l.text).not.toContain(STRIPE_WEBHOOK_SECRET)
  })

  test('oversized bodies (>1 MB) are refused before parsing', () => {
    const x = run(`const r = await callStripeWebhook({ raw: 'x'.repeat(1024 * 1024 + 10), sig: 't=1,v1=00' }); emit({ code: r.statusCode })`, env)
    expect(x.code).toBe(413)
  })
})

describe('event handling', () => {
  const flow = (types) =>
    run(
      `
      const { reviewId, sessionId } = await createStripeReview()
      const results = []
      for (const t of ${JSON.stringify(types)}) {
        const [type, code] = t.split('|')
        const res = await callStripeWebhook({ event: stripeEvent(type, { reviewId, sessionId, lastErrorCode: code }) })
        results.push({ type, code: res.statusCode, body: res.body })
      }
      const rec = await review.getReview(reviewId)
      const posts = slackPosts()
      emit({ results, rec, posts, tags: tagCalls().length, gql: gqlCalls().length, logs, stripeAfter: stripeCalls().length })
      `,
      env
    )
  const text = (p) => JSON.stringify(p)

  test('verified: one Slack post "Stripe passed" with Approve/Deny; record updated; customer is NOT tagged', () => {
    const x = flow(['identity.verification_session.verified'])
    expect(x.results[0].code).toBe(200)
    expect(x.posts).toHaveLength(1)
    expect(text(x.posts[0])).toMatch(/Stripe passed/)
    expect(text(x.posts[0])).toMatch(/tribal_approve/)
    expect(text(x.posts[0])).toMatch(/tribal_deny/)
    expect(x.rec).toMatchObject({ status: 'pending', stripeStatus: 'verified', stripeLivemode: false })
    expect(x.tags).toBe(0)
    expect(x.gql).toBe(0)
  })

  test('requires_input: one Slack post "needs manual review" with a sanitized reason code; still pending, not tagged', () => {
    const x = flow(['identity.verification_session.requires_input|document_expired'])
    expect(x.posts).toHaveLength(1)
    expect(text(x.posts[0])).toMatch(/needs manual review/i)
    expect(text(x.posts[0])).toContain('document_expired')
    expect(text(x.posts[0])).not.toContain('redacted reason text')
    expect(x.rec).toMatchObject({ status: 'pending', stripeStatus: 'requires_input', stripeReasonCode: 'document_expired' })
    expect(x.tags).toBe(0)
  })

  test('a malformed reason code is dropped, never echoed', () => {
    const x = flow(['identity.verification_session.requires_input|<script>alert(1)</script>'])
    expect(x.rec.stripeReasonCode).toBe('unspecified')
    expect(text(x.posts[0])).not.toContain('<script>')
  })

  test('processing: recorded, no Slack post, no Shopify call', () => {
    const x = flow(['identity.verification_session.processing'])
    expect(x.results[0].code).toBe(200)
    expect(x.posts).toHaveLength(0)
    expect(x.rec.stripeStatus).toBe('processing')
    expect(x.gql).toBe(0)
  })

  test('canceled: recorded, no Slack post, no Shopify call; terminal', () => {
    const x = flow(['identity.verification_session.canceled', 'identity.verification_session.verified'])
    expect(x.rec.stripeStatus).toBe('canceled')
    expect(x.posts).toHaveLength(0)
    expect(x.tags).toBe(0)
  })

  test('typical sequence processing -> verified posts exactly once', () => {
    const x = flow(['identity.verification_session.processing', 'identity.verification_session.verified'])
    expect(x.posts).toHaveLength(1)
    expect(x.rec.stripeStatus).toBe('verified')
  })

  test('out-of-order: a late "processing" after "verified" never moves the status backwards or re-posts', () => {
    const x = flow(['identity.verification_session.verified', 'identity.verification_session.processing'])
    expect(x.rec.stripeStatus).toBe('verified')
    expect(x.posts).toHaveLength(1)
    expect(x.results[1].body).toMatchObject({ ignored: true })
  })

  test('failed attempt then retry: requires_input followed by verified posts both outcomes once each', () => {
    const x = flow(['identity.verification_session.requires_input|selfie_face_mismatch', 'identity.verification_session.verified'])
    expect(x.posts).toHaveLength(2)
    expect(x.rec.stripeStatus).toBe('verified')
  })

  test('no network call to Stripe at all while handling events (no session retrieve, so no document data is touched)', () => {
    const x = flow(['identity.verification_session.verified'])
    expect(x.stripeAfter).toBe(1) // only the create from createStripeReview
  })

  test('no document data in logs: only event/session ids and messages', () => {
    const x = flow(['identity.verification_session.requires_input|document_expired', 'identity.verification_session.verified'])
    for (const l of x.logs) expect(l.text).not.toMatch(/Stripe\d+|Person\d+|stripe\d+@example|document_number|dob|selfie_image|redacted reason text/)
  })

  test('Slack posts show only a masked email and the last initial', () => {
    const x = flow(['identity.verification_session.verified'])
    expect(text(x.posts)).not.toMatch(/stripe\d+@example/)
    expect(text(x.posts)).toContain('s***@example.com')
    expect(text(x.posts)).not.toMatch(/Person\d/)
  })

  test('other event types are acknowledged and ignored', () => {
    const x = run(
      `
      const { reviewId, sessionId } = await createStripeReview()
      const a = await callStripeWebhook({ event: stripeEvent('identity.verification_session.created', { reviewId, sessionId }) })
      const b = await callStripeWebhook({ event: stripeEvent('identity.verification_session.redacted', { reviewId, sessionId }) })
      const c = await callStripeWebhook({ event: stripeEvent('charge.succeeded', { reviewId, sessionId }) })
      emit({ codes: [a, b, c].map((r) => r.statusCode), posts: slackPosts().length, rec: await review.getReview(reviewId) })
      `,
      env
    )
    expect(x.codes).toEqual([200, 200, 200])
    expect(x.posts).toBe(0)
    expect(x.rec.stripeStatus).toBe('created')
  })

  test('events that do not map to one of our sessions are acknowledged and ignored (forged metadata, wrong session id, unknown review)', () => {
    const x = run(
      `
      const { reviewId, sessionId } = await createStripeReview()
      const other = await createStripeReview()
      const a = await callStripeWebhook({ event: stripeEvent('identity.verification_session.verified', { reviewId, sessionId: other.sessionId }) }) // mismatched pair
      const b = await callStripeWebhook({ event: stripeEvent('identity.verification_session.verified', { reviewId: '00000000-0000-4000-8000-000000000000', sessionId }) })
      const c = await callStripeWebhook({ event: stripeEvent('identity.verification_session.verified', { sessionId, metadata: {} }) })
      const d = await callStripeWebhook({ event: stripeEvent('identity.verification_session.verified', { reviewId, sessionId: '../x' }) })
      emit({ codes: [a, b, c, d].map((r) => r.statusCode), posts: slackPosts().length })
      `,
      env
    )
    expect(x.codes).toEqual([200, 200, 200, 200])
    expect(x.posts).toBe(0)
  })

  test('a review that already has a human decision is not touched by later events', () => {
    const x = run(
      `
      const { reviewId, sessionId } = await createStripeReview()
      await callStripeWebhook({ event: stripeEvent('identity.verification_session.verified', { reviewId, sessionId }) })
      await callInteract({ payload: interactionPayload(reviewId, 'tribal_deny') })
      const before = slackPosts().length
      const r = await callStripeWebhook({ event: stripeEvent('identity.verification_session.requires_input', { reviewId, sessionId, lastErrorCode: 'x' }) })
      emit({ body: r.body, same: slackPosts().length === before, rec: await review.getReview(reviewId) })
      `,
      env
    )
    expect(x.body).toMatchObject({ ignored: true })
    expect(x.same).toBe(true)
    expect(x.rec.status).toBe('denied')
  })
})

describe('idempotency and retries', () => {
  test('the same event delivered repeatedly (sequentially or concurrently) posts to Slack once', () => {
    const x = run(
      `
      const { reviewId, sessionId } = await createStripeReview()
      const ev = stripeEvent('identity.verification_session.verified', { reviewId, sessionId })
      const seq = []
      for (let i = 0; i < 3; i++) seq.push((await callStripeWebhook({ event: ev })).body)
      const ev2 = stripeEvent('identity.verification_session.requires_input', { reviewId, sessionId, lastErrorCode: 'x' })
      const created2 = await createStripeReview()
      const ev3 = stripeEvent('identity.verification_session.verified', created2)
      const conc = await Promise.all([1, 2, 3, 4, 5].map(() => callStripeWebhook({ event: ev3 })))
      emit({ seq, concCodes: conc.map((r) => r.statusCode), posts: slackPosts().length })
      `,
      env
    )
    expect(x.seq[0]).toEqual({ received: true })
    expect(x.seq[1]).toMatchObject({ duplicate: true })
    expect(x.concCodes.every((c) => c === 200)).toBe(true)
    expect(x.posts).toBe(2) // one per review
  })

  test('a different event id for the same outcome (Stripe re-sent as a new event) does not double-post', () => {
    const x = run(
      `
      const { reviewId, sessionId } = await createStripeReview()
      for (let i = 0; i < 3; i++) await callStripeWebhook({ event: stripeEvent('identity.verification_session.verified', { reviewId, sessionId }) })
      emit({ posts: slackPosts().length })
      `,
      env
    )
    expect(x.posts).toBe(1)
  })

  test('Slack failure: 500 so Stripe retries, and the retry succeeds (claims were released)', () => {
    const x = run(
      `
      const { reviewId, sessionId } = await createStripeReview()
      const ev = stripeEvent('identity.verification_session.verified', { reviewId, sessionId })
      globalThis.slackWebhookOk = false
      const a = await callStripeWebhook({ event: ev })
      const midRec = await review.getReview(reviewId)
      globalThis.slackWebhookOk = true
      const b = await callStripeWebhook({ event: ev })
      emit({ a: a.statusCode, aBody: a.body, mid: midRec.stripeStatus, b: b.statusCode, bBody: b.body, rec: await review.getReview(reviewId) })
      `,
      env
    )
    expect(x.a).toBe(500)
    expect(x.aBody).toEqual({ error: 'Processing failed' })
    expect(x.mid).toBe('created')
    expect(x.b).toBe(200)
    expect(x.bBody).toEqual({ received: true })
    expect(x.rec.stripeStatus).toBe('verified')
  })
})

describe('live-mode events are rejected while the test-mode guard is on', () => {
  test('a validly signed livemode event is refused (400): no Slack post, no state change; allowed only with the guard explicitly off', () => {
    const x = run(
      `
      const { reviewId, sessionId } = await createStripeReview()
      const a = await callStripeWebhook({ event: stripeEvent('identity.verification_session.verified', { reviewId, sessionId, livemode: true }) })
      const rec = await review.getReview(reviewId)
      const posts = slackPosts().length
      process.env.TRIBAL_STRIPE_TEST_MODE_ONLY = 'false'
      const b = await callStripeWebhook({ event: stripeEvent('identity.verification_session.verified', { reviewId, sessionId, livemode: true }) })
      emit({ a: a.statusCode, status: rec.stripeStatus, posts, b: b.statusCode, after: slackPosts().length })
      `,
      env
    )
    expect(x.a).toBe(400)
    expect(x.status).toBe('created')
    expect(x.posts).toBe(0)
    expect(x.b).toBe(200)
    expect(x.after).toBe(1)
  })
})

describe('the webhook never touches Shopify', () => {
  test('source guard: route and Stripe lib contain no Shopify admin / tagging calls', () => {
    const fs = require('fs')
    const path = require('path')
    for (const f of ['pages/api/webhooks/stripe-identity.ts', 'lib/tribal/stripe-identity.ts']) {
      const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
      expect(src).not.toMatch(/shopify-admin|tagsAdd|customerUpdate|addCustomerTag|taxExempt/i)
    }
  })

  test('all four handled event types across a full run make zero Shopify Admin or Customer API calls after the review exists', () => {
    const x = run(
      `
      const { reviewId, sessionId } = await createStripeReview()
      const before = calls.length
      for (const t of ['processing', 'requires_input', 'verified', 'canceled']) await callStripeWebhook({ event: stripeEvent('identity.verification_session.' + t, { reviewId, sessionId, lastErrorCode: 'x' }) })
      const shopifyAfter = calls.slice(before).filter((c) => /myshopify|shopify\\.com|account\\/customer/.test(c.url)).length
      emit({ shopifyAfter })
      `,
      env
    )
    expect(x.shopifyAfter).toBe(0)
  })
})
