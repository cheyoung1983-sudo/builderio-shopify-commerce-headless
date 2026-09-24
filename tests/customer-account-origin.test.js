const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..')
const customerAccountModuleUrl = pathToFileURL(path.join(repoRoot, 'services/shopify-customer-account.ts')).href
const loginHandlerUrl = pathToFileURL(path.join(repoRoot, 'pages/api/account/login.ts')).href

function runScenario(source, env = {}) {
  const script = `
    const assert = (await import('node:assert/strict')).default
    const api = await import(${JSON.stringify(customerAccountModuleUrl)})
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
        ...env,
      },
    }
  )
}

describe('Customer account OAuth origin hardening', () => {
  it('prefers the configured canonical site URL over spoofed forwarded headers', () => {
    runScenario(`
      assert.equal(
        api.getSiteUrl({
          headers: {
            host: 'evil.example',
            'x-forwarded-host': 'evil.example',
            'x-forwarded-proto': 'http',
          },
        }),
        'https://canonical.example.com'
      )
      assert.equal(
        api.getCallbackUrl({
          headers: {
            host: 'evil.example',
            'x-forwarded-host': 'evil.example',
            'x-forwarded-proto': 'http',
          },
        }),
        'https://canonical.example.com/api/account/callback'
      )
    `, {
      NODE_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://canonical.example.com',
    })
  })

  it('accepts forwarded headers only under an explicit trusted-proxy or local policy', () => {
    runScenario(`
      assert.equal(
        api.getSiteUrl({
          headers: {
            host: 'localhost:3000',
            'x-forwarded-host': 'shop.example.com',
            'x-forwarded-proto': 'https',
          },
        }),
        'https://shop.example.com'
      )
    `, {
      NODE_ENV: 'production',
      TRUSTED_PROXY: 'true',
      NEXT_PUBLIC_SITE_URL: '',
    })
  })

  it('rejects javascript and malformed hosts before building the callback URL', () => {
    runScenario(`
      assert.equal(
        api.getSiteUrl({
          headers: {
            host: 'javascript:alert(1)',
            'x-forwarded-host': 'javascript:alert(1)',
            'x-forwarded-proto': 'https',
          },
        }),
        'https://displaycellpros.com'
      )
      assert.equal(
        api.getCallbackUrl({
          headers: {
            host: 'javascript:alert(1)',
            'x-forwarded-host': 'javascript:alert(1)',
            'x-forwarded-proto': 'https',
          },
        }),
        'https://displaycellpros.com/api/account/callback'
      )
    `, {
      NODE_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: '',
    })
  })

  it('keeps the returnTo redirect relative-only in the login flow', async () => {
    const script = `
      const assert = (await import('node:assert/strict')).default
      const { default: handler } = await import(${JSON.stringify(loginHandlerUrl)})
      const res = {
        headers: {},
        setHeader(name, value) {
          this.headers[name] = value
        },
        redirect() {},
        status() {
          return this
        },
        json() {
          return this
        },
      }
      const req = {
        method: 'GET',
        query: { returnTo: '//evil.example/phish' },
        headers: { host: 'localhost:3000' },
      }
      await handler(req, res)
      const setCookie = Array.isArray(res.headers['Set-Cookie'])
        ? res.headers['Set-Cookie'].find((value) => value.startsWith('sca_return_to='))
        : res.headers['Set-Cookie']
      assert.match(String(setCookie || ''), /sca_return_to=%2Faccount/)
    `

    execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --no-warnings`.trim(),
      },
    })
  })
})
