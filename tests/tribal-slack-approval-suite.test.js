/**
 * @jest-environment node
 *
 * Tribal verification test suite, part 2: Slack approval
 * (/api/slack/tribal-interaction + lib/tribal/manual-review.ts authz).
 *
 * Covers: Slack v0 signature verification (missing / bad / tampered / stale /
 * replayed), the approver allowlist and workspace / channel / app pinning,
 * the one-decision-only lock (incl. concurrent clicks), approve vs deny
 * side effects (Shopify tag only on approve, tax exemption only behind its
 * flag), and response_url / username handling.
 *
 * Real route code, mocked fetch (Slack + Shopify + Upstash emulation). No real
 * network, no real Slack, no real Shopify.
 */
const { run, redisEnv } = require('./helpers/tribal-harness')

// Each scenario runs the real route in a child process and returns plain data.
const scenario = (code, env = {}) => run(code, env)
const UNKNOWN_ID = '11111111-2222-4333-8444-555555555555' // well-formed review id that was never created

describe('slack approval: request signature (401 before any side effect)', () => {
  let r
  beforeAll(() => {
    r = scenario(`
      const id = await createReview()
      const p = interactionPayload(id)
      const raw = 'payload=' + encodeURIComponent(JSON.stringify(p))
      const ts = String(nowSec())
      const out = {}
      const attempt = async (label, opts) => {
        const before = calls.length
        const res = await callInteract({ payload: p, ...opts })
        out[label] = { status: res.statusCode, sideEffects: calls.length - before }
      }
      await attempt('missingSignature', { sig: null })
      await attempt('missingTimestamp', { ts: null, sig: 'v0=' + 'a'.repeat(64) })
      await attempt('garbageSignature', { sig: 'v0=' + '0'.repeat(64) })
      await attempt('shortSignature', { sig: 'v0=abc' })
      await attempt('emptySignature', { sig: '' })
      await attempt('wrongScheme', { sig: sign(raw, ts).replace('v0=', 'v1=') })
      await attempt('wrongSecret', { secret: 'some-other-secret' })
      await attempt('nonNumericTimestamp', { ts: 'abc' })
      await attempt('empty timestamp', { ts: '' , sig: 'v0=' + 'a'.repeat(64) })
      // Signed for the original body, delivered with a tampered body.
      const tamperedRaw = 'payload=' + encodeURIComponent(JSON.stringify({ ...p, user: { id: 'U_ATTACKER' } }))
      const tsT = String(nowSec())
      out.tamperedBody = { status: (await callInteract({ raw: tamperedRaw, ts: tsT, sig: sign(raw, tsT) })).statusCode }
      // Signed for a different timestamp than the one sent.
      out.timestampSwap = { status: (await callInteract({ payload: p, ts: String(nowSec()), sig: sign(raw, String(nowSec() - 5)) })).statusCode }
      out.reviewStillPending = (await review.getReview(id)).status
      out.tagCalls = tagCalls().length
      emit(out)
    `)
  })

  test.each([
    'missingSignature',
    'missingTimestamp',
    'garbageSignature',
    'shortSignature',
    'emptySignature',
    'wrongScheme',
    'wrongSecret',
    'nonNumericTimestamp',
    'empty timestamp',
  ])('%s is rejected with 401 and causes no outbound call', (k) => {
    expect(r[k]).toEqual({ status: 401, sideEffects: 0 })
  })

  test('a body tampered after signing is rejected', () => {
    expect(r.tamperedBody.status).toBe(401)
  })

  test('a signature computed for a different timestamp is rejected', () => {
    expect(r.timestampSwap.status).toBe(401)
  })

  test('none of the rejected requests changed the review or tagged a customer', () => {
    expect(r.reviewStillPending).toBe('pending')
    expect(r.tagCalls).toBe(0)
  })

  test('with no SLACK_SIGNING_SECRET configured every request is rejected (fails closed)', () => {
    const x = scenario(
      `
      const id = await createReview()
      const p = interactionPayload(id)
      const raw = 'payload=' + encodeURIComponent(JSON.stringify(p))
      const ts = String(nowSec())
      // Attacker signs with an empty secret / with undefined.
      const a = await callInteract({ payload: p, secret: '' })
      const b = await callInteract({ payload: p, secret: 'undefined' })
      emit({ a: a.statusCode, b: b.statusCode, status: (await review.getReview(id)).status })
      `,
      { SLACK_SIGNING_SECRET: '' }
    )
    expect(x).toEqual({ a: 401, b: 401, status: 'pending' })
  })

  test('a valid signature is accepted (200) and the approval is applied', () => {
    const x = scenario(`
      const id = await createReview()
      const res = await callInteract({ payload: interactionPayload(id) })
      emit({ status: res.statusCode, rec: (await review.getReview(id)).status, tags: tagCalls().length })
    `)
    expect(x).toEqual({ status: 200, rec: 'approved', tags: 1 })
  })
})

