const { execFileSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..')
const extDir = path.join(repoRoot, 'extensions/tribal-discount')

function run(input) {
  const url = pathToFileURL(path.join(extDir, 'src/run.ts')).href
  const script = `
    const { cartLinesDiscountsGenerateRun } = await import(${JSON.stringify(url)})
    console.log(JSON.stringify(cartLinesDiscountsGenerateRun(${JSON.stringify(input)})))
  `
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  return JSON.parse(out.trim())
}

const line = (id, product, amount = '100.00') => ({
  id,
  quantity: 1,
  cost: { amountPerQuantity: { amount } },
  merchandise: { __typename: 'ProductVariant', id: `gid://shopify/ProductVariant/${id}`, product },
})

const input = (lines, { tribal = true, classes = ['PRODUCT'], config } = {}) => ({
  cart: { buyerIdentity: { customer: { isTribalMember: tribal } }, lines },
  discount: { discountClasses: classes, metafield: config ? { jsonValue: config } : null },
})

const screen = { tribalEligible: true }
const tripFee = { tribalEligible: true, excluded: true }
const batteryAddon = { excluded: true }

function candidates(result) {
  return result.operations.flatMap((op) => op.productDiscountsAdd.candidates)
}

describe('Tribal discount Shopify Function extension', () => {
  test('is a real Function extension (toml, input query, hasAnyTag)', () => {
    const toml = fs.readFileSync(path.join(extDir, 'shopify.extension.toml'), 'utf8')
    expect(toml).toContain('type = "function"')
    expect(toml).toContain('cart.lines.discounts.generate.run')
    expect(toml).toContain('api_version = "2026-10"')
    const gql = fs.readFileSync(path.join(extDir, 'src/run.graphql'), 'utf8')
    expect(gql).toContain('hasAnyTag(tags: ["tribal-member-verified", "Tribal_Verified"])')
    expect(gql).toContain('discountClasses')
    expect(fs.existsSync(path.join(repoRoot, 'blocks/tribal-discount-function.ts'))).toBe(false)
  })

  test('no discount for customers without the tribal tag', () => {
    expect(run(input([line('1', screen)], { tribal: false }))).toEqual({ operations: [] })
  })

  test('no discount when the discount is not a PRODUCT class discount', () => {
    expect(run(input([line('1', screen)], { classes: ['ORDER'] }))).toEqual({ operations: [] })
  })

  test('20% on tribal-eligible repair lines only; trip fee and battery add-on excluded', () => {
    const result = run(input([line('1', screen), line('2', tripFee, '25.00'), line('3', batteryAddon), line('4', {})]))
    const c = candidates(result)
    expect(c).toHaveLength(1)
    expect(c[0].value).toEqual({ percentage: { value: 20 } })
    expect(c[0].targets).toEqual([{ cartLine: { id: '1' } }])
    expect(result.operations[0].productDiscountsAdd.selectionStrategy).toBe('ALL')
  })

  test('bundle: 20% of the non-battery component amount, per item', () => {
    const bundle = { tribalEligible: true, isBundle: true, bundleEligibleAmount: { value: '180.00' } }
    const c = candidates(run(input([line('b', bundle, '242.31')])))
    expect(c).toHaveLength(1)
    expect(c[0].value).toEqual({ fixedAmount: { amount: '36.00', appliesToEachItem: true } })
  })

  test('bundle without dcp.tribal_eligible_amount gets no discount', () => {
    const bundle = { tribalEligible: true, isBundle: true, bundleEligibleAmount: null }
    expect(run(input([line('b', bundle)]))).toEqual({ operations: [] })
  })

  test('mail-in: bundles only by default (PENDING RYAN), configurable via metafield', () => {
    const mailInScreen = { tribalEligible: true, isMailIn: true }
    const mailInBundle = { tribalEligible: true, isMailIn: true, isBundle: true, bundleEligibleAmount: { value: '100' } }
    const def = candidates(run(input([line('1', mailInScreen), line('2', mailInBundle)])))
    expect(def.map((c) => c.targets[0].cartLine.id)).toEqual(['2'])
    const off = candidates(run(input([line('1', mailInScreen), line('2', mailInBundle)], { config: { mailInBundlesOnly: false } })))
    expect(off.map((c) => c.targets[0].cartLine.id).sort()).toEqual(['1', '2'])
  })

  test('first real bundle: iPhone 16 OLED + battery $227, eligible 147 -> $29.40 off', () => {
    const bundle = { tribalEligible: true, isBundle: true, bundleEligibleAmount: { value: '147' } }
    const c = candidates(run(input([line('ip16', bundle, '227.00')])))
    expect(c).toHaveLength(1)
    expect(c[0].value).toEqual({ fixedAmount: { amount: '29.40', appliesToEachItem: true } })
  })

  test('bundle with empty dcp.tribal_eligible_amount ("pending price") gets no discount', () => {
    for (const value of ['', '0', 'abc']) {
      const bundle = { tribalEligible: true, isBundle: true, bundleEligibleAmount: { value } }
      expect(run(input([line('b', bundle, '227.00')]))).toEqual({ operations: [] })
    }
  })

  test('battery-only repair: excluded by default (batteryOnlyInShop false, PENDING RYAN)', () => {
    const battery = { isBatteryRepair: true, tribalEligible: true }
    expect(run(input([line('bat', battery, '89.00')]))).toEqual({ operations: [] })
  })

  test('battery-only repair: 20% in-shop when batteryOnlyInShop is true; mail-in battery-only never', () => {
    const inShop = { isBatteryRepair: true }
    const mailIn = { isBatteryRepair: true, isMailIn: true, tribalEligible: true }
    const cfg = { config: { batteryOnlyInShop: true, mailInBundlesOnly: false } }
    const c = candidates(run(input([line('shop', inShop), line('mail', mailIn)], cfg)))
    expect(c).toHaveLength(1)
    expect(c[0].value).toEqual({ percentage: { value: 20 } })
    expect(c[0].targets).toEqual([{ cartLine: { id: 'shop' } }])
  })

  test('battery add-on stays excluded even with batteryOnlyInShop', () => {
    const addon = { isBatteryRepair: true, excluded: true }
    expect(run(input([line('a', addon)], { config: { batteryOnlyInShop: true } }))).toEqual({ operations: [] })
  })

  test('mail-in estimator keeps "Quoted at intake" for screen-only / battery-only (no hardcoded prices)', () => {
    const src = fs.readFileSync(path.join(repoRoot, 'components/services/MailInRepairEstimator.tsx'), 'utf8')
    expect(src).toContain('Quoted at intake')
    expect(src).not.toMatch(/49\.99|39\.99/)
  })
})
