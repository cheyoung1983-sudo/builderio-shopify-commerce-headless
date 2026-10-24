/**
 * @jest-environment node
 *
 * Tribal verification test suite, part 1: /api/tribal/verify.
 *
 * Complements tests/tribal-verify.test.js and tests/tribal-slack-review.test.js
 * with: the TRIBAL_VERIFY_ENABLED gate, input validation edge cases, no raw
 * enrollment ID in logs / Redis writes / Slack payload / responses, duplicate
 * handling, rate limit 429 + reset, and "never claims verified".
 *
 * Everything runs against the real route code with mocked fetch (Slack,
 * Shopify) and an in-memory Upstash emulation: no real network or writes.
 *
 * Tests marked `test.failing` document a REAL gap in production code found by
 * this suite (see the PR description). They pass in CI while the gap exists
 * and will start failing (prompting removal of `.failing`) once it is fixed.
 */
const { run, redisEnv, RAW_ID } = require('./helpers/tribal-harness')

describe('verify route: TRIBAL_VERIFY_ENABLED gate', () => {
  let results
  beforeAll(() => {
    const scenario = (env) =>
      run(
        `
        const res = await callVerify({ cookie: 'shopify_customer_token=good-token' })
        emit({ res: summarize(res), calls, redisOps, logs })
        `,
        env
      )
    results = {
      unset: scenario({ TRIBAL_VERIFY_ENABLED: '', ...redisEnv }),
      falseStr: scenario({ TRIBAL_VERIFY_ENABLED: 'false', ...redisEnv }),
      one: scenario({ TRIBAL_VERIFY_ENABLED: '1', ...redisEnv }),
      yes: scenario({ TRIBAL_VERIFY_ENABLED: 'yes', ...redisEnv }),
      on: scenario({ ...redisEnv }),
      onPadded: scenario({ TRIBAL_VERIFY_ENABLED: '  TRUE ', ...redisEnv }),
      onNoSlack: scenario({ SLACK_TRIBAL_WEBHOOK_URL: '', ...redisEnv }),
      onSlackDown: run(
        `
        globalThis.slackWebhookOk = false
        const res = await callVerify({ cookie: 'shopify_customer_token=good-token' })
        emit({ res: summarize(res), calls, redisOps, logs })
        `,
        redisEnv
      ),
    }
  })

  test.each([['unset'], ['falseStr'], ['one'], ['yes']])('flag %s: 501 manual verification, no Redis write, no Slack post, no Shopify call', (k) => {
    const { res, calls, redisOps } = results[k]
    expect(res.statusCode).toBe(501)
    expect(res.body).toMatchObject({ success: false, verified: false, manualVerificationRequired: true, discountApplied: false, taxExemptionApplied: false })
    expect(redisOps.filter((o) => o.op === 'SET' && o.args[0].startsWith('tribal:review:'))).toEqual([])
    expect(calls).toEqual([])
  })

  test('flag on ("true", case/whitespace-insensitive): 202 pending, stored once, posted to Slack once', () => {
    for (const k of ['on', 'onPadded']) {
      const { res, calls, redisOps } = results[k]
      expect(res.statusCode).toBe(202)
      expect(res.body).toMatchObject({ success: true, verified: false, pendingReview: true, discountApplied: false, taxExemptionApplied: false })
      expect(res.body.reviewId).toMatch(/^[0-9a-f-]{36}$/)
      expect(redisOps.filter((o) => o.op === 'SET' && o.args[0] === `tribal:review:${res.body.reviewId}`)).toHaveLength(1)
      expect(calls.filter((c) => c.url.startsWith('https://hooks.slack.com/services/'))).toHaveLength(1)
    }
  })

  test('flag on but Slack not configured: falls back to 501, nothing stored', () => {
    const { res, redisOps } = results.onNoSlack
    expect(res.statusCode).toBe(501)
    expect(res.body.verified).toBe(false)
    expect(redisOps.filter((o) => o.args[0].startsWith('tribal:review:'))).toEqual([])
  })

  test('flag on and Slack webhook returns 500: 501 fallback (not 202), never claims verified', () => {
    const { res, logs } = results.onSlackDown
    expect(res.statusCode).toBe(501)
    expect(res.body.verified).toBe(false)
    expect(res.body.pendingReview).toBeUndefined()
    expect(logs.some((l) => l.level === 'error' && l.text.includes('failed to post review request to Slack'))).toBe(true)
  })
})

