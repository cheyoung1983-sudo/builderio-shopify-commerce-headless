import type { NextApiRequest, NextApiResponse } from 'next'
import { checkRateLimit } from '../../../lib/tribal/ratelimit.ts'
import type { TribalVerificationRequest } from '../../../lib/tribal/types.ts'
import {
  claimDuplicateKey,
  deleteReview,
  getAuthenticatedCustomerId,
  getClientIp,
  getReview,
  isReclaimable,
  isReviewStoreAvailable,
  isSlackConfigured,
  isTribalVerifyEnabled,
  newReviewRecord,
  postReviewToSlack,
  releaseDuplicateKey,
  saveReview,
  takeOverDuplicateKey,
  validateConsent,
  validateReviewInput,
} from '../../../lib/tribal/manual-review.ts'
import {
  enrollmentDuplicateKey,
  hashForRateLimit,
  isDuplicateSecretAvailable,
  nameTribeDuplicateKey,
} from '../../../lib/tribal/duplicate.ts'
import { createVerificationSession, isStripeIdentityEnabled } from '../../../lib/tribal/stripe-identity.ts'

/**
 * Next.js API Route: /api/tribal/verify
 *
 * There is no instant online enrollment lookup. Behavior by configuration:
 *  - TRIBAL_VERIFY_ENABLED off (default): validates, then answers 501 "manual
 *    verification required". Nothing is stored or posted.
 *  - TRIBAL_VERIFY_ENABLED on, STRIPE_IDENTITY_ENABLED not 'true': the request
 *    (name, tribe, optional enrollment number) is stored without the raw ID and
 *    posted to Slack for a human to Approve/Deny; response 202 pending.
 *  - Both on (and the customer did not choose manual review): a Stripe Identity
 *    VerificationSession is created server-side and only the hosted session URL
 *    is returned. ID images never touch our servers. The Stripe result arrives
 *    at /api/webhooks/stripe-identity and is posted to Slack; a human still
 *    decides in Slack.
 * In every case consent is required, duplicates are rejected, and this route
 * never sets verification cookies, never tags or tax-exempts a Shopify
 * customer, never grants a discount and never reports anyone as verified.
 */
const MANUAL_VERIFICATION_MESSAGE =
  'Online tribal verification is not available yet. Please contact Display & Cell Pros for manual verification; no discount or tax exemption has been applied.'
const DUPLICATE_MESSAGE =
  'We already have a verification request on file for this person. Please wait for our email, or contact Display & Cell Pros if you need help. No discount or tax exemption has been applied.'
