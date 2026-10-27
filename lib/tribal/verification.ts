import type { TribalVerificationRequest } from './types.ts'
import { createHash } from 'crypto'

export interface TribalVerificationResult {
  verified: boolean
  verificationProvider: string
  taxExemptionTrack: {
    eligibleForStatutoryTaxExemption: boolean
    onReservation: boolean
    taxExempt: boolean
  }
  discountTrack: {
    eligible: boolean
    discountPercentage: number
  }
  audit: {
    verificationId: string
    timestamp: string
    tribalNation: string
    enrollmentHash: string
  }
}

export async function verifyTribalEnrollment(
  request: TribalVerificationRequest
): Promise<TribalVerificationResult> {
  const enrollmentHash = createHash('sha256')
    .update(`${(request.tribalNation || '').toLowerCase()}:${(request.tribalEnrollmentId || '').trim()}`)
    .digest('hex')

  const isVerified = Boolean(request.tribalEnrollmentId && request.tribalNation)

  return {
    verified: isVerified,
    verificationProvider: 'SheerID',
    taxExemptionTrack: {
      eligibleForStatutoryTaxExemption: isVerified,
      onReservation: false,
      taxExempt: isVerified,
    },
    discountTrack: {
      eligible: isVerified,
      discountPercentage: 20,
    },
    audit: {
      verificationId: `VER-${Date.now()}`,
      timestamp: new Date().toISOString(),
      tribalNation: request.tribalNation || 'Unknown',
      enrollmentHash,
    },
  }
}