describe('verify route: HTTP methods and input validation', () => {
  let r
  beforeAll(() => {
    r = run(
      `
      const out = {}
      out.methods = {}
      for (const m of ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) out.methods[m] = summarize(await callVerify({ method: m }))
      const tryBody = async (label, body) => { out[label] = summarize(await callVerify({ body })) }
      await tryBody('undefinedBody', undefined)
      await tryBody('nullBody', null)
      await tryBody('emptyObject', {})
      await tryBody('stringBody', 'firstName=Ann')
      await tryBody('arrayBody', [validBody()])
      for (const f of ['firstName', 'lastName', 'tribalNation', 'tribalEnrollmentId']) {
        await tryBody('missing_' + f, validBody({ [f]: undefined }))
        await tryBody('empty_' + f, validBody({ [f]: '' }))
        await tryBody('blank_' + f, validBody({ [f]: '   \\t\\n ' }))
        await tryBody('null_' + f, validBody({ [f]: null }))
        await tryBody('number_' + f, validBody({ [f]: 12345 }))
        await tryBody('bool_' + f, validBody({ [f]: true }))
        await tryBody('array_' + f, validBody({ [f]: ['a'] }))
        await tryBody('object_' + f, validBody({ [f]: { $ne: '' } }))
        await tryBody('max_' + f, validBody({ [f]: 'x'.repeat(120) }))
        await tryBody('over_' + f, validBody({ [f]: 'x'.repeat(121) }))
        await tryBody('paddedMax_' + f, validBody({ [f]: '  ' + 'x'.repeat(120) + '  ' }))
      }
      await tryBody('huge', validBody({ tribalEnrollmentId: 'x'.repeat(2 * 1024 * 1024) }))
      await tryBody('emailNumber', validBody({ email: 42 }))
      await tryBody('emailObject', validBody({ email: { a: 1 } }))
      await tryBody('emailBad1', validBody({ email: 'not-an-email' }))
      await tryBody('emailBad2', validBody({ email: 'a b@example.com' }))
      await tryBody('emailBad3', validBody({ email: '<script>@x.com' }))
      await tryBody('emailLong', validBody({ email: 'a'.repeat(115) + '@x.com' }))
      await tryBody('emailEmpty', validBody({ email: '' }))
      await tryBody('emailNull', validBody({ email: null }))
      await tryBody('emailOk', validBody({ email: ' Ann.Lee@Example.COM ' }))
      await tryBody('extraFields', validBody({ verified: true, discountApplied: true, isAdmin: true, customerId: 'gid://shopify/Customer/7' }))
      out.sideEffects = { calls: calls.length, redisOps: redisOps.length }
      emit(out)
      `
    )
  })

  test.each([['GET'], ['PUT'], ['PATCH'], ['DELETE'], ['HEAD'], ['OPTIONS']])('%s is 405 with Allow: POST', (m) => {
    const x = r.methods[m]
    expect(x.statusCode).toBe(405)
    expect(x.headers.Allow).toBe('POST')
    expect(x.body.success).toBe(false)
  })

  test.each([['undefinedBody'], ['nullBody'], ['emptyObject'], ['stringBody'], ['arrayBody']])('malformed body %s is a 400', (k) => {
    expect(r[k].statusCode).toBe(400)
    expect(r[k].body.success).toBe(false)
  })

  const fields = ['firstName', 'lastName', 'tribalNation', 'tribalEnrollmentId']
  test.each(fields)('%s: missing / empty / blank / null / wrong type are all 400', (f) => {
    for (const kind of ['missing', 'empty', 'blank', 'null', 'number', 'bool', 'array', 'object']) {
      expect([kind, r[`${kind}_${f}`].statusCode]).toEqual([kind, 400])
      expect(r[`${kind}_${f}`].body.success).toBe(false)
    }
  })

  test.each(fields)('%s: 120 chars (even padded with whitespace) is accepted, 121 is 400', (f) => {
    expect(r[`max_${f}`].statusCode).toBe(202)
    expect(r[`paddedMax_${f}`].statusCode).toBe(202)
    expect(r[`over_${f}`].statusCode).toBe(400)
    expect(r[`over_${f}`].body.error).toContain('at most 120')
  })

  test('oversized (2 MB) field is rejected by the route itself with 400', () => {
    expect(r.huge.statusCode).toBe(400)
  })

  test('email: wrong types and malformed addresses are 400; empty/null are treated as absent', () => {
    for (const k of ['emailNumber', 'emailObject', 'emailBad1', 'emailBad2', 'emailBad3', 'emailLong']) {
      expect([k, r[k].statusCode]).toEqual([k, 400])
      expect(r[k].body.error).toBe('email is invalid.')
    }
    for (const k of ['emailEmpty', 'emailNull', 'emailOk']) expect([k, r[k].statusCode]).toEqual([k, 202])
  })

  test('client-supplied "verified"/"discountApplied"/"isAdmin" fields are ignored', () => {
    expect(r.extraFields.statusCode).toBe(202)
    expect(r.extraFields.body.verified).toBe(false)
    expect(r.extraFields.body.discountApplied).toBe(false)
  })

  test('rejected requests (405/400) never touch Slack or Shopify, and success path only calls Slack', () => {
    // The only network traffic in this whole batch is the accepted (202) requests posting to Slack.
    expect(r.sideEffects.calls).toBeGreaterThan(0)
  })
})

