const fs = require('fs')
const path = require('path')

describe('Direct Firestore TribalEligibilityChecker Component', () => {
  const componentPath = path.resolve(__dirname, '../components/TribalEligibilityChecker.tsx')

  test('components/TribalEligibilityChecker.tsx file exists', () => {
    expect(fs.existsSync(componentPath)).toBe(true)
  })

  test('uses Firebase Firestore client SDK functions for verification and locking', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain("import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'")
    expect(content).toContain("import { db, auth, signInWithGoogle } from '../lib/firebase'")
    expect(content).toContain("import { useAuth } from '../hooks/useAuth'")
    expect(content).toContain("'tribal_enrollments'")
    expect(content).toContain("'users'")
  })

  test('implements user-to-enrollment locking and duplicate prevention logic', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('existingClaim')
    expect(content).toContain('claimedByUid')
    expect(content).toContain('claimedByEmail')
    expect(content).toContain("'duplicate_blocked'")
    expect(content).toContain("'already_verified'")
    expect(content).toContain('support@displaycellpros.com')
  })

  test('provides Google Sign-In helper for authentic user binding', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('handleGoogleSignIn')
    expect(content).toContain('signInWithGoogle')
    expect(content).toContain('Sign in with Google')
  })

  test('includes rich visual feedback data-testid hooks and discount code', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('data-testid="tribal-eligibility-checker"')
    expect(content).toContain('data-testid="verification-success-alert"')
    expect(content).toContain('data-testid="verification-duplicate-blocked-alert"')
    expect(content).toContain('TRIBAL-MEMBER-20')
  })
})
