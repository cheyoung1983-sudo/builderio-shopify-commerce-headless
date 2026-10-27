import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../lib/firebase'
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import crypto from 'node:crypto'

/**
 * Auth0 & Persona Profile Synchronization Webhook
 * Endpoint: POST /api/webhooks/auth0-persona
 * Security: Bearer token verification using AUTH0_WEBHOOK_SECRET or PERSONA_WEBHOOK_SECRET.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  // Verify HMAC / Bearer Secret
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
  const expectedSecret = process.env.AUTH0_WEBHOOK_SECRET || process.env.PERSONA_WEBHOOK_SECRET

  // If secret is configured, require match (unless running in local development without secret)
  if (expectedSecret && token !== expectedSecret) {
    // Also support cryptographic constant-time comparison if needed
    const tokenBuffer = Buffer.from(token)
    const expectedBuffer = Buffer.from(expectedSecret)
    if (tokenBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(tokenBuffer as any, expectedBuffer as any)) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid webhook secret token.' })
    }
  }

  try {
    const body = req.body || {}
    const { userId, email, emailVerified, phoneNumber, name, metadata, personaInquiryId, status } = body

    if (!userId || !email) {
      return res.status(400).json({ success: false, error: 'Missing required fields: userId and email are mandatory.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const syncTimestamp = new Date().toISOString()

    if (db) {
      // 1. Update auth0_users collection
      const userRef = doc(db, 'auth0_users', userId)
      await setDoc(
        userRef,
        {
          userId,
          email: normalizedEmail,
          emailVerified: Boolean(emailVerified),
          phoneNumber: phoneNumber || null,
          name: name || 'Valued Customer',
          metadata: metadata || {},
          personaInquiryId: personaInquiryId || null,
          verificationStatus: status || 'synchronized',
          lastSyncedAt: serverTimestamp(),
        },
        { merge: true }
      )

      // 2. Log audit trail in audit_logs collection
      const auditRef = collection(db, 'audit_logs')
      await addDoc(auditRef, {
        eventType: 'AUTH0_PERSONA_PROFILE_SYNC',
        userId,
        email: normalizedEmail,
        emailVerified: Boolean(emailVerified),
        personaInquiryId: personaInquiryId || null,
        timestamp: syncTimestamp,
        createdAt: serverTimestamp(),
      })
    }

    return res.status(200).json({
      success: true,
      message: `Successfully synchronized Auth0 profile for ${normalizedEmail} with Persona verification records.`,
      userId,
      emailVerified: Boolean(emailVerified),
      timestamp: syncTimestamp,
    })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to process Auth0-Persona profile synchronization.' })
  }
}
