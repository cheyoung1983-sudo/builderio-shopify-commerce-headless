/**
 * Tribal approval security: every path that can add the `tribal-member-verified`
 * tag is reviewer-gated and goes through the TRIBAL_SHOPIFY_TAG_MODE gate.
 * Runs in child processes through the shared tribal harness (no real network).
 */
const fs = require('node:fs')
const path = require('node:path')
const { run, fileUrl, repoRoot, crypto } = require('./helpers/tribal-harness')

const PERSONA_SECRET = 'persona-test-secret-not-real'
const RAW_ENROLLMENT = 'YAK-55555-SECRET'

const SETUP = `
const tagGate = await import(${JSON.stringify(fileUrl('lib/tribal/tag-gate.ts'))})
const adminAuth = await import(${JSON.stringify(fileUrl('lib/tribal/admin-auth.ts'))})
const { handleAdminDecision } = await import(${JSON.stringify(fileUrl('lib/tribal/admin-decision.ts'))})
const { handleAdminRequests } = await import(${JSON.stringify(fileUrl('lib/tribal/admin-requests.ts'))})
const personaRoute = (await import(${JSON.stringify(fileUrl('pages/api/webhooks/persona.ts'))})).default
const personaSig = await import(${JSON.stringify(fileUrl('lib/webhooks/persona-signature.ts'))})

const sessionAs = (email, extra = {}) => async () => (email ? { email, email_verified: true, ...extra } : null)
const RYAN = sessionAs('ryan@displaycellpros.com')
const callDecision = async ({ body, headers = {}, query = {}, resolveSession } = {}) => {
  const res = mkRes()
  await handleAdminDecision({ method: 'POST', headers, query, body }, res, { resolveSession: resolveSession || (async () => null) })
  return summarize(res)
}
const makePending = async (customerId = 'gid://shopify/Customer/1', extra = {}) => {
  const rec = { ...review.newReviewRecord({ firstName: 'Ann', lastName: 'Lee', tribalNation: 'Yakama Nation', customerId }), ...extra }
  await review.saveReview(rec)
  return rec
}
const callPersona = async (payload, { sign = true } = {}) => {
  const raw = Buffer.from(JSON.stringify(payload))
  const t = String(Math.floor(Date.now() / 1000))
  const req = Readable.from([raw])
  req.method = 'POST'
  req.headers = sign ? { 'persona-signature': 't=' + t + ',v1=' + personaSig.computePersonaSignature(${JSON.stringify(PERSONA_SECRET)}, t, raw) } : {}
  const res = mkRes()
  await personaRoute(req, res)
  return summarize(res)
}
const personaEvent = (inquiryId = 'inq_TEST0001') => ({
  data: {
    id: inquiryId,
    attributes: { status: 'completed', 'reference-id': 'gid://shopify/Customer/1',
      fields: { 'name-first': { value: 'Pat' }, 'name-last': { value: 'Doe' }, 'tribal-nation': { value: 'Yakama Nation' },
        'enrollment-number': { value: ${JSON.stringify(RAW_ENROLLMENT)} }, 'email-address': { value: 'pat@example.com' } } },
  },
  event: 'inquiry.completed',
})
`

const runT = (body, env = {}) => run(SETUP + body, env)