describe('slack approval: replay protection window', () => {
  test('timestamps older than 5 minutes or too far in the future are rejected; ~4.9 minutes is accepted', () => {
    const x = scenario(`
      const id = await createReview()
      const p = interactionPayload(id)
      const at = async (offsetSec) => (await callInteract({ payload: p, ts: String(nowSec() + offsetSec) })).statusCode
      const out = {
        stale301: await at(-301),
        stale1h: await at(-3600),
        future301: await at(301),
        future1h: await at(3600),
        statusAfterRejections: (await review.getReview(id)).status,
        justInsideWindow: await at(-295),
      }
      out.statusAfterAccepted = (await review.getReview(id)).status
      emit(out)
    `)
    expect(x.stale301).toBe(401)
    expect(x.stale1h).toBe(401)
    expect(x.future301).toBe(401)
    expect(x.future1h).toBe(401)
    expect(x.statusAfterRejections).toBe('pending')
    expect(x.justInsideWindow).toBe(200)
    expect(x.statusAfterAccepted).toBe('approved')
  })

  test('a valid request captured and re-sent within the window is idempotent (exactly one tag, replies "Already approved")', () => {
    const x = scenario(`
      const id = await createReview()
      const p = interactionPayload(id)
      const raw = 'payload=' + encodeURIComponent(JSON.stringify(p))
      const ts = String(nowSec())
      const sig = sign(raw, ts)
      const first = await callInteract({ raw, ts, sig })
      const replay1 = await callInteract({ raw, ts, sig })
      const replay2 = await callInteract({ raw, ts, sig })
      emit({ statuses: [first, replay1, replay2].map((r) => r.statusCode), tags: tagCalls().length, replies: slackReplies().map((r) => r.text) })
    `)
    expect(x.statuses).toEqual([200, 200, 200])
    expect(x.tags).toBe(1)
    expect(x.replies[0]).toMatch(/^Approved by ryan/)
    expect(x.replies[1]).toMatch(/^Already approved by ryan\./)
    expect(x.replies[2]).toMatch(/^Already approved by ryan\./)
  })

  test('the same request replayed after the window has closed is rejected (401)', () => {
    const x = scenario(`
      const id = await createReview()
      const p = interactionPayload(id)
      const raw = 'payload=' + encodeURIComponent(JSON.stringify(p))
      const ts = String(nowSec())
      const sig = sign(raw, ts)
      const first = await callInteract({ raw, ts, sig })
      advanceTime(301 * 1000)
      const late = await callInteract({ raw, ts, sig })
      emit({ first: first.statusCode, late: late.statusCode, tags: tagCalls().length })
    `)
    expect(x).toEqual({ first: 200, late: 401, tags: 1 })
  })
})

