const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..')
const moduleUrl = pathToFileURL(path.join(repoRoot, 'lib/api-security/index.ts')).href

function runScenario(source) {
  const script = `
    const assert = (await import('node:assert/strict')).default
    const api = await import(${JSON.stringify(moduleUrl)})
    ${source}
  `

  return execFileSync(
    process.execPath,
    ['--experimental-strip-types', '--input-type=module', '-e', script],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --no-warnings`.trim(),
      },
    }
  )
}

describe('API security boundaries', () => {
  it('accepts exact configured origins but rejects lookalikes', () => {
    runScenario(`
      const options = { allowedOrigins: ['https://www.displaycellpros.com'] }
      assert.equal(api.isAllowedOrigin('https://www.displaycellpros.com', options), true)
      assert.equal(api.isAllowedOrigin('https://www.displaycellpros.com.attacker.test', options), false)
      assert.equal(api.isAllowedOrigin('https://www.displaycellpros.com/path', options), false)
      assert.equal(api.isAllowedOrigin(undefined, options), false)
    `)
  })

  it('only accepts local development origins when explicitly enabled', () => {
    runScenario(`
      const options = { allowedOrigins: [] }
      assert.equal(api.isAllowedOrigin('http://localhost:3000', options), false)
      assert.equal(api.isAllowedOrigin('http://localhost:3000', { ...options, allowLocalhost: true }), true)
      assert.equal(api.isAllowedOrigin('http://127.0.0.1:3000', { ...options, allowLocalhost: true }), true)
      assert.equal(api.isAllowedOrigin('https://localhost:3000', { ...options, allowLocalhost: true }), false)
      assert.equal(api.isAllowedOrigin('http://notlocalhost.example', { ...options, allowLocalhost: true }), false)
    `)
  })

  it('only accepts valid run.app origins when explicitly enabled', () => {
    runScenario(`
      const options = { allowedOrigins: [] }
      assert.equal(api.isAllowedOrigin('https://storefront-abc.run.app', options), false)
      assert.equal(api.isAllowedOrigin('https://storefront-abc.run.app', { ...options, allowRunApp: true }), true)
      assert.equal(api.isAllowedOrigin('https://storefront-abc.run.app.attacker.test', { ...options, allowRunApp: true }), false)
      assert.equal(api.isAllowedOrigin('http://storefront-abc.run.app', { ...options, allowRunApp: true }), false)
    `)
  })

  it('reflects approved origins and sets consistent CORS headers', () => {
    runScenario(`
      const headers = {}
      const res = {
        setHeader(name, value) { headers[name] = value },
      }
      api.applyCors(res, 'https://www.displaycellpros.com/', {
        allowedOrigins: ['https://www.displaycellpros.com'],
        allowedMethods: ['POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
      assert.equal(headers['Access-Control-Allow-Origin'], 'https://www.displaycellpros.com')
      assert.equal(headers.Vary, 'Origin')
      assert.equal(headers['Access-Control-Allow-Methods'], 'POST, OPTIONS')
      assert.equal(headers['Access-Control-Allow-Headers'], 'Content-Type, Authorization')

      const rejectedHeaders = {}
      api.applyCors({ setHeader(name, value) { rejectedHeaders[name] = value } }, 'https://attacker.test', {
        allowedOrigins: ['https://www.displaycellpros.com'],
      })
      assert.equal(rejectedHeaders['Access-Control-Allow-Origin'], undefined)
      assert.equal(rejectedHeaders.Vary, undefined)
    `)
  })

  it('handles approved and rejected preflight requests without throwing', () => {
    runScenario(`
      const options = { allowedOrigins: ['https://www.displaycellpros.com'], allowedMethods: ['POST', 'OPTIONS'] }
      const approved = { statusCode: 200, headers: {}, ended: false }
      const approvedRes = {
        get statusCode() { return approved.statusCode },
        set statusCode(value) { approved.statusCode = value },
        setHeader(name, value) { approved.headers[name] = value },
        end() { approved.ended = true },
      }
      assert.equal(api.handleOptions({
        method: 'OPTIONS',
        headers: {
          origin: 'https://www.displaycellpros.com',
          'access-control-request-method': 'POST',
        },
      }, approvedRes, options), true)
      assert.equal(approved.statusCode, 204)
      assert.equal(approved.ended, true)

      const rejected = { statusCode: 200, ended: false }
      const rejectedRes = {
        get statusCode() { return rejected.statusCode },
        set statusCode(value) { rejected.statusCode = value },
        setHeader() {},
        end() { rejected.ended = true },
      }
      assert.equal(api.handleOptions({
        method: 'OPTIONS',
        headers: { origin: 'https://attacker.test', 'access-control-request-method': 'POST' },
      }, rejectedRes, options), true)
      assert.equal(rejected.statusCode, 403)
      assert.equal(rejected.ended, true)

      const regularRes = { setHeader() {}, end() {} }
      assert.equal(api.handleOptions({ method: 'POST', headers: {} }, regularRes, options), false)
    `)
  })

  it('bounds strings and accepts only integers in the configured range', () => {
    runScenario(`
      assert.equal(api.readBoundedString('  abcdef  ', { maxLength: 5 }), 'abcde')
      assert.equal(api.readBoundedString('abc', { maxLength: 5, minLength: 4 }), undefined)
      assert.equal(api.readBoundedString({ value: 'abc' }, { maxLength: 5 }), undefined)
      assert.equal(api.readBoundedInteger('25', { min: 1, max: 25 }), 25)
      assert.equal(api.readBoundedInteger(0, { min: 1, max: 25 }), undefined)
      assert.equal(api.readBoundedInteger(26, { min: 1, max: 25 }), undefined)
      assert.equal(api.readBoundedInteger(1.5, { min: 1, max: 25 }), undefined)
      assert.equal(api.readBoundedInteger('not-a-number', { min: 1, max: 25 }), undefined)
    `)
  })

  it('rejects over-limit keys, expires windows, and keeps keys separate', () => {
    runScenario(`
      let now = 1000
      const limiter = api.createRateLimiter({ maxRequests: 2, windowMs: 1000, now: () => now })
      assert.deepEqual(limiter.check('client-a'), { allowed: true, retryAfterSeconds: 0 })
      assert.deepEqual(limiter.check('client-a'), { allowed: true, retryAfterSeconds: 0 })
      assert.deepEqual(limiter.check('client-a'), { allowed: false, retryAfterSeconds: 1 })
      assert.deepEqual(limiter.check('client-b'), { allowed: true, retryAfterSeconds: 0 })
      now = 2000
      assert.deepEqual(limiter.check('client-a'), { allowed: true, retryAfterSeconds: 0 })
    `)
  })
})
