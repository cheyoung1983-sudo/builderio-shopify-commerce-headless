const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

/**
 * Routes moved from app/api (App Router) to pages/api so the site has no
 * App Router at all (pages/404.tsx renders instead of the built-in app
 * not-found page). Each handler is invoked with a mock req/res.
 */
const repoRoot = path.resolve(__dirname, '..')
const url = (p) => pathToFileURL(path.join(repoRoot, p)).href

const { createFirebaseJwtMock } = require('./helpers/firebase-jwt-mock')

const jwtMock = createFirebaseJwtMock('dcpllcrev4')
const OWNER_TOKEN = jwtMock.signIdToken({ email: 'ryan@displaycellpros.com', email_verified: true })
const PERSONAL_OWNER_TOKEN = jwtMock.signIdToken({ email: 'cheyoung1983@gmail.com', email_verified: true })
const OUTSIDER_TOKEN = jwtMock.signIdToken({ email: 'outsider@example.com', email_verified: true })

function run(routePath, body, env = {}) {
  const script = `
    const { Readable } = await import('node:stream')
    const realFetch = globalThis.fetch
    globalThis.fetch = async (u, init) => {
      if (String(u).includes('securetoken@system.gserviceaccount.com')) {
        return new Response(JSON.stringify(${JSON.stringify(jwtMock.certsPayload)}), {
          status: 200,
          headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' },
        })
      }
      return realFetch(u, init)
    }
    const mod = await import(${JSON.stringify(url(routePath))})
    function mkReq({ method = 'GET', url = '/', headers = {}, body } = {}) {
      const chunks = body === undefined ? [] : [Buffer.isBuffer(body) ? body : Buffer.from(body)]
      const r = Readable.from(chunks)
      r.method = method; r.url = url; r.headers = headers; r.query = {}
      return r
    }
    function mkRes() {
      const res = { statusCode: 200, headers: {}, body: undefined, ended: false }
      res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; return res }
      res.getHeader = (k) => res.headers[k.toLowerCase()]
      res.status = (c) => { res.statusCode = c; return res }
      res.json = (b) => { res.body = b; res.ended = true; return res }
      res.send = (b) => { res.body = Buffer.isBuffer(b) ? { buffer: b.toString('base64') } : b; res.ended = true; return res }
      res.end = (b) => { if (b !== undefined) res.body = String(b); res.ended = true; return res }
      return res
    }
    const call = async (opts) => { const res = mkRes(); await mod.default(mkReq(opts), res); return res }
    ${body}
  `
  const out = execFileSync(process.execPath, ['--experimental-transform-types', '--no-warnings', '--input-type=module', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test', ...env },
  })
  return JSON.parse(out.trim().split('\n').pop())
}

