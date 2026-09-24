const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function runValidationScript(testFnBody) {
  const repoRoot = path.resolve(__dirname, '..')
  const validationUrl = pathToFileURL(path.join(repoRoot, 'lib/tribal/validation.ts')).href

  const script = `
    const validationModule = await import(${JSON.stringify(validationUrl)})
    ${testFnBody}
  `

  const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  })

  return JSON.parse(output.trim())
}

describe('Exemption Certificate Zod Schema Validation', () => {
  const validBasePayload = {
    customerId: 'cust_7788',
    customerName: 'Mary Tsosie',
    customerEmail: 'mary.tsosie@navajo.gov',
    tribalNation: 'Navajo Nation',
    enrollmentId: 'NAV-98442',
    reservationName: 'Navajo Indian Reservation',
    deliveryAddress: {
      address1: '100 Tribal Complex Route 12',
      city: 'Window Rock',
      state: 'AZ',
      zip: '86515',
    },
    carrierDeliveryMethod: 'COMMON_CARRIER',
    deliveryConfirmationRef: '1Z9999999999999999',
    signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    signedDate: '2026-09-23',
    statutoryAffirmation: true,
  }

  describe('Tribal Enrollment / Census Roll ID Strict Format Validation', () => {
    test('Accepts valid tribal enrollment IDs in various recognized formats', () => {
      const validIds = [
        'NAV-98442',
        'YAK-10293',
        'HOOPA-4492',
        'CHER-99214',
        'CRIT-0091',
        '12345678',
        'C0123456',
        'A/123-456',
        'T-88210-A',
      ]

      const result = runValidationScript(`
        const { tribalIdSchema } = validationModule
        const results = ${JSON.stringify(validIds)}.map(id => ({
          id,
          success: tribalIdSchema.safeParse(id).success,
        }))
        console.log(JSON.stringify(results))
      `)

      result.forEach(({ id, success }) => {
        expect(success).toBe(true)
      })
    })

    test('Rejects empty, whitespace-only, or too short tribal IDs', () => {
      const invalidIds = ['', '   ', 'A', '12']

      const result = runValidationScript(`
        const { tribalIdSchema } = validationModule
        const results = ${JSON.stringify(invalidIds)}.map(id => ({
          id,
          success: tribalIdSchema.safeParse(id).success,
        }))
        console.log(JSON.stringify(results))
      `)

      result.forEach(({ id, success }) => {
        expect(success).toBe(false)
      })
    })

    test('Rejects placeholder and dummy enrollment values (e.g., 0000, test, NONE, N/A, invalid)', () => {
      const dummyIds = [
        '0000',
        '000000',
        '11111',
        '99999',
        'TEST',
        'test',
        'NONE',
        'none',
        'N/A',
        'NA',
        'INVALID',
        'dummy',
        'sample',
        'unknown',
        'XXXXXX',
      ]

      const result = runValidationScript(`
        const { tribalIdSchema } = validationModule
        const results = ${JSON.stringify(dummyIds)}.map(id => ({
          id,
          success: tribalIdSchema.safeParse(id).success,
        }))
        console.log(JSON.stringify(results))
      `)

      result.forEach(({ id, success }) => {
        expect(success).toBe(false)
      })
    })

    test('Rejects disallowed symbols and potential injection characters', () => {
      const maliciousIds = [
        'NAV<script>',
        'NAV; DROP TABLE',
        'NAV" OR "1"="1',
        '***@@@###',
      ]

      const result = runValidationScript(`
        const { tribalIdSchema } = validationModule
        const results = ${JSON.stringify(maliciousIds)}.map(id => ({
          id,
          success: tribalIdSchema.safeParse(id).success,
        }))
        console.log(JSON.stringify(results))
      `)

      result.forEach(({ id, success }) => {
        expect(success).toBe(false)
      })
    })
  })

  describe('State-Required Document Fields Validation', () => {
    test('Validates compliant California CDTFA-146-RES submission', () => {
      const caPayload = {
        ...validBasePayload,
        customerName: 'Elena Colegrove',
        tribalNation: 'Hoopa Valley Tribe',
        enrollmentId: 'HVT-4492',
        reservationName: 'Hoopa Valley Reservation',
        deliveryAddress: {
          address1: '11880 State Hwy 96',
          city: 'Hoopa',
          state: 'CA',
          zip: '95546',
        },
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(caPayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(true)
      expect(result.errors).toBeUndefined()
      expect(result.formType).toBe('CDTFA-146-RES')
    })

    test('Rejects California CDTFA-146-RES when delivery ZIP does not match California', () => {
      const invalidCaPayload = {
        ...validBasePayload,
        deliveryAddress: {
          address1: '11880 State Hwy 96',
          city: 'Hoopa',
          state: 'CA',
          zip: '98948', // WA zip code
        },
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(invalidCaPayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(false)
      expect(result.errors?.['deliveryAddress.zip']).toBeDefined()
    })

    test('Validates compliant Washington WAC-458-20-192 submission', () => {
      const waPayload = {
        ...validBasePayload,
        customerName: 'David Yakima',
        tribalNation: 'Yakama Nation',
        enrollmentId: 'YAK-10293',
        reservationName: 'Yakama Reservation',
        deliveryAddress: {
          address1: '401 Fort Road',
          city: 'Toppenish',
          state: 'WA',
          zip: '98948',
        },
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(waPayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(true)
      expect(result.formType).toBe('WAC-458-20-192')
    })

    test('Rejects Washington WAC-458-20-192 when delivery ZIP does not match Washington', () => {
      const invalidWaPayload = {
        ...validBasePayload,
        deliveryAddress: {
          address1: '401 Fort Road',
          city: 'Toppenish',
          state: 'WA',
          zip: '95546', // CA zip code
        },
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(invalidWaPayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(false)
      expect(result.errors?.['deliveryAddress.zip']).toBeDefined()
    })

    test('Rejects missing or invalid digital signature', () => {
      const noSignaturePayload = {
        ...validBasePayload,
        signatureBase64: '',
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(noSignaturePayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(false)
      expect(result.errors?.signatureBase64).toBeDefined()
    })

    test('Rejects non-data-url signature format', () => {
      const badSignaturePayload = {
        ...validBasePayload,
        signatureBase64: 'plain_text_not_an_image',
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(badSignaturePayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(false)
      expect(result.errors?.signatureBase64).toBeDefined()
    })

    test('Rejects uncertified statutory affirmation (statutoryAffirmation === false)', () => {
      const uncertifiedPayload = {
        ...validBasePayload,
        statutoryAffirmation: false,
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(uncertifiedPayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(false)
      expect(result.errors?.statutoryAffirmation).toBeDefined()
    })

    test('Rejects missing or invalid customer legal name', () => {
      const badNamePayload = {
        ...validBasePayload,
        customerName: 'X', // too short
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(badNamePayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(false)
      expect(result.errors?.customerName).toBeDefined()
    })

    test('Rejects invalid email format', () => {
      const badEmailPayload = {
        ...validBasePayload,
        customerEmail: 'not-an-email-address',
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(badEmailPayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(false)
      expect(result.errors?.customerEmail).toBeDefined()
    })

    test('Rejects invalid delivery carrier method', () => {
      const badCarrierPayload = {
        ...validBasePayload,
        carrierDeliveryMethod: 'AIR_DROP_DRONE',
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(badCarrierPayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(false)
      expect(result.errors?.carrierDeliveryMethod).toBeDefined()
    })

    test('Rejects California CDTFA-146-RES when reservationName is missing', () => {
      const caNoReservationPayload = {
        ...validBasePayload,
        deliveryAddress: {
          address1: '11880 State Hwy 96',
          city: 'Hoopa',
          state: 'CA',
          zip: '95546',
        },
        reservationName: '',
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(caNoReservationPayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(false)
      expect(result.errors?.reservationName).toContain('Reservation or Rancheria name is required for California exemption')
    })

    test('Rejects Washington WAC-458-20-192 when reservationName is missing', () => {
      const waNoReservationPayload = {
        ...validBasePayload,
        deliveryAddress: {
          address1: '401 Fort Road',
          city: 'Toppenish',
          state: 'WA',
          zip: '98948',
        },
        reservationName: '',
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(waNoReservationPayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(false)
      expect(result.errors?.reservationName).toContain('Reservation or Indian Country name is required for Washington exemption')
    })

    test('Rejects reservationName with prohibited injection characters', () => {
      const injectionPayload = {
        ...validBasePayload,
        reservationName: 'Navajo<script>alert(1)</script>',
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(injectionPayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(false)
      expect(result.errors?.reservationName).toContain('invalid or prohibited characters')
    })

    test('Rejects deliveryConfirmationRef with prohibited characters or invalid length', () => {
      const badRefPayload = {
        ...validBasePayload,
        deliveryConfirmationRef: 'A;DROP TABLE',
      }

      const result = runValidationScript(`
        const { validateExemptionCertificate } = validationModule
        const res = validateExemptionCertificate(${JSON.stringify(badRefPayload)})
        console.log(JSON.stringify(res))
      `)

      expect(result.success).toBe(false)
      expect(result.errors?.deliveryConfirmationRef).toBeDefined()
    })

    test('Validates real-time field level feedback with validateCertificateField', () => {
      const result = runValidationScript(`
        const { validateCertificateField } = validationModule
        const tests = {
          enrollmentValid: validateCertificateField('enrollmentId', 'NAV-98442'),
          enrollmentDummy: validateCertificateField('enrollmentId', 'TEST_FAIL'),
          enrollmentShort: validateCertificateField('enrollmentId', 'AB'),
          caReservationMissing: validateCertificateField('reservationName', '', { deliveryAddress: { state: 'CA' } }),
          caReservationProvided: validateCertificateField('reservationName', 'Round Valley Indian Tribe', { deliveryAddress: { state: 'CA' } }),
          zipStateMismatch: validateCertificateField('deliveryAddress.zip', '95546', { deliveryAddress: { state: 'WA' } }),
          zipStateMatch: validateCertificateField('deliveryAddress.zip', '98948', { deliveryAddress: { state: 'WA' } }),
          nameShort: validateCertificateField('customerName', 'A'),
          nameValid: validateCertificateField('customerName', 'Mary Tsosie'),
        }
        console.log(JSON.stringify(tests))
      `)

      expect(result.enrollmentValid).toBeNull()
      expect(result.enrollmentDummy).toBeTruthy()
      expect(result.enrollmentShort).toBeTruthy()
      expect(result.caReservationMissing).toContain('California exemption')
      expect(result.caReservationProvided).toBeNull()
      expect(result.zipStateMismatch).toContain('not located in Washington')
      expect(result.zipStateMatch).toBeNull()
      expect(result.nameShort).toBeTruthy()
      expect(result.nameValid).toBeNull()
    })
  })

  describe('API Route /api/tribal/certificate Zod Enforcement', () => {
    test('Rejects POST request with dummy Tribal ID with HTTP 400 and validation errors', () => {
      const badPayload = {
        ...validBasePayload,
        enrollmentId: '0000',
      }

      const repoRoot = path.resolve(__dirname, '..')
      const apiRouteUrl = pathToFileURL(path.join(repoRoot, 'pages/api/tribal/certificate.ts')).href

      const script = `
        const handlerModule = await import(${JSON.stringify(apiRouteUrl)})
        const handler = handlerModule.default

        let statusCode = 0
        let responseJson = null

        const req = {
          method: 'POST',
          body: ${JSON.stringify(badPayload)},
          headers: {},
          socket: { remoteAddress: '127.0.0.1' },
          query: {},
        }

        const res = {
          setHeader: () => {},
          status: (code) => {
            statusCode = code
            return {
              json: (data) => {
                responseJson = data
              },
              end: () => {},
            }
          },
        }

        await handler(req, res)
        console.log(JSON.stringify({ statusCode, responseJson }))
      `

      const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      })

      const res = JSON.parse(output.trim())
      expect(res.statusCode).toBe(400)
      expect(res.responseJson.error).toContain('Validation failed')
      expect(res.responseJson.errors?.enrollmentId).toBeDefined()
    })

    test('Accepts compliant POST request with HTTP 200 and issues registered certificate', () => {
      const repoRoot = path.resolve(__dirname, '..')
      const apiRouteUrl = pathToFileURL(path.join(repoRoot, 'pages/api/tribal/certificate.ts')).href

      const script = `
        const handlerModule = await import(${JSON.stringify(apiRouteUrl)})
        const handler = handlerModule.default

        let statusCode = 0
        let responseJson = null

        const req = {
          method: 'POST',
          body: ${JSON.stringify(validBasePayload)},
          headers: {},
          socket: { remoteAddress: '127.0.0.1' },
          query: {},
        }

        const res = {
          setHeader: () => {},
          status: (code) => {
            statusCode = code
            return {
              json: (data) => {
                responseJson = data
              },
              end: () => {},
            }
          },
        }

        await handler(req, res)
        console.log(JSON.stringify({ statusCode, responseJson }))
      `

      const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      })

      const res = JSON.parse(output.trim())
      expect(res.statusCode).toBe(200)
      expect(res.responseJson.success).toBe(true)
      expect(res.responseJson.certificate?.id).toBeDefined()
      expect(res.responseJson.certificate?.signatureHash).toBeDefined()
    })
  })
})
