const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function runLookup(scriptBody) {
  const moduleUrl = pathToFileURL(path.resolve(__dirname, '../lib/repair-lookup.ts')).href
  const script = `
    const { normalizeLookupInput, lookupRepair } = await import(${JSON.stringify(moduleUrl)})
    const record = {
      shippingKit: {
        email: 'buyer@example.com',
        address: 'Private Street',
        phone: '555-0100'
      },
      itemDetails: { deviceBrand: 'Apple', deviceModel: 'iPhone 15' },
      status: 'bench_diagnostic',
      updatedAt: '2026-10-28T12:00:00.000Z',
      estimatedCompletion: '2026-11-02',
      passcode: '123456',
      serialNumber: 'PRIVATE-SERIAL',
      imei: 'PRIVATE-IMEI',
      notes: 'Private repair notes',
      imageUrls: ['https://example.com/private-photo.jpg']
    }
    ${scriptBody}
  `

  const output = execFileSync(
    process.execPath,
    ['--experimental-strip-types', '--input-type=module', '-e', script],
    { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }
  )

  return JSON.parse(output.trim())
}

describe('customer-safe repair lookup', () => {
  test('normalizes valid RMS and email inputs and rejects malformed inputs', () => {
    const result = runLookup(`
      console.log(JSON.stringify({
        valid: normalizeLookupInput(' dcp-rms-1234 ', ' Buyer@Example.com '),
        invalid: normalizeLookupInput('bad id', 'not-an-email')
      }))
    `)

    expect(result.valid).toEqual({ rms: 'DCP-RMS-1234', email: 'buyer@example.com' })
    expect(result.invalid).toBeNull()
  })

  test('returns the same not-found result when no source or record exists', async () => {
    const result = runLookup(`
      const noSource = await lookupRepair(null, 'DCP-RMS-1234', 'buyer@example.com')
      const noRecord = await lookupRepair({ get: async () => null }, 'DCP-RMS-1234', 'buyer@example.com')
      console.log(JSON.stringify({ noSource, noRecord }))
    `)

    expect(result).toEqual({ noSource: null, noRecord: null })
  })

  test('does not disclose a repair when the supplied email does not match', async () => {
    const result = runLookup(`
      const recordResult = await lookupRepair({ get: async () => record }, 'DCP-RMS-1234', 'other@example.com')
      console.log(JSON.stringify({ recordResult }))
    `)

    expect(result.recordResult).toBeNull()
  })

  test('returns only the customer-safe repair summary fields', async () => {
    const result = runLookup(`
      const summary = await lookupRepair({ get: async () => record }, 'DCP-RMS-1234', 'buyer@example.com')
      console.log(JSON.stringify({ summary }))
    `)

    expect(result.summary).toEqual({
      rmsNumber: 'DCP-RMS-1234',
      deviceModel: 'Apple iPhone 15',
      status: 'bench_diagnostic',
      updatedAt: '2026-10-28T12:00:00.000Z',
      estimatedCompletion: '2026-11-02'
    })
  })
})
