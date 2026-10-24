const fs = require('fs')
const path = require('path')

describe('Firestore tribal rules (fake registry removed)', () => {
  const firebaseRegistryPath = path.resolve(__dirname, '../lib/tribal/firebase-registry.ts')
  const rulesPath = path.resolve(__dirname, '../firestore.rules')

  test('fake Firestore registry (pre-seeded IDs, any-ID acceptance) has been removed', () => {
    expect(fs.existsSync(firebaseRegistryPath)).toBe(false)
  })

  test('firestore.rules defines rules for tribal_registry and users profile tribal sync', () => {
    const rules = fs.readFileSync(rulesPath, 'utf8')
    expect(rules).toContain('match /tribal_registry/{enrollmentHash}')
    expect(rules).toContain('match /tribal_enrollments/{enrollmentHash}')
    expect(rules).toContain('tribalVerified')
    expect(rules).toContain('tribalNation')
  })
})