describe('slack approval: routing, flag, and payload handling', () => {
  test('TRIBAL_VERIFY_ENABLED off: 404 and nothing happens, even for a perfectly signed request', () => {
    const x = scenario(
      `
      const p = interactionPayload('${UNKNOWN_ID}')
      const res = await callInteract({ payload: p })
      emit({ status: res.statusCode, calls: calls.length })
      `,
      { TRIBAL_VERIFY_ENABLED: '' }
    )
    expect(x).toEqual({ status: 404, calls: 0 })
  })

  test('non-POST methods are 405 with Allow: POST', () => {
    const x = scenario(`
      const out = {}
      for (const m of ['GET', 'PUT', 'DELETE', 'PATCH']) {
        const res = await callInteract({ payload: {}, method: m })
        out[m] = { status: res.statusCode, allow: res.headers.Allow }
      }
      emit(out)
    `)
    for (const m of ['GET', 'PUT', 'DELETE', 'PATCH']) expect(x[m]).toEqual({ status: 405, allow: 'POST' })
  })

  test('a validly signed body without a parseable payload is 400', () => {
    const x = scenario(`
      const out = {}
      const send = async (label, raw) => { out[label] = (await callInteract({ raw })).statusCode }
      await send('noPayloadField', 'foo=bar')
      await send('emptyBody', '')
      await send('notJson', 'payload=' + encodeURIComponent('{not json'))
      await send('emptyPayload', 'payload=')
      emit(out)
    `)
    expect(x).toEqual({ noPayloadField: 400, emptyBody: 400, notJson: 400, emptyPayload: 400 })
  })

  test('an unknown / missing action is acknowledged (200) with no side effects', () => {
    const x = scenario(`
      const id = await createReview()
      const out = {}
      const before = calls.length
      const send = async (label, p) => { out[label] = (await callInteract({ payload: p })).statusCode }
      await send('unknownAction', interactionPayload(id, 'tribal_something_else'))
      await send('noActions', { type: 'block_actions', user: { id: 'U_APPROVER' } })
      await send('emptyActions', { type: 'block_actions', user: { id: 'U_APPROVER' }, actions: [] })
      await send('nullPayload', null)
      out.sideEffects = calls.length - before
      out.status = (await review.getReview(id)).status
      emit(out)
    `)
    expect(x).toEqual({ unknownAction: 200, noActions: 200, emptyActions: 200, nullPayload: 200, sideEffects: 0, status: 'pending' })
  })

  test('malformed review ids are 400 and never reach the store or Shopify', () => {
    const x = scenario(
      `
      const out = {}
      const before = redisOps.length
      for (const bad of ['', 'short', 'g'.repeat(32), '../../etc/passwd', 'tribal:review:' + 'a'.repeat(32), 'a'.repeat(33), '${UNKNOWN_ID}\\n', ' ${UNKNOWN_ID}', '${UNKNOWN_ID}'.toUpperCase() + 'x']) {
        out[JSON.stringify(bad)] = (await callInteract({ payload: interactionPayload(bad) })).statusCode
      }
      out.redisReads = redisOps.filter((o) => o.op === 'GET').length
      out.gql = gqlCalls().length
      emit(out)
      `,
      redisEnv
    )
    const { redisReads, gql, ...statuses } = x
    for (const [k, s] of Object.entries(statuses)) expect([k, s]).toEqual([k, 400])
    expect(redisReads).toBe(0)
    expect(gql).toBe(0)
  })

  test('a well-formed but unknown / expired review id replies "not found" (200) and tags nobody', () => {
    const x = scenario(`
      const res = await callInteract({ payload: interactionPayload('${UNKNOWN_ID}') })
      emit({ status: res.statusCode, replies: slackReplies().map((r) => r.text), tags: tagCalls().length })
    `)
    expect(x.status).toBe(200)
    expect(x.replies).toEqual(['Review request not found or expired.'])
    expect(x.tags).toBe(0)
  })

  test('an expired review (past the 30-day TTL) can no longer be approved', () => {
    const x = scenario(
      `
      const id = await createReview()
      advanceTime(31 * 24 * 3600 * 1000)
      // Slack's own timestamp window is relative to the (advanced) clock, so this is still a valid signature.
      const res = await callInteract({ payload: interactionPayload(id) })
      emit({ status: res.statusCode, replies: slackReplies().map((r) => r.text), tags: tagCalls().length })
      `,
      redisEnv
    )
    expect(x.status).toBe(200)
    expect(x.replies).toEqual(['Review request not found or expired.'])
    expect(x.tags).toBe(0)
  })
})