describe('tag gate (TRIBAL_SHOPIFY_TAG_MODE)', () => {
  test('mode parsing defaults to off and fails closed; allowlist normalizes ids', () => {
    const r = runT(`emit({
      unset: tagGate.getTribalShopifyTagMode({}),
      junk: tagGate.getTribalShopifyTagMode({ TRIBAL_SHOPIFY_TAG_MODE: 'yes' }),
      on: tagGate.getTribalShopifyTagMode({ TRIBAL_SHOPIFY_TAG_MODE: ' ON ' }),
      allow: tagGate.getTribalShopifyTagMode({ TRIBAL_SHOPIFY_TAG_MODE: 'allowlist' }),
      list: [...tagGate.getTribalTagAllowlist({ TRIBAL_TAG_ALLOWLIST: '123, gid://shopify/Customer/456 ,bogus,' })],
      offGate: tagGate.checkTribalTagGate('gid://shopify/Customer/1', 'ryan', {}),
      allowMiss: tagGate.checkTribalTagGate('gid://shopify/Customer/1', 'ryan', { TRIBAL_SHOPIFY_TAG_MODE: 'allowlist', TRIBAL_TAG_ALLOWLIST: '2' }),
      allowHit: tagGate.checkTribalTagGate('1', 'ryan', { TRIBAL_SHOPIFY_TAG_MODE: 'allowlist', TRIBAL_TAG_ALLOWLIST: 'gid://shopify/Customer/1' }),
      onGate: tagGate.checkTribalTagGate('gid://shopify/Customer/9', 'ryan', { TRIBAL_SHOPIFY_TAG_MODE: 'on' }),
      noReviewer: tagGate.checkTribalTagGate('gid://shopify/Customer/9', '  ', { TRIBAL_SHOPIFY_TAG_MODE: 'on' }),
      badCustomer: tagGate.checkTribalTagGate('guest', 'ryan', { TRIBAL_SHOPIFY_TAG_MODE: 'on' }),
    })`)
    expect(r.unset).toBe('off')
    expect(r.junk).toBe('off')
    expect(r.on).toBe('on')
    expect(r.allow).toBe('allowlist')
    expect(r.list).toEqual(['gid://shopify/Customer/123', 'gid://shopify/Customer/456'])
    expect(r.offGate).toEqual({ allowed: false, mode: 'off', reason: 'mode_off' })
    expect(r.allowMiss).toMatchObject({ allowed: false, reason: 'not_allowlisted' })
    expect(r.allowHit).toEqual({ allowed: true, mode: 'allowlist', customerGid: 'gid://shopify/Customer/1' })
    expect(r.onGate).toMatchObject({ allowed: true, mode: 'on' })
    expect(r.noReviewer).toMatchObject({ allowed: false, reason: 'no_reviewer' })
    expect(r.badCustomer).toMatchObject({ allowed: false, reason: 'invalid_customer' })
  })

  const approveWith = (env) =>
    runT(`
      const rec = await makePending('gid://shopify/Customer/1')
      const res = await callDecision({ body: { requestId: rec.id, action: 'approve' }, resolveSession: RYAN })
      emit({ res, tags: tagCalls().length, gql: gqlCalls().length, saved: await review.getReview(rec.id) })
    `, env)

  test('off: an approved decision is recorded but nothing is written to Shopify', () => {
    const r = approveWith({ TRIBAL_SHOPIFY_TAG_MODE: '' })
    expect(r.res.statusCode).toBe(200)
    expect(r.res.body.message).toMatch(/TRIBAL_SHOPIFY_TAG_MODE is off/)
    expect(r.tags).toBe(0)
    expect(r.gql).toBe(0)
    expect(r.saved).toMatchObject({ status: 'approved', decidedBy: 'ryan@displaycellpros.com', shopifySynced: false })
  })

  test('allowlist: only listed customers are tagged', () => {
    const miss = approveWith({ TRIBAL_SHOPIFY_TAG_MODE: 'allowlist', TRIBAL_TAG_ALLOWLIST: 'gid://shopify/Customer/2' })
    expect(miss.tags).toBe(0)
    expect(miss.gql).toBe(0)
    expect(miss.res.body.message).toMatch(/not in TRIBAL_TAG_ALLOWLIST/)
    const hit = approveWith({ TRIBAL_SHOPIFY_TAG_MODE: 'allowlist', TRIBAL_TAG_ALLOWLIST: '1' })
    expect(hit.tags).toBe(1)
    expect(hit.saved.shopifySynced).toBe(true)
  })

  test('on: a reviewer-approved customer is tagged exactly once', () => {
    const r = approveWith({ TRIBAL_SHOPIFY_TAG_MODE: 'on' })
    expect(r.tags).toBe(1)
    expect(r.res.body).toMatchObject({ success: true, shopifySynced: true, shopifyTagged: true })
  })

  test('Slack approve goes through the same gate (off = no tag, on = tag)', () => {
    const script = `
      const id = await createReview()
      const res = await callInteract({ payload: interactionPayload(id) })
      emit({ status: res.statusCode, tags: tagCalls().length, replies: slackReplies().map((x) => x.text), saved: await review.getReview(id) })
    `
    const off = run(script, {})
    expect(off.status).toBe(200)
    expect(off.tags).toBe(0)
    expect(off.replies.join(' ')).toMatch(/TRIBAL_SHOPIFY_TAG_MODE is off/)
    expect(off.saved.status).toBe('approved')
    const on = run(script, { TRIBAL_SHOPIFY_TAG_MODE: 'on' })
    expect(on.tags).toBe(1)
    expect(on.replies.join(' ')).toMatch(/tagged tribal-member-verified/)
  })
})

