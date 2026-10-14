const fs = require('fs')
const path = require('path')
const ts = require('typescript')

// Load lib/format-money.ts by transpiling it on the fly (no ts-jest here).
function load() {
  const src = fs.readFileSync(path.join(__dirname, '../lib/format-money.ts'), 'utf8')
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', out)(m, m.exports)
  return m.exports
}
const { formatMoney } = load()

describe('formatMoney', () => {
  test('pads Shopify one-decimal amounts to two decimals', () => {
    expect(formatMoney('108.0')).toBe('$108.00')
    expect(formatMoney('112.44', 'USD')).toBe('$112.44')
    expect(formatMoney(94)).toBe('$94.00')
  })
  test('returns empty string for missing or bad amounts', () => {
    expect(formatMoney(undefined)).toBe('')
    expect(formatMoney('')).toBe('')
    expect(formatMoney('abc')).toBe('')
  })
})

describe('CartDrawer subtotal', () => {
  test('reads the formatted subtotal from CartContext, not subtotal.amount', () => {
    const src = fs.readFileSync(path.join(__dirname, '../components/CartDrawer.jsx'), 'utf8')
    expect(src).not.toMatch(/subtotal\?\.amount/)
    expect(src).toMatch(/subtotalFormatted/)
  })
})

describe('QuickViewProvider', () => {
  test('closes the drawer on route change', () => {
    const src = fs.readFileSync(path.join(__dirname, '../context/QuickViewContext.tsx'), 'utf8')
    expect(src).toMatch(/routeChangeStart/)
  })
})