async function runHealthRoute(shopifyOk, authHeader) {
  const routePath = path.resolve(repoRoot, 'pages/api/health.ts')
  const adminAuthPath = path.resolve(repoRoot, 'lib/tribal/admin-auth.ts')
  const script = `
    const fs = require('node:fs')
    const path = require('node:path')
    const Module = require('node:module')
    const ts = require('typescript')
    const compileTs = (filePath) => {
      const m = new Module(filePath, module)
      m.filename = filePath
      m.paths = Module._nodeModulePaths(path.dirname(filePath))
      const nativeReq = Module.createRequire(filePath)
      m.require = (specifier) => {
        if (specifier === '../../lib/firebase') return { db: {} }
        if (specifier === 'firebase/firestore') {
          return { doc: (_db, collection, id) => ({ collection, id }), getDoc: async () => ({}) }
        }
        if (specifier === '../../lib/admin-notification-settings') {
          return { getAdminNotificationSettings: async () => ({ slackWebhookUrl: 'configured' }) }
        }
        if (specifier === '../../lib/tribal/admin-auth') {
          return compileTs(${JSON.stringify(adminAuthPath)})
        }
        if (specifier === './owner-allowlist.ts' || specifier === './owner-allowlist') {
          return compileTs(path.resolve(path.dirname(filePath), 'owner-allowlist.ts'))
        }
        return nativeReq(specifier)
      }
      const source = fs.readFileSync(filePath, 'utf8')
      const compiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          esModuleInterop: true,
        },
      }).outputText
      m._compile(compiled, filePath)
      return m.exports
    }
    const routeExports = compileTs(${JSON.stringify(routePath)})
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN = 'example.myshopify.com'
    global.fetch = async (u) => {
      if (String(u).includes('securetoken@system.gserviceaccount.com')) {
        return {
          ok: true,
          headers: { get: () => 'public, max-age=3600' },
          json: async () => (${JSON.stringify(jwtMock.certsPayload)}),
        }
      }
      return { ok: ${JSON.stringify(shopifyOk)} }
    }
    const response = {
      statusCode: 200,
      setHeader(name, value) { return this },
      status(code) { this.statusCode = code; return this },
      json(body) { this.body = body; return this },
    }
    const headers = ${authHeader ? JSON.stringify({ authorization: authHeader }) : '{}'}
    routeExports.default({ method: 'GET', headers, query: {} }, response)
      .then(() => console.log(JSON.stringify({ statusCode: response.statusCode, body: response.body })))
      .catch((error) => { console.error(error); process.exitCode = 1 })
  `
  const output = execFileSync(process.execPath, ['-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  })
  return JSON.parse(output.trim().split('\n').pop())
}

describe('pages/api routes moved from app/api', () => {
  test('app/ directory no longer exists', () => {
    expect(require('node:fs').existsSync(path.join(repoRoot, 'app'))).toBe(false)
  })

  test('GET /api/health fails closed without verified owner auth and reports healthy/degraded for owners', async () => {
    const unauth = await runHealthRoute(true)
    expect(unauth.statusCode).toBe(403)

    const outsider = await runHealthRoute(true, `Bearer ${OUTSIDER_TOKEN}`)
    expect(outsider.statusCode).toBe(403)

    const healthy = await runHealthRoute(true, `Bearer ${OWNER_TOKEN}`)
    expect(healthy.statusCode).toBe(200)
    expect(Object.keys(healthy.body)).toEqual(['timestamp', 'shopify', 'firestore', 'auth0', 'overall'])
    expect(healthy.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(Number.isNaN(Date.parse(healthy.body.timestamp))).toBe(false)
    expect(healthy.body.shopify.status).toBe('connected')
    expect(healthy.body.firestore.status).toBe('connected')
    expect(healthy.body.auth0.status).toBe('configured')
    expect(healthy.body.overall).toBe('healthy')

    const degraded = await runHealthRoute(false, `Bearer ${PERSONAL_OWNER_TOKEN}`)
    expect(degraded.statusCode).toBe(503)
    expect(degraded.body.shopify.status).toBe('error')
    expect(degraded.body.overall).toBe('degraded')
  })

  test('GET/POST /api/config requires verified owner auth and keeps merge semantics', () => {
    const r = run('pages/api/config.ts', `
      const unauth = await call({ method: 'GET' })
      const outsider = await call({ method: 'GET', headers: { authorization: 'Bearer ' + ${JSON.stringify(OUTSIDER_TOKEN)} } })
      const g = await call({ method: 'GET', headers: { authorization: 'Bearer ' + ${JSON.stringify(OWNER_TOKEN)} } })
      const p = await call({ method: 'POST', headers: { authorization: 'Bearer ' + ${JSON.stringify(PERSONAL_OWNER_TOKEN)}, 'content-type': 'application/json' }, body: JSON.stringify({ shopifyCartEnabled: false }) })
      const d = await call({ method: 'DELETE' })
      console.log(JSON.stringify({ unauth, outsider, g, p, d, cfg: mod.config }))
    `)
    expect(r.unauth.statusCode).toBe(403)
    expect(r.outsider.statusCode).toBe(403)
    expect(r.g.statusCode).toBe(200)
    expect(r.g.body).toEqual({ shopifyCartEnabled: true, webhookEndpoint: 'https://api.example.com/webhooks' })
    expect(r.p.statusCode).toBe(200)
    expect(r.p.body).toEqual({ success: true, config: { shopifyCartEnabled: false, webhookEndpoint: 'https://api.example.com/webhooks' } })
    expect(r.d.statusCode).toBe(405)
  })

  test('GET /api/tribal/admin/export-audit: requires owner auth; CSV with BOM + headers, JSON format, status filter', () => {
    const r = run('pages/api/tribal/admin/export-audit.ts', `
      const unauth = await call({ method: 'GET', url: '/api/tribal/admin/export-audit' })
      const outsider = await call({ method: 'GET', url: '/api/tribal/admin/export-audit', headers: { authorization: 'Bearer ' + ${JSON.stringify(OUTSIDER_TOKEN)} } })
      const authHeaders = { authorization: 'Bearer ' + ${JSON.stringify(OWNER_TOKEN)} }
      const csv = await call({ method: 'GET', url: '/api/tribal/admin/export-audit', headers: authHeaders })
      const json = await call({ method: 'GET', url: '/api/tribal/admin/export-audit?format=json&status=pending', headers: authHeaders })
      const all = await call({ method: 'GET', url: '/api/tribal/admin/export-audit?format=json', headers: authHeaders })
      console.log(JSON.stringify({ unauth, outsider, csv, json, all }))
    `)
    expect(r.unauth.statusCode).toBe(403)
    expect(r.outsider.statusCode).toBe(403)
    expect(r.csv.statusCode).toBe(200)
    expect(r.csv.headers['content-type']).toBe('text/csv; charset=utf-8')
    expect(r.csv.headers['content-disposition']).toMatch(/^attachment; filename="tribal-tax-audit-report-\d{4}-\d{2}-\d{2}\.csv"$/)
    expect(r.csv.headers['cache-control']).toBe('no-store, max-age=0')
    expect(r.csv.body.charCodeAt(0)).toBe(0xfeff)
    expect(r.all.body.total).toBe(0) // no fabricated audit rows
    expect(r.json.body.total).toBe(0)
  })

  test('POST /api/elevenlabs/tts and /stt: 500 with error JSON when the key is missing; GET 405', () => {
    const env = { ELEVENLABS_API_KEY: '' }
    const tts = run('pages/api/elevenlabs/tts.ts', `
      const p = await call({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'hi', voiceId: 'v' }) })
      const g = await call({ method: 'GET' })
      console.log(JSON.stringify({ p, g, cfg: mod.config }))
    `, env)
    expect(tts.p.statusCode).toBe(500)
    expect(tts.p.body).toEqual({ error: 'ElevenLabs API key not configured.' })
    expect(tts.g.statusCode).toBe(405)
    expect(tts.cfg).toEqual({ api: { bodyParser: false } })

    const stt = run('pages/api/elevenlabs/stt.ts', `
      const boundary = 'XYZ'
      const body = '--XYZ\\r\\nContent-Disposition: form-data; name="model_id"\\r\\n\\r\\nscribe_v1\\r\\n--XYZ--\\r\\n'
      const p = await call({ method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=' + boundary }, body })
      console.log(JSON.stringify({ p }))
    `, env)
    expect(stt.p.statusCode).toBe(500)
    expect(stt.p.body).toEqual({ error: 'ElevenLabs API key not configured.' })
  })
})

describe('Flow requirement: /api/webhooks/shopify verifies HMAC on exact raw bytes', () => {
  const SECRET = 'whsec_moved_routes_test'
  const env = { SHOPIFY_WEBHOOK_SECRET: SECRET, SHOPIFY_CLIENT_SECRET: '' }
  const script = (sigExpr) => `
    const crypto = await import('node:crypto')
    // Unusual whitespace + unicode: a re-serialized body would not match.
    const raw = Buffer.from('{ "id":  1001,\\n "note": "caf\\u00e9 \\u2615" }', 'utf8')
    const good = crypto.createHmac('sha256', ${JSON.stringify(SECRET)}).update(raw).digest('base64')
    const reserialized = crypto.createHmac('sha256', ${JSON.stringify(SECRET)}).update(JSON.stringify(JSON.parse(raw.toString()))).digest('base64')
    const sig = ${sigExpr}
    const res = await call({ method: 'POST', headers: { 'x-shopify-hmac-sha256': sig, 'x-shopify-topic': 'app/uninstalled', 'content-type': 'application/json' }, body: raw })
    console.log(JSON.stringify({ status: res.statusCode, cfg: mod.config }))
  `

  test('bodyParser is disabled', () => {
    const r = run('pages/api/webhooks/shopify.ts', script('good'), env)
    expect(r.cfg.api.bodyParser).toBe(false)
  })

  test('signature over the raw bytes is accepted (not 401)', () => {
    const r = run('pages/api/webhooks/shopify.ts', script('good'), env)
    expect(r.status).not.toBe(401)
    expect(r.status).toBeLessThan(500)
  })

  test('signature over a re-serialized body is rejected with 401', () => {
    expect(run('pages/api/webhooks/shopify.ts', script('reserialized'), env).status).toBe(401)
  })

  test('forged / missing signature is rejected with 401', () => {
    expect(run('pages/api/webhooks/shopify.ts', script("'Zm9yZ2Vk'"), env).status).toBe(401)
    expect(run('pages/api/webhooks/shopify.ts', script("''"), env).status).toBe(401)
  })
})