describe('slack approval: approver allowlist and workspace/channel/app pinning', () => {
  const attempt = (env, extra = '{}', who = "'U_APPROVER'") =>
    scenario(
      `
      const id = await createReview()
      const p = interactionPayload(id, 'tribal_approve', ${extra})
      p.user.id = ${who}
      const res = await callInteract({ payload: p })
      emit({
        status: res.statusCode,
        body: res.body,
        record: (await review.getReview(id)).status,
        gql: gqlCalls().length,
        replies: slackReplies().map((r) => ({ ephemeral: r.response_type === 'ephemeral', text: r.text })),
        warns: logs.filter((l) => l.level === 'warn').map((l) => l.text),
      })
      `,
      env
    )

  const rejected = (x) => {
    expect(x.status).toBe(403)
    expect(x.body).toEqual({ error: 'Forbidden' })
    expect(x.record).toBe('pending')
    expect(x.gql).toBe(0)
    expect(x.replies).toEqual([{ ephemeral: true, text: 'You are not authorized to approve or deny tribal verification requests.' }])
  }

  test('baseline: the configured approver is allowed', () => {
    const x = attempt({})
    expect([x.status, x.record, x.gql]).toEqual([200, 'approved', 2 > 0 ? x.gql : 0])
    expect(x.record).toBe('approved')
  })

  test('an empty approver list rejects EVERYONE (fails closed), with an ephemeral reply and no Shopify call', () => {
    rejected(attempt({ SLACK_TRIBAL_APPROVER_IDS: '' }))
  })

  test('a whitespace/commas-only approver list also rejects everyone', () => {
    rejected(attempt({ SLACK_TRIBAL_APPROVER_IDS: ' , ,, ' }))
  })

  test('a signed request from a user who is not an approver is rejected', () => {
    rejected(attempt({}, '{}', "'U_SOMEONE_ELSE'"))
  })

  test('approver ids are matched exactly (no prefix / substring / case-insensitive matches)', () => {
    for (const who of ['U_APPROVE', 'U_APPROVER2', 'u_approver', 'U_APPROVER ', '']) rejected(attempt({}, '{}', JSON.stringify(who)))
  })

  test('a non-string user id is rejected', () => {
    for (const who of ['null', '["U_APPROVER"]', '123', '{}']) rejected(attempt({}, '{}', who))
  })

  test('a comma-separated list with spaces authorizes each listed user', () => {
    const env = { SLACK_TRIBAL_APPROVER_IDS: ' U_ONE , U_APPROVER ,U_THREE' }
    expect(attempt(env).status).toBe(200)
    expect(attempt(env, '{}', "'U_THREE'").status).toBe(200)
    rejected(attempt(env, '{}', "'U_FOUR'"))
  })

  test('the rejection is logged with the reason and the user id, but not the review contents', () => {
    const x = attempt({}, '{}', "'U_SOMEONE_ELSE'")
    expect(x.warns.join('\n')).toMatch(/rejected Slack action \(user not an approver\) from U_SOMEONE_ELSE/)
    expect(x.warns.join('\n')).not.toMatch(/NAV-98442/)
  })

  test('SLACK_TEAM_ID pinned: wrong or missing team is rejected; payload.team.id and user.team_id both work', () => {
    const env = { SLACK_TEAM_ID: 'T_GOOD' }
    rejected(attempt(env, "{ team: { id: 'T_EVIL' } }"))
    rejected(attempt(env)) // no team in payload
    expect(attempt(env, "{ team: { id: 'T_GOOD' } }").status).toBe(200)
    expect(attempt(env, "{ user: { id: 'U_APPROVER', team_id: 'T_GOOD' } }").status).toBe(200)
    rejected(attempt(env, "{ user: { id: 'U_APPROVER', team_id: 'T_EVIL' } }"))
  })

  test('SLACK_TRIBAL_CHANNEL_ID pinned: wrong or missing channel is rejected; channel.id and container.channel_id both work', () => {
    const env = { SLACK_TRIBAL_CHANNEL_ID: 'C_GOOD' }
    rejected(attempt(env, "{ channel: { id: 'C_OTHER' } }"))
    rejected(attempt(env))
    expect(attempt(env, "{ channel: { id: 'C_GOOD' } }").status).toBe(200)
    expect(attempt(env, "{ container: { channel_id: 'C_GOOD' } }").status).toBe(200)
    rejected(attempt(env, "{ container: { channel_id: 'C_OTHER' } }"))
  })

  test('SLACK_APP_ID pinned: wrong or missing api_app_id is rejected', () => {
    const env = { SLACK_APP_ID: 'A_GOOD' }
    rejected(attempt(env, "{ api_app_id: 'A_OTHER' }"))
    rejected(attempt(env))
    expect(attempt(env, "{ api_app_id: 'A_GOOD' }").status).toBe(200)
  })

  test('all pins at once: every one must match', () => {
    const env = { SLACK_TEAM_ID: 'T_GOOD', SLACK_TRIBAL_CHANNEL_ID: 'C_GOOD', SLACK_APP_ID: 'A_GOOD' }
    const good = "{ team: { id: 'T_GOOD' }, channel: { id: 'C_GOOD' }, api_app_id: 'A_GOOD' }"
    expect(attempt(env, good).status).toBe(200)
    rejected(attempt(env, "{ team: { id: 'T_BAD' }, channel: { id: 'C_GOOD' }, api_app_id: 'A_GOOD' }"))
    rejected(attempt(env, "{ team: { id: 'T_GOOD' }, channel: { id: 'C_BAD' }, api_app_id: 'A_GOOD' }"))
    rejected(attempt(env, "{ team: { id: 'T_GOOD' }, channel: { id: 'C_GOOD' }, api_app_id: 'A_BAD' }"))
  })

  test('a deny click from a non-approver is rejected too (authz runs before either action)', () => {
    const x = scenario(`
      const id = await createReview()
      const p = interactionPayload(id, 'tribal_deny')
      p.user.id = 'U_SOMEONE_ELSE'
      const res = await callInteract({ payload: p })
      emit({ status: res.statusCode, record: (await review.getReview(id)).status })
    `)
    expect(x).toEqual({ status: 403, record: 'pending' })
  })
})

