const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const crypto = require('node:crypto')

function runWebhookScript(testFnBody) {
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
    env: { ...process.env, NODE_ENV: 'test', SHOPIFY_WEBHOOK_SECRET: 'test_webhook_secret_key_123' },
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
        body: ${JSON.stringify(payload)},
      }
      const invalidHmacRes = createMockRes()
      await handler(invalidHmacReq, invalidHmacRes)

      // Test 3: Valid POST with HMAC acceptance (200)
      const validReq = {
        method: 'POST',
        headers: {
          'x-shopify-topic': 'orders/updated',
          'x-shopify-hmac-sha256': ${JSON.stringify(validHmac)},
          'x-shopify-shop-domain': 'displaycellpros.myshopify.com',
        },
        body: ${JSON.stringify(payload)},
      }
      const validRes = createMockRes()
      await handler(validReq, validRes)

      console.log(JSON.stringify({
        getMethodStatus: getRes.statusCode,
        invalidHmacStatus: invalidHmacRes.statusCode,
        validStatus: validRes.statusCode,
        validResponseBody: validRes.body,
      }))
    `)

    expect(result.getMethodStatus).toBe(405)
    expect(result.invalidHmacStatus).toBe(401)
    expect(result.validStatus).toBe(200)
    expect(result.validResponseBody.success).toBe(true)
    expect(result.validResponseBody.orderId).toBe(778899)
    expect(result.validResponseBody.reconciliation).toBeDefined()
  })
})
