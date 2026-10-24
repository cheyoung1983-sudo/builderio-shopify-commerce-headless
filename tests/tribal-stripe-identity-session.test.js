/**
 * @jest-environment node
 *
 * Stripe Identity (TEST MODE) for tribal verification, part 1: session creation in
 * /api/tribal/verify, gating, key guard, duplicate/consent handling on the Stripe path,
 * retention (redaction after a decision), and a client-bundle guard.
 *
 * No real Stripe call is ever made: the harness mocks fetch at the network level and
 * blocks (and records) anything unmocked. Keys used here are obviously fake.
 */
const fs = require('fs')
const path = require('path')
const { run, redisEnv, stripeEnv, STRIPE_KEY, repoRoot } = require('./helpers/tribal-harness')

const env = { ...redisEnv, ...stripeEnv }

describe('stripe path: session creation request', () => {
  let r
  beforeAll(() => {
    r = run(
      `
      const out = await callVerify({ cookie: 'shopify_customer_token=good-token', body: stripeBody({ firstName: 'Mary', lastName: 'Whitehorse', email: 'mary@example.com', tribalNation: 'Navajo Nation' }) })
      const set = redisOps.find((o) => o.op === 'SET' && o.args[0].startsWith('tribal:review:'))
      const rec = JSON.parse(set.args[1])
      emit({ res: summarize(out), stripe: stripeCalls(), slack: slackPosts().length, rec, setArgs: set.args.slice(2), unmocked, calls: calls.map((c) => c.url), graphql: gqlCalls().length })
      `,
      env
    )
  })

  test('returns only the hosted URL and ids; never verified; nothing posted to Slack yet; no Shopify write', () => {
    expect(r.res.statusCode).toBe(200)
    expect(r.res.body).toMatchObject({ success: true, verified: false, pendingReview: true })
    expect(r.res.body.verificationUrl).toMatch(/^https:\/\/verify\.stripe\.com\//)
    expect(r.res.body).toMatchObject({ discountApplied: false, taxExemptionApplied: false })
    expect(JSON.stringify(r.res.body)).not.toMatch(/Mary|Whitehorse|mary@example|Navajo/)
    expect(r.slack).toBe(0)
    expect(r.graphql).toBe(0)
  })

  test('exactly one Stripe call (create) with document + live capture + selfie and ONLY the request id as metadata', () => {
    expect(r.stripe).toHaveLength(1)
    const c = r.stripe[0]
    expect(c.method).toBe('POST')
    expect(new URL(c.url).pathname).toBe('/v1/identity/verification_sessions')
    const p = new URLSearchParams(c.body)
    expect(p.get('type')).toBe('document')
    expect(p.get('options[document][require_live_capture]')).toBe('true')
    expect(p.get('options[document][require_matching_selfie]')).toBe('true')
    expect([0, 1, 2].map((i) => p.get(`options[document][allowed_types][${i}]`))).toEqual(['driving_license', 'id_card', 'passport'])
    expect(p.get('return_url')).toBe('https://www.displaycellpros.com/tribal/verification-submitted')
    expect([...p.keys()].filter((k) => k.startsWith('metadata['))).toEqual(['metadata[request_id]'])
    expect(p.get('metadata[request_id]')).toBe(r.res.body.reviewId)
  })

  test('no name, email, tribe or ID data is sent to Stripe', () => {
    const body = decodeURIComponent(r.stripe[0].body)
    for (const s of ['Mary', 'Whitehorse', 'mary@example.com', 'Navajo']) expect(body).not.toContain(s)
  })

  test('the key never appears in a URL and nothing unmocked is called', () => {
    expect(r.calls.every((u) => !u.includes(STRIPE_KEY))).toBe(true)
    expect(r.unmocked).toEqual([])
  })

  test('the stored record has consent, session id, masked data only (last initial, no raw ID, no birth date)', () => {
    expect(r.rec).toMatchObject({ status: 'pending', source: 'stripe_identity', firstName: 'Mary', lastInitial: 'W', stripeStatus: 'created' })
    expect(r.rec.stripeSessionId).toMatch(/^vs_/)
    expect(r.rec.consentVersion).toMatch(/^tribal-id-consent-/)
    expect(r.rec).not.toHaveProperty('lastName')
    expect(JSON.stringify(r.rec)).not.toMatch(/Whitehorse|birth/i)
    expect(r.setArgs).toEqual(['ex', String(60 * 60 * 24 * 30)])
  })
})

describe('stripe path: gating (both TRIBAL_VERIFY_ENABLED and STRIPE_IDENTITY_ENABLED must be on)', () => {
  const scenario = (e) =>
    run(
      `
      const res = await callVerify({ cookie: 'shopify_customer_token=good-token', body: validBody({ email: 'ann@example.com' }) })
      emit({ res: summarize(res), stripe: stripeCalls().length, slack: slackPosts().length })
      `,
      e
    )

  test('Stripe enabled but TRIBAL_VERIFY_ENABLED off: 501, no Stripe call', () => {
    const x = scenario({ ...env, TRIBAL_VERIFY_ENABLED: 'false' })
    expect(x.res.statusCode).toBe(501)
    expect(x.stripe).toBe(0)
  })

  test.each([[''], ['false'], ['TRUE'], ['1'], [' true']])('TRIBAL_VERIFY_ENABLED on, STRIPE_IDENTITY_ENABLED=%j: manual review (202), no Stripe call', (v) => {
    const x = scenario({ ...env, STRIPE_IDENTITY_ENABLED: v })
    expect(x.res.statusCode).toBe(202)
    expect(x.res.body.verificationUrl).toBeUndefined()
    expect(x.stripe).toBe(0)
    expect(x.slack).toBe(1)
  })

  test('both on but the customer asks for manual review: manual path, no Stripe call', () => {
    const x = run(
      `
      const res = await callVerify({ body: validBody({ manualReview: true }) })
      emit({ res: summarize(res), stripe: stripeCalls().length })
      `,
      env
    )
    expect(x.res.statusCode).toBe(202)
    expect(x.stripe).toBe(0)
  })
})

describe('stripe path: key guard (test mode only)', () => {
  const attempt = (e) =>
    run(
      `
      const res = await callVerify({ body: stripeBody() })
      emit({ res: summarize(res), stripe: stripeCalls().length, slack: slackPosts().length, logs, reviews: redisOps.filter((o) => o.op === 'SET' && o.args[0].startsWith('tribal:review:')).length })
      `,
      { ...env, ...e }
    )

  test.each([
    ['live secret key', 'sk_' + 'live_FAKEFAKEFAKEFAKE0001'],
    ['live restricted key', 'rk_' + 'live_FAKEFAKEFAKEFAKE0001'],
    ['malformed key', 'not-a-key'],
    ['missing key', ''],
  ])('%s is refused: 503, no Stripe call, key never logged or returned', (_n, key) => {
    const x = attempt({ STRIPE_IDENTITY_RESTRICTED_KEY: key })
    expect(x.res.statusCode).toBe(503)
    expect(x.res.body.verified).toBe(false)
    expect(x.stripe).toBe(0)
    expect(x.slack).toBe(0)
    if (key) {
      expect(JSON.stringify(x.res.body)).not.toContain(key)
      for (const l of x.logs) expect(l.text).not.toContain(key)
    }
  })

  test.each([['sk_test_FAKEFAKEFAKEFAKE0002'], ['rk_test_FAKEFAKEFAKEFAKE0003']])('%s is accepted', (key) => {
    expect(attempt({ STRIPE_IDENTITY_RESTRICTED_KEY: key }).res.statusCode).toBe(200)
  })

  test('only an explicit TRIBAL_STRIPE_TEST_MODE_ONLY=false lifts the guard (not done anywhere in this PR)', () => {
    expect(attempt({ STRIPE_IDENTITY_RESTRICTED_KEY: 'rk_' + 'live_FAKEFAKEFAKEFAKE0001' }).res.statusCode).toBe(503)
    expect(attempt({ STRIPE_IDENTITY_RESTRICTED_KEY: 'rk_' + 'live_FAKEFAKEFAKEFAKE0001', TRIBAL_STRIPE_TEST_MODE_ONLY: 'FALSE' }).res.statusCode).toBe(200)
    expect(attempt({ STRIPE_IDENTITY_RESTRICTED_KEY: 'rk_' + 'live_FAKEFAKEFAKEFAKE0001', TRIBAL_STRIPE_TEST_MODE_ONLY: 'true' }).res.statusCode).toBe(503)
  })

  test('return URL host must be allowlisted (an attacker-controlled base is refused)', () => {
    const x = attempt({ TRIBAL_STRIPE_RETURN_BASE_URL: 'https://evil.example.com' })
    expect(x.res.statusCode).toBe(503)
    expect(x.stripe).toBe(0)
  })
})

describe('stripe path: failures fail closed', () => {
  test('Stripe API failure: 503, claims released (customer can retry), nothing posted, no record left', () => {
    const x = run(
      `
      globalThis.stripeMock.createFails = true
      const body = stripeBody()
      const a = await callVerify({ body })
      globalThis.stripeMock.createFails = false
      const b = await callVerify({ body })
      emit({ a: summarize(a), b: summarize(b), slack: slackPosts().length })
      `,
      env
    )
    expect(x.a.statusCode).toBe(503)
    expect(x.a.body).toMatchObject({ success: false, verified: false })
    expect(x.b.statusCode).toBe(200)
    expect(x.slack).toBe(0)
  })

  test('production without Redis: 503 and no Stripe call', () => {
    const x = run(`const res = await callVerify({ body: stripeBody() }); emit({ res: summarize(res), stripe: stripeCalls().length })`, { ...stripeEnv, NODE_ENV: 'production' })
    expect(x.res.statusCode).toBe(503)
    expect(x.stripe).toBe(0)
  })

  test('Stripe path requires an email (for the result notification) and consent', () => {
    const x = run(
      `
      const a = await callVerify({ body: stripeBody({ email: undefined }) })
      const b = await callVerify({ body: stripeBody({ consent: false }) })
      emit({ codes: [a.statusCode, b.statusCode], stripe: stripeCalls().length })
      `,
      env
    )
    expect(x.codes).toEqual([400, 400])
    expect(x.stripe).toBe(0)
  })

  test('duplicate: the same person cannot start a second session; no Stripe call, no Slack post', () => {
    const x = run(
      `
      const body = stripeBody()
      const a = await callVerify({ body })
      const b = await callVerify({ body: { ...body, firstName: ' ' + body.firstName.toUpperCase() } })
      emit({ a: a.statusCode, b: summarize(b), stripe: stripeCalls().length, slack: slackPosts().length })
      `,
      env
    )
    expect(x.a).toBe(200)
    expect(x.b.statusCode).toBe(409)
    expect(x.b.body.verificationUrl).toBeUndefined()
    expect(x.stripe).toBe(1)
    expect(x.slack).toBe(0)
  })

  test('a canceled or abandoned (24h) Stripe attempt does not lock the person out', () => {
    const x = run(
      `
      const body = stripeBody()
      const first = await createStripeReview({ body })
      // canceled via webhook
      await callStripeWebhook({ event: stripeEvent('identity.verification_session.canceled', first) })
      const afterCancel = await callVerify({ body })
      // abandoned: a second person never finishes, 25h pass
      const body2 = stripeBody()
      await createStripeReview({ body: body2 })
      advanceTime(25 * 60 * 60 * 1000)
      const afterAbandon = await callVerify({ body: body2 })
      emit({ afterCancel: afterCancel.statusCode, afterAbandon: afterAbandon.statusCode })
      `,
      env
    )
    expect(x.afterCancel).toBe(200)
    expect(x.afterAbandon).toBe(200)
  })
})

describe('retention: Stripe session is redacted after the human decision', () => {
  const approve = `
      const { reviewId, sessionId } = await createStripeReview()
      await callStripeWebhook({ event: stripeEvent('identity.verification_session.verified', { reviewId, sessionId }) })
  `
  test.each([['tribal_approve'], ['tribal_deny']])('%s triggers exactly one redact call for that session and records it', (action) => {
    const x = run(
      `
      ${approve}
      const res = await callInteract({ payload: interactionPayload(reviewId, ${JSON.stringify('ACTION')}) })
      const rec = await review.getReview(reviewId)
      emit({ code: res.statusCode, redacts: stripeCalls().filter((c) => c.url.endsWith('/redact')).map((c) => new URL(c.url).pathname), sessionId, rec, replies: slackReplies() })
      `.replace('ACTION', action),
      env
    )
    expect(x.code).toBe(200)
    expect(x.redacts).toEqual([`/v1/identity/verification_sessions/${x.sessionId}/redact`])
    expect(x.rec.redaction).toBe('requested')
    expect(x.rec.status).toBe(action === 'tribal_approve' ? 'approved' : 'denied')
  })

  test('transient redaction errors are retried; a persistent failure is surfaced but never blocks the decision', () => {
    const x = run(
      `
      ${approve}
      globalThis.stripeMock.redactAlways = true
      const res = await callInteract({ payload: interactionPayload(reviewId, 'tribal_approve') })
      const rec = await review.getReview(reviewId)
      emit({ code: res.statusCode, status: rec.status, redaction: rec.redaction, attempts: stripeCalls().filter((c) => c.url.endsWith('/redact')).length, replies: JSON.stringify(slackReplies()), logs })
      `,
      env
    )
    expect(x.code).toBe(200)
    expect(x.status).toBe('approved')
    expect(x.redaction).toBe('failed')
    expect(x.attempts).toBeGreaterThan(1)
    expect(x.replies).toMatch(/redact/i)
    for (const l of x.logs) expect(l.text).not.toMatch(/rk_test_|whsec_/)
  })

  test('a single transient failure then success ends as requested', () => {
    const x = run(
      `
      ${approve}
      globalThis.stripeMock.redactFailsTimes = 1
      await callInteract({ payload: interactionPayload(reviewId, 'tribal_deny') })
      const rec = await review.getReview(reviewId)
      emit({ redaction: rec.redaction })
      `,
      env
    )
    expect(x.redaction).toBe('requested')
  })

  test('manual-path reviews (no Stripe session) make no Stripe call on decision', () => {
    const x = run(
      `
      const id = await createReview({ body: validBody({ manualReview: true }) })
      await callInteract({ payload: interactionPayload(id, 'tribal_deny') })
      emit({ stripe: stripeCalls().length })
      `,
      env
    )
    expect(x.stripe).toBe(0)
  })

  test('redactVerificationSession is retry-safe: "already redacted" counts as success; invalid ids are skipped', () => {
    const x = run(
      `
      globalThis.stripeMock.redactAlways = true
      globalThis.stripeMock.redactErrorMessage = 'This VerificationSession has already been redacted'
      const a = await stripeLib.redactVerificationSession('vs_TEST000001', { env: process.env, sleep: async () => {} })
      globalThis.stripeMock.redactAlways = false
      const b = await stripeLib.redactVerificationSession('../../etc', { env: process.env })
      const c = await stripeLib.redactAfterDecision({}, { env: process.env })
      emit({ a, b, c })
      `,
      env
    )
    expect(x.a.status).toBe('requested')
    expect(x.b.status).toBe('skipped')
    expect(x.c.status).toBe('skipped')
  })
})

describe('client bundle guard', () => {
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
      const p = path.join(dir, d.name)
      if (d.isDirectory()) return ['node_modules', '.next', 'api'].includes(d.name) ? [] : walk(p)
      return /\.(tsx?|jsx?)$/.test(d.name) ? [p] : []
    })

  test('no client-side code (components, blocks, hooks, context, non-API pages) imports stripe or the server-only module', () => {
    const files = ['components', 'blocks', 'hooks', 'context', 'pages'].filter((d) => fs.existsSync(path.join(repoRoot, d))).flatMap((d) => walk(path.join(repoRoot, d)))
    expect(files.length).toBeGreaterThan(10)
    const offenders = files.filter((f) => /from ['"](stripe|.*lib\/tribal\/(stripe-identity|manual-review|duplicate))(\.ts)?['"]|STRIPE_IDENTITY_/.test(fs.readFileSync(f, 'utf8')))
    expect(offenders.map((f) => path.relative(repoRoot, f))).toEqual([])
  })

  test('the Stripe env var names are never NEXT_PUBLIC_', () => {
    const files = [path.join(repoRoot, '.env.example'), path.join(repoRoot, 'lib/tribal/stripe-identity.ts')]
    for (const f of files) expect(fs.readFileSync(f, 'utf8')).not.toMatch(/NEXT_PUBLIC_STRIPE_IDENTITY/)
  })
})