describe('Persona webhook never tags', () => {
  test('Stage 1 default: PERSONA_ENABLED unset returns 410 and does nothing', () => {
    const r = runT(`
      const res = await callPersona(personaEvent())
      emit({ res, calls: calls.length, reviews: (await review.listReviews()).length })
    `, { PERSONA_WEBHOOK_SECRET: PERSONA_SECRET, TRIBAL_SHOPIFY_TAG_MODE: 'on' })
    expect(r.res.statusCode).toBe(410)
    expect(r.calls).toBe(0)
    expect(r.reviews).toBe(0)
  })

  test('enabled + tag mode on: a completed inquiry only creates ONE pending review, no tag, no enrollment hash', () => {
    const r = runT(`
      const first = await callPersona(personaEvent('inq_TEST0001'))
      const again = await callPersona(personaEvent('inq_TEST0001'))
      const unsigned = await callPersona(personaEvent('inq_TEST0002'), { sign: false })
      const all = await review.listReviews()
      emit({ first, again, unsigned, all, tags: tagCalls().length, gql: gqlCalls().length, slack: slackPosts().length })
    `, { PERSONA_ENABLED: 'true', PERSONA_WEBHOOK_SECRET: PERSONA_SECRET, TRIBAL_SHOPIFY_TAG_MODE: 'on' })
    expect(r.first.statusCode).toBe(202)
    expect(r.first.body.status).toBe('pending_review')
    expect(r.again.body.duplicate).toBe(true)
    expect(r.unsigned.statusCode).toBe(401)
    expect(r.tags).toBe(0)
    expect(r.gql).toBe(0)
    expect(r.slack).toBe(1)
    expect(r.all).toHaveLength(1)
    expect(r.all[0]).toMatchObject({ status: 'pending', source: 'persona', personaInquiryId: 'inq_TEST0001', customerId: 'gid://shopify/Customer/1', maskedEnrollmentId: null })
    const stored = JSON.stringify(r.all)
    const sha = crypto.createHash('sha256').update(RAW_ENROLLMENT.toLowerCase()).digest('hex')
    expect(stored).not.toContain(RAW_ENROLLMENT)
    expect(stored).not.toContain(RAW_ENROLLMENT.slice(-4))
    expect(stored).not.toContain(sha)
    expect(stored).not.toContain('pat@example.com')
  })

  test('enabled but review flow off: acknowledged, nothing stored', () => {
    const r = runT(`
      const res = await callPersona(personaEvent())
      emit({ res, reviews: (await review.listReviews()).length, tags: tagCalls().length })
    `, { PERSONA_ENABLED: 'true', PERSONA_WEBHOOK_SECRET: PERSONA_SECRET, TRIBAL_VERIFY_ENABLED: '', TRIBAL_SHOPIFY_TAG_MODE: 'on' })
    expect(r.res.statusCode).toBe(200)
    expect(r.res.body.reason).toBe('review_disabled')
    expect(r.reviews).toBe(0)
    expect(r.tags).toBe(0)
  })
})