describe('verify route: never claims "verified"', () => {
  test('no response, in any state, has verified:true or a discount code/tag', () => {
    const r = run(
      `
      const out = []
      out.push(summarize(await callVerify({})))                                   // 202 pending
      out.push(summarize(await callVerify({ body: validBody({ firstName: '' }) })))// 400
      out.push(summarize(await callVerify({ method: 'GET' })))                    // 405
      globalThis.slackWebhookOk = false
      out.push(summarize(await callVerify({})))                                   // 501 (slack down)
      globalThis.slackWebhookOk = true
      globalThis.slackWebhookThrows = true
      out.push(summarize(await callVerify({})))                                   // 500
      emit(out)
      `,
      redisEnv
    )
    expect(r.map((x) => x.statusCode)).toEqual([202, 400, 405, 501, 500])
    for (const x of r) {
      expect(x.body.verified).not.toBe(true)
      expect(x.body.discountApplied).not.toBe(true)
      expect(x.body.taxExemptionApplied).not.toBe(true)
      const text = JSON.stringify(x.body)
      expect(text).not.toMatch(/TRIBAL-MEMBER|tribal-member-verified|Tribal_Verified/)
      expect(text).not.toMatch(/"verified":true/)
      expect(text).not.toContain(RAW_ID)
    }
  })

  test('verify never tags or updates a Shopify customer and sets no cookies', () => {
    const r = run(
      `
      const res = await callVerify({ cookie: 'shopify_customer_token=good-token' })
      emit({ res: summarize(res), graphql: gqlCalls().filter((c) => c.url.includes(${JSON.stringify('example.myshopify.com')})), headerNames: Object.keys(res.headers) })
      `,
      redisEnv
    )
    expect(r.res.statusCode).toBe(202)
    expect(r.graphql).toEqual([])
    expect(r.headerNames.map((h) => h.toLowerCase())).not.toContain('set-cookie')
  })
})

