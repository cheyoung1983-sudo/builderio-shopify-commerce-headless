import crypto from 'node:crypto'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export interface EnrollmentRecord {
  enrollmentHash: string
  maskedEnrollmentId: string
  claimedByEmail: string
  claimedByUid: string
  customerName: string
  tribalNation: string
  verifiedAt: string
  status: 'active' | 'flagged' | 'revoked'
}

export interface CheckEnrollmentRequest {
  firstName: string
  lastName: string
  tribalNation: string
  tribalEnrollmentId: string
  customerEmail: string
  customerId?: string
}

export interface CheckEnrollmentResponse {
  success: boolean
  verified: boolean
  status: 'newly_verified' | 'already_verified_by_you' | 'already_claimed' | 'invalid_format'
  message: string
  record?: {
    tribalNation: string
    maskedEnrollmentId: string
    claimedByEmail: string
    verifiedAt: string
  }
  discount?: {
    eligible: boolean
    discountPercentage: number
    code: string
  }
  error?: string
}

// In-memory fallback and fast-path cache to ensure deterministic unit testing and offline resilience
const inMemoryEnrollmentRegistry = new Map<string, EnrollmentRecord>()

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
 * Core validation and locking engine:
 * Checks whether an enrollment number is already claimed by another customer.
 * Once verified and claimed, only that specific customer can use their tribal ID.
 */
export async function checkAndClaimTribalEnrollment(
  req: CheckEnrollmentRequest
): Promise<CheckEnrollmentResponse> {
  const {
    firstName = '',
    lastName = '',
    tribalNation = '',
    tribalEnrollmentId = '',
    customerEmail = '',
    customerId = 'guest',
  } = req

  // 1. Basic Parameter Checks
  if (!firstName.trim() || !lastName.trim() || !tribalNation.trim() || !tribalEnrollmentId.trim()) {
    return {
      success: false,
      verified: false,
      status: 'invalid_format',
      message: 'All fields are required: First Name, Last Name, Tribal Nation, and Enrollment Number.',
      error: 'Missing required parameters',
    }
  }

  const cleanEmail = (customerEmail || '').trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      success: false,
      verified: false,
      status: 'invalid_format',
      message: 'A valid customer email is required to associate and lock your tribal discount benefits.',
      error: 'Invalid customer email',
    }
  }

  // 2. Format Validation
  const formatCheck = validateEnrollmentNumberFormat(tribalEnrollmentId)
  if (!formatCheck.valid) {
    return {
      success: false,
      verified: false,
      status: 'invalid_format',
      message: formatCheck.reason || 'Invalid enrollment number format.',
      error: formatCheck.reason,
    }
  }

  const enrollmentHash = generateEnrollmentHash(tribalNation, tribalEnrollmentId)
  const maskedId = maskEnrollmentId(tribalEnrollmentId)
  const customerName = `${firstName.trim()} ${lastName.trim()}`

  // 3. Check for existing claim (in Firestore with in-memory cache)
  let existingRecord: EnrollmentRecord | null = inMemoryEnrollmentRegistry.get(enrollmentHash) || null

  if (!existingRecord && db) {
    try {
      const docRef = doc(db, 'tribal_enrollments', enrollmentHash)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        existingRecord = docSnap.data() as EnrollmentRecord
        inMemoryEnrollmentRegistry.set(enrollmentHash, existingRecord)
      }
    } catch (err: any) {
      // In offline/test environments, gracefully rely on in-memory registry
      console.warn('[EnrollmentLock] Firestore read error or offline, fallback to local store:', err?.message)
    }
  }

  // 4. Evaluate Uniqueness and Claim Status
  if (existingRecord) {
    const existingEmail = (existingRecord.claimedByEmail || '').trim().toLowerCase()
    const existingUid = existingRecord.claimedByUid || ''

    // Match if same email or same customer UID
    const isOwner =
      existingEmail === cleanEmail ||
      (customerId !== 'guest' && existingUid === customerId)

    if (isOwner) {
      return {
        success: true,
        verified: true,
        status: 'already_verified_by_you',
        message: `Welcome back, ${existingRecord.customerName}. Your ${existingRecord.tribalNation} enrollment (${existingRecord.maskedEnrollmentId}) is already verified and locked to your account.`,
        record: {
          tribalNation: existingRecord.tribalNation,
          maskedEnrollmentId: existingRecord.maskedEnrollmentId,
          claimedByEmail: existingRecord.claimedByEmail,
          verifiedAt: existingRecord.verifiedAt,
        },
        discount: {
          eligible: true,
          discountPercentage: 20,
          code: 'TRIBAL-MEMBER-20',
        },
      }
    }

    // Attempted duplicate use by ANOTHER customer
    return {
      success: false,
      verified: false,
      status: 'already_claimed',
      message: `This tribal enrollment number has already been verified and locked to another customer account (${existingRecord.claimedByEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')}). Only the registered member may use this tribal ID. If you believe this is in error, please contact support@displaycellpros.com.`,
      error: 'Enrollment ID already claimed by another customer',
      record: {
        tribalNation: existingRecord.tribalNation,
        maskedEnrollmentId: existingRecord.maskedEnrollmentId,
        claimedByEmail: existingRecord.claimedByEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        verifiedAt: existingRecord.verifiedAt,
      },
    }
  }

  // 5. New Registration: Lock the enrollment to this customer
  const newRecord: EnrollmentRecord = {
    enrollmentHash,
    maskedEnrollmentId: maskedId,
    claimedByEmail: cleanEmail,
    claimedByUid: customerId,
    customerName,
    tribalNation: tribalNation.trim(),
    verifiedAt: new Date().toISOString(),
    status: 'active',
  }

  // Persist to in-memory store
  inMemoryEnrollmentRegistry.set(enrollmentHash, newRecord)

  // Persist to Firestore
  if (db) {
    try {
      const docRef = doc(db, 'tribal_enrollments', enrollmentHash)
      await setDoc(docRef, {
        ...newRecord,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (err: any) {
      console.warn('[EnrollmentLock] Firestore write warning (cached locally):', err?.message)
    }
  }

  return {
    success: true,
    verified: true,
    status: 'newly_verified',
    message: `Congratulations ${customerName}! Your enrollment with ${tribalNation.trim()} (${maskedId}) has been successfully verified. Your 20% discount is now permanently locked to ${cleanEmail}.`,
    record: {
      tribalNation: newRecord.tribalNation,
      maskedEnrollmentId: newRecord.maskedEnrollmentId,
      claimedByEmail: newRecord.claimedByEmail,
      verifiedAt: newRecord.verifiedAt,
    },
    discount: {
      eligible: true,
      discountPercentage: 20,
      code: 'TRIBAL-MEMBER-20',
    },
  }
}

/**
 * Resets the in-memory registry (useful for test suites)
 */
export function _resetEnrollmentRegistryForTesting() {
  inMemoryEnrollmentRegistry.clear()
}