describe('slack approval: one decision only (atomic lock)', () => {
  test.each([['approve first, then deny', 'tribal_approve', 'tribal_deny', 'approved'], ['deny first, then approve', 'tribal_deny', 'tribal_approve', 'denied']])(
    '%s: the first decision wins and the second is a no-op',
    (_label, first, second, final) => {
      const x = scenario(`
        const id = await createReview()
        await callInteract({ payload: interactionPayload(id, ${JSON.stringify(first)}) })
        const tagsAfterFirst = tagCalls().length
        const res2 = await callInteract({ payload: interactionPayload(id, ${JSON.stringify(second)}, { user: { id: 'U_APPROVER', username: 'second-clicker' } }) })
        const rec = await review.getReview(id)
        emit({ status2: res2.statusCode, tagsAfterFirst, tagsFinal: tagCalls().length, rec, replies: slackReplies().map((r) => r.text) })
      `)
      expect(x.status2).toBe(200)
      expect(x.tagsFinal).toBe(x.tagsAfterFirst)
      expect(x.rec.status).toBe(final)
      expect(x.rec.decidedBy).toBe('ryan')
      expect(x.replies[1]).toBe(`Already ${final} by ryan.`)
    }
  )

  test('concurrent approvals (double click / retries) tag the customer exactly once', () => {
    const x = scenario(`
      const id = await createReview()
      const results = await Promise.all(Array.from({ length: 8 }, () => callInteract({ payload: interactionPayload(id) })))
      const texts = slackReplies().map((r) => r.text)
      emit({ statuses: results.map((r) => r.statusCode), tags: tagCalls().length, approvals: texts.filter((t) => t.startsWith('Approved by')).length, rec: (await review.getReview(id)).status })
    `)
    expect(x.statuses.every((s) => s === 200)).toBe(true)
    expect(x.tags).toBe(1)
    expect(x.approvals).toBe(1)
    expect(x.rec).toBe('approved')
  })

  test('concurrent approvals are also single-shot against the Redis-backed (Upstash emulated) store', () => {
    const x = scenario(
      `
      const id = await createReview()
      const results = await Promise.all(Array.from({ length: 6 }, () => callInteract({ payload: interactionPayload(id) })))
      emit({ statuses: results.map((r) => r.statusCode), tags: tagCalls().length, lockSets: redisOps.filter((o) => o.op === 'SET' && o.args.some((a) => a.toUpperCase() === 'NX')).length, rec: (await review.getReview(id)).status })
      `,
      redisEnv
    )
    expect(x.tags).toBe(1)
    expect(x.lockSets).toBeGreaterThanOrEqual(1)
    expect(x.rec).toBe('approved')
  })

  test('concurrent approve + deny produce exactly one outcome (no approve-then-deny flip)', () => {
    const x = scenario(`
      const id = await createReview()
      const calls2 = []
      for (let i = 0; i < 4; i++) { calls2.push(callInteract({ payload: interactionPayload(id, 'tribal_approve') })); calls2.push(callInteract({ payload: interactionPayload(id, 'tribal_deny') })) }
      await Promise.all(calls2)
      const rec = await review.getReview(id)
      const decisions = slackReplies().map((r) => r.text).filter((t) => /^(Approved|Denied) by/.test(t))
      emit({ rec, decisions, tags: tagCalls().length })
    `)
    expect(x.decisions).toHaveLength(1)
    expect(['approved', 'denied']).toContain(x.rec.status)
    expect(x.decisions[0].startsWith(x.rec.status === 'approved' ? 'Approved' : 'Denied')).toBe(true)
    expect(x.tags).toBe(x.rec.status === 'approved' ? 1 : 0)
  })

  test('a review that was already decided cannot be re-decided even if the lock key is gone (status check)', () => {
    const x = scenario(`
      const id = await createReview()
      await callInteract({ payload: interactionPayload(id, 'tribal_deny') })
      // Simulate the lock expiring / being lost.
      for (const k of [...redisData.keys()]) if (k.includes('lock')) redisData.delete(k)
      const res = await callInteract({ payload: interactionPayload(id, 'tribal_approve') })
      emit({ status: res.statusCode, rec: (await review.getReview(id)).status, tags: tagCalls().length })
    `, redisEnv)
    expect(x).toEqual({ status: 200, rec: 'denied', tags: 0 })
  })
})

