import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

/**
 * Auth0 Action Webhook / Middleware for Persona Sync
 * Synchronizes Auth0 verified user profile data (email, phone, email_verified, logins count)
 * into Firestore records for Persona verification workflows.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  try {
    const { userId, email, emailVerified, phoneNumber, name, loginsCount } = req.body || {}

    if (!userId || !email) {
      return res.status(400).json({ success: false, error: 'userId and email are required for profile sync.' })
    }

    if (db) {
      const userRef = doc(db, 'auth0_users', userId)
      await setDoc(
        userRef,
        {
          userId,
          email: email.trim().toLowerCase(),
          emailVerified: Boolean(emailVerified),
          phoneNumber: phoneNumber || null,
          name: name || 'User',
          loginsCount: loginsCount || 1,
          lastSyncedAt: serverTimestamp(),
        },
        { merge: true }
      )
    }

    return res.status(200).json({
      success: true,
      message: `Successfully synchronized Auth0 profile for ${email} with Persona/Firestore verification store.`,
      userId,
    })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to synchronize Auth0 profile.' })
  }
}
