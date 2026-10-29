import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'
import { verifyPersonaSignature } from '../../../lib/webhooks/persona-signature'
import { readRawBody } from '../../../lib/api/read-raw-body'
import { updateShopifyCustomerTribalStatus } from '../../../lib/tribal/shopify-admin'
import { isSlackConfigured, postReviewToSlack } from '../../../lib/tribal/manual-review'
import { db } from '../../../lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export const config = { api: { bodyParser: false } }

const WEBHOOK_SECRET = process.env.PERSONA_WEBHOOK_SECRET

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const rawBody = await readRawBody(req)

  // Constant-time HMAC check over `${t}.${rawBody}` with a 300s replay window. A missing or
  // non-numeric `t` is rejected (previously NaN slipped past the tolerance check).
  const check = verifyPersonaSignature({
    secret: WEBHOOK_SECRET,
    header: req.headers['persona-signature'],
    rawBody,
  })
  if (!check.ok) {
    const status = check.reason === 'missing_secret' ? 503 : 401
    return res.status(status).json({ success: false, error: 'Invalid or missing webhook signature' })
  }

  try {
    const payload = JSON.parse(rawBody.toString('utf8'))
    const eventType = payload.event || payload.type || ''
    const inquiryData = payload.data || payload.payload?.inquiry || {}
    const inquiryId = inquiryData.id || ''
    const attributes = inquiryData.attributes || {}
    const fields = attributes.fields || {}

    // Process on inquiry.completed or inquiry.approved
    if (
      eventType === 'inquiry.completed' ||
      eventType === 'inquiry.approved' ||
      eventType === 'verification.passed' ||
      attributes.status === 'approved' ||
      attributes.status === 'completed'
    ) {
      const referenceId = attributes['reference-id'] || attributes.reference_id || ''
      const tribalNation =
        fields['tribal-nation']?.value ||
        fields['tribal-affiliation']?.value ||
        fields.tribalNation ||
        'Federally Recognized Tribe'
      const rawEnrollment =
        fields['enrollment-number']?.value ||
        fields['id-number']?.value ||
        fields.enrollmentId ||
        ''
      const maskedEnrollment = rawEnrollment.length >= 4 ? `***${rawEnrollment.slice(-4)}` : '****'

      // Cryptographic hash of enrollment number (Rule 4.4: Never log or store raw ID)
      const enrollmentHash = rawEnrollment
        ? createHash('sha256').update(rawEnrollment.trim().toLowerCase(), 'utf8').digest('hex')
        : createHash('sha256').update(`${referenceId}:${inquiryId}`, 'utf8').digest('hex')

      // 1. Update Shopify Customer if customer ID was bound to the inquiry
      if (referenceId && referenceId !== 'guest') {
        try {
          await updateShopifyCustomerTribalStatus({
            customerId: referenceId,
            tagsToAdd: ['tribal-member-verified'],
            taxExempt: false, // Stays off until delivery address is confirmed on-reservation
            audit: {
              verificationHash: enrollmentHash,
              verifiedAt: new Date().toISOString(),
              tribalNation,
              maskedEnrollmentId: maskedEnrollment,
              certificateRef: `Persona Inquiry: ${inquiryId}`,
            },
          })
        } catch (shopifyErr: any) {
          console.warn('[Persona Webhook] Shopify customer update warning:', shopifyErr?.message)
        }
      }

      // 2. Persist audit verification in Firestore if connected
      if (db && referenceId) {
        try {
          const auditRef = doc(db, 'tribal_verifications', referenceId)
          await setDoc(
            auditRef,
            {
              inquiryId,
              referenceId,
              tribalNation,
              maskedEnrollmentId: maskedEnrollment,
              verificationHash: enrollmentHash,
              verifiedAt: new Date().toISOString(),
              status: 'verified',
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        } catch (firestoreErr: any) {
          console.warn('[Persona Webhook] Firestore audit log warning:', firestoreErr?.message)
        }
      }

      // 3. Post to Slack if configured
      if (isSlackConfigured()) {
        try {
          await postReviewToSlack({
            id: inquiryId,
            customerName: `${fields['name-first']?.value || ''} ${fields['name-last']?.value || ''}`.trim() || 'Verified Member',
            customerEmail: fields['email-address']?.value || '',
            customerId: referenceId,
            tribalNation,
            maskedEnrollmentId: maskedEnrollment,
            status: 'approved',
            createdAt: new Date().toISOString(),
          } as any)
        } catch (slackErr: any) {
          console.warn('[Persona Webhook] Slack notification warning:', slackErr?.message)
        }
      }
    }

    return res.status(200).json({ success: true, processed: true })
  } catch (err: any) {
    console.error('[Persona Webhook] Processing error:', err?.message)
    if (err instanceof SyntaxError) {
      return res.status(400).json({ success: false, error: 'Invalid JSON payload' })
    }
    return res.status(500).json({ success: false, error: 'Webhook processing failed' })
  }
}