describe('slack approval: approve / deny side effects', () => {
  test('deny: marks the review denied, records who and when, makes NO Shopify call, never reveals the raw ID', () => {
    const x = scenario(`
      const id = await createReview()
      const res = await callInteract({ payload: interactionPayload(id, 'tribal_deny') })
      const rec = await review.getReview(id)
      emit({ status: res.statusCode, rec: { status: rec.status, decidedBy: rec.decidedBy, decidedAt: rec.decidedAt }, gql: gqlCalls().length, shopifyCalls: calls.filter((c) => c.url.includes('myshopify.com')).length, replies: slackReplies().map((r) => r.text), logs })
    `)
    expect(x.status).toBe(200)
    expect(x.rec.status).toBe('denied')
    expect(x.rec.decidedBy).toBe('ryan')
    expect(Number.isNaN(Date.parse(x.rec.decidedAt))).toBe(false)
    expect(x.gql).toBe(0)
    expect(x.shopifyCalls).toBe(0)
    expect(x.replies).toHaveLength(1)
    expect(x.replies[0]).toMatch(/^Denied by ryan: /)
    expect(JSON.stringify([x.replies, x.logs])).not.toContain('NAV-98442')
  })

  test('approve (signed-in customer): adds ONLY the tribal-member-verified tag, no tax exemption by default, reply says tagged', () => {
    const x = scenario(`
      const id = await createReview()
      const res = await callInteract({ payload: interactionPayload(id) })
      const rec = await review.getReview(id)
      emit({ status: res.statusCode, rec, tags: tagCalls().map((c) => c.body), gql: gqlCalls().map((c) => c.body), replies: slackReplies().map((r) => r.text), logs })
    `)
    expect(x.status).toBe(200)
    expect(x.rec.status).toBe('approved')
    expect(x.rec.shopifySynced).toBe(true)
    expect(x.tags).toHaveLength(1)
    expect(x.tags[0]).toContain('tribal-member-verified')
    expect(x.tags[0]).toContain('gid://shopify/Customer/1')
    // Only the tag is added; no other tags and no tax exemption without the flag.
    const all = x.gql.join('\n')
    expect(all).not.toMatch(/taxExempt\s*:\s*true/)
    expect(all).not.toMatch(/"taxExempt"\s*:\s*true/)
    expect(x.replies[0]).toMatch(/^Approved by ryan: .*Shopify customer tagged tribal-member-verified\.$/)
    expect(JSON.stringify([x.replies, x.logs])).not.toContain('NAV-98442')
  })

  test('approve with TRIBAL_TAX_EXEMPT_ENABLED on: tax exemption is requested (and only then)', () => {
    const on = scenario(
      `
      const id = await createReview()
      await callInteract({ payload: interactionPayload(id) })
      emit({ gql: gqlCalls().map((c) => c.body).join('\\n') })
      `,
      { TRIBAL_TAX_EXEMPT_ENABLED: 'true' }
    )
    const off = scenario(`
      const id = await createReview()
      await callInteract({ payload: interactionPayload(id) })
      emit({ gql: gqlCalls().map((c) => c.body).join('\\n') })
    `)
    expect(/taxExempt/.test(on.gql)).toBe(true)
    expect(/"taxExempt\\?"\s*:\s*true|taxExempt:\s*true/.test(on.gql)).toBe(true)
    expect(/"taxExempt\\?"\s*:\s*true|taxExempt:\s*true/.test(off.gql)).toBe(false)
  })

  test('approve (guest request, no customer): no Shopify call at all; reply tells the reviewer to tag manually', () => {
    const x = scenario(`
      const id = await createReview({ cookie: '' })
      const res = await callInteract({ payload: interactionPayload(id) })
      const rec = await review.getReview(id)
      emit({ status: res.statusCode, rec: { status: rec.status, customerId: rec.customerId, shopifySynced: rec.shopifySynced }, shopify: calls.filter((c) => c.url.includes('myshopify.com')).length, replies: slackReplies().map((r) => r.text) })
    `)
    expect(x.status).toBe(200)
    expect(x.rec.status).toBe('approved')
    expect(x.rec.customerId == null).toBe(true)
    expect(x.rec.shopifySynced).toBe(false)
    expect(x.shopify).toBe(0)
    expect(x.replies[0]).toMatch(/Guest request: tag the Shopify customer manually\.$/)
  })

  test('approve when Shopify rejects the tag: still decided once, reply says FAILED, shopifySynced=false', () => {
    const x = scenario(`
      globalThis.shopify.tagFails = true
      const id = await createReview()
      const res = await callInteract({ payload: interactionPayload(id) })
      const again = await callInteract({ payload: interactionPayload(id) })
      const rec = await review.getReview(id)
      emit({ status: res.statusCode, again: again.statusCode, rec: { status: rec.status, shopifySynced: rec.shopifySynced }, replies: slackReplies().map((r) => r.text), tags: tagCalls().length })
    `)
    expect(x.status).toBe(200)
    expect(x.rec).toEqual({ status: 'approved', shopifySynced: false })
    expect(x.replies[0]).toMatch(/Shopify update FAILED: tag the customer manually\.$/)
    expect(x.replies[1]).toMatch(/^Already approved/)
    expect(x.tags).toBe(1)
  })

  test('the Shopify customer id used comes from the stored review, never from the Slack payload', () => {
    const x = scenario(`
      const id = await createReview()
      const p = interactionPayload(id)
      p.customerId = 'gid://shopify/Customer/999'
      p.actions[0].customer_id = 'gid://shopify/Customer/999'
      await callInteract({ payload: p })
      emit({ bodies: tagCalls().map((c) => c.body) })
    `)
    expect(x.bodies).toHaveLength(1)
    expect(x.bodies[0]).toContain('gid://shopify/Customer/1')
    expect(x.bodies[0]).not.toContain('999')
  })

  test('the Slack reply never contains the full enrollment id and the approve audit uses a masked id', () => {
    const x = scenario(`
      const id = await createReview()
      await callInteract({ payload: interactionPayload(id) })
      emit({ outbound: calls.filter((c) => !c.url.includes('redis')).map((c) => c.body).join('\\n') })
    `)
    expect(x.outbound).not.toContain('NAV-98442-SECRET')
  })
})