const UNAVAILABLE_MESSAGE = 'Tribal verification is temporarily unavailable. Please try again later, or contact Display & Cell Pros for manual review.'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.',
    })
  }

  try {
    const body: TribalVerificationRequest & { consent?: unknown; consentVersion?: unknown; manualReview?: unknown } = req.body || {}

    const reviewPathEnabled = isTribalVerifyEnabled() && isSlackConfigured()
    // Stripe session only when both flags are on AND the customer did not pick manual review.
    const useStripe = reviewPathEnabled && isStripeIdentityEnabled() && body.manualReview !== true

    if (![body.firstName, body.lastName, body.tribalNation].every((v) => typeof v === 'string' && v.trim().length > 0)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: firstName, lastName and tribalNation are required.',
      })
    }
    if (!useStripe && !(typeof body.tribalEnrollmentId === 'string' && body.tribalEnrollmentId.trim().length > 0)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: firstName, lastName, tribalNation, and tribalEnrollmentId are required.',
      })
    }

    const validation = validateReviewInput(body, { requireEnrollmentId: !useStripe, requireEmail: useStripe })
    if (!validation.ok) {
      return res.status(400).json({ success: false, error: validation.error })
    }
    const consent = validateConsent(body)
    if (!consent.ok) {
      return res.status(400).json({ success: false, error: consent.error })
    }
    const input = validation.value
    const consentAt = new Date().toISOString()

    // Brute-force protection: per client IP (Vercel x-real-ip) and per email.
    // Keys are keyed hashes: raw IP/email never appear in Redis keys.
    // Never keyed on a client-supplied customerId.
    const clientIp = getClientIp(req.headers, req.socket?.remoteAddress)
    const ipLimit = await checkRateLimit(`ip_${hashForRateLimit(clientIp)}`, 10, 60)
    const emailLimit = input.email ? await checkRateLimit(`email_${hashForRateLimit(input.email)}`, 5, 60 * 60) : null
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

    if (reviewPathEnabled) {
      if (!isReviewStoreAvailable()) {
        console.error('Tribal verify: Redis not configured in production; refusing to store review request')
        return res.status(503).json({ success: false, verified: false, error: UNAVAILABLE_MESSAGE })
      }
      if (!isDuplicateSecretAvailable()) {
        console.error('Tribal verify: TRIBAL_DUPLICATE_HMAC_SECRET not configured in production; refusing (fail closed)')
        return res.status(503).json({ success: false, verified: false, error: UNAVAILABLE_MESSAGE })
      }

      // customerId comes only from the signed-in Shopify customer session;
      // body.customerId is ignored. Guests are stored with no customerId.
      const customerId = await getAuthenticatedCustomerId(req.headers.cookie)

      const dupKeys = [nameTribeDuplicateKey(input)]
      if (!useStripe && input.tribalEnrollmentId) dupKeys.push(enrollmentDuplicateKey(input.tribalNation, input.tribalEnrollmentId))
      const record = newReviewRecord(
        {
          ...input,
          tribalEnrollmentId: useStripe ? undefined : input.tribalEnrollmentId,
          customerId,
          source: useStripe ? 'stripe_identity' : 'manual',
          duplicateKeys: dupKeys,
        },
        { at: consentAt }
      )

      // Duplicate check (HMAC keys; nothing raw is stored). A duplicate creates no session and no Slack post.
      const claimed: string[] = []
      for (const key of dupKeys) {
        let claim = await claimDuplicateKey(key, record.id)
        if (!claim.claimed) {
          const existing = claim.existingId ? await getReview(claim.existingId) : null
          if (isReclaimable(existing) && (await takeOverDuplicateKey(key, claim.existingId, record.id))) claim = { claimed: true }
        }
        if (!claim.claimed) {
          for (const k of claimed) await releaseDuplicateKey(k, record.id)
          return res.status(409).json({
            success: false,
            verified: false,
            alreadySubmitted: true,
            discountApplied: false,
            taxExemptionApplied: false,
            error: DUPLICATE_MESSAGE,
            message: DUPLICATE_MESSAGE,
          })
        }
        claimed.push(key)
      }
      const releaseClaims = async () => {
        for (const k of claimed) await releaseDuplicateKey(k, record.id).catch(() => undefined)
        await deleteReview(record.id).catch(() => undefined)
      }

      try {
        if (useStripe) {
          let session
          try {
            session = await createVerificationSession(record.id)
          } catch (err: any) {
            // Log only the error name/type: never request data.
            console.error('Tribal verify: could not start Stripe Identity session:', err?.name || err?.type || 'error')
            await releaseClaims()
            return res.status(503).json({ success: false, verified: false, error: UNAVAILABLE_MESSAGE })
          }
          await saveReview({ ...record, stripeSessionId: session.id, stripeStatus: 'created' })
          return res.status(200).json({
            success: true,
            verified: false,
            pendingReview: true,
            requestId: record.id,
            reviewId: record.id,
            verificationUrl: session.url,
            discountApplied: false,
            taxExemptionApplied: false,
            message: 'Continue on Stripe to submit your ID photos and selfie. A member of our team reviews every request; no discount has been applied yet.',
          })
        }

        await saveReview(record)
        const posted = await postReviewToSlack(record)
        if (posted) {
          return res.status(202).json({
            success: true,
            verified: false,
            pendingReview: true,
            requestId: record.id,
            reviewId: record.id,
            discountApplied: false,
            taxExemptionApplied: false,
            message: 'Thanks! Your tribal verification request was received and is pending manual review. No discount has been applied yet.',
          })
        }
        console.error('Tribal verify: failed to post review request to Slack')
        await releaseClaims()
      } catch (err) {
        await releaseClaims()
        throw err
      }
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
    // Only the message of unexpected errors is logged; request bodies never are.
    console.error('Error in /api/tribal/verify:', err?.message || err)
    return res.status(500).json({
      success: false,
      verified: false,
      error: 'An internal error occurred during tribal verification.',
    })
  }
}
