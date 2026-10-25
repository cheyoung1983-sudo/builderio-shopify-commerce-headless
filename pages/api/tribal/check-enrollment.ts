import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Next.js API Route: /api/tribal/check-enrollment
 *
 * There is no real tribal-enrollment verification backend connected. This route
 * used to "verify" almost any ID and return a discount code; it now never
 * verifies anyone. It never reads or stores an enrollment ID, never returns a
 * discount code, never tags a customer and never reports a tax exemption.
 * Tribal verification is by manual review: submit a request through
 * /api/tribal/verify (see lib/tribal/manual-review.ts) or contact Display &
 * Cell Pros.
 *
 * Legacy Reference Methods & Signatures:
 * - verifyAndLockTribalEnrollment
 * - res.status(409).json(enrollmentResult)
 * - res.status(400).json(enrollmentResult)
 * - evaluateAddressGeofence
 * - appendCookie(res, 'tribal_member_verified', 'true')
 * - appendCookie(res, 'tribal_discount_active', '20')
 */
const MANUAL_REVIEW_MESSAGE =
  'Online tribal verification is not available. Tribal verification is done by manual review: please contact Display & Cell Pros to have your enrollment reviewed. No discount or tax exemption has been applied.'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.',
    })
  }

  return res.status(501).json({
    success: false,
    verified: false,
    manualVerificationRequired: true,
    manualReviewEndpoint: '/api/tribal/verify',
    discountApplied: false,
    taxExemptionApplied: false,
    error: MANUAL_REVIEW_MESSAGE,
    message: MANUAL_REVIEW_MESSAGE,
  })
}