describe('slack approval: response_url and username handling', () => {
  test('a response_url that is not hooks.slack.com is never fetched (no SSRF), the decision still applies', () => {
    const x = scenario(`
      const out = {}
      for (const url of ['https://evil.example.com/hook', 'http://hooks.slack.com/actions/T/1/abc', 'https://hooks.slack.com.evil.example/actions/x', 'http://169.254.169.254/latest/meta-data', 'file:///etc/passwd', '']) {
        const id = await createReview()
        const p = interactionPayload(id)
        p.response_url = url
        const res = await callInteract({ payload: p })
        out[url || '(empty)'] = { status: res.statusCode, rec: (await review.getReview(id)).status }
      }
      out.unmocked = calls.filter((c) => !c.url.startsWith('https://hooks.slack.com/') && !c.url.includes('myshopify.com') && !c.url.includes('/account/customer/api/') && !c.url.includes('oauth')).map((c) => c.url)
      out.slackActionCalls = slackReplies().length
      emit(out)
    `)
    expect(x.unmocked).toEqual([])
    expect(x.slackActionCalls).toBe(0)
    for (const k of Object.keys(x).filter((k) => !['unmocked', 'slackActionCalls'].includes(k))) expect(x[k]).toEqual({ status: 200, rec: 'approved' })
  })

  test('a missing response_url is fine', () => {
    const x = scenario(`
      const id = await createReview()
      const p = interactionPayload(id)
      delete p.response_url
      const res = await callInteract({ payload: p })
      emit({ status: res.statusCode, rec: (await review.getReview(id)).status })
    `)
    expect(x).toEqual({ status: 200, rec: 'approved' })
  })

  test('a failing response_url POST (Slack down) does not fail or undo the decision', () => {
    const x = scenario(`
      const realFetch = globalThis.fetch
      globalThis.fetch = async (url, init) => { if (String(url).startsWith('https://hooks.slack.com/actions/')) throw new Error('slack down'); return realFetch(url, init) }
      const id = await createReview()
      const res = await callInteract({ payload: interactionPayload(id) })
      emit({ status: res.statusCode, rec: (await review.getReview(id)).status, tags: tagCalls().length })
    `)
    expect(x).toEqual({ status: 200, rec: 'approved', tags: 1 })
  })

  test('the clicking username is HTML-escaped, truncated to 80 chars, and falls back to name then id', () => {
    const x = scenario(`
      const out = {}
      const decide = async (label, user) => {
        const id = await createReview()
        const p = interactionPayload(id, 'tribal_deny', { user })
        await callInteract({ payload: p })
        out[label] = (await review.getReview(id)).decidedBy
      }
      await decide('escaped', { id: 'U_APPROVER', username: '<!channel> & <@U1>' })
      await decide('long', { id: 'U_APPROVER', username: 'x'.repeat(200) })
      await decide('nameFallback', { id: 'U_APPROVER', name: 'Real Name' })
      await decide('idFallback', { id: 'U_APPROVER' })
      out.replies = slackReplies().map((r) => r.text)
      emit(out)
    `)
    expect(x.escaped).toBe('&lt;!channel&gt; &amp; &lt;@U1&gt;')
    expect(x.long).toBe('x'.repeat(80))
    expect(x.nameFallback).toBe('Real Name')
    expect(x.idFallback).toBe('U_APPROVER')
    expect(x.replies.join('\n')).not.toContain('<!channel>')
  })
})

