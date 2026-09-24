const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function runTribalScript(testFnBody) {
  const repoRoot = path.resolve(__dirname, '..')
  const verificationUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/verification.ts')).href
  const geofencingUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/geofencing.ts')).href
  const certificatesUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/certificates.ts')).href
  const avataxUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/avatax.ts')).href
  const qaMatrixUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/qa-matrix.ts')).href

  const script = `
    const { verifyTribalEnrollment } = await import(${JSON.stringify(verificationUrl)})
    const { evaluateAddressGeofence } = await import(${JSON.stringify(geofencingUrl)})
    const { generateSignedCertificate, getRequiredCertificateType } = await import(${JSON.stringify(certificatesUrl)})
    const { calculateAvaTaxTribalQuote, AVATAX_ENTITY_USE_CODES } = await import(${JSON.stringify(avataxUrl)})
    const { evaluateQAScenario } = await import(${JSON.stringify(qaMatrixUrl)})

    ${testFnBody}
  `

  const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  })

  return JSON.parse(output.trim())
}

describe('Tribal Tax Exemption & Identity Discount System - Dual-Track Suite', () => {
  describe('QA Test Matrix - 4 Canonical Scenarios', () => {
    test('Scenario 1: Enrolled + On-reservation -> 20% discount + tax exempt (Entity Use Code C)', () => {
      const result = runTribalScript(`
        const evalResult = await evaluateQAScenario('ENROLLED_ON_RESERVATION')
        console.log(JSON.stringify(evalResult))
      `)

      expect(result.actualResults.passed).toBe(true)
      expect(result.actualResults.discountApplied).toBe(true)
      expect(result.actualResults.discountPercent).toBe(20)
      expect(result.actualResults.taxExemptApplied).toBe(true)
      expect(result.actualResults.entityUseCode).toBe('C')
      expect(result.actualResults.customerTag).toBe('tribal-member-verified')
    })

    test('Scenario 2: Enrolled + Off-reservation -> 20% discount only', () => {
      const result = runTribalScript(`
        const evalResult = await evaluateQAScenario('ENROLLED_OFF_RESERVATION')
        console.log(JSON.stringify(evalResult))
      `)

      expect(result.actualResults.passed).toBe(true)
      expect(result.actualResults.discountApplied).toBe(true)
      expect(result.actualResults.discountPercent).toBe(20)
      expect(result.actualResults.taxExemptApplied).toBe(false)
      expect(result.actualResults.entityUseCode).toBeNull()
      expect(result.actualResults.customerTag).toBe('tribal-member-verified')
    })

    test('Scenario 3: Not enrolled + On-reservation -> no discount, no exemption', () => {
      const result = runTribalScript(`
        const evalResult = await evaluateQAScenario('NOT_ENROLLED_ON_RESERVATION')
        console.log(JSON.stringify(evalResult))
      `)

      expect(result.actualResults.passed).toBe(true)
      expect(result.actualResults.discountApplied).toBe(false)
      expect(result.actualResults.discountPercent).toBe(0)
      expect(result.actualResults.taxExemptApplied).toBe(false)
      expect(result.actualResults.entityUseCode).toBeNull()
      expect(result.actualResults.customerTag).toBeNull()
    })

    test('Scenario 4: Not enrolled + Off-reservation -> standard pricing and tax', () => {
      const result = runTribalScript(`
        const evalResult = await evaluateQAScenario('NOT_ENROLLED_OFF_RESERVATION')
        console.log(JSON.stringify(evalResult))
      `)

      expect(result.actualResults.passed).toBe(true)
      expect(result.actualResults.discountApplied).toBe(false)
      expect(result.actualResults.discountPercent).toBe(0)
      expect(result.actualResults.taxExemptApplied).toBe(false)
      expect(result.actualResults.entityUseCode).toBeNull()
      expect(result.actualResults.customerTag).toBeNull()
    })
  })

  describe('Geofencing & AIANA Reservation Boundary Engine', () => {
    test('Identifies on-reservation zip codes accurately', () => {
      const result = runTribalScript(`
        const navajo = evaluateAddressGeofence({ address1: '10 BIA Rt', city: 'Window Rock', province: 'AZ', zip: '86515' })
        const gilaRiver = evaluateAddressGeofence({ address1: '1 Tribal Way', city: 'Sacaton', province: 'AZ', zip: '85247' })
        const offRes = evaluateAddressGeofence({ address1: '100 Broadway', city: 'New York', province: 'NY', zip: '10005' })
        console.log(JSON.stringify({ navajo, gilaRiver, offRes }))
      `)

      expect(result.navajo.onReservation).toBe(true)
      expect(result.navajo.isSelfAdministered).toBe(true)
      expect(result.navajo.tribalTaxRate).toBe(0.06)

      expect(result.gilaRiver.onReservation).toBe(true)
      expect(result.gilaRiver.isSelfAdministered).toBe(true)
      expect(result.gilaRiver.tribalTaxRate).toBe(0.04)

      expect(result.offRes.onReservation).toBe(false)
    })

    test('Identifies latitude/longitude intersection with AIANA TIGER/Line Shapefiles', () => {
      const repoRoot = path.resolve(__dirname, '..')
      const geofenceLibUrl = pathToFileURL(path.join(repoRoot, 'lib/geofencing.ts')).href

      const script = `
        const { checkCoordinatesIntersectAIANA, isCoordinatesOnReservation } = await import(${JSON.stringify(geofenceLibUrl)})

        // Window Rock, AZ (Navajo Nation reservation center): Lat 35.68, Lng -109.06
        const windowRock = checkCoordinatesIntersectAIANA(35.68, -109.06)
        const isWindowRockOnRes = isCoordinatesOnReservation(35.68, -109.06)

        // Sacaton, AZ (Gila River Indian Reservation): Lat 33.07, Lng -111.74
        const sacaton = checkCoordinatesIntersectAIANA(33.07, -111.74)

        // New York City, NY: Lat 40.71, Lng -74.00 (Off-reservation)
        const nyc = checkCoordinatesIntersectAIANA(40.71, -74.00)
        const isNycOnRes = isCoordinatesOnReservation(40.71, -74.00)

        console.log(JSON.stringify({ windowRock, isWindowRockOnRes, sacaton, nyc, isNycOnRes }))
      `

      const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      })

      const { windowRock, isWindowRockOnRes, sacaton, nyc, isNycOnRes } = JSON.parse(output.trim())
      expect(windowRock.onReservation).toBe(true)
      expect(windowRock.aianaCode).toBe('2430')
      expect(isWindowRockOnRes).toBe(true)

      expect(sacaton.onReservation).toBe(true)
      expect(sacaton.aianaCode).toBe('1270')

      expect(nyc.onReservation).toBe(false)
      expect(isNycOnRes).toBe(false)
    })
  })

  describe('Exemption Certificate Generator', () => {
    test('Selects CDTFA-146-RES for California and WAC 458-20-192 for Washington', () => {
      const result = runTribalScript(`
        const caForm = getRequiredCertificateType('CA')
        const waForm = getRequiredCertificateType('WA')
        const generalForm = getRequiredCertificateType('AZ')

        const signedCert = generateSignedCertificate({
          customerId: 'cust_cert_1',
          customerName: 'Mary Tsosie',
          customerEmail: 'mary@example.com',
          tribalNation: 'Navajo Nation',
          enrollmentId: 'NAV-99441',
          reservationName: 'Navajo Nation',
          deliveryAddress: { address1: '10 BIA Rt', city: 'Window Rock', state: 'AZ', zip: '86515' },
          carrierDeliveryMethod: 'COMMON_CARRIER',
          signatureBase64: 'data:image/png;base64,ABCDEF123456',
        })

        console.log(JSON.stringify({ caForm, waForm, generalForm, signedCert }))
      `)

      expect(result.caForm).toBe('CDTFA-146-RES')
      expect(result.waForm).toBe('WAC-458-20-192')
      expect(result.generalForm).toBe('GENERAL_TRIBAL_EXEMPTION')
      expect(result.signedCert.id).toMatch(/^CERT-GENERAL_TRIBAL_EXEMPTION-/)
      expect(result.signedCert.enrollmentIdMasked).toBe('••••9441')
      expect(result.signedCert.signatureHash).toBeDefined()
    })
  })

  describe('Avalara AvaTax Engine with Entity Use Code C', () => {
    test('Applies Entity Use Code C and isolates self-administered tribal tax', () => {
      const result = runTribalScript(`
        const quote = await calculateAvaTaxTribalQuote({
          transactionCode: 'TX-AVATAX-01',
          customerId: 'cust_avatax',
          customerEmail: 'dine@example.com',
          isTribalMember: true,
          onReservation: true,
          shippingAddress: {
            line1: '100 BIA Route 12',
            city: 'Window Rock',
            region: 'AZ',
            postalCode: '86515',
            country: 'US',
          },
          lines: [{ number: '1', quantity: 2, amount: 100, taxCode: 'P0000000', itemCode: 'LCD-1', description: 'Screen' }],
        })

        console.log(JSON.stringify(quote))
      `)

      expect(quoteEntityUseCodeCheck(result)).toBe(true)
      expect(result.totalDiscount).toBe(40) // 20% of 200 = 40
      expect(result.totalTaxable).toBe(160) // 200 - 40 = 160
      expect(result.isSelfAdministeredTribalTax).toBe(true)
      expect(result.tribalRemittance.directRemittanceRequired).toBe(true)
      expect(result.tribalRemittance.tribalTaxRate).toBe(0.06)
      expect(result.tribalRemittance.tribalTaxAmount).toBe(9.6) // 160 * 0.06 = 9.60
    })
  })

  describe('Next.js API Route /api/tribal/verify & Shopify GraphQL customerUpdate Mutation', () => {
    test('Verifies enrollment and returns Shopify customer update payload with tribal-member-verified tag', () => {
      const repoRoot = path.resolve(__dirname, '..')
      const verificationUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/verification.ts')).href
      const shopifyAdminUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/shopify-admin.ts')).href

      const script = `
        const { verifyTribalEnrollment } = await import(${JSON.stringify(verificationUrl)})
        const { updateShopifyCustomerTribalStatus, CUSTOMER_UPDATE_MUTATION } = await import(${JSON.stringify(shopifyAdminUrl)})

        const body = {
          customerId: 'cust_shop_12345',
          email: 'member@navajo.gov',
          firstName: 'Leonard',
          lastName: 'Pestlakai',
          tribalNation: 'Navajo Nation',
          tribalEnrollmentId: 'NAV-77881',
          shippingAddress: {
            address1: '10 Tribal Way',
            city: 'Window Rock',
            province: 'AZ',
            zip: '86515',
          },
        }

        const verification = await verifyTribalEnrollment(body)
        const shopifySyncResult = await updateShopifyCustomerTribalStatus({
          customerId: body.customerId,
          tagsToAdd: ['tribal-member-verified'],
          taxExempt: verification.taxExemptionTrack.taxExempt,
          taxExemptions: verification.taxExemptionTrack.taxExempt
            ? ['EXEMPT_INDIAN_IN_CANADA_OR_USA']
            : [],
          audit: verification.audit,
        })

        console.log(JSON.stringify({ verification, shopifySyncResult, mutation: CUSTOMER_UPDATE_MUTATION }))
      `

      const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      })

      const { verification, shopifySyncResult, mutation } = JSON.parse(output.trim())
      expect(verification.verified).toBe(true)
      expect(shopifySyncResult.success).toBe(true)
      expect(shopifySyncResult.data.tags).toContain('tribal-member-verified')
      expect(verification.discountTrack.eligible).toBe(true)
      expect(verification.discountTrack.discountPercentage).toBe(20)
      expect(mutation).toContain('customerUpdate(input: $input)')
    })
  })

  describe('Shopify Audit Trail & Metafield Logger (lib/audit.ts)', () => {
    test('Logs verification events with timestamp, status, and SHA-256 hash to customer metafields', () => {
      const repoRoot = path.resolve(__dirname, '..')
      const auditLibUrl = pathToFileURL(path.join(repoRoot, 'lib/audit.ts')).href

      const script = `
        const { logVerificationEvent, generateVerificationAuditHash } = await import(${JSON.stringify(auditLibUrl)})

        const result = await logVerificationEvent({
          customerId: '7891011',
          event: {
            verificationStatus: 'VERIFIED',
            tribalNation: 'Navajo Nation',
            maskedEnrollmentId: '••••7788',
            taxExempt: true,
            entityUseCode: 'C',
            provider: 'sheerid',
          },
        })

        const hash = generateVerificationAuditHash({
          customerId: 'gid://shopify/Customer/7891011',
          tribalNation: 'Navajo Nation',
          maskedEnrollmentId: '••••7788',
          timestamp: result.timestamp,
          status: 'VERIFIED',
        })

        console.log(JSON.stringify({ result, hash }))
      `

      const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      })

      const { result, hash } = JSON.parse(output.trim())
      expect(result.success).toBe(true)
      expect(result.status).toBe('VERIFIED')
      expect(result.customerId).toBe('gid://shopify/Customer/7891011')
      expect(result.hash).toBe(hash)
      expect(result.metafieldsWritten.length).toBe(4)

      const hashMetafield = result.metafieldsWritten.find((m) => m.key === 'tribal_verification_hash')
      const statusMetafield = result.metafieldsWritten.find((m) => m.key === 'tribal_verification_status')
      const timeMetafield = result.metafieldsWritten.find((m) => m.key === 'tribal_verified_at')
      const logMetafield = result.metafieldsWritten.find((m) => m.key === 'tribal_audit_log')

      expect(hashMetafield.value).toBe(hash)
      expect(statusMetafield.value).toBe('VERIFIED')
      expect(timeMetafield.value).toBe(result.timestamp)
      expect(JSON.parse(logMetafield.value).taxExempt).toBe(true)
    })
  })

  describe('Avalara AvaTax Calculation Service (lib/tax-calculator.ts)', () => {
    test('Calculates tax exemptions using Entity Use Code C for qualified on-reservation transactions', () => {
      const repoRoot = path.resolve(__dirname, '..')
      const taxCalcUrl = pathToFileURL(path.join(repoRoot, 'lib/tax-calculator.ts')).href

      const script = `
        const { calculateTribalTransactionTax } = await import(${JSON.stringify(taxCalcUrl)})

        // Qualified on-reservation tribal delivery (Navajo Nation - self-administered 6% tax)
        const qualifiedNavajo = await calculateTribalTransactionTax({
          customerId: 'cust_999',
          isTribalMember: true,
          tribalNation: 'Navajo Nation',
          shippingAddress: {
            line1: '10 Tribal Blvd',
            city: 'Window Rock',
            region: 'AZ',
            postalCode: '86515',
            country: 'US',
          },
          lines: [{ itemCode: 'PHONE-SCREEN-01', quantity: 2, amount: 100 }],
        })

        // Off-reservation tribal delivery (20% discount applies, but standard sales tax applies)
        const offReservation = await calculateTribalTransactionTax({
          customerId: 'cust_999',
          isTribalMember: true,
          tribalNation: 'Navajo Nation',
          shippingAddress: {
            line1: '123 Main St',
            city: 'Phoenix',
            region: 'AZ',
            postalCode: '85001',
            country: 'US',
          },
          lines: [{ itemCode: 'PHONE-SCREEN-01', quantity: 2, amount: 100 }],
        })

        console.log(JSON.stringify({ qualifiedNavajo, offReservation }))
      `

      const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      })

      const { qualifiedNavajo, offReservation } = JSON.parse(output.trim())
      expect(qualifiedNavajo.isTaxExempt).toBe(true)
      expect(qualifiedNavajo.entityUseCode).toBe('C')
      expect(qualifiedNavajo.totalDiscount).toBe(40) // 20% of 200
      expect(qualifiedNavajo.taxableAmount).toBe(160)
      expect(qualifiedNavajo.isSelfAdministeredTribalTax).toBe(true)
      expect(qualifiedNavajo.totalTax).toBe(9.6) // 6% of 160

      expect(offReservation.isTaxExempt).toBe(false)
      expect(offReservation.entityUseCode).toBeUndefined()
      expect(offReservation.totalDiscount).toBe(40)
      expect(offReservation.totalTax).toBeGreaterThan(0)
    })
  })

  describe('Tribal Verification Email Notification Service (lib/email-service.ts)', () => {
    test('Generates HTML/text templates and sends confirmation email notice', () => {
      const repoRoot = path.resolve(__dirname, '..')
      const emailLibUrl = pathToFileURL(path.join(repoRoot, 'lib/email-service.ts')).href

      const script = `
        const {
          sendTribalVerificationConfirmationEmail,
          generateTribalVerificationHtmlEmail,
          generateTribalVerificationTextEmail,
        } = await import(${JSON.stringify(emailLibUrl)})

        const sampleData = {
          customerName: 'Cheyenne Begay',
          customerEmail: 'cheyenne.begay@example.org',
          tribalNation: 'Navajo Nation',
          maskedEnrollmentId: '••••9921',
          verificationHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          verifiedAt: '2026-09-23T19:00:00.000Z',
          discountPercentage: 20,
          discountCode: 'TRIBAL-MEMBER-20',
          isTaxExempt: true,
          certificateRef: 'CERT-CDTFA-146-8832',
        }

        const html = generateTribalVerificationHtmlEmail(sampleData)
        const text = generateTribalVerificationTextEmail(sampleData)
        const dispatch = await sendTribalVerificationConfirmationEmail(sampleData)

        console.log(JSON.stringify({ html, text, dispatch }))
      `

      const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      })

      const { html, text, dispatch } = JSON.parse(output.trim())
      expect(dispatch.success).toBe(true)
      expect(dispatch.recipient).toBe('cheyenne.begay@example.org')
      expect(dispatch.subject).toContain('Navajo Nation')

      // HTML assertions
      expect(html).toContain('Tribal Member Enrollment Approved')
      expect(html).toContain('Navajo Nation')
      expect(html).toContain('••••9921')
      expect(html).toContain('Track 1: 20% Commercial Discount')
      expect(html).toContain('Track 2: On-Reservation Sales Tax Exemption')
      expect(html).toContain('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')

      // Plaintext assertions
      expect(text).toContain('TRIBAL-MEMBER-20')
      expect(text).toContain('CERT-CDTFA-146-8832')
    })
  })

  describe('Verification Error Logger (lib/audit.ts / VerificationErrorLogger)', () => {
    test('Logs failed verification attempts and API timeout events to verification-logs collection', () => {
      const repoRoot = path.resolve(__dirname, '..')
      const auditLibUrl = pathToFileURL(path.join(repoRoot, 'lib/audit.ts')).href

      const script = `
        const { VerificationErrorLogger, logVerificationTimeout } = await import(${JSON.stringify(auditLibUrl)})

        // Log a validation failure
        const errorResult = await VerificationErrorLogger.logError({
          customerId: 'gid://shopify/Customer/555123',
          errorType: 'INVALID_ENROLLMENT',
          errorMessage: 'Census roll ID not found in tribal registry',
          tribalNationAttempted: 'Navajo Nation',
          provider: 'sheerid',
        })

        // Log an API timeout
        const timeoutResult = await logVerificationTimeout({
          customerId: 'gid://shopify/Customer/555123',
          provider: 'idme',
          durationMs: 12500,
          tribalNationAttempted: 'Cherokee Nation',
          endpoint: 'https://api.idme.com/tribal/v1/verify',
        })

        console.log(JSON.stringify({ errorResult, timeoutResult }))
      `

      const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      })

      const { errorResult, timeoutResult } = JSON.parse(output.trim())
      expect(errorResult.success).toBe(true)
      expect(errorResult.entry.errorType).toBe('INVALID_ENROLLMENT')
      expect(errorResult.entry.errorMessage).toContain('Census roll ID not found')
      expect(errorResult.entry.tribalNationAttempted).toBe('Navajo Nation')
      expect(errorResult.metafieldsWritten.some((m) => m.namespace === 'verification_logs' && m.key === 'error_history')).toBe(true)

      expect(timeoutResult.success).toBe(true)
      expect(timeoutResult.entry.errorType).toBe('API_TIMEOUT')
      expect(timeoutResult.entry.httpStatus).toBe(504)
      expect(timeoutResult.entry.retryable).toBe(true)
      expect(timeoutResult.entry.durationMs).toBe(12500)
    })
  })

  describe('Admin Audit & Exemption Certificate CSV Exporter (lib/tribal/audit-csv-exporter.ts)', () => {
    test('Exports RFC-4180 compliant CSV with required tax reporting and certificate fields', () => {
      const repoRoot = path.resolve(__dirname, '..')
      const auditLibUrl = pathToFileURL(path.join(repoRoot, 'lib/audit.ts')).href

      const script = `
        const { exportAuditLogsToCsv, normalizeAuditEntryForExport } = await import(${JSON.stringify(auditLibUrl)})

        const sample = [
          normalizeAuditEntryForExport({
            customerId: 'gid://shopify/Customer/99001',
            customerEmail: 'member@navajo.example',
            customerName: 'Che Young',
            tribalNation: 'Navajo Nation',
            maskedEnrollmentId: '••••8821',
            status: 'VERIFIED',
            timestamp: '2026-09-20T10:00:00Z',
            certificateRef: 'CERT-CDTFA-146-8832',
            certificateState: 'CA',
            taxExempt: true,
            entityUseCode: 'C',
            hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          }),
        ]

        const csv = exportAuditLogsToCsv(sample)
        console.log(JSON.stringify({ csv, sampleCount: sample.length }))
      `

      const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      })

      const { csv, sampleCount } = JSON.parse(output.trim())
      expect(sampleCount).toBe(1)
      expect(csv).toContain('Customer ID')
      expect(csv).toContain('Avalara Entity Use Code')
      expect(csv).toContain('Exemption Certificate Ref')
      expect(csv).toContain('SHA-256 Audit Digest')
      expect(csv).toContain('Navajo Nation')
      expect(csv).toContain('CERT-CDTFA-146-8832')
      expect(csv).toContain('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    })
  })

  describe('Tribal ID QR Code Scanner & Credential Intake', () => {
    test('parses JSON-encoded Tribal ID QR credentials accurately', () => {
      const repoRoot = path.resolve(__dirname, '..')
      const qrScannerUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/qr-scanner.ts')).href

      const script = `
        const { parseTribalQrPayload, SAMPLE_TRIBAL_ID_PRESETS } = await import(${JSON.stringify(qrScannerUrl)})

        const sample = SAMPLE_TRIBAL_ID_PRESETS[0]
        const parsed = parseTribalQrPayload(sample.data.rawScanData)
        console.log(JSON.stringify({ parsed }))
      `

      const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      })

      const { parsed } = JSON.parse(output.trim())
      expect(parsed).not.toBeNull()
      expect(parsed.fullName).toBe('Che Young')
      expect(parsed.tribalNation).toBe('Navajo Nation')
      expect(parsed.enrollmentId).toBe('NAV-98442')
      expect(parsed.city).toBe('Window Rock')
      expect(parsed.state).toBe('AZ')
      expect(parsed.zip).toBe('86515')
    })

    test('parses pipe-delimited 2D barcode payload from physical tribal cards', () => {
      const repoRoot = path.resolve(__dirname, '..')
      const qrScannerUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/qr-scanner.ts')).href

      const script = `
        const { parseTribalQrPayload } = await import(${JSON.stringify(qrScannerUrl)})

        const rawBarcode = 'TRIBAL_ID|Yakama Nation|YAK-77192|David|Yakima|1980-04-12|Toppenish|WA|98948'
        const parsed = parseTribalQrPayload(rawBarcode)
        console.log(JSON.stringify({ parsed }))
      `

      const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      })

      const { parsed } = JSON.parse(output.trim())
      expect(parsed).not.toBeNull()
      expect(parsed.fullName).toBe('David Yakima')
      expect(parsed.tribalNation).toBe('Yakama Nation')
      expect(parsed.enrollmentId).toBe('YAK-77192')
      expect(parsed.city).toBe('Toppenish')
      expect(parsed.state).toBe('WA')
      expect(parsed.zip).toBe('98948')
    })
  })

  describe('Exemption Certificate PDF Generation (CDTFA-146-RES & WAC 458-20-192)', () => {
    test('generates valid PDF-1.4 binary for California CDTFA-146-RES form', () => {
      const repoRoot = path.resolve(__dirname, '..')
      const pdfGenUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/pdf-generator.ts')).href

      const script = `
        const { buildCertificatePdf } = await import(${JSON.stringify(pdfGenUrl)})

        const pdfBuffer = buildCertificatePdf({
          certificateId: 'CERT-CDTFA-146-TEST99',
          formType: 'CDTFA-146-RES',
          customerName: 'Elena Colegrove',
          tribalNation: 'Hoopa Valley Tribe',
          enrollmentIdMasked: '••••3019',
          deliveryAddress: '11880 State Highway 96, Hoopa, CA 95546',
          carrierDeliveryMethod: 'COMMON_CARRIER',
          state: 'CA',
          signatureHash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
          signedAt: '2026-09-21T14:30:00Z',
          expiresAt: '2027-09-21T14:30:00Z',
          entityUseCode: 'C',
        })

        const pdfStr = Buffer.from(pdfBuffer).toString('latin1')
        console.log(JSON.stringify({
          byteLength: pdfBuffer.length,
          header: pdfStr.slice(0, 8),
          hasFormTitle: pdfStr.includes('CDTFA-146-RES'),
          hasMemberName: pdfStr.includes('Elena Colegrove'),
          hasTribalNation: pdfStr.includes('Hoopa Valley Tribe'),
          hasEntityUseCode: pdfStr.includes('Avalara AvaTax Entity Use Code') && pdfStr.includes('Tribal Government'),
          hasShaDigest: pdfStr.includes('a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'),
        }))
      `

      const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      })

      const result = JSON.parse(output.trim())
      expect(result.byteLength).toBeGreaterThan(1000)
      expect(result.header).toBe('%PDF-1.4')
      expect(result.hasFormTitle).toBe(true)
      expect(result.hasMemberName).toBe(true)
      expect(result.hasTribalNation).toBe(true)
      expect(result.hasEntityUseCode).toBe(true)
      expect(result.hasShaDigest).toBe(true)
    })

    test('generates valid PDF-1.4 binary for Washington WAC 458-20-192 form', () => {
      const repoRoot = path.resolve(__dirname, '..')
      const pdfGenUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/pdf-generator.ts')).href

      const script = `
        const { buildCertificatePdf } = await import(${JSON.stringify(pdfGenUrl)})

        const pdfBuffer = buildCertificatePdf({
          certificateId: 'CERT-WAC-192-TEST88',
          formType: 'WAC-458-20-192',
          customerName: 'David Yakima',
          tribalNation: 'Confederated Tribes and Bands of the Yakama Nation',
          enrollmentIdMasked: '••••4120',
          deliveryAddress: '401 Fort Road, Toppenish, WA 98948',
          carrierDeliveryMethod: 'SELLER_DELIVERY',
          state: 'WA',
          signatureHash: 'b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78',
          signedAt: '2026-09-22T09:15:00Z',
          expiresAt: '2027-09-22T09:15:00Z',
          entityUseCode: 'C',
        })

        const pdfStr = Buffer.from(pdfBuffer).toString('latin1')
        console.log(JSON.stringify({
          byteLength: pdfBuffer.length,
          header: pdfStr.slice(0, 8),
          hasFormTitle: pdfStr.includes('WAC-458-20-192'),
          hasMemberName: pdfStr.includes('David Yakima'),
          hasTribalNation: pdfStr.includes('Yakama Nation'),
          hasEntityUseCode: pdfStr.includes('Avalara AvaTax Entity Use Code') && pdfStr.includes('Tribal Government'),
          hasShaDigest: pdfStr.includes('b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78'),
        }))
      `

      const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      })

      const result = JSON.parse(output.trim())
      expect(result.byteLength).toBeGreaterThan(1000)
      expect(result.header).toBe('%PDF-1.4')
      expect(result.hasFormTitle).toBe(true)
      expect(result.hasMemberName).toBe(true)
      expect(result.hasTribalNation).toBe(true)
      expect(result.hasEntityUseCode).toBe(true)
      expect(result.hasShaDigest).toBe(true)
    })
  })
})

function quoteEntityUseCodeCheck(result) {
  return result.entityUseCode === 'C' && result.isTaxExempt === true
}
