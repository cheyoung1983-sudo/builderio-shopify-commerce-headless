const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..')

function load() {
  const url = pathToFileURL(path.join(repoRoot, 'lib/pricing/mail-in-v4.ts')).href
  const script = `const m = await import(${JSON.stringify(url)});
    console.log(JSON.stringify({ a: m.v4RetailPrice(100), b: m.v4RetailPrice(10.01), add: m.v4BatteryAddonPrice(20), bundles: m.MAIL_IN_V4_BUNDLES }))`
  return JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', script], { cwd: repoRoot, encoding: 'utf8' }).trim())
}

describe('Mail-in V4 pricing', () => {
  const r = load()
  test('V4 formula ceil(part x 1.8 + 75) and battery add-on = V4 battery - 25', () => {
    expect(r.a).toBe(255)
    expect(r.b).toBe(94)
    expect(r.add).toBe(86)
  })
  test('bundle retail constants', () => {
    const m = Object.fromEntries(r.bundles.map((d) => [d.id, d.bundleRetail]))
    expect(m).toEqual({ 'iphone-12': 215, 'iphone-13': 242.31, 'iphone-14': 281.6, 'galaxy-s21': 252.8, 'galaxy-s22': 288.8 })
  })
  test('estimator ships retail constants only (no wholesale cost)', () => {
    const src = fs.readFileSync(path.join(repoRoot, 'components/services/MailInRepairEstimator.tsx'), 'utf8')
    expect(src).not.toMatch(/partCost|laborCost|part_cost|v4RetailPrice|v4BatteryAddonPrice/)
    expect(src).toContain('Pricing Sheet V4')
    expect(src).toContain('MAIL_IN_V4_BUNDLES')
    const lib = fs.readFileSync(path.join(repoRoot, 'lib/pricing/mail-in-v4.ts'), 'utf8')
    const consts = lib.slice(lib.indexOf('export const MAIL_IN_V4_BUNDLES'))
    expect(consts).not.toMatch(/cost/i)
  })
})
