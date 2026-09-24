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

  describe('Tribal Enrollment Data Verification (Valid vs Invalid)', () => {
    test('Rejects enrollment ID with fewer than 4 characters with HTTP 422 Unprocessable Entity', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: '123',
            customerId: 'cust_456',
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

      expect(result.statusCode).toBe(422)
      expect(result.responseJson.success).toBe(false)
      expect(result.responseJson.verified).toBe(false)
      expect(result.responseJson.message).toContain('unsuccessful')
      expect(result.responseJson.result.customerTagApplied).toBe(false)
      expect(result.responseJson.result.discountTrack.eligible).toBe(false)
    })

    test('Rejects enrollment ID containing "INVALID" with HTTP 422 Unprocessable Entity', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-INVALID-9988',
            customerId: 'cust_456',
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

      expect(result.statusCode).toBe(422)
      expect(result.responseJson.success).toBe(false)
      expect(result.responseJson.verified).toBe(false)
      expect(result.responseJson.result.discountTrack.eligible).toBe(false)
    })

    test('Rejects enrollment ID containing "TEST_FAIL" with HTTP 422 Unprocessable Entity', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'John',
            lastName: 'Doe',
            tribalNation: 'Cherokee Nation',
            tribalEnrollmentId: 'CHER-TEST_FAIL-001',
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

      expect(result.statusCode).toBe(422)
      expect(result.responseJson.success).toBe(false)
      expect(result.responseJson.verified).toBe(false)
    })

    test('Successfully verifies valid enrollment data with HTTP 200 and assigns 20% discount', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-98442',
            customerId: 'cust_778899',
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

      expect(result.statusCode).toBe(200)
      expect(result.responseJson.success).toBe(true)
      expect(result.responseJson.verified).toBe(true)

      // Verify Commercial Discount Track
      const discount = result.responseJson.result.discountTrack
      expect(discount.eligible).toBe(true)
      expect(discount.discountPercentage).toBe(20)
      expect(discount.code).toBe('TRIBAL-MEMBER-20')

      // Verify Audit Record
      const audit = result.responseJson.result.audit
      expect(audit.tribalNation).toBe('Navajo Nation')
      expect(audit.maskedEnrollmentId).toBe('••••8442')
      expect(audit.verificationHash).toMatch(/^[a-f0-9]{64}$/)
      expect(audit.verifiedAt).toBeDefined()
    })
  })

  describe('Shopify customerUpdate Mutation Execution - Live GraphQL Admin API', () => {
    test('Calls Shopify Admin GraphQL mutation with correct endpoint, headers, and customerUpdate mutation string', () => {
      const result = runVerifyApiScript(
        `
        let capturedFetch = null

        globalThis.fetch = async (url, options) => {
          capturedFetch = {
            url,
            method: options.method,
            headers: options.headers,
            body: JSON.parse(options.body),
          }

          return {
            ok: true,
            json: async () => ({
              data: {
                customerUpdate: {
                  customer: {
                    id: 'gid://shopify/Customer/cust_778899',
                    taxExempt: false,
                    taxExemptions: [],
                    tags: ['tribal-member-verified'],
                    metafields: {
                      edges: [
                        {
                          node: {
                            namespace: 'custom',
                            key: 'tribal_nation',
                            value: 'Navajo Nation',
                          },
                        },
                      ],
                    },
                  },
                  userErrors: [],
                },
              },
            }),
          }
        }

        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-98442',
            customerId: 'cust_778899',
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
        console.log(JSON.stringify({ statusCode, capturedFetch, responseJson }))
      `,
        {
          SHOPIFY_ADMIN_ACCESS_TOKEN: 'shpat_live_test_access_token_123',
          SHOPIFY_STORE_DOMAIN: 'displaycellpros.myshopify.com',
        }
      )

      expect(result.statusCode).toBe(200)
      expect(result.capturedFetch).toBeDefined()
      expect(result.capturedFetch.url).toBe('https://displaycellpros.myshopify.com/admin/api/2026-01/graphql.json')
      expect(result.capturedFetch.method).toBe('POST')
      expect(result.capturedFetch.headers['Content-Type']).toBe('application/json')
      expect(result.capturedFetch.headers['X-Shopify-Access-Token']).toBe('shpat_live_test_access_token_123')

      // Verify GraphQL mutation query structure
      expect(result.capturedFetch.body.query).toContain('mutation customerUpdate($input: CustomerInput!)')
      expect(result.capturedFetch.body.query).toContain('customerUpdate(input: $input)')

      // Verify input variables
      const input = result.capturedFetch.body.variables.input
      expect(input.id).toBe('gid://shopify/Customer/cust_778899')
      expect(input.tags).toEqual(['tribal-member-verified'])
      expect(input.taxExempt).toBe(false)
      expect(input.taxExemptions).toEqual([])

      // Verify audit metafields
      expect(Array.isArray(input.metafields)).toBe(true)
      const metafieldKeys = input.metafields.map((m) => m.key)
      expect(metafieldKeys).toContain('tribal_verification_hash')
      expect(metafieldKeys).toContain('tribal_verified_at')
      expect(metafieldKeys).toContain('tribal_nation')
      expect(metafieldKeys).toContain('tribal_enrollment_id_masked')

      const nationMetafield = input.metafields.find((m) => m.key === 'tribal_nation')
      expect(nationMetafield.value).toBe('Navajo Nation')

      const maskedMetafield = input.metafields.find((m) => m.key === 'tribal_enrollment_id_masked')
      expect(maskedMetafield.value).toBe('••••8442')

      // Verify response returned by API
      expect(result.responseJson.shopifySync.success).toBe(true)
      expect(result.responseJson.shopifySync.data.id).toBe('gid://shopify/Customer/cust_778899')
      expect(result.responseJson.shopifySync.data.tags).toContain('tribal-member-verified')
    })

    test('Preserves already formatted gid://shopify/Customer/ ID without duplication', () => {
      const result = runVerifyApiScript(
        `
        let capturedFetch = null

        globalThis.fetch = async (url, options) => {
          capturedFetch = {
            body: JSON.parse(options.body),
          }
          return {
            ok: true,
            json: async () => ({
              data: {
                customerUpdate: {
                  customer: { id: 'gid://shopify/Customer/990011', tags: ['tribal-member-verified'] },
                  userErrors: [],
                },
              },
            }),
          }
        }

        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-98442',
            customerId: 'gid://shopify/Customer/990011',
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
        console.log(JSON.stringify({ statusCode, capturedFetch, responseJson }))
      `,
        {
          SHOPIFY_ADMIN_ACCESS_TOKEN: 'shpat_live_test_access_token_123',
          SHOPIFY_STORE_DOMAIN: 'displaycellpros.myshopify.com',
        }
      )

      expect(result.statusCode).toBe(200)
      expect(result.capturedFetch.body.variables.input.id).toBe('gid://shopify/Customer/990011')
    })

    test('Gracefully handles Shopify GraphQL userErrors (e.g. Customer not found)', () => {
      const result = runVerifyApiScript(
        `
        globalThis.fetch = async () => ({
          ok: true,
          json: async () => ({
            data: {
              customerUpdate: {
                customer: null,
                userErrors: [
                  {
                    field: ['id'],
                    message: 'Could not find customer with id gid://shopify/Customer/non_existent_99',
                  },
                ],
              },
            },
          }),
        })

        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-98442',
            customerId: 'non_existent_99',
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
      `,
        {
          SHOPIFY_ADMIN_ACCESS_TOKEN: 'shpat_live_test_access_token_123',
          SHOPIFY_STORE_DOMAIN: 'displaycellpros.myshopify.com',
        }
      )

      expect(result.statusCode).toBe(200)
      expect(result.responseJson.verified).toBe(true)
      expect(result.responseJson.shopifySync.success).toBe(false)
      expect(result.responseJson.shopifySync.userErrors).toHaveLength(1)
      expect(result.responseJson.shopifySync.userErrors[0].message).toContain('Could not find customer')
    })

    test('Falls back gracefully to simulated response if Shopify Admin GraphQL throws network error', () => {
      const result = runVerifyApiScript(
        `
        globalThis.fetch = async () => {
          throw new Error('Network timeout connecting to Shopify Admin GraphQL')
        }

        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-98442',
            customerId: 'cust_778899',
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
      `,
        {
          SHOPIFY_ADMIN_ACCESS_TOKEN: 'shpat_live_test_access_token_123',
          SHOPIFY_STORE_DOMAIN: 'displaycellpros.myshopify.com',
        }
      )

      expect(result.statusCode).toBe(200)
      expect(result.responseJson.success).toBe(true)
      expect(result.responseJson.verified).toBe(true)
      // Verify fallback handled the synchronization
      expect(result.responseJson.shopifySync.success).toBe(true)
      expect(result.responseJson.shopifySync.data.tags).toContain('tribal-member-verified')
    })
  })

  describe('Dual-Track Tax Exemption Mutation Integration', () => {
    test('Applies taxExempt: true and EXEMPT_INDIAN_IN_CANADA_OR_USA when delivery is on-reservation', () => {
      const result = runVerifyApiScript(
        `
        let capturedFetch = null

        globalThis.fetch = async (url, options) => {
          capturedFetch = {
            body: JSON.parse(options.body),
          }
          return {
            ok: true,
            json: async () => ({
              data: {
                customerUpdate: {
                  customer: {
                    id: 'gid://shopify/Customer/cust_tax_exempt_1',
                    taxExempt: true,
                    taxExemptions: ['EXEMPT_INDIAN_IN_CANADA_OR_USA'],
                    tags: ['tribal-member-verified'],
                  },
                  userErrors: [],
                },
              },
            }),
          }
        }

        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-98442',
            customerId: 'cust_tax_exempt_1',
            shippingAddress: {
              address1: '100 Tribal Route 12',
              city: 'Window Rock',
              province: 'AZ',
              zip: '86515',
              country: 'United States',
            },
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
        console.log(JSON.stringify({ statusCode, capturedFetch, responseJson }))
      `,
        {
          SHOPIFY_ADMIN_ACCESS_TOKEN: 'shpat_live_test_access_token_123',
          SHOPIFY_STORE_DOMAIN: 'displaycellpros.myshopify.com',
        }
      )

      expect(result.statusCode).toBe(200)
      expect(result.responseJson.verified).toBe(true)

      // Verify endpoint determined on-reservation tax exemption
      const taxTrack = result.responseJson.result.taxExemptionTrack
      expect(taxTrack.onReservation).toBe(true)
      expect(taxTrack.taxExempt).toBe(true)
      expect(taxTrack.entityUseCode).toBe('C')

      // Verify GraphQL mutation sent tax exemption fields
      const input = result.capturedFetch.body.variables.input
      expect(input.taxExempt).toBe(true)
      expect(input.taxExemptions).toEqual(['EXEMPT_INDIAN_IN_CANADA_OR_USA'])
      expect(input.tags).toEqual(['tribal-member-verified'])
    })

    test('Keeps taxExempt: false when delivery is off-reservation', () => {
      const result = runVerifyApiScript(
        `
        let capturedFetch = null

        globalThis.fetch = async (url, options) => {
          capturedFetch = {
            body: JSON.parse(options.body),
          }
          return {
            ok: true,
            json: async () => ({
              data: {
                customerUpdate: {
                  customer: {
                    id: 'gid://shopify/Customer/cust_off_res_1',
                    taxExempt: false,
                    taxExemptions: [],
                    tags: ['tribal-member-verified'],
                  },
                  userErrors: [],
                },
              },
            }),
          }
        }

        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-98442',
            customerId: 'cust_off_res_1',
            shippingAddress: {
              address1: '100 North Central Ave',
              city: 'Phoenix',
              province: 'AZ',
              zip: '85001',
              country: 'United States',
            },
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
        console.log(JSON.stringify({ statusCode, capturedFetch, responseJson }))
      `,
        {
          SHOPIFY_ADMIN_ACCESS_TOKEN: 'shpat_live_test_access_token_123',
          SHOPIFY_STORE_DOMAIN: 'displaycellpros.myshopify.com',
        }
      )

      expect(result.statusCode).toBe(200)

      // Verify off-reservation results in taxExempt: false
      const taxTrack = result.responseJson.result.taxExemptionTrack
      expect(taxTrack.onReservation).toBe(false)
      expect(taxTrack.taxExempt).toBe(false)

      // Commercial discount is still active
      expect(result.responseJson.result.discountTrack.eligible).toBe(true)

      // Mutation input specifies taxExempt: false
      const input = result.capturedFetch.body.variables.input
      expect(input.taxExempt).toBe(false)
      expect(input.taxExemptions).toEqual([])
    })

    test('Attaches signed certificate reference to Shopify customer metafields when certificate is provided', () => {
      const result = runVerifyApiScript(
        `
        let capturedFetch = null

        globalThis.fetch = async (url, options) => {
          capturedFetch = {
            body: JSON.parse(options.body),
          }
          return {
            ok: true,
            json: async () => ({
              data: {
                customerUpdate: {
                  customer: { id: 'gid://shopify/Customer/cust_cert_1', tags: ['tribal-member-verified'] },
                  userErrors: [],
                },
              },
            }),
          }
        }

        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-98442',
            customerId: 'cust_cert_1',
            shippingAddress: {
              address1: '100 Tribal Route 12',
              city: 'Window Rock',
              province: 'AZ',
              zip: '86515',
            },
            certificate: {
              carrierDeliveryMethod: 'COMMON_CARRIER',
              deliveryConfirmationRef: '1Z9999999999999999',
              signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              signedDate: '2026-09-23',
            },
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
        console.log(JSON.stringify({ statusCode, capturedFetch, responseJson }))
      `,
        {
          SHOPIFY_ADMIN_ACCESS_TOKEN: 'shpat_live_test_access_token_123',
          SHOPIFY_STORE_DOMAIN: 'displaycellpros.myshopify.com',
        }
      )

      expect(result.statusCode).toBe(200)
      const input = result.capturedFetch.body.variables.input
      const certMetafield = input.metafields.find((m) => m.key === 'tribal_exemption_cert_ref')
      expect(certMetafield).toBeDefined()
      expect(certMetafield.value).toMatch(/^CERT-/)
      expect(result.responseJson.result.taxExemptionTrack.certificateCompleted).toBe(true)
    })
  })

  describe('Guest Customer Checkout Verification', () => {
    test('Handles customerId: "guest" without attempting external Shopify customer ID mutation', () => {
      const result = runVerifyApiScript(
        `
        let fetchAttempted = false
        globalThis.fetch = async () => {
          fetchAttempted = true
          throw new Error('Should not call fetch for guest!')
        }

        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-98442',
            customerId: 'guest',
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
        console.log(JSON.stringify({ statusCode, fetchAttempted, responseJson }))
      `,
        {
          SHOPIFY_ADMIN_ACCESS_TOKEN: 'shpat_live_test_access_token_123',
          SHOPIFY_STORE_DOMAIN: 'displaycellpros.myshopify.com',
        }
      )

      expect(result.statusCode).toBe(200)
      expect(result.fetchAttempted).toBe(false)
      expect(result.responseJson.shopifySync.isGuest).toBe(true)
      expect(result.responseJson.shopifySync.tagsAssigned).toEqual(['tribal-member-verified'])
      expect(result.responseJson.shopifySync.mutationUsed).toContain('mutation customerUpdate')
    })

    test('Defaults omitted customerId to guest session handling', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-98442',
            // customerId omitted
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

      expect(result.statusCode).toBe(200)
      expect(result.responseJson.shopifySync.isGuest).toBe(true)
      expect(result.responseJson.shopifySync.tagsAssigned).toContain('tribal-member-verified')
    })
  })

  describe('Secure Cookie Session State Storage', () => {
    test('Sets tribal_member_verified and tribal_on_reservation secure cookies on successful verification', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null
        const headers = {}

        const req = {
          method: 'POST',
          body: {
            firstName: 'Mary',
            lastName: 'Tsosie',
            tribalNation: 'Navajo Nation',
            tribalEnrollmentId: 'NAV-98442',
            customerId: 'cust_778899',
          },
          headers: { 'x-forwarded-proto': 'https' },
          socket: { remoteAddress: '127.0.0.1' },
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

        await handler(req, res)
        console.log(JSON.stringify({ statusCode, headers, responseJson }))
      `)

      expect(result.statusCode).toBe(200)
      expect(result.headers['set-cookie']).toBeDefined()
      const setCookies = Array.isArray(result.headers['set-cookie'])
        ? result.headers['set-cookie']
        : [result.headers['set-cookie']]

      const cookieStr = setCookies.join('; ')
      expect(cookieStr).toContain('tribal_member_verified=true')
      expect(cookieStr).toContain('tribal_on_reservation=')
      expect(cookieStr).toContain('Secure')
      expect(cookieStr).toContain('HttpOnly')
      expect(cookieStr).toContain('SameSite=Lax')
    })
  })

  describe('Rate Limiting & Brute-Force Protection', () => {
    test('Includes X-RateLimit response headers on verification attempts', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null
        const headers = {}

        const req = {
          method: 'POST',
          body: {
            firstName: 'Sarah',
            lastName: 'Jim',
            tribalNation: 'Yakama Nation',
            tribalEnrollmentId: 'YAK-99201',
            customerId: 'cust_ratelimit_test_1',
          },
          headers: { 'x-forwarded-proto': 'https' },
          socket: { remoteAddress: '192.168.1.50' },
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

        await handler(req, res)
        console.log(JSON.stringify({ statusCode, headers, responseJson }))
      `)

      expect(result.statusCode).toBe(200)
      expect(result.headers['x-ratelimit-limit']).toBeDefined()
      expect(result.headers['x-ratelimit-remaining']).toBeDefined()
      expect(result.headers['x-ratelimit-reset']).toBeDefined()
    })
  })

  describe('Internal Server Error & Exception Handling', () => {
    test('Returns HTTP 500 when unexpected error occurs during verification execution', () => {
      const result = runVerifyApiScript(`
        let statusCode = 200
        let responseJson = null

        // Pass an object whose properties throw when accessed or stringified
        const req = {
          method: 'POST',
          get body() {
            throw new Error('Database connection failed catastrophically')
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

        // Suppress console.error in test
        const origError = console.error
        console.error = () => {}

        await handler(req, res)
        console.error = origError

        console.log(JSON.stringify({ statusCode, responseJson }))
      `)

      expect(result.statusCode).toBe(500)
      expect(result.responseJson.success).toBe(false)
      expect(result.responseJson.error).toContain('internal error occurred')
      expect(result.responseJson.details).toContain('Database connection failed')
    })
  })
})
