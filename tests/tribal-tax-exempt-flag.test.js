const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..')
const mod = (p) => JSON.stringify(pathToFileURL(path.join(repoRoot, p)).href)

function run(body, flag) {
  const env = { ...process.env, NODE_ENV: 'test' }
  delete env.TRIBAL_TAX_EXEMPT_ENABLED
  if (flag !== undefined) env.TRIBAL_TAX_EXEMPT_ENABLED = flag
  const script = `
    const { calculateAvaTaxTribalQuote } = await import(${mod('lib/tribal/avatax.ts')})
    const { verifyTribalEnrollment } = await import(${mod('lib/tribal/verification.ts')})
    const { isTribalTaxExemptEnabled } = await import(${mod('lib/tribal/tax-flags.ts')})
    ${body}
  `
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', script], { cwd: repoRoot, encoding: 'utf8', env })
  return JSON.parse(out.trim())
}

const quoteBody = `
  const q = await calculateAvaTaxTribalQuote({
    customerId: 'c1', isTribalMember: true, onReservation: true,
    shippingAddress: { line1: '1 Main', city: 'Window Rock', region: 'AZ', postalCode: '86515', country: 'US' },
    lines: [{ amount: 200, quantity: 1 }],
  })
  const v = await verifyTribalEnrollment({ firstName: 'A', lastName: 'B', tribalNation: 'Navajo Nation', tribalEnrollmentId: '12345678',
    shippingAddress: { address1: '1 Main', city: 'Window Rock', province: 'AZ', zip: '86515', country: 'US' } })
  console.log(JSON.stringify({ flag: isTribalTaxExemptEnabled(), q, track: v.taxExemptionTrack }))
`

describe('TRIBAL_TAX_EXEMPT_ENABLED flag', () => {
  test('default OFF: no exemption, tax on the post-discount price', () => {
    const r = run(quoteBody)
    expect(r.flag).toBe(false)
    expect(r.q.isTaxExempt).toBe(false)
    expect(r.q.entityUseCode).toBeUndefined()
    expect(r.q.totalDiscount).toBe(40)
    expect(r.q.totalTaxable).toBe(160)
    expect(r.q.totalTax).toBe(Number((160 * 0.0825).toFixed(2)))
    expect(r.track.taxExempt).toBe(false)
    expect(r.track.taxExemptionCode).toBeNull()
  })

  test('only the exact value "true" turns it on', () => {
    expect(run(quoteBody, '1').flag).toBe(false)
    const on = run(quoteBody, 'true')
    expect(on.flag).toBe(true)
    expect(on.q.isTaxExempt).toBe(true)
    expect(on.q.entityUseCode).toBe('C')
    expect(on.track.taxExempt).toBe(true)
  })
})