describe('verify route: raw enrollment ID is not logged, sent to Slack, or returned', () => {
  let r
  beforeAll(() => {
    r = run(
      `
      const ok = await callVerify({ cookie: 'shopify_customer_token=good-token', body: validBody({ email: 'ann.lee@example.com' }) })
      const bad = await callVerify({ body: validBody({ firstName: '' }) })
      globalThis.slackWebhookOk = false
      const slackDown = await callVerify({})
      globalThis.slackWebhookOk = true
      globalThis.slackWebhookThrows = true
      const crash = await callVerify({})
      emit({
        responses: [ok, bad, slackDown, crash].map(summarize),
        logs,
        slackBodies: calls.filter((c) => c.url.startsWith('https://hooks.slack.com/services/')).map((c) => c.body),
        allCallBodies: calls.map((c) => c.body + ' ' + c.url),
        redisOps,
      })
      `,
      redisEnv
    )
  })

  test('console output (log/info/warn/error/debug) never contains the raw ID', () => {
    expect(r.logs.length).toBeGreaterThan(0) // the error paths do log
    for (const l of r.logs) expect(l.text).not.toContain(RAW_ID)
  })

  test('no HTTP response body contains the raw ID', () => {
    expect(JSON.stringify(r.responses)).not.toContain(RAW_ID)
  })

  test('Slack payload has only the masked ID (last 4 chars)', () => {
    expect(r.slackBodies.length).toBeGreaterThan(0)
    for (const b of r.slackBodies) {
      expect(b).not.toContain(RAW_ID)
      expect(b).not.toContain(RAW_ID.slice(0, -4))
      expect(b).toContain('*' .repeat(RAW_ID.length - 4) + RAW_ID.slice(-4))
    }
  })

  test('no outbound call other than the Redis store carries the raw ID', () => {
    for (const b of r.allCallBodies) expect(b).not.toContain(RAW_ID)
  })

  test('rate-limit Redis keys never contain the raw ID', () => {
    const keys = r.redisOps.map((o) => o.args[0])
    expect(keys.some((k) => k.startsWith('ratelimit:verify:'))).toBe(true)
    for (const k of keys) expect(k).not.toContain(RAW_ID)
  })

  // REAL GAP (see PR body): lib/tribal/manual-review.ts newReviewRecord() persists the raw
  // tribalEnrollmentId in Redis (tribal:review:<id>, 30-day TTL). The test plan requires that
  // no raw ID is stored. Remove `.failing` once the record keeps only a keyed hash/last-4.
  test.failing('Redis writes contain no raw enrollment ID (stores a keyed hash / masked value only)', () => {
    const writes = r.redisOps.filter((o) => o.op === 'SET').map((o) => o.args.join(' '))
    expect(writes.length).toBeGreaterThan(0)
    for (const w of writes) expect(w).not.toContain(RAW_ID)
  })

  // Characterization of the current behavior so a change is noticed deliberately.
  test('KNOWN GAP (characterization): the review record in Redis currently holds the raw ID with a 30-day TTL', () => {
    const set = r.redisOps.find((o) => o.op === 'SET' && o.args[0].startsWith('tribal:review:'))
    expect(set).toBeTruthy()
    expect(set.args[1]).toContain(RAW_ID)
    expect(set.args.slice(2)).toEqual(['ex', String(60 * 60 * 24 * 30)])
  })
})

describe('verify route: consent', () => {
  // REAL GAP (see PR body): the route has no consent field/check. The test plan says consent
  // must be required before a request is stored or sent to Slack.
  test.failing('a request without explicit consent is rejected (400) and not stored or posted', () => {
    const r = run(
      `
      const res = await callVerify({ body: validBody({ consent: false }) })
      const res2 = await callVerify({ body: validBody() }) // consent omitted
      emit({ a: summarize(res), b: summarize(res2), slack: calls.filter((c) => c.url.includes('hooks.slack.com')).length })
      `,
      redisEnv
    )
    expect(r.a.statusCode).toBe(400)
    expect(r.b.statusCode).toBe(400)
    expect(r.slack).toBe(0)
  })
})

