import type { NextApiRequest, NextApiResponse } from 'next'
import { auth0 } from '../../../lib/auth0'
import { db } from '../../../lib/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { isAdminEmail } from '../../../lib/tribal/admin-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Resolve Auth0 Session
    let session: any = null
    try {
      session = await auth0.getSession(req)
    } catch (sessionErr) {
      console.warn('[api/auth/role] Auth0 getSession error:', sessionErr)
    }

    // Support dev header fallback if session is not active in direct preview
    const devEmailHeader = req.headers['x-user-email'] || req.headers['x-admin-email']
    const currentUser = session?.user || (typeof devEmailHeader === 'string' ? { email: devEmailHeader, sub: `dev|${devEmailHeader}` } : null)

    if (!currentUser || !currentUser.email) {
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

    // Handle GET: Retrieve or bootstrap role from Firestore
    if (req.method === 'GET') {
      try {
        const snap = await getDoc(userDocRef)

        if (snap.exists()) {
          const data = snap.data()
          return res.status(200).json({
            authenticated: true,
            role: data.role || 'User',
            docId,
            user: {
              sub,
              email,
              name: currentUser.name || currentUser.nickname || email,
              picture: currentUser.picture || null,
            },
          })
        }

        // Document does not exist yet: Bootstrap role based on admin allowlist
        const isInitialAdmin = isAdminEmail(email) || email === 'cheyoung1983@gmail.com' || email === 'ryan@displaycellpros.com'
        const initialRole = isInitialAdmin ? 'Admin' : 'User'

        await setDoc(userDocRef, {
          uid: docId,
          auth0Sub: sub,
          email,
          role: initialRole,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })

        return res.status(200).json({
          authenticated: true,
          role: initialRole,
          docId,
          user: {
            sub,
            email,
            name: currentUser.name || currentUser.nickname || email,
            picture: currentUser.picture || null,
          },
        })
      } catch (dbErr: any) {
        console.error('[api/auth/role] Firestore read/write error:', dbErr)
        // Fallback to allowlist if database call encounters transient issue
        const fallbackRole = isAdminEmail(email) ? 'Admin' : 'User'
        return res.status(200).json({
          authenticated: true,
          role: fallbackRole,
          docId,
          user: currentUser,
          warning: 'Fetched from security fallback due to database latency',
        })
      }
    }

    // Handle POST: Update user role in Firestore (Requires Admin privileges)
    if (req.method === 'POST') {
      // Verify caller is an Admin
      const callerSnap = await getDoc(userDocRef)
      const callerRole = callerSnap.exists() ? callerSnap.data().role : (isAdminEmail(email) ? 'Admin' : 'User')
      
      const isCallerAdmin = callerRole === 'Admin' || callerRole === 'admin' || callerRole === 'owner' || isAdminEmail(email)
      if (!isCallerAdmin) {
        return res.status(403).json({ success: false, error: 'Forbidden: Admin role required to modify user permissions.' })
      }

      const { targetUserId, targetRole } = req.body || {}
      if (!targetUserId || !targetRole) {
        return res.status(400).json({ success: false, error: 'targetUserId and targetRole are required.' })
      }

      const allowedRoles = ['Admin', 'User', 'technician']
      if (!allowedRoles.includes(targetRole)) {
        return res.status(400).json({ success: false, error: `Invalid role. Allowed values: ${allowedRoles.join(', ')}` })
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
        message: `User ${targetUserId} role updated to ${targetRole} in Firestore.`,
      })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  } catch (err: any) {
    console.error('[api/auth/role] Unhandled exception:', err)
    return res.status(500).json({ error: err?.message || 'Internal server error' })
  }
}