describe('admin decision API is reviewer-gated', () => {
  test('spoofed reviewer header, cookie or query is rejected without a session', () => {
    const r = runT(`
      const rec = await makePending()
      const spoof = {
        headers: { 'x-admin-email': 'ryan@displaycellpros.com', 'x-user-email': 'ryan@displaycellpros.com', cookie: 'user_email=ryan%40displaycellpros.com' },
        query: { adminEmail: 'ryan@displaycellpros.com' },
      }
      const fromReq = await adminAuth.getAdminEmailFromRequest(spoof) // default unified resolver, no verified session
      const res = await callDecision({ ...spoof, body: { requestId: rec.id, action: 'approve' } })
      const outsider = await callDecision({ ...spoof, body: { requestId: rec.id, action: 'approve' }, resolveSession: sessionAs('someone@example.com') })
      const otherDomain = await callDecision({ ...spoof, body: { requestId: rec.id, action: 'approve' }, resolveSession: sessionAs('support@displaycellpros.com') })
      const unverified = await callDecision({ body: { requestId: rec.id, action: 'approve' }, resolveSession: sessionAs('ryan@displaycellpros.com', { email_verified: false }) })
      const unverifiedGmail = await adminAuth.getAdminEmailFromRequest({ headers: {}, query: {} }, sessionAs('cheyoung1983@gmail.com', { email_verified: false }))
      const gmail = await adminAuth.getAdminEmailFromRequest({ headers: {}, query: {} }, sessionAs('cheyoung1983@gmail.com'))
      const business = await adminAuth.getAdminEmailFromRequest({ headers: {}, query: {} }, sessionAs('ryan@displaycellpros.com'))
      emit({ fromReq, res, outsider, otherDomain, unverified, unverifiedGmail, gmail, business, tags: tagCalls().length, saved: await review.getReview(rec.id) })
    `, { TRIBAL_SHOPIFY_TAG_MODE: 'on', AUTH0_DOMAIN: '', AUTH0_CLIENT_ID: '', AUTH0_SECRET: '' })
    expect(r.fromReq).toBeNull()
    expect(r.res.statusCode).toBe(403)
    expect(r.outsider.statusCode).toBe(403)
    expect(r.otherDomain.statusCode).toBe(403)
    expect(r.unverified.statusCode).toBe(403)
    expect(r.unverifiedGmail).toBeNull()
    expect(r.gmail).toBe('cheyoung1983@gmail.com')
    expect(r.business).toBe('ryan@displaycellpros.com')
    expect(r.tags).toBe(0)
    expect(r.saved.status).toBe('pending')
  })

  test('a decision without an existing pending record is rejected; body customerId is ignored', () => {
    const r = runT(`
      const missing = await callDecision({ body: { requestId: nodeCrypto.randomUUID(), customerId: 'gid://shopify/Customer/777', action: 'approve' }, resolveSession: RYAN })
      const badId = await callDecision({ body: { requestId: 'inq_persona_1001', customerId: 'gid://shopify/Customer/777', action: 'approve' }, resolveSession: RYAN })
      const tagsAfterRejects = tagCalls().length
      const rec = await makePending('gid://shopify/Customer/1')
      const ok = await callDecision({ body: { requestId: rec.id, customerId: 'gid://shopify/Customer/777', action: 'approve' }, resolveSession: RYAN })
      emit({ missing, badId, tagsAfterRejects, ok, tagBodies: tagCalls().map((c) => c.body) })
    `, { TRIBAL_SHOPIFY_TAG_MODE: 'on' })
    expect(r.missing.statusCode).toBe(404)
    expect(r.badId.statusCode).toBe(400)
    expect(r.tagsAfterRejects).toBe(0)
    expect(r.ok.statusCode).toBe(200)
    expect(r.tagBodies).toHaveLength(1)
    expect(r.tagBodies[0]).toContain('gid://shopify/Customer/1')
    expect(r.tagBodies[0]).not.toContain('777')
  })

  test('a second decision is rejected (admin twice, and Slack after admin); one audit entry', () => {
    const r = runT(`
      const id = await createReview()
      const first = await callDecision({ body: { requestId: id, action: 'approve' }, resolveSession: RYAN })
      const second = await callDecision({ body: { requestId: id, action: 'deny' }, resolveSession: RYAN })
      const slack = await callInteract({ payload: interactionPayload(id, 'tribal_deny') })
      const audit = await review.getDecisionAudit(id)
      const rewrite = await review.writeDecisionAudit({ ...audit, decision: 'denied' })
      emit({ first, second, slackStatus: slack.statusCode, replies: slackReplies().map((x) => x.text), saved: await review.getReview(id), audit, rewrite, tags: tagCalls().length })
    `, { TRIBAL_SHOPIFY_TAG_MODE: 'on' })
    expect(r.first.statusCode).toBe(200)
    expect(r.second.statusCode).toBe(409)
    expect(r.second.body.status).toBe('approved')
    expect(r.replies.join(' ')).toMatch(/Already approved by ryan@displaycellpros.com/)
    expect(r.saved.status).toBe('approved')
    expect(r.tags).toBe(1)
    expect(r.audit).toMatchObject({ decision: 'approved', reviewer: 'ryan@displaycellpros.com', channel: 'admin_dashboard', shopifyTagged: true, tagMode: 'on' })
    expect(r.audit.recordId).toBe(r.first.body.requestId)
    expect(Date.parse(r.audit.decidedAt)).not.toBeNaN()
    expect(r.rewrite).toBe(false)
  })

  test('admin requests list has no seeded or demo records', () => {
    const r = runT(`
      const res = mkRes()
      await handleAdminRequests({ method: 'GET', headers: {}, query: {} }, res, { resolveSession: RYAN })
      const denied = mkRes()
      await handleAdminRequests({ method: 'GET', headers: { 'x-admin-email': 'ryan@displaycellpros.com' }, query: {} }, denied)
      emit({ res: summarize(res), denied: summarize(denied) })
    `)
    expect(r.res.statusCode).toBe(200)
    expect(r.res.body.requests).toEqual([])
    expect(r.denied.statusCode).toBe(403)
  })
})

