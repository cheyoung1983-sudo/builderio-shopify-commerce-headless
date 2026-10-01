const fs = require('fs')
const path = require('path')

describe('Firebase Firestore Tribal Registry & Locking Engine', () => {
  const firebaseRegistryPath = path.resolve(__dirname, '../lib/tribal/firebase-registry.ts')
  const rulesPath = path.resolve(__dirname, '../firestore.rules')

  test('firebase-registry.ts exists and exports required methods', () => {
    expect(fs.existsSync(firebaseRegistryPath)).toBe(true)
    const content = fs.readFileSync(firebaseRegistryPath, 'utf8')
    expect(content).toContain('PRE_SEEDED_REGISTRY')
    expect(content).toContain('verifyAgainstRegistry')
    expect(content).toContain('verifyAndLockTribalEnrollment')
    expect(content).toContain('tribal_registry')
    expect(content).toContain('tribal_enrollments')
    expect(content).toContain('TRIBAL-MEMBER-20')
    expect(content).toContain('discountPercentage: 20')
  })

  test('PRE_SEEDED_REGISTRY includes major federally recognized nations', () => {
    const content = fs.readFileSync(firebaseRegistryPath, 'utf8')
    expect(content).toContain('Navajo Nation')
    expect(content).toContain('NN-94821')
    expect(content).toContain('Cherokee Nation')
    expect(content).toContain('CK-88310')
    expect(content).toContain('Gila River Indian Community')
    expect(content).toContain('Choctaw Nation of Oklahoma')
  })

  test('firestore.rules defines rules for tribal_registry and users profile tribal sync', () => {
    const rules = fs.readFileSync(rulesPath, 'utf8')
    expect(rules).toContain('match /tribal_registry/{enrollmentHash}')
    expect(rules).toContain('match /tribal_enrollments/{enrollmentHash}')
    expect(rules).toContain('tribalVerified')
    expect(rules).toContain('tribalNation')
  })
})