describe('verify route: duplicate submissions', () => {
  let r
  beforeAll(() => {
    r = run(
      `
      const variants = [RAW_ID, RAW_ID.toLowerCase(), '  ' + RAW_ID + '  ', RAW_ID.replace(/-/g, ' '), RAW_ID.replace(/-/g, '')]
      const out = []
      for (const v of variants) out.push(summarize(await callVerify({ body: validBody({ tribalEnrollmentId: v }) })))
      emit({
        responses: out,
        reviews: redisOps.filter((o) => o.op === 'SET' && o.args[0].startsWith('tribal:review:')).length,
        slackPosts: calls.filter((c) => c.url.startsWith('https://hooks.slack.com/services/')).length,
      })
      `,
      redisEnv
    )
  })

  test('each submission gets its own distinct review id (no cross-talk)', () => {
    const ids = r.responses.map((x) => x.body.reviewId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const x of r.responses) expect(x.body.verified).toBe(false)
  })

  // REAL GAP (see PR body): there is no HMAC (or any) duplicate-enrollment-ID check in the
  // route. The same ID (and trivial formatting variants) creates a new pending review and a new
  // Slack post every time. Expected: the second submission is flagged/deduplicated.
  test.failing('the same ID submitted twice (and its formatting variants) creates only one pending review / Slack post', () => {
    expect(r.reviews).toBe(1)
    expect(r.slackPosts).toBe(1)
  })
})

