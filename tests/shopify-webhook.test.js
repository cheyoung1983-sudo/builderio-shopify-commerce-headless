const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const crypto = require('node:crypto')

function runWebhookScript(testFnBody, extraEnv = {}) {
  const repoRoot = path.resolve(__dirname, '..')
  const webhookHandlerUrl = pathToFileURL(path.join(repoRoot, 'pages/api/webhooks/shopify.ts')).href
  const reconciliationUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/order-reconciler.ts')).href

  const script = `
    const webhookModule = await import(${JSON.stringify(webhookHandlerUrl)})
    const reconcilerModule = await import(${JSON.stringify(reconciliationUrl)})

    ${testFnBody}
  `

  const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      // Never let tests reach a real store: blank out Admin credentials.
      SHOPIFY_STORE_DOMAIN: '',
      NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: '',
      SHOPIFY_CLIENT_ID: '',
      SHOPIFY_CLIENT_SECRET: '',
      SHOPIFY_ADMIN_ACCESS_TOKEN: '',
      SHOPIFY_WEBHOOK_SECRET: 'test_webhook_secret_key_123',
      ...extraEnv,
    },
  })

  return JSON.parse(output.trim())
}

describe('Shopify Order Webhooks & Real-Time Tax/Discount Reconciler', () => {
  const SECRET = 'test_webhook_secret_key_123'

  function computeHmac(bodyStr, secret = SECRET) {
    return crypto.createHmac('sha256', secret).update(bodyStr, 'utf8').digest('base64')
  }

  test('HMAC Validation: Verifies valid HMAC and rejects invalid or forged signatures', () => {
    const payload = JSON.stringify({ id: 123456, name: '#1001' })
    const validHmac = computeHmac(payload)
    const forgedHmac = 'forged_hmac_signature_base64=='

    const result = runWebhookScript(`
      const { verifyShopifyWebhookHmac } = reconcilerModule

      const isValid = verifyShopifyWebhookHmac(${JSON.stringify(payload)}, ${JSON.stringify(validHmac)}, ${JSON.stringify(SECRET)})
      const isForgedValid = verifyShopifyWebhookHmac(${JSON.stringify(payload)}, ${JSON.stringify(forgedHmac)}, ${JSON.stringify(SECRET)})

      console.log(JSON.stringify({ isValid, isForgedValid }))
    `)

    expect(result.isValid).toBe(true)
    expect(result.isForgedValid).toBe(false)
  })

  test('Reconciliation: Detects address update from on-reservation to off-reservation and flags tax exemption revocation', () => {
    // Order originally had on-reservation address and tribal-tax-exempt tag, but updated to off-reservation
    const orderPayload = {
      id: 987654321,
      admin_graphql_api_id: 'gid://shopify/Order/987654321',
      name: '#1089',
      financial_status: 'paid',
      tags: 'tribal-member-verified, tribal-tax-exempt',
      customer: {
        id: 554433,
        tags: 'tribal-member-verified',
        first_name: 'Elena',
        last_name: 'Colegrove',
        email: 'elena@example.com',
      },
      shipping_address: {
        address1: '100 Central Ave',
        city: 'Phoenix',
        province: 'AZ',
        zip: '85001', // Off-reservation urban Phoenix
        country: 'United States',
      },
      line_items: [
        { id: 1, title: 'iPhone 15 Pro OLED Screen Replacement', price: '250.00', quantity: 1 },
      ],
      total_tax: '0.00',
      total_price: '250.00',
    }

    const result = runWebhookScript(`
      const { reconcileOrderTaxAndDiscounts } = reconcilerModule

      const reconciliation = await reconcileOrderTaxAndDiscounts(${JSON.stringify(orderPayload)}, 'orders/updated')
      console.log(JSON.stringify(reconciliation))
    `)

    expect(result.isReservationAddress).toBe(false)
    expect(result.taxExemptionEligible).toBe(false)
    expect(result.taxAdjustmentNeeded).toBe(true)
    expect(result.taxAction).toBe('REVOKE_EXEMPTION')
    expect(result.tagsToAdd).toContain('tribal-tax-adjustment-needed')
    expect(result.tagsToRemove).toContain('tribal-tax-exempt')
    expect(result.reconciliationStatus).toBe('ADJUSTMENT_REQUIRED')
  })

  test('Reconciliation: Applies tax exemption and calculates refund when verified member ships to reservation', () => {
    // Order was placed with standard tax, but customer is verified and shipping to Hoopa Valley Tribe (95546 CA)
    const orderPayload = {
      id: 887766554,
      admin_graphql_api_id: 'gid://shopify/Order/887766554',
      name: '#1090',
      financial_status: 'paid',
      tags: 'tribal-member-verified',
      customer: {
        id: 776655,
        tags: 'tribal-member-verified',
        first_name: 'Elena',
        last_name: 'Colegrove',
        email: 'elena@hoopa.org',
      },
      shipping_address: {
        address1: '11880 State Hwy 96',
        city: 'Hoopa',
        province: 'CA',
        zip: '95546', // Hoopa Valley Indian Reservation
        country: 'United States',
      },
      line_items: [
        { id: 1, title: 'iPad Air Screen Assembly', price: '200.00', quantity: 1 },
      ],
      total_tax: '17.00', // Standard 8.5% CA sales tax charged incorrectly
      total_price: '217.00',
    }

    const result = runWebhookScript(`
      const { reconcileOrderTaxAndDiscounts } = reconcilerModule

      const reconciliation = await reconcileOrderTaxAndDiscounts(${JSON.stringify(orderPayload)}, 'orders/updated')
      console.log(JSON.stringify(reconciliation))
    `)

    expect(result.isReservationAddress).toBe(true)
    expect(result.taxExemptionEligible).toBe(true)
    expect(result.taxAdjustmentNeeded).toBe(true)
    expect(result.taxAction).toBe('APPLY_EXEMPTION')
    expect(result.suggestedTaxRefund).toBeGreaterThan(0)
    expect(result.entityUseCode).toBe('C')
    expect(result.formType).toBe('CDTFA-146-RES')
    expect(result.tagsToAdd).toContain('tribal-tax-exempt')
    expect(result.tagsToAdd).toContain('tribal-audit-reconciled')
  })

  test('Reconciliation: Reconciles missing 20% commercial discount for verified tribal customer', () => {
    const orderPayload = {
      id: 445566778,
      admin_graphql_api_id: 'gid://shopify/Order/445566778',
      name: '#1091',
      financial_status: 'paid',
      tags: '',
      customer: {
        id: 998877,
        tags: 'tribal-member-verified',
        first_name: 'David',
        last_name: 'Yakima',
        email: 'david@yakama.gov',
      },
      shipping_address: {
        address1: '401 Fort Road',
        city: 'Toppenish',
        province: 'WA',
        zip: '98948',
        country: 'United States',
      },
      line_items: [
        { id: 1, title: 'Galaxy S24 Ultra Glass Display', price: '300.00', quantity: 1 },
      ],
      discount_applications: [], // No discount applied yet
      total_tax: '0.00',
      total_price: '300.00',
    }

    const result = runWebhookScript(`
      const { reconcileOrderTaxAndDiscounts } = reconcilerModule

      const reconciliation = await reconcileOrderTaxAndDiscounts(${JSON.stringify(orderPayload)}, 'orders/create')
      console.log(JSON.stringify(reconciliation))
    `)

    expect(result.discountEligible).toBe(true)
    expect(result.discountAdjustmentNeeded).toBe(true)
    expect(result.discountAction).toBe('APPLY_MISSING_DISCOUNT')
    expect(result.suggestedDiscountAmount).toBe(60) // 20% of 300
    expect(result.tagsToAdd).toContain('tribal-discount-reconciled')
  })

  test('Reconciliation: Handles order cancellation (orders/cancelled) by voiding tax commitments and logging audit', () => {
    const orderPayload = {
      id: 112233445,
      admin_graphql_api_id: 'gid://shopify/Order/112233445',
      name: '#1092',
      financial_status: 'voided',
      cancelled_at: '2026-09-23T14:00:00Z',
      cancel_reason: 'customer',
      tags: 'tribal-tax-exempt, tribal-audit-reconciled',
      customer: {
        id: 554433,
        tags: 'tribal-member-verified',
        email: 'elena@hoopa.org',
      },
      shipping_address: {
        address1: '11880 State Hwy 96',
        city: 'Hoopa',
        province: 'CA',
        zip: '95546',
      },
      line_items: [{ id: 1, title: 'Screen Part', price: '100.00', quantity: 1 }],
      total_tax: '0.00',
      total_price: '100.00',
    }

    const result = runWebhookScript(`
      const { reconcileOrderTaxAndDiscounts } = reconcilerModule

      const reconciliation = await reconcileOrderTaxAndDiscounts(${JSON.stringify(orderPayload)}, 'orders/cancelled')
      console.log(JSON.stringify(reconciliation))
    `)

    expect(result.reconciliationStatus).toBe('ORDER_CANCELLED')
    expect(result.avataxAction).toBe('VOID_TRANSACTION')
    expect(result.auditLogged).toBe(true)
  })

  test('API Route /api/webhooks/shopify: Enforces POST and validates HMAC verification', () => {
    const payload = {
      id: 778899,
      admin_graphql_api_id: 'gid://shopify/Order/778899',
      name: '#1093',
      financial_status: 'paid',
      customer: {
        id: 12345,
        tags: 'tribal-member-verified',
      },
      shipping_address: {
        address1: '100 Tribal Rd',
        city: 'Hoopa',
        province: 'CA',
        zip: '95546',
      },
      line_items: [{ id: 1, title: 'Test Screen', price: '100.00', quantity: 1 }],
      total_tax: '0.00',
      total_price: '100.00',
    }

    const payloadStr = JSON.stringify(payload)
    const validHmac = computeHmac(payloadStr)

    const result = runWebhookScript(`
      const handler = webhookModule.default

      // Mock Express/Next.js req & res
      function createMockRes() {
        return {
          statusCode: 200,
          headers: {},
          body: null,
          setHeader(name, val) { this.headers[name] = val },
          status(code) { this.statusCode = code; return this },
          json(obj) { this.body = obj; return this },
        }
      }

      // Test 1: GET method rejection (405)
      const getReq = { method: 'GET', headers: {} }
      const getRes = createMockRes()
      await handler(getReq, getRes)

      // Test 2: Invalid HMAC rejection (401)
      const invalidHmacReq = {
        method: 'POST',
        headers: {
          'x-shopify-topic': 'orders/updated',
          'x-shopify-hmac-sha256': 'invalid_signature_test',
          'x-shopify-shop-domain': 'displaycellpros.myshopify.com',
        },
        body: ${JSON.stringify(payloadStr)},
      }
      const invalidHmacRes = createMockRes()
      await handler(invalidHmacReq, invalidHmacRes)

      // Test 2b: Missing HMAC header must be rejected (401), not waved through
      const missingHmacReq = {
        method: 'POST',
        headers: { 'x-shopify-topic': 'orders/updated' },
        body: ${JSON.stringify(payloadStr)},
      }
      const missingHmacRes = createMockRes()
      await handler(missingHmacReq, missingHmacRes)

      // Test 2c: A pre-parsed object body can't be verified (original bytes lost) => 401
      const parsedBodyReq = {
        method: 'POST',
        headers: { 'x-shopify-hmac-sha256': ${JSON.stringify(validHmac)} },
        body: ${JSON.stringify(payload)},
      }
      const parsedBodyRes = createMockRes()
      await handler(parsedBodyReq, parsedBodyRes)

      // Test 2d: Valid signature but body tampered => 401
      const tamperedReq = {
        method: 'POST',
        headers: { 'x-shopify-hmac-sha256': ${JSON.stringify(validHmac)} },
        body: ${JSON.stringify(payloadStr.replace('100.00', '1.00'))},
      }
      const tamperedRes = createMockRes()
      await handler(tamperedReq, tamperedRes)

      // Test 3: Valid POST with HMAC acceptance (200)
      const validReq = {
        method: 'POST',
        headers: {
          'x-shopify-topic': 'orders/updated',
          'x-shopify-hmac-sha256': ${JSON.stringify(validHmac)},
          'x-shopify-shop-domain': 'displaycellpros.myshopify.com',
        },
        body: ${JSON.stringify(payloadStr)},
      }
      const validRes = createMockRes()
      await handler(validReq, validRes)

      // Test 4: Raw request stream (bodyParser disabled, real Next.js behaviour) => 200
      const { Readable } = await import('node:stream')
      const streamReq = Readable.from([Buffer.from(${JSON.stringify(payloadStr)}, 'utf8')])
      streamReq.method = 'POST'
      streamReq.headers = {
        'x-shopify-topic': 'orders/updated',
        'x-shopify-hmac-sha256': ${JSON.stringify(validHmac)},
      }
      const streamRes = createMockRes()
      await handler(streamReq, streamRes)

      console.log(JSON.stringify({
        getMethodStatus: getRes.statusCode,
        invalidHmacStatus: invalidHmacRes.statusCode,
        missingHmacStatus: missingHmacRes.statusCode,
        parsedBodyStatus: parsedBodyRes.statusCode,
        tamperedStatus: tamperedRes.statusCode,
        validStatus: validRes.statusCode,
        streamStatus: streamRes.statusCode,
        validResponseBody: validRes.body,
      }))
    `)

    expect(result.getMethodStatus).toBe(405)
    expect(result.invalidHmacStatus).toBe(401)
    expect(result.missingHmacStatus).toBe(401)
    expect(result.parsedBodyStatus).toBe(401)
    expect(result.tamperedStatus).toBe(401)
    expect(result.validStatus).toBe(200)
    expect(result.streamStatus).toBe(200)
    expect(result.validResponseBody.success).toBe(true)
    expect(result.validResponseBody.orderId).toBe(778899)
    expect(result.validResponseBody.reconciliation).toBeDefined()
  })

  test('API Route rejects every request when no webhook secret is configured', () => {
    const payloadStr = JSON.stringify({ id: 42, name: '#1042' })
    const result = runWebhookScript(
      `
      const handler = webhookModule.default
      const res = { statusCode: 200, headers: {}, body: null, setHeader() {}, status(c) { this.statusCode = c; return this }, json(o) { this.body = o; return this } }
      const origError = console.error
      const origWarn = console.warn
      console.error = () => {}
      console.warn = () => {}
      await handler({ method: 'POST', headers: { 'x-shopify-hmac-sha256': 'anything' }, body: ${JSON.stringify(payloadStr)} }, res)
      console.error = origError
      console.warn = origWarn
      console.log(JSON.stringify({ status: res.statusCode }))
    `,
      { SHOPIFY_WEBHOOK_SECRET: '', SHOPIFY_CLIENT_SECRET: '' }
    )
    expect(result.status).toBe(401)
  })

  test('verifyShopifyWebhookHmac falls back to SHOPIFY_CLIENT_SECRET and never accepts without a secret', () => {
    const payload = JSON.stringify({ id: 1 })
    const clientSecretHmac = computeHmac(payload, 'app_client_secret_xyz')
    const withClientSecret = runWebhookScript(
      `
      const { verifyShopifyWebhookHmac } = reconcilerModule
      console.log(JSON.stringify({ ok: verifyShopifyWebhookHmac(${JSON.stringify(payload)}, ${JSON.stringify(clientSecretHmac)}) }))
    `,
      { SHOPIFY_WEBHOOK_SECRET: '', SHOPIFY_CLIENT_SECRET: 'app_client_secret_xyz' }
    )
    const noSecret = runWebhookScript(
      `
      const { verifyShopifyWebhookHmac } = reconcilerModule
      console.log(JSON.stringify({ ok: verifyShopifyWebhookHmac(${JSON.stringify(payload)}, ${JSON.stringify(clientSecretHmac)}) }))
    `,
      { SHOPIFY_WEBHOOK_SECRET: '', SHOPIFY_CLIENT_SECRET: '', NODE_ENV: 'test' }
    )
    expect(withClientSecret.ok).toBe(true)
    expect(noSecret.ok).toBe(false)
  })
})
