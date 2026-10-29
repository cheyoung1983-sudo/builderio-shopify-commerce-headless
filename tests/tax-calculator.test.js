const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

/**
 * lib/tax-calculator.ts: local (no-AvaTax-credentials) path. Covers the named
 * policy constants, geofencing edge cases and the remittance branches.
 */
const repoRoot = path.resolve(__dirname, '..')
const modUrl = pathToFileURL(path.join(repoRoot, 'lib/tax-calculator.ts')).href

function run(body, env = {}) {
  const script = `
    const m = await import(${JSON.stringify(modUrl)})
    const line = (amount, quantity = 1) => ({ itemCode: 'LCD-1', amount, quantity })
    const addr = (city, region, postalCode, extra = {}) => ({ line1: '1 Main St', city, region, postalCode, ...extra })
    ${body}
  `
  const cleanEnv = { ...process.env, NODE_ENV: 'test', ...env }
  for (const k of ['AVALARA_ACCOUNT_ID', 'AVALARA_LICENSE_KEY', 'AVALARA_BEARER_TOKEN']) {
    if (!(k in env)) delete cleanEnv[k]
  }
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: cleanEnv,
  })
  return JSON.parse(out.trim().split('\n').pop())
}

describe('tax-calculator policy constants', () => {
  test('discount and fallback rates are named, frozen constants', () => {
    const r = run(`console.log(JSON.stringify({
      d: m.TRIBAL_MEMBER_DISCOUNT_RATE,
      rates: m.FALLBACK_SALES_TAX_RATES,
      frozen: Object.isFrozen(m.FALLBACK_SALES_TAX_RATES),
      env: m.AVATAX_ENV_VARS,
    }))`)
    expect(r.d).toBe(0.2)
    expect(r.rates).toEqual({ state: 0.06, county: 0.015, city: 0.0075 })
    expect(r.frozen).toBe(true)
    expect(Object.values(r.env).every((k) => k.startsWith('AVALARA_'))).toBe(true)
  })

  test('source has no inline rate literals or hardcoded AvaTax credentials', () => {
    const src = require('node:fs').readFileSync(path.join(repoRoot, 'lib/tax-calculator.ts'), 'utf8')
    const body = src.slice(src.indexOf('export function isQualifiedOnReservationTribalTransaction'))
    expect(body).not.toMatch(/\b0\.(2|06|015|0075)\b/)
    expect(src).not.toMatch(/NEXT_PUBLIC_AVALARA/)
    expect(src).not.toMatch(/(licenseKey|bearerToken|accountId):\s*['"](?!AVALARA_)[^'"]+['"]/)
  })
})

describe('createAvaTaxTransaction credentials', () => {
  test('returns null (local fallback) when no credentials are in env', () => {
    const r = run(`console.log(JSON.stringify({ res: await m.createAvaTaxTransaction({}) }))`)
    expect(r.res).toBeNull()
  })
})

describe('calculateTribalTransactionTax (local fallback)', () => {
  test('non-member off reservation: no discount, full fallback tax', () => {
    const r = run(`console.log(JSON.stringify(await m.calculateTribalTransactionTax({
      customerId: 'c1', isTribalMember: false, shippingAddress: addr('Spokane', 'WA', '99201'), lines: [line(100)] })))`)
    expect(r.totalDiscount).toBe(0)
    expect(r.isTaxExempt).toBe(false)
    expect(r.totalTax).toBe(8.25)
    expect(r.totalAmount).toBe(108.25)
  })

  test('non-member at an on-reservation ZIP is not exempt (membership is required)', () => {
    const r = run(`console.log(JSON.stringify(await m.calculateTribalTransactionTax({
      customerId: 'c2', isTribalMember: false, shippingAddress: addr('Window Rock', 'AZ', '86515'), lines: [line(100)] })))`)
    expect(r.isTaxExempt).toBe(false)
    expect(r.entityUseCode).toBeUndefined()
    expect(r.totalDiscount).toBe(0)
  })

  test('member off reservation: discount applies but tax is not exempt', () => {
    const r = run(`console.log(JSON.stringify(await m.calculateTribalTransactionTax({
      customerId: 'c3', isTribalMember: true, shippingAddress: addr('Spokane', 'WA', '99201'), lines: [line(50, 2)] })))`)
    expect(r.subtotal).toBe(100)
    expect(r.totalDiscount).toBe(20)
    expect(r.taxableAmount).toBe(80)
    expect(r.isTaxExempt).toBe(false)
    expect(r.totalTax).toBe(6.6)
  })

  test('member on a self-administered reservation: state/local exempt, tribal tax remitted', () => {
    const r = run(`console.log(JSON.stringify(await m.calculateTribalTransactionTax({
      customerId: 'c4', isTribalMember: true, shippingAddress: addr('Window Rock', 'AZ', '86515'), lines: [line(200)] })))`)
    expect(r.entityUseCode).toBe('C')
    expect(r.isSelfAdministeredTribalTax).toBe(true)
    expect(r.taxableAmount).toBe(160)
    expect(r.tribalRemittance.applicable).toBe(true)
    expect(r.tribalRemittance.tribalTaxRate).toBe(0.06)
    expect(r.tribalRemittance.tribalTaxAmount).toBe(9.6)
    expect(r.totalAmount).toBe(169.6)
    expect(r.taxDetails.filter((d) => d.jurisdictionType !== 'Tribal').every((d) => d.exempt && d.tax === 0)).toBe(true)
  })

  test('member on a non-self-administered reservation: fully exempt, no remittance', () => {
    const r = run(`console.log(JSON.stringify(await m.calculateTribalTransactionTax({
      customerId: 'c5', isTribalMember: true, shippingAddress: addr('Toppenish', 'WA', '98948'), lines: [line(100)] })))`)
    expect(r.isTaxExempt).toBe(true)
    expect(r.isSelfAdministeredTribalTax).toBe(false)
    expect(r.totalTax).toBe(0)
    expect(r.tribalRemittance.applicable).toBe(false)
    expect(r.totalAmount).toBe(80)
  })

  test('empty cart yields zeros, not NaN', () => {
    const r = run(`console.log(JSON.stringify(await m.calculateTribalTransactionTax({
      customerId: 'c6', isTribalMember: true, shippingAddress: addr('Spokane', 'WA', '99201'), lines: [] })))`)
    expect(r.subtotal).toBe(0)
    expect(r.totalTax).toBe(0)
    expect(r.totalAmount).toBe(0)
  })
})

describe('isQualifiedOnReservationTribalTransaction geofencing edge cases', () => {
  test('without coordinates the address/ZIP engine decides; off-reservation ZIP does not qualify', () => {
    const r = run(`console.log(JSON.stringify({
      plain: m.isQualifiedOnReservationTribalTransaction({ isTribalMember: true, shippingAddress: addr('Sacaton', 'AZ', '85247') }),
      offRes: m.isQualifiedOnReservationTribalTransaction({ isTribalMember: true, shippingAddress: addr('New York', 'NY', '10005') }),
    }))`)
    expect(r.plain.qualified).toBe(true)
    expect(r.plain.tribalTaxRate).toBe(0.04)
    expect(r.offRes.qualified).toBe(false)
  })
})
