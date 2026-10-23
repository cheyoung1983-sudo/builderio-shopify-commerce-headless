import type { NextApiRequest, NextApiResponse } from 'next'
import { checkRateLimit } from '../../../lib/tribal/ratelimit.ts'
import type { TribalVerificationRequest } from '../../../lib/tribal/types.ts'
import {
  getAuthenticatedCustomerId,
  getClientIp,
  isReviewStoreAvailable,
  isSlackConfigured,
  isTribalVerifyEnabled,
  validateReviewInput,
  newReviewRecord,
  postReviewToSlack,
  saveReview,
} from '../../../lib/tribal/manual-review.ts'

/**
 * Next.js API Route: /api/tribal/verify
 *
 * There is no real tribal-enrollment verification backend connected (the
 * previous implementation accepted almost any ID and simulated success). Until
 * one exists, this route validates the request and then answers
 * 501 "manual verification required". When TRIBAL_VERIFY_ENABLED=true (default
 * off), the request is stored (Upstash) and posted to Slack for a human to
 * Approve/Deny (see /api/slack/tribal-interaction); the response is 202 pending.
 * This route itself never sets verification cookies,
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
      ![body.firstName, body.lastName, body.tribalNation, body.tribalEnrollmentId].every(
        (v) => typeof v === 'string' && v.trim().length > 0
      )
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: firstName, lastName, tribalNation, and tribalEnrollmentId are required.',
      })
    }

    const validation = validateReviewInput(body)
    if (!validation.ok) {
      return res.status(400).json({ success: false, error: validation.error })
    }
    const input = validation.value

    // Brute-force protection: per client IP (Vercel x-real-ip) and per email.
    // Never keyed on a client-supplied customerId.
    const clientIp = getClientIp(req.headers, req.socket?.remoteAddress)
    const ipLimit = await checkRateLimit(`ip_${clientIp}`, 10, 60)
    const emailLimit = input.email ? await checkRateLimit(`email_${input.email}`, 5, 60 * 60) : null
    const rateLimit = emailLimit && !emailLimit.success ? emailLimit : ipLimit

    res.setHeader('X-RateLimit-Limit', rateLimit.limit)
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining)
    res.setHeader('X-RateLimit-Reset', rateLimit.reset)

    if (!ipLimit.success || (emailLimit && !emailLimit.success)) {
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests. Rate limit exceeded for verification attempts. Please try again later.',
        reset: rateLimit.reset,
      })
    }

    if (isTribalVerifyEnabled() && isSlackConfigured()) {
      if (!isReviewStoreAvailable()) {
        console.error('Tribal verify: Redis not configured in production; refusing to store review request')
        return res.status(503).json({
          success: false,
          verified: false,
          error: 'Tribal verification is temporarily unavailable. Please try again later.',
        })
      }
      // customerId comes only from the signed-in Shopify customer session;
      // body.customerId is ignored. Guests are stored with no customerId.
      const customerId = await getAuthenticatedCustomerId(req.headers.cookie)
      const record = newReviewRecord({ ...input, customerId })
      await saveReview(record)
      const posted = await postReviewToSlack(record)
      if (posted) {
        return res.status(202).json({
          success: true,
          verified: false,
          pendingReview: true,
          reviewId: record.id,
          discountApplied: false,
          taxExemptionApplied: false,
          message: 'Thanks! Your tribal verification request was received and is pending manual review. No discount has been applied yet.',
        })
      }
      console.error('Tribal verify: failed to post review request to Slack')
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
