import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAndLockTribalEnrollment } from '../../../lib/tribal/firebase-registry'
import { evaluateAddressGeofence } from '../../../lib/tribal/geofencing'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.',
    })
  }

  try {
    const {
      firstName,
      lastName,
      tribalNation,
      tribalEnrollmentId,
      customerEmail,
      customerId = 'guest',
      shippingAddress,
    } = req.body || {}

    // 1. Evaluate enrollment against Firestore master registry and enforce one-customer lock
    const enrollmentResult = await verifyAndLockTribalEnrollment({
      firstName,
      lastName,
      tribalNation,
      tribalEnrollmentId,
      userEmail: customerEmail,
      userUid: customerId,
    })

    // If duplicate attempt by another user, return 409 Conflict
    if (enrollmentResult.status === 'already_claimed') {
      return res.status(409).json(enrollmentResult)
    }

    // If invalid format or not found, return 400 Bad Request
    if (enrollmentResult.status === 'invalid_format' || enrollmentResult.status === 'not_found_in_registry') {
      return res.status(400).json(enrollmentResult)
    }

    // 2. Evaluate delivery address for statutory tax exemption if provided
    let taxExemptionTrack = {
      eligible: false,
      taxExempt: false,
      onReservation: false,
      reservationName: undefined as string | undefined,
      message: 'Provide a shipping address to evaluate statutory sales tax exemption.',
    }

    if (shippingAddress) {
      const geofence = evaluateAddressGeofence(shippingAddress)
      taxExemptionTrack = {
        eligible: geofence.onReservation,
        taxExempt: geofence.onReservation,
        onReservation: geofence.onReservation,
        reservationName: geofence.reservationName,
        message: geofence.message,
      }
    }

    return res.status(200).json({
      ...enrollmentResult,
      taxExemptionTrack,
    })
  } catch (err: any) {
    console.error('Error in /api/tribal/check-enrollment:', err)
    return res.status(500).json({
      success: false,
      verified: false,
      error: 'Internal server error evaluating tribal eligibility.',
      details: err?.message || 'Unknown error',
    })
  }
}
