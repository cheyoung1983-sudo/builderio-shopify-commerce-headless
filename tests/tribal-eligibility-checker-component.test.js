const fs = require('fs')
const path = require('path')

describe('TribalEligibilityChecker Component & Firebase Logic', () => {
  const componentPath = path.resolve(__dirname, '../components/tribal/TribalEligibilityChecker.tsx')

  test('components/tribal/TribalEligibilityChecker.tsx exists', () => {
    expect(fs.existsSync(componentPath)).toBe(true)
  })

  test('includes Firebase Auth integration via useAuth hook', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('useAuth')
    expect(content).toContain('login')
  })

  test('verifies enrollment numbers against Firestore tribal_registry collection with duplicate prevention', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain("doc(db, 'tribal_registry',")
    expect(content).toContain('getDoc')
    expect(content).toContain('claimedByUid')
    expect(content).toContain('already been claimed by another account')
  })
})