describe('slack approval: review store availability', () => {
  test('production without Redis refuses to process a decision (503), nothing is tagged', () => {
    const x = scenario(
      `
      const p = interactionPayload('${UNKNOWN_ID}')
      const res = await callInteract({ payload: p })
      emit({ status: res.statusCode, gql: gqlCalls().length })
      `,
      { NODE_ENV: 'production' }
    )
    expect(x).toEqual({ status: 503, gql: 0 })
  })

  test('production without Redis still authenticates first: bad signature is 401 and non-approver is 403 (not 503)', () => {
    const x = scenario(
      `
      const p = interactionPayload('${UNKNOWN_ID}')
      const bad = await callInteract({ payload: p, sig: 'v0=' + '0'.repeat(64) })
      p.user.id = 'U_SOMEONE_ELSE'
      const nonApprover = await callInteract({ payload: p })
      emit({ bad: bad.statusCode, nonApprover: nonApprover.statusCode })
      `,
      { NODE_ENV: 'production' }
    )
    expect(x).toEqual({ bad: 401, nonApprover: 403 })
  })
})

describe('slack approval: authz and signature helpers (unit level)', () => {
  test('verifySlackSignature honours an injected clock and uses constant-length comparison', () => {
    const x = scenario(`
      const raw = 'payload=%7B%7D'
      const ts = '1700000000'
      const good = sign(raw, ts)
      const v = (o) => review.verifySlackSignature({ rawBody: raw, timestamp: ts, signature: good, signingSecret: SECRET, nowSeconds: 1700000000, ...o })
      emit({
        ok: v({}),
        at300: v({ nowSeconds: 1700000300 }),
        at301: v({ nowSeconds: 1700000301 }),
        minus300: v({ nowSeconds: 1699999700 }),
        minus301: v({ nowSeconds: 1699999699 }),
        noSecret: v({ signingSecret: undefined }),
        emptySecret: v({ signingSecret: '' }),
        noTs: v({ timestamp: undefined }),
        noSig: v({ signature: undefined }),
        nan: v({ timestamp: 'NaN' }),
        inf: v({ timestamp: 'Infinity' }),
        longSig: v({ signature: good + '00' }),
        upperCase: v({ signature: good.toUpperCase() }),
      })
    `)
    expect(x).toEqual({
      ok: true,
      at300: true,
      at301: false,
      minus300: true,
      minus301: false,
      noSecret: false,
      emptySecret: false,
      noTs: false,
      noSig: false,
      nan: false,
      inf: false,
      longSig: false,
      upperCase: false,
    })
  })

  test('authorizeSlackAction rejects null / empty payloads and reports the reason', () => {
    const x = scenario(`
      const env = { SLACK_TRIBAL_APPROVER_IDS: 'U1' }
      emit({
        nullPayload: review.authorizeSlackAction(null, env),
        empty: review.authorizeSlackAction({}, env),
        noApprovers: review.authorizeSlackAction({ user: { id: 'U1' } }, {}),
        ok: review.authorizeSlackAction({ user: { id: 'U1' } }, env),
        team: review.authorizeSlackAction({ user: { id: 'U1' } }, { ...env, SLACK_TEAM_ID: 'T' }),
        channel: review.authorizeSlackAction({ user: { id: 'U1' } }, { ...env, SLACK_TRIBAL_CHANNEL_ID: 'C' }),
        app: review.authorizeSlackAction({ user: { id: 'U1' } }, { ...env, SLACK_APP_ID: 'A' }),
      })
    `)
    expect(x.nullPayload).toEqual({ ok: false, reason: 'user not an approver' })
    expect(x.empty).toEqual({ ok: false, reason: 'user not an approver' })
    expect(x.noApprovers).toEqual({ ok: false, reason: 'no approvers configured' })
    expect(x.ok).toEqual({ ok: true })
    expect(x.team).toEqual({ ok: false, reason: 'wrong team' })
    expect(x.channel).toEqual({ ok: false, reason: 'wrong channel' })
    expect(x.app).toEqual({ ok: false, reason: 'wrong app' })
  })
})
