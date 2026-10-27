import type { NextApiRequest, NextApiResponse } from 'next'
import { createHmac, createHash } from 'crypto'
import { readRawBody } from '../../../lib/api/read-raw-body'
import { updateShopifyCustomerTribalStatus } from '../../../lib/tribal/shopify-admin'
import { isSlackConfigured, postReviewToSlack } from '../../../lib/tribal/manual-review'
import { db } from '../../../lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export const config = { api: { bodyParser: false } }

const WEBHOOK_SECRET = process.env.PERSONA_WEBHOOK_SECRET

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const signature = req.headers['persona-signature'] as string
  if (!signature || !WEBHOOK_SECRET) {
    return res.status(401).json({ success: false, error: 'Missing signature or webhook secret' })
  }

  const rawBody = await readRawBody(req)
  
  // Verification logic per Persona Integration Framework
  const pairs = signature.split(',')
  let timestamp = ''
  let signatureValue = ''
  
  pairs.forEach((pair) => {
    const [key, value] = pair.trim().split('=')
    if (key === 't') timestamp = value
    if (key === 'v1') signatureValue = value
  })

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`
  const computedDigest = createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload, 'utf8')
    .digest('hex')

  if (signatureValue !== computedDigest) {
    return res.status(401).json({ success: false, error: 'Invalid signature' })
  }

  // Verify timestamp tolerance (300 seconds)
  const currentTime = Math.floor(Date.now() / 1000)
  if (Math.abs(currentTime - parseInt(timestamp, 10)) > 300) {
    return res.status(401).json({ success: false, error: 'Timestamp out of tolerance' })
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
    return res.status(500).json({ success: false, error: err?.message })
  }
}
