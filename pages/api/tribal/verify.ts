import type { NextApiRequest, NextApiResponse } from 'next'
import { checkRateLimit } from '../../../lib/tribal/ratelimit.ts'
import type { TribalVerificationRequest } from '../../../lib/tribal/types.ts'

/**
 * Next.js API Route: /api/tribal/verify
 *
 * There is no real tribal-enrollment verification backend connected (the
 * previous implementation accepted almost any ID and simulated success). Until
 * one exists, this route validates the request and then answers
 * 501 "manual verification required". It never sets verification cookies,
 * never tags or tax-exempts a Shopify customer, and never grants a discount.
 */
const MANUAL_VERIFICATION_MESSAGE =
  'Online tribal verification is not available yet. Please contact Display & Cell Pros for manual verification; no discount or tax exemption has been applied.'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.',
    })
  }

  try {
    const body: TribalVerificationRequest = req.body || {}

    if (
      !body.firstName?.trim() ||
      !body.lastName?.trim() ||
      !body.tribalNation?.trim() ||
      !body.tribalEnrollmentId?.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: firstName, lastName, tribalNation, and tribalEnrollmentId are required.',
      })
    }

    // Keep brute-force protection in place even though nothing is granted.
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1'
    const rateLimitKey = body.customerId && body.customerId !== 'guest' ? `cust_${body.customerId}` : clientIp
    const rateLimit = await checkRateLimit(rateLimitKey, 10, 60)

    res.setHeader('X-RateLimit-Limit', rateLimit.limit)
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining)
    res.setHeader('X-RateLimit-Reset', rateLimit.reset)

    if (!rateLimit.success) {
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests. Rate limit exceeded for verification attempts. Please try again later.',
        reset: rateLimit.reset,
      })
    }

    return res.status(501).json({
      success: false,
      verified: false,
      manualVerificationRequired: true,
      discountApplied: false,
      taxExemptionApplied: false,
      error: MANUAL_VERIFICATION_MESSAGE,
      message: MANUAL_VERIFICATION_MESSAGE,
    })
  } catch (err: any) {
    console.error('Error in /api/tribal/verify:', err?.message || err)
    return res.status(500).json({
      success: false,
      verified: false,
      error: 'An internal error occurred during tribal verification.',
    })
  }
}
