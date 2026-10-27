const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

/**
 * Helper to run an isolated test script against /pages/api/tribal/verify.ts
 * using Node.js with native TypeScript strip-types support.
 */
function runVerifyApiScript(scriptBody, envVars = {}) {
  const repoRoot = path.resolve(__dirname, '..')
  const apiRouteUrl = pathToFileURL(path.join(repoRoot, 'pages/api/tribal/verify.ts')).href
  const shopifyAdminUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/shopify-admin.ts')).href

  const script = `
    const handlerModule = await import(${JSON.stringify(apiRouteUrl)})
    const shopifyAdminModule = await import(${JSON.stringify(shopifyAdminUrl)})
    const handler = handlerModule.default

    ${scriptBody}
  `

  const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test', ...envVars },
  })

  return JSON.parse(output.trim())
}

describe('Tribal Verification API (/api/tribal/verify) Unit Tests', () => {
  describe('HTTP Method Routing & Allowed Methods', () => {
    test('Rejects GET request with 405 Method Not Allowed and sets Allow: POST header', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null
        const headers = {}

        const req = {
          method: 'GET',
          body: {},
          headers: {},
          socket: { remoteAddress: '127.0.0.1' },
          query: {},
        }

        const res = {
          setHeader: (name, val) => { headers[name.toLowerCase()] = val },
          status: (code) => {
            statusCode = code
            return {
              json: (data) => { responseJson = data },
              end: () => {},
            }
          },
        }

        await handler(req, res)
        console.log(JSON.stringify({ statusCode, headers, responseJson }))
      `)

      expect(result.statusCode).toBe(405)
      expect(result.headers.allow).toBe('POST')
      expect(result.responseJson.success).toBe(false)
      expect(result.responseJson.error).toContain('Method Not Allowed')
    })

    test('Rejects PUT, DELETE, and PATCH requests with 405', () => {
      for (const method of ['PUT', 'DELETE', 'PATCH']) {
        const result = runVerifyApiScript(`
          let statusCode = 200
          let responseJson = null
          const headers = {}

          const req = {
            method: '${method}',
            body: {},
            headers: {},
            socket: { remoteAddress: '127.0.0.1' },
            query: {},
          }

          const res = {
            setHeader: (name, val) => { headers[name.toLowerCase()] = val },
            status: (code) => {
              statusCode = code
              return {
                json: (data) => { responseJson = data },
                end: () => {},
              }
            },
          }

          await handler(req, res)
          console.log(JSON.stringify({ statusCode, headers, responseJson }))
        `)

        expect(result.statusCode).toBe(405)
        expect(result.headers.allow).toBe('POST')
        expect(result.responseJson.success).toBe(false)
      }
    })
  })

  describe('Request Body & Input Validation', () => {
    test('Rejects empty or missing request body with HTTP 400', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: null,
          headers: {},
          socket: { remoteAddress: '127.0.0.1' },
        }

        const res = {
          setHeader: () => {},
          status: (code) => {
            statusCode = code
            return {
              json: (data) => { responseJson = data },
              end: () => {},
            }
          },
        }

        await handler(req, res)
        console.log(JSON.stringify({ statusCode, responseJson }))
      `)

      expect(result.statusCode).toBe(400)
      expect(result.responseJson.success).toBe(false)
      expect(result.responseJson.error).toContain('Missing required parameters')
    })

    test('Rejects missing or empty firstName with HTTP 400', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: '   ',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-98442',
          },
          headers: {},
          socket: { remoteAddress: '127.0.0.1' },
        }

        const res = {
          setHeader: () => {},
          status: (code) => {
            statusCode = code
            return {
              json: (data) => { responseJson = data },
              end: () => {},
            }
          },
        }

        await handler(req, res)
        console.log(JSON.stringify({ statusCode, responseJson }))
      `)

      expect(result.statusCode).toBe(400)
      expect(result.responseJson.success).toBe(false)
      expect(result.responseJson.error).toContain('firstName')
    })

    test('Rejects missing or empty lastName with HTTP 400', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: '',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-98442',
          },
          headers: {},
          socket: { remoteAddress: '127.0.0.1' },
        }

        const res = {
          setHeader: () => {},
          status: (code) => {
            statusCode = code
            return {
              json: (data) => { responseJson = data },
              end: () => {},
            }
          },
        }

        await handler(req, res)
        console.log(JSON.stringify({ statusCode, responseJson }))
      `)

      expect(result.statusCode).toBe(400)
      expect(result.responseJson.success).toBe(false)
      expect(result.responseJson.error).toContain('lastName')
    })

    test('Rejects missing or empty tribalNation with HTTP 400', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: '   ',
            tribalEnrollmentId: 'NAV-98442',
          },
          headers: {},
          socket: { remoteAddress: '127.0.0.1' },
        }

        const res = {
          setHeader: () => {},
          status: (code) => {
            statusCode = code
            return {
              json: (data) => { responseJson = data },
              end: () => {},
            }
          },
        }

        await handler(req, res)
        console.log(JSON.stringify({ statusCode, responseJson }))
      `)

      expect(result.statusCode).toBe(400)
      expect(result.responseJson.success).toBe(false)
      expect(result.responseJson.error).toContain('tribalNation')
    })

    test('Rejects missing or empty tribalEnrollmentId with HTTP 400', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: '',
          },
          headers: {},
          socket: { remoteAddress: '127.0.0.1' },
        }

        const res = {
          setHeader: () => {},
          status: (code) => {
            statusCode = code
            return {
              json: (data) => { responseJson = data },
              end: () => {},
            }
          },
        }

        await handler(req, res)
        console.log(JSON.stringify({ statusCode, responseJson }))
      `)

      expect(result.statusCode).toBe(400)
      expect(result.responseJson.success).toBe(false)
      expect(result.responseJson.error).toContain('tribalEnrollmentId')
    })
  })

  // There is no real tribal-enrollment backend. The route must never simulate
  // success: valid-looking requests get 501 "manual verification required",
  // with no cookies, no Shopify Admin calls and no discount.
  const RES_HARNESS = `
    let statusCode = 200
    let responseJson = null
    const headers = {}
    const fetchCalls = []
    globalThis.fetch = async (url, options) => {
      fetchCalls.push(String(url))
      throw new Error('fetch must not be called by /api/tribal/verify')
    }
    const res = {
      setHeader: (name, val) => { headers[name.toLowerCase()] = val },
      getHeader: (name) => headers[name.toLowerCase()],
      status: (code) => {
        statusCode = code
        return {
          json: (data) => { responseJson = data },
          end: () => {},
        }
      },
    }
  `

  const ADMIN_ENV = {
    SHOPIFY_STORE_DOMAIN: 'test-shop.myshopify.com',
    SHOPIFY_CLIENT_ID: 'test_client_id',
    SHOPIFY_CLIENT_SECRET: 'test_client_secret',
  }

  function postVerify(body, envVars = {}, reqExtras = '') {
    return runVerifyApiScript(
      `
      ${RES_HARNESS}
      const req = {
        method: 'POST',
        body: ${JSON.stringify(body)},
        headers: { 'x-forwarded-proto': 'https' },
        socket: { remoteAddress: '10.0.0.${Math.floor(Math.random() * 200) + 1}' },
        ${reqExtras}
      }
      await handler(req, res)
      console.log(JSON.stringify({ statusCode, headers, responseJson, fetchCalls }))
    `,
      envVars
    )
  }

  describe('No simulated verification (manual verification required)', () => {
    const validBody = {
      firstName: 'Mary',
      lastName: 'Tsosie',
      tribalNation: 'Navajo Nation',
      tribalEnrollmentId: 'NAV-98442',
      customerId: 'cust_778899',
      shippingAddress: { address1: '10 Tribal Way', city: 'Window Rock', province: 'AZ', zip: '86515' },
    }

    test('Returns 501 manualVerificationRequired for a valid-looking request and never grants a discount', () => {
      const result = postVerify(validBody, ADMIN_ENV)

      expect(result.statusCode).toBe(501)
      expect(result.responseJson.success).toBe(false)
      expect(result.responseJson.verified).toBe(false)
      expect(result.responseJson.manualVerificationRequired).toBe(true)
      expect(result.responseJson.discountApplied).toBe(false)
      expect(result.responseJson.taxExemptionApplied).toBe(false)
      expect(result.responseJson.message).toMatch(/manual verification/i)
      expect(result.responseJson.result).toBeUndefined()
      expect(result.responseJson.shopifySync).toBeUndefined()
    })

    test('Does not call Shopify Admin (no customerUpdate) even when Admin credentials are configured', () => {
      const result = postVerify(validBody, ADMIN_ENV)
      expect(result.statusCode).toBe(501)
      expect(result.fetchCalls).toEqual([])
    })

    test('Sets no tribal verification cookies', () => {
      const result = postVerify(validBody, ADMIN_ENV)
      expect(result.statusCode).toBe(501)
      expect(result.headers['set-cookie']).toBeUndefined()
    })

    test('Guest and omitted customerId requests are also 501 with no cookies', () => {
      const guest = postVerify({ ...validBody, customerId: 'guest' })
      const omitted = postVerify({ ...validBody, customerId: undefined })
      for (const result of [guest, omitted]) {
        expect(result.statusCode).toBe(501)
        expect(result.responseJson.verified).toBe(false)
        expect(result.headers['set-cookie']).toBeUndefined()
        expect(result.fetchCalls).toEqual([])
      }
    })

    test('IDs the old mock accepted or rejected are treated the same (no fake 200/422 decisions)', () => {
      for (const id of ['AB12', 'NAV-INVALID-1', 'TEST_FAIL_9', 'X9']) {
        const result = postVerify({ ...validBody, tribalEnrollmentId: id })
        expect(result.statusCode).toBe(501)
        expect(result.responseJson.verified).toBe(false)
      }
    })
  })

  describe('Rate Limiting & Brute-Force Protection', () => {
    test('Includes X-RateLimit response headers on verification attempts', () => {
      const result = postVerify({
        firstName: 'Sarah',
        lastName: 'Jim',
        tribalNation: 'Yakama Nation',
        tribalEnrollmentId: 'YAK-99201',
        customerId: 'cust_ratelimit_test_1',
      })

      expect(result.statusCode).toBe(501)
      expect(result.headers['x-ratelimit-limit']).toBeDefined()
      expect(result.headers['x-ratelimit-remaining']).toBeDefined()
      expect(result.headers['x-ratelimit-reset']).toBeDefined()
    })
  })

  describe('Internal Server Error & Exception Handling', () => {
    test('Returns HTTP 500 without leaking internal error details', () => {
      const result = runVerifyApiScript(`
        ${RES_HARNESS}
        const req = {
          method: 'POST',
          get body() {
            throw new Error('Database connection failed catastrophically')
          },
          headers: {},
          socket: { remoteAddress: '127.0.0.1' },
        }
        const origError = console.error
        console.error = () => {}
        await handler(req, res)
        console.error = origError
        console.log(JSON.stringify({ statusCode, responseJson }))
      `)

      expect(result.statusCode).toBe(500)
      expect(result.responseJson.success).toBe(false)
      expect(result.responseJson.error).toContain('internal error occurred')
      expect(JSON.stringify(result.responseJson)).not.toContain('Database connection failed')
    })
  })

  describe('lib/tribal/shopify-admin.ts updateShopifyCustomerTribalStatus (no simulated success)', () => {
    const audit = {
      verificationHash: 'abc123',
      verifiedAt: '2026-10-08T12:00:00.000Z',
      tribalNation: 'Navajo Nation',
      maskedEnrollmentId: '••••8442',
    }

    test('Returns success:false when Shopify Admin is not configured', () => {
      const result = runVerifyApiScript(
        `
        const fetchCalls = []
        globalThis.fetch = async (url) => { fetchCalls.push(String(url)); throw new Error('no fetch expected') }
        const r = await shopifyAdminModule.updateShopifyCustomerTribalStatus({ customerId: '123', audit: ${JSON.stringify(audit)} })
        console.log(JSON.stringify({ r, fetchCalls }))
      `,
        { SHOPIFY_STORE_DOMAIN: '', NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: '', SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '', SHOPIFY_ADMIN_ACCESS_TOKEN: '' }
      )
      expect(result.r.success).toBe(false)
      expect(result.r.notConfigured).toBe(true)
      expect(result.fetchCalls).toEqual([])
    })

    test('Uses a client-credentials token and sends customerUpdate to the Admin GraphQL endpoint', () => {
      const result = runVerifyApiScript(
        `
        const calls = []
        globalThis.fetch = async (url, options) => {
          calls.push({ url: String(url), headers: options.headers, body: options.body })
          if (String(url).endsWith('/admin/oauth/access_token')) {
            return { ok: true, status: 200, json: async () => ({ access_token: 'shpat_cc_token', scope: 'write_customers', expires_in: 86399 }) }
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: { customerUpdate: { customer: { id: 'gid://shopify/Customer/123', tags: ['tribal-member-verified'] }, userErrors: [] } } }),
          }
        }
        const r = await shopifyAdminModule.updateShopifyCustomerTribalStatus({ customerId: '123', audit: ${JSON.stringify(audit)} })
        console.log(JSON.stringify({ r, calls }))
      `,
        { ...ADMIN_ENV, SHOPIFY_ADMIN_ACCESS_TOKEN: '' }
      )
      expect(result.r.success).toBe(true)
      expect(result.calls[0].url).toBe('https://test-shop.myshopify.com/admin/oauth/access_token')
      expect(result.calls[0].body).toContain('grant_type=client_credentials')
      expect(result.calls[1].url).toMatch(/^https:\/\/test-shop\.myshopify\.com\/admin\/api\/[\w-]+\/graphql\.json$/)
      expect(result.calls[1].headers['X-Shopify-Access-Token']).toBe('shpat_cc_token')
      const gql = JSON.parse(result.calls[1].body)
      expect(gql.query).toContain('customerUpdate(input: $input)')
      expect(gql.variables.input.id).toBe('gid://shopify/Customer/123')
    })

    test('Returns success:false on Shopify userErrors and on network failure', () => {
      const result = runVerifyApiScript(
        `
        let mode = 'userErrors'
        globalThis.fetch = async (url) => {
          if (String(url).endsWith('/admin/oauth/access_token')) {
            return { ok: true, status: 200, json: async () => ({ access_token: 'tok', expires_in: 86399 }) }
          }
          if (mode === 'network') throw new Error('ECONNRESET')
          return { ok: true, status: 200, json: async () => ({ data: { customerUpdate: { customer: null, userErrors: [{ field: ['id'], message: 'Customer does not exist' }] } } }) }
        }
        const a = await shopifyAdminModule.updateShopifyCustomerTribalStatus({ customerId: 'gid://shopify/Customer/999', audit: ${JSON.stringify(audit)} })
        mode = 'network'
        const b = await shopifyAdminModule.updateShopifyCustomerTribalStatus({ customerId: '999', audit: ${JSON.stringify(audit)} })
        console.log(JSON.stringify({ a, b }))
      `,
        { ...ADMIN_ENV, SHOPIFY_ADMIN_ACCESS_TOKEN: '' }
      )
      expect(result.a.success).toBe(false)
      expect(result.a.userErrors[0].message).toContain('Customer does not exist')
      expect(result.b.success).toBe(false)
      expect(result.b.userErrors[0].message).toContain('ECONNRESET')
    })
  })
})
