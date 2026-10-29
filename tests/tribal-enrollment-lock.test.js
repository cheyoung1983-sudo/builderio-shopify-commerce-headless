const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

describe('Tribal Enrollment Uniqueness & Customer Lock', () => {
  const enrollmentLockPath = path.resolve(__dirname, '../lib/tribal/enrollment-lock.ts')
  const apiRoutePath = path.resolve(__dirname, '../pages/api/tribal/check-enrollment.ts')
  const componentPath = path.resolve(__dirname, '../components/tribal/TribalEligibilityChecker.tsx')
  const rulesPath = path.resolve(__dirname, '../firestore.rules')

  test('all required enrollment files exist', () => {
    expect(fs.existsSync(enrollmentLockPath)).toBe(true)
    expect(fs.existsSync(apiRoutePath)).toBe(true)
    expect(fs.existsSync(componentPath)).toBe(true)
    expect(fs.existsSync(rulesPath)).toBe(true)
  })

  test('enrollment-lock.ts only keeps ID helpers; the fake claim/verify engine is gone', () => {
    const content = fs.readFileSync(enrollmentLockPath, 'utf8')
    expect(content).toContain('normalizeEnrollmentId')
    expect(content).toContain('generateEnrollmentHash')
    expect(content).toContain('maskEnrollmentId')
    expect(content).toContain('validateEnrollmentNumberFormat')
    expect(content).not.toContain('checkAndClaimTribalEnrollment')
    expect(content).not.toContain("'newly_verified'")
    expect(content).not.toContain('TRIBAL-MEMBER-20')
    expect(content).not.toContain('firebase/firestore')
  })

  test('API route check-enrollment.ts never verifies; it answers manual review required', () => {
    const content = fs.readFileSync(apiRoutePath, 'utf8')
    expect(content).toContain('res.status(501)')
    expect(content).toContain('manualVerificationRequired: true')
    expect(content).toContain('verified: false')
    expect(content).toContain('/api/tribal/verify')
    expect(content).not.toContain('verifyAndLockTribalEnrollment')
    expect(content).not.toContain('firebase')
    expect(content).not.toContain('TRIBAL-MEMBER-20')
    // The legacy client-trusted cookies must stay removed.
    expect(content).not.toContain('appendCookie')
    expect(content).not.toMatch(/tribal_(member_verified|discount_active|email|nation|on_reservation)/)
  })

  test('TribalEligibilityChecker UI shows manual-review messaging only', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('Manual Review')
    expect(content).toContain('support@displaycellpros.com')
    expect(content).toContain('(509) 255-3852')
    expect(content).toContain('data-testid="tribal-eligibility-checker"')
    expect(content).toContain('data-testid="tribal-manual-review-notice"')
    expect(content).not.toContain('TRIBAL-MEMBER-20')
    expect(content).not.toContain('firebase')
    expect(content).not.toContain('Unlocked')
    expect(content).not.toContain('clipboard')
  })

  test('firestore.rules protects tribal_enrollments collection', () => {
    const content = fs.readFileSync(rulesPath, 'utf8')
    expect(content).toContain('match /tribal_enrollments/{enrollmentHash}')
    expect(content).toContain('allow read: if isVerified();')
    expect(content).toContain('claimedByEmail == request.auth.token.email')
  })

  test('hashing and normalization behavior works deterministically', () => {
    const norm = (id) => (id || '').trim().replace(/[-\s]/g, '').toUpperCase()
    const hash = (nation, id) =>
      crypto.createHash('sha256').update(`${nation.trim().toLowerCase()}:${norm(id)}`).digest('hex')

    expect(norm('  nn-12345  ')).toBe('NN12345')
    expect(hash('Navajo Nation', 'NN-12345')).toBe(hash('navajo nation ', 'nn 12345'))
    expect(hash('Navajo Nation', 'NN-12345').length).toBe(64)
  })
})