describe('static guarantees', () => {
  const read = (p) => fs.readFileSync(path.join(repoRoot, p), 'utf8')
  const walk = (dir) =>
    fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true }).flatMap((d) => {
      const rel = path.join(dir, d.name)
      if (d.isDirectory()) return walk(rel)
      return /\.(ts|tsx|js|jsx)$/.test(d.name) ? [rel] : []
    })

  test('only the tag gate calls Flow’s tagging helper', () => {
    const users = ['lib', 'pages', 'components', 'services', 'functions']
      .filter((d) => fs.existsSync(path.join(repoRoot, d)))
      .flatMap(walk)
      .filter((f) => f !== path.join('lib', 'tribal', 'shopify-admin.ts'))
      .filter((f) => read(f).includes('updateShopifyCustomerTribalStatus'))
    expect(users).toEqual([path.join('lib', 'tribal', 'tag-gate.ts')])
  })

  test('/api/tribal/tax-quote is removed and strict two-email owner allowlist is enforced', () => {
    expect(fs.existsSync(path.join(repoRoot, 'pages/api/tribal/tax-quote.ts'))).toBe(false)
    const allowlistSrc = read('lib/tribal/owner-allowlist.ts')
    expect(allowlistSrc).toContain('cheyoung1983@gmail.com')
    expect(allowlistSrc).toContain('ryan@displaycellpros.com')
    for (const f of ['pages/api/tribal/admin/requests.ts', 'pages/api/tribal/admin/export-audit.ts']) {
      expect(read(f)).not.toContain('cheyoung1983@gmail.com')
    }
  })

  test('.env.example documents the gate flags (names only)', () => {
    const env = read('.env.example')
    for (const k of ['TRIBAL_SHOPIFY_TAG_MODE', 'TRIBAL_TAG_ALLOWLIST', 'TRIBAL_TAX_EXEMPT_ENABLED', 'PERSONA_ENABLED']) {
      expect(env).toMatch(new RegExp('^' + k + '=$', 'm'))
    }
  })
})
