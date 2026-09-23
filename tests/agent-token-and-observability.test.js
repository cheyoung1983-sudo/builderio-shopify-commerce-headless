const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..')
const routePaths = {
  token: path.join(repoRoot, 'pages', 'api', 'agent', 'token.ts'),
  signedUrl: path.join(repoRoot, 'pages', 'api', 'agent', 'signed-url.ts'),
  observability: path.join(repoRoot, 'pages', 'api', 'observability', 'log.ts'),
}

function runRoute(routeName, requests, options = {}) {
  const tokenMock = `
    globalThis.__tokenCalls = []
    export class ElevenLabsTokenError extends Error {}
    export async function acquireElevenLabsTokenWithBackoff(options) {
      globalThis.__tokenCalls.push(options)
      if (globalThis.__tokenFailure) throw new Error('private token upstream details')
      return { token: 'ephemeral-token', conversationId: 'conversation-id' }
    }
  `
  const loaderSource = `
    const tokenUrl = ${JSON.stringify(`data:text/javascript,${encodeURIComponent(tokenMock)}`)}
    export async function resolve(specifier, context, nextResolve) {
      if (specifier.endsWith('/lib/elevenlabs-token') || specifier === '@lib/elevenlabs-token') {
        return { url: tokenUrl, shortCircuit: true }
      }
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) {
        try { return await nextResolve(specifier + '.ts', context, nextResolve) } catch {}
        try { return await nextResolve(specifier + '/index.ts', context, nextResolve) } catch {}
      }
      return nextResolve(specifier, context, nextResolve)
    }
  `
  const script = `
    globalThis.__tokenCalls = []
    const route = await import(${JSON.stringify(pathToFileURL(routePaths[routeName]).href)})
    globalThis.__tokenFailure = ${Boolean(options.tokenFailure)}
    globalThis.fetch = async () => {
      globalThis.__fetchCalls = (globalThis.__fetchCalls || 0) + 1
      if (globalThis.__signedUrlFailure) {
        return { ok: false, status: 502, async text() { return 'private signed URL details' } }
      }
      return { ok: true, status: 200, async json() { return { signed_url: 'https://signed.example.test/session' } } }
    }
    globalThis.__signedUrlFailure = ${Boolean(options.signedUrlFailure)}
    const responses = []
    for (const rawRequestInput of ${JSON.stringify(requests)}) {
      const requestInput = rawRequestInput.__largeObservability
        ? { body: { eventId: 'e'.repeat(500), name: 'n'.repeat(500), message: 'm'.repeat(5000), stack: 's'.repeat(10000), componentStack: 'c'.repeat(10000), url: 'https://example.test/'.repeat(500), userAgent: 'u'.repeat(5000), timestamp: 'not-a-timestamp', metadata: { secret: 'x'.repeat(10000) } } }
        : rawRequestInput
      const request = {
        method: 'POST', headers: { origin: 'https://displaycellpros.com' }, body: {}, query: {},
        socket: { remoteAddress: '198.51.100.10' }, ...requestInput,
      }
      const headers = {}
      const response = {
        headers, statusCode: 200,
        setHeader(name, value) { headers[name] = value },
        getHeader(name) { return headers[name] },
        status(code) { this.statusCode = code; return this },
        json(body) { this.body = body; return this },
        end() { this.ended = true; return this },
      }
      await route.default(request, response)
      responses.push({ statusCode: response.statusCode, headers, body: response.body, ended: response.ended })
    }
    console.log(JSON.stringify({ responses, tokenCalls: globalThis.__tokenCalls, fetchCalls: globalThis.__fetchCalls || 0 }))
  `

  const output = execFileSync(process.execPath, [
    '--experimental-strip-types', '--experimental-loader',
    `data:text/javascript,${encodeURIComponent(loaderSource)}`,
    '--input-type=module', '-e', script,
  ], {
    cwd: repoRoot, encoding: 'utf8',
    env: {
      ...process.env, NODE_ENV: options.nodeEnv || 'test',
      ELEVENLABS_API_KEY: 'sk_test-key',
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --no-warnings`.trim(),
    },
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  return JSON.parse(output.trim())
}

describe('ElevenLabs token and observability security', () => {
  test('token accepts exact origins but rejects run.app and substring localhost origins', () => {
    const approved = runRoute('token', [{ body: { agentId: 'agent_3101m30qaxc1f3981zq05pp86ax1' } }])
    expect(approved.responses[0].statusCode).toBe(200)
    expect(approved.responses[0].headers['Access-Control-Allow-Origin']).toBe('https://displaycellpros.com')

    for (const origin of ['https://storefront-abc.run.app', 'https://notlocalhost.example']) {
      const rejected = runRoute('token', [{ headers: { origin }, body: {} }])
      expect(rejected.responses[0].statusCode).toBe(403)
      expect(rejected.responses[0].headers['Access-Control-Allow-Origin']).toBeUndefined()
      expect(rejected.tokenCalls).toHaveLength(0)
    }
  })

  test('localhost is allowed only in development', () => {
    const development = runRoute('token', [{ headers: { origin: 'http://localhost:3000' }, body: {} }], { nodeEnv: 'development' })
    expect(development.responses[0].statusCode).toBe(200)
    const production = runRoute('token', [{ headers: { origin: 'http://localhost:3000' }, body: {} }], { nodeEnv: 'production' })
    expect(production.responses[0].statusCode).toBe(403)
  })

  test('token validates agent IDs before calling ElevenLabs', () => {
    const result = runRoute('token', [{ body: { agentId: 'agent_<script>alert(1)</script>' } }])
    expect(result.responses[0].statusCode).toBe(400)
    expect(result.responses[0].body).toEqual({ error: 'Invalid agent ID' })
    expect(result.tokenCalls).toHaveLength(0)
  })

  test('token rate limits a client before upstream calls', () => {
    const result = runRoute('token', Array.from({ length: 31 }, () => ({ body: {} })))
    const throttled = result.responses.filter(({ statusCode }) => statusCode === 429)
    expect(throttled).toHaveLength(1)
    expect(throttled[0].headers['Retry-After']).toMatch(/^\d+$/)
    expect(result.tokenCalls).toHaveLength(30)
  })

  test('signed URL keeps successful response fields and hides upstream details', () => {
    const success = runRoute('signedUrl', [{ body: { agentId: 'agent_3101m30qaxc1f3981zq05pp86ax1' } }])
    expect(success.responses[0].body).toEqual({
      signedUrl: 'https://signed.example.test/session',
      authenticated: true,
      agentId: 'agent_3101m30qaxc1f3981zq05pp86ax1',
    })

    const failure = runRoute('signedUrl', [{ body: {} }], { signedUrlFailure: true })
    expect(failure.responses[0].statusCode).toBe(502)
    expect(failure.responses[0].body).toEqual({
      authenticated: false,
      agentId: 'agent_3101m30qaxc1f3981zq05pp86ax1',
      error: 'Failed to generate signed URL',
    })
  })

  test('signed URL validates agent IDs before upstream calls', () => {
    const result = runRoute('signedUrl', [{ body: { agentId: 'not-an-elevenlabs-agent' } }])
    expect(result.responses[0].statusCode).toBe(400)
    expect(result.responses[0].body).toEqual({ error: 'Invalid agent ID' })
    expect(result.fetchCalls).toBe(0)
  })

  test('observability applies field caps and replaces invalid timestamps', () => {
    const result = runRoute('observability', [{ __largeObservability: true }])
    const entry = result.responses[0].body.entry
    expect(result.responses[0].statusCode).toBe(200)
    expect(entry.eventId.length).toBeLessThanOrEqual(128)
    expect(entry.error.name.length).toBeLessThanOrEqual(128)
    expect(entry.error.message.length).toBeLessThanOrEqual(2048)
    expect(entry.error.stack.length).toBeLessThanOrEqual(4096)
    expect(entry.error.componentStack.length).toBeLessThanOrEqual(4096)
    expect(entry.httpRequest.requestUrl.length).toBeLessThanOrEqual(2048)
    expect(entry.httpRequest.userAgent.length).toBeLessThanOrEqual(512)
    expect(String(entry.metadata).length).toBeLessThanOrEqual(4096)
    expect(entry.timestamp).not.toBe('not-a-timestamp')
    expect(() => new Date(entry.timestamp).toISOString()).not.toThrow()
  })

  test('observability rejects unapproved origins and omits entry in production', () => {
    const rejected = runRoute('observability', [{ headers: { origin: 'https://attacker.test' }, body: {} }])
    expect(rejected.responses[0].statusCode).toBe(403)
    expect(rejected.responses[0].headers['Access-Control-Allow-Origin']).toBeUndefined()

    const production = runRoute('observability', [{ body: { message: 'safe message' } }], { nodeEnv: 'production' })
    expect(production.responses[0].body).toEqual(expect.objectContaining({ ok: true }))
    expect(production.responses[0].body).not.toHaveProperty('entry')
  })
})
