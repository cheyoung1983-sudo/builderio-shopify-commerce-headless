/**
 * Tests for the ElevenLabs voice-intake tool endpoints:
 *   POST /api/pricing/quote
 *   POST /api/intake/dispatch-sms
 *   POST /api/intake/escalate-tier3
 * Handlers are TypeScript, so each scenario runs in a child Node process with
 * --experimental-strip-types (same approach as elevenlabs-token-security.test.js).
 * fetch is stubbed, so no real SMS or Slack message is ever sent.
 */
const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..')
const url = (rel) => pathToFileURL(path.join(repoRoot, rel)).href
const SECRET = 'unit-test-agent-secret-value'

const BASE_ENV = {
  ELEVENLABS_WEBHOOK_SECRET: SECRET,
  TWILIO_ACCOUNT_SID: 'ACtest',
  TWILIO_AUTH_TOKEN: 'twilio-test-token',
  TWILIO_FROM_NUMBER: '+15095550100',
  SLACK_ESCALATION_WEBHOOK_URL: 'https://hooks.slack.test/services/T/B/X',
}

function run(body, env = BASE_ENV) {
  const script = `
    const calls = []
    globalThis.fetch = async (u, init) => {
      calls.push({ url: String(u), body: init && init.body ? String(init.body) : '' })
      return { ok: true, status: 200, text: async () => '', json: async () => ({}) }
    }
    const logs = []
    for (const k of ['log', 'warn', 'error', 'info']) console[k] = (...a) => logs.push(a.join(' '))
    const routes = {
      quote: (await import(${JSON.stringify(url('pages/api/pricing/quote.ts'))})).default,
      sms: (await import(${JSON.stringify(url('pages/api/intake/dispatch-sms.ts'))})).default,
      escalate: (await import(${JSON.stringify(url('pages/api/intake/escalate-tier3.ts'))})).default,
    }
    const lib = {
      phone: await import(${JSON.stringify(url('lib/voice-intake/phone.ts'))}),
      sms: await import(${JSON.stringify(url('lib/voice-intake/sms.ts'))}),
      slack: await import(${JSON.stringify(url('lib/voice-intake/slack.ts'))}),
    }
    async function call(route, { method = 'POST', headers = {}, body = {}, ip = '203.0.113.7' } = {}) {
      let statusCode = 200, json = null
      const resHeaders = {}
      const req = { method, headers: { 'x-real-ip': ip, ...headers }, body, socket: {} }
      const res = {
        setHeader(k, v) { resHeaders[k.toLowerCase()] = v },
        status(c) { statusCode = c; return this },
        json(j) { json = j; return this },
      }
      await routes[route](req, res)
      return { status: statusCode, json, headers: resHeaders }
    }
    const auth = { 'x-dcp-agent-secret': ${JSON.stringify(SECRET)} }
    const out = await (async () => { ${body} })()
    process.stdout.write('\\n' + JSON.stringify(out) + '\\n')
  `
  const childEnv = { ...process.env, NODE_ENV: 'production' }
  for (const k of Object.keys(BASE_ENV)) delete childEnv[k]
  const output = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...childEnv, ...env },
  })
  const line = output.trim().split('\n').reverse().find((l) => l.startsWith('{') || l.startsWith('['))
  return JSON.parse(line)
}

const validSms = {
  customer_name: 'Test Customer',
  customer_phone: '(509) 555-0142',
  device_summary: 'iPhone 13 cracked screen',
  quoted_price: 189.5,
  service_tier: 'Tier 2',
}

