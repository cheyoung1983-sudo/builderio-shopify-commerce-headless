import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyTribalEnrollment } from '../../../lib/tribal/verification.ts'
import { updateShopifyCustomerTribalStatus, CUSTOMER_UPDATE_MUTATION } from '../../../lib/tribal/shopify-admin.ts'
import { appendCookie, isHttpsRequest } from '../../../lib/shopify/customer-account/cookies.ts'
import { checkRateLimit } from '../../../lib/tribal/ratelimit.ts'
import { traceSentryOperation } from '../../../lib/tribal/sentry-monitor.ts'
import type { TribalVerificationRequest } from '../../../lib/tribal/types.ts'

/**
 * Next.js API Route: /api/tribal/verify
 * 
 * Handles POST requests to verify tribal enrollment and customer eligibility:
 * 0. Rate limiting middleware using Upstash Redis with in-memory fallback
 * 0.5. Sentry performance monitoring & latency tracking for external API calls
 * 1. Validates request body (firstName, lastName, tribalNation, tribalEnrollmentId)
 * 2. Processes mock verification against tribal registries (SheerID / ID.me / BIA Registry)
 * 3. Applies dual-track rules (Commercial Discount vs Statutory Tax Exemption)
 * 4. Executes Shopify Admin GraphQL `customerUpdate` mutation to assign the 'tribal-member-verified' tag
 * 5. Returns verification payload with audit trail and status details
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.',
    })
  }

  try {
    const body: TribalVerificationRequest = req.body || {}

    // Input Validation
    if (!body.firstName?.trim() || !body.lastName?.trim() || !body.tribalNation?.trim() || !body.tribalEnrollmentId?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: firstName, lastName, tribalNation, and tribalEnrollmentId are required.',
      })
    }

    // Rate Limiting Protection against brute-force attacks
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

    // 1. Mock Tribal Enrollment Verification Step (Tracked with Sentry Performance Monitoring)
    const verification = await traceSentryOperation(
      'tribal.external_verification',
      'External Tribal Registry & Enrollment Verification',
      async () => {
        return verifyTribalEnrollment({
          ...body,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          tribalNation: body.tribalNation.trim(),
          tribalEnrollmentId: body.tribalEnrollmentId.trim(),
        })
      }
    )

    // If verification rejected or invalid
    if (!verification.verified) {
      return res.status(422).json({
        success: false,
        verified: false,
        message: 'Tribal enrollment verification was unsuccessful. Please verify your enrollment number and tribal nation.',
        result: verification,
      })
    }

    // 2. Execute Shopify GraphQL customerUpdate mutation to add 'tribal-member-verified' tag (Tracked with Sentry)
    let shopifySyncResult = null
    const targetCustomerId = body.customerId || 'guest'

    if (targetCustomerId && targetCustomerId !== 'guest') {
      shopifySyncResult = await traceSentryOperation(
        'shopify.admin_graphql_mutation',
        'Shopify Admin GraphQL Customer Update & Metafield Sync',
        async () => {
          return updateShopifyCustomerTribalStatus({
            customerId: targetCustomerId,
            tagsToAdd: ['tribal-member-verified'],
            taxExempt: verification.taxExemptionTrack.taxExempt,
            taxExemptions: verification.taxExemptionTrack.taxExempt
              ? ['EXEMPT_INDIAN_IN_CANADA_OR_USA']
              : [],
            audit: verification.audit,
          })
        }
      )
    } else {
      // For guest checkout sessions or pre-login verification
      shopifySyncResult = {
        success: true,
        isGuest: true,
        tagsAssigned: ['tribal-member-verified'],
        mutationUsed: CUSTOMER_UPDATE_MUTATION.trim(),
        message: 'Guest verified; tag "tribal-member-verified" ready to attach upon account creation or checkout customer resolution.',
      }
    }

    // Set secure cookies for cross-tab consistency (onReservation status and verified state)
    const secure = isHttpsRequest(req)
    const onReservation = Boolean(verification.taxExemptionTrack.onReservation)
    appendCookie(res, 'tribal_member_verified', 'true', { maxAge: 60 * 60 * 24 * 30, secure })
    appendCookie(res, 'tribal_on_reservation', onReservation ? 'true' : 'false', { maxAge: 60 * 60 * 24 * 30, secure })
    if (verification.audit?.tribalNation) {
      appendCookie(res, 'tribal_nation', verification.audit.tribalNation, { maxAge: 60 * 60 * 24 * 30, secure })
    }

    return res.status(200).json({
      success: true,
      verified: true,
      shopifySync: shopifySyncResult,
      result: verification,
    })
  } catch (err: any) {
    console.error('Error in /api/tribal/verify:', err)
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during tribal verification.',
      details: err?.message || 'Unknown error',
    })
  }
}