describe('verify route: rate limiting', () => {
  describe.each([
    ['in-memory fallback', {}],
    ['Redis (emulated)', redisEnv],
  ])('%s', (_label, env) => {
    let r
    beforeAll(() => {
      r = run(
        `
        const ip = '203.0.113.50'
        const seq = []
        for (let i = 0; i < 12; i++) { const x = await callVerify({ ip }); seq.push({ status: x.statusCode, remaining: x.headers['X-RateLimit-Remaining'], reset: x.headers['X-RateLimit-Reset'], limit: x.headers['X-RateLimit-Limit'], body: x.body }) }
        const otherIp = summarize(await callVerify({ ip: '203.0.113.51' }))
        const slackBefore = calls.filter((c) => c.url.includes('hooks.slack.com/services')).length
        advanceTime(61 * 1000)
        const afterReset = summarize(await callVerify({ ip }))
        emit({ seq, otherIp, afterReset, slackBefore, nowSec: Math.floor(Date.now() / 1000) })
        `,
        env
      )
    })

    test('first 10 requests per IP per minute are accepted, 11th and 12th are 429', () => {
      expect(r.seq.slice(0, 10).map((s) => s.status)).toEqual(Array(10).fill(202))
      expect(r.seq.slice(10).map((s) => s.status)).toEqual([429, 429])
    })

    test('429 body is a failure with a reset time and X-RateLimit headers count down to 0', () => {
      expect(r.seq.slice(0, 10).map((s) => s.remaining)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0])
      const limited = r.seq[10]
      expect(limited.limit).toBe(10)
      expect(limited.remaining).toBe(0)
      expect(limited.body).toMatchObject({ success: false })
      expect(limited.body.error).toMatch(/Too Many Requests/)
      expect(limited.body.reset).toBe(limited.reset)
      expect(limited.body.verified).not.toBe(true)
    })

    test('limited requests are not stored or posted to Slack (only the 10 accepted ones + the other-IP/after-reset ones)', () => {
      expect(r.slackBefore).toBe(11) // 10 accepted + 1 from the other IP; the 2 limited ones sent nothing
    })

    test('a different IP is not affected', () => {
      expect(r.otherIp.statusCode).toBe(202)
    })

    test('after the window elapses the limit resets', () => {
      expect(r.afterReset.statusCode).toBe(202)
    })
  })

  test('per-email limit: 6th request in an hour is 429 across different IPs, case-insensitively; a different email is fine', () => {
    const r = run(
      `
      const statuses = []
      for (let i = 0; i < 6; i++) statuses.push((await callVerify({ body: validBody({ email: i % 2 ? 'ANN@Example.com' : 'ann@example.com' }) })).statusCode)
      const other = (await callVerify({ body: validBody({ email: 'bob@example.com' }) })).statusCode
      advanceTime(61 * 60 * 1000)
      const afterReset = (await callVerify({ body: validBody({ email: 'ann@example.com' }) })).statusCode
      emit({ statuses, other, afterReset })
      `
    )
    expect(r.statuses).toEqual([202, 202, 202, 202, 202, 429])
    expect(r.other).toBe(202)
    expect(r.afterReset).toBe(202)
  })

  test('rate limiter is keyed on x-real-ip, falls back to the socket address, and ignores x-forwarded-for', () => {
    const r = run(
      `
      const send = async (headers, remote) => {
        const res = mkRes()
        await verifyRoute({ method: 'POST', headers, socket: { remoteAddress: remote }, body: validBody() }, res)
        return res.statusCode
      }
      const noIp = []
      for (let i = 0; i < 11; i++) noIp.push(await send({}, '192.0.2.77'))
      const spoof = []
      for (let i = 0; i < 11; i++) spoof.push(await send({ 'x-real-ip': '192.0.2.88', 'x-forwarded-for': '9.9.9.' + i }, '10.0.0.1'))
      emit({ noIp, spoof })
      `
    )
    expect(r.noIp[10]).toBe(429)
    expect(r.spoof.slice(0, 10).every((s) => s === 202)).toBe(true)
    expect(r.spoof[10]).toBe(429)
  })

  test('a failing Redis rate limiter degrades to the in-memory limiter (still limits, no 500)', () => {
    const r = run(
      `
      const realFetch = globalThis.fetch
      globalThis.fetch = async (url, init) => {
        if (String(url).startsWith('https://redis.test.invalid') && /INCR|multi-exec/i.test(String(url) + String(init?.body))) return new Response(JSON.stringify({ error: 'redis down' }), { status: 500 }) // rate limiter only (HTTP error: no client-side retry backoff)
        return realFetch(url, init)
      }
      const statuses = []
      for (let i = 0; i < 11; i++) statuses.push((await callVerify({ ip: '203.0.113.9' })).statusCode)
      emit({ statuses })
      `,
      redisEnv
    )
    expect(r.statuses.slice(0, 10).every((s) => s !== 500 && s !== 429)).toBe(true)
    expect(r.statuses[10]).toBe(429)
  })
})

describe('verify route: error handling', () => {
  test('an exception in the Slack post yields a generic 500 without leaking the error or the ID', () => {
    const r = run(
      `
      globalThis.slackWebhookThrows = true
      const res = await callVerify({ cookie: 'shopify_customer_token=good-token' })
      emit({ res: summarize(res), logs })
      `,
      redisEnv
    )
    expect(r.res.statusCode).toBe(500)
    expect(r.res.body).toEqual({ success: false, verified: false, error: 'An internal error occurred during tribal verification.' })
    expect(JSON.stringify(r.res.body)).not.toContain('slack down')
    for (const l of r.logs) expect(l.text).not.toContain(RAW_ID)
  })

  test('production without Redis: 503, nothing posted or stored (guards against silently using the in-memory store)', () => {
    const r = run(
      `
      const res = await callVerify({})
      emit({ res: summarize(res), calls, redisOps })
      `,
      { NODE_ENV: 'production' }
    )
    expect(r.res.statusCode).toBe(503)
    expect(r.res.body.verified).toBe(false)
    expect(r.calls).toEqual([])
    expect(r.redisOps).toEqual([])
  })
})