describe('voice-intake tools: auth guard', () => {
  test('401 without header and with a wrong header, on all three routes', () => {
    const r = run(`
      const out = {}
      for (const route of ['quote', 'sms', 'escalate']) {
        out[route] = [
          (await call(route)).status,
          (await call(route, { headers: { 'x-dcp-agent-secret': 'wrong' } })).status,
        ]
      }
      out.fetchCalls = calls.length
      return out
    `)
    expect(r.quote).toEqual([401, 401])
    expect(r.sms).toEqual([401, 401])
    expect(r.escalate).toEqual([401, 401])
    expect(r.fetchCalls).toBe(0)
  })

  test('503 when ELEVENLABS_WEBHOOK_SECRET is unset, even with a header', () => {
    const env = { ...BASE_ENV }
    delete env.ELEVENLABS_WEBHOOK_SECRET
    const r = run(`
      return Promise.all(['quote', 'sms', 'escalate'].map(async (route) => (await call(route, { headers: auth })).status))
    `, env)
    expect(r).toEqual([503, 503, 503])
  })

  test('405 for non-POST methods', () => {
    const r = run(`
      const out = []
      for (const route of ['quote', 'sms', 'escalate']) {
        const g = await call(route, { method: 'GET', headers: auth })
        out.push([g.status, g.headers.allow])
      }
      return out
    `)
    expect(r).toEqual([[405, 'POST'], [405, 'POST'], [405, 'POST']])
  })

  test('correct header reaches the handler (quote returns a price)', () => {
    const r = run(`
      const q = await call('quote', { headers: auth, body: { device_model: 'iPhone 13', repair_type: 'battery', zip_code: '99208' } })
      return { status: q.status, json: q.json }
    `)
    expect(r.status).toBe(200)
    expect(r.json.success).toBe(true)
    expect(r.json.tier).toBe('Tier 1')
    expect(r.json.total_out_the_door).toBeGreaterThan(0)
  })
})

describe('voice-intake tools: phone normalization', () => {
  test('normalizes common US formats and rejects invalid ones', () => {
    const r = run(`
      const n = lib.phone.normalizeUsPhone
      return {
        ok: ['(509) 255-3852', '509-255-3852', '509.255.3852', '5092553852', '1 509 255 3852', '+1 (509) 255-3852', '+15092553852'].map(n),
        bad: ['255-3852', '(109) 255-3852', '509-155-3852', '+44 20 7946 0958', '509-255-3852 x12', 'call me', '', null, '1234567890123'].map(n),
      }
    `)
    expect(new Set(r.ok)).toEqual(new Set(['+15092553852']))
    expect(r.bad.every((v) => v === null)).toBe(true)
  })
})

describe('voice-intake tools: dispatch-sms', () => {
  test('sends one Twilio SMS with the services-faq link and business phone, no /book link', () => {
    const r = run(`
      const s = await call('sms', { headers: auth, body: ${JSON.stringify(validSms)} })
      return { status: s.status, json: s.json, calls, logs }
    `)
    expect(r.status).toBe(200)
    expect(r.json.smsSent).toBe(true)
    expect(r.calls).toHaveLength(1)
    expect(r.calls[0].url).toContain('api.twilio.com')
    const params = new URLSearchParams(r.calls[0].body)
    expect(params.get('To')).toBe('+15095550142')
    expect(params.get('Body')).toContain('https://www.displaycellpros.com/services-faq')
    expect(params.get('Body')).toContain('(509) 255-3852')
    expect(params.get('Body')).not.toContain('/book')
    expect(JSON.stringify(r.logs)).not.toContain('5550142')
  })

  test('503 and no send when Twilio env is missing', () => {
    const env = { ...BASE_ENV }
    delete env.TWILIO_AUTH_TOKEN
    const r = run(`
      const s = await call('sms', { headers: auth, body: ${JSON.stringify(validSms)} })
      return { status: s.status, smsSent: s.json.smsSent, calls: calls.length }
    `, env)
    expect(r).toEqual({ status: 503, smsSent: false, calls: 0 })
  })

  test('rate limits: 3 per phone per hour, 10 per IP per hour', () => {
    const r = run(`
      const phoneStatuses = []
      for (let i = 0; i < 4; i++) {
        phoneStatuses.push((await call('sms', { headers: auth, ip: '198.51.100.1', body: { ...${JSON.stringify(validSms)}, customer_phone: '509-555-0142' } })).status)
      }
      lib.sms.resetSmsLimiters()
      const ipStatuses = []
      for (let i = 0; i < 11; i++) {
        const phone = '+1509555' + String(1000 + i)
        ipStatuses.push((await call('sms', { headers: auth, ip: '198.51.100.2', body: { ...${JSON.stringify(validSms)}, customer_phone: phone } })).status)
      }
      return { phoneStatuses, ipStatuses, sends: calls.length }
    `)
    expect(r.phoneStatuses).toEqual([200, 200, 200, 429])
    expect(r.ipStatuses.slice(0, 10).every((s) => s === 200)).toBe(true)
    expect(r.ipStatuses[10]).toBe(429)
    expect(r.sends).toBe(13)
  })

  test('daily per-instance cap stops sends after the limit', () => {
    const r = run(`
      const statuses = []
      for (let i = 0; i < lib.sms.SMS_LIMITS.perInstancePerDay + 1; i++) {
        const phone = '+1509' + String(2000000 + i)
        statuses.push((await call('sms', { headers: auth, ip: '192.0.2.' + (i % 250), body: { ...${JSON.stringify(validSms)}, customer_phone: phone } })).status)
      }
      return { last: statuses[statuses.length - 1], ok: statuses.filter((s) => s === 200).length }
    `)
    expect(r.ok).toBe(100)
    expect(r.last).toBe(429)
  })
})

