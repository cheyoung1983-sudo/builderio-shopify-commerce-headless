const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function runTokenEndpointScript(testFnBody, customEnv = {}) {
  const repoRoot = path.resolve(__dirname, '..')
  const handlerUrl = pathToFileURL(path.join(repoRoot, 'pages/api/agent/token.ts')).href
  const securityUrl = pathToFileURL(path.join(repoRoot, 'lib/api-security/index.ts')).href

  const script = `
    const handlerModule = await import(${JSON.stringify(handlerUrl)})
    const securityModule = await import(${JSON.stringify(securityUrl)})
    const handler = handlerModule.default

    ${testFnBody}
  `

  const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ...customEnv,
    },
  })

  const lines = output.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  const lastJsonLine = lines.reverse().find((l) => l.startsWith('{') && l.endsWith('}'))
  if (!lastJsonLine) {
    throw new Error(`No JSON output line found in script output:\n${output}`)
  }
  return JSON.parse(lastJsonLine)
}

describe('ElevenLabs Token Acquisition Endpoint Security', () => {
  test('Rejection: Rejects request with 400 Bad Request when xi-api-key is present in frontend request headers', () => {
    const result = runTokenEndpointScript(`
      let statusCode = 200;
      let responseJson = null;

      const req = {
        method: 'POST',
        headers: {
          origin: 'https://displaycellpros.com',
          'xi-api-key': 'sk_accidental_client_leak_12345',
          'content-type': 'application/json',
        },
        body: { agentId: 'agent_test_123' },
        query: {},
        socket: { remoteAddress: '127.0.0.1' },
      };

      const res = {
        setHeader() {},
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          responseJson = data;
          return this;
        },
      };

      await handler(req, res);
      console.log(JSON.stringify({ statusCode, responseJson }));
    `)

    expect(result.statusCode).toBe(400)
    expect(result.responseJson.error).toMatch(/header|client|server-side/i)
    // Ensure the leaked key is not echoed back in responseJson
    expect(JSON.stringify(result.responseJson)).not.toContain('sk_accidental_client_leak_12345')
  })

  test('Rejection: Rejects request with 400 Bad Request when x-api-key is present in frontend request headers', () => {
    const result = runTokenEndpointScript(`
      let statusCode = 200;
      let responseJson = null;

      const req = {
        method: 'POST',
        headers: {
          origin: 'https://displaycellpros.com',
          'x-api-key': 'sk_accidental_client_leak_67890',
          'content-type': 'application/json',
        },
        body: { agentId: 'agent_test_123' },
        query: {},
        socket: { remoteAddress: '127.0.0.1' },
      };

      const res = {
        setHeader() {},
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          responseJson = data;
          return this;
        },
      };

      await handler(req, res);
      console.log(JSON.stringify({ statusCode, responseJson }));
    `)

    expect(result.statusCode).toBe(400)
    expect(result.responseJson.error).toMatch(/header|client|server-side/i)
    expect(JSON.stringify(result.responseJson)).not.toContain('sk_accidental_client_leak_67890')
  })

  test('CORS: Access-Control-Allow-Headers must not include xi-api-key in preflight OPTIONS response', () => {
    const result = runTokenEndpointScript(`
      let statusCode = 200;
      const headers = {};

      const req = {
        method: 'OPTIONS',
        headers: {
          origin: 'https://displaycellpros.com',
        },
        socket: { remoteAddress: '127.0.0.1' },
      };

      const res = {
        setHeader(k, v) {
          headers[k] = v;
        },
        status(code) {
          statusCode = code;
          return this;
        },
        send() {},
      };

      await handler(req, res);
      console.log(JSON.stringify({ statusCode, allowHeaders: headers['Access-Control-Allow-Headers'] }));
    `)

    expect(result.statusCode).toBe(204)
    expect(result.allowHeaders).toBeDefined()
    expect(result.allowHeaders.toLowerCase()).not.toContain('xi-api-key')
  })

  test('Information Disclosure: Error responses never expose API keys or upstream secret details', () => {
    const result = runTokenEndpointScript(`
      let statusCode = 200;
      let responseJson = null;

      // Mock global fetch to simulate upstream ElevenLabs error with sensitive message
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify({
          detail: {
            message: 'Invalid key: sk_live_secret_key_should_never_leak_to_client',
            status: 'invalid_api_key',
          },
        }),
      });

      try {
        const req = {
          method: 'POST',
          headers: {
            origin: 'https://displaycellpros.com',
            'content-type': 'application/json',
          },
          body: { agentId: 'agent_test_456' },
          query: {},
          socket: { remoteAddress: '127.0.0.1' },
        };

        const res = {
          setHeader() {},
          status(code) {
            statusCode = code;
            return this;
          },
          json(data) {
            responseJson = data;
            return this;
          },
        };

        await handler(req, res);
      } finally {
        globalThis.fetch = originalFetch;
      }

      console.log(JSON.stringify({ statusCode, responseJson }));
    `, {
      ELEVENLABS_API_KEY: 'sk_live_secret_key_should_never_leak_to_client',
    })

    expect(result.statusCode).toBe(401)
    const jsonStr = JSON.stringify(result.responseJson)
    expect(jsonStr).not.toContain('sk_live_secret_key_should_never_leak_to_client')
    expect(jsonStr).not.toContain('sk_')
  })

  test('Server-side Key Handling: Successfully acquires token using server-side ELEVENLABS_API_KEY without leaking key in response', () => {
    const result = runTokenEndpointScript(`
      let statusCode = 200;
      let responseJson = null;
      let outboundHeaders = null;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, init) => {
        outboundHeaders = init?.headers;
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          text: async () => JSON.stringify({
            signed_url: 'wss://api.elevenlabs.io/v1/convai/conversation?token=ephemeral_convo_token_999',
            conversation_id: 'conv_123',
          }),
        };
      };

      try {
        const req = {
          method: 'POST',
          headers: {
            origin: 'https://displaycellpros.com',
            'content-type': 'application/json',
          },
          body: { agentId: 'agent_test_789' },
          query: {},
          socket: { remoteAddress: '127.0.0.1' },
        };

        const res = {
          setHeader() {},
          status(code) {
            statusCode = code;
            return this;
          },
          json(data) {
            responseJson = data;
            return this;
          },
        };

        await handler(req, res);
      } finally {
        globalThis.fetch = originalFetch;
      }

      console.log(JSON.stringify({ statusCode, responseJson, outboundHeaders }));
    `, {
      ELEVENLABS_API_KEY: 'sk_test_server_secret_key_valid_123',
    })

    expect(result.statusCode).toBe(200)
    expect(result.responseJson.token).toBe('ephemeral_convo_token_999')
    expect(result.responseJson.conversation_id).toBe('conv_123')
    // Ensure response does not contain the secret server key
    expect(JSON.stringify(result.responseJson)).not.toContain('sk_test_server_secret_key_valid_123')
    // Outbound upstream request from server MUST include the server API key in xi-api-key header
    expect(result.outboundHeaders['xi-api-key']).toBe('sk_test_server_secret_key_valid_123')
  })
})
