import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../lib/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import {
  isAdminEmail,
  auth0SessionResolver,
  firebaseBearerResolver,
} from '../../../lib/tribal/admin-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    // 1. Cryptographically resolve session (never trust x-user-email / x-admin-email headers)
    const auth0User = await auth0SessionResolver(req)
    const currentUser = auth0User || (await firebaseBearerResolver(req))

    if (!currentUser || !currentUser.email || currentUser.email_verified !== true) {
      return res.status(200).json({
        authenticated: false,
        role: null,
        user: null,
      })
    }

    const email = currentUser.email.trim().toLowerCase()
    const sub = currentUser.sub || `auth0|${email}`
    const docId = sub.replace(/[^a-zA-Z0-9_-]/g, '_')
    const userDocRef = doc(db, 'users', docId)
    const ownerAllowed = isAdminEmail(email)

    // Handle GET: Retrieve or bootstrap role strictly against allowlist
    if (req.method === 'GET') {
      const resolvedRole = ownerAllowed ? 'owner' : 'User'
      try {
        const snap = await getDoc(userDocRef)

        if (snap.exists()) {
          if (ownerAllowed) {
            try {
              await setDoc(doc(db, 'admins', docId), { uid: docId, email, syncedAt: serverTimestamp() }, { merge: true })
            } catch {
              // Ignore if client SDK rule restricts server write
            }
          }
          return res.status(200).json({
            authenticated: true,
            role: resolvedRole,
            docId,
            user: {
              sub,
              email,
              email_verified: true,
            },
          })
        }

        await setDoc(userDocRef, {
          uid: docId,
          auth0Sub: sub,
          email,
          role: resolvedRole,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })

        if (ownerAllowed) {
          try {
            await setDoc(doc(db, 'admins', docId), { uid: docId, email, bootstrappedAt: serverTimestamp() }, { merge: true })
          } catch {
            // Ignore if client SDK rule restricts server write
          }
        }

        return res.status(200).json({
          authenticated: true,
          role: resolvedRole,
          docId,
          user: {
            sub,
            email,
            email_verified: true,
          },
        })
      } catch (dbErr: any) {
        console.error('[api/auth/role] Firestore error:', dbErr)
        return res.status(200).json({
          authenticated: true,
          role: resolvedRole,
          docId,
          user: { sub, email, email_verified: true },
        })
      }
    }

    // Handle POST: Update user role in Firestore (Strictly requires verified allowlisted owner)
    if (req.method === 'POST') {
      if (!ownerAllowed) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Only verified owner accounts can modify permissions.',
        })
      }

      const { targetUserId, targetEmail, targetRole } = req.body || {}
      if (!targetUserId || !targetRole) {
        return res.status(400).json({ success: false, error: 'targetUserId and targetRole are required.' })
      }

      const allowedRoles = ['owner', 'User']
      if (!allowedRoles.includes(targetRole)) {
        return res.status(400).json({ success: false, error: `Invalid role. Allowed values: ${allowedRoles.join(', ')}` })
      }

      if (targetRole === 'owner' && !isAdminEmail(targetEmail)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Owner role can only be assigned to the two allowlisted owner emails.',
        })
      }

      const targetDocId = String(targetUserId).replace(/[^a-zA-Z0-9_-]/g, '_')
      const targetDocRef = doc(db, 'users', targetDocId)

      await setDoc(
        targetDocRef,
        {
          role: targetRole,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )

      return res.status(200).json({
        success: true,
        message: `User ${targetUserId} role updated to ${targetRole}.`,
      })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  } catch (err: any) {
    console.error('[api/auth/role] Unhandled exception:', err)
    return res.status(500).json({ error: err?.message || 'Internal server error' })
  }
}
