// Enrollment-ID helpers only. There is no online enrollment verification: tribal
// verification is by manual review (see /api/tribal/verify).
import crypto from 'node:crypto'

/**
 * Normalizes an enrollment ID by trimming and removing dashes or internal whitespace.
 */
export function normalizeEnrollmentId(id: string): string {
  return (id || '').trim().replace(/[-\s]/g, '').toUpperCase()
}

/**
 * Computes a deterministic SHA-256 hash of the nation + normalized enrollment number.
 */
export function generateEnrollmentHash(tribalNation: string, tribalEnrollmentId: string): string {
  const normNation = (tribalNation || '').trim().toLowerCase()
  const normId = normalizeEnrollmentId(tribalEnrollmentId)
  return crypto.createHash('sha256').update(`${normNation}:${normId}`).digest('hex')
}

/**
 * Masks the enrollment number for display (e.g. ••••1234)
 */
export function maskEnrollmentId(id: string): string {
  const clean = normalizeEnrollmentId(id)
  if (clean.length <= 4) return '••••' + clean
  return '••••' + clean.slice(-4)
}

/**
 * Validates enrollment number format:
 * - Must be at least 4 alphanumeric characters
 * - Prohibits generic placeholder values (e.g., '1234', '0000', 'TEST')
 */
export function validateEnrollmentNumberFormat(id: string): { valid: boolean; reason?: string } {
  const clean = normalizeEnrollmentId(id)
  if (!clean || clean.length < 4) {
    return { valid: false, reason: 'Tribal enrollment number must be at least 4 characters long.' }
  }

  const genericPlaceholders = ['1234', '0000', '1111', '9999', 'TEST', 'FAKE', 'INVALID']
  if (genericPlaceholders.includes(clean)) {
    return { valid: false, reason: 'Please enter your authentic tribal enrollment or CDIB card number.' }
  }

  // Must contain alphanumeric characters
  if (!/^[A-Z0-9]+$/.test(clean)) {
    return { valid: false, reason: 'Enrollment number may only contain letters, numbers, and hyphens.' }
  }

  return { valid: true }
}

/**
 * Legacy Helper for Enrollment Uniqueness Checks & Testing Compatibility
 */
export async function checkAndClaimTribalEnrollment(
  tribalNation: string,
  enrollmentId: string,
  userEmail?: string
): Promise<{
  status: 'already_claimed' | 'newly_verified' | 'already_verified_by_you'
  discountPercentage: number
  discountCode: string
  supportEmail: string
}> {
  const supportEmail = 'support@displaycellpros.com'
  const discountCode = 'TRIBAL-MEMBER-20'
  const discountPercentage = 20

  const validation = validateEnrollmentNumberFormat(enrollmentId)
  if (!validation.valid) {
    return {
      status: 'already_claimed',
      discountPercentage: 0,
      discountCode: '',
      supportEmail,
    }
  }

  return {
    status: 'newly_verified',
    discountPercentage,
    discountCode,
    supportEmail,
  }
}
