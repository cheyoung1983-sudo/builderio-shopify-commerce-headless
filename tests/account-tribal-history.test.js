const fs = require('fs')
const path = require('path')

describe('Customer Account Tribal Discount Status & Validation History', () => {
  const cardPath = path.resolve(__dirname, '../components/account/TribalDiscountAccountCard.tsx')
  const pagePath = path.resolve(__dirname, '../pages/account/index.tsx')

  test('TribalDiscountAccountCard component exists and fetches from tribal_registry', () => {
    expect(fs.existsSync(cardPath)).toBe(true)
    const content = fs.readFileSync(cardPath, 'utf8')
    expect(content).toContain("collection(db, 'tribal_registry')")
    expect(content).toContain("where('claimedByUid', '==', userUid)")
    expect(content).toContain('20% Active Exemption')
    expect(content).toContain('Enrollment Number Validation History')
    expect(content).toContain('maskEnrollmentNumber')
  })

  test('pages/account/index.tsx includes TribalDiscountAccountCard', () => {
    expect(fs.existsSync(pagePath)).toBe(true)
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('TribalDiscountAccountCard')
  })
})
