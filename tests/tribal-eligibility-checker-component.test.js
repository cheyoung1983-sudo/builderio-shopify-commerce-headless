const fs = require('fs')
const path = require('path')

describe('TribalEligibilityChecker Component (manual-review messaging)', () => {
  const componentPath = path.resolve(__dirname, '../components/tribal/TribalEligibilityChecker.tsx')
  const legacyPath = path.resolve(__dirname, '../components/TribalEligibilityChecker.tsx')

  test('components/tribal/TribalEligibilityChecker.tsx exists; the unused legacy Firestore copy is gone', () => {
    expect(fs.existsSync(componentPath)).toBe(true)
    expect(fs.existsSync(legacyPath)).toBe(false)
  })

  test('does not claim, lock or verify enrollment IDs client-side', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).not.toContain('firebase')
    expect(content).not.toContain('tribal_registry')
    expect(content).not.toContain('claimedByUid')
    expect(content).not.toContain('useAuth')
    expect(content).not.toContain('<input')
  })

  test('tells the customer verification is manual and nothing is applied until reviewed', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('verified by our team')
    expect(content).toContain('no discount or tax exemption')
    expect(content).toContain('tel:+15092553852')
  })
})