describe('voice-intake tools: quote', () => {
  test('refuses to price Tier 3 and tells the agent to escalate', () => {
    const r = run(`
      const q = await call('quote', { headers: auth, body: { device_model: 'iPhone 14 Pro', repair_type: 'logic_board' } })
      return { status: q.status, json: q.json }
    `)
    expect(r.status).toBe(200)
    expect(r.json.quote_available).toBe(false)
    expect(r.json.requires_escalation).toBe(true)
    expect(r.json.escalation_tool).toBe('escalate_tier3_ticket')
    expect(r.json.total_out_the_door).toBeUndefined()
  })

  test('400 on invalid input', () => {
    const r = run(`return { status: (await call('quote', { headers: auth, body: { repair_type: 'battery' } })).status }`)
    expect(r.status).toBe(400)
  })
})

describe('voice-intake tools: escalate-tier3', () => {
  test('Slack payload has a ticket reference and no phone number or email', () => {
    const r = run(`
      const e = await call('escalate', { headers: auth, body: {
        customer_name: 'Test Customer',
        customer_phone: '(509) 555-0142',
        customer_email: 'test.customer@example.com',
        device_model: 'iPhone 12',
        failure_symptoms: 'No power after water exposure. Call me back at 509-555-0142 <!channel>',
        intake_notes: 'email test.customer@example.com',
      } })
      return { status: e.status, json: e.json, calls, logs }
    `)
    expect(r.status).toBe(200)
    expect(r.json.escalated).toBe(true)
    expect(r.calls).toHaveLength(1)
    const text = JSON.parse(r.calls[0].body).text
    expect(text).toContain(r.json.ticketId)
    expect(text).toMatch(/on file with the voice agent/)
    expect(text).not.toMatch(/555[\s.-]?0142/)
    expect(text).not.toContain('example.com')
    expect(text).not.toContain('<!channel>')
    expect(JSON.stringify(r.logs)).not.toContain('0142')
  })

  test('503 when SLACK_ESCALATION_WEBHOOK_URL is unset', () => {
    const env = { ...BASE_ENV }
    delete env.SLACK_ESCALATION_WEBHOOK_URL
    const r = run(`
      const e = await call('escalate', { headers: auth, body: { customer_name: 'A', customer_phone: '5095550142', device_model: 'X', failure_symptoms: 'Y' } })
      return { status: e.status, calls: calls.length }
    `, env)
    expect(r).toEqual({ status: 503, calls: 0 })
  })
})

describe('voice-intake tools: pricing engine (ported from rev5)', () => {
  test('matches rev5 pricing math', () => {
    const r = run(`
      const p = await import(${JSON.stringify(url('lib/voice-intake/pricing.ts'))})
      const t1 = p.calculateQuote(p.ServiceTier.TIER_1_POWER, '99201')
      const std = p.calculateQuote(p.ServiceTier.TIER_2_DISPLAY, '99201', { model: 'iPhone 13' })
      const pm = p.calculateQuote(p.ServiceTier.TIER_2_DISPLAY, '99201', { model: 'iPhone 15 Pro Max' })
      const valley = p.calculateQuote(p.ServiceTier.TIER_1_POWER, '99206')
      return { t1, std, pm, valley, cityRate: p.TAX_RATES.SPOKANE_CITY.rate, valleyRate: p.TAX_RATES.SPOKANE_VALLEY.rate }
    `)
    expect(r.t1.partsCost).toBe(45)
    expect(r.t1.laborCost).toBe(27.5)
    expect(r.t1.overhead).toBeCloseTo(45 * 0.95, 5)
    expect(r.t1.tax).toBeCloseTo(r.t1.subtotal * r.cityRate, 5)
    expect(r.pm.modelAdjustment).toBe(35)
    expect(r.pm.partsCost).toBe(r.std.partsCost + 35)
    expect(r.valley.tax).toBeCloseTo(r.valley.subtotal * r.valleyRate, 5)
  })
})
