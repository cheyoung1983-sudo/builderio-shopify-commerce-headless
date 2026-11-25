const fs = require('fs')
const path = require('path')
const {
  isMailInDiagnosticKit,
  MAIL_IN_DIAGNOSTIC_KIT_HANDLE,
  MAIL_IN_DIAGNOSTIC_KIT_SKU,
  MAIL_IN_KIT_FALLBACK_IMAGE,
  MAIL_IN_KIT_TURNAROUND_NOTICE,
} = require('../lib/products/mail-in-kit')

describe('Mail-In Diagnostic Kit product page', () => {
  const detailPath = path.resolve(__dirname, '../components/products/ProductDetail.tsx')
  const helperPath = path.resolve(__dirname, '../lib/products/mail-in-kit.ts')

  test('helper recognizes the kit by handle or SKU and rejects other products', () => {
    expect(isMailInDiagnosticKit({ handle: MAIL_IN_DIAGNOSTIC_KIT_HANDLE })).toBe(true)
    expect(
      isMailInDiagnosticKit({
        handle: 'other-product',
        variants: { edges: [{ node: { sku: MAIL_IN_DIAGNOSTIC_KIT_SKU } }] },
      })
    ).toBe(true)
    expect(isMailInDiagnosticKit({ handle: 'oled-screen-replacement-for-iphone-16' })).toBe(false)
    expect(isMailInDiagnosticKit(null)).toBe(false)
  })

  test('kit turnaround notice is mail-in copy, not on-site installation labor', () => {
    expect(MAIL_IN_KIT_TURNAROUND_NOTICE).toMatch(/24–48 hours/)
    expect(MAIL_IN_KIT_TURNAROUND_NOTICE).toMatch(/\$40 diagnostic fee/)
    expect(MAIL_IN_KIT_TURNAROUND_NOTICE).not.toMatch(/professional installation labor/)
    expect(MAIL_IN_KIT_TURNAROUND_NOTICE).not.toMatch(/45–60 minutes/)
    expect(MAIL_IN_KIT_FALLBACK_IMAGE).toBe('/assets/logo-new.png')
    expect(fs.existsSync(path.resolve(__dirname, '../public/assets/logo-new.png'))).toBe(true)
  })

  test('ProductDetail uses the helper and does not hard-code installation labor for the kit', () => {
    const content = fs.readFileSync(detailPath, 'utf8')
    const helper = fs.readFileSync(helperPath, 'utf8')
    expect(content).toContain("from '../../lib/products/mail-in-kit'")
    expect(content).toContain('isMailInDiagnosticKit')
    expect(content).toContain('MAIL_IN_KIT_TURNAROUND_NOTICE')
    expect(content).toContain('MAIL_IN_KIT_FALLBACK_IMAGE')
    expect(helper).toContain('MAIL_IN_DIAGNOSTIC_KIT_HANDLE')
    // The on-site template remains for other products, gated behind !isMailInKit
    expect(content).toMatch(/!isMailInKit[\s\S]*professional installation labor|isMailInKit \?[\s\S]*MAIL_IN_KIT_TURNAROUND_NOTICE/)
  })
})
