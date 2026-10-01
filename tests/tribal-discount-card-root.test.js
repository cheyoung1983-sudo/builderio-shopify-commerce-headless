const fs = require('fs')
const path = require('path')

describe('Root TribalDiscountCard Component Exists', () => {
  const rootCompPath = path.resolve(__dirname, '../components/TribalDiscountCard.tsx')

  test('components/TribalDiscountCard.tsx exists and re-exports TribalDiscountAccountCard', () => {
    expect(fs.existsSync(rootCompPath)).toBe(true)
    const content = fs.readFileSync(rootCompPath, 'utf8')
    expect(content).toContain('TribalDiscountCard')
    expect(content).toContain('./account/TribalDiscountAccountCard')
  })
})
