const fs = require('fs')
const path = require('path')

describe('Customer Account Tribal Discount card (manual review)', () => {
  const cardPath = path.resolve(__dirname, '../components/account/TribalDiscountAccountCard.tsx')
  const pagePath = path.resolve(__dirname, '../pages/account/index.tsx')

  test('TribalDiscountAccountCard no longer reads Firestore or shows a verified badge or code', () => {
    expect(fs.existsSync(cardPath)).toBe(true)
    const content = fs.readFileSync(cardPath, 'utf8')
    expect(content).not.toContain('firebase')
    expect(content).not.toContain('tribal_registry')
    expect(content).not.toContain('20% Active Exemption')
    expect(content).not.toContain('TRIBAL-MEMBER-20')
    expect(content).toContain('Manual review')
  })

  test('pages/account/index.tsx includes TribalDiscountAccountCard', () => {
    expect(fs.existsSync(pagePath)).toBe(true)
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('TribalDiscountAccountCard')
  })
})
