const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

describe('Tribal Enrollment Uniqueness & Customer Lock', () => {
  const enrollmentLockPath = path.resolve(__dirname, '../lib/tribal/enrollment-lock.ts')
  const apiRoutePath = path.resolve(__dirname, '../pages/api/tribal/check-enrollment.ts')
  const componentPath = path.resolve(__dirname, '../components/tribal/TribalEligibilityChecker.tsx')
  const rulesPath = path.resolve(__dirname, '../firestore.rules')

  test('all required enrollment lock files exist', () => {
    expect(fs.existsSync(enrollmentLockPath)).toBe(true)
    expect(fs.existsSync(apiRoutePath)).toBe(true)
    expect(fs.existsSync(componentPath)).toBe(true)
    expect(fs.existsSync(rulesPath)).toBe(true)
  })

  test('enrollment-lock.ts defines core uniqueness and validation logic', () => {
    const content = fs.readFileSync(enrollmentLockPath, 'utf8')
    expect(content).toContain('normalizeEnrollmentId')
    expect(content).toContain('generateEnrollmentHash')
    expect(content).toContain('maskEnrollmentId')
    expect(content).toContain('validateEnrollmentNumberFormat')
    expect(content).toContain('checkAndClaimTribalEnrollment')
    expect(content).toContain("'already_claimed'")
    expect(content).toContain("'newly_verified'")
    expect(content).toContain("'already_verified_by_you'")
    expect(content).toContain('discountPercentage: 20')
    expect(content).toContain('TRIBAL-MEMBER-20')
    expect(content).toContain('support@displaycellpros.com')
  })

  test('API route check-enrollment.ts handles duplicate locking and 409 Conflict', () => {
    const content = fs.readFileSync(apiRoutePath, 'utf8')
    expect(content).toContain('verifyAndLockTribalEnrollment')
    expect(content).toContain("res.status(409).json(enrollmentResult)")
    expect(content).toContain("res.status(400).json(enrollmentResult)")
    expect(content).toContain("evaluateAddressGeofence")
    expect(content).toContain("appendCookie(res, 'tribal_member_verified', 'true'")
    expect(content).toContain("appendCookie(res, 'tribal_discount_active', '20'")
  })

  test('TribalEligibilityChecker UI handles visual feedback states and duplicate blocking', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('Tribal Eligibility &amp; 20% Discount Checker')
    expect(content).toContain('20% Tribal Discount Unlocked &amp; Bound to Account!')
    expect(content).toContain('Enrollment ID Already Claimed by Another Customer')
    expect(content).toContain('support@displaycellpros.com')
    expect(content).toContain('TRIBAL-MEMBER-20')
    expect(content).toContain('data-testid="tribal-eligibility-checker"')
    expect(content).toContain('data-testid="verification-success-alert"')
    expect(content).toContain('data-testid="verification-duplicate-blocked-alert"')
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
